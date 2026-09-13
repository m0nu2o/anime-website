"use client";

import { Play } from "lucide-react";
import { Anime } from "@/lib/api/types";
import WatchlistStatusSelect from "@/components/WatchlistStatusSelect";
import FavoriteButton from "@/components/FavoriteButton";
import styles from "@/app/anime/[id]/page.module.css";

interface DetailActionsProps {
  trailerUrl?: string;
  youtubeVideoId?: string;
  anime?: Anime;
}

export default function DetailActions({ trailerUrl, youtubeVideoId, anime }: DetailActionsProps) {
  const handleTrailerClick = () => {
    const el = document.getElementById("trailer-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else if (trailerUrl) {
      window.open(trailerUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className={styles.actions}>
      {(youtubeVideoId || trailerUrl) ? (
        <button 
          className={styles.primaryAction} 
          onClick={handleTrailerClick}
          aria-label="Watch official trailer"
        >
          <Play size={18} fill="currentColor" /> Watch Trailer
        </button>
      ) : (
        <button 
          className={styles.primaryAction} 
          style={{ opacity: 0.6, cursor: "not-allowed" }}
          disabled
        >
          <Play size={18} /> Trailer Unavailable
        </button>
      )}

      {anime && (
        <WatchlistStatusSelect anime={anime} />
      )}

      {anime && (
        <FavoriteButton anime={anime} variant="detail" />
      )}
    </div>
  );
}
