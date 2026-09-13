import { Anime } from "./types";

const ANILIST_API_URL = "https://graphql.anilist.co";

const ANILIST_HEADERS = {
  "Content-Type": "application/json",
  "Accept": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 NextGenAnime/1.0",
};

const ANIME_QUERY = `
  query ($id: Int, $search: String, $status: MediaStatus, $page: Int, $perPage: Int, $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      media(id: $id, search: $search, status: $status, type: ANIME, sort: $sort) {
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
        nextAiringEpisode {
          episode
          airingAt
          timeUntilAiring
        }
        trailer {
          id
          site
        }
      }
    }
  }
`;

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 2500): Promise<Response> {
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
  studios?: { nodes?: { name: string }[] | null } | null;
  nextAiringEpisode?: {
    episode: number;
    airingAt?: number | null;
    timeUntilAiring?: number | null;
  } | null;
}

interface AniListAiringItem {
  id: number;
  airingAt: number;
  timeUntilAiring: number;
  episode: number;
  media?: {
    id: number;
    idMal?: number | null;
    title?: { romaji?: string | null; english?: string | null; native?: string | null } | null;
    coverImage?: { large?: string | null; extraLarge?: string | null } | null;
    format?: string | null;
    status?: string | null;
    genres?: string[] | null;
    averageScore?: number | null;
    studios?: { nodes?: { name: string }[] | null } | null;
  } | null;
}

function getJstDayAndTime(timestamp: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp * 1000));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const dayName = values.weekday || "Unknown";
  const hour = values.hour || "00";
  const minute = values.minute || "00";
  return {
    dayName,
    dateString: `${values.year}-${values.month}-${values.day}`,
    timeString: `${hour}:${minute} JST`,
  };
}

