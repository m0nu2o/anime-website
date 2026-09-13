"use client";

import React, { useState, useEffect, useRef } from "react";
import { Heart, Loader2 } from "lucide-react";
import { Anime } from "@/lib/api/types";
import { useAuth } from "@/lib/supabase/AuthContext";
import { isFavorite, toggleFavorite } from "@/lib/supabase/dal";
import styles from "./FavoriteButton.module.css";

interface FavoriteButtonProps {
  anime: Anime;
  variant?: "detail" | "compact" | "icon";
  className?: string;
  onToggle?: (isFavorited: boolean) => void;
}

export default function FavoriteButton({
  anime,
  variant = "detail",
  className = "",
  onToggle,
}: FavoriteButtonProps) {
  const { user, openAuthModal } = useAuth();
  const [isFav, setIsFav] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [popping, setPopping] = useState<boolean>(false);
  const [toastText, setToastText] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (text: string) => {
    setToastText(text);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastText(null), 2500);
  };

  const syncStatus = async () => {
    if (!anime?.id) return;
    if (user) {
      try {
        const fav = await isFavorite(user.id, anime.id);
        setIsFav(fav);
      } catch {
        setIsFav(false);
      }
    } else {
      setIsFav(false);
    }
  };

  useEffect(() => {
    syncStatus();
  }, [user, anime?.id]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!anime?.id || loading) return;

    setLoading(true);
    setPopping(true);
    setTimeout(() => setPopping(false), 450);

    const nextState = !isFav;

    if (!user) {
      openAuthModal();
      setLoading(false);
      return;
    }

    setIsFav(nextState);

    try {
      const finalState = await toggleFavorite(user.id, anime);
      setIsFav(finalState);
      onToggle?.(finalState);

      if (finalState) {
        showToast("❤️ Added to Favorites");
      } else {
        showToast("💔 Removed from Favorites");
      }
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
      setIsFav(!nextState);
      showToast("❌ Could not update favorites");
    } finally {
      setLoading(false);
    }
  };

  const animeTitle = anime.title.english || anime.title.romaji || anime.title.native || "Anime";

  // ICON VARIANT (for AnimeCard overlay)
  if (variant === "icon") {
    return (
      <div className={`${styles.container} ${styles.iconContainer}`}>
        {toastText && <div className={styles.toastFeedback}>{toastText}</div>}
        <button
          type="button"
          className={`${styles.iconBtn} ${isFav ? styles.iconActive : ""} ${className}`}
          onClick={handleToggle}
          disabled={loading}
          aria-label={isFav ? `Remove ${animeTitle} from favorites` : `Add ${animeTitle} to favorites`}
          title={isFav ? "In Favorites (click to remove)" : "Add to Favorites"}
        >
          {loading ? (
            <Loader2 size={15} className="spinner" />
          ) : (
            <Heart
              size={15}
              fill={isFav ? "#f43f5e" : "none"}
              color={isFav ? "#f43f5e" : "currentColor"}
              className={`${styles.heartIcon} ${popping ? styles.heartPop : ""}`}
            />
          )}
        </button>
      </div>
    );
  }

  // COMPACT VARIANT (for /watch action bar)
  if (variant === "compact") {
    return (
      <div className={styles.container}>
        {toastText && <div className={styles.toastFeedback}>{toastText}</div>}
        <button
          type="button"
          className={`${styles.compactBtn} ${isFav ? styles.compactActive : ""} ${className}`}
          onClick={handleToggle}
          disabled={loading}
          aria-label={isFav ? "Favorited anime" : "Add to favorites"}
          title={isFav ? "In Favorites" : "Add to Favorites"}
        >
          {loading ? (
            <Loader2 size={14} className="spinner" />
          ) : (
            <Heart
              size={14}
              fill={isFav ? "#f43f5e" : "none"}
              color={isFav ? "#f43f5e" : "currentColor"}
              className={`${styles.heartIcon} ${popping ? styles.heartPop : ""}`}
            />
          )}
          <span>{isFav ? "Favorited" : "Favorite"}</span>
        </button>
      </div>
    );
  }

  // DETAIL VARIANT (default for /anime/[id] action stack)
  return (
    <div className={`${styles.container} ${styles.detailWrapper}`}>
      {toastText && <div className={styles.toastFeedback}>{toastText}</div>}
      <button
        type="button"
        className={`${styles.detailBtn} ${isFav ? styles.detailActive : ""} ${className}`}
        onClick={handleToggle}
        disabled={loading}
        aria-label={isFav ? `In Favorites: ${animeTitle}` : `Add ${animeTitle} to Favorites`}
      >
        {loading ? (
          <Loader2 size={17} className="spinner" />
        ) : (
          <Heart
            size={17}
            fill={isFav ? "#f43f5e" : "none"}
            color={isFav ? "#f43f5e" : "currentColor"}
            className={`${styles.heartIcon} ${popping ? styles.heartPop : ""}`}
          />
        )}
        <span>{isFav ? "In Favorites" : "Add to Favorites"}</span>
      </button>
    </div>
  );
}
