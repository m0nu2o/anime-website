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
  Search
} from "lucide-react";
import AnimeRelationsGraph from "./AnimeRelationsGraph";
import AnimeReviews from "./AnimeReviews";
import styles from "./AnimeDetailTabs.module.css";
import { Anime, Episode, Character, StaffPerson, AnimeRelation, StreamingLink } from "@/lib/api/types";

interface AnimeDetailTabsProps {
  anime: Anime;
  episodes: Episode[];
  characters: Character[];
  staff: StaffPerson[];
  relations: AnimeRelation[];
  streamingLinks: StreamingLink[];
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
  coverUrl,
  title,
}: AnimeDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [episodeSearch, setEpisodeSearch] = useState("");
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);

  // Franchise multi-season extraction & chronological order
  const seasons: SeasonOption[] = React.useMemo(() => {
    const current: SeasonOption = {
      id: anime.id,
      title: title,
      shortLabel: "Season 1",
      year: anime.year,
      episodes: episodes.length > 0 ? episodes.length : anime.episodes,
      isCurrent: true,
    };

    const validRoles = ["prequel", "sequel", "parent", "side_story", "alternative_version"];
    const seasonRelations = relations.filter(r => validRoles.includes(r.role?.toLowerCase()));

    const relatedSeasons: SeasonOption[] = seasonRelations.map((r, idx) => {
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
  }, [anime, relations, title, episodes]);

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
  const displayedTotalEpisodes = currentSeasonEpisodes.length > 0 
    ? currentSeasonEpisodes.length 
    : (activeSeason?.episodes || (anime.episodes || 0));

  // Filter episodes by search
  const filteredEpisodes = currentSeasonEpisodes.filter((ep) => 
    String(ep.number).includes(episodeSearch) || 
    ep.title?.toLowerCase().includes(episodeSearch.toLowerCase())
  );

  const totalEpisodes = displayedTotalEpisodes;

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
          <span className={styles.tabBadge}>{totalEpisodes}</span>
        </button>

        <button
          onClick={() => setActiveTab("characters")}
          className={`${styles.tabBtn} ${activeTab === "characters" ? styles.activeTab : ""}`}
        >
          <Users size={15} />
          <span>Characters & Cast</span>
          <span className={styles.tabBadge}>{characters.length}</span>
        </button>

        {relations.length > 0 && (
          <button
            onClick={() => setActiveTab("relations")}
            className={`${styles.tabBtn} ${activeTab === "relations" ? styles.activeTab : ""}`}
          >
            <GitBranch size={15} />
            <span>Franchise</span>
            <span className={styles.tabBadge}>{relations.length}</span>
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
                  <div
                    className={styles.synopsisText}
                    dangerouslySetInnerHTML={{ __html: anime.description }}
                  />
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
                    <span className={styles.detailValue}>{totalEpisodes > 0 ? totalEpisodes : "Ongoing"}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Episode Duration</span>
                    <span className={styles.detailValue}>{anime.duration ? `${anime.duration} mins` : "Unknown"}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Status</span>
                    <span className={styles.detailValue}>{anime.status || "Finished Airing"}</span>
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
                <p>Start Episode 1 now with multi-server playback and subtitle options.</p>
                <Link href={`/watch/${anime.id}/1`} className={styles.startWatchingBtn}>
                  <Play size={16} fill="#fff" /> Watch Episode 1
                </Link>
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
                  Showing {filteredEpisodes.length} of {totalEpisodes} Episodes
                </span>
              </div>
            </div>

            {/* Episode Grid or Loading / Empty state */}
            {isLoadingSeasonEpisodes ? (
              <div className={styles.emptyCard}>
                <Clock size={36} className={styles.emptyIcon} />
                <h3>Loading {activeSeason.shortLabel} Episodes...</h3>
                <p>Retrieving authentic episode metadata and stream sync.</p>
              </div>
            ) : filteredEpisodes.length > 0 ? (
              <div className={styles.episodesGrid}>
                {filteredEpisodes.map((ep) => (
                  <Link
                    key={ep.id}
                    href={`/watch/${activeSeasonId}/${ep.number}`}
                    className={styles.epCard}
                  >
                    <div className={styles.epThumbWrap}>
                      <img
                        src={ep.thumbnail || coverUrl}
                        alt={ep.title}
                        className={styles.epThumb}
                      />
                      <div className={styles.epOverlay}>
                        <Play size={22} fill="#fff" />
                      </div>
                      <span className={styles.epNumPill}>EP {ep.number}</span>
                      <span className={styles.epLangBadge}>{preferredLanguage.toUpperCase()}</span>
                    </div>
                    <div className={styles.epDetails}>
                      <h4 className={styles.epCardTitle}>{ep.title}</h4>
                      {ep.airdate && <span className={styles.epAirdate}>{ep.airdate}</span>}
                      {ep.length && <span className={styles.epDuration}>{ep.length} mins</span>}
                    </div>
                  </Link>
                ))}
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
