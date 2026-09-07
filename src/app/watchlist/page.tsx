"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Tabs, { TabItem } from "@/components/ui/Tabs";
import EmptyState from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/supabase/AuthContext";
import { getWatchlist, updateWatchlistStatus, removeFromWatchlist } from "@/lib/supabase/dal";
import { WatchlistItem, WatchlistStatus } from "@/lib/supabase/types";
import { Bookmark, Star, Trash2, Plus, Play, Loader2 } from "lucide-react";
import Link from "next/link";
import styles from "./page.module.css";

const WATCHLIST_TABS: TabItem[] = [
  { id: "all", label: "All Titles" },
  { id: "watching", label: "Watching" },
  { id: "completed", label: "Completed" },
  { id: "planning", label: "Plan to Watch" },
  { id: "on_hold", label: "On Hold" },
  { id: "dropped", label: "Dropped" },
];

export default function WatchlistPage() {
  const { user, loading: authLoading, openAuthModal } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const loadWatchlist = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getWatchlist(user.id);
      setItems(data);
    } catch (err) {
      console.warn("Failed to load watchlist:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadWatchlist();
    }
  }, [user, authLoading]);

  const handleStatusChange = async (animeId: string, newStatus: WatchlistStatus) => {
    if (!user) return;
    await updateWatchlistStatus(user.id, animeId, newStatus);
    setItems((prev) =>
      prev.map((item) => (item.anime_id === animeId ? { ...item, status: newStatus } : item))
    );
  };

  const handleProgressIncrement = async (animeId: string, currentProgress: number) => {
    if (!user) return;
    const newProg = currentProgress + 1;
    await updateWatchlistStatus(user.id, animeId, "watching", newProg);
    setItems((prev) =>
      prev.map((item) => (item.anime_id === animeId ? { ...item, progress: newProg } : item))
    );
  };

  const handleDelete = async (animeId: string) => {
    if (!user) return;
    await removeFromWatchlist(user.id, animeId);
    setItems((prev) => prev.filter((item) => item.anime_id !== animeId));
  };

  const filteredItems =
    activeTab === "all" ? items : items.filter((item) => item.status === activeTab);

  return (
    <>
      <Navbar />
      <div className={`container ${styles.watchlistPage}`}>
        <div className={styles.header}>
          <div className={styles.badge}>
            <Bookmark size={14} /> Personal Library
          </div>
          <h1 className={styles.title}>My Watchlist</h1>
          <p className={styles.subtitle}>
            Organize and track your watching progress, ratings, and anime queue.
          </p>
        </div>

        {authLoading ? (
          <div className={styles.loadingWrapper}>
            <Loader2 className="spinner" size={28} />
          </div>
        ) : !user ? (
          <EmptyState
            icon={<Bookmark size={36} />}
            title="Sign In to Access Your Watchlist"
            description="Create an account to save your anime progress, organize your catalog, and continue watching seamlessly on any device."
            actionText="Sign In / Register"
            onAction={openAuthModal}
          />
        ) : (
          <div className={styles.content}>
            <Tabs
              tabs={WATCHLIST_TABS.map((t) => ({
                ...t,
                count: t.id === "all" ? items.length : items.filter((i) => i.status === t.id).length,
              }))}
              activeTab={activeTab}
              onChange={setActiveTab}
            />

            {loading ? (
              <div className={styles.loadingWrapper}>
                <Loader2 className="spinner" size={28} />
              </div>
            ) : filteredItems.length > 0 ? (
              <div className={styles.itemsList}>
                {filteredItems.map((item) => (
                  <div key={item.id} className={styles.card}>
                    <Link href={`/anime/${item.anime_id}`} className={styles.posterWrapper}>
                      <img
                        src={item.anime_image || "/placeholder-cover.svg"}
                        alt={item.anime_title || "Anime"}
                        className={styles.poster}
                      />
                    </Link>

                    <div className={styles.details}>
                      <div className={styles.topRow}>
                        <Link href={`/anime/${item.anime_id}`} className={styles.itemTitle}>
                          {item.anime_title || "Untitled Anime"}
                        </Link>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(item.anime_id)}
                          title="Remove from watchlist"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className={styles.metaRow}>
                        {item.anime_format && <span className={styles.formatBadge}>{item.anime_format}</span>}
                        {item.anime_score && (
                          <span className={styles.scoreBadge}>
                            <Star size={12} fill="#facc15" color="#facc15" /> {(item.anime_score > 10 ? item.anime_score / 10 : item.anime_score).toFixed(1)}
                          </span>
                        )}
                      </div>

                      <div className={styles.actionsRow}>
                        {/* Status dropdown */}
                        <select
                          className={styles.statusSelect}
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.anime_id, e.target.value as WatchlistStatus)}
                        >
                          <option value="watching">Watching</option>
                          <option value="completed">Completed</option>
                          <option value="planning">Plan to Watch</option>
                          <option value="on_hold">On Hold</option>
                          <option value="dropped">Dropped</option>
                        </select>

                        {/* Progress counter */}
                        <div className={styles.progressCounter}>
                          <span>Episode {item.progress}</span>
                          <button
                            className={styles.incrementBtn}
                            onClick={() => handleProgressIncrement(item.anime_id, item.progress)}
                            title="Increment episode watched"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        {/* Watch link */}
                        <Link href={`/watch/${item.anime_id}/${item.progress || 1}`} className={styles.watchBtn}>
                          <Play size={13} fill="#fff" /> Resume
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Bookmark size={32} />}
                title="No Titles in this Category"
                description="Explore titles in the catalog and click the bookmark button on any card to add it to your watchlist."
                actionText="Discover Anime"
                actionHref="/discover"
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}
