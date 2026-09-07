"use client";

import { useState } from "react";
import Image from "next/image";

interface AnimeImageProps {
  src: string | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

export default function AnimeImage({ src, alt, className = "", sizes = "(max-width: 768px) 100vw, 300px", priority = false }: AnimeImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Fallback to placeholder if no src or error
  const imgSrc = !src ? "/placeholder-cover.svg" : src;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "var(--bg-hover)" }} className={className}>
      {!loaded && !error && (
        <div style={{ position: "absolute", inset: 0, animation: "pulse 1.5s infinite", background: "rgba(255,255,255,0.05)" }} />
      )}
      {error ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #18181b 0%, #09090b 100%)", padding: "16px", textAlign: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(244, 63, 94, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
            <span style={{ color: "var(--primary)", fontSize: "20px", fontWeight: "bold" }}>✦</span>
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.5px" }}>Cover Unavailable</span>
        </div>
      ) : (
        <Image
          src={imgSrc}
          alt={alt || "Anime poster"}
          fill
          sizes={sizes}
          priority={priority}
          style={{
            objectFit: "cover",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.3s ease-in-out",
          }}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setError(true);
            setLoaded(true);
          }}
          unoptimized
        />
      )}
    </div>
  );
}
