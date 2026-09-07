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

export async function fetchAniListAnime(params: { id?: number; search?: string; page?: number; perPage?: number; sort?: string[] }): Promise<Anime[]> {
  try {
    const variables: Record<string, any> = {
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
    
    if (!data.data || !data.data.Page || !data.data.Page.media) {
      return [];
    }

    return data.data.Page.media.map((item: any) => ({
      id: `anilist-${item.id}`,
      anilistId: item.id,
      malId: item.idMal,
      title: {
        english: item.title?.english,
        romaji: item.title?.romaji,
        native: item.title?.native,
      },
      description: item.description,
      images: {
        cover: item.coverImage?.large,
        largeCover: item.coverImage?.extraLarge,
        banner: item.bannerImage,
      },
      type: "ANIME",
      format: item.format,
      status: item.status,
      season: item.season,
      year: item.seasonYear,
      episodes: item.episodes,
      duration: item.duration,
      score: item.averageScore,
      popularity: item.popularity,
      genres: item.genres,
      tags: item.tags?.map((t: any) => t.name) || [],
      youtubeVideoId: item.trailer?.site === "youtube" ? item.trailer?.id : undefined,
      trailerUrl: item.trailer?.site === "youtube" ? `https://www.youtube.com/watch?v=${item.trailer?.id}` : undefined,
    }));
  } catch (error: any) {
    console.warn(`AniList fetch failed: ${error.message}`);
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

    return schedules.map((item: any) => {
      const airDate = new Date(item.airingAt * 1000);
      const dayName = weekdays[airDate.getDay()];
      const jstDate = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(airDate);

      const title = item.media?.title?.english || item.media?.title?.romaji || "Anime Release";
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
        score: item.media?.averageScore,
        studio,
      };
    });
  } catch (err: any) {
    console.warn(`AniList schedule fetch failed: ${err.message}`);
    return [];
  }
}

