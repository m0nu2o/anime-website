"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Anime } from "@/lib/api/types";
import AnimeCard from "@/components/AnimeCard";
import { LatestEpisodeRelease } from "@/lib/api";
import styles from "./HomeExploreSections.module.css";
import { 
  Play, 
  Flame, 
  Star, 
  Clock, 
  Layers, 
  ArrowRight, 
  Headphones,
  Subtitles,
  Loader2,
  ChevronDown
} from "lucide-react";

interface LeaderboardItem {
  id: string;
  rank: number;
  title: string;
  image: string;
  format: string;
  score: string | null;
  episodes?: number;
  genres?: string[];
}

interface HomeExploreSectionsProps {
  trendingAnime: Anime[];
  popularAnime: Anime[];
  seasonalAnime: Anime[];
  latestReleases: LatestEpisodeRelease[];
}

function normalizeGenreAnime(item: Record<string, unknown>): Anime {
  const id = String(item.id || "");
  const provider = id.startsWith("anilist-") ? "anilist" : id.startsWith("mal-") ? "mal" : "kitsu";
  const numericScore = typeof item.score === "number"
    ? item.score
    : (typeof item.score === "string" ? Number.parseFloat(item.score) : Number.NaN);
  const image = typeof item.image === "string" ? item.image : "/placeholder-cover.svg";
  const titleStr = typeof item.title === "string" ? item.title : "Anime";

  return {
    id,
    provider,
    title: {
      english: titleStr,
      romaji: titleStr,
    },
    images: {
      cover: image,
      largeCover: image,
    },
    format: typeof item.format === "string" ? item.format : "TV",
    status: typeof item.status === "string" ? item.status.toUpperCase() : undefined,
    score: Number.isFinite(numericScore) ? numericScore : undefined,
    episodes: typeof item.episodes === "number" ? item.episodes : undefined,
    year: typeof item.year === "number" ? item.year : undefined,
    genres: Array.isArray(item.genres) ? (item.genres as string[]) : [],
  };
}

