import { supabase } from "./client";
import { Profile, WatchlistItem, FavoriteItem, WatchHistoryItem, WatchlistStatus } from "./types";
import { Anime } from "../api/types";

export type { Profile, WatchlistItem, FavoriteItem, WatchHistoryItem, WatchlistStatus };

// ==========================================
// PROFILES
// ==========================================

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

export async function upsertProfile(profile: Partial<Profile> & { id: string }): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name || profile.username,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      preferences: profile.preferences || { theme: "dark", autoplay: false, notifications: true },
    })
    .select()
    .single();

  if (error) {
    console.error("Error upserting profile:", error);
    return null;
  }
  return data as Profile;
}

// ==========================================
// WATCHLIST
// ==========================================

export async function getWatchlist(userId: string, status?: WatchlistStatus): Promise<WatchlistItem[]> {
  let query = supabase
    .from("watchlists")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as WatchlistItem[];
}

export async function getWatchlistItem(userId: string, animeId: string): Promise<WatchlistItem | null> {
  const { data, error } = await supabase
    .from("watchlists")
    .select("*")
    .eq("user_id", userId)
    .eq("anime_id", animeId)
    .maybeSingle();

  if (error || !data) return null;
  return data as WatchlistItem;
}

export async function addToWatchlist(item: {
  userId: string;
  anime: Anime;
  status: WatchlistStatus;
  progress?: number;
  score?: number;
}): Promise<WatchlistItem | null> {
  const title = item.anime.title.english || item.anime.title.romaji || item.anime.title.native || "Unknown Title";
  const image = item.anime.images.largeCover || item.anime.images.cover || "/placeholder-cover.svg";

  const { data, error } = await supabase
    .from("watchlists")
    .upsert(
      {
        user_id: item.userId,
        anime_id: item.anime.id,
        anime_title: title,
        anime_image: image,
        anime_format: item.anime.format || item.anime.type || "TV",
        anime_score: item.anime.score,
        status: item.status,
        progress: item.progress || 0,
        score: item.score,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,anime_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("Error adding to watchlist:", error);
    return null;
  }
  return data as WatchlistItem;
}

export async function updateWatchlistStatus(
  userId: string,
  animeId: string,
  status: WatchlistStatus,
  progress?: number
): Promise<boolean> {
  const updates: any = { status, updated_at: new Date().toISOString() };
  if (progress !== undefined) updates.progress = progress;

  const { error } = await supabase
    .from("watchlists")
    .update(updates)
    .eq("user_id", userId)
    .eq("anime_id", animeId);

  return !error;
}

export async function removeFromWatchlist(userId: string, animeId: string): Promise<boolean> {
  const { error } = await supabase
    .from("watchlists")
    .delete()
    .eq("user_id", userId)
    .eq("anime_id", animeId);

  return !error;
}

// ==========================================
// FAVORITES
// ==========================================

export async function getFavorites(userId: string): Promise<FavoriteItem[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as FavoriteItem[];
}

export async function isFavorite(userId: string, animeId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("anime_id", animeId)
    .maybeSingle();

  return !!data && !error;
}

export async function toggleFavorite(userId: string, anime: Anime): Promise<boolean> {
  const exists = await isFavorite(userId, anime.id);
  if (exists) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("anime_id", anime.id);
    return false; // Removed
  } else {
    const title = anime.title.english || anime.title.romaji || anime.title.native || "Unknown";
    const image = anime.images.largeCover || anime.images.cover || "/placeholder-cover.svg";

    const { error } = await supabase.from("favorites").insert({
      user_id: userId,
      anime_id: anime.id,
      anime_title: title,
      anime_image: image,
      anime_format: anime.format || anime.type || "TV",
      anime_score: anime.score,
    });
    return !error; // Added
  }
}

// ==========================================
// WATCH PROGRESS & CONTINUE WATCHING
// ==========================================

export async function saveWatchProgress(progress: {
  userId: string;
  animeId: string;
  animeTitle?: string;
  animeImage?: string;
  season: number;
  episode: number;
  episodeTitle?: string;
  playbackPosition: number;
  duration: number;
  completed?: boolean;
}): Promise<boolean> {
  const { error } = await supabase.from("watch_history").upsert(
    {
      user_id: progress.userId,
      anime_id: progress.animeId,
      anime_title: progress.animeTitle,
      anime_image: progress.animeImage,
      season: progress.season,
      episode: progress.episode,
      episode_title: progress.episodeTitle,
      playback_position: progress.playbackPosition,
      duration: progress.duration,
      completed: progress.completed || false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,anime_id,season,episode" }
  );

  return !error;
}

export async function getContinueWatching(userId: string, limit: number = 8): Promise<WatchHistoryItem[]> {
  const { data, error } = await supabase
    .from("watch_history")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as WatchHistoryItem[];
}

export async function getWatchProgress(
  userId: string,
  animeId: string,
  season: number,
  episode: number
): Promise<WatchHistoryItem | null> {
  const { data, error } = await supabase
    .from("watch_history")
    .select("*")
    .eq("user_id", userId)
    .eq("anime_id", animeId)
    .eq("season", season)
    .eq("episode", episode)
    .maybeSingle();

  if (error || !data) return null;
  return data as WatchHistoryItem;
}

// Convenient aliases
export const getUserWatchlist = getWatchlist;
export const getUserFavorites = getFavorites;
export const getUserWatchHistory = getContinueWatching;

