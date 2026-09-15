"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Film, 
  Users, 
  UserCheck, 
  GitBranch, 
  MessageSquare, 
  ExternalLink, 
  Play, 
  Calendar, 
  Clock, 
  Tv, 
  Building2, 
  Info,
  Layers,
  Sparkles,
  Search,
  Lock
} from "lucide-react";
import AnimeRelationsGraph from "./AnimeRelationsGraph";
import AnimeReviews from "./AnimeReviews";
import styles from "./AnimeDetailTabs.module.css";
import { Anime, Episode, Character, StaffPerson, AnimeRelation, StreamingLink } from "@/lib/api/types";
import { parseCleanSeasonInfo } from "@/lib/api/franchise";

interface AnimeDetailTabsProps {
  anime: Anime;
  episodes: Episode[];
  characters: Character[];
  staff: StaffPerson[];
  relations: AnimeRelation[];
  streamingLinks: StreamingLink[];
  franchiseEntries?: import("@/lib/api/franchise").FranchiseEntry[];
  coverUrl: string;
  title: string;
}

type TabType = "overview" | "episodes" | "characters" | "relations" | "reviews";

interface SeasonOption {
  id: string;
  title: string;
  shortLabel: string;
  year?: number;
  episodes?: number;
  isCurrent: boolean;
}

