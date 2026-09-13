import { Anime } from "./types";

const KITSU_API_URL = "https://kitsu.io/api/edge";

const KITSU_HEADERS = {
  "Accept": "application/vnd.api+json",
  "Content-Type": "application/vnd.api+json",
  "User-Agent": "NextGenAnime/1.0 (Mozilla/5.0; Windows NT 10.0; Win64; x64)",
};

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 6000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...KITSU_HEADERS,
        ...(options.headers || {}),
      },
      next: { revalidate: 3600 },
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

interface KitsuTitles {
  en?: string | null;
  en_us?: string | null;
  en_jp?: string | null;
  ja_jp?: string | null;
}

interface KitsuAnimeAttributes {
  titles?: KitsuTitles | null;
  canonicalTitle?: string | null;
  abbreviatedTitles?: string[] | null;
  startDate?: string | null;
  averageRating?: string | null;
  synopsis?: string | null;
  description?: string | null;
  posterImage?: {
    original?: string | null;
    large?: string | null;
    medium?: string | null;
  } | null;
  coverImage?: {
    original?: string | null;
    large?: string | null;
  } | null;
  showType?: string | null;
  subtype?: string | null;
  status?: string | null;
  episodeCount?: number | null;
  episodeLength?: number | null;
  popularityRank?: number | null;
  ratingRank?: number | null;
  youtubeVideoId?: string | null;
}

interface KitsuAnimeItem {
  id: string | number;
  type: string;
  attributes?: KitsuAnimeAttributes | null;
}

function normalizeKitsuAnime(item: KitsuAnimeItem): Anime {
  const attrs = item.attributes || {};
  const titles = attrs.titles || {};

  const englishTitle = titles.en || titles.en_us || attrs.canonicalTitle || undefined;
  const romajiTitle = titles.en_jp || attrs.canonicalTitle || undefined;
  const nativeTitle = titles.ja_jp || undefined;

  let year: number | undefined;
  if (attrs.startDate) {
    const parsedYear = parseInt(attrs.startDate.split("-")[0], 10);
    if (!isNaN(parsedYear)) year = parsedYear;
  }

  let score: number | undefined;
  if (attrs.averageRating) {
    const parsedScore = parseFloat(attrs.averageRating);
    if (!isNaN(parsedScore)) score = parsedScore;
  }

  return {
    id: `kitsu-${item.id}`,
    provider: "kitsu",
    kitsuId: String(item.id),
    title: {
      english: englishTitle,
      romaji: romajiTitle,
      native: nativeTitle,
      synonyms: attrs.abbreviatedTitles || [],
    },
    description: attrs.synopsis || attrs.description || "",
    images: {
      cover: attrs.posterImage?.large || attrs.posterImage?.original || attrs.posterImage?.medium || undefined,
      largeCover: attrs.posterImage?.original || attrs.posterImage?.large || undefined,
      banner: attrs.coverImage?.original || attrs.coverImage?.large || (attrs.youtubeVideoId ? `https://img.youtube.com/vi/${attrs.youtubeVideoId}/maxresdefault.jpg` : undefined) || attrs.posterImage?.original || undefined,
    },
    type: attrs.showType || "ANIME",
    format: attrs.subtype ? attrs.subtype.toUpperCase() : "TV",
    status: attrs.status ? attrs.status.toUpperCase() : undefined,
    year,
    episodes: attrs.episodeCount || undefined,
    duration: attrs.episodeLength || undefined,
    score,
    popularity: attrs.popularityRank || undefined,
    rank: attrs.ratingRank || undefined,
    genres: [],
    youtubeVideoId: attrs.youtubeVideoId || undefined,
    trailerUrl: attrs.youtubeVideoId ? `https://www.youtube.com/watch?v=${attrs.youtubeVideoId}` : undefined,
  };
}

export async function fetchKitsuTrending(limit: number = 15): Promise<Anime[]> {
  try {
    const url = `${KITSU_API_URL}/trending/anime?limit=${limit}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Kitsu API Error: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data?.data)) return [];
    return data.data.map(normalizeKitsuAnime);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Kitsu trending fetch failed: ${msg}`);
    return [];
  }
}

export async function fetchKitsuPopular(limit: number = 15): Promise<Anime[]> {
  try {
    const url = `${KITSU_API_URL}/anime?sort=-userCount&page[limit]=${limit}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Kitsu API Error: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data?.data)) return [];
    return data.data.map(normalizeKitsuAnime);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Kitsu popular fetch failed: ${msg}`);
    return [];
  }
}