export async function fetchAniListAnime(params: { id?: number; search?: string; status?: string; page?: number; perPage?: number; sort?: string[] }): Promise<Anime[]> {
  try {
    const variables: Record<string, unknown> = {
      page: params.page || 1,
      perPage: params.perPage || 10,
    };
    
    if (params.id) variables.id = params.id;
    if (params.search) variables.search = params.search;
    if (params.status) variables.status = params.status;
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
      nextAiringEpisode: item.nextAiringEpisode ? {
        episode: item.nextAiringEpisode.episode,
        airingAt: item.nextAiringEpisode.airingAt ?? undefined,
        timeUntilAiring: item.nextAiringEpisode.timeUntilAiring ?? undefined,
      } : undefined,
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

export async function fetchAniListAiringSchedule(limit: number = 100): Promise<import("./types").AiringSchedule[]> {
  const AIRING_SCHEDULE_QUERY = `
    query ($start: Int, $end: Int, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          hasNextPage
        }
        airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
          id
          airingAt
          timeUntilAiring
          episode
          media {
            id
            idMal
            status
            format
            genres
            averageScore
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              extraLarge
            }
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
    const now = Math.floor(Date.now() / 1000);
    // Include 24 hours in the past so today's already-aired shows are present
    const start = now - 86400;
    const end = now + 7 * 86400;

    const allSchedules: AniListAiringItem[] = [];
    const pageSize = 50;
    const maxPages = Math.min(Math.ceil(limit / pageSize), 3);

    for (let page = 1; page <= maxPages; page++) {
      const response = await fetchWithTimeout(ANILIST_API_URL, {
        method: "POST",
        body: JSON.stringify({
          query: AIRING_SCHEDULE_QUERY,
          variables: { start, end, page, perPage: pageSize },
        }),
      });

      if (!response.ok) {
        if (page === 1) throw new Error(`AniList Schedule Error: ${response.status}`);
        break;
      }

      const data = await response.json();
      const schedules = data?.data?.Page?.airingSchedules;
      if (Array.isArray(schedules) && schedules.length > 0) {
        allSchedules.push(...schedules);
        if (!data?.data?.Page?.pageInfo?.hasNextPage) break;
      } else {
        break;
      }
    }

    if (allSchedules.length === 0) return [];

    return allSchedules.map((item) => {
      const { dayName, dateString, timeString } = getJstDayAndTime(item.airingAt);
      const title = item.media?.title?.english || item.media?.title?.romaji || item.media?.title?.native || "Unknown Title";
      const studio = item.media?.studios?.nodes?.[0]?.name;

      return {
        id: String(item.id),
        animeId: `anilist-${item.media?.id}`,
        anilistId: item.media?.id,
        malId: item.media?.idMal ?? undefined,
        animeTitle: title,
        animeImage: item.media?.coverImage?.large || item.media?.coverImage?.extraLarge || "/placeholder-cover.svg",
        format: item.media?.format || undefined,
        episodeNumber: item.episode,
        airingAt: dayName,
        airingDate: dateString,
        timeString,
        hasExactTime: true,
        airingAtTimestamp: item.airingAt,
        timeUntilAiring: item.timeUntilAiring,
        status: item.timeUntilAiring <= 0 ? "aired" : (item.timeUntilAiring <= 86400 ? "airing_today" : "upcoming"),
        genres: item.media?.genres || [],
        score: item.media?.averageScore ? item.media.averageScore : undefined,
        studio,
        source: "anilist",
      };
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`AniList schedule fetch failed: ${msg}`);
    return [];
  }
}

export async function fetchAniListRecentAiringSchedule(limit: number = 30): Promise<import("./types").AiringSchedule[]> {
  const AIRING_SCHEDULE_QUERY = `
    query ($now: Int, $perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        airingSchedules(airingAt_lesser: $now, sort: TIME_DESC) {
          id
          airingAt
          timeUntilAiring
          episode
          media {
            id
            idMal
            status
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              extraLarge
            }
            format
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
    const now = Math.floor(Date.now() / 1000);
    const response = await fetchWithTimeout(ANILIST_API_URL, {
      method: "POST",
      body: JSON.stringify({
        query: AIRING_SCHEDULE_QUERY,
        variables: { now, perPage: limit },
      }),
    });

    if (!response.ok) throw new Error(`AniList Recent Schedule Error: ${response.status}`);
    const data = await response.json();
    const schedules = data?.data?.Page?.airingSchedules;
    if (!Array.isArray(schedules)) return [];

    return (schedules as AniListAiringItem[])
      .filter((item) => item.timeUntilAiring <= 0)
      .map((item) => {
        const { dayName, dateString, timeString } = getJstDayAndTime(item.airingAt);
        const title = item.media?.title?.english || item.media?.title?.romaji || item.media?.title?.native || "Unknown Title";
        const studio = item.media?.studios?.nodes?.[0]?.name;

        return {
          id: String(item.id),
          animeId: `anilist-${item.media?.id}`,
          anilistId: item.media?.id,
          malId: item.media?.idMal ?? undefined,
          animeTitle: title,
          animeImage: item.media?.coverImage?.large || item.media?.coverImage?.extraLarge || "/placeholder-cover.svg",
          episodeNumber: item.episode,
          airingAt: dayName,
          airingDate: dateString,
          timeString,
          hasExactTime: true,
          airingAtTimestamp: item.airingAt,
          timeUntilAiring: item.timeUntilAiring,
          status: "aired",
          genres: item.media?.genres || [],
          score: item.media?.averageScore ? item.media.averageScore : undefined,
          studio,
          source: "anilist",
        };
      });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`AniList recent schedule fetch failed: ${msg}`);
    return [];
  }
}

export async function fetchAniListTopAiring(limit: number = 10): Promise<Anime[]> {
  const TOP_AIRING_QUERY = `
    query ($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(status: RELEASING, sort: SCORE_DESC, type: ANIME) {
          id
          idMal
          title {
            english
            romaji
            native
          }
          description
          coverImage {
            large
            extraLarge
          }
          bannerImage
          format
          status
          episodes
          duration
          averageScore
          popularity
          genres
          studios(isMain: true) {
            nodes {
              name
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetchWithTimeout(ANILIST_API_URL, {
      method: "POST",
      body: JSON.stringify({
        query: TOP_AIRING_QUERY,
        variables: { perPage: limit },
      }),
    });

    if (!response.ok) throw new Error(`AniList Top Airing Error: ${response.status}`);
    const data = await response.json();
    const media = data?.data?.Page?.media;
    if (!Array.isArray(media)) return [];

    return (media as AniListMedia[]).map((item) => ({
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
        largeCover: item.coverImage?.extraLarge ?? item.coverImage?.large ?? undefined,
        banner: item.bannerImage ?? undefined,
      },
      format: item.format ?? undefined,
      status: item.status ?? undefined,
      episodes: item.episodes ?? undefined,
      duration: item.duration ?? undefined,
      score: item.averageScore ? item.averageScore : undefined,
      popularity: item.popularity ?? undefined,
      genres: item.genres ?? [],
      studios: item.studios?.nodes?.map((s: { name: string }) => ({ id: s.name, name: s.name })) || [],
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`AniList top airing fetch failed: ${msg}`);
    return [];
  }
}

const RECOMMENDATIONS_QUERY = `
  query ($id: Int, $perPage: Int) {
    Media(id: $id, type: ANIME) {
      recommendations(perPage: $perPage, sort: [RATING_DESC]) {
        nodes {
          mediaRecommendation {
            id
            idMal
            title {
              romaji
              english
              native
            }
            description
            coverImage {
              large
              extraLarge
            }
            bannerImage
            format
            status
            episodes
            duration
            averageScore
            popularity
            genres
          }
        }
      }
    }
  }
`;

export async function fetchAniListRecommendations(mediaId: number, limit: number = 8): Promise<Anime[]> {
  try {
    const response = await fetchWithTimeout(ANILIST_API_URL, {
      method: "POST",
      body: JSON.stringify({
        query: RECOMMENDATIONS_QUERY,
        variables: { id: mediaId, perPage: limit },
      }),
    });

    if (!response.ok) return [];
    const data = await response.json();
    const nodes = data?.data?.Media?.recommendations?.nodes;
    if (!Array.isArray(nodes)) return [];

    return nodes
      .map((node: { mediaRecommendation?: AniListMedia }) => node.mediaRecommendation)
      .filter((item): item is AniListMedia => Boolean(item && item.id))
      .map((item) => ({
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
          largeCover: item.coverImage?.extraLarge ?? item.coverImage?.large ?? undefined,
          banner: item.bannerImage ?? undefined,
        },
        format: item.format ?? undefined,
        status: item.status ?? undefined,
        episodes: item.episodes ?? undefined,
        duration: item.duration ?? undefined,
        score: item.averageScore ? item.averageScore : undefined,
        popularity: item.popularity ?? undefined,
        genres: item.genres ?? [],
      }));
  } catch {
    return [];
  }
}

/**
 * Resolve an AniList numeric ID from a MyAnimeList ID using AniList GraphQL idMal lookup.
 */
export async function fetchAniListIdByMalId(malId: number): Promise<number | null> {
  try {
    if (!malId || malId <= 0) return null;
    const query = `
      query ($malId: Int) {
        Media(idMal: $malId, type: ANIME) {
          id
        }
      }
    `;
    const res = await fetchWithTimeout(
      "https://graphql.anilist.co",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { malId } }),
      },
      3500
    );
    if (!res.ok) return null;
    const data = await res.json();
    const id = data?.data?.Media?.id;
    return typeof id === "number" ? id : null;
  } catch {
    return null;
  }
}

/**
 * Fetch verified streaming episodes from AniList for an anime.
 * When episodes appear in AniList streamingEpisodes, they are confirmed released.
 */
export async function fetchAniListStreamingEpisodes(anilistId: number): Promise<import("./types").Episode[]> {
  try {
    if (!anilistId || anilistId <= 0) return [];
    const query = `
      query ($id: Int) {
        Media(id: $id) {
          status
          episodes
          streamingEpisodes {
            title
            thumbnail
            url
            site
          }
        }
      }
    `;
    const res = await fetchWithTimeout(
      "https://graphql.anilist.co",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { id: anilistId } }),
      },
      4000
    );
    if (!res.ok) return [];
    const data = await res.json();
    const media = data?.data?.Media;
    const streamEps = media?.streamingEpisodes;
    if (!Array.isArray(streamEps) || streamEps.length === 0) return [];

    return streamEps.map((se: { title?: string; thumbnail?: string }, idx: number) => {
      const match = se.title?.match(/Episode\s*(\d+)/i) || se.title?.match(/^(\d+)\b/);
      const num = match ? parseInt(match[1], 10) : idx + 1;
      return {
        id: `anilist-${anilistId}-ep${num}`,
        number: num,
        title: se.title || `Episode ${num}`,
        thumbnail: se.thumbnail || undefined,
        status: "released" as const,
      };
    });
  } catch {
    return [];
  }
}


