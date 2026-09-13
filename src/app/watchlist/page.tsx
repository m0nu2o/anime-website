"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Tabs, { TabItem } from "@/components/ui/Tabs";
import EmptyState from "@/components/ui/EmptyState";
import { Bookmark, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/supabase/AuthContext";
import { getWatchlist } from "@/lib/supabase/dal";
import { WatchlistItem } from "@/lib/supabase/types";
import AnimeCard from "@/components/AnimeCard";
import { Anime } from "@/lib/api/types";
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
    setLoading(true);
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

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

        {!user && !authLoading ? (
          <div style={{
            background: "rgba(99, 102, 241, 0.12)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            borderRadius: "12px",
            padding: "18px 22px",
            marginBottom: "24px",
            color: "#c7d2fe",
            fontSize: "0.95rem",
            textAlign: "center",
          }}>
            <p style={{ margin: 0 }}>Sign in to view and manage your watchlist.</p>
            <button
              onClick={openAuthModal}
              style={{
                background: "var(--primary, #6366f1)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                marginTop: "10px",
              }}
            >
              Sign In
            </button>
          </div>
        ) : null}

        {authLoading || loading ? (
          <div className={styles.loadingWrapper}>
            <Loader2 className="spinner" size={28} />
          </div>
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
                {filteredItems.map((item) => {
                  const animeObj: Anime = {
                    id: item.anime_id,
                    provider: item.anime_id.startsWith("anilist-") ? "anilist" : item.anime_id.startsWith("kitsu-") ? "kitsu" : "mal",
                    title: {
                      english: item.anime_title,
                      romaji: item.anime_title,
                    },
                    images: {
                      cover: item.anime_image || "/placeholder-cover.svg",
                      largeCover: item.anime_image || "/placeholder-cover.svg",
                    },
                    score: item.anime_score,
                    format: item.anime_format as any,
                  };
                  return (
                    <AnimeCard
                      key={item.id}
                      anime={animeObj}
                      onWatchlistToggle={() => loadWatchlist()}
                    />
                  );
                })}
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