export async function fetchKitsuAnime(params: { search?: string; limit?: number; page?: number }): Promise<Anime[]> {
  try {
    const limit = params.limit || 10;
    const searchParam = params.search ? `&filter[text]=${encodeURIComponent(params.search)}` : "";
    const pageOffset = params.page && params.page > 1 ? `&page[offset]=${(params.page - 1) * limit}` : "";
    const url = `${KITSU_API_URL}/anime?page[limit]=${limit}${searchParam}${pageOffset}`;

    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Kitsu API Error: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data?.data)) return [];
    return data.data.map(normalizeKitsuAnime);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Kitsu anime search failed: ${msg}`);
    return [];
  }
}

export async function fetchKitsuAnimeById(id: string): Promise<Anime | null> {
  try {
    const cleanId = id.replace("kitsu-", "");
    const [animeRes, mapRes] = await Promise.allSettled([
      fetchWithTimeout(`${KITSU_API_URL}/anime/${cleanId}`),
      fetchWithTimeout(`${KITSU_API_URL}/anime/${cleanId}/mappings`, {}, 4000)
    ]);

    if (animeRes.status !== "fulfilled" || !animeRes.value.ok) return null;
    const data = await animeRes.value.json();
    if (!data?.data) return null;
    const anime = normalizeKitsuAnime(data.data);

    if (mapRes.status === "fulfilled" && mapRes.value.ok) {
      try {
        const mapData = await mapRes.value.json();
        if (Array.isArray(mapData?.data)) {
          for (const m of mapData.data) {
            const site = m.attributes?.externalSite;
            const extId = m.attributes?.externalId;
            if (site === "myanimelist/anime" && extId) {
              const parsed = parseInt(extId, 10);
              if (!isNaN(parsed)) anime.malId = parsed;
            } else if (site === "anilist/anime" && extId) {
              const parsed = parseInt(extId, 10);
              if (!isNaN(parsed)) anime.anilistId = parsed;
            }
          }
        }
      } catch {}
    }

    return anime;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Kitsu anime by ID failed (${id}): ${msg}`);
    return null;
  }
}

interface KitsuEpisodeAttributes {
  number?: number | null;
  relativeNumber?: number | null;
  seasonNumber?: number | null;
  canonicalTitle?: string | null;
  titles?: { en_us?: string | null; en_jp?: string | null } | null;
  synopsis?: string | null;
  description?: string | null;
  thumbnail?: { original?: string | null; medium?: string | null } | null;
  airdate?: string | null;
  length?: number | null;
}

interface KitsuEpisodeItem {
  id: string | number;
  attributes?: KitsuEpisodeAttributes | null;
}

function parseKitsuAirdate(value: string) {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]) - 1;
    const day = Number(dateOnly[3]);
    return { timestamp: Date.UTC(year, month, day, 12), hasExactTime: false };
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? { timestamp: Number.NaN, hasExactTime: false }
    : { timestamp, hasExactTime: true };
}

function getJstBroadcastInfo(timestamp: number, hasExactTime: boolean) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(hasExactTime ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const } : {}),
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    dayName: values.weekday || "Unknown",
    dateString: `${values.year}-${values.month}-${values.day}`,
    timeString: hasExactTime ? `${values.hour}:${values.minute} JST` : "Broadcast TBA",
  };
}

/**
 * Resolves a non-Kitsu anime ID to its real Kitsu ID using official external mappings.
 * Returns null when no verified mapping exists — never guesses.
 */
async function resolveKitsuIdFromMapping(animeId: string): Promise<string | null> {
  try {
    if (animeId.startsWith("mal-")) {
      const malId = animeId.replace("mal-", "");
      if (!/^\d+$/.test(malId)) return null;
      const res = await fetchWithTimeout(
        `${KITSU_API_URL}/mappings?filter[externalSite]=myanimelist/anime&filter[externalId]=${malId}&include=item`,
        {},
        4000
      );
      if (!res.ok) return null;
      const json = await res.json();
      const kitsuEntry = Array.isArray(json?.included)
        ? json.included.find((inc: { type?: string }) => inc.type === "anime")
        : null;
      return kitsuEntry?.id ? String(kitsuEntry.id) : null;
    }
    if (animeId.startsWith("anilist-")) {
      const anilistId = animeId.replace("anilist-", "");
      if (!/^\d+$/.test(anilistId)) return null;
      const res = await fetchWithTimeout(
        `${KITSU_API_URL}/mappings?filter[externalSite]=anilist/anime&filter[externalId]=${anilistId}&include=item`,
        {},
        4000
      );
      if (!res.ok) return null;
      const json = await res.json();
      const kitsuEntry = Array.isArray(json?.included)
        ? json.included.find((inc: { type?: string }) => inc.type === "anime")
        : null;
      return kitsuEntry?.id ? String(kitsuEntry.id) : null;
    }
  } catch {}
  return null;
}

