import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import DetailActions from "@/components/DetailActions";
import AnimeDetailTabs from "@/components/AnimeDetailTabs";
import WatchlistStatusSelect from "@/components/WatchlistStatusSelect";
import FavoriteButton from "@/components/FavoriteButton";
import {
  getAnimeById,
  getAnimeEpisodes,
  getAnimeCharacters,
  getAnimeStaff,
  getAnimeRelations,
  getAnimeStreamingLinks,
} from "@/lib/api";
import { getFranchiseGraph } from "@/lib/api/franchise";
import { 
  Star, 
  Play, 
  Calendar, 
  Clock, 
  Building2, 
  Trophy, 
  Tv, 
  ShieldAlert,
  ChevronRight,
  Share2
} from "lucide-react";
import styles from "./page.module.css";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const anime = await getAnimeById(resolved.id);
  const title = anime?.title.english || anime?.title.romaji || "Anime Details";
  return {
    title: `${title} | NextGen Anime`,
    description: anime?.description?.slice(0, 160) || "Comprehensive anime details, streaming episodes, and cast.",
  };
}

export default async function AnimeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const anime = await getAnimeById(resolved.id);

  if (!anime) {
    notFound();
  }

  // Parallel data fetching for comprehensive metadata & unified franchise relations
  const [episodes, characters, staff, relations, streamingLinks, franchiseEntries] = await Promise.all([
    getAnimeEpisodes(anime.id, anime.title.english || anime.title.romaji, anime),
    getAnimeCharacters(anime.id),
    getAnimeStaff(anime.id),
    getAnimeRelations(anime.id),
    getAnimeStreamingLinks(anime.id),
    getFranchiseGraph(
      anime.id,
      anime.title.english || anime.title.romaji || "Anime",
      anime.anilistId,
      anime.year,
      anime.format
    ),
  ]);

  const title = anime.title.english || anime.title.romaji || anime.title.native || "Unknown Title";
  const subtitle = title !== anime.title.romaji ? anime.title.romaji : "";
  const nativeTitle = anime.title.native || "";
  const coverUrl = anime.images.largeCover || anime.images.cover || "/placeholder-cover.svg";
  const bannerUrl = anime.images.banner || anime.images.largeCover || coverUrl;
  
  const scoreFormatted = anime.score 
    ? (anime.score > 10 ? (anime.score / 10).toFixed(1) : anime.score.toFixed(1)) 
    : null;

  const studioName = anime.studios?.[0]?.name || (staff.find((s: any) => s.role.toLowerCase().includes("director") || s.role.toLowerCase().includes("studio"))?.name);
  const cleanDescription = (anime.description || "").replace(/<[^>]+>/g, "").trim();

  return (
    <>
      <Navbar />

      {/* Cinematic Ambient Banner */}
      <div className={styles.bannerContainer}>
        {bannerUrl && (
          <img src={bannerUrl} alt={title} className={styles.bannerImg} />
        )}
        <div className={styles.bannerOverlay} />
      </div>

      <div className={`container ${styles.pageContainer}`}>
        {/* Navigation & Breadcrumbs */}
        <div className={styles.topNavRow}>
          <BackButton label="Back to Browse" fallbackUrl="/discover" />
          
          <div className={styles.breadcrumbs}>
            <Link href="/">Home</Link>
            <ChevronRight size={14} />
            <Link href="/discover">Browse</Link>
            <ChevronRight size={14} />
            <span className={styles.currentCrumb}>{title}</span>
          </div>
        </div>

        {/* Hero Card Section */}
        <div className={styles.heroCard}>
          {/* Poster Column */}
          <div className={styles.posterColumn}>
            <div className={styles.posterWrapper}>
              <img src={coverUrl} alt={title} className={styles.posterImg} />
              {anime.status && (
                <span className={styles.statusBadge}>{anime.status}</span>
              )}
            </div>

            {/* Primary Watch Action */}
            <Link 
              href={`/watch/${anime.id}/1`}
              className={styles.primaryWatchBtn}
            >
              <Play size={18} fill="currentColor" /> Watch Episode 1
            </Link>
            
            {/* Quick Actions (Watchlist + Favorite) */}
            <div className={styles.actions}>
              <WatchlistStatusSelect anime={anime} />
              <FavoriteButton anime={anime} variant="detail" />
            </div>
          </div>

          {/* Details Column */}
          <div className={styles.heroDetails}>
            <div className={styles.titleBlock}>
              <h1 className={styles.mainTitle}>{title}</h1>
              <div className={styles.subtitleRow}>
                {subtitle && <span className={styles.romajiSubtitle}>{subtitle}</span>}
                {nativeTitle && <span className={styles.nativeSubtitle}>{nativeTitle}</span>}
              </div>
            </div>

            {/* Badges / Metrics Strip */}
            <div className={styles.metadataStrip}>
              {scoreFormatted && (
                <div className={styles.metaChip}>
                  <Star size={15} className={styles.accentGold} fill="currentColor" />
                  <span className={styles.metaChipValue}>{scoreFormatted}</span>
                </div>
              )}

              {anime.format && (
                <div className={styles.metaChip}>
                  <Tv size={15} className={styles.accentCyan} />
                  <span className={styles.metaChipValue}>{anime.format}</span>
                </div>
              )}

              {anime.year && (
                <div className={styles.metaChip}>
                  <Calendar size={15} />
                  <span>{anime.year}</span>
                </div>
              )}

              {anime.episodes && (
                <div className={styles.metaChip}>
                  <span>{anime.episodes} Episodes</span>
                </div>
              )}

              {studioName && (
                <div className={styles.metaChip}>
                  <Building2 size={15} />
                  <span>{studioName}</span>
                </div>
              )}
            </div>

            {/* Genres */}
            {anime.genres && anime.genres.length > 0 && (
              <div className={styles.genreRow}>
                {anime.genres.map((genre) => (
                  <Link 
                    key={genre} 
                    href={`/discover?genre=${genre.toLowerCase()}`}
                    className={styles.genrePill}
                  >
                    {genre}
                  </Link>
                ))}
              </div>
            )}

            {/* Synopsis Brief Preview (Clean Plain-Text Clamped, Safe from XSS) */}
            {cleanDescription && (
              <p className={styles.synopsisExcerpt}>
                {cleanDescription.length > 380 ? cleanDescription.slice(0, 380) + "..." : cleanDescription}
              </p>
            )}
          </div>
        </div>

        {/* Organized Tabbed Content */}
        <div className={styles.tabsSection}>
          <AnimeDetailTabs
            anime={anime}
            episodes={episodes}
            characters={characters}
            staff={staff}
            relations={relations}
            streamingLinks={streamingLinks}
            franchiseEntries={franchiseEntries}
            coverUrl={coverUrl}
            title={title}
          />
        </div>
      </div>
    </>
  );
}
