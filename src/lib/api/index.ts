import { fetchAniListAnime, fetchAniListAnimeById } from "./anilist";
import { fetchJikanAnime, fetchJikanAnimeById, fetchJikanPopular } from "./jikan";
import { fetchKitsuAnime, fetchKitsuAnimeById, fetchKitsuTrending, fetchKitsuPopular } from "./kitsu";
import { Anime } from "./types";

// In-memory runtime cache for anime objects across providers
const animeCache = new Map<string, { data: Anime; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

function cacheAnime(anime: Anime) {
  if (!anime || !anime.id) return;
  const entry = { data: anime, timestamp: Date.now() };
  animeCache.set(anime.id, entry);
  if (anime.anilistId) animeCache.set(`anilist-${anime.anilistId}`, entry);
  if (anime.malId) animeCache.set(`mal-${anime.malId}`, entry);
  if (anime.kitsuId) animeCache.set(`kitsu-${anime.kitsuId}`, entry);
}

function getFromCache(key: string): Anime | null {
  const cached = animeCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    animeCache.delete(key);
    return null;
  }
  return cached.data;
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

function recordProviderFailure(name: string) {
  providerCooldowns[name] = Date.now() + COOLDOWN_MS;
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

  // 1. Try AniList if healthy
  if (isProviderHealthy("anilist")) {
    try {
      const anilistResults = await fetchAniListAnime({ search: cleanQuery, perPage: limit });
      if (anilistResults && anilistResults.length > 0) {
        recordProviderSuccess("anilist");
        anilistResults.forEach(cacheAnime);
        return anilistResults;
      }
    } catch {
      recordProviderFailure("anilist");
      console.warn("AniList search failed, entering cooldown, falling back to Jikan");
    }
  }

  // 2. Fallback to Jikan if healthy
  if (isProviderHealthy("jikan")) {
    try {
      const jikanResults = await fetchJikanAnime({ search: cleanQuery, limit });
      if (jikanResults && jikanResults.length > 0) {
        recordProviderSuccess("jikan");
        jikanResults.forEach(cacheAnime);
        return jikanResults;
      }
    } catch {
      recordProviderFailure("jikan");
      console.warn("Jikan search failed, entering cooldown, falling back to Kitsu");
    }
  }

  // 3. Fallback to Kitsu (always attempt as reliable fallback)
  try {
    const kitsuResults = await fetchKitsuAnime({ search: cleanQuery, limit });
    if (kitsuResults && kitsuResults.length > 0) {
      kitsuResults.forEach(cacheAnime);
      return kitsuResults;
    }
  } catch {
    console.warn("Kitsu search failed");
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

export async function getAnimeEpisodes(animeId: string, title?: string): Promise<import("./types").Episode[]> {
  const { fetchKitsuEpisodes } = await import("./kitsu");
  const cached = getFromCache(animeId);
  const resolvedTitle = title || cached?.title?.english || cached?.title?.romaji;
  return fetchKitsuEpisodes(animeId, resolvedTitle);
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

export async function getSeasonalAnime(season: string, year: number, limit: number = 24): Promise<Anime[]> {
  const { fetchKitsuSeasonal } = await import("./kitsu");
  const results = await fetchKitsuSeasonal(season, year, limit);
  results.forEach(cacheAnime);
  return results;
}

export async function getAiringSchedule(day?: string, limit: number = 30): Promise<import("./types").AiringSchedule[]> {
  try {
    // Primary: Verified Jikan real broadcast schedules
    const { fetchJikanSchedules } = await import("./jikan");
    const jikanSchedules = await fetchJikanSchedules(day);
    if (jikanSchedules && jikanSchedules.length > 0) {
      return jikanSchedules;
    }
  } catch (err) {
    console.warn("Jikan schedule failed:", err);
  }

  try {
    // Secondary: AniList real airing schedule with exact timestamps
    const { fetchAniListAiringSchedule } = await import("./anilist");
    const anilistSchedules = await fetchAniListAiringSchedule(limit);
    if (anilistSchedules && anilistSchedules.length > 0) {
      if (!day || day.toLowerCase() === "all days") return anilistSchedules;
      const filtered = anilistSchedules.filter((s) => s.airingAt.toLowerCase() === day.toLowerCase());
      if (filtered.length > 0) return filtered;
    }
  } catch (err) {
    console.warn("AniList schedule failed:", err);
  }

  // Fallback: Kitsu current anime
  const { fetchKitsuAiringSchedule } = await import("./kitsu");
  return fetchKitsuAiringSchedule(limit);
}

export async function getCharacterById(id: string): Promise<import("./types").Character | null> {
  const { fetchKitsuCharacterById } = await import("./kitsu");
  return fetchKitsuCharacterById(id);
}

export async function getStaffPersonById(id: string): Promise<import("./types").StaffPerson | null> {
  const { fetchKitsuPersonById } = await import("./kitsu");
  return fetchKitsuPersonById(id);
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
}): Promise<Anime[]> {
  const { fetchKitsuAdvanced } = await import("./kitsu");
  const results = await fetchKitsuAdvanced(params);
  results.forEach(cacheAnime);
  return results;
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


