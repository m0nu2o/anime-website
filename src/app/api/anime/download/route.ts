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
function isSafeDownloadUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const host = parsed.hostname.toLowerCase();
    // Block loopback / local hosts
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1") {
      return false;
    }
    if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".lan")) {
      return false;
    }

    // Block private IPv4 ranges
    // 10.0.0.0/8
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return false;
    // 172.16.0.0/12 (172.16 - 172.31)
    if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host)) return false;
    // 192.168.0.0/16
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return false;
    // 169.254.0.0/16 (link-local, cloud metadata)
    if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(host)) return false;
    // 127.0.0.0/8
    if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return false;
    // 0.0.0.0/8
    if (/^0\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return false;

    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Anime";
  const episode = searchParams.get("episode") || "1";
  const quality = searchParams.get("quality") || "1080p";
  const isDub = searchParams.get("dub") === "true";
  const sourceUrl = searchParams.get("sourceUrl");

  const safeTitle = title.replace(/[^a-zA-Z0-9_\- ]/g, "").trim().replace(/\s+/g, "_");
  const filename = `${safeTitle}_EP${episode}_${quality}_${isDub ? "DUB" : "SUB"}.mp4`;

  // Only a valid, verified direct media source URL can be downloaded (with SSRF protection).
  if (sourceUrl && isSafeDownloadUrl(sourceUrl)) {
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

  // Advertise availability only when a real safe source exists.
  if (!sourceUrl || !isSafeDownloadUrl(sourceUrl)) {
    return new Response(null, { status: 404 });
  }
  try {
    const probe = await fetch(sourceUrl, { method: "HEAD", signal: AbortSignal.timeout(6000) });
    return new Response(null, { status: probe.ok ? 200 : 404 });
  } catch {
    return new Response(null, { status: 404 });
  }
}
