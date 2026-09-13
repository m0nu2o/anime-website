"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import EmptyState from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/supabase/AuthContext";
import { getFavorites, removeFavorite } from "@/lib/supabase/dal";
import { FavoriteItem } from "@/lib/supabase/types";
import { Heart, Loader2 } from "lucide-react";
import AnimeCard from "@/components/AnimeCard";
import { Anime } from "@/lib/api/types";
import styles from "./page.module.css";

export default function FavoritesPage() {
  const { user, loading: authLoading, openAuthModal } = useAuth();
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    setLoading(true);
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      const data = await getFavorites(user.id);
      setItems(data);
    } catch (err) {
      console.warn("Failed to load favorites:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadFavorites();
    }
  }, [user, authLoading]);

  const handleRemove = async (animeId: string) => {
    if (!user) return;
    await removeFavorite(user.id, animeId);
    setItems((prev) => prev.filter((item) => item.anime_id !== animeId));
  };

  return (
    <>
      <Navbar />
      <div className={`container ${styles.favoritesPage}`}>
        <div className={styles.header}>
          <div className={styles.badge}>
            <Heart size={14} /> Curated Collection
          </div>
          <h1 className={styles.title}>My Favorites</h1>
          <p className={styles.subtitle}>
            Your highest-rated, all-time beloved anime saved for quick access.
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
            <p style={{ margin: 0 }}>Sign in to view and manage your favorites.</p>
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
        ) : items.length > 0 ? (
          <div className={styles.grid}>
            {items.map((item) => {
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
                  onFavoriteToggle={(animeId, isFav) => {
                    if (!isFav) handleRemove(animeId);
                  }}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Heart size={32} />}
            title="No Favorites Saved Yet"
            description="Browse titles across the catalog and tap the heart icon on any anime page to add it to your favorites."
            actionText="Discover Anime"
            actionHref="/discover"
          />
        )}
      </div>
    </>
  );
}
