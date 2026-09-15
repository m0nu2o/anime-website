"use client";

import React, { useState, useTransition, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Sparkles, 
  Search, 
  X, 
  Filter, 
  ChevronDown, 
  Layers, 
  Radio, 
  Star, 
  ArrowUpDown, 
  RefreshCw,
  SlidersHorizontal
} from "lucide-react";
import styles from "./DiscoverFiltersBar.module.css";
import { CANONICAL_GENRES } from "@/lib/api/genres";

interface DiscoverFiltersBarProps {
  currentSearch?: string;
  currentGenre?: string;
  currentFormat?: string;
  currentStatus?: string;
  currentScore?: string;
  currentSort?: string;
  currentYear?: number;
}

const TOP_CURATED_GENRES = [
  { name: "All", slug: "all", emoji: "✨" },
  { name: "Action", slug: "action", emoji: "🔥" },
  { name: "Romance", slug: "romance", emoji: "💖" },
  { name: "Comedy", slug: "comedy", emoji: "😂" },
  { name: "Fantasy", slug: "fantasy", emoji: "🧙" },
  { name: "Sci-Fi", slug: "sci-fi", emoji: "🚀" },
  { name: "Shounen", slug: "shounen", emoji: "⚡" },
  { name: "Isekai", slug: "isekai", emoji: "🌀" },
  { name: "Horror", slug: "horror", emoji: "👻" },
  { name: "Mystery", slug: "mystery", emoji: "🕵️" },
  { name: "Slice of Life", slug: "slice-of-life", emoji: "☕" },
  { name: "Sports", slug: "sports", emoji: "⚽" },
  { name: "Supernatural", slug: "supernatural", emoji: "🔮" },
];

const FORMAT_OPTIONS = [
  { label: "All Formats", value: "all" },
  { label: "TV Series", value: "tv" },
  { label: "Anime Movie", value: "movie" },
  { label: "OVA Series", value: "ova" },
  { label: "ONA Web Anime", value: "ona" },
  { label: "Special / OVA", value: "special" },
];

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "all" },
  { label: "Currently Airing", value: "current" },
  { label: "Finished Airing", value: "finished" },
  { label: "Upcoming Soon", value: "upcoming" },
];

const SCORE_OPTIONS = [
  { label: "All Ratings", value: "all" },
  { label: "★ 9.0+ Masterpiece", value: "9" },
  { label: "★ 8.0+ Great", value: "8" },
  { label: "★ 7.0+ Good", value: "7" },
  { label: "★ 6.0+ Decent", value: "6" },
];

const SORT_OPTIONS = [
  { label: "Most Popular", value: "popularity" },
  { label: "Highest Rated", value: "score" },
  { label: "Title (A–Z)", value: "title" },
  { label: "Release Date", value: "date" },
];

