"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Clock, RefreshCw, Globe, Calendar, Flame, Play, Star, Sparkles, Tv, CheckCircle2 } from "lucide-react";
import styles from "./ScheduleViewer.module.css";

interface ScheduleAnime {
  id: string;
  title: string;
  image: string;
  episode: number;
  isUpcoming?: boolean;
  status?: string;
  time: string; // "18:00"
  day: string;  // "Monday"
  score?: number;
  studio?: string;
  genres?: string[];
}

interface LocalScheduleAnime extends ScheduleAnime {
  localTime: string;
  isToday: boolean;
}

const DAYS_OF_WEEK = ["All Days", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function ScheduleViewer() {
  const [userTimezone, setUserTimezone] = useState<string>("");
  const [todayName, setTodayName] = useState<string>("Monday");
  const [selectedDay, setSelectedDay] = useState<string>("All Days");
  const [scheduleData, setScheduleData] = useState<Record<string, ScheduleAnime[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Detect user's current day & timezone on client mount
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
      setUserTimezone(tz);
      const curDay = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
      setTodayName(curDay);
      // Default to today on first load
      setSelectedDay(curDay);
    } catch {
      setUserTimezone("Local");
    }
  }, []);

  // Fetch schedule with cache
  const fetchSchedule = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);

    if (!forceRefresh && typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("cachedSchedule_v5");
        if (cached) {
          const parsed = JSON.parse(cached);
          const age = Date.now() - (parsed.timestamp || 0);
          if (age < 2 * 60 * 60 * 1000 && parsed.data) {
            setScheduleData(parsed.data);
            setLastUpdated(new Date(parsed.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
            setIsLoading(false);
            return;
          }
        }
      } catch {}
    }

    try {
      const res = await fetch("/api/anime/schedule");
      if (res.ok) {
        const json = await res.json();
        if (json.schedule) {
          setScheduleData(json.schedule);
          const ts = Date.now();
          setLastUpdated(new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
          try {
            localStorage.setItem("cachedSchedule_v5", JSON.stringify({
              data: json.schedule,
              timestamp: ts,
            }));
          } catch {}
        }
      }
    } catch (err) {
      console.warn("Failed to fetch schedule:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
    const interval = setInterval(() => fetchSchedule(), 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSchedule]);

  // Convert JST (UTC+9) to User's Local Time accurately
  const processedAnime = useMemo(() => {
    const result: LocalScheduleAnime[] = [];
    const seenTitles = new Set<string>();
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

    days.forEach((dKey) => {
      const list = scheduleData[dKey] || [];
      list.forEach((item) => {
        const titleKey = (item.title || "").toLowerCase().trim();
        if (!titleKey || seenTitles.has(titleKey)) return;
        seenTitles.add(titleKey);

        let formattedLocalTime = item.time || "TBA";
        if (item.time) {
          try {
            const timeParts = item.time.split(":");
            const jstHour = parseInt(timeParts[0], 10);
            const jstMin = parseInt(timeParts[1], 10);

            // Convert JST (UTC+9) to user's local clock
            const nowDate = new Date();
            const targetDate = new Date(nowDate);
            // Set to JST time today, then adjust for timezone offset
            const utcHour = (jstHour - 9 + 24) % 24;
            targetDate.setUTCHours(utcHour, jstMin, 0, 0);

            formattedLocalTime = targetDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          } catch {}
        }

        const isToday = (item.day || dKey).toLowerCase() === todayName.toLowerCase();

        result.push({
          ...item,
          day: item.day || (dKey.charAt(0).toUpperCase() + dKey.slice(1)),
          localTime: formattedLocalTime,
          isToday,
        });
      });
    });

    return result;
  }, [scheduleData, todayName]);

  // Filtered list by selected tab
  const displayAnime = useMemo(() => {
    if (selectedDay === "All Days") return processedAnime;
    return processedAnime.filter((a) => a.day?.toLowerCase() === selectedDay.toLowerCase());
  }, [processedAnime, selectedDay]);

  return (
    <div className={styles.container}>
      {/* Top Meta Bar */}
      <div className={styles.metaHeader}>
        <div className={styles.metaBadges}>
          <span className={styles.tzPill}>
            <Globe size={13} /> {userTimezone}
          </span>
          <span className={styles.todayPill}>
            <Calendar size={13} /> Today is {todayName}
          </span>
          {lastUpdated && (
            <span className={styles.updateText}>Updated {lastUpdated}</span>
          )}
        </div>

        <button
          onClick={() => fetchSchedule(true)}
          className={styles.refreshBtn}
          title="Refresh broadcast schedule"
        >
          <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Weekday Selector Pills */}
      <div className={styles.dayTabsWrapper}>
        <div className={styles.dayTabs}>
          {DAYS_OF_WEEK.map((d) => {
            const isToday = d.toLowerCase() === todayName.toLowerCase();
            const isSelected = selectedDay === d;
            return (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`${styles.dayTab} ${isSelected ? styles.activeDayTab : ""}`}
              >
                <span>{d}</span>
                {isToday && <span className={styles.todayBadge}>TODAY</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading or Empty State */}
      {isLoading && displayAnime.length === 0 ? (
        <div className={styles.loadingState}>
          <RefreshCw size={24} className="animate-spin" style={{ color: "var(--primary)" }} />
          <p>Connecting to official broadcast network radar...</p>
        </div>
      ) : displayAnime.length === 0 ? (
        <div className={styles.emptyState}>
          <Calendar size={28} style={{ color: "var(--text-muted)" }} />
          <p>No broadcast releases scheduled for <strong>{selectedDay}</strong>.</p>
          <button onClick={() => setSelectedDay("All Days")} className={styles.allDaysBtn}>
            View Entire Week
          </button>
        </div>
      ) : (
        /* Redesigned Broadcast Card Grid with High Readability */
        <div className={styles.scheduleGrid}>
          {displayAnime.map((anime, idx) => {
            const scoreFormatted = anime.score
              ? (anime.score > 10 ? (anime.score / 10).toFixed(1) : anime.score.toFixed(1))
              : null;

            return (
              <div key={`${anime.id}-${idx}`} className={styles.scheduleCard}>
                {/* Poster with 2:3 vertical portrait aspect */}
                <Link href={`/anime/${anime.id}`} className={styles.posterCol}>
                  <img
                    src={anime.image || "/placeholder-cover.svg"}
                    alt={anime.title}
                    className={styles.posterImage}
                    loading="lazy"
                  />
                  {anime.isToday && (
                    <span className={styles.airingTodayBadge}>
                      <Flame size={11} /> Airing Today
                    </span>
                  )}
                </Link>

                {/* Content & Metadata */}
                <div className={styles.cardContent}>
                  {/* Top Bar: Broadcast Timing */}
                  <div className={styles.timingRow}>
                    <span className={styles.timeTag}>
                      <Clock size={12} /> {anime.localTime} Local
                    </span>
                    <span className={styles.jstTag}>
                      {anime.time} JST
                    </span>
                    {anime.day && (
                      <span className={styles.dayTag}>{anime.day}</span>
                    )}
                  </div>

                  {/* Anime Title */}
                  <Link href={`/anime/${anime.id}`} className={styles.titleLink}>
                    <h3 className={styles.animeTitle}>{anime.title}</h3>
                  </Link>

                  {/* Studio & Score Meta */}
                  <div className={styles.metaRow}>
                    {scoreFormatted && (
                      <span className={styles.scoreTag}>
                        <Star size={11} fill="#facc15" color="#facc15" /> {scoreFormatted}
                      </span>
                    )}
                    {anime.studio && (
                      <span className={styles.studioTag}>{anime.studio}</span>
                    )}
                    <span className={styles.episodeTag}>
                      {anime.isUpcoming ? "Season Premiere" : `Episode ${anime.episode || 1}`}
                    </span>
                  </div>

                  {/* Genres */}
                  {anime.genres && anime.genres.length > 0 && (
                    <div className={styles.genresList}>
                      {anime.genres.slice(0, 3).map((g) => (
                        <span key={g} className={styles.genrePill}>{g}</span>
                      ))}
                    </div>
                  )}

                  {/* Quick Action Button */}
                  <div className={styles.actionRow}>
                    <Link
                      href={`/watch/${anime.id}/${anime.episode || 1}`}
                      className={styles.watchBtn}
                    >
                      <Play size={13} fill="currentColor" />
                      <span>Watch</span>
                    </Link>
                    <Link
                      href={`/anime/${anime.id}`}
                      className={styles.detailsBtn}
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
