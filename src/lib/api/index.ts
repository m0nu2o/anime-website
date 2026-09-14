import { fetchAniListAnime, fetchAniListAnimeById } from "./anilist";
import { fetchJikanAnime, fetchJikanAnimeById, fetchJikanPopular, fetchJikanTop } from "./jikan";
import { fetchKitsuAnime, fetchKitsuAnimeById, fetchKitsuTrending, fetchKitsuPopular } from "./kitsu";
import { Anime, AnimeIdentity } from "./types";

export type { AnimeIdentity };

export function resolveAnimeIdentity(idStr: string): AnimeIdentity {
  if (idStr.startsWith("anilist-")) {
    const anilistId = parseInt(idStr.replace("anilist-", ""), 10);
    return {
      canonicalId: idStr,
      provider: "anilist",
      anilistId: !isNaN(anilistId) ? anilistId : undefined,
    };
  }
  if (idStr.startsWith("mal-")) {
    const malId = parseInt(idStr.replace("mal-", ""), 10);
    return {
      canonicalId: idStr,
      provider: "mal",
      malId: !isNaN(malId) ? malId : undefined,
    };
  }
  if (idStr.startsWith("kitsu-")) {
    const kitsuId = idStr.replace("kitsu-", "");
    return {
      canonicalId: idStr,
      provider: "kitsu",
      kitsuId,
    };
  }
  const num = parseInt(idStr, 10);
  if (!isNaN(num)) {
    return {
      canonicalId: `anilist-${num}`,
      provider: "anilist",
      anilistId: num,
    };
  }
  return {
    canonicalId: idStr,
    provider: "anilist",
  };
}

export function getAnimeIdentity(anime: Anime): AnimeIdentity {
  return {
    canonicalId: anime.id,
    provider: anime.provider,
    anilistId: anime.anilistId,
    malId: anime.malId,
    kitsuId: anime.kitsuId,
  };
}

// In-memory runtime cache for anime objects across providers
const animeCache = new Map<string, { data: Anime; timestamp: number }>();
const aliasCache = new Map<string, { nativeKey: string; timestamp: number }>();
const aliasesByNativeKey = new Map<string, Set<string>>();
const CACHE_TTL_MS = 1000 * 60 * 60;
const MAX_CACHE_ENTRIES = 500;
const MAX_ALIAS_ENTRIES = 1500;

function evictOldest(cache: Map<string, unknown>, maxEntries: number) {
  while (cache.size > maxEntries) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
}

function removeCachedNativeKey(nativeKey: string) {
  animeCache.delete(nativeKey);
  const aliases = aliasesByNativeKey.get(nativeKey);
  if (aliases) {
    for (const alias of aliases) aliasCache.delete(alias);
    aliasesByNativeKey.delete(nativeKey);
  }
}

function cacheAnime(anime: Anime) {
  if (!anime || !anime.id) return;
  const nativeKey = anime.id;
  const timestamp = Date.now();
  removeCachedNativeKey(nativeKey);
  animeCache.set(nativeKey, { data: anime, timestamp });
  evictOldest(animeCache, MAX_CACHE_ENTRIES);

  const aliases: string[] = [];
  if (anime.anilistId) aliases.push(`anilist:${anime.anilistId}`);
  if (anime.malId) aliases.push(`mal:${anime.malId}`);
  if (anime.kitsuId) aliases.push(`kitsu:${anime.kitsuId}`);

  for (const alias of aliases) {
    aliasCache.set(alias, { nativeKey, timestamp });
    const nativeAliases = aliasesByNativeKey.get(nativeKey) || new Set<string>();
    nativeAliases.add(alias);
    aliasesByNativeKey.set(nativeKey, nativeAliases);
  }
  evictOldest(aliasCache, MAX_ALIAS_ENTRIES);
}

function getFromCache(key: string): Anime | null {
  const alias = aliasCache.get(key);
  const nativeKey = alias?.nativeKey || key;
  const cached = animeCache.get(nativeKey);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    removeCachedNativeKey(nativeKey);
    return null;
  }
  animeCache.delete(nativeKey);
  animeCache.set(nativeKey, cached);
  if (alias) {
    aliasCache.delete(key);
    aliasCache.set(key, alias);
  }
  return cached.data;
}

function recordProviderFailure(name: string) {
  providerCooldowns[name] = Date.now() + COOLDOWN_MS;
  for (const nativeKey of Array.from(animeCache.keys())) {
    if (nativeKey.startsWith(`${name}-`)) removeCachedNativeKey(nativeKey);
  }
}

// Circuit breaker state to avoid hammering down/rate-limited APIs
const providerCooldowns: Record<string, number> = {
  anilist: 0,
  jikan: 0,
  kitsu: 0,
};
const COOLDOWN_MS = 60 * 1000; // 1 minute cooldown on failure

function isProviderHealthy(name: string): boolean {
  return Date.now() > (providerCooldowns[name] || 0);
}

function recordProviderSuccess(name: string) {
  providerCooldowns[name] = 0;
}

/**
 * Normalizes, falls back, and deduplicates anime data across:
 * 1. AniList (GraphQL)
 * 2. Jikan (MyAnimeList REST)
 * 3. Kitsu (Edge JSON:API)
 */
