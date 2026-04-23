import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json(
      { message: "Missing query parameter 'q'." },
      { status: 400 }
    );
  }

  try {
    // Step 1: Get the vqd token from DuckDuckGo
    const tokenRes = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      }
    );
    const html = await tokenRes.text();
    const vqdMatch = html.match(/vqd=['"]([^'"]+)['"]/);
    if (!vqdMatch) {
      return NextResponse.json(
        { message: "Failed to obtain search token.", images: [] },
        { status: 502 }
      );
    }
    const vqd = vqdMatch[1];

    // Step 2: Fetch image results
    const imagesRes = await fetch(
      `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(
        query
      )}&vqd=${vqd}&f=,,,,,&p=1`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://duckduckgo.com/",
        },
      }
    );

    if (!imagesRes.ok) {
      return NextResponse.json(
        { message: "Image search request failed.", images: [] },
        { status: 502 }
      );
    }

    const data = await imagesRes.json();
    const images = (data.results || []).slice(0, 20).map(
      (r: { image: string; thumbnail: string; title: string; url: string; width: number; height: number }) => ({
        url: r.image,
        thumbnail: r.thumbnail,
        title: r.title,
        source: r.url,
        width: r.width,
        height: r.height,
      })
    );

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Image search error:", error);
    return NextResponse.json(
      { message: "Image search failed.", images: [] },
      { status: 500 }
    );
  }
}
