"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Clock, RefreshCw, Globe, Calendar, Flame, Play, Star } from "lucide-react";
import AiringCountdown from "./AiringCountdown";
import styles from "./ScheduleViewer.module.css";

interface ScheduleAnime {
  id: string;
  title: string;
  image: string;
  /** Real provider episode number; null when the provider does not expose one. */
  episode: number | null;
  isUpcoming?: boolean;
  status?: string;
  time: string;
  day: string;
  airingDate?: string;
  airingAtTimestamp?: number;
  hasExactTime?: boolean;
  score?: number;
  studio?: string;
  genres?: string[];
}

interface LocalScheduleAnime extends ScheduleAnime {
  localTime: string;
  isToday: boolean;
  weekday: string;
  airingDate: string;
}

const DAYS_OF_WEEK = ["All Days", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SCHEDULE_CACHE_KEY = "cachedSchedule_v7";

function getDateKey(timestamp: number, timeZone?: string) {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timeZone === "Local" ? undefined : timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  return new Intl.DateTimeFormat("en-CA", options).format(new Date(timestamp * 1000));
}

function getWeekdayFromTimestamp(timestamp?: number, timeZone?: string, fallbackDay?: string): string {
  if (timestamp && timeZone) {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: timeZone === "Local" ? undefined : timeZone,
        weekday: "long",
      }).format(new Date(timestamp * 1000));
    } catch {}
  }
  return fallbackDay || "Unknown";
}

