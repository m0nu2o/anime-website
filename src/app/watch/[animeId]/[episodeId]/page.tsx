import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import VideoPlayer from "@/components/VideoPlayer";
import { getAnimeById, getAnimeEpisodes, getAnimeStreamingLinks, getAnimeRelations } from "@/lib/api";
import { Episode } from "@/lib/api/types";
import { ChevronLeft, ChevronRight, Play, ExternalLink, Calendar, Film, Layers } from "lucide-react";
import styles from "./page.module.css";

import EpisodeComments from "@/components/EpisodeComments";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ animeId: string; episodeId: string }>;
}) {
  const resolved = await params;
  const anime = await getAnimeById(resolved.animeId);
  const title = anime?.title.english || anime?.title.romaji || "Anime";
  return {
    title: `Watch ${title} - Episode ${resolved.episodeId} | NextGen Anime`,
    description: `Stream Episode ${resolved.episodeId} of ${title}.`,
  };
}

export default async function WatchEpisodePage({
  params,
}: {
  params: Promise<{ animeId: string; episodeId: string }>;
}) {
  const resolved = await params;
  const anime = await getAnimeById(resolved.animeId);

  if (!anime) {
    notFound();
  }

  const [episodes, relations, streamingLinks] = await Promise.all([
    getAnimeEpisodes(anime.id),
    getAnimeRelations(anime.id),
    getAnimeStreamingLinks(anime.id),
  ]);

  // Dynamically detect current anime's true season label from title
  const currentTitleLower = (anime.title.english || anime.title.romaji || anime.title.native || "").toLowerCase();
  let currentSeasonLabel = "Season 1";
  const seasonMatch = currentTitleLower.match(/season\s*(\d+)/i) || currentTitleLower.match(/(\d+)(?:nd|rd|th|st)\s*season/i);
  if (seasonMatch) {
    currentSeasonLabel = `Season ${seasonMatch[1]}`;
  } else if (currentTitleLower.includes("final season")) {
    currentSeasonLabel = "Final Season";
  } else if (currentTitleLower.includes("part 3")) {
    currentSeasonLabel = "Season 3";
  } else if (currentTitleLower.includes("part 2")) {
    currentSeasonLabel = "Season 2";
  }

  const validRoles = ["prequel", "sequel", "parent", "side_story", "alternative_version"];
  const relatedSeasons = relations
    .filter(r => validRoles.includes(r.role?.toLowerCase()))
    .map((r, idx) => {
      let shortLabel = `Season ${idx + 2}`;
      const lower = r.anime.title.toLowerCase();
      if (lower.includes("season 2") || lower.includes("2nd season")) shortLabel = "Season 2";
      else if (lower.includes("season 3") || lower.includes("3rd season")) shortLabel = "Season 3";
      else if (lower.includes("season 4") || lower.includes("final season") || lower.includes("4th season")) shortLabel = "Final Season";
      else if (r.role === "prequel") shortLabel = "Prequel";
      else if (r.role === "sequel") shortLabel = `Season ${idx + 2}`;
      else if (r.role === "side_story") shortLabel = "Side Story";
      else if (r.anime.format === "MOVIE") shortLabel = "Movie";

      return {
        id: r.anime.id,
        title: r.anime.title,
        shortLabel,
        year: r.anime.year,
        isCurrent: false,
      };
    });

  const seasons = [
    {
      id: anime.id,
      title: anime.title.english || anime.title.romaji || "Current Season",
      shortLabel: currentSeasonLabel,
      year: anime.year,
      isCurrent: true,
    },
    ...relatedSeasons
  ].sort((a, b) => {
    if (a.year && b.year) return a.year - b.year;
    if (a.isCurrent) return -1;
    return 1;
  });

  const currentEpNum = parseInt(resolved.episodeId, 10) || 1;
  const currentEp: Episode = episodes.find((e) => e.number === currentEpNum) || {
    id: String(currentEpNum),
    number: currentEpNum,
    seasonNumber: 1,
    title: `Episode ${currentEpNum}`,
    synopsis: "",
    airdate: "",
  };

  const title = anime.title.english || anime.title.romaji || anime.title.native || "Anime";
  const totalEpisodes = episodes.length > 0 ? episodes.length : (anime.episodes || 1);
  const hasPrev = currentEpNum > 1;
  const hasNext = currentEpNum < totalEpisodes;

  return (
    <>
      <Navbar />
      <div className={`container ${styles.watchPage}`}>
        <BackButton label={`Back to ${title}`} fallbackUrl={`/anime/${anime.id}`} />
        {/* Breadcrumb */}
        <div className={styles.breadcrumb}>
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href={`/anime/${anime.id}`}>{title}</Link>
          <span>/</span>
          <span className={styles.currentCrumb}>{currentSeasonLabel} • Episode {currentEpNum}</span>
        </div>

        <div className={styles.layout}>
          {/* Main Video & Details */}
          <div className={styles.mainCol}>
            <VideoPlayer
              animeId={anime.id}
              animeTitle={title}
              episodeNumber={currentEpNum}
              totalEpisodes={totalEpisodes}
              youtubeVideoId={anime.youtubeVideoId}
              malId={anime.malId}
              anilistId={anime.anilistId}
            />

            <div className={styles.episodeMeta}>
              <div className={styles.titleRow}>
                <div>
                  <span className={styles.epBadge}>{currentSeasonLabel} • Episode {currentEpNum}</span>
                  <h1 className={styles.epTitle}>Episode {currentEpNum}: {currentEp?.title || `Episode ${currentEpNum}`}</h1>
                </div>

                <div className={styles.navButtons}>
                  <Link
                    href={`/watch/${anime.id}/${currentEpNum - 1}`}
                    className={`${styles.navBtn} ${!hasPrev ? styles.disabledNav : ""}`}
                    aria-disabled={!hasPrev}
                  >
                    <ChevronLeft size={18} /> Prev
                  </Link>
                  <Link
                    href={`/watch/${anime.id}/${currentEpNum + 1}`}
                    className={`${styles.navBtn} ${!hasNext ? styles.disabledNav : ""}`}
                    aria-disabled={!hasNext}
                  >
                    Next <ChevronRight size={18} />
                  </Link>
                </div>
              </div>

              {/* Synopsis */}
              <div className={styles.synopsisCard}>
                <h3>Episode Overview</h3>
                <p>{currentEp?.synopsis || "No detailed synopsis available for this episode."}</p>
                {currentEp?.airdate && (
                  <div className={styles.airdateInfo}>
                    <Calendar size={14} />
                    <span>Aired on {currentEp.airdate}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Episode Discussion Comments */}
            <EpisodeComments animeId={anime.id} episode={currentEpNum} />
          </div>

          {/* Sidebar: Episode Selector */}
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <div className={styles.sidebarTitle}>
                <Film size={18} />
                <span>Episodes ({totalEpisodes})</span>
              </div>

              {seasons.length > 1 && (
                <div className={styles.seasonSelector}>
                  <div className={styles.seasonSelectPills}>
                    {seasons.map((s) => {
                      const isCur = s.id === anime.id;
                      return (
                        <Link
                          key={s.id}
                          href={`/watch/${s.id}/1`}
                          className={`${styles.seasonPill} ${isCur ? styles.activeSeasonPill : ""}`}
                          title={`${s.shortLabel}: ${s.title}`}
                        >
                          {s.shortLabel}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.episodesList}>
              {episodes.length > 0 ? (
                episodes.map((ep) => {
                  const isActive = ep.number === currentEpNum;
                  return (
                    <Link
                      key={ep.id}
                      href={`/watch/${anime.id}/${ep.number}`}
                      className={`${styles.episodeItem} ${isActive ? styles.activeEpisode : ""}`}
                    >
                      <div className={styles.epThumbWrapper}>
                        <img
                          src={ep.thumbnail || anime.images.cover || "/placeholder-cover.svg"}
                          alt={ep.title}
                          className={styles.epThumb}
                        />
                        <div className={styles.epThumbOverlay}>
                          <Play size={16} fill="#fff" />
                        </div>
                      </div>
                      <div className={styles.epInfo}>
                        <div className={styles.epTop}>
                          <span className={styles.epNumText}>EP {ep.number}</span>
                        </div>
                        <h4 className={styles.epItemTitle}>{ep.title}</h4>
                      </div>
                    </Link>
                  );
                })
              ) : (
                Array.from({ length: totalEpisodes }).map((_, idx) => {
                  const epNum = idx + 1;
                  const isActive = epNum === currentEpNum;
                  return (
                    <Link
                      key={epNum}
                      href={`/watch/${anime.id}/${epNum}`}
                      className={`${styles.episodeItem} ${isActive ? styles.activeEpisode : ""}`}
                    >
                      <div className={styles.epThumbWrapper}>
                        <img
                          src={anime.images.cover || "/placeholder-cover.svg"}
                          alt={`Episode ${epNum}`}
                          className={styles.epThumb}
                        />
                        <div className={styles.epThumbOverlay}>
                          <Play size={16} fill="#fff" />
                        </div>
                      </div>
                      <div className={styles.epInfo}>
                        <span className={styles.epNumText}>Episode {epNum}</span>
                        <h4 className={styles.epItemTitle}>Episode {epNum}</h4>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