export async function fetchKitsuEpisodes(
  animeId: string,
  searchTitle?: string,
  animeStatus?: string,
  latestAiredEpisode?: number
): Promise<import("./types").Episode[]> {
  try {
    let cleanId = animeId.replace("kitsu-", "");
    if (!animeId.startsWith("kitsu-")) {
      const mappedId = await resolveKitsuIdFromMapping(animeId);
      if (mappedId) {
        cleanId = mappedId;
      } else if (searchTitle) {
        try {
          const searchRes = await fetchWithTimeout(`${KITSU_API_URL}/anime?filter[text]=${encodeURIComponent(searchTitle)}&page[limit]=1`);
          if (searchRes.ok) {
            const sData = await searchRes.json();
            const first = sData?.data?.[0];
            const candidateTitles = [
              first?.attributes?.canonicalTitle,
              first?.attributes?.titles?.en,
              first?.attributes?.titles?.en_us,
              first?.attributes?.titles?.en_jp,
            ].filter((t): t is string => typeof t === "string");
            const cleanSearch = searchTitle.toLowerCase().trim();
            const isMatch = candidateTitles.some((t) => {
              const lower = t.toLowerCase().trim();
              return lower === cleanSearch || lower.startsWith(cleanSearch) || cleanSearch.startsWith(lower);
            });
            if (first?.id && isMatch) {
              cleanId = String(first.id);
            } else {
              return [];
            }
          }
        } catch {
          return [];
        }
      } else {
        return [];
      }
    }

    const episodesData: KitsuEpisodeItem[] = [];
    let nextUrl: string | null = `${KITSU_API_URL}/anime/${encodeURIComponent(cleanId)}/episodes?page[limit]=20&sort=number`;
    let requestCount = 0;

    while (nextUrl && requestCount < 50) {
      const res = await fetchWithTimeout(nextUrl);
      if (!res.ok) break;
      const data = await res.json();
      const pageEpisodes = Array.isArray(data?.data) ? data.data : [];
      episodesData.push(...pageEpisodes);
      requestCount += 1;
      const next = data?.links?.next;
      nextUrl = typeof next === "string" ? next : null;
      if (pageEpisodes.length === 0) break;
    }

    if (episodesData.length === 0) {
      return [];
    }

    const now = Date.now();
    const isFinished = animeStatus
      ? (animeStatus.toLowerCase().includes("finish") || animeStatus.toLowerCase().includes("complete"))
      : false;

    // 1. Find the highest episode number that has a confirmed past airdate
    let maxReleasedEpNum = 0;
    for (const ep of episodesData) {
      const rawNumber = ep.attributes?.number ?? ep.attributes?.relativeNumber;
      const number = typeof rawNumber === "number" && rawNumber > 0 ? rawNumber : null;
      const airdateStr = ep.attributes?.airdate;
      if (airdateStr && number) {
        let ts = NaN;
        if (/^\d{4}-\d{2}-\d{2}$/.test(airdateStr)) {
          ts = Date.parse(`${airdateStr}T00:00:00+09:00`);
        } else {
          ts = Date.parse(airdateStr);
        }
        if (!isNaN(ts) && ts <= now && number > maxReleasedEpNum) {
          maxReleasedEpNum = number;
        }
      }
    }

    // 2. If caller provided latestAiredEpisode from AniList nextAiringEpisode or anime metadata
    if (typeof latestAiredEpisode === "number" && latestAiredEpisode > 0) {
      if (latestAiredEpisode > maxReleasedEpNum) {
        maxReleasedEpNum = latestAiredEpisode;
      }
    }

    // 3. Fallback: if maxReleasedEpNum is still 0 and anime is not finished, query AniList nextAiringEpisode via mapping
    if (maxReleasedEpNum === 0 && !isFinished) {
      try {
        let targetAniListId: number | null = null;
        if (animeId.startsWith("anilist-")) {
          const parsed = parseInt(animeId.replace("anilist-", ""), 10);
          if (!isNaN(parsed)) targetAniListId = parsed;
        } else {
          const mapRes = await fetchWithTimeout(`${KITSU_API_URL}/anime/${cleanId}/mappings`, {}, 3000);
          if (mapRes.ok) {
            const mapJson = await mapRes.json();
            if (Array.isArray(mapJson?.data)) {
              const alMapping = mapJson.data.find(
                (m: { attributes?: { externalSite?: string; externalId?: string } }) =>
                  m.attributes?.externalSite === "anilist/anime"
              );
              if (alMapping?.attributes?.externalId) {
                const parsed = parseInt(alMapping.attributes.externalId, 10);
                if (!isNaN(parsed)) targetAniListId = parsed;
              }
            }
          }
        }

        if (targetAniListId) {
          const alRes = await fetchWithTimeout(
            "https://graphql.anilist.co",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                query: `query ($id: Int) { Media(id: $id) { nextAiringEpisode { episode } } }`,
                variables: { id: targetAniListId },
              }),
            },
            3000
          );
          if (alRes.ok) {
            const alJson = await alRes.json();
            const nextEp = alJson?.data?.Media?.nextAiringEpisode?.episode;
            if (typeof nextEp === "number" && nextEp > 1) {
              maxReleasedEpNum = nextEp - 1;
            }
          }
        }
      } catch {}
    }

    return episodesData.map((ep) => {
      const rawNumber = ep.attributes?.number ?? ep.attributes?.relativeNumber;
      const number = typeof rawNumber === "number" && rawNumber > 0 ? rawNumber : null;
      const airdateStr = ep.attributes?.airdate || undefined;
      
      let airdateTimestamp: number | undefined = undefined;
      if (airdateStr) {
        // Normalize: if date-only string (YYYY-MM-DD), interpret in Japan Standard Time (+09:00)
        if (/^\d{4}-\d{2}-\d{2}$/.test(airdateStr)) {
          const parsed = Date.parse(`${airdateStr}T00:00:00+09:00`);
          if (!isNaN(parsed)) airdateTimestamp = parsed;
        } else {
          const parsed = Date.parse(airdateStr);
          if (!isNaN(parsed)) airdateTimestamp = parsed;
        }
      }

      let status: "released" | "upcoming" | "unknown" = "unknown";
      if (typeof airdateTimestamp === "number" && !isNaN(airdateTimestamp)) {
        status = airdateTimestamp <= now ? "released" : "upcoming";
      } else if (isFinished) {
        status = "released";
      } else if (number !== null && maxReleasedEpNum > 0) {
        status = number <= maxReleasedEpNum ? "released" : "upcoming";
      }

      return {
        id: String(ep.id),
        number,
        seasonNumber: ep.attributes?.seasonNumber ?? null,
        title: ep.attributes?.canonicalTitle || (ep.attributes?.titles?.en_us || ep.attributes?.titles?.en_jp) || (number ? `Episode ${number}` : ""),
        synopsis: ep.attributes?.synopsis || ep.attributes?.description || "",
        thumbnail: ep.attributes?.thumbnail?.original || ep.attributes?.thumbnail?.medium || undefined,
        airdate: airdateStr,
        airdateTimestamp,
        status,
        length: ep.attributes?.length ?? undefined,
      };
    });
  } catch {
    return [];
  }
}

