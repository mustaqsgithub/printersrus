// Best-effort scraping of product features + specifications from the web.
//
// This mirrors the DuckDuckGo approach used by image-search.ts: run a text
// search, then fetch the top organic result pages and extract spec-like tables
// and feature bullet lists with simple heuristics. Scraping arbitrary pages is
// inherently unreliable, so every step fails soft and returns whatever it can
// (often nothing) rather than throwing.

export type ProductDetails = {
  features: string[];
  specifications: Record<string, string>;
};

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 8000;
const MAX_RESULT_PAGES = 2;
const MAX_FEATURES = 8;
const MAX_SPECS = 15;
const MAX_VALUE_LEN = 200;
// Cap how much of a scraped page we read/parse so a pathological page can't
// exhaust memory or stall the regex passes.
const MAX_HTML_BYTES = 2_000_000;

// Reject non-http(s) schemes and hosts that point at the local machine / private
// network ranges (basic SSRF guard for server-side fetches of result URLs).
const isSafeUrl = (raw: string): boolean => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "0.0.0.0") return false;
  if (/^127\./.test(host)) return false;
  if (/^10\./.test(host)) return false;
  if (/^192\.168\./.test(host)) return false;
  if (/^169\.254\./.test(host)) return false;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return false;
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd")) return false;
  return true;
};

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, ...(init?.headers || {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

const decodeEntities = (input: string): string =>
  input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

const stripTags = (html: string): string =>
  decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

const cleanValue = (value: string): string => stripTags(value).slice(0, MAX_VALUE_LEN).trim();

// Pull the top organic result URLs from the DuckDuckGo HTML endpoint.
async function ddgTextSearch(query: string): Promise<string[]> {
  try {
    const res = await fetchWithTimeout(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      { headers: { Referer: "https://duckduckgo.com/" } }
    );
    if (!res.ok) return [];
    const html = await res.text();

    const urls: string[] = [];
    const linkRegex = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"/g;
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(html)) && urls.length < MAX_RESULT_PAGES * 3) {
      let href = decodeEntities(match[1]);
      // DDG wraps targets in a redirect: //duckduckgo.com/l/?uddg=<encoded>
      const uddg = href.match(/[?&]uddg=([^&]+)/);
      if (uddg) href = decodeURIComponent(uddg[1]);
      if (href.startsWith("//")) href = `https:${href}`;
      if (!href.includes("duckduckgo.com") && isSafeUrl(href)) {
        urls.push(href);
      }
    }
    return urls.slice(0, MAX_RESULT_PAGES);
  } catch {
    return [];
  }
}

// Extract key/value pairs from <table> and <dl> markup.
function extractSpecifications(html: string): Record<string, string> {
  const specs: Record<string, string> = {};

  // Table rows: <tr><th>key</th><td>value</td></tr> or two <td>s.
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let row: RegExpExecArray | null;
  while ((row = rowRegex.exec(html)) && Object.keys(specs).length < MAX_SPECS) {
    const cells = [...row[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((m) =>
      cleanValue(m[1])
    );
    if (cells.length >= 2 && cells[0] && cells[1] && cells[0].length <= 60) {
      const key = cells[0].replace(/[:：]\s*$/, "");
      if (key && !(key in specs)) specs[key] = cells[1];
    }
  }

  // Definition lists: <dt>key</dt><dd>value</dd>
  const dlRegex = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
  let dl: RegExpExecArray | null;
  while ((dl = dlRegex.exec(html)) && Object.keys(specs).length < MAX_SPECS) {
    const key = cleanValue(dl[1]).replace(/[:：]\s*$/, "");
    const value = cleanValue(dl[2]);
    if (key && value && key.length <= 60 && !(key in specs)) specs[key] = value;
  }

  return specs;
}

// Extract feature bullets from <li> elements.
function extractFeatures(html: string): string[] {
  const features: string[] = [];
  const seen = new Set<string>();
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let li: RegExpExecArray | null;
  while ((li = liRegex.exec(html)) && features.length < MAX_FEATURES) {
    // Skip list items that contain nested lists or links (usually nav menus).
    if (/<(ul|ol|nav)\b/i.test(li[1])) continue;
    const text = cleanValue(li[1]);
    const key = text.toLowerCase();
    if (text.length >= 15 && text.length <= MAX_VALUE_LEN && !seen.has(key)) {
      seen.add(key);
      features.push(text);
    }
  }
  return features;
}

async function scrapePage(url: string): Promise<ProductDetails | null> {
  if (!isSafeUrl(url)) return null;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return null;
    const declaredLength = Number(res.headers.get("content-length") || 0);
    if (declaredLength && declaredLength > MAX_HTML_BYTES) return null;
    const html = (await res.text()).slice(0, MAX_HTML_BYTES);

    const specifications = extractSpecifications(html);
    const features = extractFeatures(html);

    if (Object.keys(specifications).length === 0 && features.length === 0) return null;
    return { specifications, features };
  } catch {
    return null;
  }
}

export async function fetchProductDetails(query: string): Promise<ProductDetails> {
  const empty: ProductDetails = { features: [], specifications: {} };
  const trimmed = query?.trim();
  if (!trimmed) return empty;

  const urls = await ddgTextSearch(`${trimmed} specifications features`);
  if (urls.length === 0) return empty;

  const merged: ProductDetails = { features: [], specifications: {} };
  for (const url of urls) {
    const details = await scrapePage(url);
    if (!details) continue;

    for (const [key, value] of Object.entries(details.specifications)) {
      if (Object.keys(merged.specifications).length >= MAX_SPECS) break;
      if (!(key in merged.specifications)) merged.specifications[key] = value;
    }
    for (const feature of details.features) {
      if (merged.features.length >= MAX_FEATURES) break;
      if (!merged.features.includes(feature)) merged.features.push(feature);
    }

    if (merged.features.length >= MAX_FEATURES && Object.keys(merged.specifications).length >= MAX_SPECS) {
      break;
    }
  }

  return merged;
}
