import { NextRequest, NextResponse } from "next/server";
import { searchImages } from "@/lib/image-search";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json(
      { message: "Missing query parameter 'q'." },
      { status: 400 }
    );
  }

  try {
    const images = await searchImages(query);
    if (!images.length) {
      return NextResponse.json(
        { message: "No images found.", images: [] },
        { status: 200 }
      );
    }
    return NextResponse.json({ images });
  } catch (error) {
    console.error("Image search error:", error);
    return NextResponse.json(
      { message: "Image search failed.", images: [] },
      { status: 500 }
    );
  }
}
