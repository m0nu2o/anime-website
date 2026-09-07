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
    if (!user) {
      setLoaded(true);
      return;
    }

    getUserWatchHistory(user.id)
      .then(items => {
        setHistory(items);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [user]);

  if (!user || !loaded || history.length === 0) {
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
