import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import VideoPlayer from "@/components/VideoPlayer";
import AnimeCard from "@/components/AnimeCard";
import { getAnimeById, getAnimeEpisodes, getAnimeRecommendations } from "@/lib/api";
import { getFranchiseGraph, FranchiseEntry } from "@/lib/api/franchise";
import { calculateLatestReleasedEpisode, normalizeEpisodeReleaseStatuses } from "@/lib/api/episodesCanonical";
import { ChevronLeft, ChevronRight, Play, Calendar, Film, Lock, GitBranch, Sparkles } from "lucide-react";
import styles from "./page.module.css";
import WatchlistStatusSelect from "@/components/WatchlistStatusSelect";
import FavoriteButton from "@/components/FavoriteButton";
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

  const [rawEpisodes, franchiseEntries, recommendations] = await Promise.all([
    getAnimeEpisodes(anime.id, anime.title.english || anime.title.romaji, anime),
    getFranchiseGraph(
      anime.id,
      anime.title.english || anime.title.romaji || "Anime",
      anime.anilistId,
      anime.year,
      anime.format
    ),
    getAnimeRecommendations(anime.id, 6),
  ]);

  const episodes = normalizeEpisodeReleaseStatuses(anime, rawEpisodes);
  const isFinished = anime.status?.toLowerCase().includes("finish") || anime.status?.toLowerCase().includes("complete");
  const latestReleasedNumber = calculateLatestReleasedEpisode(anime, episodes);

  // Filter released episodes strictly
  const releasedEpisodes = episodes
    .filter((ep) => {
      if (ep.number === null || ep.number === undefined) return false;
      return ep.status === "released";
    })
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

  const declaredTotal = typeof anime.episodes === "number" && anime.episodes > 0 ? anime.episodes : null;
  const parsedEp = parseInt(resolved.episodeId, 10);
  if (!Number.isFinite(parsedEp) || parsedEp <= 0) {
    notFound();
  }
  const currentEpNum = parsedEp;

  // Direct URL Protection: Episode must exist in the canonical episode list.
  // Never create phantom episodes, never query ReAnime or show Crunchyroll popup for non-existent episodes.
  if (episodes.length > 0 && !episodes.some((e) => e.number === currentEpNum)) {
    notFound();
  } else if (episodes.length === 0 && currentEpNum !== 1) {
    notFound();
  }

  const currentEp = episodes.find((e) => e.number === currentEpNum);
  // Canonical episode status is the single source of truth
  const isCurrentEpisodeUpcoming = currentEp?.status === "upcoming";

  const currentEntry = franchiseEntries.find(e => e.id === anime.id) || franchiseEntries.find(e => e.isCurrent) || franchiseEntries[0];
  const currentSeasonLabel = currentEntry?.seasonLabel || "Season 1";
  const currentPartLabel = currentEntry?.partLabel || null;

  interface SeasonGroup {
    seasonLabel: string;
    seasonNumber: number;
    year?: number;
    parts: FranchiseEntry[];
  }

  const seasonMap = new Map<string, SeasonGroup>();
  for (const entry of franchiseEntries) {
    const existing = seasonMap.get(entry.seasonLabel);
    if (!existing) {
      seasonMap.set(entry.seasonLabel, {
        seasonLabel: entry.seasonLabel,
        seasonNumber: entry.seasonNumber,
        year: entry.year,
        parts: [entry],
      });
    } else {
      if (!existing.parts.some(p => p.id === entry.id)) {
        existing.parts.push(entry);
      }
      if (!existing.year && entry.year) existing.year = entry.year;
    }
  }

  for (const group of seasonMap.values()) {
    group.parts.sort((a, b) => {
      if (a.partNumber && b.partNumber) return a.partNumber - b.partNumber;
      if (a.year && b.year) return a.year - b.year;
      return 0;
    });
  }

  const seasonsList = Array.from(seasonMap.values()).sort((a, b) => {
    if (a.seasonNumber !== b.seasonNumber) return a.seasonNumber - b.seasonNumber;
    if (a.year && b.year) return a.year - b.year;
    return 0;
  });

  const activeSeasonGroup = seasonsList.find(s => s.parts.some(p => p.id === anime.id)) || seasonsList[0];
  const hasMultiplePartsInActiveSeason = Boolean(
    activeSeasonGroup && activeSeasonGroup.parts.length > 1 && activeSeasonGroup.parts.some(p => Boolean(p.partLabel))
  );

  const currentEpIndex = currentEp ? releasedEpisodes.findIndex((e) => e.number === currentEpNum) : -1;
  const title = anime.title.english || anime.title.romaji || anime.title.native || "Anime";
  const totalEpisodes = releasedEpisodes.length > 0 ? releasedEpisodes.length : (declaredTotal || 1);

  const prevEpNumber = currentEpIndex > 0
    ? releasedEpisodes[currentEpIndex - 1].number
    : (currentEpIndex === -1 && releasedEpisodes.length > 0 ? releasedEpisodes[releasedEpisodes.length - 1].number : null);

  const nextEpNumber = (currentEpIndex >= 0 && currentEpIndex < releasedEpisodes.length - 1)
    ? releasedEpisodes[currentEpIndex + 1].number
    : null;

  const hasPrev = prevEpNumber !== null && prevEpNumber > 0;
  const hasNext = nextEpNumber !== null && nextEpNumber > 0;

  // Real episode list to display in selector
  const displayEpisodeList = episodes;

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
          <span className={styles.currentCrumb}>{currentSeasonLabel}{currentPartLabel ? ` • ${currentPartLabel}` : ""} • Episode {currentEpNum ?? "—"}</span>
        </div>

        {/* ================= ROW 1: PLAYER & EPISODES SIDEBAR ================= */}
        <div className={styles.dualGrid}>
          {/* Main Column: Video Player or Unreleased Notice & Metadata */}
          <div className={styles.playerCol}>
            {isCurrentEpisodeUpcoming ? (
              <div className={styles.unreleasedBanner}>
                <div className={styles.unreleasedCard}>
                  <div className={styles.unreleasedIconWrap}>
                    <Lock size={36} className={styles.unreleasedIcon} />
                  </div>
                  <h2>Episode {currentEpNum} Not Yet Released</h2>
                  <p>
                    This episode has not aired yet.
                    {currentEp?.airdate ? ` Scheduled broadcast: ${currentEp.airdate}.` : ""}
                    {" "}The latest released episode is Episode {latestReleasedNumber}.
                  </p>
                  <div className={styles.unreleasedCtaRow}>
                    <Link href={`/watch/${anime.id}/${latestReleasedNumber}`} className={styles.unreleasedPrimaryBtn}>
                      <Play size={16} fill="#fff" /> Watch Episode {latestReleasedNumber}
                    </Link>
                    <Link href={`/anime/${anime.id}`} className={styles.unreleasedSecondaryBtn}>
                      Back to Anime Overview
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <VideoPlayer
                animeId={anime.id}
                animeTitle={title}
                episodeNumber={currentEpNum ?? 1}
                totalEpisodes={totalEpisodes}
                nextEpisodeNumber={nextEpNumber}
                malId={anime.malId}
                anilistId={anime.anilistId}
              />
            )}

            {/* Episode Meta Bar */}
            <div className={styles.episodeMeta}>
              <div className={styles.titleRow}>
                <div>
                  <span className={styles.epBadge}>{currentSeasonLabel}{currentPartLabel ? ` • ${currentPartLabel}` : ""} • Episode {currentEpNum ?? "—"}</span>
                  <h1 className={styles.epTitle}>
                    Episode {currentEpNum ?? "—"}{currentEp?.title ? `: ${currentEp.title}` : ""}
                  </h1>
                </div>

                <div className={styles.navButtons}>
                  <WatchlistStatusSelect anime={anime} compact />
                  <FavoriteButton anime={anime} variant="compact" />
                  {hasPrev ? (
                    <Link
                      href={`/watch/${anime.id}/${prevEpNumber}`}
                      className={styles.navBtn}
                    >
                      <ChevronLeft size={18} /> Prev
                    </Link>
                  ) : (
                    <span
                      className={`${styles.navBtn} ${styles.disabledNav}`}
                      aria-disabled="true"
                    >
                      <ChevronLeft size={18} /> Prev
                    </span>
                  )}
                  {hasNext ? (
                    <Link
                      href={`/watch/${anime.id}/${nextEpNumber}`}
                      className={styles.navBtn}
                    >
                      Next <ChevronRight size={18} />
                    </Link>
                  ) : (
                    <span
                      className={`${styles.navBtn} ${styles.disabledNav}`}
                      aria-disabled="true"
                    >
                      Next <ChevronRight size={18} />
                    </span>
                  )}
                </div>
              </div>

              {/* Episode Synopsis */}
              <div className={styles.synopsisCard}>
                <h3>Episode Overview</h3>
                <p>
                  {currentEp?.synopsis ||
                    `Streaming Episode ${currentEpNum} of ${title}. High-definition servers and multi-audio tracks are available.`}
                </p>
                {currentEp?.airdate && (
                  <div className={styles.airdateInfo}>
                    <Calendar size={14} />
                    <span>Aired on {currentEp.airdate}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Episode Selector & Franchise Season Switcher */}
          <aside className={styles.episodesSidebar}>
            <div className={styles.sidebarHeader}>
              <div className={styles.sidebarTitleWrap}>
                <Film size={18} className={styles.accentRose} />
                <h3>Episodes ({displayEpisodeList.length > 0 ? displayEpisodeList.length : totalEpisodes})</h3>
              </div>
              <span className={styles.epCountNote}>
                {releasedEpisodes.length} Released
                {declaredTotal && declaredTotal > releasedEpisodes.length
                  ? ` • ${declaredTotal - releasedEpisodes.length} Upcoming`
                  : ""}
              </span>
            </div>

            {seasonsList.length > 1 && (
              <div className={styles.seasonSelectPills}>
                {seasonsList.map((s) => {
                  const isCurSeason = s.parts.some(p => p.id === anime.id);
                  const targetEntry = isCurSeason
                    ? (s.parts.find(p => p.id === anime.id) || s.parts[0])
                    : s.parts[0];
                  return (
                    <Link
                      key={s.seasonLabel}
                      href={`/watch/${targetEntry.id}/1`}
                      className={`${styles.seasonPill} ${isCurSeason ? styles.activeSeasonPill : ""}`}
                      title={s.seasonLabel}
                    >
                      {s.seasonLabel}
                    </Link>
                  );
                })}
              </div>
            )}

            {hasMultiplePartsInActiveSeason && activeSeasonGroup && (
              <div className={styles.partSelectPills}>
                <span className={styles.partGroupLabel}>Part / Cour:</span>
                {activeSeasonGroup.parts.map((p) => {
                  const isCurPart = p.id === anime.id;
                  return (
                    <Link
                      key={p.id}
                      href={`/watch/${p.id}/1`}
                      className={`${styles.partPill} ${isCurPart ? styles.activePartPill : ""}`}
                      title={p.title}
                    >
                      {p.partLabel || p.title}
                    </Link>
                  );
                })}
              </div>
            )}

            {displayEpisodeList.length > 0 ? (
              <div className={styles.episodesSidebarList}>
                {displayEpisodeList.map((ep) => {
                  const epNum = ep.number ?? 1;
                  const isCur = epNum === currentEpNum;
                  const isEpUpcoming = ep.status === "upcoming" || (!isFinished && ep.status !== "released" && epNum > latestReleasedNumber);

                  if (isEpUpcoming) {
                    return (
                      <div
                        key={ep.id}
                        className={`${styles.epCardSmall} ${styles.epCardSmallLocked}`}
                        title={`Episode ${epNum} is upcoming and not yet released.`}
                      >
                        <div className={styles.epThumbSmallWrap}>
                          <img
                            src={ep.thumbnail || anime.images.cover || "/placeholder-cover.svg"}
                            alt={ep.title || `Episode ${epNum}`}
                            className={styles.epThumbSmall}
                          />
                          <div className={styles.lockedSmallOverlay}>
                            <Lock size={14} />
                          </div>
                        </div>
                        <div className={styles.epSmallInfo}>
                          <span className={styles.epSmallNum}>EP {epNum}</span>
                          <span className={styles.epSmallStatus}>Upcoming</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={ep.id}
                      href={`/watch/${anime.id}/${epNum}`}
                      className={`${styles.epCardSmall} ${isCur ? styles.activeEpCardSmall : ""}`}
                    >
                      <div className={styles.epThumbSmallWrap}>
                        <img
                          src={ep.thumbnail || anime.images.cover || "/placeholder-cover.svg"}
                          alt={ep.title || `Episode ${epNum}`}
                          className={styles.epThumbSmall}
                        />
                        {isCur && (
                          <div className={styles.playingSmallOverlay}>
                            <Play size={14} fill="#fff" />
                          </div>
                        )}
                      </div>
                      <div className={styles.epSmallInfo}>
                        <span className={styles.epSmallNum}>EP {epNum}</span>
                        <span className={styles.epSmallTitle}>{ep.title || `Episode ${epNum}`}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptySidebarNotice}>
                No episodes indexed for this title yet.
              </div>
            )}
          </aside>
        </div>

        {/* ================= ROW 2: COMMENTS | RECOMMENDED ANIME ================= */}
        <div className={`${styles.dualGrid} ${styles.rowTwo}`}>
          {/* Main Column: Episode Comments */}
          <div className={styles.commentsCol}>
            <EpisodeComments animeId={anime.id} episode={currentEpNum ?? 1} />
          </div>

          {/* Right Column: Recommended Anime */}
          <aside className={styles.recommendedSidebar}>
            <div className={styles.sidebarHeader}>
              <div className={styles.sidebarTitleWrap}>
                <Sparkles size={18} className={styles.accentRose} />
                <h3>Recommended Anime</h3>
              </div>
            </div>

            <div className={styles.sidebarCardsList}>
              {recommendations.length > 0 ? (
                recommendations.slice(0, 6).map((rec) => (
                  <AnimeCard
                    key={rec.id}
                    anime={rec}
                    variant="horizontal"
                  />
                ))
              ) : (
                <div className={styles.emptySidebarNotice}>
                  Recommendations are being calculated for this anime.
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
