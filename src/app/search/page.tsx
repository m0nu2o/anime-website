"use client";

import React, { useState, useEffect, useCallback, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import AnimeCard from "@/components/AnimeCard";
import { Anime } from "@/lib/api/types";
import { searchAnimeAction } from "@/app/actions";
import { Search as SearchIcon, X, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import styles from "./page.module.css";

const POPULAR_SUGGESTIONS = [
  "Attack on Titan",
  "Demon Slayer",
  "Jujutsu Kaisen",
  "One Piece",
  "Solo Leveling",
  "Frieren",
  "Naruto",
  "Bleach",
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(Boolean(initialQuery));
  const [searchError, setSearchError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const latestQueryRef = React.useRef("");

  const performSearch = useCallback(async (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setHasSearched(false);
      setSearchError(null);
      return;
    }

    latestQueryRef.current = trimmed;
    setLoading(true);
    setHasSearched(true);
    setSearchError(null);

    try {
      const data = await searchAnimeAction(trimmed);
      if (latestQueryRef.current === trimmed) {
        setResults(data || []);
      }
    } catch {
      if (latestQueryRef.current === trimmed) {
        setResults([]);
        setSearchError("Search service is temporarily unavailable. Please try again later.");
      }
    } finally {
      if (latestQueryRef.current === trimmed) {
        setLoading(false);
      }
    }
  }, []);

  // Sync initial query from URL
  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery, performSearch]);

  // Debounced search on user input
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      // Update URL query param cleanly without full reload
      startTransition(() => {
        router.replace(`/search?q=${encodeURIComponent(trimmed)}`, { scroll: false });
      });
      performSearch(trimmed);
    }, 400);

    return () => clearTimeout(timer);
  }, [query, router, performSearch]);

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setSearchError(null);
    router.replace("/search", { scroll: false });
  };

  const handleTagClick = (tag: string) => {
    setQuery(tag);
    startTransition(() => {
      router.replace(`/search?q=${encodeURIComponent(tag)}`, { scroll: false });
    });
    performSearch(tag);
  };

  return (
    <div className={`container ${styles.searchPage}`}>
      <BackButton label="Back to Home" fallbackUrl="/" />

      <div className={styles.header}>
        <span className={styles.badge}>
          <Sparkles size={14} /> Catalog Search
        </span>
        <h1 className={styles.title}>Search Anime</h1>
        <p className={styles.subtitle}>
          Discover your next favorite anime across tens of thousands of verified titles with instant search.
        </p>

        {/* Search Bar */}
        <div className={styles.searchBarWrapper}>
          <div className={styles.searchInputGroup}>
            <SearchIcon size={20} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by English, Romaji, or Japanese title..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {loading && <Loader2 size={18} className="animate-spin" style={{ color: "var(--accent)", marginRight: "8px" }} />}
            {query && !loading && (
              <button
                onClick={handleClear}
                className={styles.clearBtn}
                title="Clear search"
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Quick Suggestions */}
          <div className={styles.popularTags}>
            <span className={styles.popularLabel}>Popular:</span>
            {POPULAR_SUGGESTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagClick(tag)}
                className={styles.tagPill}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Status */}
      {hasSearched && !loading && (
        <div className={styles.statusBar}>
          <span className={styles.resultCount}>
            Found <strong>{results.length}</strong> {results.length === 1 ? "result" : "results"} for &ldquo;{query}&rdquo;
          </span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      )}

      {/* Results Grid */}
      {!loading && results.length > 0 && (
        <div className={styles.resultsGrid}>
          {results.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      )}

      {/* Error State when search service fails */}
      {!loading && hasSearched && searchError && (
        <div className={styles.emptyState}>
          <AlertCircle size={36} className={styles.emptyIcon} style={{ color: "#ef4444" }} />
          <h2 className={styles.emptyTitle}>Search Unavailable</h2>
          <p className={styles.emptyDesc}>
            {searchError}
          </p>
        </div>
      )}

      {/* Empty State when searched but nothing found */}
      {!loading && hasSearched && !searchError && results.length === 0 && query.trim().length >= 2 && (
        <div className={styles.emptyState}>
          <AlertCircle size={36} className={styles.emptyIcon} />
          <h2 className={styles.emptyTitle}>No anime found</h2>
          <p className={styles.emptyDesc}>
            We couldn&apos;t find any matches for &ldquo;{query}&rdquo;. Try checking for typos or searching with alternate romanization.
          </p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div className="container" style={{ marginTop: "120px", color: "var(--text-muted)" }}>Loading search...</div>}>
        <SearchContent />
      </Suspense>
    </>
  );
}
