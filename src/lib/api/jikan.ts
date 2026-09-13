import { Anime } from "./types";

const JIKAN_API_URL = "https://api.jikan.moe/v4";

const JIKAN_HEADERS = {
  "Accept": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 NextGenAnime/1.0",
};

function getJstBroadcastInfo(timestamp: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    dayName: values.weekday || "Unknown",
    dateString: `${values.year}-${values.month}-${values.day}`,
    timeString: `${values.hour}:${values.minute} JST`,
  };
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 3000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...JIKAN_HEADERS,
        ...(options.headers || {}),
      },
      next: { revalidate: 3600 },
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

interface JikanMedia {
  mal_id: number;
  title?: string;
  title_english?: string | null;
  title_japanese?: string | null;
  title_synonyms?: string[];
  synopsis?: string | null;
  images?: {
    webp?: { image_url?: string; large_image_url?: string; maximum_image_url?: string };
    jpg?: { image_url?: string; large_image_url?: string; maximum_image_url?: string };
  };
  type?: string;
  status?: string;
  airing?: boolean;
  season?: string;
  year?: number;
  episodes?: number;
  duration?: string;
  score?: number;
  popularity?: number;
  rank?: number;
  genres?: { name: string }[];
  studios?: { name: string }[];
  broadcast?: { day?: string; time?: string; timezone?: string };
  aired?: { from?: string; to?: string };
  trailer?: { youtube_id?: string; url?: string };
  next_airing_episode?: {
    episode?: number;
    aired_at?: string;
    images?: {
      webp?: { large_image_url?: string };
      jpg?: { large_image_url?: string };
    };
  } | null;
}

function normalizeJikanAnime(item: JikanMedia): Anime {
  return {
    id: `mal-${item.mal_id}`,
    provider: "mal",
    malId: item.mal_id,
    title: {
      english: item.title_english || item.title,
      romaji: item.title,
      native: item.title_japanese || undefined,
      synonyms: item.title_synonyms || [],
    },
    description: item.synopsis || "",
    images: {
      cover: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || item.images?.webp?.image_url,
      largeCover: item.images?.webp?.maximum_image_url || item.images?.jpg?.maximum_image_url || item.images?.webp?.large_image_url,
      banner: (item.trailer?.youtube_id ? `https://img.youtube.com/vi/${item.trailer.youtube_id}/maxresdefault.jpg` : undefined) || item.images?.webp?.large_image_url,
    },
    type: item.type || "ANIME",
    format: item.type || "TV",
    status: item.status,
    season: item.season,
    year: item.year,
    episodes: item.episodes,
    duration: item.duration ? parseInt(item.duration, 10) : undefined,
    // Jikan score is out of 10 (e.g. 8.5); convert to 0-100 scale to match AniList & Kitsu standard
    score: item.score ? Math.round(item.score * 10) : undefined,
    popularity: item.popularity,
    rank: item.rank,
    genres: item.genres?.map((g) => g.name) || [],
    youtubeVideoId: item.trailer?.youtube_id || undefined,
    trailerUrl: item.trailer?.url || (item.trailer?.youtube_id ? `https://www.youtube.com/watch?v=${item.trailer.youtube_id}` : undefined),
  };
}

export async function fetchJikanAnime(params: { search?: string; limit?: number; page?: number }): Promise<Anime[]> {
  try {
    const url = new URL(`${JIKAN_API_URL}/anime`);
    if (params.search) url.searchParams.append("q", params.search);
    if (params.limit) url.searchParams.append("limit", params.limit.toString());
    if (params.page) url.searchParams.append("page", params.page.toString());
    
    const response = await fetchWithTimeout(url.toString());
    if (!response.ok) {
      throw new Error(`Jikan API Error: ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data?.data)) return [];
    return data.data.map(normalizeJikanAnime);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`Jikan fetch failed: ${msg}`);
    return [];
  }
}

export async function fetchJikanPopular(limit: number = 15): Promise<Anime[]> {
  return fetchJikanTop(limit, "bypopularity");
}

export async function fetchJikanTop(
  limit: number = 10,
  filter?: "bypopularity" | "airing" | "favorite" | "upcoming"
): Promise<Anime[]> {
  try {
    const filterParam = filter ? `&filter=${filter}` : "";
    const url = `${JIKAN_API_URL}/top/anime?limit=${limit}${filterParam}`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`Jikan API Error: ${response.status}`);
    }
    const data = await response.json();
    if (!Array.isArray(data?.data)) return [];
    return data.data.map(normalizeJikanAnime);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`Jikan top fetch (${filter}) failed: ${msg}`);
    return [];
  }
}

export async function fetchJikanGenres(): Promise<{ id: number; name: string; count?: number }[]> {
  try {
    const url = `${JIKAN_API_URL}/genres/anime`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`Jikan genres error: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data?.data)) return [];
    return data.data.map((g: { mal_id: number; name: string; count?: number }) => ({
      id: g.mal_id,
      name: g.name,
      count: g.count,
    }));
  } catch (error) {
    console.warn("Jikan genres fetch failed:", error);
    return [];
  }
}