export async function fetchKitsuStreamingLinks(animeId: string): Promise<import("./types").StreamingLink[]> {
  try {
    const cleanId = animeId.replace("kitsu-", "");
    const url = `${KITSU_API_URL}/anime/${cleanId}/streaming-links`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.data)) return [];
    return data.data.map((link: { id: string | number; attributes?: { url?: string } }) => {
      const u = link.attributes?.url || "";
      let serviceName = "Official Streaming";
      if (u.includes("crunchyroll")) serviceName = "Crunchyroll";
      else if (u.includes("netflix")) serviceName = "Netflix";
      else if (u.includes("hulu")) serviceName = "Hulu";
      else if (u.includes("funimation")) serviceName = "Funimation";
      else if (u.includes("hidive")) serviceName = "HIDIVE";
      else if (u.includes("tubi")) serviceName = "Tubi";
      else if (u.includes("amazon")) serviceName = "Prime Video";
      return {
        id: String(link.id),
        url: u,
        serviceName,
      };
    });
  } catch {
    return [];
  }
}

export async function fetchKitsuCharacters(animeId: string): Promise<import("./types").Character[]> {
  try {
    const cleanId = animeId.replace("kitsu-", "");
    const url = `${KITSU_API_URL}/anime/${cleanId}/characters?include=character&page[limit]=20`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.included)) return [];
    return data.included.map((char: {
      id: string | number;
      attributes?: {
        canonicalName?: string;
        name?: string;
        names?: { ja_jp?: string };
        image?: { original?: string; medium?: string };
        description?: string;
        role?: string;
      };
    }) => ({
      id: String(char.id),
      name: char.attributes?.canonicalName || char.attributes?.name || "Unknown Character",
      nativeName: char.attributes?.names?.ja_jp,
      image: char.attributes?.image?.original || char.attributes?.image?.medium,
      description: char.attributes?.description || "",
      role: char.attributes?.role || "supporting",
    }));
  } catch {
    return [];
  }
}

