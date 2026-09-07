import { Anime } from "./types";

const ANILIST_API_URL = "https://graphql.anilist.co";

const ANILIST_HEADERS = {
  "Content-Type": "application/json",
  "Accept": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 NextGenAnime/1.0",
};

const ANIME_QUERY = `
  query ($id: Int, $search: String, $page: Int, $perPage: Int, $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      media(id: $id, search: $search, type: ANIME, sort: $sort) {
        id
        idMal
        title {
          romaji
          english
          native
        }
        description
        coverImage {
          extraLarge
          large
          color
        }
        bannerImage
        format
        status
        season
        seasonYear
        episodes
        duration
        averageScore
        popularity
        genres
        tags {
          name
        }
        trailer {
          id
          site
        }
      }
    }
  }
`;

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...ANILIST_HEADERS,
        ...(options.headers || {}),
      },
      next: { revalidate: 3600 },
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

interface AniListMedia {
  id: number;
  idMal?: number | null;
  title?: {
    romaji?: string | null;
    english?: string | null;
    native?: string | null;
  } | null;
  description?: string | null;
  coverImage?: {
    extraLarge?: string | null;
    large?: string | null;
    color?: string | null;
  } | null;
  bannerImage?: string | null;
  format?: string | null;
  status?: string | null;
  season?: string | null;
  seasonYear?: number | null;
  episodes?: number | null;
  duration?: number | null;
  averageScore?: number | null;
  popularity?: number | null;
  genres?: string[] | null;
  tags?: { name: string }[] | null;
  trailer?: { id?: string | null; site?: string | null } | null;
}

interface AniListAiringItem {
  id: number;
  airingAt: number;
  timeUntilAiring: number;
  episode: number;
  media?: {
    id: number;
    title?: { romaji?: string | null; english?: string | null; native?: string | null } | null;
    coverImage?: { large?: string | null; extraLarge?: string | null } | null;
    genres?: string[] | null;
    averageScore?: number | null;
    studios?: { nodes?: { name: string }[] | null } | null;
  } | null;
}

export async function fetchAniListAnime(params: { id?: number; search?: string; page?: number; perPage?: number; sort?: string[] }): Promise<Anime[]> {
  try {
    const variables: Record<string, unknown> = {
      page: params.page || 1,
      perPage: params.perPage || 10,
    };
    
    if (params.id) variables.id = params.id;
    if (params.search) variables.search = params.search;
    if (params.sort) variables.sort = params.sort;
    else if (!params.id && !params.search) variables.sort = ["TRENDING_DESC", "POPULARITY_DESC"];

    const response = await fetchWithTimeout(ANILIST_API_URL, {
      method: "POST",
      body: JSON.stringify({
        query: ANIME_QUERY,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`AniList API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data?.data?.Page?.media || !Array.isArray(data.data.Page.media)) {
      return [];
    }

    return (data.data.Page.media as AniListMedia[]).map((item) => ({
      id: `anilist-${item.id}`,
      provider: "anilist" as const,
      anilistId: item.id,
      malId: item.idMal ?? undefined,
      title: {
        english: item.title?.english ?? undefined,
        romaji: item.title?.romaji ?? undefined,
        native: item.title?.native ?? undefined,
      },
      description: item.description ?? undefined,
      images: {
        cover: item.coverImage?.large ?? undefined,
        largeCover: item.coverImage?.extraLarge ?? undefined,
        banner: item.bannerImage ?? undefined,
      },
      type: "ANIME",
      format: item.format ?? undefined,
      status: item.status ?? undefined,
      season: item.season ?? undefined,
      year: item.seasonYear ?? undefined,
      episodes: item.episodes ?? undefined,
      duration: item.duration ?? undefined,
      score: item.averageScore ?? undefined,
      popularity: item.popularity ?? undefined,
      genres: item.genres ?? [],
      tags: item.tags?.map((t) => t.name) || [],
      youtubeVideoId: item.trailer?.site === "youtube" ? (item.trailer?.id ?? undefined) : undefined,
      trailerUrl: item.trailer?.site === "youtube" && item.trailer?.id ? `https://www.youtube.com/watch?v=${item.trailer.id}` : undefined,
    }));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`AniList fetch failed: ${msg}`);
    return [];
  }
}

export async function fetchAniListAnimeById(id: number): Promise<Anime | null> {
  const results = await fetchAniListAnime({ id, perPage: 1 });
  return results.length > 0 ? results[0] : null;
}

export async function fetchAniListAiringSchedule(limit: number = 30): Promise<import("./types").AiringSchedule[]> {
  const AIRING_SCHEDULE_QUERY = `
    query ($now: Int, $perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        airingSchedules(airingAt_greater: $now, sort: TIME) {
          id
          airingAt
          timeUntilAiring
          episode
          media {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              extraLarge
            }
            genres
            averageScore
            studios(isMain: true) {
              nodes {
                name
              }
            }
          }
        }
      }
    }
  `;

  try {
    const now = Math.floor(Date.now() / 1000) - 7200; // include broadcasts from last 2 hours
    const response = await fetchWithTimeout(ANILIST_API_URL, {
      method: "POST",
      body: JSON.stringify({
        query: AIRING_SCHEDULE_QUERY,
        variables: { now, perPage: limit },
      }),
    });

    if (!response.ok) throw new Error(`AniList Schedule Error: ${response.status}`);
    const data = await response.json();
    const schedules = data?.data?.Page?.airingSchedules;
    if (!Array.isArray(schedules)) return [];

    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    return (schedules as AniListAiringItem[]).map((item) => {
      const airDate = new Date(item.airingAt * 1000);
      const dayName = weekdays[airDate.getDay()];
      const jstDate = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(airDate);

      const title = item.media?.title?.english || item.media?.title?.romaji || item.media?.title?.native || "Unknown Title";
      const studio = item.media?.studios?.nodes?.[0]?.name;

      return {
        id: String(item.id),
        animeId: `anilist-${item.media?.id}`,
        animeTitle: title,
        animeImage: item.media?.coverImage?.large || item.media?.coverImage?.extraLarge || "/placeholder-cover.svg",
        episodeNumber: item.episode,
        airingAt: dayName,
        timeString: `${jstDate} JST`,
        airingAtTimestamp: item.airingAt,
        timeUntilAiring: item.timeUntilAiring,
        status: item.timeUntilAiring <= 0 ? "aired" : (item.timeUntilAiring <= 86400 ? "airing_today" : "upcoming"),
        genres: item.media?.genres || [],
        score: item.media?.averageScore ? item.media.averageScore : undefined,
        studio,
      };
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`AniList schedule fetch failed: ${msg}`);
    return [];
  }
}