export default function DiscoverFiltersBar({
  currentSearch = "",
  currentGenre = "all",
  currentFormat = "all",
  currentStatus = "all",
  currentScore = "all",
  currentSort = "popularity",
}: DiscoverFiltersBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState(currentSearch);
  const [showAllGenres, setShowAllGenres] = useState(false);

  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  const updateFilters = useCallback(
    (newParams: Record<string, string | undefined>) => {
      const sp = new URLSearchParams(searchParams.toString());
      // Reset to page 1 on filter alteration
      sp.delete("page");

      Object.entries(newParams).forEach(([key, val]) => {
        if (!val || val === "all" || (key === "sort" && val === "popularity")) {
          sp.delete(key);
        } else {
          sp.set(key, val);
        }
      });

      const queryString = sp.toString();
      const targetUrl = queryString ? `/discover?${queryString}` : "/discover";

      startTransition(() => {
        router.push(targetUrl, { scroll: false });
      });
    },
    [router, searchParams]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchInput.trim() || undefined });
  };

  const handleClearSearch = () => {
    setSearchInput("");
    updateFilters({ q: undefined });
  };

  const hasActiveFilters = Boolean(
    (currentGenre && currentGenre !== "all") ||
    (currentFormat && currentFormat !== "all") ||
    (currentStatus && currentStatus !== "all") ||
    (currentScore && currentScore !== "all") ||
    (currentSort && currentSort !== "popularity") ||
    currentSearch
  );

  return (
    <div className={styles.container}>
      {/* 1. INTERACTIVE CATEGORIZED GENRE EXPLORER */}
      <div className={styles.genreSection}>
        <div className={styles.genreHeader}>
          <div className={styles.genreTitleWrap}>
            <Sparkles size={16} className={styles.sparkleIcon} />
            <h2 className={styles.genreHeading}>Explore By Genre</h2>
            <span className={styles.genreCountBadge}>{CANONICAL_GENRES.length} Genres</span>
          </div>

          <div className={styles.genreActions}>
            {currentGenre !== "all" && (
              <button
                type="button"
                onClick={() => updateFilters({ genre: "all" })}
                className={styles.clearGenreBtn}
              >
                Reset Genre ({currentGenre.toUpperCase()}) <X size={12} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowAllGenres((prev) => !prev)}
              className={styles.toggleExpandBtn}
            >
              <SlidersHorizontal size={13} />
              {showAllGenres ? "Show Less" : "All Genres (27)"}
            </button>
          </div>
        </div>

        {/* Featured Genres Row */}
        <div className={styles.genreChipsRow}>
          {TOP_CURATED_GENRES.map((g) => {
            const isActive = currentGenre.toLowerCase() === g.slug.toLowerCase();
            return (
              <button
                key={g.slug}
                type="button"
                onClick={() => updateFilters({ genre: g.slug })}
                className={`${styles.genreChip} ${isActive ? styles.genreChipActive : ""}`}
              >
                <span className={styles.genreChipEmoji}>{g.emoji}</span>
                <span>{g.name}</span>
              </button>
            );
          })}
        </div>

        {/* Expandable Extended Genres Drawer */}
        {showAllGenres && (
          <div 
            className={styles.genreChipsRow}
            style={{ 
              paddingTop: "12px", 
              borderTop: "1px dashed rgba(255, 255, 255, 0.1)",
              animation: "fadeIn 0.25s ease" 
            }}
          >
            {CANONICAL_GENRES.filter(
              (cg) => !TOP_CURATED_GENRES.some((tg) => tg.slug.toLowerCase() === cg.slug.toLowerCase())
            ).map((cg) => {
              const isActive = currentGenre.toLowerCase() === cg.slug.toLowerCase();
              return (
                <button
                  key={cg.slug}
                  type="button"
                  onClick={() => updateFilters({ genre: cg.slug })}
                  className={`${styles.genreChip} ${isActive ? styles.genreChipActive : ""}`}
                >
                  <span>{cg.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. REFINED GLASSMORPHI PICKLISTS & SEARCH BAR */}
      <div className={styles.filterControlsSection}>
        <div className={styles.filterControlsGrid}>
          {/* Live Search Input */}
          <div className={styles.formGroup}>
            <label className={styles.groupLabel}>
              <Search size={12} /> Search Title
            </label>
            <form onSubmit={handleSearchSubmit} className={styles.searchBoxWrap}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Type anime title (e.g. Solo Leveling)..."
                className={styles.searchInput}
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className={styles.clearSearchBtn}
                  aria-label="Clear Search"
                >
                  <X size={14} />
                </button>
              )}
            </form>
          </div>

          {/* Format Picklist */}
          <div className={styles.formGroup}>
            <label className={styles.groupLabel}>
              <Layers size={12} /> Format
            </label>
            <div className={styles.selectWrapper}>
              <Layers size={15} className={styles.selectIcon} />
              <select
                value={currentFormat.toLowerCase()}
                onChange={(e) => updateFilters({ format: e.target.value })}
                className={styles.customSelect}
              >
                {FORMAT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className={styles.chevronIcon} />
            </div>
          </div>

          {/* Status Picklist */}
          <div className={styles.formGroup}>
            <label className={styles.groupLabel}>
              <Radio size={12} /> Status
            </label>
            <div className={styles.selectWrapper}>
              <Radio size={15} className={styles.selectIcon} />
              <select
                value={currentStatus.toLowerCase()}
                onChange={(e) => updateFilters({ status: e.target.value })}
                className={styles.customSelect}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className={styles.chevronIcon} />
            </div>
          </div>

          {/* Score Picklist */}
          <div className={styles.formGroup}>
            <label className={styles.groupLabel}>
              <Star size={12} /> Min Score
            </label>
            <div className={styles.selectWrapper}>
              <Star size={15} className={styles.selectIcon} />
              <select
                value={currentScore}
                onChange={(e) => updateFilters({ score: e.target.value })}
                className={styles.customSelect}
              >
                {SCORE_OPTIONS.map((sc) => (
                  <option key={sc.value} value={sc.value}>
                    {sc.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className={styles.chevronIcon} />
            </div>
          </div>

          {/* Sort By Picklist */}
          <div className={styles.formGroup}>
            <label className={styles.groupLabel}>
              <ArrowUpDown size={12} /> Sort By
            </label>
            <div className={styles.selectWrapper}>
              <ArrowUpDown size={15} className={styles.selectIcon} />
              <select
                value={currentSort}
                onChange={(e) => updateFilters({ sort: e.target.value })}
                className={styles.customSelect}
              >
                {SORT_OPTIONS.map((so) => (
                  <option key={so.value} value={so.value}>
                    {so.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className={styles.chevronIcon} />
            </div>
          </div>
        </div>

        {/* Active Filters Summary Pills */}
        {hasActiveFilters && (
          <div className={styles.activeFiltersBar}>
            <div className={styles.activeTagsList}>
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 600 }}>
                Active Filters:
              </span>
              {currentSearch && (
                <span className={styles.activeFilterBadge}>
                  Title: "{currentSearch}"
                  <button type="button" onClick={handleClearSearch} className={styles.removeBadgeBtn}>
                    <X size={11} />
                  </button>
                </span>
              )}
              {currentGenre !== "all" && (
                <span className={styles.activeFilterBadge}>
                  Genre: {currentGenre.toUpperCase()}
                  <button type="button" onClick={() => updateFilters({ genre: "all" })} className={styles.removeBadgeBtn}>
                    <X size={11} />
                  </button>
                </span>
              )}
              {currentFormat !== "all" && (
                <span className={styles.activeFilterBadge}>
                  Format: {currentFormat.toUpperCase()}
                  <button type="button" onClick={() => updateFilters({ format: "all" })} className={styles.removeBadgeBtn}>
                    <X size={11} />
                  </button>
                </span>
              )}
              {currentStatus !== "all" && (
                <span className={styles.activeFilterBadge}>
                  Status: {currentStatus}
                  <button type="button" onClick={() => updateFilters({ status: "all" })} className={styles.removeBadgeBtn}>
                    <X size={11} />
                  </button>
                </span>
              )}
              {currentScore !== "all" && (
                <span className={styles.activeFilterBadge}>
                  Score: {currentScore}+
                  <button type="button" onClick={() => updateFilters({ score: "all" })} className={styles.removeBadgeBtn}>
                    <X size={11} />
                  </button>
                </span>
              )}
              {currentSort !== "popularity" && (
                <span className={styles.activeFilterBadge}>
                  Sort: {currentSort}
                  <button type="button" onClick={() => updateFilters({ sort: "popularity" })} className={styles.removeBadgeBtn}>
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => router.push("/discover", { scroll: false })}
              className={styles.resetAllBtn}
            >
              <RefreshCw size={12} /> Reset All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