function getJstWeekday(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "long",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function formatBroadcastDate(dateKey: string, timeZone?: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone === "Local" ? undefined : timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function getLocalTime(item: ScheduleAnime, timeZone: string) {
  if (item.airingAtTimestamp && item.hasExactTime !== false && timeZone) {
    try {
      return new Date(item.airingAtTimestamp * 1000).toLocaleTimeString([], {
        timeZone: timeZone === "Local" ? undefined : timeZone,
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {}
  }

  return item.time && item.time !== "TBA" ? item.time : "TBA";
}

export default function ScheduleViewer() {
  const [userTimezone, setUserTimezone] = useState<string>("");
  const [todayName, setTodayName] = useState<string>("Monday");
  const [todayDateKey, setTodayDateKey] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("All Days");
  const [scheduleData, setScheduleData] = useState<Record<string, ScheduleAnime[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [scheduleError, setScheduleError] = useState<string>("");

  // Detect user's current day & timezone on client mount
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
      const now = Date.now();
      setUserTimezone(tz);
      const curDay = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date(now));
      setTodayName(curDay);
      setTodayDateKey(getDateKey(Math.floor(now / 1000), tz));
      setSelectedDay(curDay);
    } catch {
      setUserTimezone("Local");
      setTodayName(new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date()));
      setTodayDateKey(getDateKey(Math.floor(Date.now() / 1000)));
    }
  }, []);

  // Fetch schedule with cache
  const fetchSchedule = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setScheduleError("");

    if (!forceRefresh && typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(SCHEDULE_CACHE_KEY);
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
      if (!res.ok) throw new Error(`Schedule API Error: ${res.status}`);
      const json = await res.json();
      if (json.schedule) {
        setScheduleData(json.schedule);
        const ts = Date.now();
        setLastUpdated(new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        try {
          localStorage.setItem(SCHEDULE_CACHE_KEY, JSON.stringify({
            data: json.schedule,
            timestamp: ts,
          }));
        } catch {}
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load the broadcast schedule";
      setScheduleError(message);
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

  const processedAnime = useMemo(() => {
    const result: LocalScheduleAnime[] = [];
    const seenKeys = new Set<string>();

    Object.entries(scheduleData).forEach(([dateKey, list]) => {
      list.forEach((item) => {
        const titleKey = (item.title || "").toLowerCase().trim();
        if (!titleKey) return;
        const dedupeKey = `${titleKey}|${item.episode ?? "unknown"}|${dateKey}`;
        if (seenKeys.has(dedupeKey)) return;
        seenKeys.add(dedupeKey);

        const weekday = getWeekdayFromTimestamp(item.airingAtTimestamp, userTimezone, item.day || getJstWeekday(dateKey));
        const localTime = getLocalTime(item, userTimezone);
        const localDateKey = item.airingAtTimestamp ? getDateKey(item.airingAtTimestamp, userTimezone) : dateKey;
        const isToday = todayDateKey ? localDateKey === todayDateKey : (weekday.toLowerCase() === todayName.toLowerCase());

        result.push({
          ...item,
          day: weekday,
          localTime,
          airingDate: localDateKey,
          isToday,
          weekday,
        } as LocalScheduleAnime);
      });
    });

    return result.sort((a, b) => (a.airingAtTimestamp || 0) - (b.airingAtTimestamp || 0));
  }, [scheduleData, userTimezone, todayName, todayDateKey]);

  const displayAnime = useMemo(() => {
    if (selectedDay === "All Days") return processedAnime;
    return processedAnime.filter((a) => a.weekday?.toLowerCase() === selectedDay.toLowerCase());
  }, [processedAnime, selectedDay]);

  const dateGroups = useMemo(() => {
    const groups = new Map<string, LocalScheduleAnime[]>();
    displayAnime.forEach((item) => {
      const key = item.airingDate || (item.airingAtTimestamp ? getDateKey(item.airingAtTimestamp, userTimezone) : "Upcoming");
      const list = groups.get(key) || [];
      list.push(item);
      groups.set(key, list);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [displayAnime, userTimezone]);

  return (
    <div className={styles.container}>
      {/* Top Meta Bar */}
      <div className={styles.metaHeader}>
        <div className={styles.metaBadges}>
          <button
            type="button"
            onClick={() => setUserTimezone((prev) => prev === "Asia/Tokyo" ? (Intl.DateTimeFormat().resolvedOptions().timeZone || "Local") : "Asia/Tokyo")}
            className={styles.tzPill}
            title="Click to toggle between Local Time and JST"
            style={{ cursor: "pointer" }}
          >
            <Globe size={13} /> {userTimezone === "Asia/Tokyo" ? "JST (Tokyo)" : userTimezone}
          </button>
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

      {/* Loading or Error or Empty State */}
      {isLoading && displayAnime.length === 0 ? (
        <div className={styles.loadingState}>
          <RefreshCw size={24} className="animate-spin" style={{ color: "var(--primary)" }} />
          <p>Connecting to official broadcast network radar...</p>
        </div>
      ) : scheduleError && displayAnime.length === 0 ? (
        <div className={styles.emptyState}>
          <Calendar size={28} style={{ color: "var(--text-muted)" }} />
          <p>Unable to load live schedule feeds: <strong>{scheduleError}</strong></p>
          <button onClick={() => fetchSchedule(true)} className={styles.allDaysBtn}>Retry Now</button>
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
        dateGroups.map(([dateKey, entries]) => (
          <section key={dateKey} className={styles.dateSection}>
            <div className={styles.dateHeader}>
              <Calendar size={16} style={{ color: "var(--text-muted)" }} />
              <div>
                <h2 className={styles.dateTitle}>{formatBroadcastDate(dateKey, userTimezone)}</h2>
                <span className={styles.dateSubtitle}>
                  {userTimezone === "Asia/Tokyo" ? "JST broadcast schedule" : "Broadcast schedule (in your timezone)"} • {entries.length} release{entries.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            <div className={styles.scheduleGrid}>
              {entries.map((anime) => {
                const scoreFormatted = anime.score
                  ? (anime.score > 10 ? (anime.score / 10).toFixed(1) : anime.score.toFixed(1))
                  : null;

                return (
                  <div key={anime.id} className={styles.scheduleCard}>
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
                          <Clock size={12} /> {anime.localTime} {userTimezone === "Asia/Tokyo" ? "JST" : "Local"}
                        </span>
                        {userTimezone !== "Asia/Tokyo" && anime.time && (
                          <span className={styles.jstTag}>
                            {anime.time} JST
                          </span>
                        )}
                        {anime.hasExactTime === false && (
                          <span className={styles.dayTag}>Date-only</span>
                        )}
                        <span className={styles.dayTag}>{anime.weekday}</span>
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
                          Episode {anime.episode ?? "—"}
                        </span>
                      </div>

                      {/* Countdown for Upcoming Airing */}
                      {anime.isUpcoming && anime.airingAtTimestamp && (
                        <div style={{ fontSize: "0.78rem", color: "#38bdf8", marginBottom: "4px" }}>
                          <AiringCountdown airingAtTimestamp={anime.airingAtTimestamp} />
                        </div>
                      )}

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
                        {anime.isUpcoming ? (
                          <Link
                            href={`/anime/${anime.id}`}
                            className={styles.watchBtn}
                            style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.3)" }}
                          >
                            <Clock size={13} />
                            <span>Upcoming</span>
                          </Link>
                        ) : (
                          <Link
                            href={anime.episode ? `/watch/${anime.id}/${anime.episode}` : `/anime/${anime.id}`}
                            className={styles.watchBtn}
                            aria-disabled={!anime.episode}
                          >
                            <Play size={13} fill="currentColor" />
                            <span>Watch</span>
                          </Link>
                        )}
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
          </section>
        ))
      )}
    </div>
  );
}
