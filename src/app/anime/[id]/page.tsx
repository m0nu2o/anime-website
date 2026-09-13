import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import DetailActions from "@/components/DetailActions";
import AnimeDetailTabs from "@/components/AnimeDetailTabs";
import {
  getAnimeById,
  getAnimeEpisodes,
  getAnimeCharacters,
  getAnimeStaff,
  getAnimeRelations,
  getAnimeStreamingLinks,
} from "@/lib/api";
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

  // Parallel data fetching for comprehensive metadata
  const [episodes, characters, staff, relations, streamingLinks] = await Promise.all([
    getAnimeEpisodes(anime.id, anime.title.english || anime.title.romaji, anime),
    getAnimeCharacters(anime.id),
    getAnimeStaff(anime.id),
    getAnimeRelations(anime.id),
    getAnimeStreamingLinks(anime.id),
  ]);

  const title = anime.title.english || anime.title.romaji || anime.title.native || "Unknown Title";
  const subtitle = title !== anime.title.romaji ? anime.title.romaji : "";
  const nativeTitle = anime.title.native || "";
  const coverUrl = anime.images.largeCover || anime.images.cover || "/placeholder-cover.svg";
  const bannerUrl = anime.images.banner || anime.images.largeCover || coverUrl;
  
  const scoreFormatted = anime.score 
    ? (anime.score > 10 ? (anime.score / 10).toFixed(1) : anime.score.toFixed(1)) 
    : null;

  const studioName = anime.studios?.[0]?.name || (staff.find(s => s.role.toLowerCase().includes("director") || s.role.toLowerCase().includes("studio"))?.name);

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
            <span className={styles.activeCrumb}>{title}</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className={styles.heroCard}>
          {/* Left Column: Poster & Quick Action */}
          <div className={styles.posterColumn}>
            <div className={styles.posterWrapper}>
              <img src={coverUrl} alt={title} className={styles.posterImg} />
              <div className={styles.statusBadge}>
                {anime.status || "Finished Airing"}
              </div>
            </div>

            <Link href={`/watch/${anime.id}/1`} className={styles.primaryWatchBtn}>
              <Play size={18} fill="#fff" />
              <span>Watch Episode 1</span>
            </Link>

            <DetailActions
              trailerUrl={anime.trailerUrl}
              youtubeVideoId={anime.youtubeVideoId}
              anime={anime}
            />
          </div>

          {/* Right Column: Title & Structured Metadata */}
          <div className={styles.heroDetails}>
            <div className={styles.titleBlock}>
              <h1 className={styles.mainTitle}>{title}</h1>
              <div className={styles.subtitleRow}>
                {subtitle && <span className={styles.romajiSubtitle}>{subtitle}</span>}
                {nativeTitle && <span className={styles.nativeSubtitle}>{nativeTitle}</span>}
              </div>
            </div>

            {/* Uniform Labeled Metadata Chips */}
            <div className={styles.metadataStrip}>
              {scoreFormatted && (
                <div className={styles.metaChip} title="User Rating">
                  <Star size={14} fill="#facc15" color="#facc15" />
                  <span className={styles.metaChipValue}>{scoreFormatted}</span>
                  <span className={styles.metaChipLabel}>/ 10</span>
                </div>
              )}

              {anime.rank && (
                <div className={styles.metaChip} title="Popularity Rank">
                  <Trophy size={14} className={styles.accentGold} />
                  <span className={styles.metaChipValue}>#{anime.rank}</span>
                  <span className={styles.metaChipLabel}>Rank</span>
                </div>
              )}

              <div className={styles.metaChip} title="Broadcast Format">
                <Tv size={14} className={styles.accentCyan} />
                <span className={styles.metaChipValue}>{anime.format || anime.type || "TV Series"}</span>
              </div>

              {anime.duration ? (
                <div className={styles.metaChip} title="Duration per Episode">
                  <Clock size={14} />
                  <span className={styles.metaChipValue}>{anime.duration}m</span>
                  <span className={styles.metaChipLabel}>/ ep</span>
                </div>
              ) : null}

              {anime.year && (
                <div className={styles.metaChip} title="Release Season">
                  <Calendar size={14} />
                  <span className={styles.metaChipValue}>{anime.season ? `${anime.season} ` : ""}{anime.year}</span>
                </div>
              )}

              {studioName && (
                <div className={styles.metaChip} title="Animation Studio">
                  <Building2 size={14} className={styles.accentRose} />
                  <span className={styles.metaChipValue}>{studioName}</span>
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

            {/* Synopsis Brief Preview */}
            {anime.description && (
              <div 
                className={styles.synopsisExcerpt}
                dangerouslySetInnerHTML={{ 
                  __html: anime.description.length > 340 
                    ? anime.description.slice(0, 340) + "..." 
                    : anime.description 
                }}
              />
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
            coverUrl={coverUrl}
            title={title}
          />
        </div>
      </div>
    </>
  );
}
