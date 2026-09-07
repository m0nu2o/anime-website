export interface Profile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  preferences?: {
    theme?: string;
    autoplay?: boolean;
    notifications?: boolean;
  };
  created_at: string;
}

export type WatchlistStatus = 'watching' | 'completed' | 'planning' | 'dropped' | 'on_hold';

export interface WatchlistItem {
  id: string;
  user_id: string;
  anime_id: string;
  anime_title?: string;
  anime_image?: string;
  anime_format?: string;
  anime_score?: number;
  status: WatchlistStatus;
  progress: number;
  score?: number;
  created_at: string;
  updated_at: string;
}

export interface FavoriteItem {
  id: string;
  user_id: string;
  anime_id: string;
  anime_title?: string;
  anime_image?: string;
  anime_format?: string;
  anime_score?: number;
  created_at: string;
}

export interface WatchHistoryItem {
  id: string;
  user_id: string;
  anime_id: string;
  anime_title?: string;
  anime_image?: string;
  season: number;
  episode: number;
  episode_title?: string;
  playback_position: number; // in seconds
  duration: number; // in seconds
  completed: boolean;
  updated_at: string;
}
