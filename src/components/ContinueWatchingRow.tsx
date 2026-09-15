"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/supabase/AuthContext";
import { getUserWatchHistory, WatchHistoryItem } from "@/lib/supabase/dal";
import Link from "next/link";
import { Play } from "lucide-react";
import styles from "./ContinueWatchingRow.module.css";

export default function ContinueWatchingRow() {
  const { user } = useAuth();
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Read from localStorage for guest users or as instantaneous fallback
    const loadLocalStorageHistory = () => {
      try {
        const raw = localStorage.getItem("watchHistory");
        if (raw) {
          const parsed = JSON.parse(raw);
          const items: WatchHistoryItem[] = Object.entries(parsed)
            .filter(([_, data]: [string, any]) => data && typeof data.episode === "number" && (data.currentTime > 5 || data.playback_position > 5))
            .map(([animeId, data]: [string, any]) => ({
              id: animeId,
              user_id: user?.id || "guest",
              anime_id: animeId,
              anime_title: data.title || "Anime Episode",
              anime_image: data.image || "/placeholder-cover.svg",
              season: data.season || 1,
              episode: data.episode || 1,
              playback_position: data.currentTime || data.playback_position || 0,
              duration: data.duration || 1440,
              completed: Boolean(data.completed),
              updated_at: new Date(data.timestamp || Date.now()).toISOString(),
            }));
          if (items.length > 0) {
            setHistory(items.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
          }
        }
      } catch {}
    };

    if (!user) {
      loadLocalStorageHistory();
      setLoaded(true);
      return;
    }

    getUserWatchHistory(user.id)
      .then(items => {
        if (items && items.length > 0) {
          setHistory(items);
        } else {
          loadLocalStorageHistory();
        }
        setLoaded(true);
      })
      .catch(() => {
        loadLocalStorageHistory();
        setLoaded(true);
      });
  }, [user]);

  if (!loaded || history.length === 0) {
    return null;
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <Play size={20} color="var(--accent)" />
          Continue Watching
        </h2>
        <Link href="/dashboard" className={styles.viewAll}>
          View Dashboard
        </Link>
      </div>

      <div className={styles.carousel}>
        {history.slice(0, 8).map(item => {
          const percent = item.duration > 0 
            ? Math.min(100, Math.round((item.playback_position / item.duration) * 100))
            : 0;

          return (
            <Link 
              key={`${item.anime_id}-${item.episode}`}
              href={`/watch/${item.anime_id}/${item.episode}`}
              className={styles.card}
            >
              <div className={styles.posterContainer}>
                <img 
                  src={item.anime_image || "/placeholder-cover.svg"} 
                  alt={item.anime_title}
                  className={styles.poster}
                  loading="lazy"
                />
                <div className={styles.playOverlay}>
                  <div className={styles.playCircle}>
                    <Play size={18} fill="#fff" />
                  </div>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${percent}%` }} />
                </div>
              </div>
              <div className={styles.body}>
                <div className={styles.animeTitle}>{item.anime_title}</div>
                <div className={styles.episodeText}>Episode {item.episode}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
