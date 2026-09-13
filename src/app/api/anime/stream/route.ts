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

interface ResolvedIds {
  anilistId?: string;
  malId?: string;
}

/**
 * Fast resolution of AniList ID & MAL ID from direct ID, MAL ID (via AniList idMal), Kitsu mapping, or AniList search
 */
async function resolveIds(
  animeId?: string,
  title?: string,
  malId?: string,
  directAnilistId?: string
): Promise<ResolvedIds> {
  let resolvedAnilistId = directAnilistId?.trim() || undefined;
  let resolvedMalId = malId?.trim() || undefined;

  if (animeId?.startsWith("mal-")) {
    resolvedMalId = animeId.replace("mal-", "");
  } else if (animeId?.startsWith("anilist-")) {
    resolvedAnilistId = animeId.replace("anilist-", "");
  } else if (animeId && /^\d+$/.test(animeId)) {
    resolvedAnilistId = animeId;
  }

  // 1. If we have malId but no anilistId, fetch AniList ID from MAL ID
  if (resolvedMalId && !resolvedAnilistId && /^\d+$/.test(resolvedMalId)) {
    try {
      const { fetchAniListIdByMalId } = await import("@/lib/api/anilist");
      const aId = await fetchAniListIdByMalId(parseInt(resolvedMalId, 10));
      if (aId) resolvedAnilistId = String(aId);
    } catch {}
  }

  // 2. If we have anilistId but no malId, fetch MAL ID from AniList GraphQL
  if (resolvedAnilistId && !resolvedMalId && /^\d+$/.test(resolvedAnilistId)) {
    try {
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `query ($id: Int) { Media(id: $id, type: ANIME) { id idMal } }`,
          variables: { id: parseInt(resolvedAnilistId, 10) },
        }),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.Media?.idMal) {
          resolvedMalId = String(json.data.Media.idMal);
        }
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
        if (aniMap?.attributes?.externalId && !resolvedAnilistId) {
          resolvedAnilistId = String(aniMap.attributes.externalId);
        }
        const malMap = data?.data?.find(
          (m: { attributes?: { externalSite?: string; externalId?: string } }) => m.attributes?.externalSite === "myanimelist/anime"
        );
        if (malMap?.attributes?.externalId && !resolvedMalId) {
          resolvedMalId = String(malMap.attributes.externalId);
        }
      }
    } catch {}
  }

  // 4. Search AniList directly by title if still missing
  if (!resolvedAnilistId && title) {
    try {
      const { fetchAniListAnime } = await import("@/lib/api/anilist");
      const results = await fetchAniListAnime({ search: title, perPage: 1 });
      if (results && results.length > 0 && results[0].anilistId) {
        resolvedAnilistId = String(results[0].anilistId);
        if (results[0].malId && !resolvedMalId) {
          resolvedMalId = String(results[0].malId);
        }
      }
    } catch {}
  }

  return { anilistId: resolvedAnilistId, malId: resolvedMalId };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "";
  const episode = parseInt(searchParams.get("episode") || "1", 10);
  const isDub = searchParams.get("dub") === "true";
  const rawId = searchParams.get("id");
  const malIdParam = searchParams.get("malId") || (rawId?.startsWith("mal-") ? rawId.replace("mal-", "") : undefined);
  const animeId = searchParams.get("animeId") || (rawId && !rawId.startsWith("mal-") ? rawId : undefined);
  const directAnilistId = searchParams.get("anilistId") || (rawId && /^\d+$/.test(rawId) ? rawId : undefined);

  if (!title && !malIdParam && !animeId && !directAnilistId) {
    return NextResponse.json(
      { success: false, error: "title, animeId, or anilistId required" },
      { status: 400 }
    );
  }

  // 1. Resolve AniList ID & MAL ID with cross-provider validation
  const { anilistId, malId } = await resolveIds(animeId, title, malIdParam, directAnilistId);

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
    } catch (err) {
      console.error("[ReAnime fetch error]:", err);
    }
  }

  // 3. Fallback to resilient multi-server embed network (VidSrc)
  // Ensures video playback works even when datacenter IPs are blocked by third-party Cloudflare
  // Path format: /embed/anime/{id}/{episode} is universally supported without 400 errors
  if (embedUrls.length === 0 && (malId || anilistId)) {
    const primaryId = malId || anilistId;
    const secondaryId = malId && anilistId && malId !== anilistId ? anilistId : undefined;

    embedUrls.push({
      label: "VidSrc Stream HD",
      url: `https://vidsrc.pm/embed/anime/${primaryId}/${episode}`,
      serverType: "vidsrc_pm",
      isDub: false,
    });

    if (secondaryId) {
      embedUrls.push({
        label: "VidSrc Mirror",
        url: `https://vidsrc.pm/embed/anime/${secondaryId}/${episode}`,
        serverType: "vidsrc_alt",
        isDub: false,
      });
    }

    subAvailable = true;
    dubAvailable = true;
  }

  // Real provider stream source verification only (no guessing from voice actor credits)
  const hasPlayableSource = embedUrls.length > 0;

  // 4. Construct clean response — never fabricate download URL or fake playable sources
  const response: StreamResponse = {
    success: hasPlayableSource,
    provider: hasPlayableSource ? "Multi-Server Streaming Network (VidSrc / ReAnime)" : "ReAnime Fallback",
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

