"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Anime } from "@/lib/api/types";
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
  Loader2
} from "lucide-react";

interface GenreAnimeItem {
  id: string;
  title: string;
  image: string;
  format?: string;
  score?: string | null;
  episodes?: number;
  year?: number;
  genres?: string[];
}

interface HomeExploreSectionsProps {
  trendingAnime: Anime[];
  popularAnime: Anime[];
  seasonalAnime: Anime[];
  latestReleases: LatestEpisodeRelease[];
}

const GENRES = [
  "Action",
  "Shounen",
  "Romance",
  "Fantasy",
  "Sci-Fi",
  "Comedy",
  "Supernatural",
  "Adventure"
];

export default function HomeExploreSections({
  trendingAnime,
  popularAnime,
  seasonalAnime,
  latestReleases,
}: HomeExploreSectionsProps) {
  // 1. Top 10 Period Tab
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"today" | "week" | "all">("today");

  // 2. Real API Genre Explorer
  const [selectedGenre, setSelectedGenre] = useState<string>("Action");
  const [genreAnimeList, setGenreAnimeList] = useState<GenreAnimeItem[]>([]);
  const [isGenreLoading, setIsGenreLoading] = useState<boolean>(false);
  const [genreCache, setGenreCache] = useState<Record<string, GenreAnimeItem[]>>({});

  // Leaderboard data calculation
  const leaderboardList = useMemo(() => {
    let source = trendingAnime;
    if (leaderboardPeriod === "week") {
      source = seasonalAnime.length > 0 ? seasonalAnime : trendingAnime;
    } else if (leaderboardPeriod === "all") {
      source = popularAnime.length > 0 ? popularAnime : trendingAnime;
    }
    return source.slice(0, 10);
  }, [leaderboardPeriod, trendingAnime, seasonalAnime, popularAnime]);

  // Fetch real anime from API when genre changes
  useEffect(() => {
    const clean = selectedGenre.toLowerCase();
    if (genreCache[clean]) {
      setGenreAnimeList(genreCache[clean]);
      return;
    }

    let isMounted = true;
    setIsGenreLoading(true);

    fetch(`/api/anime/genre?genre=${encodeURIComponent(clean)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && Array.isArray(data.data)) {
          setGenreAnimeList(data.data);
          setGenreCache((prev) => ({ ...prev, [clean]: data.data }));
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch genre anime:", err);
      })
      .finally(() => {
        if (isMounted) setIsGenreLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedGenre, genreCache]);

  return (
    <div className={styles.exploreWrapper}>
      {/* ============================================================
          SECTION 1: LATEST RELEASES / FRESH DROPS (100% REAL BROADCASTS)
          ============================================================ */}
      {latestReleases.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.headerLeft}>
              <span className={styles.sectionBadge}>
                <span className={styles.livePulse} />
                REAL-TIME SIMULCAST
              </span>
              <h2 className={styles.sectionTitle}>
                <Clock size={20} className={styles.titleIcon} />
                Latest Episodes Released Today
              </h2>
            </div>
            <Link href="/calendar" className={styles.headerAction}>
              <span>Broadcast Schedule</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className={styles.episodesGrid}>
            {latestReleases.map((item) => (
              <Link 
                key={item.id} 
                href={`/watch/${item.animeId}/${item.episode}`} 
                className={styles.episodeCard}
                title={`Watch ${item.title} Episode ${item.episode}`}
              >
                <div className={styles.cardImageContainer}>
                  <img src={item.image} alt={item.title} className={styles.cardImage} loading="lazy" />
                  <div className={styles.cardOverlay}>
                    <div className={styles.playBadge}>
                      <Play size={16} fill="white" />
                    </div>
                  </div>
                  <div className={styles.episodeTag}>
                    <span>EP {item.episode}</span>
                  </div>
                  <div className={styles.audioBadges}>
                    {item.hasSub && <span className={styles.subTag}><Subtitles size={10} /> SUB</span>}
                    {item.hasDub && <span className={styles.dubTag}><Headphones size={10} /> DUB</span>}
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
        </section>
      )}

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
              className={`${styles.tabBtn} ${leaderboardPeriod === "today" ? styles.tabActive : ""}`}
              onClick={() => setLeaderboardPeriod("today")}
            >
              Today
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${leaderboardPeriod === "week" ? styles.tabActive : ""}`}
              onClick={() => setLeaderboardPeriod("week")}
            >
              This Week
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${leaderboardPeriod === "all" ? styles.tabActive : ""}`}
              onClick={() => setLeaderboardPeriod("all")}
            >
              All Time
            </button>
          </div>
        </div>

        <div className={styles.leaderboardGrid}>
          {leaderboardList.map((anime, idx) => {
            const title = anime.title.english || anime.title.romaji || anime.title.native || "Anime";
            const image = anime.images.cover || anime.images.largeCover;
            const rank = idx + 1;
            const score = anime.score 
              ? (anime.score > 10 ? (anime.score / 10).toFixed(1) : anime.score.toFixed(1))
              : null;

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
                  <img src={image} alt={title} className={styles.leaderboardThumb} loading="lazy" />
                </div>

                <div className={styles.leaderboardInfo}>
                  <h4 className={styles.leaderboardTitleText}>{title}</h4>
                  <div className={styles.leaderboardMeta}>
                    <span className={styles.formatPill}>{anime.format || "TV"}</span>
                    {score && (
                      <span className={styles.scorePill}>
                        <Star size={11} fill="#eab308" color="#eab308" />
                        {score}
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
      </section>

      {/* ============================================================
          SECTION 3: REAL API-LINKED GENRE EXPLORER (HIGH VISIBILITY)
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
            href={`/discover?genre=${encodeURIComponent(selectedGenre)}`} 
            className={styles.headerAction}
          >
            <span>Explore All {selectedGenre} Anime</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Genre Filter Chips */}
        <div className={styles.genreChips}>
          {GENRES.map((genre) => (
            <button
              key={genre}
              type="button"
              className={`${styles.genreChip} ${selectedGenre === genre ? styles.genreChipActive : ""}`}
              onClick={() => setSelectedGenre(genre)}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Real API Genre Results with Loading State */}
        {isGenreLoading && genreAnimeList.length === 0 ? (
          <div className={styles.genreLoadingState}>
            <Loader2 size={24} className={styles.spinner} />
            <span>Loading {selectedGenre} titles...</span>
          </div>
        ) : (
          <div className={styles.genreResultsGrid}>
            {genreAnimeList.map((anime) => (
              <Link key={anime.id} href={`/anime/${anime.id}`} className={styles.genreCard}>
                <div className={styles.genreCardImageWrap}>
                  <img src={anime.image} alt={anime.title} className={styles.genreCardImage} loading="lazy" />
                  {anime.score && (
                    <span className={styles.genreScoreBadge}>
                      <Star size={10} fill="#facc15" color="#facc15" />
                      {anime.score}
                    </span>
                  )}
                  <span className={styles.genreFormatBadge}>{anime.format || "TV"}</span>
                </div>
                <div className={styles.genreCardBody}>
                  <h4 className={styles.genreCardTitle}>{anime.title}</h4>
                  <div className={styles.genreCardMeta}>
                    {anime.year && <span>{anime.year}</span>}
                    {anime.episodes && <span>• {anime.episodes} eps</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