export async function fetchJikanSeasonal(season: string, year: number, limit: number = 24): Promise<Anime[]> {
  try {
    const url = `${JIKAN_API_URL}/seasons/${year}/${season.toLowerCase()}?limit=${limit}`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`Jikan seasonal error: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data?.data)) return [];
    return data.data.map(normalizeJikanAnime);
  } catch (error) {
    console.warn(`Jikan seasonal fetch (${season} ${year}) failed:`, error);
    return [];
  }
}

export async function fetchJikanAnimeById(malId: number): Promise<Anime | null> {
  try {
    const url = `${JIKAN_API_URL}/anime/${malId}`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`Jikan API Error: ${response.status}`);
    }

    const data = await response.json();
    if (!data?.data) return null;
    return normalizeJikanAnime(data.data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`Jikan fetchById failed (${malId}): ${msg}`);
    return null;
  }
}

export async function fetchJikanSchedules(day?: string): Promise<import("./types").AiringSchedule[]> {
  try {
    const url = `${JIKAN_API_URL}/schedules?limit=25`;
    const response = await fetchWithTimeout(url, {}, 5000);
    if (!response.ok) throw new Error(`Jikan Schedules Error: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data?.data)) return [];

    const targetDay = day && day.toLowerCase() !== "all days"
      ? day.toLowerCase().replace(/s$/, "").trim()
      : undefined;

    const now = Date.now();
    const oldestAiringAt = now - 90 * 24 * 60 * 60 * 1000;

    return data.data
      .filter((item: JikanMedia) => {
        if (!item.airing || !item.next_airing_episode?.aired_at) return false;
        const airedAt = Date.parse(item.next_airing_episode.aired_at);
        if (Number.isNaN(airedAt) || airedAt < oldestAiringAt) return false;

        if (!targetDay) return true;
        const broadcastDay = (item.broadcast?.day || "").toLowerCase().replace(/s$/, "").trim();
        return broadcastDay === targetDay;
      })
      .map((item: JikanMedia) => {
        const nextEpisode = item.next_airing_episode!;
        const airedAt = Date.parse(nextEpisode.aired_at!);
        const broadcastInfo = getJstBroadcastInfo(airedAt);

        return {
          id: `jikan-${item.mal_id}-${nextEpisode.episode || "next"}`,
          animeId: `mal-${item.mal_id}`,
          animeTitle: item.title_english || item.title || item.title_japanese || "Unknown Title",
          animeImage: nextEpisode.images?.webp?.large_image_url || nextEpisode.images?.jpg?.large_image_url || item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || "/placeholder-cover.svg",
          format: item.type,
          episodeNumber: typeof nextEpisode.episode === "number" && nextEpisode.episode > 0 ? nextEpisode.episode : null,
          airingAt: broadcastInfo.dayName,
          airingDate: broadcastInfo.dateString,
          timeString: broadcastInfo.timeString,
          hasExactTime: true,
          airingAtTimestamp: Math.floor(airedAt / 1000),
          timeUntilAiring: Math.floor((airedAt - now) / 1000),
          status: airedAt <= now ? "aired" as const : (airedAt <= now + 24 * 60 * 60 * 1000 ? "airing_today" as const : "upcoming" as const),
          genres: item.genres?.map((genre) => genre.name) || [],
          score: item.score ? Math.round(item.score * 10) : undefined,
          studio: item.studios?.[0]?.name,
        };
      });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Jikan schedule fetch failed: ${msg}`);
    return [];
  }
}

interface JikanEpisodeRaw {
  mal_id: number;
  url?: string | null;
  title?: string;
  title_japanese?: string | null;
  title_romanji?: string | null;
  aired?: string | null;
  score?: number | null;
  filler?: boolean;
  recap?: boolean;
  forum_url?: string | null;
}

/**
 * Fetch all episodes for an anime using Jikan API with full pagination.
 * Jikan provides authoritative episode numbers, titles, and exact air dates.
 */
export async function fetchJikanEpisodes(malId: number): Promise<import("./types").Episode[]> {
  try {
    if (!malId || malId <= 0) return [];

    const episodes: import("./types").Episode[] = [];
    const now = Date.now();
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage && page <= 30) {
      const url = `${JIKAN_API_URL}/anime/${malId}/episodes?page=${page}`;
      const res = await fetchWithTimeout(url, {}, 4000);
      if (!res.ok) break;

      const data = await res.json();
      const pageData: JikanEpisodeRaw[] = Array.isArray(data?.data) ? data.data : [];

      for (const item of pageData) {
        const epNum = item.mal_id;
        let airdateTimestamp: number | undefined = undefined;
        let status: "released" | "upcoming" | "unknown" = "unknown";

        if (item.aired) {
          const ts = Date.parse(item.aired);
          if (!isNaN(ts)) {
            airdateTimestamp = ts;
            status = ts <= now ? "released" : "upcoming";
          }
        }

        const title = item.title || item.title_romanji || item.title_japanese || `Episode ${epNum}`;

        episodes.push({
          id: `jikan-${malId}-${epNum}`,
          number: epNum,
          title,
          airdate: item.aired || undefined,
          airdateTimestamp,
          status,
        });
      }

      hasNextPage = Boolean(data?.pagination?.has_next_page);
      if (pageData.length === 0) break;
      page++;
    }

    return episodes;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Jikan fetchEpisodes failed (malId: ${malId}): ${msg}`);
    return [];
  }
}



