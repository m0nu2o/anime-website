"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import { Anime } from "@/lib/api/types";
import { getPopularAnime, searchAnime, getAnimeById } from "@/lib/api";
import Link from "next/link";
import { 
  ArrowLeftRight, 
  Search, 
  Trophy, 
  Play, 
  Info, 
  X,
  Sparkles
} from "lucide-react";
import styles from "./page.module.css";
import Skeleton from "@/components/ui/Skeleton";

export default function ComparePage() {
  const [anime1, setAnime1] = useState<Anime | null>(null);
  const [anime2, setAnime2] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);

  // Search Modal state
  const [modalSlot, setModalSlot] = useState<1 | 2 | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Anime[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    async function loadDefaults() {
      setLoading(true);
      try {
        const popular = await getPopularAnime(10);
        if (popular.length >= 2) {
          setAnime1(popular[0]);
          setAnime2(popular[1]);
        }
      } catch (err) {
        console.error("Failed to load initial compare anime:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDefaults();
  }, []);

  const openSearchForSlot = (slot: 1 | 2) => {
    setModalSlot(slot);
    setSearchQuery("");
    setSearchResults([]);
  };

  const closeSearch = () => {
    setModalSlot(null);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    try {
      const results = await searchAnime(searchQuery.trim(), 8);
      setSearchResults(results);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectAnime = (anime: Anime) => {
    if (modalSlot === 1) {
      setAnime1(anime);
    } else if (modalSlot === 2) {
      setAnime2(anime);
    }
    closeSearch();
  };

  const score1 = anime1?.score || 0;
  const score2 = anime2?.score || 0;

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <BackButton label="Back to Home" fallbackUrl="/" />
        <div className={styles.header}>
          <h1 className={styles.title}>Anime Comparison Matrix</h1>
          <p className={styles.subtitle}>
            Analyze scores, episode counts, release dates, and production details side-by-side.
          </p>
        </div>

        {loading ? (
          <div className={styles.compareTableWrapper}>
            <Skeleton width="100%" height="400px" borderRadius="16px" />
          </div>
        ) : (
          <div className={styles.compareTableWrapper}>
            <table className={styles.compareTable}>
              <thead>
                <tr>
                  <th className={styles.rowLabel}>Metric</th>
                  <th className={styles.slotHeader}>
                    {anime1 ? (
                      <div>
                        <div className={styles.posterWrapper}>
                          <img 
                            src={anime1.images.cover || "/placeholder-cover.svg"} 
                            alt={anime1.title.english || anime1.title.romaji} 
                            className={styles.poster}
                          />
                        </div>
                        <h2 className={styles.animeTitle}>
                          {anime1.title.english || anime1.title.romaji}
                        </h2>
                        <button onClick={() => openSearchForSlot(1)} className={styles.searchSlotBtn}>
                          Change Anime
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => openSearchForSlot(1)} className={styles.searchSlotBtn}>
                        Select Anime 1
                      </button>
                    )}
                  </th>
                  <th className={styles.slotHeader}>
                    {anime2 ? (
                      <div>
                        <div className={styles.posterWrapper}>
                          <img 
                            src={anime2.images.cover || "/placeholder-cover.svg"} 
                            alt={anime2.title.english || anime2.title.romaji} 
                            className={styles.poster}
                          />
                        </div>
                        <h2 className={styles.animeTitle}>
                          {anime2.title.english || anime2.title.romaji}
                        </h2>
                        <button onClick={() => openSearchForSlot(2)} className={styles.searchSlotBtn}>
                          Change Anime
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => openSearchForSlot(2)} className={styles.searchSlotBtn}>
                        Select Anime 2
                      </button>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Score */}
                <tr>
                  <td className={styles.rowLabel}>Score / Rating</td>
                  <td className={styles.rowCell}>
                    {anime1?.score ? (
                      <span className={score1 > score2 ? styles.winnerScore : ""}>
                        {score1}% {score1 > score2 && <Trophy size={14} />}
                      </span>
                    ) : "N/A"}
                  </td>
                  <td className={styles.rowCell}>
                    {anime2?.score ? (
                      <span className={score2 > score1 ? styles.winnerScore : ""}>
                        {score2}% {score2 > score1 && <Trophy size={14} />}
                      </span>
                    ) : "N/A"}
                  </td>
                </tr>

                {/* Popularity */}
                <tr>
                  <td className={styles.rowLabel}>Popularity Rank</td>
                  <td className={styles.rowCell}>
                    {anime1?.popularity ? `#${anime1.popularity}` : "N/A"}
                  </td>
                  <td className={styles.rowCell}>
                    {anime2?.popularity ? `#${anime2.popularity}` : "N/A"}
                  </td>
                </tr>

                {/* Episodes */}
                <tr>
                  <td className={styles.rowLabel}>Episode Count</td>
                  <td className={styles.rowCell}>
                    {anime1?.episodes ? `${anime1.episodes} Episodes` : "Ongoing / Unknown"}
                  </td>
                  <td className={styles.rowCell}>
                    {anime2?.episodes ? `${anime2.episodes} Episodes` : "Ongoing / Unknown"}
                  </td>
                </tr>

                {/* Status */}
                <tr>
                  <td className={styles.rowLabel}>Status</td>
                  <td className={styles.rowCell} style={{ textTransform: "capitalize" }}>
                    {anime1?.status?.toLowerCase().replace(/_/g, " ") || "Unknown"}
                  </td>
                  <td className={styles.rowCell} style={{ textTransform: "capitalize" }}>
                    {anime2?.status?.toLowerCase().replace(/_/g, " ") || "Unknown"}
                  </td>
                </tr>

                {/* Format */}
                <tr>
                  <td className={styles.rowLabel}>Format</td>
                  <td className={styles.rowCell}>
                    {anime1?.format || "TV"}
                  </td>
                  <td className={styles.rowCell}>
                    {anime2?.format || "TV"}
                  </td>
                </tr>

                {/* Release Year */}
                <tr>
                  <td className={styles.rowLabel}>Release Year</td>
                  <td className={styles.rowCell}>
                    {anime1?.year || "Unknown"}
                  </td>
                  <td className={styles.rowCell}>
                    {anime2?.year || "Unknown"}
                  </td>
                </tr>

                {/* Synopsis */}
                <tr>
                  <td className={styles.rowLabel}>Synopsis</td>
                  <td className={styles.rowCell}>
                    <div className={styles.synopsis}>
                      {anime1?.description ? anime1.description.replace(/<[^>]*>?/gm, "") : "No synopsis provided."}
                    </div>
                  </td>
                  <td className={styles.rowCell}>
                    <div className={styles.synopsis}>
                      {anime2?.description ? anime2.description.replace(/<[^>]*>?/gm, "") : "No synopsis provided."}
                    </div>
                  </td>
                </tr>

                {/* Actions */}
                <tr>
                  <td className={styles.rowLabel}>Explore</td>
                  <td className={styles.rowCell}>
                    {anime1 && (
                      <div style={{ display: "flex", gap: "10px" }}>
                        <Link 
                          href={`/watch/${anime1.id}`} 
                          style={{
                            background: "var(--accent)",
                            color: "#fff",
                            padding: "8px 16px",
                            borderRadius: "8px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px"
                          }}
                        >
                          <Play size={14} fill="currentColor" /> Watch
                        </Link>
                        <Link 
                          href={`/anime/${anime1.id}`}
                          style={{
                            background: "rgba(255, 255, 255, 0.08)",
                            color: "#fff",
                            padding: "8px 16px",
                            borderRadius: "8px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px"
                          }}
                        >
                          <Info size={14} /> Details
                        </Link>
                      </div>
                    )}
                  </td>
                  <td className={styles.rowCell}>
                    {anime2 && (
                      <div style={{ display: "flex", gap: "10px" }}>
                        <Link 
                          href={`/watch/${anime2.id}`} 
                          style={{
                            background: "var(--accent)",
                            color: "#fff",
                            padding: "8px 16px",
                            borderRadius: "8px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px"
                          }}
                        >
                          <Play size={14} fill="currentColor" /> Watch
                        </Link>
                        <Link 
                          href={`/anime/${anime2.id}`}
                          style={{
                            background: "rgba(255, 255, 255, 0.08)",
                            color: "#fff",
                            padding: "8px 16px",
                            borderRadius: "8px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px"
                          }}
                        >
                          <Info size={14} /> Details
                        </Link>
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Search Modal */}
        {modalSlot !== null && (
          <div className={styles.searchModalOverlay} onClick={closeSearch}>
            <div className={styles.searchModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.searchModalHeader}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                  Select Anime for Slot {modalSlot}
                </h3>
                <button 
                  onClick={closeSearch} 
                  style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: "16px 20px" }}>
                <form onSubmit={handleSearch}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title (e.g. Attack on Titan, Jujutsu Kaisen)..."
                    className={styles.searchModalInput}
                    autoFocus
                  />
                </form>
              </div>

              <div className={styles.searchResultsList}>
                {searchLoading ? (
                  <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
                    Searching anime database...
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(result => (
                    <div 
                      key={result.id} 
                      onClick={() => handleSelectAnime(result)}
                      className={styles.searchResultItem}
                    >
                      <img 
                        src={result.images.cover || "/placeholder-cover.svg"} 
                        alt={result.title.english || result.title.romaji} 
                        className={styles.resultThumb}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                          {result.title.english || result.title.romaji}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                          {result.format || "TV"} • {result.year || "Unknown"} • Score: {result.score || "N/A"}%
                        </div>
                      </div>
                    </div>
                  ))
                ) : searchQuery ? (
                  <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
                    Press Enter to search
                  </div>
                ) : (
                  <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
                    Type an anime name and press Enter
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
