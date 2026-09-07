"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Star, Bookmark, Check } from "lucide-react";
import { Anime } from "@/lib/api/types";
import { useAuth } from "@/lib/supabase/AuthContext";
import { addToWatchlist, removeFromWatchlist } from "@/lib/supabase/dal";
import styles from "./AnimeCard.module.css";

interface AnimeCardProps {
  anime: Anime;
  priority?: boolean;
  onWatchlistToggle?: (animeId: string, inWatchlist: boolean) => void;
  isInitialWatchlisted?: boolean;
}

export default function AnimeCard({
  anime,
  priority = false,
  onWatchlistToggle,
  isInitialWatchlisted = false,
}: AnimeCardProps) {
  const { user, openAuthModal } = useAuth();
  const [inWatchlist, setInWatchlist] = useState(isInitialWatchlisted);
  const [loading, setLoading] = useState(false);
  const [imgSrc, setImgSrc] = useState(anime.images.largeCover || anime.images.cover || "/placeholder-cover.svg");

  const title = anime.title.english || anime.title.romaji || anime.title.native || "Unknown Title";
  const score = anime.score ? (anime.score > 10 ? (anime.score / 10).toFixed(1) : anime.score.toFixed(1)) : null;

  const handleWatchlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      openAuthModal();
      return;
    }

    setLoading(true);
    try {
      if (inWatchlist) {
        await removeFromWatchlist(user.id, anime.id);
        setInWatchlist(false);
        onWatchlistToggle?.(anime.id, false);
      } else {
        await addToWatchlist({
          userId: user.id,
          anime,
          status: "watching",
        });
        setInWatchlist(true);
        onWatchlistToggle?.(anime.id, true);
      }
    } catch (err) {
      console.warn("Failed to toggle watchlist:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Link href={`/anime/${anime.id}`} className={`${styles.card} sheen-effect`} aria-label={title}>
      <div className={styles.imageContainer}>
        <img
          src={imgSrc}
          alt={title}
          className={styles.poster}
          onError={() => setImgSrc("/placeholder-cover.svg")}
          loading={priority ? "eager" : "lazy"}
        />
        <div className={styles.overlayGradient} />

        {/* Badges Overlay */}
        <div className={styles.topBadges}>
          {score && (
            <span className={styles.scoreBadge}>
              <Star size={11} fill="#facc15" color="#facc15" />
              <span>{score}</span>
            </span>
          )}
          {anime.format && <span className={styles.formatBadge}>{anime.format}</span>}
        </div>

        {/* Quick Add Button */}
        <button
          className={`${styles.watchlistBtn} ${inWatchlist ? styles.activeWatchlist : ""}`}
          onClick={handleWatchlistClick}
          aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
          title={inWatchlist ? "In Watchlist" : "Add to Watchlist"}
          disabled={loading}
        >
          {inWatchlist ? <Check size={15} /> : <Bookmark size={15} />}
        </button>
      </div>

      <div className={styles.content}>
        <h3 className={styles.title} title={title}>
          {title}
        </h3>
        <div className={styles.meta}>
          <span>{anime.year || "TBA"}</span>
          {anime.episodes && <span>• {anime.episodes} EP</span>}
          {anime.status && <span>• {anime.status}</span>}
        </div>
      </div>
    </Link>
  );
}