export async function searchAnime(query: string, limit: number = 10): Promise<Anime[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery || cleanQuery.length < 2) return [];

  let attempted = 0;
  let failed = 0;

  // 1. Try AniList if healthy
  if (isProviderHealthy("anilist")) {
    attempted++;
    try {
      const anilistResults = await fetchAniListAnime({ search: cleanQuery, perPage: limit });
      if (anilistResults && anilistResults.length > 0) {
        recordProviderSuccess("anilist");
        anilistResults.forEach(cacheAnime);
        return anilistResults;
      }
    } catch {
      failed++;
      recordProviderFailure("anilist");
      console.warn("AniList search failed, entering cooldown, falling back to Jikan");
    }
  }

  // 2. Fallback to Jikan if healthy
  if (isProviderHealthy("jikan")) {
    attempted++;
    try {
      const jikanResults = await fetchJikanAnime({ search: cleanQuery, limit });
      if (jikanResults && jikanResults.length > 0) {
        recordProviderSuccess("jikan");
        jikanResults.forEach(cacheAnime);
        return jikanResults;
      }
    } catch {
      failed++;
      recordProviderFailure("jikan");
      console.warn("Jikan search failed, entering cooldown, falling back to Kitsu");
    }
  }

  // 3. Fallback to Kitsu (always attempt as reliable fallback)
  attempted++;
  try {
    const kitsuResults = await fetchKitsuAnime({ search: cleanQuery, limit });
    if (kitsuResults && kitsuResults.length > 0) {
      kitsuResults.forEach(cacheAnime);
      return kitsuResults;
    }
  } catch {
    failed++;
    console.warn("Kitsu search failed");
  }

  // If all attempted providers encountered network or server errors, do not disguise as zero results
  if (attempted > 0 && failed === attempted) {
    throw new Error("All search providers are currently unavailable");
  }

  return [];
}

export async function getTrendingAnime(limit: number = 15): Promise<Anime[]> {
  // 1. Try AniList if healthy
  if (isProviderHealthy("anilist")) {
    try {
      const anilistResults = await fetchAniListAnime({ 
        sort: ["TRENDING_DESC"], 
        perPage: limit 
      });
      if (anilistResults && anilistResults.length > 0) {
        recordProviderSuccess("anilist");
        anilistResults.forEach(cacheAnime);
        return anilistResults;
      }
    } catch {
      recordProviderFailure("anilist");
      console.warn("AniList trending failed, falling back to Jikan");
    }
  }

  // 2. Fallback to Jikan if healthy
  if (isProviderHealthy("jikan")) {
    try {
      const jikanResults = await fetchJikanPopular(limit);
      if (jikanResults && jikanResults.length > 0) {
        recordProviderSuccess("jikan");
        jikanResults.forEach(cacheAnime);
        return jikanResults;
      }
    } catch {
      recordProviderFailure("jikan");
      console.warn("Jikan trending failed, falling back to Kitsu");
    }
  }

  // 3. Fallback to Kitsu (always attempt)
  try {
    const kitsuResults = await fetchKitsuTrending(limit);
    if (kitsuResults && kitsuResults.length > 0) {
      kitsuResults.forEach(cacheAnime);
      return kitsuResults;
    }
  } catch {
    console.warn("Kitsu trending failed");
  }

  return [];
}


export async function getAllTimeFavorites(limit: number = 10): Promise<Anime[]> {
  // 1. Try AniList with sort: [FAVOURITES_DESC]
  if (isProviderHealthy("anilist")) {
    try {
      const anilistResults = await fetchAniListAnime({
        sort: ["FAVOURITES_DESC"],
        perPage: limit,
      });
      if (anilistResults && anilistResults.length > 0) {
        recordProviderSuccess("anilist");
        anilistResults.forEach(cacheAnime);
        return anilistResults;
      }
    } catch {
      recordProviderFailure("anilist");
      console.warn("AniList favorites failed, falling back to Jikan");
    }
  }

  // 2. Fallback to Jikan top favorites
  if (isProviderHealthy("jikan")) {
    try {
      const jikanResults = await fetchJikanTop(limit, "favorite");
      if (jikanResults && jikanResults.length > 0) {
        recordProviderSuccess("jikan");
        jikanResults.forEach(cacheAnime);
        return jikanResults;
      }
    } catch {
      recordProviderFailure("jikan");
      console.warn("Jikan favorite failed, falling back to Kitsu");
    }
  }

  // 3. Fallback to Kitsu sorted by userCount / favorites
  try {
    const kitsuResults = await fetchKitsuPopular(limit);
    if (kitsuResults && kitsuResults.length > 0) {
      kitsuResults.forEach(cacheAnime);
      return kitsuResults;
    }
  } catch {
    console.warn("Kitsu popular fallback failed");
  }

  return []
}
export async function getPopularAnime(limit: number = 15): Promise<Anime[]> {
  // 1. Try AniList if healthy
  if (isProviderHealthy("anilist")) {
    try {
      const anilistResults = await fetchAniListAnime({ 
        sort: ["POPULARITY_DESC"], 
        perPage: limit 
      });
      if (anilistResults && anilistResults.length > 0) {
        recordProviderSuccess("anilist");
        anilistResults.forEach(cacheAnime);
        return anilistResults;
      }
    } catch {
      recordProviderFailure("anilist");
      console.warn("AniList popular failed, falling back to Jikan");
    }
  }

  // 2. Fallback to Jikan if healthy
  if (isProviderHealthy("jikan")) {
    try {
      const jikanResults = await fetchJikanPopular(limit);
      if (jikanResults && jikanResults.length > 0) {
        recordProviderSuccess("jikan");
        jikanResults.forEach(cacheAnime);
        return jikanResults;
      }
    } catch {
      recordProviderFailure("jikan");
      console.warn("Jikan popular failed, falling back to Kitsu");
    }
  }

  // 3. Fallback to Kitsu (always attempt)
  try {
    const kitsuResults = await fetchKitsuPopular(limit);
    if (kitsuResults && kitsuResults.length > 0) {
      kitsuResults.forEach(cacheAnime);
      return kitsuResults;
    }
  } catch {
    console.warn("Kitsu popular failed");
  }

  return [];
}

