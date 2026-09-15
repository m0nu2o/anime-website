import React from "react";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import AnimeCard from "@/components/AnimeCard";
import { discoverAnime } from "@/lib/api";
import { GENRE_NAMES } from "@/lib/api/genres";
import { Compass, Filter, Sparkles, RefreshCw } from "lucide-react";
import Link from "next/link";
import DiscoverFiltersBar from "@/components/DiscoverFiltersBar";
import styles from "./page.module.css";

export const metadata = {
  title: "Discover Anime | NextGen Anime",
  description: "Filter and browse thousands of anime titles by genre, format, release year, and popularity.",
};

const GENRES = ["All", ...GENRE_NAMES];
const FORMATS = ["All", "TV", "Movie", "OVA", "ONA", "Special"];
const STATUSES = ["All", "current", "finished", "upcoming"];
const SCORES = [
  { label: "All Scores", value: "all" },
  { label: "9+ Masterpiece", value: "9" },
  { label: "8+ Great", value: "8" },
  { label: "7+ Good", value: "7" },
  { label: "6+ Decent", value: "6" },
];
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
    score?: string;
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
  const currentScore = params.score || "all";
  const currentSort = params.sort || "popularity";
  const currentYear = params.year ? parseInt(params.year, 10) : undefined;
  const parsedPage = parseInt(params.page || "1", 10);
  const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const limit = 20;
  const offset = (currentPage - 1) * limit;

  const discoverResult = await discoverAnime({
    search: currentSearch,
    genre: currentGenre !== "all" ? currentGenre : undefined,
    format: currentFormat !== "all" ? currentFormat : undefined,
    status: currentStatus !== "all" ? currentStatus : undefined,
    sort: currentSort,
    year: currentYear,
    limit,
    offset,
  });
  let animeList = discoverResult.anime;
  const hasMore = discoverResult.hasMore;


  if (currentScore !== "all") {
    const minScore = parseFloat(currentScore) * 10;
    animeList = animeList.filter((a) => (a.score || 0) >= minScore);
  }

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

        {/* Modern Interactive Discover Filters Bar */}
        <DiscoverFiltersBar
          currentSearch={currentSearch}
          currentGenre={currentGenre}
          currentFormat={currentFormat}
          currentStatus={currentStatus}
          currentScore={currentScore}
          currentSort={currentSort}
          currentYear={currentYear}
        />

        {/* Results Metadata */}
        <div className={styles.resultsMetaRow}>
          <span className={styles.resultCount}>Showing {animeList.length} titles (Page {currentPage})</span>
          {(currentGenre !== "all" || currentFormat !== "all" || currentStatus !== "all" || currentScore !== "all" || currentSearch) && (
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
              href={`/discover?page=${currentPage - 1}&genre=${currentGenre}&format=${currentFormat}&status=${currentStatus}&score=${currentScore}&sort=${currentSort}&q=${currentSearch}`}
              className={styles.pageBtn}
            >
              ← Previous Page
            </Link>
          )}
          <span className={styles.pageNumber}>Page {currentPage}</span>
          {hasMore && (
            <Link
              href={`/discover?page=${currentPage + 1}&genre=${encodeURIComponent(currentGenre)}&format=${encodeURIComponent(currentFormat)}&status=${encodeURIComponent(currentStatus)}&score=${encodeURIComponent(currentScore)}&sort=${encodeURIComponent(currentSort)}&q=${encodeURIComponent(currentSearch)}${currentYear ? `&year=${currentYear}` : ""}`}
              className={styles.pageBtn}
            >
              Next Page →
            </Link>
          )}

        </div>
      </div>
    </>
  );
}
