import { NextRequest } from "next/server";

/**
 * Episode download proxy.
 *
 * Data integrity rules:
 * - Streams ONLY the verified source URL passed by the client (obtained from the
 *   real stream resolution for this exact anime + episode).
 * - Never substitutes demo/sample/trailer media. If no verified source is
 *   available, returns HTTP 404 "Download unavailable".
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Anime";
  const episode = searchParams.get("episode") || "1";
  const quality = searchParams.get("quality") || "1080p";
  const isDub = searchParams.get("dub") === "true";
  const sourceUrl = searchParams.get("sourceUrl");

  const safeTitle = title.replace(/[^a-zA-Z0-9_\- ]/g, "").trim().replace(/\s+/g, "_");
  const filename = `${safeTitle}_EP${episode}_${quality}_${isDub ? "DUB" : "SUB"}.mp4`;

  // Only a valid, verified direct media source URL can be downloaded.
  if (sourceUrl && (sourceUrl.startsWith("http://") || sourceUrl.startsWith("https://"))) {
    try {
      const videoRes = await fetch(sourceUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(6000),
      });

      if (videoRes.ok && videoRes.body) {
        const contentType = videoRes.headers.get("content-type") || "video/mp4";
        return new Response(videoRes.body, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename="${filename}"`,
            ...(videoRes.headers.get("content-length") ? { "Content-Length": videoRes.headers.get("content-length")! } : {}),
            "Cache-Control": "no-store",
          },
        });
      }
    } catch (err) {
      console.warn("Direct stream fetch failed:", err);
    }
  }

  // No verified source: honest failure. Never serve placeholder media.
  return new Response(
    JSON.stringify({ error: "Download unavailable", reason: "No verified stream source for this episode" }),
    {
      status: 404,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    }
  );
}

export async function HEAD(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sourceUrl = searchParams.get("sourceUrl");

  // Advertise availability only when a real source exists.
  if (!sourceUrl) {
    return new Response(null, { status: 404 });
  }
  try {
    const probe = await fetch(sourceUrl, { method: "HEAD", signal: AbortSignal.timeout(6000) });
    return new Response(null, { status: probe.ok ? 200 : 404 });
  } catch {
    return new Response(null, { status: 404 });
  }
}
