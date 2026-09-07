"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/supabase/AuthContext";
import { 
  getUserWatchHistory, 
  getUserWatchlist, 
  getUserFavorites, 
  WatchHistoryItem, 
  WatchlistItem, 
  FavoriteItem 
} from "@/lib/supabase/dal";
import Link from "next/link";
import { 
  Play, 
  Clock, 
  Bookmark, 
  Heart, 
  CheckCircle2, 
  Calendar, 
  Compass, 
  Orbit, 
  Shuffle, 
  Sparkles,
  ArrowRight
} from "lucide-react";
import styles from "./page.module.css";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";

export default function DashboardPage() {
  const { user, profile, openAuthModal } = useAuth();
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const currentUserId = user.id;

    async function loadData() {
      setLoading(true);
      try {
        const [histData, wlData, favData] = await Promise.all([
          getUserWatchHistory(currentUserId),
          getUserWatchlist(currentUserId),
          getUserFavorites(currentUserId),
        ]);
        setHistory(histData);
        setWatchlist(wlData);
        setFavorites(favData);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  // Derived counts
  const watchingCount = watchlist.filter(w => w.status === "watching").length;
  const completedCount = watchlist.filter(w => w.status === "completed").length;
  const planCount = watchlist.filter(w => w.status === "planning").length;

  if (!user && !loading) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <div className={styles.authNotice}>
            <Sparkles size={40} color="var(--accent)" style={{ marginBottom: "16px" }} />
            <h2>Welcome to Your Dashboard</h2>
            <p>
              Sign in or create an account to track episodes, sync your personalized watchlist, 
              continue watching seamlessly across devices, and manage your favorites.
            </p>
            <button onClick={openAuthModal} className={styles.signInBtn}>
              Sign In to Your Account
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.greeting}>
              Welcome back, {profile?.username || user?.email?.split("@")[0] || "Explorer"}
            </h1>
            <p className={styles.subtitle}>
              Here is an overview of your anime journey, episode progress, and collections.
            </p>
          </div>
          <Link href="/discover" className={styles.signInBtn} style={{ textDecoration: "none" }}>
            Explore Anime
          </Link>
        </div>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ color: "#3b82f6" }}>
              <Clock size={24} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>
                {loading ? <Skeleton width="40px" height="28px" /> : watchingCount}
              </span>
              <span className={styles.statLabel}>Currently Watching</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ color: "#10b981" }}>
              <CheckCircle2 size={24} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>
                {loading ? <Skeleton width="40px" height="28px" /> : completedCount}
              </span>
              <span className={styles.statLabel}>Completed</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ color: "#8b5cf6" }}>
              <Bookmark size={24} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>
                {loading ? <Skeleton width="40px" height="28px" /> : planCount}
              </span>
              <span className={styles.statLabel}>Plan to Watch</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ color: "#ec4899" }}>
              <Heart size={24} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>
                {loading ? <Skeleton width="40px" height="28px" /> : favorites.length}
              </span>
              <span className={styles.statLabel}>Favorites</span>
            </div>
          </div>
        </div>

        {/* Continue Watching Section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Play size={20} color="var(--accent)" />
              Continue Watching
            </h2>
            {history.length > 0 && (
              <span className={styles.subtitle}>{history.length} in progress</span>
            )}
          </div>

          {loading ? (
            <div className={styles.watchingGrid}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ borderRadius: "14px", overflow: "hidden" }}>
                  <Skeleton width="100%" height="160px" />
                  <div style={{ padding: "16px" }}>
                    <Skeleton width="70%" height="20px" style={{ marginBottom: "8px" }} />
                    <Skeleton width="40%" height="16px" />
                  </div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <EmptyState
              title="No Watch History Yet"
              description="Start streaming any anime episode to pick up right where you left off."
              actionLabel="Discover Anime"
              actionHref="/discover"
            />
          ) : (
            <div className={styles.watchingGrid}>
              {history.map(item => {
                const percent = item.duration > 0 
                  ? Math.min(100, Math.round((item.playback_position / item.duration) * 100))
                  : 0;

                return (
                  <Link 
                    key={`${item.anime_id}-${item.episode}`}
                    href={`/watch/${item.anime_id}/${item.episode}`}
                    className={styles.watchingCard}
                  >
                    <img 
                      src={item.anime_image || "/placeholder-cover.svg"} 
                      alt={item.anime_title}
                      className={styles.watchingPoster}
                    />
                    <div className={styles.progressBarContainer}>
                      <div className={styles.progressBarFill} style={{ width: `${percent}%` }} />
                    </div>
                    <div className={styles.watchingBody}>
                      <h3 className={styles.watchingTitle}>{item.anime_title}</h3>
                      <div className={styles.watchingMeta}>
                        <span>Episode {item.episode}</span>
                        <span className={styles.resumeBadge}>
                          <Play size={12} fill="currentColor" />
                          Resume
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Watchlist Snapshot */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Bookmark size={20} color="var(--accent)" />
              My Watchlist
            </h2>
            <Link href="/watchlist" className={styles.viewAll}>
              View Full Watchlist <ArrowRight size={14} style={{ display: "inline", verticalAlign: "middle" }} />
            </Link>
          </div>

          {loading ? (
            <Skeleton width="100%" height="120px" borderRadius="14px" />
          ) : watchlist.length === 0 ? (
            <EmptyState
              title="Your Watchlist is Empty"
              description="Save anime titles to your watchlist to track your watching progress."
              actionLabel="Browse Popular Anime"
              actionHref="/discover"
            />
          ) : (
            <div className={styles.watchingGrid}>
              {watchlist.slice(0, 4).map(item => (
                <Link
                  key={item.anime_id}
                  href={`/anime/${item.anime_id}`}
                  className={styles.watchingCard}
                >
                  <img
                    src={item.anime_image || "/placeholder-cover.svg"}
                    alt={item.anime_title}
                    className={styles.watchingPoster}
                  />
                  <div className={styles.watchingBody}>
                    <h3 className={styles.watchingTitle}>{item.anime_title}</h3>
                    <div className={styles.watchingMeta}>
                      <span style={{ textTransform: "capitalize" }}>{item.status.replace("_", " ")}</span>
                      <span>Ep. {item.progress}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Quick Hub Portals */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Sparkles size={20} color="var(--accent)" />
              Explore the Platform
            </h2>
          </div>

          <div className={styles.quickGrid}>
            <Link href="/seasonal" className={styles.quickCard}>
              <div className={styles.quickIcon} style={{ color: "#38bdf8" }}>
                <Compass size={22} />
              </div>
              <div>
                <h4 className={styles.quickTitle}>Seasonal Catalog</h4>
                <p className={styles.quickDesc}>Browse current and upcoming seasons with full metadata.</p>
              </div>
            </Link>

            <Link href="/calendar" className={styles.quickCard}>
              <div className={styles.quickIcon} style={{ color: "#a855f7" }}>
                <Calendar size={22} />
              </div>
              <div>
                <h4 className={styles.quickTitle}>Airing Calendar</h4>
                <p className={styles.quickDesc}>Weekly broadcast schedule for simulcasts and releases.</p>
              </div>
            </Link>

            <Link href="/simulators/blackhole" className={styles.quickCard}>
              <div className={styles.quickIcon} style={{ color: "#a855f7" }}>
                <Orbit size={22} />
              </div>
              <div>
                <h4 className={styles.quickTitle}>Black Hole Simulator</h4>
                <p className={styles.quickDesc}>Interactive 3D relativistic simulation of a Kerr black hole.</p>
              </div>
            </Link>

            <Link href="/random" className={styles.quickCard}>
              <div className={styles.quickIcon} style={{ color: "#ec4899" }}>
                <Shuffle size={22} />
              </div>
              <div>
                <h4 className={styles.quickTitle}>Random Anime</h4>
                <p className={styles.quickDesc}>Roll the dice and find unexpected masterpieces instantly.</p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
