import { NextRequest, NextResponse } from "next/server";
import { StreamResponse, StreamSource } from "@/lib/api/types";

export const dynamic = "force-dynamic";

function normalizeTitle(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Fast resolution of AniList ID from direct ID, MAL ID (via AniList idMal), Kitsu mapping, or AniList search
 */
async function resolveAnilistId(
  animeId?: string,
  title?: string,
  malId?: string,
  directAnilistId?: string
): Promise<string | undefined> {
  // 1. Direct AniList ID or anilist- prefix
  if (directAnilistId && directAnilistId.trim() !== "") {
    return String(directAnilistId).trim();
  }

  if (animeId && animeId.startsWith("anilist-")) {
    return animeId.replace("anilist-", "");
  }

  if (animeId && /^\d+$/.test(animeId)) {
    return animeId;
  }

  // 2. Resolve MAL ID (either passed via malId param or mal-XXXX prefix) via AniList GraphQL idMal lookup
  const targetMalId = malId || (animeId && animeId.startsWith("mal-") ? animeId.replace("mal-", "") : undefined);
  if (targetMalId && /^\d+$/.test(targetMalId)) {
    try {
      const { fetchAniListIdByMalId } = await import("@/lib/api/anilist");
      const resolved = await fetchAniListIdByMalId(parseInt(targetMalId, 10));
      if (resolved) {
        return String(resolved);
      }
    } catch {}
  }

  // 3. If animeId is kitsu-XXXX, check Kitsu mappings
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
        const malMap = data?.data?.find(
          (m: { attributes?: { externalSite?: string; externalId?: string } }) => m.attributes?.externalSite === "myanimelist/anime"
        );
        if (malMap?.attributes?.externalId) {
          const { fetchAniListIdByMalId } = await import("@/lib/api/anilist");
          const resolved = await fetchAniListIdByMalId(parseInt(malMap.attributes.externalId, 10));
          if (resolved) return String(resolved);
        }
      }
    } catch {}
  }

  // 4. Search AniList directly by title
  if (title) {
    try {
      const { fetchAniListAnime } = await import("@/lib/api/anilist");
      const results = await fetchAniListAnime({ search: title, perPage: 1 });
      if (results && results.length > 0 && results[0].anilistId) {
        return String(results[0].anilistId);
      }
    } catch {}
  }

  return undefined;
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

  // 2. Fetch ReAnime servers (HD-1 & HD-2 FlixCloud/MegaCloud) from operational provider
  let embedUrls: { label: string; url: string; serverType: string; isDub: boolean }[] = [];
  let dubAvailable: boolean | null = null;
  let subAvailable: boolean | null = null;

  if (anilistId) {
    try {
      const { fetchReanimeServers } = await import("@/lib/api/reanime");
      const reanimeResult = await fetchReanimeServers(anilistId, episode, isDub);
      embedUrls = reanimeResult.servers;
      dubAvailable = reanimeResult.hasDub;
      subAvailable = reanimeResult.hasSub;
    } catch {}
  }

  // Real provider stream source verification only (no guessing from voice actor credits)
  const hasPlayableSource = embedUrls.length > 0;

  // 3. Construct clean response — never fabricate download URL or fake playable sources
  const response: StreamResponse = {
    success: hasPlayableSource,
    provider: hasPlayableSource ? "ReAnime.to Cloud Engine (HD-1 & HD-2)" : "ReAnime Fallback",
    anilistId,
    dubAvailable,
    subAvailable,
    sources: [],
    embedUrls,
    downloadUrl: undefined,
    error: hasPlayableSource ? undefined : "No active streaming sources found for this episode",
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": hasPlayableSource
        ? "public, s-maxage=300, stale-while-revalidate=3600"
        : "no-store, no-cache, must-revalidate",
    },
  });
}