export interface LatestEpisodeRelease {
  id: string;
  animeId: string;
  title: string;
  image: string;
  /** Real episode number from the provider's episode record. null when unknown. */
  episode: number | null;
  format?: string;
  score?: number;
  /** Real release timestamp (ms) of the specific episode, when the provider gives one. */
  releasedAt?: number;
  timeAgo: string;
  /** true / false only when provider-verified; null = not verified. */
  hasSub: boolean | null;
  hasDub: boolean | null;
}

/**
 * Fetches real, currently airing episodes from active broadcasting seasons (Jikan / Kitsu).
 * Returns actual episode numbers and airing information from providers.
 * Does not generate mock data.
 */
interface JikanEpisodeRecord {
  /** In Jikan's /anime/{id}/episodes payload, `mal_id` IS the episode number. */
  mal_id?: number;
  title?: string | null;
  aired?: string | null;
  filler?: boolean;
  recap?: boolean;
}

/**
 * Fetches real, currently airing episodes from active broadcasting seasons (Jikan / Kitsu).
 *
 * Data integrity rules:
 * - Episode numbers come ONLY from provider episode records (never from total counts,
 *   array indexes or elapsed time).
 * - Release dates come ONLY from provider episode records (never from the series premiere date).
 * - Missing values are surfaced as null / "Release date unavailable" — never fabricated.
 */
export async function getTopAiringAnime(limit: number = 10): Promise<Anime[]> {
  // 1. Primary: AniList top releasing anime sorted by verified community score
  if (isProviderHealthy("anilist")) {
    try {
      const { fetchAniListTopAiring } = await import("./anilist");
      const anilistResults = await fetchAniListTopAiring(limit);
      if (anilistResults && anilistResults.length > 0) {
        recordProviderSuccess("anilist");
        anilistResults.forEach(cacheAnime);
        return anilistResults;
      }
    } catch {
      recordProviderFailure("anilist");
      console.warn("AniList top airing failed, falling back to Jikan");
    }
  }

  // 2. Fallback: Jikan top airing
  if (isProviderHealthy("jikan")) {
    try {
      const jikanResults = await fetchJikanTop(limit, "airing");
      if (jikanResults && jikanResults.length > 0) {
        recordProviderSuccess("jikan");
        jikanResults.forEach(cacheAnime);
        return jikanResults;
      }
    } catch {
      recordProviderFailure("jikan");
      console.warn("Jikan top airing failed, falling back to trending");
    }
  }

  // 3. Fallback: AniList trending
  const trending = await getTrendingAnime(limit);
  if (trending && trending.length > 0) return trending;

  // 4. Ultimate fallback: popular
  return getPopularAnime(limit);
}

