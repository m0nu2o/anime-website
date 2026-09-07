import React from "react";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import AnimeCard from "@/components/AnimeCard";
import { discoverAnime } from "@/lib/api";
import { Compass, Filter, Sparkles, RefreshCw } from "lucide-react";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata = {
  title: "Discover Anime | NextGen Anime",
  description: "Filter and browse thousands of anime titles by genre, format, release year, and popularity.",
};

const GENRES = ["All", "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Mystery", "Romance", "Sci-Fi", "Super Power", "Thriller"];
const FORMATS = ["All", "TV", "Movie", "OVA", "ONA", "Special"];
const STATUSES = ["All", "current", "finished", "upcoming"];
const SORTS = [
  { label: "Most Popular", value: "popularity" },
  { label: "Highest Rated", value: "score" },
  { label: "Title (A-Z)", value: "title" },
  { label: "Release Date", value: "date" },
];

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    genre?: string;
    format?: string;
    status?: string;
    sort?: string;
    year?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const currentSearch = params.q || "";
  const currentGenre = params.genre || "all";
  const currentFormat = params.format || "all";
  const currentStatus = params.status || "all";
  const currentSort = params.sort || "popularity";
  const currentYear = params.year ? parseInt(params.year, 10) : undefined;
  const currentPage = params.page ? parseInt(params.page, 10) : 1;

  const limit = 20;
  const offset = (currentPage - 1) * limit;

  const animeList = await discoverAnime({
    search: currentSearch,
    genre: currentGenre !== "all" ? currentGenre : undefined,
    format: currentFormat !== "all" ? currentFormat : undefined,
    status: currentStatus !== "all" ? currentStatus : undefined,
    sort: currentSort,
    year: currentYear,
    limit,
    offset,
  });

  return (
    <>
      <Navbar />
      <div className={`container ${styles.discoverPage}`}>
        <BackButton label="Back to Home" fallbackUrl="/" />
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerText}>
            <span className={styles.badge}><Compass size={14} /> Catalog Discovery</span>
            <h1 className={styles.title}>Discover &amp; Explore Anime</h1>
            <p className={styles.subtitle}>Filter real-time titles across genre, format, broadcast status, and ranking.</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className={styles.filterSection}>
          <form method="GET" action="/discover" className={styles.filterForm}>
            {/* Search */}
            <div className={styles.searchBox}>
              <input
                type="text"
                name="q"
                defaultValue={currentSearch}
                placeholder="Filter by title..."
                className={styles.filterInput}
              />
            </div>

            {/* Genre */}
            <select name="genre" defaultValue={currentGenre} className={styles.filterSelect}>
              {GENRES.map((g) => (
                <option key={g} value={g.toLowerCase()}>Genre: {g}</option>
              ))}
            </select>

            {/* Format */}
            <select name="format" defaultValue={currentFormat} className={styles.filterSelect}>
              {FORMATS.map((f) => (
                <option key={f} value={f.toLowerCase()}>Format: {f}</option>
              ))}
            </select>

            {/* Status */}
            <select name="status" defaultValue={currentStatus} className={styles.filterSelect}>
              {STATUSES.map((s) => (
                <option key={s} value={s.toLowerCase()}>Status: {s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>

            {/* Sort */}
            <select name="sort" defaultValue={currentSort} className={styles.filterSelect}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>Sort: {s.label}</option>
              ))}
            </select>

            <button type="submit" className={styles.applyBtn}>
              <Filter size={16} /> Apply Filters
            </button>
          </form>
        </div>

        {/* Results Metadata */}
        <div className={styles.resultsMetaRow}>
          <span className={styles.resultCount}>Showing {animeList.length} titles</span>
          {(currentGenre !== "all" || currentFormat !== "all" || currentStatus !== "all" || currentSearch) && (
            <Link href="/discover" className={styles.resetFiltersBtn}>
              <RefreshCw size={14} /> Reset Filters
            </Link>
          )}
        </div>

        {/* Anime Grid */}
        {animeList.length > 0 ? (
          <div className={styles.animeGrid}>
            {animeList.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyResults}>
            <h3>No Titles Matched Your Query</h3>
            <p>Try broadening your filters or resetting search keywords.</p>
            <Link href="/discover" className={styles.browseAllBtn}>Browse All Titles</Link>
          </div>
        )}

        {/* Pagination */}
        <div className={styles.paginationRow}>
          {currentPage > 1 && (
            <Link
              href={`/discover?page=${currentPage - 1}&genre=${currentGenre}&format=${currentFormat}&status=${currentStatus}&sort=${currentSort}&q=${currentSearch}`}
              className={styles.pageBtn}
            >
              ? Previous Page
            </Link>
          )}
          <span className={styles.pageNumber}>Page {currentPage}</span>
          {animeList.length >= limit && (
            <Link
              href={`/discover?page=${currentPage + 1}&genre=${currentGenre}&format=${currentFormat}&status=${currentStatus}&sort=${currentSort}&q=${currentSearch}`}
              className={styles.pageBtn}
            >
              Next Page ?
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
