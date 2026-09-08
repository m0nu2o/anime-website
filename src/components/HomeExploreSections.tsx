"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Anime } from "@/lib/api/types";
import styles from "./HomeExploreSections.module.css";
import { 
  Play, 
  Flame, 
  Star, 
  Clock, 
  Calendar, 
  Layers, 
  ArrowRight, 
  Sparkles,
  Headphones,
  Subtitles,
  ChevronRight
} from "lucide-react";

interface HomeExploreSectionsProps {
  trendingAnime: Anime[];
  popularAnime: Anime[];
  seasonalAnime: Anime[];
}

const GENRES = [
  "All",
  "Action",
  "Shounen",
  "Fantasy",
  "Romance",
  "Sci-Fi",
  "Comedy",
  "Supernatural",
  "Adventure"
];

const DAYS = [
  { short: "Mon", full: "Monday" },
  { short: "Tue", full: "Tuesday" },
  { short: "Wed", full: "Wednesday" },
  { short: "Thu", full: "Thursday" },
  { short: "Fri", full: "Friday" },
  { short: "Sat", full: "Saturday" },
  { short: "Sun", full: "Sunday" },
];

export default function HomeExploreSections({
  trendingAnime,
  popularAnime,
  seasonalAnime,
}: HomeExploreSectionsProps) {
  // 1. Top 10 Period Tab
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"today" | "week" | "all">("today");

  // 2. Genre Filter
  const [selectedGenre, setSelectedGenre] = useState<string>("All");

  // 3. Airing Radar Day
  const todayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday...
  const adjustedToday = todayIndex === 0 ? 6 : todayIndex - 1;
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(adjustedToday);

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

  // Unique combined anime for genre filter
  const allAnime = useMemo(() => {
    const map = new Map<string, Anime>();
    [...trendingAnime, ...seasonalAnime, ...popularAnime].forEach((a) => {
      if (!map.has(a.id)) map.set(a.id, a);
    });
    return Array.from(map.values());
  }, [trendingAnime, seasonalAnime, popularAnime]);

  // Filtered anime by genre
  const filteredByGenre = useMemo(() => {
    if (selectedGenre === "All") return allAnime.slice(0, 6);
    return allAnime
      .filter((a) => a.genres?.some((g) => g.toLowerCase() === selectedGenre.toLowerCase()))
      .slice(0, 6);
  }, [allAnime, selectedGenre]);

  // Latest releases mock data derived from trending & seasonal
  const latestReleases = useMemo(() => {
    const list = trendingAnime.slice(0, 8);
    const times = ["15m ago", "42m ago", "1h ago", "2h ago", "3h ago", "4h ago", "5h ago", "6h ago"];
    return list.map((anime, idx) => ({
      anime,
      episode: (anime.episodes && anime.episodes > 1) ? Math.min(anime.episodes, (idx % 12) + 1) : (idx % 12) + 1,
      timeAgo: times[idx % times.length],
      hasDub: idx % 2 === 0,
      hasSub: true,
    }));
  }, [trendingAnime]);

  // Daily Airing Schedule preview
  const daySchedule = useMemo(() => {
    const list = seasonalAnime.length > 0 ? seasonalAnime : trendingAnime;
    const offset = (selectedDayIndex * 2) % Math.max(1, list.length - 2);
    const dayItems = list.slice(offset, offset + 4);
    const times = ["18:30 JST", "21:00 JST", "23:00 JST", "24:30 JST"];
    return dayItems.map((anime, idx) => ({
      anime,
      airTime: times[idx % times.length],
      episodeNum: (idx % 12) + 1,
    }));
  }, [seasonalAnime, trendingAnime, selectedDayIndex]);

  return (
    <div className={styles.exploreWrapper}>
      {/* ============================================================
          SECTION 1: LATEST EPISODES / FRESH RELEASES TODAY
          ============================================================ */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.sectionBadge}>
              <span className={styles.livePulse} />
              JUST UPDATED
            </span>
            <h2 className={styles.sectionTitle}>
              <Clock size={20} className={styles.titleIcon} />
              Latest Episodes Released Today
            </h2>
          </div>
          <Link href="/calendar" className={styles.headerAction}>
            <span>Broadcast Calendar</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className={styles.episodesGrid}>
          {latestReleases.map(({ anime, episode, timeAgo, hasDub, hasSub }) => {
            const title = anime.title.english || anime.title.romaji || anime.title.native || "Anime";
            const image = anime.images.cover || anime.images.largeCover;
            return (
              <Link 
                key={anime.id} 
                href={`/watch/${anime.id}/${episode}`} 
                className={styles.episodeCard}
                title={`Watch ${title} Episode ${episode}`}
              >
                <div className={styles.cardImageContainer}>
                  <img src={image} alt={title} className={styles.cardImage} loading="lazy" />
                  <div className={styles.cardOverlay}>
                    <div className={styles.playBadge}>
                      <Play size={16} fill="white" />
                    </div>
                  </div>
                  <div className={styles.episodeTag}>
                    <span>EP {episode}</span>
                  </div>
                  <div className={styles.audioBadges}>
                    {hasSub && <span className={styles.subTag}><Subtitles size={10} /> SUB</span>}
                    {hasDub && <span className={styles.dubTag}><Headphones size={10} /> DUB</span>}
                  </div>
                </div>

                <div className={styles.cardDetails}>
                  <h3 className={styles.cardTitle}>{title}</h3>
                  <div className={styles.cardMeta}>
                    <span className={styles.timeAgo}>{timeAgo}</span>
                    <span className={styles.dot}>•</span>
                    <span className={styles.format}>{anime.format || "TV"}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ============================================================
          SECTION 2: TOP 10 RANKED LEADERBOARD WITH PERIOD TABS
          ============================================================ */}
      <section className={styles.section}>
        <div className={styles.leaderboardSectionHeader}>
          <div>
            <span className={styles.sectionBadge}>
              <Flame size={12} style={{ color: "#ef4444" }} />
              OFFICIAL RANKINGS
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
          SECTION 3: QUICK GENRE & MOOD DISCOVERY BAR
          ============================================================ */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.sectionBadge}>
              <Sparkles size={12} style={{ color: "var(--primary)" }} />
              CATEGORIES
            </span>
            <h2 className={styles.sectionTitle}>
              <Layers size={20} className={styles.titleIcon} />
              Quick Genre Explorer
            </h2>
          </div>
          <Link 
            href={selectedGenre === "All" ? "/discover" : `/discover?genre=${encodeURIComponent(selectedGenre)}`} 
            className={styles.headerAction}
          >
            <span>Explore All {selectedGenre !== "All" ? selectedGenre : ""}</span>
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

        {/* Genre matching cards */}
        <div className={styles.genreResultsGrid}>
          {filteredByGenre.length > 0 ? (
            filteredByGenre.map((anime) => {
              const title = anime.title.english || anime.title.romaji || anime.title.native || "Anime";
              const image = anime.images.cover || anime.images.largeCover;
              const score = anime.score 
                ? (anime.score > 10 ? (anime.score / 10).toFixed(1) : anime.score.toFixed(1))
                : null;

              return (
                <Link key={anime.id} href={`/anime/${anime.id}`} className={styles.genreCard}>
                  <div className={styles.genreCardImageWrap}>
                    <img src={image} alt={title} className={styles.genreCardImage} loading="lazy" />
                    {score && (
                      <span className={styles.genreScoreBadge}>
                        <Star size={10} fill="#facc15" color="#facc15" />
                        {score}
                      </span>
                    )}
                  </div>
                  <h4 className={styles.genreCardTitle}>{title}</h4>
                  <div className={styles.genreCardTags}>
                    {anime.genres?.slice(0, 2).map((g) => (
                      <span key={g} className={styles.tagItem}>{g}</span>
                    ))}
                  </div>
                </Link>
              );
            })
          ) : (
            <div className={styles.emptyGenreState}>
              <p>No titles found for {selectedGenre}.</p>
            </div>
          )}
        </div>
      </section>

      {/* ============================================================
          SECTION 4: WEEKLY BROADCAST SCHEDULE RADAR PREVIEW
          ============================================================ */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.sectionBadge}>
              <Calendar size={12} style={{ color: "#38bdf8" }} />
              AIRING RADAR
            </span>
            <h2 className={styles.sectionTitle}>
              <Calendar size={20} className={styles.titleIcon} />
              Weekly Airing Radar
            </h2>
          </div>
          <Link href="/calendar" className={styles.headerAction}>
            <span>Full 7-Day Airing Grid</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Day Pills */}
        <div className={styles.dayTabs}>
          {DAYS.map((day, idx) => {
            const isToday = idx === adjustedToday;
            const isSelected = idx === selectedDayIndex;
            return (
              <button
                key={day.short}
                type="button"
                className={`${styles.dayBtn} ${isSelected ? styles.dayBtnActive : ""}`}
                onClick={() => setSelectedDayIndex(idx)}
              >
                <span className={styles.dayShort}>{day.short}</span>
                {isToday && <span className={styles.todayIndicator}>Today</span>}
              </button>
            );
          })}
        </div>

        {/* Schedule preview cards */}
        <div className={styles.scheduleGrid}>
          {daySchedule.map(({ anime, airTime, episodeNum }) => {
            const title = anime.title.english || anime.title.romaji || anime.title.native || "Anime";
            const image = anime.images.cover || anime.images.largeCover;
            return (
              <Link key={anime.id} href={`/anime/${anime.id}`} className={styles.scheduleCard}>
                <img src={image} alt={title} className={styles.scheduleThumb} loading="lazy" />
                <div className={styles.scheduleInfo}>
                  <div className={styles.scheduleTimeBadge}>
                    <Clock size={11} />
                    <span>{airTime}</span>
                  </div>
                  <h4 className={styles.scheduleTitle}>{title}</h4>
                  <div className={styles.scheduleSub}>
                    <span>Episode {episodeNum} Premiering</span>
                  </div>
                </div>
                <ChevronRight size={16} className={styles.scheduleChevron} />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