export async function fetchKitsuStaff(animeId: string): Promise<import("./types").StaffPerson[]> {
  try {
    const cleanId = animeId.replace("kitsu-", "");
    const url = `${KITSU_API_URL}/anime/${cleanId}/staff?include=person&page[limit]=16`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = await res.json();
    const personsMap = new Map<string, { name?: string; image?: { original?: string; medium?: string } }>();
    if (Array.isArray(data?.included)) {
      data.included.forEach((p: { id: string; attributes?: { name?: string; image?: { original?: string; medium?: string } } }) => {
        personsMap.set(p.id, p.attributes || {});
      });
    }
    if (!Array.isArray(data?.data)) return [];
    return data.data.map((item: {
      id: string | number;
      attributes?: { role?: string };
      relationships?: { person?: { data?: { id?: string } } };
    }) => {
      const personId = item.relationships?.person?.data?.id;
      const personAttr = personId ? personsMap.get(personId) : null;
      return {
        id: String(item.id),
        name: personAttr?.name || "Unknown Staff",
        role: item.attributes?.role || "Production",
        image: personAttr?.image?.original || personAttr?.image?.medium,
      };
    });
  } catch {
    return [];
  }
}

export async function fetchKitsuRelations(animeId: string, searchTitle?: string): Promise<import("./types").AnimeRelation[]> {
  try {
    let cleanId = animeId.replace("kitsu-", "");
    if (!animeId.startsWith("kitsu-")) {
      const mappedId = await resolveKitsuIdFromMapping(animeId);
      if (mappedId) {
        cleanId = mappedId;
      } else if (searchTitle) {
        try {
          const searchRes = await fetchWithTimeout(`${KITSU_API_URL}/anime?filter[text]=${encodeURIComponent(searchTitle)}&page[limit]=1`);
          if (searchRes.ok) {
            const sData = await searchRes.json();
            const first = sData?.data?.[0];
            const candidateTitles = [
              first?.attributes?.canonicalTitle,
              first?.attributes?.titles?.en,
              first?.attributes?.titles?.en_us,
              first?.attributes?.titles?.en_jp,
            ].filter((t): t is string => typeof t === "string");
            const cleanSearch = searchTitle.toLowerCase().trim();
            const isMatch = candidateTitles.some((t) => {
              const lower = t.toLowerCase().trim();
              return lower === cleanSearch || lower.startsWith(cleanSearch) || cleanSearch.startsWith(lower);
            });
            if (first?.id && isMatch) {
              cleanId = String(first.id);
            } else {
              return [];
            }
          }
        } catch {
          return [];
        }
      } else {
        return [];
      }
    }
    const url = `${KITSU_API_URL}/anime/${cleanId}/media-relationships?include=destination&page[limit]=16`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = await res.json();
    const destMap = new Map<string, {
      id: string;
      attributes?: {
        canonicalTitle?: string;
        posterImage?: { medium?: string; original?: string };
        subtype?: string;
        startDate?: string;
        episodeCount?: string | number;
      };
    }>();
    if (Array.isArray(data?.included)) {
      data.included.forEach((dest: {
        id: string;
        attributes?: {
          canonicalTitle?: string;
          posterImage?: { medium?: string; original?: string };
          subtype?: string;
          startDate?: string;
          episodeCount?: string | number;
        };
      }) => destMap.set(dest.id, dest));
    }
    if (!Array.isArray(data?.data)) return [];
    const relations: import("./types").AnimeRelation[] = [];
    for (const rel of data.data) {
      const destId = rel.relationships?.destination?.data?.id;
      const dest = destId ? destMap.get(destId) : null;
      if (dest && dest.attributes) {
        relations.push({
          id: String(rel.id),
          role: rel.attributes?.role || "related",
          anime: {
            id: `kitsu-${dest.id}`,
            title: dest.attributes?.canonicalTitle || "Related Anime",
            image: dest.attributes?.posterImage?.medium || dest.attributes?.posterImage?.original,
            format: dest.attributes?.subtype ? dest.attributes.subtype.toUpperCase() : "TV",
            year: dest.attributes?.startDate ? parseInt(dest.attributes.startDate.split("-")[0], 10) : undefined,
            episodes: dest.attributes?.episodeCount ? parseInt(String(dest.attributes.episodeCount), 10) : undefined,
          },
        });
      }
    }
    return relations;
  } catch {
    return [];
  }
}

