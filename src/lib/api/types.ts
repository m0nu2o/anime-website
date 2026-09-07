export interface Episode {
  id: string;
  number: number;
  seasonNumber: number;
  title: string;
  synopsis?: string;
  thumbnail?: string;
  airdate?: string;
  length?: number; // minutes
}

export interface StreamingLink {
  id: string;
  url: string;
  serviceName: string; // e.g. "Crunchyroll", "Netflix", "Hulu"
}

export interface Character {
  id: string;
  name: string;
  nativeName?: string;
  image?: string;
  description?: string;
  role?: string; // "main", "supporting"
  voiceActor?: {
    name: string;
    image?: string;
    language?: string;
  };
}

export interface StaffPerson {
  id: string;
  name: string;
  role: string;
  image?: string;
  occupations?: string[];
  description?: string;
}

export interface Studio {
  id: string;
  name: string;
  role?: string;
  image?: string;
  description?: string;
  animeCount?: number;
}

export interface AnimeRelation {
  id: string;
  role: string; // "prequel", "sequel", "adaptation", "spinoff", "alternative_version", "side_story"
  anime: {
    id: string;
    title: string;
    image?: string;
    format?: string;
    year?: number;
    episodes?: number;
  };
}

export interface AiringSchedule {
  id: string;
  animeId: string;
  animeTitle: string;
  animeImage: string;
  episodeNumber: number;
  airingAt: string; // Day name or ISO string
  timeString?: string;
  airingAtTimestamp?: number; // Unix timestamp
  timeUntilAiring?: number; // seconds until airing
  status?: "airing_today" | "upcoming" | "aired";
  genres?: string[];
  score?: number;
  studio?: string;
}

export type AnimeProvider = "anilist" | "mal" | "kitsu";

export interface AnimeIds {
  id: string; // Unified prefixed ID: anilist-XXXX, mal-XXXX, kitsu-XXXX
  provider: AnimeProvider;
  anilistId?: number;
  malId?: number;
  kitsuId?: string;
}

export interface StreamSource {
  url: string;
  quality: string;
  isM3U8: boolean;
}

export interface EmbedSource {
  label: string;
  url: string;
  serverType: string;
  isDub: boolean;
}

export interface StreamResponse {
  success: boolean;
  provider: string;
  anilistId?: string;
  dubAvailable: boolean;
  subAvailable: boolean;
  sources: StreamSource[];
  subtitles?: { url: string; lang: string }[];
  embedUrls: EmbedSource[];
  downloadUrl?: string;
  error?: string;
}

export interface Anime {
  id: string;
  provider: AnimeProvider;
  anilistId?: number;
  malId?: number;
  kitsuId?: string;

  title: {
    english?: string;
    romaji?: string;
    native?: string;
    synonyms?: string[];
  };

  description?: string;
  images: {
    cover?: string;
    largeCover?: string;
    banner?: string;
  };

  type?: string;
  format?: string;
  status?: string;
  season?: string;
  year?: number;
  episodes?: number;
  duration?: number;
  
  score?: number;
  popularity?: number;
  rank?: number;
  
  genres?: string[];
  tags?: string[];
  youtubeVideoId?: string;
  trailerUrl?: string;

  studios?: Studio[];
  characters?: Character[];
  staff?: StaffPerson[];
  relations?: AnimeRelation[];
  recommendations?: Anime[];
  streamingLinks?: StreamingLink[];
  episodesList?: Episode[];
}

