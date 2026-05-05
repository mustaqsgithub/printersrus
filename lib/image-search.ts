export type ImageResult = {
  url: string;
  thumbnail: string;
  title: string;
  source?: string;
  width: number;
  height: number;
};

const DDG_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function searchImages(query: string): Promise<ImageResult[]> {
  const trimmed = query?.trim();
  if (!trimmed) return [];

  const tokenRes = await fetch(
    `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`,
    {
      headers: { "User-Agent": DDG_USER_AGENT },
    }
  );
  const html = await tokenRes.text();
  const vqdMatch = html.match(/vqd=['"]([^'"]+)['"]/);
  if (!vqdMatch) return [];
  const vqd = vqdMatch[1];

  const imagesRes = await fetch(
    `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(
      trimmed
    )}&vqd=${vqd}&f=,,,,,&p=1`,
    {
      headers: {
        "User-Agent": DDG_USER_AGENT,
        Referer: "https://duckduckgo.com/",
      },
    }
  );

  if (!imagesRes.ok) return [];

  const data = (await imagesRes.json()) as {
    results?: Array<{
      image: string;
      thumbnail: string;
      title: string;
      url: string;
      width: number;
      height: number;
    }>;
  };

  return (data.results || []).slice(0, 20).map((r) => ({
    url: r.image,
    thumbnail: r.thumbnail,
    title: r.title,
    source: r.url,
    width: r.width,
    height: r.height,
  }));
}

const isDisallowedFormat = (url: string) => {
  const lower = url.toLowerCase().split("?")[0];
  return lower.endsWith(".gif") || lower.endsWith(".svg");
};

export function pickBestImage(results: ImageResult[]): ImageResult | null {
  if (!results || results.length === 0) return null;

  const eligible = results.filter((r) => {
    if (!r.url) return false;
    if (isDisallowedFormat(r.url)) return false;
    const w = Number(r.width) || 0;
    const h = Number(r.height) || 0;
    if (w < 400 || h < 400) return false;
    return true;
  });

  if (eligible.length === 0) return null;

  let best: ImageResult | null = null;
  let bestScore = -Infinity;

  for (const r of eligible) {
    const w = Number(r.width) || 1;
    const h = Number(r.height) || 1;
    const aspectRatio = Math.max(w, h) / Math.min(w, h);
    const score = Math.log(w * h) - 3 * (aspectRatio - 1) ** 2;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }

  return best;
}
