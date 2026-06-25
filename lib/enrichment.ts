// Background enrichment worker for bulk-imported products.
//
// Bulk import inserts rows immediately with a placeholder image and
// enrichment_status='pending'. This worker drains that queue in batches of 25,
// fetching a real image plus features/specifications for each product. It runs
// in-process (the app uses a long-lived Node process with better-sqlite3), so a
// module-level lock guarantees only one loop runs at a time. Triggering is
// fire-and-forget; progress is observable via the enrichment status endpoint.

import { dbHelpers } from "./database";
import { pickBestImage, searchImages } from "./image-search";
import { fetchProductDetails } from "./product-details";

const BATCH_SIZE = 25;
const ITEM_CONCURRENCY = 5;
// Pause between batches so we don't hammer DuckDuckGo (rate-limit / IP-block
// protection) when enriching thousands of items.
const BATCH_PAUSE_MS = 750;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

let running = false;

const buildQuery = (product: any): string => {
  const parts = [product.brand, product.name].filter(Boolean);
  const base = parts.join(" ").replace(/\s+/g, " ").trim() || product.description || product.sku || "";
  return base.slice(0, 150);
};

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
}

async function enrichProduct(product: any): Promise<void> {
  const query = buildQuery(product);
  try {
    let mainImage: string | null = null;
    let features: string[] = [];
    let specifications: Record<string, string> = {};

    if (query) {
      // Image and details are independent; fetch them in parallel.
      const [candidates, details] = await Promise.all([
        searchImages(query).catch(() => []),
        fetchProductDetails(query).catch(() => ({ features: [], specifications: {} })),
      ]);
      const best = pickBestImage(candidates) || candidates[0] || null;
      mainImage = best?.url || null;
      features = details.features;
      specifications = details.specifications;
    }

    // Mark 'failed' (so it can be retried via resume) when we couldn't get an
    // image — either there was no searchable text, or the search returned
    // nothing. Any scraped features/specs are still saved, and the placeholder
    // image stays in place meanwhile.
    const ok = Boolean(mainImage);
    await dbHelpers.setEnrichmentResult(product.id, {
      status: ok ? "done" : "failed",
      mainImage,
      features,
      specifications,
      error: ok ? null : query ? "No image found" : "No searchable text for product",
    });
  } catch (error: any) {
    console.error(`Enrichment failed for product ${product.id} (${product.sku}):`, error);
    await dbHelpers.setEnrichmentResult(product.id, {
      status: "failed",
      error: error?.message || "Enrichment failed",
    });
  }
}

async function drainQueue(): Promise<void> {
  // Recover anything left mid-flight by a previous (crashed) run.
  await dbHelpers.resetStuckEnrichment();

  let first = true;
  while (true) {
    const batch = await dbHelpers.claimPendingEnrichment(BATCH_SIZE);
    if (batch.length === 0) break;

    if (!first) await sleep(BATCH_PAUSE_MS);
    first = false;

    await runWithConcurrency(batch, ITEM_CONCURRENCY, enrichProduct);
  }
}

// Kick off (or no-op if already running) the background enrichment loop.
// Fire-and-forget: callers should not await this.
export function triggerEnrichment(): void {
  if (running) return;
  running = true;
  drainQueue()
    .catch((error) => {
      console.error("Enrichment worker crashed:", error);
    })
    .finally(() => {
      running = false;
    });
}

export function isEnrichmentRunning(): boolean {
  return running;
}
