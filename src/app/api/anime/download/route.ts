import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Anime";
  const episode = searchParams.get("episode") || "1";
  const quality = searchParams.get("quality") || "1080p";
  const isDub = searchParams.get("dub") === "true";

  const safeTitle = title.replace(/[^a-zA-Z0-9_\- ]/g, "").trim().replace(/\s+/g, "_");
  const filename = `${safeTitle}_EP${episode}_${quality}_${isDub ? "DUB" : "SUB"}.mp4`;

  const searchUrl = `https://reanime.to/search?q=${encodeURIComponent(title)}`;

  return NextResponse.redirect(searchUrl, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
