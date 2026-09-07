import { NextRequest, NextResponse } from "next/server";
import { StreamResponse, StreamSource } from "@/lib/api/types";

/**
 * Fast resolution of AniList ID from Kitsu mapping, direct ID, or title search
 */
async function resolveAnilistId(
  animeId?: string,
  title?: string,
  malId?: string,
  directAnilistId?: string
): Promise<string | undefined> {
  if (directAnilistId && directAnilistId.trim() !== "") {
    return String(directAnilistId).trim();
  }

  // 1. If animeId has anilist- prefix
  if (animeId && animeId.startsWith("anilist-")) {
    return animeId.replace("anilist-", "");
  }

  // Naked numeric IDs should be warned and treated as AniList only if absolutely necessary,
  // but preferably we don't assume. To be safe for legacy, if it's purely digits, assume AniList
  // but log a warning.
  if (animeId && /^\d+$/.test(animeId)) {
    console.warn(`[resolveAnilistId] WARNING: Assuming naked ID ${animeId} is AniList. Update caller.`);
    return animeId;
  }

  // 2. If animeId is kitsu-XXXX, check Kitsu mappings
  if (animeId && animeId.startsWith("kitsu-")) {
    const cleanId = animeId.replace("kitsu-", "");
    try {
      const res = await fetch(`https://kitsu.io/api/edge/anime/${cleanId}/mappings`, {
        headers: { "Accept": "application/vnd.api+json" },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        const aniMap = data?.data?.find(
          (m: { attributes?: { externalSite?: string; externalId?: string } }) => m.attributes?.externalSite === "anilist/anime"
        );
        if (aniMap?.attributes?.externalId) {
          return String(aniMap.attributes.externalId);
        }
        // DO NOT assign malMap to malId if we are returning anilistId
      }
    } catch {}
  }

  // 3. Search Kitsu by title if not resolved
  if (title) {
    try {
      const res = await fetch(
        `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(title)}&page[limit]=1`,
        {
          headers: { "Accept": "application/vnd.api+json" },
          signal: AbortSignal.timeout(3000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const first = data?.data?.[0];
        if (first?.id) {
          const mapRes = await fetch(`https://kitsu.io/api/edge/anime/${first.id}/mappings`, {
            headers: { "Accept": "application/vnd.api+json" },
            signal: AbortSignal.timeout(3000),
          });
          if (mapRes.ok) {
            const mapData = await mapRes.json();
            const aniMap = mapData?.data?.find(
              (m: { attributes?: { externalSite?: string; externalId?: string } }) => m.attributes?.externalSite === "anilist/anime"
            );
            if (aniMap?.attributes?.externalId) {
              return String(aniMap.attributes.externalId);
            }
          }
        }
      }
    } catch {}
  }

  // Do not fallback to malId. MAL ID is NOT an AniList ID.
  return undefined;
}

interface ReanimeServerRaw {
  $id: string;
  serverName: string;
  dataLink: string;
  dataType: string;
}

/**
 * Fetch official ReAnime streaming servers (HD-1 & HD-2 FlixCloud/MegaCloud)
 */
async function fetchReanimeServers(
  anilistId: string,
  episode: number,
  isDub: boolean
): Promise<{ label: string; url: string; serverType: string; isDub: boolean }[]> {
  try {
    const url = `https://reanime.to/api/flix/${anilistId}/${episode}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer": "https://reanime.to/",
        "Origin": "https://reanime.to",
      },
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data.servers) && data.servers.length > 0) {
        const servers: ReanimeServerRaw[] = data.servers;

        // Group by user preference: matching audio first
        const preferredType = isDub ? "dub" : "sub";
        const prioritized = [
          ...servers.filter((s) => s.dataType === preferredType),
          ...servers.filter((s) => s.dataType !== preferredType),
        ];

        return prioritized.map((s, idx) => {
          const isDubServer = s.dataType === "dub";
          const finalUrl = isDubServer
            ? `${s.dataLink}${s.dataLink.includes("?") ? "&" : "?"}a=1`
            : s.dataLink;

          return {
            label: `ReAnime ${s.serverName || "HD-" + (idx + 1)} (${(s.dataType || "sub").toUpperCase()})`,
            url: finalUrl,
            serverType: `reanime_${(s.serverName || "hd1").toLowerCase()}`,
            isDub: isDubServer,
          };
        });
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("ReAnime server fetch failed:", msg);
  }
  return [];
}

const dubCheckCache = new Map<string, boolean>();

/**
 * Fast cached check whether an anime actually has an English dub
 */
async function checkAnimeHasEnglishDub(malId?: string | number): Promise<boolean | null> {
  if (!malId) return null;
  const key = String(malId);
  if (dubCheckCache.has(key)) return dubCheckCache.get(key)!;

  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}/characters`, {
      headers: { "User-Agent": "Mozilla/5.0 NextGenAnime/1.0" },
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data) && data.data.length > 0) {
        const hasEnglish = data.data.some((c: { voice_actors?: { language?: string }[] }) =>
          c.voice_actors?.some((va) => va.language?.toLowerCase() === "english")
        );
        dubCheckCache.set(key, hasEnglish);
        return hasEnglish;
      }
    }
  } catch {}
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "";
  const episode = parseInt(searchParams.get("episode") || "1", 10);
  const isDub = searchParams.get("dub") === "true";
  const malId = searchParams.get("malId") || undefined;
  const animeId = searchParams.get("animeId") || undefined;
  const directAnilistId = searchParams.get("anilistId") || undefined;

  if (!title && !malId && !animeId && !directAnilistId) {
    return NextResponse.json(
      { success: false, error: "title, animeId, or anilistId required" },
      { status: 400 }
    );
  }

  // 1. Resolve AniList ID with provider validation
  const anilistId = await resolveAnilistId(animeId, title, malId, directAnilistId);
  const effectiveMalId = malId || (animeId?.startsWith("mal-") ? animeId.replace("mal-", "") : undefined);

  // 2. Fetch ReAnime servers (HD-1 & HD-2 FlixCloud/MegaCloud)
  let embedUrls: { label: string; url: string; serverType: string; isDub: boolean }[] = [];
  if (anilistId) {
    try {
      embedUrls = await fetchReanimeServers(anilistId, episode, isDub);
    } catch {}
  }

  // 3. Verify English Dub availability
  const hasEnglishDub = await checkAnimeHasEnglishDub(effectiveMalId);
  if (hasEnglishDub === false) {
    // Verified no English dub exists for this anime: filter out dub servers
    embedUrls = embedUrls.filter((e) => !e.isDub);
  }

  const dubAvailable = embedUrls.some((e) => e.isDub === true);
  const subAvailable = embedUrls.some((e) => e.isDub === false);
  const hasPlayableSource = embedUrls.length > 0;

  // 3. Construct clean response
  const response: StreamResponse = {
    success: hasPlayableSource,
    provider: hasPlayableSource ? "ReAnime.to Cloud Engine (HD-1 & HD-2)" : "ReAnime Fallback",
    anilistId,
    dubAvailable,
    subAvailable,
    sources: [],
    embedUrls,
    downloadUrl: title ? `https://reanime.to/search?q=${encodeURIComponent(title)}` : undefined,
    error: hasPlayableSource ? undefined : "No active streaming sources found for this episode",
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}

