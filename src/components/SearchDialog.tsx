"use client";

import { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, X, Loader2, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./SearchDialog.module.css";
import { searchAnimeAction } from "@/app/actions";
import { Anime } from "@/lib/api/types";

export default function SearchDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setLoading(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    const handleOpenSearch = () => setIsOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-search", handleOpenSearch);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-search", handleOpenSearch);
    };
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    let ignore = false;
    
    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setLoading(true);
        try {
          const data = await searchAnimeAction(query);
          if (!ignore) {
            setResults(data || []);
          }
        } catch {
          if (!ignore) {
            setResults([]);
          }
        } finally {
          if (!ignore) {
            setLoading(false);
          }
        }
      } else {
        setResults([]);
      }
    }, 500);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <SearchIcon size={20} className={styles.searchIcon} />
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder="Search anime..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className={styles.closeBtn} onClick={handleClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.results}>
          {query.length < 2 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyPrompt}>Type to search, or explore popular topics:</p>
              <div className={styles.suggestionTags}>
                {["Attack on Titan", "Naruto", "One Piece", "Bleach", "Demon Slayer", "Solo Leveling"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={styles.suggestionBtn}
                    onClick={() => setQuery(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className={styles.quickGenres}>
                <span className={styles.genreHeading}>Popular Genres</span>
                <div className={styles.genreTags}>
                  {["Action", "Fantasy", "Sci-Fi", "Adventure", "Romance", "Comedy"].map((g) => (
                    <Link
                      key={g}
                      href={`/discover?genre=${g.toLowerCase()}`}
                      className={styles.genrePill}
                      onClick={handleClose}
                    >
                      {g}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className={styles.loadingState}>
              <Loader2 className={styles.spinner} />
              <p>Searching titles...</p>
            </div>
          ) : results.length > 0 ? (
            <div className={styles.resultsList}>
              {results.map((anime) => {
                const score = anime.score
                  ? (anime.score > 10 ? (anime.score / 10).toFixed(1) : anime.score.toFixed(1))
                  : null;

                return (
                  <div key={anime.id} className={styles.resultItemWrapper}>
                    <Link
                      href={`/anime/${anime.id}`}
                      className={styles.resultItem}
                      onClick={handleClose}
                    >
                      <img src={anime.images.cover || "/placeholder-cover.svg"} alt="cover" className={styles.resultImage} />
                      <div className={styles.resultInfo}>
                        <h4>{anime.title.english || anime.title.romaji}</h4>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)" }}>
                          <span>{anime.format || "TV"}</span>
                          {anime.year && <span>• {anime.year}</span>}
                          {score && (
                            <span style={{ color: "#facc15", fontWeight: 700 }}>
                              ★ {score}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                    <Link
                      href={`/watch/${anime.id}/1`}
                      className={styles.quickWatchBtn}
                      onClick={handleClose}
                      title="Watch Episode 1"
                    >
                      <Play size={13} fill="currentColor" />
                      <span>Watch</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>No anime found for &quot;{query}&quot;</p>
            </div>
          )}
        </div>
        
        <div className={styles.footer}>
          <span><kbd>Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