export async function getLatestAiringAnime(limit: number = 24): Promise<LatestEpisodeRelease[]> {
  interface InternalRelease {
    release: LatestEpisodeRelease;
    releasedAt: number | null; // valid ms timestamp of the episode, or null when unknown
  }
  const releases: InternalRelease[] = [];
  const now = Date.now();

  const toTimeAgo = (releasedAt: number | null): string => {
    if (releasedAt === null || Number.isNaN(releasedAt)) return "Release date unavailable";
    const diffMs = now - releasedAt;
    if (diffMs < 0) return "Upcoming";
    const minsAgo = Math.floor(diffMs / (60 * 1000));
    if (minsAgo < 60) return `${Math.max(minsAgo, 1)}m ago`;
    const hoursAgo = Math.floor(diffMs / (60 * 60 * 1000));
    if (hoursAgo < 24) return `${hoursAgo}h ago`;
    const daysAgo = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (daysAgo === 1) return "Yesterday";
    return `${daysAgo}d ago`;
  };

  // 1. Primary: AniList recent airing schedule (airingAt <= now, sorted by TIME_DESC)
  if (isProviderHealthy("anilist")) {
    try {
      const { fetchAniListRecentAiringSchedule } = await import("./anilist");
      const anilistRecent = await fetchAniListRecentAiringSchedule(Math.max(limit, 30));
      if (anilistRecent && anilistRecent.length > 0) {
        recordProviderSuccess("anilist");
        for (const item of anilistRecent) {
          if (item.episodeNumber === null || item.episodeNumber === undefined) continue;
          const releasedAt = item.airingAtTimestamp ? item.airingAtTimestamp * 1000 : null;
          if (releasedAt !== null && releasedAt > now) continue;

          releases.push({
            release: {
              id: `${item.animeId}-ep${item.episodeNumber}`,
              animeId: item.animeId,
              title: item.animeTitle,
              image: item.animeImage,
              episode: item.episodeNumber,
              format: item.format || "TV",
              score: item.score,
              releasedAt: releasedAt ?? undefined,
              timeAgo: toTimeAgo(releasedAt),
              hasSub: null,
              hasDub: null,
            },
            releasedAt,
          });
        }
      }
    } catch (e) {
      recordProviderFailure("anilist");
      console.warn("AniList recent airing failed, falling back to Jikan:", e);
    }
  }

  // Cross-check ReAnime live stream availability for the top 6 releases in parallel (runtime only)
  if (releases.length > 0 && process.env.NEXT_PHASE !== "phase-production-build") {
    const toCheck = releases.slice(0, 6);
    try {
      const { fetchReanimeServers } = await import("./reanime");
      await Promise.allSettled(
        toCheck.map(async (item) => {
          if (!item.release.episode) return;
          const cleanId = item.release.animeId.replace(/^anilist-/, "");
          const reanimeRes = await fetchReanimeServers(cleanId, item.release.episode, false);
          if (reanimeRes.success) {
            item.release.hasSub = reanimeRes.hasSub;
            item.release.hasDub = reanimeRes.hasDub;
          }
        })
      );
    } catch {}
  }

  // 2. Fallback: Jikan current season + real per-episode records
  if (releases.length === 0 && isProviderHealthy("jikan")) {
    try {
      const res = await fetch("https://api.jikan.moe/v4/seasons/now?limit=12", {
        headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 NextGenAnime/1.0" },
        signal: AbortSignal.timeout(5000),
        next: { revalidate: 1800 },
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          const seen = new Set<number>();
          const valid = (json.data as { mal_id?: number }[]).filter((item) => {
            if (!item.mal_id || seen.has(item.mal_id)) return false;
            seen.add(item.mal_id);
            return true;
          });

          // Fetch REAL episode records per anime with bounded concurrency.
          const episodeItems = valid.slice(0, Math.max(limit, 12));
          for (let i = 0; i < episodeItems.length; i += 3) {
            await Promise.allSettled(episodeItems.slice(i, i + 3).map(async (item: { mal_id?: number; title_english?: string | null; title?: string | null; images?: { webp?: { large_image_url?: string; image_url?: string }; jpg?: { large_image_url?: string } }; type?: string; score?: number }) => {
              if (!item.mal_id) return;
              try {
                const epRes = await fetch(`https://api.jikan.moe/v4/anime/${item.mal_id}/episodes`, {
                  headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 NextGenAnime/1.0" },
                  signal: AbortSignal.timeout(4000),
                  next: { revalidate: 1800 },
                });
                if (!epRes.ok) return;
                const epJson = await epRes.json();
                if (!Array.isArray(epJson.data) || epJson.data.length === 0) return;

                const records = epJson.data as JikanEpisodeRecord[];
                let latest: { number: number; aired: string } | null = null;
                let latestMs = Number.NaN;
                for (const ep of records) {
                  const recordNum = typeof ep.mal_id === "number" && Number.isFinite(ep.mal_id) && ep.mal_id > 0 ? ep.mal_id : null;
                  if (recordNum === null) continue;
                  const airedMs = ep.aired ? Date.parse(ep.aired) : Number.NaN;
                  if (Number.isNaN(airedMs)) continue;
                  if (airedMs > now) continue;
                  if (!latest || airedMs > latestMs) {
                    latest = { number: recordNum, aired: ep.aired! };
                    latestMs = airedMs;
                  }
                }
                if (!latest) return;

                const releasedAt = Date.parse(latest.aired);
                releases.push({
                  release: {
                    id: `mal-${item.mal_id}-ep${latest.number}`,
                    animeId: `mal-${item.mal_id}`,
                    title: item.title_english || item.title || "Anime",
                    image: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || item.images?.webp?.image_url || "/placeholder-cover.svg",
                    episode: latest.number,
                    format: item.type || "TV",
                    score: item.score ? Math.round(item.score * 10) : undefined,
                    releasedAt,
                    timeAgo: toTimeAgo(releasedAt),
                    hasSub: null,
                    hasDub: null,
                  },
                  releasedAt,
                });
              } catch {
                // episode record unavailable for this anime — omit rather than fabricate
              }
            }));
          }

        }
      }
    } catch (e) {
      console.warn("Jikan seasons/now + episodes failed:", e);
    }
  }

  // 3. Fallback: Kitsu current season anime + real episode records
  if (releases.length === 0) {
    try {
      const res = await fetch("https://kitsu.io/api/edge/anime?filter[status]=current&page[limit]=12&sort=-userCount", {
        headers: { "Accept": "application/vnd.api+json" },
        signal: AbortSignal.timeout(5000),
        next: { revalidate: 1800 },
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          const items = (json.data as { id: string | number; attributes?: { canonicalTitle?: string | null; titles?: { en?: string | null; en_us?: string | null; en_jp?: string | null } | null; posterImage?: { large?: string; medium?: string; original?: string } | null; subtype?: string | null; averageRating?: string | null } | null }[]);

          const episodeFetches = items.slice(0, Math.max(limit, 10)).map(async (item) => {
            const attr = item.attributes || {};
            try {
              const epRes = await fetch(`https://kitsu.io/api/edge/anime/${item.id}/episodes?page[limit]=10&sort=-number`, {
                headers: { "Accept": "application/vnd.api+json" },
                signal: AbortSignal.timeout(4000),
                next: { revalidate: 1800 },
              });
              if (!epRes.ok) return;
              const epJson = await epRes.json();
              const pageEps = Array.isArray(epJson.data) ? epJson.data : [];
              let latestReleased: { number: number; releasedAt: number } | null = null;
              for (const ep of pageEps) {
                const epAttrs = ep?.attributes as { number?: number | null; airdate?: string | null };
                const num = typeof epAttrs?.number === "number" && epAttrs.number > 0 ? epAttrs.number : null;
                const epMs = epAttrs?.airdate ? Date.parse(epAttrs.airdate) : Number.NaN;
                if (num !== null && !Number.isNaN(epMs) && epMs <= now) {
                  if (!latestReleased || epMs > latestReleased.releasedAt) {
                    latestReleased = { number: num, releasedAt: epMs };
                  }
                }
              }

              if (!latestReleased) return;

              releases.push({
                release: {
                  id: `kitsu-${item.id}-ep${latestReleased.number}`,
                  animeId: `kitsu-${item.id}`,
                  title: attr.canonicalTitle || attr.titles?.en || attr.titles?.en_us || attr.titles?.en_jp || "Anime",
                  image: attr.posterImage?.large || attr.posterImage?.medium || attr.posterImage?.original || "/placeholder-cover.svg",
                  episode: latestReleased.number,
                  format: attr.subtype?.toUpperCase() || "TV",
                  score: attr.averageRating ? Math.round(parseFloat(attr.averageRating)) : undefined,
                  releasedAt: latestReleased.releasedAt,
                  timeAgo: toTimeAgo(latestReleased.releasedAt),
                  hasSub: null,
                  hasDub: null,
                },
                releasedAt: latestReleased.releasedAt,
              });
            } catch {
              // omit rather than fabricate
            }
          });

          await Promise.allSettled(episodeFetches);
        }
      }
    } catch (e) {
      console.warn("Kitsu currently-airing + episodes fallback failed:", e);
    }
  }

  // Sort by the episodes' real release timestamps (newest first), unknown last
  releases.sort((a, b) => {
    if (a.releasedAt !== null && b.releasedAt !== null) return b.releasedAt - a.releasedAt;
    if (a.releasedAt !== null) return -1;
    if (b.releasedAt !== null) return 1;
    return 0;
  });

  return releases.slice(0, limit).map((r) => r.release);
}


