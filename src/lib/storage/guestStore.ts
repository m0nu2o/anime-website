import { Anime } from "@/lib/api/types";
import { WatchlistItem, FavoriteItem, WatchlistStatus } from "@/lib/supabase/types";
import { addToWatchlist, toggleFavorite } from "@/lib/supabase/dal";

const WATCHLIST_KEY = "nextgen_guest_watchlist";
const FAVORITES_KEY = "nextgen_guest_favorites";

/** Minimal provider-identified stub used when syncing local rows to Supabase. */
function toSyncableAnime(item: { anime_id: string; anime_title?: string | null; anime_image?: string | null; anime_format?: string | null }): Anime {
  const id = item.anime_id;
  const provider: Anime["provider"] = id.startsWith("anilist-")
    ? "anilist"
    : id.startsWith("mal-")
    ? "mal"
    : id.startsWith("kitsu-")
    ? "kitsu"
    : "kitsu";
  return {
    id,
    provider,
    title: { english: item.anime_title || "Unknown Title" },
    images: { cover: item.anime_image || undefined },
    format: item.anime_format || "TV",
  };
}

export function getGuestWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToGuestWatchlist(anime: Anime, status: WatchlistStatus = "watching"): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const list = getGuestWatchlist();
    const existingIdx = list.findIndex((item) => item.anime_id === anime.id);

    const title = anime.title.english || anime.title.romaji || anime.title.native || "Anime";
    const image = anime.images.cover || anime.images.largeCover;

    const newItem: WatchlistItem = {
      id: `guest-wl-${anime.id}`,
      user_id: "guest",
      anime_id: anime.id,
      anime_title: title,
      anime_image: image,
      anime_format: anime.format || "TV",
      anime_score: anime.score ? Math.round(anime.score / 10) : undefined,
      status,
      progress: 0,
      score: anime.score ? Math.round(anime.score / 10) : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], status, updated_at: new Date().toISOString() };
    } else {
      list.unshift(newItem);
    }

    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("guest_watchlist_updated"));
    return list;
  } catch {
    return [];
  }
}

export function updateGuestWatchlistStatus(
  animeId: string,
  status: WatchlistStatus,
  progress?: number
): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const list = getGuestWatchlist();
    const idx = list.findIndex((item) => item.anime_id === animeId);
    if (idx >= 0) {
      list[idx].status = status;
      if (typeof progress === "number") {
        list[idx].progress = progress;
      }
      list[idx].updated_at = new Date().toISOString();
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent("guest_watchlist_updated"));
    }
    return list;
  } catch {
    return [];
  }
}

export function removeFromGuestWatchlist(animeId: string): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const list = getGuestWatchlist().filter((item) => item.anime_id !== animeId);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("guest_watchlist_updated"));
    return list;
  } catch {
    return [];
  }
}

export function isGuestWatchlisted(animeId: string): boolean {
  if (typeof window === "undefined") return false;
  return getGuestWatchlist().some((item) => item.anime_id === animeId);
}

export function getGuestWatchlistStatus(animeId: string): WatchlistStatus | null {
  if (typeof window === "undefined") return null;
  const item = getGuestWatchlist().find((i) => i.anime_id === animeId);
  return item ? item.status : null;
}

export function getGuestFavorites(): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleGuestFavorite(anime: Anime): boolean {
  if (typeof window === "undefined") return false;
  try {
    const favs = getGuestFavorites();
    const idx = favs.findIndex((item) => item.anime_id === anime.id);

    if (idx >= 0) {
      favs.splice(idx, 1);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
      window.dispatchEvent(new CustomEvent("guest_favorites_updated"));
      return false;
    } else {
      const title = anime.title.english || anime.title.romaji || anime.title.native || "Anime";
      const image = anime.images.cover || anime.images.largeCover;

      const newItem: FavoriteItem = {
        id: `guest-fav-${anime.id}`,
        user_id: "guest",
        anime_id: anime.id,
        anime_title: title,
        anime_image: image,
        anime_format: anime.format || anime.type || "TV",
        anime_score: anime.score,
        created_at: new Date().toISOString(),
      };
      favs.unshift(newItem);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
      window.dispatchEvent(new CustomEvent("guest_favorites_updated"));
      return true;
    }
  } catch {
    return false;
  }
}

export function isGuestFavorite(animeId: string): boolean {
  if (typeof window === "undefined" || !animeId) return false;
  return getGuestFavorites().some(
    (item) => item.anime_id === animeId || String(item.anime_id) === String(animeId)
  );
}

/** Removes a guest favorite by identity only — no fabricated Anime stub required. */
export function removeGuestFavorite(animeId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const favs = getGuestFavorites();
    const next = favs.filter((item) => item.anime_id !== animeId);
    if (next.length === favs.length) return false;
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("guest_favorites_updated"));
    return true;
  } catch {
    return false;
  }
}

/**
 * Automatically sync guest local items to Supabase when user logs in
 */
export async function syncGuestDataToSupabase(userId: string): Promise<void> {
  if (typeof window === "undefined" || !userId) return;

  try {
    const localWatchlist = getGuestWatchlist();
    const localFavorites = getGuestFavorites();

    if (localWatchlist.length > 0) {
      for (const item of localWatchlist) {
        try {
          await addToWatchlist({
            userId,
            anime: toSyncableAnime(item),
            status: item.status,
          });
        } catch {}
      }
      localStorage.removeItem(WATCHLIST_KEY);
    }

    if (localFavorites.length > 0) {
      for (const item of localFavorites) {
        try {
          await toggleFavorite(userId, toSyncableAnime(item));
        } catch {}
      }
      localStorage.removeItem(FAVORITES_KEY);
    }
  } catch (err) {
    console.warn("Failed to sync guest data to Supabase:", err);
  }
}
