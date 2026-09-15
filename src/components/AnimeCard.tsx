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

/** Normalize status text to clean, human-readable labels */
function formatStatus(raw?: string): string | null {
  if (!raw) return null;
  const s = raw.toUpperCase().replace(/[_\s]+/g, "_");
  switch (s) {
    case "FINISHED": return "Finished";
    case "RELEASING":
    case "CURRENTLY_AIRING": return "Airing";
    case "NOT_YET_RELEASED":
    case "UPCOMING": return "Upcoming";
    case "CANCELLED": return "Cancelled";
    case "HIATUS": return "On Hiatus";
    default: {
      return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase().replace(/_/g, " ");
    }
  }
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
  }, [user, anime.id]);

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
  const displayStatus = formatStatus(anime.status);

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

  const metaParts: string[] = [];
  if (anime.year) metaParts.push(String(anime.year));
  if (anime.episodes) metaParts.push(`${anime.episodes} ep`);
  if (displayStatus) metaParts.push(displayStatus);

  if (variant === "horizontal") {
    return (
      <Link href={`/anime/${anime.id}`} className={`${styles.card} ${styles.cardHorizontal}`} aria-label={title}>
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
              <Star size={9} fill="#facc15" color="#facc15" />
              <span>{score}</span>
            </span>
          )}
        </div>
        <div className={styles.contentHorizontal}>
          <h4 className={styles.titleHorizontal} title={title}>
            {title}
          </h4>
          <div className={styles.metaHorizontal}>
            {metaParts.join(" · ")}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/anime/${anime.id}`} className={styles.card} aria-label={title}>
      <div className={styles.imageContainer}>
        <img
          src={imgSrc}
          alt={title}
          className={styles.poster}
          onError={() => setImgSrc("/placeholder-cover.svg")}
          loading={priority ? "eager" : "lazy"}
        />
        <div className={styles.overlayGradient} />

        {/* Score — top-left, always visible */}
        {score && (
          <span className={styles.scoreBadge}>
            <Star size={10} fill="#facc15" color="#facc15" />
            <span>{score}</span>
          </span>
        )}

        {/* Watchlist — top-right, always visible */}
        <div ref={menuRef} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <button
            type="button"
            className={`${styles.watchlistBtn} ${status ? styles.activeWatchlist : ""}`}
            onClick={handleButtonClick}
            aria-label={status ? `Watchlist: ${activeCategory?.label}` : "Add to watchlist"}
            title={status ? activeCategory?.label : "Add to watchlist"}
            disabled={loading}
            style={
              activeCategory
                ? { background: activeCategory.color, borderColor: activeCategory.color }
                : {}
            }
          >
            {status ? <Check size={14} /> : <Bookmark size={14} />}
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
                  className={`${styles.cardStatusItem} ${styles.cardStatusRemove}`}
                  onClick={handleRemove}
                >
                  <Trash2 size={12} />
                  <span>Remove</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Favorite — hover-revealed */}
        <div className={styles.hoverActions} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <FavoriteButton
            anime={anime}
            variant="icon"
            onToggle={(fav) => onFavoriteToggle?.(anime.id, fav)}
          />
        </div>
      </div>

      <div className={styles.content}>
        <h3 className={styles.title} title={title}>
          {title}
        </h3>
        <div className={styles.meta}>
          {metaParts.join(" · ")}
        </div>
      </div>
    </Link>
  );
}