/**
 * Fetch a single anime by unified provider-prefixed ID (e.g. anilist-21, mal-21, kitsu-7442)
 * Strictly preserves provider identity without cross-provider ID collisions.
 */
export async function getAnimeById(idStr: string): Promise<Anime | null> {
  if (!idStr) return null;

  // Check cache first
  const cached = getFromCache(idStr);
  if (cached) return cached;

  // 1. AniList format: strictly owned by AniList
  if (idStr.startsWith("anilist-")) {
    const id = parseInt(idStr.replace("anilist-", ""), 10);
    if (!isNaN(id)) {
      if (isProviderHealthy("anilist")) {
        try {
          const anime = await fetchAniListAnimeById(id);
          if (anime) {
            recordProviderSuccess("anilist");
            cacheAnime(anime);
            return anime;
          }
        } catch {
          recordProviderFailure("anilist");
        }
      }

      // If AniList fails or is rate-limited, ONLY fallback if a verified mapping exists
      // Check cache for previously mapped MAL or Kitsu IDs
      const mappedEntry = getFromCache(`anilist-${id}`);
      if (mappedEntry?.malId && isProviderHealthy("jikan")) {
        try {
          const jikanAnime = await fetchJikanAnimeById(mappedEntry.malId);
          if (jikanAnime) {
            recordProviderSuccess("jikan");
            cacheAnime(jikanAnime);
            return jikanAnime;
          }
        } catch {
          recordProviderFailure("jikan");
        }
      }

      if (mappedEntry?.kitsuId) {
        try {
          const kitsuAnime = await fetchKitsuAnimeById(mappedEntry.kitsuId);
          if (kitsuAnime) {
            cacheAnime(kitsuAnime);
            return kitsuAnime;
          }
        } catch {}
      }

      // Direct fallback: resolve AniList ID via Kitsu external mapping
      try {
        const mapRes = await fetch(
          `https://kitsu.io/api/edge/mappings?filter[externalSite]=anilist/anime&filter[externalId]=${id}&include=item`,
          {
            headers: { "Accept": "application/vnd.api+json" },
            signal: AbortSignal.timeout(4000),
          }
        );
        if (mapRes.ok) {
          const mapJson = await mapRes.json();
          const kitsuId = mapJson.included?.[0]?.id;
          if (kitsuId) {
            const kitsuAnime = await fetchKitsuAnimeById(kitsuId);
            if (kitsuAnime) {
              kitsuAnime.id = idStr;
              kitsuAnime.anilistId = id;
              cacheAnime(kitsuAnime);
              return kitsuAnime;
            }
          }
        }
      } catch {}

      // If title is known from cached entry, try exact title resolution on Kitsu
      const titleToFind = mappedEntry?.title?.english || mappedEntry?.title?.romaji;
      if (titleToFind) {
        try {
          const searchResults = await fetchKitsuAnime({ search: titleToFind, limit: 1 });
          if (searchResults.length > 0) {
            const first = searchResults[0];
            // Verify title similarity before accepting
            const foundTitle = first.title.english || first.title.romaji || "";
            if (foundTitle.toLowerCase().includes(titleToFind.toLowerCase().slice(0, 8))) {
              cacheAnime(first);
              return first;
            }
          }
        } catch {}
      }
    }
    return null;
  }

  // 2. MAL / Jikan format: strictly owned by MyAnimeList
  if (idStr.startsWith("mal-")) {
    const id = parseInt(idStr.replace("mal-", ""), 10);
    if (!isNaN(id)) {
      if (isProviderHealthy("jikan")) {
        try {
          const anime = await fetchJikanAnimeById(id);
          if (anime) {
            recordProviderSuccess("jikan");
            cacheAnime(anime);
            return anime;
          }
        } catch {
          recordProviderFailure("jikan");
        }
      }

      // Fallback only if verified mapping exists
      const mappedEntry = getFromCache(`mal-${id}`);
      if (mappedEntry?.kitsuId) {
        try {
          const kitsuAnime = await fetchKitsuAnimeById(mappedEntry.kitsuId);
          if (kitsuAnime) {
            cacheAnime(kitsuAnime);
            return kitsuAnime;
          }
        } catch {}
      }
    }
    return null;
  }

  // 3. Kitsu format: strictly owned by Kitsu
  if (idStr.startsWith("kitsu-")) {
    const cleanId = idStr.replace("kitsu-", "");
    try {
      const anime = await fetchKitsuAnimeById(cleanId);
      if (anime) {
        recordProviderSuccess("kitsu");
        cacheAnime(anime);
        return anime;
      }
    } catch {
      recordProviderFailure("kitsu");
    }
    return null;
  }

  // 4. Deterministic resolution for legacy naked numeric IDs
  if (/^\d+$/.test(idStr)) {
    // Naked numeric IDs are deprecated. We assume they are AniList IDs 
    // because that was the original database convention, but we will wrap it and process strictly as AniList.
    const numId = parseInt(idStr, 10);
    console.warn(`[getAnimeById] WARNING: Received naked numeric ID ${idStr}. Defaulting to AniList resolver for legacy compatibility. Update caller to use prefixed IDs.`);
    
    if (isProviderHealthy("anilist")) {
      try {
        const anilistAnime = await fetchAniListAnimeById(numId);
        if (anilistAnime) {
          recordProviderSuccess("anilist");
          cacheAnime(anilistAnime);
          return anilistAnime;
        }
      } catch {
        recordProviderFailure("anilist");
      }
    }
    return null;
  }

  return null;
}

