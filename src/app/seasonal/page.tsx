import React from "react";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import AnimeCard from "@/components/AnimeCard";
import { getSeasonalAnime } from "@/lib/api";
import { Calendar, Snowflake, Sun, Flower2, Leaf } from "lucide-react";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata = {
  title: "Seasonal Anime | NextGen Anime",
  description: "Browse seasonal anime releases across Winter, Spring, Summer, and Fall.",
};

const SEASONS = [
  { name: "Winter", icon: <Snowflake size={16} /> },
  { name: "Spring", icon: <Flower2 size={16} /> },
  { name: "Summer", icon: <Sun size={16} /> },
  { name: "Fall", icon: <Leaf size={16} /> },
];

export default async function SeasonalPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; year?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const getCalculatedSeason = (month: number) => {
    if (month >= 0 && month <= 2) return "winter";
    if (month >= 3 && month <= 5) return "spring";
    if (month >= 6 && month <= 8) return "summer";
    return "fall";
  };
  const defaultYear = now.getFullYear();
  const defaultSeason = getCalculatedSeason(now.getMonth());

  const currentYear = params.year ? parseInt(params.year, 10) : defaultYear;
  const currentSeason = params.season ? params.season.toLowerCase() : defaultSeason;

  const animeList = await getSeasonalAnime(currentSeason, currentYear, 20);

  return (
    <>
      <Navbar />
      <div className={`container ${styles.seasonalPage}`}>
        <BackButton label="Back to Home" fallbackUrl="/" />
        <div className={styles.header}>
          <div className={styles.badge}>
            <Calendar size={14} /> Seasonal Broadcasts
          </div>
          <h1 className={styles.title}>
            {currentSeason.toUpperCase()} {currentYear} Anime
          </h1>
          <p className={styles.subtitle}>
            Explore every anime airing and premiering in the {currentSeason} {currentYear} season.
          </p>

          {/* Season Selector Tabs */}
          <div className={styles.seasonTabs}>
            {SEASONS.map((s) => {
              const isActive = currentSeason === s.name.toLowerCase();
              return (
                <Link
                  key={s.name}
                  href={`/seasonal?season=${s.name.toLowerCase()}&year=${currentYear}`}
                  className={`${styles.seasonTab} ${isActive ? styles.activeSeason : ""}`}
                >
                  {s.icon}
                  <span>{s.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Year Selector */}
          <div className={styles.yearRow}>
            {[2026, 2025, 2024, 2023, 2022].map((y) => (
              <Link
                key={y}
                href={`/seasonal?season=${currentSeason}&year=${y}`}
                className={`${styles.yearBtn} ${currentYear === y ? styles.activeYear : ""}`}
              >
                {y}
              </Link>
            ))}
          </div>
        </div>

        {/* Anime Grid */}
        {animeList.length > 0 ? (
          <div className={styles.grid}>
            {animeList.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <h3>No Anime Found For This Season</h3>
            <p>Schedules for this season have not yet been announced or verified.</p>
            <Link
              href="/discover"
              style={{ display: "inline-block", marginTop: "16px", padding: "10px 20px", background: "var(--primary, #6366f1)", color: "#fff", borderRadius: "8px", fontWeight: 600 }}
            >
              Explore Anime Catalog
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
