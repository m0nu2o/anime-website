"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Star, Bookmark, Check, Trash2 } from "lucide-react";
import { Anime } from "@/lib/api/types";
import { WatchlistStatus } from "@/lib/supabase/types";
import { useAuth } from "@/lib/supabase/AuthContext";
import { addToWatchlist, removeFromWatchlist, updateWatchlistStatus, getWatchlistItem } from "@/lib/supabase/dal";
import { WATCHLIST_CATEGORIES } from "@/components/WatchlistStatusSelect";
import FavoriteButton from "@/components/FavoriteButton";
import styles from "./AnimeCard.module.css";

interface AnimeCardProps {
  anime: Anime;
  priority?: boolean;
  onWatchlistToggle?: (animeId: string, inWatchlist: boolean) => void;
  onFavoriteToggle?: (animeId: string, isFavorited: boolean) => void;
  isInitialWatchlisted?: boolean;
  variant?: "standard" | "compact" | "horizontal";
}

export default function AnimeCard({
  anime,
  priority = false,
  onWatchlistToggle,
  onFavoriteToggle,
  isInitialWatchlisted = false,
  variant = "standard",
}: AnimeCardProps) {
  const { user, openAuthModal } = useAuth();
  const [status, setStatus] = useState<WatchlistStatus | null>(isInitialWatchlisted ? "watching" : null);
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imgSrc, setImgSrc] = useState(anime.images.largeCover || anime.images.cover || "/placeholder-cover.svg");
  const menuRef = useRef<HTMLDivElement>(null);

  const syncStatus = async () => {
    if (!anime?.id) return;
    if (user) {
      try {
        const item = await getWatchlistItem(user.id, anime.id);
        setStatus(item ? item.status : null);
      } catch {
        setStatus(null);
      }
    } else {
      setStatus(null);
    }
  };

  useEffect(() => {
    syncStatus();
  }, [user, anime.id]);

  useEffect(() => {
    const handleUpdate = () => {
      if (!user) syncStatus();
    };
    window.removeEventListener("guest_watchlist_updated", handleUpdate);
    // no-op cleanup retained for structure
  }, [user, anime.id]);

  // Click outside to close card status menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const rawTitle = anime.title.english || anime.title.romaji || anime.title.native || "Unknown Title";
  const title = (rawTitle.length > 5 && rawTitle === rawTitle.toUpperCase() && !/[a-z]/.test(rawTitle))
    ? rawTitle
        .toLowerCase()
        .replace(/(?:^|\s|\/|-)\S/g, (c) => c.toUpperCase())
        .replace(/\b(In|The|Of|And|At|By|For|With|A|An|To)\b/gi, (w, _, offset) => offset === 0 ? w : w.toLowerCase())
    : rawTitle;
  const score = anime.score ? (anime.score > 10 ? (anime.score / 10).toFixed(1) : anime.score.toFixed(1)) : null;

  const handleStatusSelect = async (e: React.MouseEvent, targetStatus: WatchlistStatus) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);
    setLoading(true);

    try {
      if (!user) {
        openAuthModal();
        return;
      }
      if (status) {
        await updateWatchlistStatus(user.id, anime.id, targetStatus);
      } else {
        await addToWatchlist({ userId: user.id, anime, status: targetStatus });
      }
      setStatus(targetStatus);
      onWatchlistToggle?.(anime.id, true);
    } catch (err) {
      console.warn("Failed to set watchlist status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);
    setLoading(true);

    try {
      if (!user) {
        openAuthModal();
        return;
      }
      await removeFromWatchlist(user.id, anime.id);
      setStatus(null);
      onWatchlistToggle?.(anime.id, false);
    } catch (err) {
      console.warn("Failed to remove from watchlist:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const activeCategory = WATCHLIST_CATEGORIES.find((c) => c.value === status);

  if (variant === "horizontal") {
    return (
      <Link href={`/anime/${anime.id}`} className={`${styles.card} ${styles.cardHorizontal} sheen-effect`} aria-label={title}>
        <div className={styles.imageContainerHorizontal}>
          <img
            src={imgSrc}
            alt={title}
            className={styles.posterHorizontal}
            onError={() => setImgSrc("/placeholder-cover.svg")}
            loading={priority ? "eager" : "lazy"}
          />
          {score && (
            <span className={styles.scoreBadgeHorizontal}>
              <Star size={10} fill="#facc15" color="#facc15" />
              <span>{score}</span>
            </span>
          )}
        </div>
        <div className={styles.contentHorizontal}>
          <h4 className={styles.titleHorizontal} title={title}>
            {title}
          </h4>
          <div className={styles.metaHorizontal}>
            <span>{anime.format || "TV"}</span>
            {anime.year && <span>• {anime.year}</span>}
            {anime.episodes && <span>• {anime.episodes} EP</span>}
          </div>
        </div>
      </Link>
    );
  }

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

        {/* Quick Favorite Heart Button */}
        <div className={styles.cardFavWrapper} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <FavoriteButton
            anime={anime}
            variant="icon"
            onToggle={(fav) => onFavoriteToggle?.(anime.id, fav)}
          />
        </div>

        {/* Quick Watchlist Status Button & Menu */}
        <div ref={menuRef} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <button
            type="button"
            className={`${styles.watchlistBtn} ${status ? styles.activeWatchlist : ""}`}
            onClick={handleButtonClick}
            aria-label={status ? `Watchlist: ${activeCategory?.label}` : "Set Watchlist Status"}
            title={status ? `Watchlist: ${activeCategory?.label}` : "Add to Watchlist"}
            disabled={loading}
            style={
              activeCategory
                ? {
                    background: activeCategory.color,
                    borderColor: activeCategory.color,
                    boxShadow: `0 0 14px ${activeCategory.color}88`,
                  }
                : {}
            }
          >
            {status ? <Check size={15} /> : <Bookmark size={15} />}
          </button>

          {showMenu && (
            <div className={styles.cardStatusMenu} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              {WATCHLIST_CATEGORIES.map((cat) => {
                const isSelected = status === cat.value;
                const Icon = cat.Icon;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    className={`${styles.cardStatusItem} ${isSelected ? styles.cardStatusItemActive : ""}`}
                    onClick={(e) => handleStatusSelect(e, cat.value)}
                  >
                    <div className={styles.cardStatusDot} style={{ background: cat.color }} />
                    <Icon size={12} style={{ color: cat.color }} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
              {status && (
                <button
                  type="button"
                  className={styles.cardStatusItem}
                  onClick={handleRemove}
                  style={{
                    color: "#f87171",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    marginTop: "2px",
                    paddingTop: "6px",
                  }}
                >
                  <Trash2 size={12} />
                  <span>Remove</span>
                </button>
              )}
            </div>
          )}
        </div>
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