export async function fetchKitsuSeasonal(season: string, year: number, limit: number = 20): Promise<Anime[]> {
  try {
    const s = season.toLowerCase();
    const safeLimit = Math.min(Math.max(limit, 1), 20);
    const url = `${KITSU_API_URL}/anime?filter[season]=${s}&filter[seasonYear]=${year}&page[limit]=${safeLimit}&sort=-userCount`;
    const res = await fetchWithTimeout(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data) && data.data.length > 0) {
        return data.data.map(normalizeKitsuAnime);
      }
    }
    // No fabrication: if the requested season has no data, return empty and let the UI
    // show "No seasonal data available". Never substitute other years or popular anime.
    return [];
  } catch {
    return [];
  }
}

export async function fetchKitsuAiringSchedule(limit: number = 20): Promise<import("./types").AiringSchedule[]> {
  try {
    const safeLimit = Math.min(Math.max(limit, 1), 20);
    const url = `${KITSU_API_URL}/anime?filter[status]=current&filter[subtype]=TV&page[limit]=${safeLimit}&sort=-startDate`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];

    const data = await res.json();
    const items: KitsuAnimeItem[] = Array.isArray(data?.data) ? data.data : [];
    const now = Date.now();
    const oldestAiringAt = now - 90 * 24 * 60 * 60 * 1000;

    const episodeResponses = await Promise.allSettled(
      items.map((item) => fetchWithTimeout(
        `${KITSU_API_URL}/anime/${item.id}/episodes?page[limit]=1&sort=-number`,
        {},
        4000,
      )),
    );

    const schedules: import("./types").AiringSchedule[] = [];
    for (let index = 0; index < items.length; index += 1) {
      const responseState = episodeResponses[index];
      if (responseState.status !== "fulfilled" || !responseState.value.ok) continue;

      const episodeData = await responseState.value.json();
      const episode = Array.isArray(episodeData?.data) ? episodeData.data[0] : null;
      const attrs = items[index].attributes || {};
      const episodeAttrs = episode?.attributes;
      const airdate = episodeAttrs?.airdate ? parseKitsuAirdate(episodeAttrs.airdate) : null;
      const airdateMs = airdate?.timestamp ?? Number.NaN;

      if (!episode || !airdate || Number.isNaN(airdateMs) || airdateMs < oldestAiringAt) continue;

      const broadcastInfo = getJstBroadcastInfo(airdateMs, airdate.hasExactTime);

      schedules.push({
        id: String(episode.id),
        animeId: `kitsu-${items[index].id}`,
        animeTitle: attrs.canonicalTitle || (attrs.titles?.en || attrs.titles?.en_us || attrs.titles?.en_jp) || "Anime Release",
        animeImage: attrs.posterImage?.medium || attrs.posterImage?.original || attrs.posterImage?.large || "/placeholder-cover.svg",
        format: attrs.subtype?.toUpperCase(),
        episodeNumber: typeof episodeAttrs.number === "number" && episodeAttrs.number > 0 ? episodeAttrs.number : (typeof episodeAttrs.relativeNumber === "number" && episodeAttrs.relativeNumber > 0 ? episodeAttrs.relativeNumber : null),
        airingAt: broadcastInfo.dayName,
        airingDate: broadcastInfo.dateString,
        timeString: broadcastInfo.timeString,
        hasExactTime: airdate.hasExactTime,
        airingAtTimestamp: Math.floor(airdateMs / 1000),
        timeUntilAiring: Math.floor((airdateMs - now) / 1000),
        status: airdateMs <= now ? "aired" as const : (airdateMs <= now + 24 * 60 * 60 * 1000 ? "airing_today" as const : "upcoming" as const),
      });
    }

    return schedules;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Kitsu airing schedule fetch failed: ${msg}`);
    return [];
  }
}

export async function fetchKitsuCharacterById(id: string): Promise<import("./types").Character | null> {
  try {
    const cleanId = id.replace("kitsu-", "");
    const url = `${KITSU_API_URL}/characters/${cleanId}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.data) return null;
    const attrs = data.data.attributes || {};
    return {
      id: String(data.data.id),
      name: attrs.canonicalName || attrs.name || "Unknown Character",
      nativeName: attrs.names?.ja_jp,
      image: attrs.image?.original || attrs.image?.medium,
      description: attrs.description || "",
    };
  } catch {
    return null;
  }
}

