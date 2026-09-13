import { EmbedSource } from "./types";

interface ReanimeServerRaw {
  $id: string;
  serverName: string;
  dataLink: string;
  dataType: string;
}

const REANIME_BASE_URL = "https://reanime.to";
const REANIME_TIMEOUT_MS = 8000;

/**
 * Fetch verified streaming embed servers from ReAnime (HD-1 & HD-2 FlixCloud/MegaCloud).
 * ReAnime is the primary operational streaming provider.
 */
export async function fetchReanimeServers(
  anilistId: string | number,
  episode: number = 1,
  isDub: boolean = false
): Promise<{
  servers: EmbedSource[];
  hasSub: boolean | null;
  hasDub: boolean | null;
  success: boolean;
}> {
  if (!anilistId || episode < 1) {
    return { servers: [], hasSub: null, hasDub: null, success: false };
  }

  const cleanAnilistId = String(anilistId).replace(/^anilist-/, "").trim();
  const targetUrl = `${REANIME_BASE_URL}/api/flix/${encodeURIComponent(cleanAnilistId)}/${encodeURIComponent(episode)}`;

  try {
    let data: { success?: boolean; servers?: ReanimeServerRaw[] } | null = null;

    // 1. If a Cloudflare Worker or Edge Proxy is configured, use it first (bypasses Cloudflare datacenter IP block)
    const workerProxy =
      process.env.CLOUDFLARE_WORKER_URL ||
      process.env.STREAM_PROXY_URL ||
      "https://tblbvrgzoovujszpztvr.supabase.co/functions/v1/anime-proxy";

    if (workerProxy) {
      try {
        const cleanWorker = workerProxy.replace(/\/+$/, "");
        const proxyFetchUrl = cleanWorker.includes("?")
          ? `${cleanWorker}&url=${encodeURIComponent(targetUrl)}`
          : `${cleanWorker}?url=${encodeURIComponent(targetUrl)}`;

        const pRes = await fetch(proxyFetchUrl, {
          headers: { "Accept": "application/json" },
          signal: AbortSignal.timeout(6000),
          cache: "no-store",
        });
        if (pRes.ok) {
          const pJson = await pRes.json();
          if (pJson?.success && Array.isArray(pJson?.servers) && pJson.servers.length > 0) {
            data = pJson;
          }
        }
      } catch (proxyErr) {
        console.warn("[Edge Proxy] Fetch warning:", proxyErr);
      }
    }

    // 2. Direct fetch with high-reputation browser headers
    if (!data) {
      try {
        const res = await fetch(targetUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": `${REANIME_BASE_URL}/`,
            "Origin": REANIME_BASE_URL,
            "Accept": "application/json",
          },
          signal: AbortSignal.timeout(REANIME_TIMEOUT_MS),
          cache: "no-store",
        });

        if (res.ok) {
          const directJson = await res.json();
          if (directJson?.success && Array.isArray(directJson?.servers) && directJson.servers.length > 0) {
            data = directJson;
          }
        }
      } catch {}
    }


    if (data?.success && Array.isArray(data.servers) && data.servers.length > 0) {
      const rawServers: ReanimeServerRaw[] = data.servers;

      const hasSub = rawServers.some((s) => s.dataType?.toLowerCase() === "sub");
      const hasDub = rawServers.some((s) => s.dataType?.toLowerCase() === "dub");

      // Prioritize user's requested audio preference
      const preferredType = isDub ? "dub" : "sub";
      const sorted = [
        ...rawServers.filter((s) => s.dataType?.toLowerCase() === preferredType),
        ...rawServers.filter((s) => s.dataType?.toLowerCase() !== preferredType),
      ];

      const servers: EmbedSource[] = sorted.map((s, idx) => {
        const isServerDub = s.dataType?.toLowerCase() === "dub";
        const finalUrl = isServerDub
          ? `${s.dataLink}${s.dataLink.includes("?") ? "&" : "?"}a=1`
          : s.dataLink;

        const serverDisplayName = s.serverName || `HD-${idx + 1}`;
        const label = `ReAnime ${serverDisplayName} (${(s.dataType || "sub").toUpperCase()})`;

        return {
          label,
          url: finalUrl,
          serverType: `reanime_${serverDisplayName.toLowerCase().replace(/\s+/g, "")}`,
          isDub: isServerDub,
        };
      });

      return { servers, hasSub, hasDub, success: true };
    }

    return { servers: [], hasSub: null, hasDub: null, success: false };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[ReAnime] Stream fetch failed for anilist-${cleanAnilistId} ep ${episode}:`, msg);
    return { servers: [], hasSub: null, hasDub: null, success: false };
  }
}
