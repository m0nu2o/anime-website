"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Film, 
  Play, 
  Lock, 
  Search, 
  LayoutGrid, 
  List, 
  Tv, 
  Clapperboard, 
  Sparkles,
  ArrowRight
} from "lucide-react";
import { Episode } from "@/lib/api/types";
import { FranchiseEntry } from "@/lib/api/franchise";
import styles from "./WatchEpisodeSelector.module.css";

interface WatchEpisodeSelectorProps {
  animeId: string;
  currentEpisodeNumber: number;
  episodes: Episode[];
  franchiseEntries: FranchiseEntry[];
  animeTitle: string;
  coverImage?: string;
  isDubRequested?: boolean;
}

type FranchiseTab = "seasons" | "movies" | "specials";
type ViewMode = "grid" | "list";

interface EpisodeRange {
  start: number;
  end: number;
  label: string;
}

export default function WatchEpisodeSelector({
  animeId,
  currentEpisodeNumber,
  episodes,
  franchiseEntries,
  animeTitle,
  coverImage,
  isDubRequested = false,
}: WatchEpisodeSelectorProps) {
  const router = useRouter();
  const activeEpRef = useRef<HTMLAnchorElement | null>(null);

  // Group franchise entries into clean categories
  const seasons = useMemo(
    () => franchiseEntries.filter((e) => e.category === "season"),
    [franchiseEntries]
  );
  const movies = useMemo(
    () => franchiseEntries.filter((e) => e.category === "movie"),
    [franchiseEntries]
  );
  const specials = useMemo(
    () => franchiseEntries.filter((e) => e.category === "special"),
    [franchiseEntries]
  );

  // Determine current active franchise category
  const currentEntry = useMemo(
    () => franchiseEntries.find((e) => e.id === animeId) || franchiseEntries[0],
    [franchiseEntries, animeId]
  );

  const [activeTab, setActiveTab] = useState<FranchiseTab>(() => {
    if (currentEntry?.category === "movie") return "movies";
    if (currentEntry?.category === "special") return "specials";
    return "seasons";
  });

  // Dual view mode (Grid / List), persisted in localStorage
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("watch_episode_view_mode") as ViewMode;
      if (saved === "grid" || saved === "list") {
        setViewMode(saved);
      }
    } catch {}
  }, []);

  const handleToggleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("watch_episode_view_mode", mode);
    } catch {}
  };

  // Search query state
  const [searchQuery, setSearchQuery] = useState("");
  const [jumpEpInput, setJumpEpInput] = useState("");

  // Calculate episode statistics
  const releasedEpisodes = useMemo(
    () => episodes.filter((ep) => ep.status === "released"),
    [episodes]
  );
  const totalCount = episodes.length;

  // Generate range chunks for long series (> 40 episodes)
  const chunkSize = totalCount > 150 ? 100 : 50;
  const ranges: EpisodeRange[] = useMemo(() => {
    if (totalCount <= 40) return [];
    const result: EpisodeRange[] = [];
    for (let start = 1; start <= totalCount; start += chunkSize) {
      const end = Math.min(start + chunkSize - 1, totalCount);
      result.push({ start, end, label: `${start}–${end}` });
    }
    return result;
  }, [totalCount, chunkSize]);

  // Determine active range chunk based on currently playing episode
  const defaultRangeIndex = useMemo(() => {
    if (ranges.length === 0) return 0;
    const foundIdx = ranges.findIndex(
      (r) => currentEpisodeNumber >= r.start && currentEpisodeNumber <= r.end
    );
    return foundIdx !== -1 ? foundIdx : 0;
  }, [ranges, currentEpisodeNumber]);

  const [activeRangeIndex, setActiveRangeIndex] = useState(defaultRangeIndex);

  // Sync active range if current episode changes
  useEffect(() => {
    setActiveRangeIndex(defaultRangeIndex);
  }, [defaultRangeIndex]);

  // Filter episodes based on search query or active range
  const displayedEpisodes = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (trimmed) {
      return episodes.filter((ep) => {
        const numStr = String(ep.number ?? "");
        const titleStr = ep.title?.toLowerCase() || "";
        return numStr === trimmed || numStr.includes(trimmed) || titleStr.includes(trimmed);
      });
    }

    if (ranges.length > 0 && ranges[activeRangeIndex]) {
      const { start, end } = ranges[activeRangeIndex];
      return episodes.filter((ep) => {
        const num = ep.number ?? 0;
        return num >= start && num <= end;
      });
    }

    return episodes;
  }, [episodes, searchQuery, ranges, activeRangeIndex]);

  // Handle jump to episode directly
  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const epNum = parseInt(jumpEpInput.trim(), 10);
    if (!isNaN(epNum) && epNum > 0) {
      const target = episodes.find((ep) => ep.number === epNum);
      if (target) {
        const query = isDubRequested ? "?dub=true" : "";
        router.push(`/watch/${animeId}/${epNum}${query}`);
      } else {
        alert(`Episode ${epNum} is not available.`);
      }
    }
    setJumpEpInput("");
  };

  // Scroll active episode into view on mount or range change
  useEffect(() => {
    if (activeEpRef.current) {
      activeEpRef.current.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "smooth",
      });
    }
  }, [activeRangeIndex, viewMode]);

  const dubQuery = isDubRequested ? "?dub=true" : "";

  return (
    <div className={styles.container}>
      {/* 1. FRANCHISE CATEGORY PILLS (Seasons | Movies | Specials) */}
      {(movies.length > 0 || specials.length > 0) && (
        <div className={styles.categoryBar}>
          {seasons.length > 0 && (
            <button
              onClick={() => setActiveTab("seasons")}
              className={`${styles.categoryTabBtn} ${activeTab === "seasons" ? styles.activeCategoryTab : ""}`}
            >
              <Tv size={14} />
              <span>Seasons ({seasons.length})</span>
            </button>
          )}

          {movies.length > 0 && (
            <button
              onClick={() => setActiveTab("movies")}
              className={`${styles.categoryTabBtn} ${activeTab === "movies" ? styles.activeCategoryTab : ""}`}
            >
              <Clapperboard size={14} />
              <span>Movies ({movies.length})</span>
            </button>
          )}

          {specials.length > 0 && (
            <button
              onClick={() => setActiveTab("specials")}
              className={`${styles.categoryTabBtn} ${activeTab === "specials" ? styles.activeCategoryTab : ""}`}
            >
              <Sparkles size={14} />
              <span>Specials ({specials.length})</span>
            </button>
          )}
        </div>
      )}

      {/* 2. FRANCHISE NAVIGATION BUTTONS */}
      {activeTab === "seasons" && seasons.length > 1 && (
        <div className={styles.franchisePillsWrapper}>
          <div className={styles.franchisePillsScroll}>
            {seasons.map((s) => {
              const isCur = s.id === animeId;
              return (
                <Link
                  key={s.id}
                  href={`/watch/${s.id}/1${dubQuery}`}
                  className={`${styles.franchisePill} ${isCur ? styles.activeFranchisePill : ""}`}
                  title={s.title}
                >
                  <span className={styles.pillLabel}>{s.seasonLabel}</span>
                  {s.episodes && (
                    <span className={styles.pillBadge}>{s.episodes} eps</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "movies" && movies.length > 0 && (
        <div className={styles.franchisePillsWrapper}>
          <div className={styles.franchisePillsScroll}>
            {movies.map((m) => {
              const isCur = m.id === animeId;
              return (
                <Link
                  key={m.id}
                  href={`/watch/${m.id}/1${dubQuery}`}
                  className={`${styles.franchisePill} ${isCur ? styles.activeFranchisePill : ""}`}
                  title={m.title}
                >
                  <span className={styles.pillLabel}>{m.title}</span>
                  {m.year && <span className={styles.pillBadge}>{m.year}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "specials" && specials.length > 0 && (
        <div className={styles.franchisePillsWrapper}>
          <div className={styles.franchisePillsScroll}>
            {specials.map((sp) => {
              const isCur = sp.id === animeId;
              return (
                <Link
                  key={sp.id}
                  href={`/watch/${sp.id}/1${dubQuery}`}
                  className={`${styles.franchisePill} ${isCur ? styles.activeFranchisePill : ""}`}
                  title={sp.title}
                >
                  <span className={styles.pillLabel}>{sp.seasonLabel}: {sp.title}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. EPISODES HEADER & CONTROL TOOLBAR */}
      <div className={styles.selectorHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.headerTitleWrap}>
            <Film size={18} className={styles.accentIcon} />
            <h3 className={styles.headerTitle}>Episodes</h3>
            <span className={styles.totalBadge}>{totalCount}</span>
          </div>
          <span className={styles.releaseMeta}>
            {releasedEpisodes.length} Released
            {totalCount > releasedEpisodes.length ? ` • ${totalCount - releasedEpisodes.length} Upcoming` : ""}
          </span>
        </div>

        {/* View Mode Switcher */}
        <div className={styles.viewModeToggle}>
          <button
            onClick={() => handleToggleViewMode("grid")}
            className={`${styles.modeBtn} ${viewMode === "grid" ? styles.activeModeBtn : ""}`}
            title="Compact Number Grid View"
            aria-label="Grid View"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => handleToggleViewMode("list")}
            className={`${styles.modeBtn} ${viewMode === "list" ? styles.activeModeBtn : ""}`}
            title="Detailed Card List View"
            aria-label="List View"
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* 4. RANGE CHUNKS SELECTOR (e.g. 1-100, 101-200) for long shows */}
      {ranges.length > 1 && !searchQuery.trim() && (
        <div className={styles.rangeTabsWrapper}>
          <div className={styles.rangeTabsScroll}>
            {ranges.map((range, idx) => {
              const isActive = idx === activeRangeIndex;
              return (
                <button
                  key={range.label}
                  onClick={() => setActiveRangeIndex(idx)}
                  className={`${styles.rangeTab} ${isActive ? styles.activeRangeTab : ""}`}
                >
                  {range.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. SEARCH & JUMP BAR */}
      <div className={styles.searchBarRow}>
        <div className={styles.searchBox}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Filter episode # or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className={styles.clearSearchBtn}
            >
              ✕
            </button>
          )}
        </div>

        <form onSubmit={handleJumpSubmit} className={styles.jumpBox}>
          <input
            type="number"
            min={1}
            max={totalCount}
            placeholder="Jump #"
            value={jumpEpInput}
            onChange={(e) => setJumpEpInput(e.target.value)}
            className={styles.jumpInput}
          />
          <button type="submit" className={styles.jumpBtn} title="Go to episode">
            <ArrowRight size={13} />
          </button>
        </form>
      </div>

      {/* 6. EPISODES DISPLAY: GRID OR LIST */}
      {displayedEpisodes.length === 0 ? (
        <div className={styles.emptyNotice}>
          No episodes match your search &quot;{searchQuery}&quot;.
        </div>
      ) : viewMode === "grid" ? (
        /* COMPACT NUMBERED GRID VIEW */
        <div className={styles.gridContainer}>
          {displayedEpisodes.map((ep) => {
            const epNum = ep.number ?? 1;
            const isCur = epNum === currentEpisodeNumber;
            const isUpcoming = ep.status === "upcoming";

            if (isUpcoming) {
              return (
                <div
                  key={ep.id}
                  className={`${styles.gridChip} ${styles.gridChipLocked}`}
                  title={`Episode ${epNum} is upcoming.`}
                >
                  <Lock size={12} className={styles.lockedChipIcon} />
                  <span>{epNum}</span>
                </div>
              );
            }

            return (
              <Link
                key={ep.id}
                ref={isCur ? activeEpRef : null}
                href={`/watch/${animeId}/${epNum}${dubQuery}`}
                className={`${styles.gridChip} ${isCur ? styles.activeGridChip : ""}`}
                title={ep.title || `Episode ${epNum}`}
              >
                {isCur && (
                  <span className={styles.playingDot}>
                    <Play size={10} fill="#fff" />
                  </span>
                )}
                <span>{epNum}</span>
              </Link>
            );
          })}
        </div>
      ) : (
        /* DETAILED CARD LIST VIEW */
        <div className={styles.listContainer}>
          {displayedEpisodes.map((ep) => {
            const epNum = ep.number ?? 1;
            const isCur = epNum === currentEpisodeNumber;
            const isUpcoming = ep.status === "upcoming";

            if (isUpcoming) {
              return (
                <div
                  key={ep.id}
                  className={`${styles.listCard} ${styles.listCardLocked}`}
                  title={`Episode ${epNum} is upcoming.`}
                >
                  <div className={styles.listThumbWrap}>
                    <img
                      src={ep.thumbnail || coverImage || "/placeholder-cover.svg"}
                      alt={ep.title || `Episode ${epNum}`}
                      className={styles.listThumb}
                    />
                    <div className={styles.lockedOverlay}>
                      <Lock size={14} />
                    </div>
                    <span className={styles.listEpNumBadge}>EP {epNum}</span>
                  </div>
                  <div className={styles.listDetails}>
                    <div className={styles.listHeaderRow}>
                      <span className={styles.upcomingBadge}>Upcoming</span>
                    </div>
                    <span className={styles.listAirdate}>
                      {ep.airdate ? `Airs on ${ep.airdate}` : "Airdate TBA"}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={ep.id}
                ref={isCur ? activeEpRef : null}
                href={`/watch/${animeId}/${epNum}${dubQuery}`}
                className={`${styles.listCard} ${isCur ? styles.activeListCard : ""}`}
              >
                <div className={styles.listThumbWrap}>
                  <img
                    src={ep.thumbnail || coverImage || "/placeholder-cover.svg"}
                    alt={ep.title || `Episode ${epNum}`}
                    className={styles.listThumb}
                  />
                  {isCur && (
                    <div className={styles.playingOverlay}>
                      <Play size={14} fill="#fff" />
                    </div>
                  )}
                  <span className={styles.listEpNumBadge}>EP {epNum}</span>
                </div>
                <div className={styles.listDetails}>
                  <span className={styles.listTitle}>
                    {ep.title || `Episode ${epNum}`}
                  </span>
                  {ep.airdate && (
                    <span className={styles.listAirdate}>Aired: {ep.airdate}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
