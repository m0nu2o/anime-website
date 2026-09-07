import { Anime } from "./types";

const JIKAN_API_URL = "https://api.jikan.moe/v4";

const JIKAN_HEADERS = {
  "Accept": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 NextGenAnime/1.0",
};

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 4000): Promise<Response> {
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
  season?: string;
  year?: number;
  episodes?: number;
  duration?: string;
  score?: number;
  popularity?: number;
  rank?: number;
  genres?: { name: string }[];
  studios?: { name: string }[];
  broadcast?: { day?: string; time?: string };
  aired?: { from?: string; to?: string };
  trailer?: { youtube_id?: string; url?: string };
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
  try {
    const url = `${JIKAN_API_URL}/top/anime?limit=${limit}`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`Jikan API Error: ${response.status}`);
    }
    const data = await response.json();
    if (!Array.isArray(data?.data)) return [];
    return data.data.map(normalizeJikanAnime);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`Jikan popular fetch failed: ${msg}`);
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
    const url = `${JIKAN_API_URL}/seasons/now?limit=25`;
    const response = await fetchWithTimeout(url, {}, 5000);
    if (!response.ok) throw new Error(`Jikan Seasons Error: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data?.data)) return [];

    let items: JikanMedia[] = data.data;

    // Filter by day if requested
    if (day && day.toLowerCase() !== "all days") {
      const targetDay = day.toLowerCase().replace(/s$/, "").trim();
      items = items.filter((item) => {
        const d = (item.broadcast?.day || "").toLowerCase().replace(/s$/, "").trim();
        return d === targetDay;
      });
    }

    return items.map((item) => {
      const broadcast = item.broadcast || {};
      const rawDay = broadcast.day || "";
      const dayName = rawDay.endsWith("s") ? rawDay.slice(0, -1) : (rawDay || "Unknown");
      const timeStr = broadcast.time ? `${broadcast.time} JST` : "Broadcast TBA";
      const studioName = item.studios?.[0]?.name;
      
      // Compute verified episode number and upcoming status
      let nextEp = 1;
      let isUpcoming = false;
      if (item.status === "Not yet aired") {
        isUpcoming = true;
        nextEp = 1;
      } else if (item.episodes) {
        // If total episodes is verified (e.g. 11 or 12), use known count
        nextEp = item.episodes;
      } else if (item.aired?.from) {
        const airedDate = new Date(item.aired.from).getTime();
        if (!isNaN(airedDate) && airedDate > Date.now()) {
          isUpcoming = true;
          nextEp = 1;
        } else {
          nextEp = 1;
        }
      }

      return {
        id: String(item.mal_id),
        animeId: `mal-${item.mal_id}`,
        animeTitle: item.title_english || item.title || item.title_japanese || "Unknown Title",
        animeImage: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || "/placeholder-cover.svg",
        episodeNumber: nextEp,
        airingAt: dayName,
        timeString: timeStr,
        genres: item.genres?.map((g) => g.name) || [],
        score: item.score ? Math.round(item.score * 10) : undefined,
        studio: studioName,
        status: isUpcoming ? "upcoming" : "airing_today",
      };
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Jikan schedule fetch failed: ${msg}`);
    return [];
  }
}


