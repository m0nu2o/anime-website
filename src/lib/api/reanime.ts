import { EmbedSource } from "./types";

interface ReanimeServerRaw {
  $id: string;
  serverName: string;
  dataLink: string;
  dataType: string;
}

const REANIME_BASE_URL = "https://reanime.to";
const REANIME_TIMEOUT_MS = 4500;

// In-memory circuit breaker for ReAnime operational provider
let failureCount = 0;
let circuitOpenUntil = 0;
const MAX_FAILURES = 5;
const COOLDOWN_MS = 60 * 1000;

function isCircuitOpen(): boolean {
  if (Date.now() < circuitOpenUntil) return true;
  if (circuitOpenUntil !== 0) {
    circuitOpenUntil = 0;
    failureCount = 0;
  }
  return false;
}

function recordSuccess() {
  failureCount = 0;
  circuitOpenUntil = 0;
}

function recordFailure() {
  failureCount++;
  if (failureCount >= MAX_FAILURES) {
    circuitOpenUntil = Date.now() + COOLDOWN_MS;
    console.warn(`[ReAnime] Circuit opened for ${COOLDOWN_MS / 1000}s due to ${failureCount} consecutive failures`);
  }
}

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

  if (isCircuitOpen()) {
    return { servers: [], hasSub: null, hasDub: null, success: false };
  }

  const cleanAnilistId = String(anilistId).replace(/^anilist-/, "").trim();
  const url = `${REANIME_BASE_URL}/api/flix/${encodeURIComponent(cleanAnilistId)}/${encodeURIComponent(episode)}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer": `${REANIME_BASE_URL}/`,
        "Origin": REANIME_BASE_URL,
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(REANIME_TIMEOUT_MS),
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      recordFailure();
      return { servers: [], hasSub: null, hasDub: null, success: false };
    }

    const data = await res.json();
    if (data?.success && Array.isArray(data.servers) && data.servers.length > 0) {
      recordSuccess();
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
    recordFailure();
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[ReAnime] Stream fetch failed for anilist-${cleanAnilistId} ep ${episode}:`, msg);
    return { servers: [], hasSub: null, hasDub: null, success: false };
  }
}
