"use client";

import { useState } from "react";
import { Play, Check, Plus, ExternalLink } from "lucide-react";
import styles from "@/app/anime/[id]/page.module.css";

interface DetailActionsProps {
  trailerUrl?: string;
  youtubeVideoId?: string;
}

export default function DetailActions({ trailerUrl, youtubeVideoId }: DetailActionsProps) {
  const [inList, setInList] = useState(false);

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

      <button 
        className={styles.secondaryAction}
        onClick={() => setInList(!inList)}
        aria-label={inList ? "Remove from list" : "Add to list"}
        style={inList ? { borderColor: "var(--primary)", color: "var(--primary)" } : {}}
      >
        {inList ? (
          <>
            <Check size={18} /> In Watchlist
          </>
        ) : (
          <>
            <Plus size={18} /> Add to List
          </>
        )}
      </button>
    </div>
  );
}
