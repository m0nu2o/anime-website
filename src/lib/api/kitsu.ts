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

export async function fetchKitsuEpisodes(animeId: string, searchTitle?: string): Promise<import("./types").Episode[]> {
  try {
    let cleanId = animeId.replace("kitsu-", "");
    if (!animeId.startsWith("kitsu-") && searchTitle) {
      try {
        const searchRes = await fetchWithTimeout(`${KITSU_API_URL}/anime?filter[text]=${encodeURIComponent(searchTitle)}&page[limit]=1`);
        if (searchRes.ok) {
          const sData = await searchRes.json();
          if (sData?.data?.[0]?.id) {
            cleanId = sData.data[0].id;
          }
        }
      } catch {}
    }
    const url = `${KITSU_API_URL}/anime/${cleanId}/episodes?page[limit]=20&page[offset]=0&sort=number`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = await res.json();
    let episodesData: KitsuEpisodeItem[] = Array.isArray(data?.data) ? data.data : [];

    // If 20 episodes returned, fetch page 2 to provide up to 40 episodes
    if (episodesData.length === 20) {
      try {
        const url2 = `${KITSU_API_URL}/anime/${cleanId}/episodes?page[limit]=20&page[offset]=20&sort=number`;
        const res2 = await fetchWithTimeout(url2);
        if (res2.ok) {
          const data2 = await res2.json();
          if (Array.isArray(data2?.data)) {
            episodesData = episodesData.concat(data2.data);
          }
        }
      } catch {}
    }

    if (episodesData.length === 0) {
      return [];
    }

    return episodesData.map((ep, idx) => ({
      id: String(ep.id),
      number: ep.attributes?.number || ep.attributes?.relativeNumber || (idx + 1),
      seasonNumber: ep.attributes?.seasonNumber || 1,
      title: ep.attributes?.canonicalTitle || (ep.attributes?.titles?.en_us || ep.attributes?.titles?.en_jp) || `Episode ${ep.attributes?.number || (idx + 1)}`,
      synopsis: ep.attributes?.synopsis || ep.attributes?.description || "",
      thumbnail: ep.attributes?.thumbnail?.original || ep.attributes?.thumbnail?.medium || undefined,
      airdate: ep.attributes?.airdate || undefined,
      length: ep.attributes?.length ?? undefined,
    }));
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
    if (!animeId.startsWith("kitsu-") && searchTitle) {
      try {
        const searchRes = await fetchWithTimeout(`${KITSU_API_URL}/anime?filter[text]=${encodeURIComponent(searchTitle)}&page[limit]=1`);
        if (searchRes.ok) {
          const sData = await searchRes.json();
          if (sData?.data?.[0]?.id) {
            cleanId = sData.data[0].id;
          }
        }
      } catch {}
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

    // Fallback: If future year (e.g. 2026/2027) has 0 results, query recent years for this season
    const fallbackYears = [2024, 2023, 2022];
    for (const fbYear of fallbackYears) {
      if (fbYear === year) continue;
      const fbUrl = `${KITSU_API_URL}/anime?filter[season]=${s}&filter[seasonYear]=${fbYear}&page[limit]=${safeLimit}&sort=-userCount`;
      const fbRes = await fetchWithTimeout(fbUrl);
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        if (Array.isArray(fbData?.data) && fbData.data.length > 0) {
          return fbData.data.map(normalizeKitsuAnime);
        }
      }
    }

    // Ultimate fallback: popular anime
    return fetchKitsuPopular(safeLimit);
  } catch (err) {
    return fetchKitsuPopular(Math.min(limit, 20));
  }
}

export async function fetchKitsuAiringSchedule(limit: number = 20): Promise<import("./types").AiringSchedule[]> {
  try {
    const safeLimit = Math.min(Math.max(limit, 1), 20);
    const url = `${KITSU_API_URL}/anime?filter[status]=current&page[limit]=${safeLimit}&sort=-userCount`;
    const res = await fetchWithTimeout(url);
    let items: KitsuAnimeItem[] = [];
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data) && data.data.length > 0) {
        items = data.data;
      }
    }

    // Ensure full weekly coverage across all 7 days by supplementing with popular anime if needed
    if (items.length < 14) {
      const popRes = await fetchWithTimeout(`${KITSU_API_URL}/anime?sort=-userCount&page[limit]=${safeLimit}`);
      if (popRes.ok) {
        const popData = await popRes.json();
        if (Array.isArray(popData?.data)) {
          const existingIds = new Set(items.map((it: KitsuAnimeItem) => String(it.id)));
          for (const it of popData.data) {
            if (!existingIds.has(String(it.id))) {
              items.push(it);
              if (items.length >= 20) break;
            }
          }
        }
      }
    }

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return items.map((item: KitsuAnimeItem) => {
      const attrs = item.attributes || {};
      let dayName = "Saturday";
      if (attrs.startDate) {
        const parsed = new Date(attrs.startDate);
        if (!isNaN(parsed.getTime())) {
          dayName = days[parsed.getDay()];
        }
      }
      return {
        id: String(item.id),
        animeId: `kitsu-${item.id}`,
        animeTitle: attrs.canonicalTitle || (attrs.titles?.en || attrs.titles?.en_us) || "Anime Release",
        animeImage: attrs.posterImage?.medium || attrs.posterImage?.original || "/placeholder-cover.svg",
        episodeNumber: attrs.episodeCount || 1,
        airingAt: dayName,
        timeString: "Broadcast TBA",
      };
    });
  } catch {
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
}): Promise<Anime[]> {
  try {
    const safeLimit = Math.min(Math.max(params.limit || 20, 1), 20);
    const offset = params.offset || 0;
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

    // Sort mapping
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
        return data.data.map(normalizeKitsuAnime);
      }
    }

    // Fallback: If no results for default browse, return popular anime
    if (!params.search?.trim() && (!params.genre || params.genre === "all") && (!params.format || params.format === "all")) {
      return fetchKitsuPopular(safeLimit);
    }

    return [];
  } catch (err) {
    return fetchKitsuPopular(20);
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


