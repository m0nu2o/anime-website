import { NextRequest, NextResponse } from "next/server";

interface StreamSource {
  url: string;
  quality: string;
  isM3U8: boolean;
}

interface StreamResponse {
  success: boolean;
  provider: string;
  anilistId?: string;
  dubAvailable: boolean;
  subAvailable: boolean;
  sources: StreamSource[];
  subtitles?: { url: string; lang: string }[];
  embedUrls: { label: string; url: string; serverType: string; isDub: boolean }[];
  downloadUrl?: string;
}

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

  // 1. If animeId has anilist- prefix or is a pure numeric ID
  if (animeId && animeId.startsWith("anilist-")) {
    return animeId.replace("anilist-", "");
  }
  if (animeId && /^\d+$/.test(animeId)) {
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
          (m: any) => m.attributes?.externalSite === "anilist/anime"
        );
        if (aniMap?.attributes?.externalId) {
          return String(aniMap.attributes.externalId);
        }
        const malMap = data?.data?.find(
          (m: any) => m.attributes?.externalSite === "myanimelist/anime"
        );
        if (malMap?.attributes?.externalId) {
          malId = String(malMap.attributes.externalId);
        }
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
              (m: any) => m.attributes?.externalSite === "anilist/anime"
            );
            if (aniMap?.attributes?.externalId) {
              return String(aniMap.attributes.externalId);
            }
          }
        }
      }
    } catch {}
  }

  // 4. Fallback to MAL ID if available
  return malId ? String(malId) : undefined;
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

        return prioritized.map((s, idx) => ({
          label: `ReAnime ${s.serverName || "HD-" + (idx + 1)} (${(s.dataType || "sub").toUpperCase()})`,
          url: s.dataLink,
          serverType: `reanime_${(s.serverName || "hd1").toLowerCase()}`,
          isDub: s.dataType === "dub",
        }));
      }
    }
  } catch (err) {
    console.warn("ReAnime server fetch failed:", err);
  }
  return [];
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

  // 1. Resolve AniList ID
  const anilistId = await resolveAnilistId(animeId, title, malId, directAnilistId);

  // 2. Fetch ReAnime servers (all old broken servers completely removed)
  let embedUrls: { label: string; url: string; serverType: string; isDub: boolean }[] = [];
  if (anilistId) {
    embedUrls = await fetchReanimeServers(anilistId, episode, isDub);
  }

  const dubAvailable = embedUrls.some((e) => e.isDub === true);
  const subAvailable = embedUrls.some((e) => e.isDub === false);

  // 3. Construct response
  const response: StreamResponse = {
    success: true,
    provider: embedUrls.length > 0 ? "ReAnime.to Cloud Engine (HD-1 & HD-2)" : "ReAnime Fallback",
    anilistId,
    dubAvailable,
    subAvailable,
    sources: [],
    embedUrls,
    downloadUrl: `https://reanime.to/search?q=${encodeURIComponent(title)}`,
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}