export async function getAnimeEpisodes(
  animeId: string,
  title?: string,
  animeObj?: import("./types").Anime | null
): Promise<import("./types").Episode[]> {
  const cached = animeObj || getFromCache(animeId);
  const resolvedTitle = title || cached?.title?.english || cached?.title?.romaji;
  const latestAiredEpisode = cached?.nextAiringEpisode?.episode
    ? cached.nextAiringEpisode.episode - 1
    : undefined;

  // Resolve provider IDs
  let malId = cached?.malId;
  let anilistId = cached?.anilistId;
  if (!malId && animeId.startsWith("mal-")) {
    const parsed = parseInt(animeId.replace("mal-", ""), 10);
    if (!isNaN(parsed)) malId = parsed;
  }
  if (!anilistId && animeId.startsWith("anilist-")) {
    const parsed = parseInt(animeId.replace("anilist-", ""), 10);
    if (!isNaN(parsed)) anilistId = parsed;
  }

  // Multi-provider parallel episode fetching
  const { fetchKitsuEpisodes } = await import("./kitsu");
  const { fetchJikanEpisodes } = await import("./jikan");
  const { fetchAniListStreamingEpisodes } = await import("./anilist");

  const [kitsuResult, jikanResult, anilistResult] = await Promise.allSettled([
    fetchKitsuEpisodes(animeId, resolvedTitle, cached?.status, latestAiredEpisode),
    malId ? fetchJikanEpisodes(malId) : Promise.resolve([]),
    anilistId ? fetchAniListStreamingEpisodes(anilistId) : Promise.resolve([]),
  ]);

  const kitsuEpisodes = kitsuResult.status === "fulfilled" ? kitsuResult.value : [];
  const jikanEpisodes = jikanResult.status === "fulfilled" ? jikanResult.value : [];
  const anilistEpisodes = anilistResult.status === "fulfilled" ? anilistResult.value : [];

  // Merge episodes by canonical episode number
  const mergedMap = new Map<number, import("./types").Episode>();

  // 1. Seed with Jikan episodes (accurate numbers, titles, and air dates)
  for (const ep of jikanEpisodes) {
    if (typeof ep.number === "number" && ep.number > 0) {
      mergedMap.set(ep.number, { ...ep });
    }
  }

  // 2. Merge Kitsu episodes (enriches thumbnails, descriptions, and air dates)
  for (const ep of kitsuEpisodes) {
    if (typeof ep.number === "number" && ep.number > 0) {
      const existing = mergedMap.get(ep.number);
      if (!existing) {
        mergedMap.set(ep.number, { ...ep });
      } else {
        if (ep.thumbnail && !existing.thumbnail) existing.thumbnail = ep.thumbnail;
        if (ep.synopsis && !existing.synopsis) existing.synopsis = ep.synopsis;
        if (ep.length && !existing.length) existing.length = ep.length;
        if (ep.airdate && !existing.airdate) {
          existing.airdate = ep.airdate;
          existing.airdateTimestamp = ep.airdateTimestamp;
        }
        if (ep.status === "released" || existing.status === "released") {
          existing.status = "released";
        } else if (ep.status === "upcoming" && existing.status === "upcoming") {
          existing.status = "upcoming";
        }
      }
    }
  }

  // 3. Merge AniList streaming episodes (confirms released stream status)
  for (const ep of anilistEpisodes) {
    if (typeof ep.number === "number" && ep.number > 0) {
      const existing = mergedMap.get(ep.number);
      if (!existing) {
        mergedMap.set(ep.number, { ...ep });
      } else {
        if (ep.thumbnail && (!existing.thumbnail || existing.thumbnail.includes("placeholder"))) {
          existing.thumbnail = ep.thumbnail;
        }
        if (ep.status === "released") {
          existing.status = "released";
        }
      }
    }
  }

  const rawSorted = Array.from(mergedMap.values()).sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  const { normalizeEpisodeReleaseStatuses } = await import("./episodesCanonical");
  return normalizeEpisodeReleaseStatuses(cached, rawSorted);
}