export async function fetchKitsuPersonById(id: string): Promise<import("./types").StaffPerson | null> {
  try {
    const cleanId = id.replace("kitsu-", "");
    const url = `${KITSU_API_URL}/people/${cleanId}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.data) return null;
    const attrs = data.data.attributes || {};
    return {
      id: String(data.data.id),
      name: attrs.name || "Unknown Person",
      role: "Staff / Cast",
      image: attrs.image?.original || attrs.image?.medium,
      description: attrs.description || "",
    };
  } catch {
    return null;
  }
}

export async function fetchKitsuAdvanced(params: {
  search?: string;
  genre?: string;
  format?: string;
  status?: string;
  year?: number;
  season?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}): Promise<{ anime: Anime[]; hasMore: boolean }> {
  try {
    const safeLimit = Math.min(Math.max(params.limit || 20, 1), 20);
    const offset = Math.max(params.offset || 0, 0);
    let url = `${KITSU_API_URL}/anime?page[limit]=${safeLimit}&page[offset]=${offset}`;

    if (params.search?.trim()) {
      url += `&filter[text]=${encodeURIComponent(params.search.trim())}`;
    }
    if (params.genre && params.genre !== "all") {
      url += `&filter[categories]=${encodeURIComponent(params.genre.toLowerCase())}`;
    }
    if (params.format && params.format !== "all") {
      url += `&filter[subtype]=${encodeURIComponent(params.format.toLowerCase())}`;
    }
    if (params.status && params.status !== "all") {
      url += `&filter[status]=${encodeURIComponent(params.status.toLowerCase())}`;
    }
    if (params.year) {
      url += `&filter[seasonYear]=${params.year}`;
    }
    if (params.season && params.season !== "all") {
      url += `&filter[season]=${encodeURIComponent(params.season.toLowerCase())}`;
    }

    if (params.sort === "score") {
      url += `&sort=-averageRating`;
    } else if (params.sort === "popularity") {
      url += `&sort=-userCount`;
    } else if (params.sort === "title") {
      url += `&sort=canonicalTitle`;
    } else if (params.sort === "date") {
      url += `&sort=-startDate`;
    } else {
      url += `&sort=-userCount`;
    }

    const res = await fetchWithTimeout(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data) && data.data.length > 0) {
        return {
          anime: data.data.map(normalizeKitsuAnime),
          hasMore: Boolean(data?.links?.next),
        };
      }
    }

    if (!params.search?.trim() && (!params.genre || params.genre === "all") && (!params.format || params.format === "all")) {
      const popular = await fetchKitsuPopular(safeLimit);
      return { anime: popular, hasMore: false };
    }

    return { anime: [], hasMore: false };
  } catch {
    return { anime: [], hasMore: false };
  }
}

export async function fetchKitsuCharactersList(params: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<import("./types").Character[]> {
  try {
    const safeLimit = Math.min(Math.max(params.limit || 20, 1), 20);
    const offset = params.offset || 0;
    let url = `${KITSU_API_URL}/characters?page[limit]=${safeLimit}&page[offset]=${offset}`;
    if (params.search?.trim()) {
      url += `&filter[name]=${encodeURIComponent(params.search.trim())}`;
    }
    const res = await fetchWithTimeout(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data) && data.data.length > 0) {
        return data.data.map((item: { id: string | number; attributes?: { canonicalName?: string; name?: string; names?: { ja_jp?: string }; image?: { original?: string; medium?: string; large?: string }; description?: string } }) => {
          const attrs = item.attributes || {};
          return {
            id: String(item.id),
            name: attrs.canonicalName || attrs.name || "Unknown Character",
            nativeName: attrs.names?.ja_jp,
            image: attrs.image?.original || attrs.image?.medium || attrs.image?.large,
            description: attrs.description || "",
          };
        });
      }
    }
    return [];
  } catch {
    return [];
  }
}

export async function fetchKitsuCharacterAnime(characterId: string): Promise<Anime[]> {
  try {
    const cleanId = characterId.replace("kitsu-", "");
    const url = `${KITSU_API_URL}/characters/${cleanId}/media-characters?include=media`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.included)) return [];
    return data.included
      .filter((inc: KitsuAnimeItem) => inc.type === "anime")
      .map(normalizeKitsuAnime);
  } catch {
    return [];
  }
}

export async function fetchKitsuPeopleList(params: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<import("./types").StaffPerson[]> {
  try {
    const safeLimit = Math.min(Math.max(params.limit || 20, 1), 20);
    const offset = params.offset || 0;
    let url = `${KITSU_API_URL}/people?page[limit]=${safeLimit}&page[offset]=${offset}`;
    if (params.search?.trim()) {
      url += `&filter[name]=${encodeURIComponent(params.search.trim())}`;
    }
    const res = await fetchWithTimeout(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data) && data.data.length > 0) {
        return data.data.map((item: { id: string | number; attributes?: { name?: string; image?: { original?: string; medium?: string }; description?: string } }) => {
          const attrs = item.attributes || {};
          return {
            id: String(item.id),
            name: attrs.name || "Unknown Staff",
            role: "Production Staff / Creator",
            image: attrs.image?.original || attrs.image?.medium,
            description: attrs.description || "",
          };
        });
      }
    }
    return [];
  } catch {
    return [];
  }
}

export async function fetchKitsuPersonAnime(personId: string): Promise<Anime[]> {
  try {
    const cleanId = personId.replace("kitsu-", "");
    const url = `${KITSU_API_URL}/people/${cleanId}/staff?include=media`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.included)) return [];
    return data.included
      .filter((inc: KitsuAnimeItem) => inc.type === "anime")
      .map(normalizeKitsuAnime);
  } catch {
    return [];
  }
}

export async function fetchKitsuStudiosList(params: {
  limit?: number;
  offset?: number;
}): Promise<import("./types").Studio[]> {
  try {
    const safeLimit = Math.min(Math.max(params.limit || 20, 1), 20);
    const offset = params.offset || 0;
    const url = `${KITSU_API_URL}/producers?page[limit]=${safeLimit}&page[offset]=${offset}`;
    const res = await fetchWithTimeout(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data) && data.data.length > 0) {
        return data.data.map((item: { id: string | number; attributes?: { name?: string } }) => {
          const attrs = item.attributes || {};
          return {
            id: String(item.id),
            name: attrs.name || "Animation Studio",
            role: "Animation Studio",
            description: "Production studio credited with anime films and TV series.",
          };
        });
      }
    }
    return [];
  } catch {
    return [];
  }
}

export async function fetchKitsuStudioById(id: string): Promise<import("./types").Studio | null> {
  try {
    const cleanId = id.replace("kitsu-", "");
    const url = `${KITSU_API_URL}/producers/${cleanId}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.data) return null;
    const attrs = data.data.attributes || {};
    return {
      id: String(data.data.id),
      name: attrs.name || "Animation Studio",
      role: "Animation Studio",
      description: `Production studio credited across various anime productions.`,
    };
  } catch {
    return null;
  }
}

export async function fetchKitsuStudioAnime(studioId: string): Promise<Anime[]> {
  try {
    const cleanId = studioId.replace("kitsu-", "");
    const url = `${KITSU_API_URL}/producers/${cleanId}/anime-productions?include=anime`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.included)) return [];
    return data.included
      .filter((inc: KitsuAnimeItem) => inc.type === "anime")
      .map(normalizeKitsuAnime);
  } catch {
    return [];
  }
}


