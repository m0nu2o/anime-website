"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import { Anime } from "@/lib/api/types";
import { getRandomAnime } from "@/lib/api";
import Link from "next/link";
import { Shuffle, Play, Info, Star, Calendar, Tv } from "lucide-react";
import styles from "./page.module.css";
import Skeleton from "@/components/ui/Skeleton";

export default function RandomAnimePage() {
  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRolling, setIsRolling] = useState(false);

  const fetchRandom = async () => {
    setIsRolling(true);
    setLoading(true);
    try {
      const result = await getRandomAnime();
      setAnime(result);
    } catch (err) {
      console.error("Failed to roll random anime:", err);
    } finally {
      setTimeout(() => {
        setIsRolling(false);
        setLoading(false);
      }, 400);
    }
  };

  useEffect(() => {
    fetchRandom();
  }, []);

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <BackButton label="Back to Home" fallbackUrl="/" />
        <div className={styles.header}>
          <h1 className={styles.title}>Random Anime Roulette</h1>
          <p className={styles.subtitle}>
            Cannot decide what to watch next? Let fate pick a verified anime title for you.
          </p>
        </div>

        {loading && !anime ? (
          <div className={styles.card} style={{ padding: "40px" }}>
            <Skeleton width="100%" height="240px" borderRadius="16px" style={{ marginBottom: "20px" }} />
            <Skeleton width="60%" height="32px" style={{ marginBottom: "12px" }} />
            <Skeleton width="90%" height="20px" />
          </div>
        ) : anime ? (
          <div className={styles.card}>
            <div style={{ position: "relative" }}>
              <img 
                src={anime.images.banner || anime.images.largeCover || anime.images.cover} 
                alt={anime.title.english || anime.title.romaji}
                className={styles.banner}
              />
              <div className={styles.bannerGradient} />
            </div>

            <div className={styles.body}>
              <div className={styles.posterWrapper}>
                <img 
                  src={anime.images.largeCover || anime.images.cover} 
                  alt={anime.title.english || anime.title.romaji}
                  className={styles.poster}
                />
              </div>

              <div className={styles.info}>
                <div className={styles.metaRow}>
                  <span className={styles.badge}>{anime.format || "TV"}</span>
                  {anime.score && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.85rem", color: "#fbbf24", fontWeight: 700 }}>
                      <Star size={14} fill="currentColor" /> {anime.score}%
                    </span>
                  )}
                  {anime.year && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      <Calendar size={14} /> {anime.year}
                    </span>
                  )}
                  {anime.episodes && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      <Tv size={14} /> {anime.episodes} Ep.
                    </span>
                  )}
                </div>

                <h2 className={styles.animeTitle}>
                  {anime.title.english || anime.title.romaji}
                </h2>

                <p className={styles.synopsis}>
                  {anime.description 
                    ? anime.description.replace(/<[^>]*>?/gm, "") 
                    : "No synopsis available for this title."}
                </p>

                <div className={styles.actions}>
                  <Link href={`/watch/${anime.id}`} className={styles.primaryBtn}>
                    <Play size={16} fill="currentColor" /> Watch Now
                  </Link>
                  <Link href={`/anime/${anime.id}`} className={styles.secondaryBtn}>
                    <Info size={16} /> View Details
                  </Link>
                  <button 
                    onClick={fetchRandom} 
                    className={styles.rerollBtn}
                    disabled={isRolling}
                  >
                    <Shuffle size={16} className={isRolling ? styles.spinning : ""} />
                    {isRolling ? "Rolling..." : "Roll Again"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p>Could not fetch a random title. Please try again.</p>
            <button onClick={fetchRandom} className={styles.rerollBtn} style={{ marginTop: "16px" }}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </>
  );
}