export default function HomeExploreSections({
  trendingAnime,
  popularAnime,
  seasonalAnime,
  latestReleases,
}: HomeExploreSectionsProps) {
  // 0. Latest Releases Audio Filter State (All, Sub, Dub)
  const [releaseAudioFilter, setReleaseAudioFilter] = useState<"all" | "sub" | "dub">("all");
  const filteredReleases = useMemo(() => {
    if (!latestReleases || latestReleases.length === 0) return [];
    if (releaseAudioFilter === "sub") {
      return latestReleases.filter((item) => item.hasSub !== false);
    }
    if (releaseAudioFilter === "dub") {
      return latestReleases.filter((item) => item.hasDub === true);
    }
    return latestReleases;
  }, [latestReleases, releaseAudioFilter]);

  // 1. Top 10 Period Tab & State
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"trending" | "airing" | "popular">("trending");
  const [leaderboardList, setLeaderboardList] = useState<LeaderboardItem[]>(() => {
    return trendingAnime.slice(0, 10).map((anime, idx) => ({
      id: anime.id,
      rank: idx + 1,
      title: anime.title.english || anime.title.romaji || anime.title.native || "Anime",
      image: anime.images.cover || anime.images.largeCover || "/placeholder-cover.svg",
      format: anime.format || "TV",
      score: anime.score ? (anime.score > 10 ? (anime.score / 10).toFixed(1) : anime.score.toFixed(1)) : null,
      episodes: anime.episodes,
      genres: anime.genres || [],
    }));
  });
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState<boolean>(false);
  const [leaderboardCache, setLeaderboardCache] = useState<Record<string, LeaderboardItem[]>>({});

  // 2. Real Dynamic Genres State
  const [allGenres, setAllGenres] = useState<{ id: number; name: string }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>("Action");
  const [genreAnimeList, setGenreAnimeList] = useState<Anime[]>([]);
  const [isGenreLoading, setIsGenreLoading] = useState<boolean>(false);
  const [genrePage, setGenrePage] = useState<number>(1);
  const [hasMoreGenre, setHasMoreGenre] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // Fetch full dynamic genre catalog on mount
  useEffect(() => {
    fetch("/api/anime/genres-list")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.genres) && data.genres.length > 0) {
          setAllGenres(data.genres);
        }
      })
      .catch((err) => {
        console.warn("Failed to load genre catalog:", err);
      });
  }, []);

  // Fetch Top 10 Leaderboard on period change
  useEffect(() => {
    if (leaderboardCache[leaderboardPeriod]) {
      setLeaderboardList(leaderboardCache[leaderboardPeriod]);
      return;
    }

    let isMounted = true;
    setIsLeaderboardLoading(true);

    fetch(`/api/anime/top10?period=${leaderboardPeriod}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setLeaderboardList(data.data);
          setLeaderboardCache((prev) => ({ ...prev, [leaderboardPeriod]: data.data }));
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch top10:", err);
      })
      .finally(() => {
        if (isMounted) setIsLeaderboardLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [leaderboardPeriod, leaderboardCache]);

  // Fetch Genre Anime (Page 1)
  const fetchGenreData = useCallback((genreParam: string, pageNum: number = 1) => {
    const isFirst = pageNum === 1;
    if (isFirst) {
      setIsGenreLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    const query = encodeURIComponent(genreParam.trim());
    fetch(`/api/anime/genre?genre=${query}&page=${pageNum}&limit=12`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          const normalizedItems: Anime[] = data.data.map((item: Record<string, any>) => normalizeGenreAnime(item));
          if (isFirst) {
            setGenreAnimeList(normalizedItems);
          } else {
            setGenreAnimeList((prev) => {
              const seen = new Set(prev.map((anime) => anime.id));
              const newItems = normalizedItems.filter((anime) => !seen.has(anime.id));
              return [...prev, ...newItems];
            });
          }
          setHasMoreGenre(Boolean(data.hasMore));
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch genre anime:", err);
      })
      .finally(() => {
        setIsGenreLoading(false);
        setIsLoadingMore(false);
      });
  }, []);

  // On genre switch
  useEffect(() => {
    setGenrePage(1);
    fetchGenreData(selectedGenre, 1);
  }, [selectedGenre, fetchGenreData]);

  // Load more genre anime
  const handleLoadMoreGenre = () => {
    if (isLoadingMore || !hasMoreGenre) return;
    const nextPage = genrePage + 1;
    setGenrePage(nextPage);
    fetchGenreData(selectedGenre, nextPage);
  };

  return (
    <div className={styles.exploreWrapper}>
      {/* ============================================================
          SECTION 1: LATEST RELEASES / FRESH DROPS (100% REAL BROADCASTS)
          ============================================================ */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.sectionBadge}>
              <span className={styles.livePulse} />
              REAL-TIME SIMULCAST
            </span>
            <h2 className={styles.sectionTitle}>
              <Clock size={20} className={styles.titleIcon} />
              Latest Released Episodes
            </h2>
          </div>
          <div className={styles.headerRightGroup}>
            <div className={styles.audioFilterPills}>
              <button
                type="button"
                className={`${styles.audioPill} ${releaseAudioFilter === "all" ? styles.audioPillActive : ""}`}
                onClick={() => setReleaseAudioFilter("all")}
              >
                All Releases
              </button>
              <button
                type="button"
                className={`${styles.audioPill} ${releaseAudioFilter === "sub" ? styles.audioPillActive : ""}`}
                onClick={() => setReleaseAudioFilter("sub")}
              >
                <Subtitles size={12} />
                Subbed
              </button>
              <button
                type="button"
                className={`${styles.audioPill} ${releaseAudioFilter === "dub" ? styles.audioPillActive : ""}`}
                onClick={() => setReleaseAudioFilter("dub")}
              >
                <Headphones size={12} />
                English Dub
              </button>
            </div>
            <Link href="/calendar" className={styles.headerAction}>
              <span>Broadcast Schedule</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {filteredReleases && filteredReleases.length > 0 ? (
          <div className={styles.episodesGrid}>
            {filteredReleases.map((item) => (
              <Link 
                key={item.id} 
                href={releaseAudioFilter === "dub" ? `/watch/${item.animeId}/${item.episode}?dub=true` : `/watch/${item.animeId}/${item.episode}`} 
                className={styles.episodeCard}
                title={`Watch ${item.title} Episode ${item.episode}${releaseAudioFilter === "dub" ? " (English Dub)" : ""}`}
              >
                <div className={styles.cardImageContainer}>
                  <img src={item.image} alt={item.title} className={styles.cardImage} loading="lazy" />
                  <div className={styles.cardOverlay}>
                    <div className={styles.playBadge}>
                      <Play size={16} fill="white" />
                    </div>
                  </div>
                  <div className={styles.episodeTag}>
                    <span>EP {item.episode ?? "—"}</span>
                  </div>
                  <div className={styles.audioBadges}>
                    {item.hasSub === true && <span className={styles.subTag}><Subtitles size={10} /> SUB</span>}
                    {item.hasDub === true && <span className={styles.dubTag}><Headphones size={10} /> DUB</span>}
                  </div>
                </div>

                <div className={styles.cardDetails}>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                  <div className={styles.cardMeta}>
                    <span className={styles.timeAgo}>{item.timeAgo}</span>
                    <span className={styles.dot}>•</span>
                    <span className={styles.format}>{item.format || "TV"}</span>
                    {item.score && (
                      <>
                        <span className={styles.dot}>•</span>
                        <span className={styles.scoreText}>★ {(item.score / 10).toFixed(1)}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.emptyEpisodes}>
            <span>
              {releaseAudioFilter === "dub"
                ? "No newly aired episodes with English Dub found in this broadcast window. Switch back to All Releases to view all simulcasts."
                : "No newly aired episodes are indexed right now."}
            </span>
            {releaseAudioFilter === "dub" && (
              <button
                type="button"
                className={styles.headerAction}
                style={{ marginTop: 12, cursor: "pointer", background: "rgba(255, 255, 255, 0.1)" }}
                onClick={() => setReleaseAudioFilter("all")}
              >
                View All Releases
              </button>
            )}
          </div>
        )}
      </section>

      {/* ============================================================
          SECTION 2: TOP 10 RANKED LEADERBOARD WITH TIMEFRAME TABS
          ============================================================ */}
      <section className={styles.section}>
        <div className={styles.leaderboardSectionHeader}>
          <div>
            <span className={styles.sectionBadge}>
              <Flame size={12} style={{ color: "#ef4444" }} />
              COMMUNITY CHARTS
            </span>
            <h2 className={styles.sectionTitle}>
              <Flame size={20} className={styles.titleIcon} />
              Top 10 Leaderboard
            </h2>
          </div>

          <div className={styles.periodTabs}>
            <button
              type="button"
              className={`${styles.tabBtn} ${leaderboardPeriod === "trending" ? styles.tabActive : ""}`}
              onClick={() => setLeaderboardPeriod("trending")}
            >
              Top Trending
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${leaderboardPeriod === "airing" ? styles.tabActive : ""}`}
              onClick={() => setLeaderboardPeriod("airing")}
            >
              Top Airing
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${leaderboardPeriod === "popular" ? styles.tabActive : ""}`}
              onClick={() => setLeaderboardPeriod("popular")}
            >
              All-Time Popular
            </button>
          </div>
        </div>

        {isLeaderboardLoading ? (
          <div className={styles.leaderboardGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <div key={n} className={styles.skeletonRow} />
            ))}
          </div>
        ) : (
          <div className={styles.leaderboardGrid}>
            {leaderboardList.map((anime) => {
              const rank = anime.rank;
              return (
                <Link
                  key={anime.id}
                  href={`/anime/${anime.id}`}
                  className={`${styles.leaderboardCard} ${rank <= 3 ? styles[`rankHighlight${rank}`] : ""}`}
                >
                  <div className={styles.rankCol}>
                    <span className={`${styles.rankNumber} ${rank <= 3 ? styles[`rankBadge${rank}`] : ""}`}>
                      {rank < 10 ? `0${rank}` : rank}
                    </span>
                  </div>

                  <div className={styles.thumbWrapper}>
                    <img src={anime.image} alt={anime.title} className={styles.leaderboardThumb} loading="lazy" />
                  </div>

                  <div className={styles.leaderboardInfo}>
                    <h4 className={styles.leaderboardTitleText}>{anime.title}</h4>
                    <div className={styles.leaderboardMeta}>
                      <span className={styles.formatPill}>{anime.format || "TV"}</span>
                      {anime.score && (
                        <span className={styles.scorePill}>
                          <Star size={11} fill="#eab308" color="#eab308" />
                          {anime.score}
                        </span>
                      )}
                      {anime.episodes && (
                        <span className={styles.epCount}>{anime.episodes} eps</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.actionCol}>
                    <span className={styles.watchPill}>
                      <Play size={12} fill="currentColor" />
                      <span>Watch</span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ============================================================
          SECTION 3: REAL API-LINKED GENRE EXPLORER (EXPANDED CATALOG)
          ============================================================ */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.sectionBadge}>
              <Layers size={12} style={{ color: "var(--primary)" }} />
              GENRE DISCOVERY
            </span>
            <h2 className={styles.sectionTitle}>
              <Layers size={20} className={styles.titleIcon} />
              Quick Genre Explorer
            </h2>
          </div>
          <Link
            href={`/discover?genre=${encodeURIComponent(selectedGenre.toLowerCase())}`}
            className={styles.headerAction}
          >
            <span>Explore All {selectedGenre} Anime</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Dynamic Genre Filter Chips */}
        <div className={styles.genreChips}>
          {allGenres.map((g) => (
            <button
              key={g.id || g.name}
              type="button"
              className={`${styles.genreChip} ${selectedGenre.toLowerCase() === g.name.toLowerCase() ? styles.genreChipActive : ""}`}
              onClick={() => {
                setSelectedGenre(g.name);
              }}
            >
              {g.name}
            </button>
          ))}
        </div>

        {/* Real API Genre Results with Loading State */}
        {isGenreLoading ? (
          <div className={styles.genreLoadingState}>
            <Loader2 size={24} className={styles.spinner} />
            <span>Loading {selectedGenre} titles...</span>
          </div>
        ) : (
          <>
            <div className={styles.genreResultsGrid}>
              {genreAnimeList.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>

            {hasMoreGenre && (
              <div className={styles.loadMoreWrap}>
                <button
                  type="button"
                  className={styles.loadMoreBtn}
                  onClick={handleLoadMoreGenre}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 size={16} className={styles.spinner} />
                      Loading more...
                    </>
                  ) : (
                    <>
                      <ChevronDown size={16} />
                      Load More {selectedGenre} Titles
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