export async function getAnimeStreamingLinks(animeId: string): Promise<import("./types").StreamingLink[]> {
  const { fetchKitsuStreamingLinks } = await import("./kitsu");
  return fetchKitsuStreamingLinks(animeId);
}

export async function getAnimeCharacters(animeId: string): Promise<import("./types").Character[]> {
  const { fetchKitsuCharacters } = await import("./kitsu");
  return fetchKitsuCharacters(animeId);
}

export async function getAnimeStaff(animeId: string): Promise<import("./types").StaffPerson[]> {
  const { fetchKitsuStaff } = await import("./kitsu");
  return fetchKitsuStaff(animeId);
}

export async function getAnimeRelations(animeId: string, title?: string): Promise<import("./types").AnimeRelation[]> {
  const { fetchKitsuRelations } = await import("./kitsu");
  const cached = getFromCache(animeId);
  const resolvedTitle = title || cached?.title?.english || cached?.title?.romaji;
  return fetchKitsuRelations(animeId, resolvedTitle);
}

export async function getAnimeRecommendations(animeId: string, limit: number = 8): Promise<Anime[]> {
  const cached = getFromCache(animeId);
  const cleanId = animeId.replace(/^(anilist-|mal-|kitsu-)/, "");

  // 1. AniList authoritative recommendations
  if (animeId.startsWith("anilist-") || cached?.anilistId) {
    const anilistId = cached?.anilistId || parseInt(cleanId, 10);
    if (!isNaN(anilistId) && isProviderHealthy("anilist")) {
      try {
        const { fetchAniListRecommendations } = await import("./anilist");
        const recs = await fetchAniListRecommendations(anilistId, limit);
        if (recs && recs.length > 0) {
          recs.forEach(cacheAnime);
          return recs;
        }
      } catch (e) {
        console.warn("AniList recommendations failed:", e);
      }
    }
  }

  // 2. Jikan recommendations if MAL ID available
  const malId = cached?.malId || (animeId.startsWith("mal-") ? parseInt(cleanId, 10) : undefined);
  if (malId && isProviderHealthy("jikan")) {
    try {
      const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}/recommendations`, {
        headers: { "User-Agent": "NextGenAnime/1.0" },
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.data)) {
          const recs: Anime[] = json.data
            .slice(0, limit)
            .map((item: { entry?: { mal_id?: number; title?: string; images?: { webp?: { image_url?: string; large_image_url?: string }; jpg?: { image_url?: string; large_image_url?: string } } } }) => {
              const entry = item.entry;
              if (!entry?.mal_id) return null;
              return {
                id: `mal-${entry.mal_id}`,
                provider: "mal" as const,
                malId: entry.mal_id,
                title: {
                  english: entry.title,
                  romaji: entry.title,
                },
                images: {
                  cover: entry.images?.webp?.image_url || entry.images?.jpg?.image_url,
                  largeCover: entry.images?.webp?.large_image_url || entry.images?.jpg?.large_image_url,
                },
              };
            })
            .filter((a: Anime | null): a is Anime => a !== null);

          if (recs.length > 0) {
            recs.forEach(cacheAnime);
            return recs;
          }
        }
      }
    } catch (e) {
      console.warn("Jikan recommendations failed:", e);
    }
  }

  // 3. Fallback: Related franchise titles
  try {
    const relations = await getAnimeRelations(animeId);
    if (relations.length > 0) {
      const relatedAnimes: Anime[] = relations.slice(0, limit).map((r) => ({
        id: r.anime.id,
        provider: "kitsu" as const,
        title: { english: r.anime.title, romaji: r.anime.title },
        images: { cover: r.anime.image, largeCover: r.anime.image },
        year: r.anime.year,
        format: r.anime.format,
        episodes: r.anime.episodes,
      }));
      return relatedAnimes;
    }
  } catch {}

  // 4. Fallback: Popular anime pool
  try {
    const popular = await getPopularAnime(limit + 2);
    return popular.filter((a) => a.id !== animeId).slice(0, limit);
  } catch {
    return [];
  }
}

export async function getSeasonalAnime(season: string, year: number, limit: number = 24): Promise<Anime[]> {
  const { fetchKitsuSeasonal } = await import("./kitsu");
  const results = await fetchKitsuSeasonal(season, year, limit);
  results.forEach(cacheAnime);
  return results;
}

export async function getAiringSchedule(day?: string, limit: number = 150): Promise<import("./types").AiringSchedule[]> {
  const targetDay = day && day.toLowerCase() !== "all days"
    ? day.toLowerCase().replace(/s$/, "").trim()
    : undefined;

  let items: import("./types").AiringSchedule[] = [];

  // 1. Primary: AniList authoritative weekly broadcast schedule
  if (isProviderHealthy("anilist")) {
    try {
      const anilistSchedule = await import("./anilist").then(({ fetchAniListAiringSchedule }) => fetchAniListAiringSchedule(limit));
      if (anilistSchedule && anilistSchedule.length > 0) {
        items = anilistSchedule;
        recordProviderSuccess("anilist");
      }
    } catch (e) {
      recordProviderFailure("anilist");
      console.warn("AniList schedule failed, attempting fallbacks:", e);
    }
  }

  // 2. Secondary & Tertiary fallbacks if AniList returned limited data
  if (items.length < 20) {
    const fallbackResults = await Promise.allSettled([
      isProviderHealthy("jikan")
        ? import("./jikan").then(({ fetchJikanSchedules }) => fetchJikanSchedules(day)).catch(() => [])
        : Promise.resolve([]),
      import("./kitsu").then(({ fetchKitsuAiringSchedule }) => fetchKitsuAiringSchedule(limit)).catch(() => []),
    ]);

    for (const res of fallbackResults) {
      if (res.status === "fulfilled" && Array.isArray(res.value)) {
        items.push(...res.value);
      }
    }
  }

  const filtered = targetDay
    ? items.filter((item) => (item.airingAt || "").toLowerCase().replace(/s$/, "").trim() === targetDay)
    : items;

  const seen = new Set<string>();
  return filtered
    .filter((item) => {
      const identityKey = item.anilistId
        ? `ani-${item.anilistId}`
        : item.malId
        ? `mal-${item.malId}`
        : (item.animeTitle || item.animeId).toLowerCase().replace(/[^a-z0-9]/g, "");
      const epKey = item.episodeNumber ?? "unknown";
      const dateKey = item.airingDate || (item.airingAtTimestamp ? String(Math.floor(item.airingAtTimestamp / 86400)) : item.airingAt);
      const dedupeKey = `${identityKey}|${epKey}|${dateKey}`;

      if (seen.has(dedupeKey)) return false;
      seen.add(dedupeKey);
      return true;
    })
    .sort((a, b) => (a.airingAtTimestamp || Number.MAX_SAFE_INTEGER) - (b.airingAtTimestamp || Number.MAX_SAFE_INTEGER));
}

export async function getCharacterById(id: string): Promise<import("./types").Character | null> {
  const { fetchKitsuCharacterById } = await import("./kitsu");
  return fetchKitsuCharacterById(id);
}

export async function getStaffPersonById(id: string): Promise<import("./types").StaffPerson | null> {
  const { fetchKitsuPersonById } = await import("./kitsu");
  return fetchKitsuPersonById(id);
}

export interface DiscoverAnimeResult {
  anime: Anime[];
  hasMore: boolean;
}

export async function discoverAnime(params: {
  search?: string;
  genre?: string;
  format?: string;
  status?: string;
  year?: number;
  season?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}): Promise<DiscoverAnimeResult> {
  const { fetchKitsuAdvanced } = await import("./kitsu");
  const result = await fetchKitsuAdvanced(params);
  result.anime.forEach(cacheAnime);
  return result;
}

export async function getRandomAnime(): Promise<Anime | null> {
  const popular = await getPopularAnime(20);
  if (!popular || popular.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * popular.length);
  return popular[randomIndex];
}

export async function getCharactersList(params: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<import("./types").Character[]> {
  const { fetchKitsuCharactersList } = await import("./kitsu");
  return fetchKitsuCharactersList(params);
}

export async function getCharacterAnime(characterId: string): Promise<Anime[]> {
  const { fetchKitsuCharacterAnime } = await import("./kitsu");
  const results = await fetchKitsuCharacterAnime(characterId);
  results.forEach(cacheAnime);
  return results;
}

export async function getPeopleList(params: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<import("./types").StaffPerson[]> {
  const { fetchKitsuPeopleList } = await import("./kitsu");
  return fetchKitsuPeopleList(params);
}

export async function getPersonAnime(personId: string): Promise<Anime[]> {
  const { fetchKitsuPersonAnime } = await import("./kitsu");
  const results = await fetchKitsuPersonAnime(personId);
  results.forEach(cacheAnime);
  return results;
}

export async function getStudiosList(params: {
  limit?: number;
  offset?: number;
}): Promise<import("./types").Studio[]> {
  const { fetchKitsuStudiosList } = await import("./kitsu");
  return fetchKitsuStudiosList(params);
}

export async function getStudioById(id: string): Promise<import("./types").Studio | null> {
  const { fetchKitsuStudioById } = await import("./kitsu");
  return fetchKitsuStudioById(id);
}

export async function getStudioAnime(studioId: string): Promise<Anime[]> {
  const { fetchKitsuStudioAnime } = await import("./kitsu");
  const results = await fetchKitsuStudioAnime(studioId);
  results.forEach(cacheAnime);
  return results;
}

export { calculateLatestReleasedEpisode, normalizeEpisodeReleaseStatuses } from "./episodesCanonical";