export default function AnimeDetailTabs({
  anime,
  episodes,
  characters,
  staff,
  relations,
  streamingLinks,
  franchiseEntries,
  coverUrl,
  title,
}: AnimeDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [episodeSearch, setEpisodeSearch] = useState("");
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);

  // Franchise multi-season extraction & chronological order
  const seasons: SeasonOption[] = React.useMemo(() => {
    if (franchiseEntries && franchiseEntries.length > 0) {
      const seasonOnly = franchiseEntries.filter((fe) => fe.category === "season");
      if (seasonOnly.length > 0) {
        return seasonOnly.map((fe) => ({
          id: fe.id,
          title: fe.title,
          shortLabel: fe.partLabel ? `${fe.seasonLabel} (${fe.partLabel})` : fe.seasonLabel,
          year: fe.year,
          episodes: fe.episodes ?? undefined,
          isCurrent: Boolean(fe.isCurrent || fe.id === anime.id),
        }));
      }
    }

    const currentParsed = parseCleanSeasonInfo(title, 1);
    const current: SeasonOption = {
      id: anime.id,
      title: title,
      shortLabel: currentParsed.seasonLabel,
      year: anime.year,
      episodes: anime.episodes,
      isCurrent: true,
    };

    // Filter relations strictly for sequels / prequels of format TV
    const validRoles = ["prequel", "sequel"];
    const seasonRelations = relations.filter(
      r => validRoles.includes(r.role?.toLowerCase()) && r.anime.format !== "MOVIE"
    );

    const relatedSeasons: SeasonOption[] = seasonRelations.map((r) => {
      const parsed = parseCleanSeasonInfo(r.anime.title, 1);
      return {
        id: r.anime.id,
        title: r.anime.title,
        shortLabel: parsed.seasonLabel,
        year: r.anime.year,
        episodes: r.anime.episodes,
        isCurrent: false,
      };
    });

    const combined = [current, ...relatedSeasons];
    return combined.sort((a, b) => {
      if (a.year && b.year) return a.year - b.year;
      if (a.isCurrent) return -1;
      return 1;
    });
  }, [anime, relations, title, episodes, franchiseEntries]);

  // Franchise movies separated from TV series seasons
  const franchiseMovies = React.useMemo(() => {
    if (franchiseEntries && franchiseEntries.length > 0) {
      return franchiseEntries.filter((fe) => fe.category === "movie");
    }
    return relations
      .filter((r) => r.anime.format === "MOVIE" || r.role?.toLowerCase() === "movie")
      .map((r) => ({
        id: r.anime.id,
        title: r.anime.title,
        format: "MOVIE",
        category: "movie" as const,
        seasonNumber: 95,
        seasonLabel: "Movie",
        year: r.anime.year,
        episodes: r.anime.episodes ?? 1,
        isCurrent: r.anime.id === anime.id,
        coverImage: r.anime.image,
      }));
  }, [franchiseEntries, relations, anime.id]);

  const [activeSeasonId, setActiveSeasonId] = useState<string>(anime.id);
  const [seasonEpisodesMap, setSeasonEpisodesMap] = useState<Record<string, Episode[]>>({
    [anime.id]: episodes,
  });
  const [isLoadingSeasonEpisodes, setIsLoadingSeasonEpisodes] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState<"sub" | "dub">("sub");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  React.useEffect(() => {
    const saved = localStorage.getItem("preferredLanguage");
    if (saved === "dub" || saved === "sub") {
      setPreferredLanguage(saved);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleSwitchLanguage = (lang: "sub" | "dub") => {
    setPreferredLanguage(lang);
    localStorage.setItem("preferredLanguage", lang);
    if (lang === "dub") {
      showToast("Language set to Dub (auto-falls back to Sub if dub is unavailable)");
    } else {
      showToast("Language set to Sub");
    }
  };

  const handleSelectSeason = async (season: SeasonOption) => {
    setActiveSeasonId(season.id);
    if (season.id === anime.id) return;
    if (seasonEpisodesMap[season.id]) return;

    try {
      setIsLoadingSeasonEpisodes(true);
      const res = await fetch(`/api/anime/episodes?animeId=${season.id}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.episodes)) {
          setSeasonEpisodesMap(prev => ({
            ...prev,
            [season.id]: data.episodes,
          }));
        }
      }
    } catch (err) {
      console.warn("Failed to load season episodes", err);
    } finally {
      setIsLoadingSeasonEpisodes(false);
    }
  };

  const activeSeason = seasons.find(s => s.id === activeSeasonId) || seasons[0];
  const currentSeasonEpisodes = seasonEpisodesMap[activeSeasonId] || (activeSeasonId === anime.id ? episodes : []);
  const declaredTotalEpisodes = activeSeason?.episodes || (activeSeasonId === anime.id ? anime.episodes || null : null);
  const releasedEpisodeCount = currentSeasonEpisodes.filter((e) => e.status === "released").length;

  const effectiveEpisodeList = currentSeasonEpisodes;

  // Range chunking for long series (> 40 episodes)
  const [activeRangeIndex, setActiveRangeIndex] = useState(0);
  const totalEpisodeCount = effectiveEpisodeList.length;
  const chunkSize = totalEpisodeCount > 150 ? 100 : 50;

  const ranges = React.useMemo(() => {
    if (totalEpisodeCount <= 40) return [];
    const res: { start: number; end: number; label: string }[] = [];
    for (let start = 1; start <= totalEpisodeCount; start += chunkSize) {
      const end = Math.min(start + chunkSize - 1, totalEpisodeCount);
      res.push({ start, end, label: `${start}–${end}` });
    }
    return res;
  }, [totalEpisodeCount, chunkSize]);

  React.useEffect(() => {
    setActiveRangeIndex(0);
  }, [activeSeasonId]);

  // Filter episodes by search
  const filteredEpisodes = effectiveEpisodeList.filter((ep) =>
    String(ep.number ?? "").includes(episodeSearch) ||
    ep.title?.toLowerCase().includes(episodeSearch.toLowerCase())
  );

  const displayedEpisodes = React.useMemo(() => {
    if (episodeSearch.trim()) return filteredEpisodes;
    if (ranges.length > 0 && ranges[activeRangeIndex]) {
      const { start, end } = ranges[activeRangeIndex];
      return filteredEpisodes.filter((ep) => {
        const num = ep.number ?? 0;
        return num >= start && num <= end;
      });
    }
    return filteredEpisodes;
  }, [filteredEpisodes, episodeSearch, ranges, activeRangeIndex]);

  const totalEpisodes = declaredTotalEpisodes;
  const firstReleasedEpisode = effectiveEpisodeList.find((ep) => typeof ep.number === "number" && ep.status !== "upcoming");
  const playableEpisodes = displayedEpisodes.filter(
    (ep): ep is (typeof displayedEpisodes)[number] & { number: number } =>
      typeof ep.number === "number"
  );

  return (
    <div className={styles.container}>
      {/* Navigation Tab Bar */}
      <div className={styles.tabBar}>
        <button
          onClick={() => setActiveTab("overview")}
          className={`${styles.tabBtn} ${activeTab === "overview" ? styles.activeTab : ""}`}
        >
          <Info size={15} />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("episodes")}
          className={`${styles.tabBtn} ${activeTab === "episodes" ? styles.activeTab : ""}`}
        >
          <Film size={15} />
          <span>Episodes</span>
          <span className={styles.tabBadge}>
            {totalEpisodes && totalEpisodes > 0
              ? totalEpisodes
              : releasedEpisodeCount > 0
              ? releasedEpisodeCount
              : "—"}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("characters")}
          className={`${styles.tabBtn} ${activeTab === "characters" ? styles.activeTab : ""}`}
        >
          <Users size={15} />
          <span>Characters & Cast</span>
          <span className={styles.tabBadge}>{characters.length}</span>
        </button>

        {(relations.length > 0 || (franchiseEntries && franchiseEntries.length > 1)) && (
          <button
            onClick={() => setActiveTab("relations")}
            className={`${styles.tabBtn} ${activeTab === "relations" ? styles.activeTab : ""}`}
          >
            <GitBranch size={15} />
            <span>Franchise</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab("reviews")}
          className={`${styles.tabBtn} ${activeTab === "reviews" ? styles.activeTab : ""}`}
        >
          <MessageSquare size={15} />
          <span>Community Reviews</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className={styles.tabContent}>
        {/* ================= OVERVIEW TAB ================= */}
        {activeTab === "overview" && (
          <div className={styles.overviewLayout}>
            <div className={styles.overviewMain}>
              {/* Synopsis Section */}
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Synopsis</h3>
                {anime.description ? (
                  <div className={styles.synopsisText}>
                    {anime.description.replace(/<[^>]+>/g, "")}
                  </div>
                ) : (
                  <p className={styles.mutedText}>No detailed synopsis provided for this anime.</p>
                )}
              </div>

              {/* Official Trailer Section */}
              {anime.youtubeVideoId && (
                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>Official Trailer & Preview</h3>
                  <div className={styles.trailerWrapper}>
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${anime.youtubeVideoId}?rel=0&modestbranding=1`}
                      title={`${title} Official Trailer`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className={styles.trailerIframe}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Metadata Sidebar */}
            <div className={styles.overviewSidebar}>
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Anime Details</h3>
                <div className={styles.detailRows}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Format</span>
                    <span className={styles.detailValue}>{anime.format || anime.type || "TV Series"}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Episodes</span>
                    <span className={styles.detailValue}>
                      {totalEpisodes && totalEpisodes > 0
                        ? totalEpisodes
                        : releasedEpisodeCount > 0
                        ? `${releasedEpisodeCount} released`
                        : "Unavailable"}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Episode Duration</span>
                    <span className={styles.detailValue}>{anime.duration ? `${anime.duration} mins` : "Unavailable"}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Status</span>
                    <span className={styles.detailValue}>{anime.status || "Unavailable"}</span>
                  </div>
                  {anime.season && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Season</span>
                      <span className={styles.detailValue}>{anime.season} {anime.year}</span>
                    </div>
                  )}
                  {anime.studios && anime.studios.length > 0 && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Studio</span>
                      <span className={styles.detailValue}>{anime.studios.map(s => s.name).join(", ")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Jump to Stream */}
              <div className={`${styles.card} ${styles.streamCtaCard}`}>
                <h4>Ready to Stream?</h4>
                {firstReleasedEpisode ? (
                  <>
                    <p>Start Episode {firstReleasedEpisode.number} now with multi-server playback and subtitle options.</p>
                    <Link href={`/watch/${anime.id}/${firstReleasedEpisode.number}`} className={styles.startWatchingBtn}>
                      <Play size={16} fill="#fff" /> Watch Episode {firstReleasedEpisode.number}
                    </Link>
                  </>
                ) : (
                  <p>Episodes are not yet available from verified provider records.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= EPISODES TAB ================= */}
        {activeTab === "episodes" && (
          <div className={styles.episodesTab}>
            {/* Multi-Season Selector Tabs */}
            {seasons.length > 1 && (
              <div className={styles.seasonSelectorRow}>
                <div className={styles.seasonLabel}>Franchise Seasons:</div>
                <div className={styles.seasonTabs}>
                  {seasons.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSeason(s)}
                      className={`${styles.seasonTabBtn} ${activeSeasonId === s.id ? styles.activeSeasonTab : ""}`}
                    >
                      <span className={styles.seasonTabTitle}>{s.shortLabel}</span>
                      <span className={styles.seasonTabMeta}>
                        {s.year ? `${s.year} • ` : ""}{s.episodes ? `${s.episodes} eps` : "Season"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dedicated Theatrical Movies Row */}
            {franchiseMovies.length > 0 && (
              <div className={styles.moviesSelectorRow}>
                <div className={styles.seasonLabel}>Theatrical Movies:</div>
                <div className={styles.moviesList}>
                  {franchiseMovies.map((m) => (
                    <Link
                      key={m.id}
                      href={`/anime/${m.id}`}
                      className={`${styles.movieCardPill} ${m.isCurrent ? styles.activeMovieCardPill : ""}`}
                    >
                      <Film size={14} className={styles.movieIcon} />
                      <span className={styles.moviePillTitle}>{m.title}</span>
                      {m.year && <span className={styles.moviePillYear}>({m.year})</span>}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Notification Toast */}
            {toastMessage && (
              <div className={styles.toastBanner}>
                <Sparkles size={16} />
                <span>{toastMessage}</span>
              </div>
            )}

            {/* Active Season Banner if viewing another season */}
            {activeSeasonId !== anime.id && (
              <div className={styles.activeSeasonBanner}>
                <div>
                  Viewing episodes for <strong>{activeSeason.shortLabel}: {activeSeason.title}</strong>
                </div>
                <Link href={`/anime/${activeSeasonId}`} className={styles.seasonBannerLink}>
                  <span>Go to Season Overview</span>
                  <ExternalLink size={14} />
                </Link>
              </div>
            )}

            {/* Episode Search & Controls */}
            <div className={styles.episodeControls}>
              <div className={styles.epSearchWrap}>
                <Search size={16} className={styles.epSearchIcon} />
                <input
                  type="text"
                  placeholder={`Search ${activeSeason.shortLabel} episodes...`}
                  value={episodeSearch}
                  onChange={(e) => setEpisodeSearch(e.target.value)}
                  className={styles.epSearchInput}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                {/* Language (SUB / DUB) Toggle */}
                <div className={styles.langToggleWrap}>
                  <button
                    onClick={() => handleSwitchLanguage("sub")}
                    className={`${styles.langBtn} ${preferredLanguage === "sub" ? styles.activeLang : ""}`}
                  >
                    SUB
                  </button>
                  <button
                    onClick={() => handleSwitchLanguage("dub")}
                    className={`${styles.langBtn} ${preferredLanguage === "dub" ? styles.activeLang : ""}`}
                  >
                    DUB
                  </button>
                </div>

                <span className={styles.epCountLabel}>
                  {totalEpisodes && totalEpisodes > 0
                    ? `Showing ${filteredEpisodes.length} of ${totalEpisodes} Episodes`
                    : `Showing ${filteredEpisodes.length} Episode${filteredEpisodes.length === 1 ? "" : "s"}`}
                </span>
              </div>
            </div>

            {/* Range Pagination Tabs for long anime */}
            {ranges.length > 1 && !episodeSearch.trim() && (
              <div style={{ display: "flex", gap: "8px", overflowX: "auto", padding: "2px 0 14px 0", width: "100%", scrollbarWidth: "thin" }}>
                {ranges.map((range, idx) => {
                  const isActive = idx === activeRangeIndex;
                  return (
                    <button
                      key={range.label}
                      onClick={() => setActiveRangeIndex(idx)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "8px",
                        border: isActive ? "1px solid rgba(168, 85, 247, 0.6)" : "1px solid rgba(255, 255, 255, 0.1)",
                        background: isActive ? "linear-gradient(135deg, rgba(168, 85, 247, 0.35), rgba(139, 92, 246, 0.2))" : "rgba(255, 255, 255, 0.04)",
                        color: isActive ? "#fff" : "#94a3b8",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        boxShadow: isActive ? "0 0 12px rgba(168, 85, 247, 0.3)" : "none",
                        transition: "all 0.2s ease"
                      }}
                    >
                      {range.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Episode Grid or Loading / Empty state */}
            {isLoadingSeasonEpisodes ? (
              <div className={styles.emptyCard}>
                <Clock size={36} className={styles.emptyIcon} />
                <h3>Loading {activeSeason.shortLabel} Episodes...</h3>
                <p>Retrieving authentic episode metadata and stream sync.</p>
              </div>
            ) : displayedEpisodes.length > 0 ? (
              <div className={styles.episodesGrid}>
                {displayedEpisodes.map((ep) => {
                  const isUpcoming = ep.status === "upcoming";
                  if (isUpcoming) {
                    return (
                      <div
                        key={ep.id}
                        className={`${styles.epCard} ${styles.epCardLocked}`}
                        title={`Episode ${ep.number ?? "—"} is upcoming and not yet released.`}
                      >
                        <div className={styles.epThumbWrap}>
                          <img
                            src={ep.thumbnail || coverUrl}
                            alt={ep.title || "Episode"}
                            className={`${styles.epThumb} ${styles.epThumbLocked}`}
                          />
                          <div className={styles.epLockedOverlay}>
                            <Lock size={20} />
                            <span className={styles.lockedPill}>Upcoming</span>
                          </div>
                          <span className={styles.epNumPill}>EP {ep.number ?? "—"}</span>
                        </div>
                        <div className={styles.epDetails}>
                          <h4 className={styles.epCardTitle}>{ep.title}</h4>
                          <span className={styles.epAirdate}>
                            {ep.airdate ? `Scheduled: ${ep.airdate}` : "Airdate TBA"}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={ep.id}
                      href={`/watch/${activeSeasonId}/${ep.number}`}
                      className={styles.epCard}
                    >
                      <div className={styles.epThumbWrap}>
                        <img
                          src={ep.thumbnail || coverUrl}
                          alt={ep.title || "Episode"}
                          className={styles.epThumb}
                        />
                        <div className={styles.epOverlay}>
                          <Play size={22} fill="#fff" />
                        </div>
                        <span className={styles.epNumPill}>EP {ep.number ?? "—"}</span>
                        <span className={styles.epLangBadge}>{preferredLanguage.toUpperCase()}</span>
                      </div>
                      <div className={styles.epDetails}>
                        <h4 className={styles.epCardTitle}>{ep.title}</h4>
                        {ep.airdate && <span className={styles.epAirdate}>{ep.airdate}</span>}
                        {ep.length && <span className={styles.epDuration}>{ep.length} mins</span>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyCard}>
                <Film size={36} className={styles.emptyIcon} />
                <h3>No Episodes Found</h3>
                <p>Launch the direct episode stream viewer below:</p>
                <Link href={`/watch/${activeSeasonId}/1`} className={styles.startWatchingBtn}>
                  Launch Episode 1 Stream
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ================= CHARACTERS & CAST TAB ================= */}
        {activeTab === "characters" && (
          <div className={styles.charactersTab}>
            {characters.length > 0 ? (
              <div className={styles.charactersGrid}>
                {characters.map((char) => (
                  <Link
                    key={char.id}
                    href={`/character/${char.id}`}
                    className={styles.charCard}
                  >
                    <div className={styles.charAvatarWrap}>
                      <img
                        src={char.image || "/placeholder-cover.svg"}
                        alt={char.name}
                        className={styles.charAvatar}
                      />
                    </div>
                    <div className={styles.charInfo}>
                      <h4 className={styles.charName}>{char.name}</h4>
                      {char.nativeName && <span className={styles.charNative}>{char.nativeName}</span>}
                      <span className={styles.charRoleBadge}>{char.role || "Main Character"}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.emptyCard}>
                <Users size={36} className={styles.emptyIcon} />
                <h3>Character List Not Available</h3>
                <p>Cast metadata for this anime is being updated from network records.</p>
              </div>
            )}

            {/* Production Staff */}
            {staff.length > 0 && (
              <div style={{ marginTop: "36px" }}>
                <h3 className={styles.cardTitle} style={{ marginBottom: "16px" }}>Production Staff</h3>
                <div className={styles.staffGrid}>
                  {staff.map((person) => (
                    <Link
                      key={person.id}
                      href={`/staff/${person.id}`}
                      className={styles.staffCard}
                    >
                      <img
                        src={person.image || "/placeholder-cover.svg"}
                        alt={person.name}
                        className={styles.staffAvatar}
                      />
                      <div className={styles.staffInfo}>
                        <h4 className={styles.staffName}>{person.name}</h4>
                        <span className={styles.staffRole}>{person.role}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= FRANCHISE RELATIONS TAB ================= */}
        {activeTab === "relations" && (
          <div className={styles.relationsTab}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Franchise & Story Chronology</h3>
              <AnimeRelationsGraph relations={relations} currentAnimeTitle={title} />
            </div>
          </div>
        )}

        {/* ================= REVIEWS TAB ================= */}
        {activeTab === "reviews" && (
          <div className={styles.reviewsTab}>
            <AnimeReviews
              animeId={anime.id}
              animeTitle={title}
              defaultScore={anime.score}
            />
          </div>
        )}
      </div>
    </div>
  );
}
