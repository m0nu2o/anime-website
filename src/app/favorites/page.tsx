"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import EmptyState from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/supabase/AuthContext";
import { getFavorites, toggleFavorite } from "@/lib/supabase/dal";
import { FavoriteItem } from "@/lib/supabase/types";
import { Heart, Star, Trash2, Play, Loader2 } from "lucide-react";
import Link from "next/link";
import styles from "./page.module.css";

export default function FavoritesPage() {
  const { user, loading: authLoading, openAuthModal } = useAuth();
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
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
    await toggleFavorite(user.id, { id: animeId, title: {}, images: {} } as any);
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

        {authLoading ? (
          <div className={styles.loadingWrapper}>
            <Loader2 className="spinner" size={28} />
          </div>
        ) : !user ? (
          <EmptyState
            icon={<Heart size={36} />}
            title="Sign In to Save Your Favorites"
            description="Log in to build your personal anime hall of fame and keep your top series accessible anywhere."
            actionText="Sign In / Register"
            onAction={openAuthModal}
          />
        ) : loading ? (
          <div className={styles.loadingWrapper}>
            <Loader2 className="spinner" size={28} />
          </div>
        ) : items.length > 0 ? (
          <div className={styles.grid}>
            {items.map((item) => (
              <div key={item.id} className={styles.favCard}>
                <Link href={`/anime/${item.anime_id}`} className={styles.posterWrap}>
                  <img
                    src={item.anime_image || "/placeholder-cover.svg"}
                    alt={item.anime_title || "Anime"}
                    className={styles.poster}
                  />
                  <div className={styles.overlay}>
                    <Play size={24} fill="#fff" />
                  </div>
                </Link>

                <div className={styles.cardBody}>
                  <div className={styles.topInfo}>
                    <Link href={`/anime/${item.anime_id}`} className={styles.titleLink}>
                      {item.anime_title || "Untitled Anime"}
                    </Link>
                    <button
                      className={styles.removeBtn}
                      onClick={() => handleRemove(item.anime_id)}
                      title="Remove from favorites"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className={styles.metaRow}>
                    {item.anime_format && <span className={styles.formatTag}>{item.anime_format}</span>}
                    {item.anime_score && (
                      <span className={styles.scoreTag}>
                        <Star size={12} fill="#facc15" color="#facc15" /> {(item.anime_score > 10 ? item.anime_score / 10 : item.anime_score).toFixed(1)}
                      </span>
                    )}
                  </div>

                  <Link href={`/anime/${item.anime_id}`} className={styles.viewBtn}>
                    View Anime Details
                  </Link>
                </div>
              </div>
            ))}
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
