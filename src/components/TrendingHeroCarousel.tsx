"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { 
  Play, 
  Pause,
  Info, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  Flame, 
  Calendar, 
  Clock, 
  Tv, 
  Sparkles 
} from "lucide-react";
import styles from "./TrendingHeroCarousel.module.css";
import { Anime } from "@/lib/api/types";

interface TrendingHeroCarouselProps {
  animeList: Anime[];
}

export default function TrendingHeroCarousel({ animeList }: TrendingHeroCarouselProps) {
  const top10 = animeList.slice(0, 10);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Touch swipe support
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const total = top10.length;

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 450);
  }, [isTransitioning]);

  const nextSlide = useCallback(() => {
    goToSlide((currentIndex + 1) % total);
  }, [currentIndex, total, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide((currentIndex - 1 + total) % total);
  }, [currentIndex, total, goToSlide]);

  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-sweep every 5 seconds, pausing on hover
  useEffect(() => {
    if (!isAutoPlaying || isHovered || total <= 1) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, isHovered, total, nextSlide]);

  // Handle Touch Sweeping
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipe = 45;
    if (distance > minSwipe) {
      nextSlide();
    } else if (distance < -minSwipe) {
      prevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!top10.length) return null;

  const currentAnime = top10[currentIndex];
  const englishTitle = currentAnime.title.english || currentAnime.title.romaji || currentAnime.title.native || "Featured Anime";
  const romajiTitle = currentAnime.title.romaji && currentAnime.title.romaji !== englishTitle ? currentAnime.title.romaji : null;
  const score = currentAnime.score 
    ? (currentAnime.score > 10 ? (currentAnime.score / 10).toFixed(1) : currentAnime.score.toFixed(1)) 
    : null;

  // High-Resolution Image Pipeline
  const backdropImage = 
    (currentAnime.youtubeVideoId ? `https://img.youtube.com/vi/${currentAnime.youtubeVideoId}/maxresdefault.jpg` : null) ||
    currentAnime.images.banner ||
    currentAnime.images.largeCover ||
    currentAnime.images.cover;

  const posterImage = currentAnime.images.largeCover || currentAnime.images.cover;

  return (
    <section 
      className={styles.heroSection}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Top 10 Trending Anime Showcase"
    >
      {/* Dynamic Ultra-HD Background Layer */}
      <div className={styles.backdropWrapper}>
        <div 
          key={`ambient-${currentAnime.id}`}
          className={styles.ambientBlur}
          style={{ backgroundImage: `url(${backdropImage})` }}
        />
        <img 
          key={`img-${currentAnime.id}`}
          src={backdropImage} 
          alt={englishTitle}
          className={styles.backdropImage}
          loading="eager"
        />
        <div className={styles.vignetteOverlay} />
        <div className={styles.sideGradient} />
      </div>

      {/* Main Foreground Showcase Content */}
      <div className={`container ${styles.heroContainer}`}>
        {/* Left Side: Anime Details & Metadata */}
        <div className={styles.contentCol}>
          {/* Rank Badge & Score */}
          <div className={styles.badgeRow}>
            <span className={styles.rankBadge}>
              <Flame size={14} className={styles.flameIcon} />
              <span>Trending #{currentIndex + 1}</span>
            </span>
            {score && (
              <span className={styles.scoreBadge}>
                <Star size={13} fill="#f59e0b" color="#f59e0b" />
                <span>{score}</span>
              </span>
            )}
            <span className={styles.formatBadge}>
              <Tv size={12} />
              <span>{currentAnime.format || "TV"}</span>
            </span>
            {currentAnime.year && (
              <span className={styles.yearBadge}>
                <Calendar size={12} />
                <span>{currentAnime.year}</span>
              </span>
            )}
          </div>

          {/* Titles */}
          <h1 className={styles.title}>
            {englishTitle}
          </h1>
          {romajiTitle && (
            <p className={styles.subTitle}>{romajiTitle}</p>
          )}

          {/* Genre Tags */}
          {currentAnime.genres && currentAnime.genres.length > 0 && (
            <div className={styles.genreRow}>
              {currentAnime.genres.slice(0, 4).map((g) => (
                <span key={g} className={styles.genreTag}>{g}</span>
              ))}
            </div>
          )}

          {/* Synopsis */}
          <p 
            className={styles.synopsis}
            dangerouslySetInnerHTML={{ 
              __html: (currentAnime.description || "Stream the newest episodes in ultra-high definition.")
                .replace(/<[^>]+>/g, "")
                .slice(0, 150) + (currentAnime.description && currentAnime.description.length > 150 ? "..." : "")
            }}
          />

          {/* Action CTAs */}
          <div className={styles.actionRow}>
            <Link href={`/watch/${currentAnime.id}/1`} className={styles.primaryBtn}>
              <Play size={15} fill="currentColor" />
              <span>Watch Episode 1</span>
            </Link>
            <Link href={`/anime/${currentAnime.id}`} className={styles.secondaryBtn}>
              <Info size={14} />
              <span>More Details</span>
            </Link>
          </div>
        </div>

        {/* Right Side: High-Resolution 3D Glass Poster Showcase */}
        <div className={styles.posterCol}>
          <Link href={`/watch/${currentAnime.id}/1`} className={styles.posterCard} title={`Watch ${englishTitle}`}>
            <img 
              src={posterImage} 
              alt={englishTitle} 
              className={styles.posterImg}
              loading="eager"
            />
            <div className={styles.posterOverlay}>
              <div className={styles.playCircle}>
                <Play size={18} fill="#fff" color="#fff" style={{ marginLeft: "2px" }} />
              </div>
              <span className={styles.posterRank}>#{currentIndex + 1} Top Airing</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Sweep Arrow Navigation Controls */}
      <button 
        onClick={prevSlide}
        className={`${styles.navArrow} ${styles.navPrev}`}
        title="Previous Trending Anime"
        aria-label="Previous Slide"
      >
        <ChevronLeft size={18} />
      </button>

      <button 
        onClick={nextSlide}
        className={`${styles.navArrow} ${styles.navNext}`}
        title="Next Trending Anime"
        aria-label="Next Slide"
      >
        <ChevronRight size={18} />
      </button>

      {/* Bottom Sweep Track: Top 10 Numbered Pills with Live Auto-Progress */}
      <div className={styles.sweepTrack}>
        <div className={styles.trackLabel}>
          <Sparkles size={11} style={{ color: "var(--accent)" }} />
          <span>TOP 10 TRENDING</span>
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={styles.autoPlayToggle}
            title={isAutoPlaying ? "Pause Auto-Advance" : "Resume Auto-Advance"}
            aria-label={isAutoPlaying ? "Pause Auto-Advance" : "Resume Auto-Advance"}
            style={{
              background: isAutoPlaying ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.08)",
              border: isAutoPlaying ? "1px solid rgba(34, 197, 94, 0.5)" : "1px solid rgba(255, 255, 255, 0.15)",
              color: isAutoPlaying ? "#4ade80" : "var(--text-muted)",
              borderRadius: "6px",
              padding: "2px 6px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              fontSize: "0.64rem",
              fontWeight: 700,
              marginLeft: "4px",
              transition: "all 0.2s ease",
            }}
          >
            {isAutoPlaying ? <Pause size={9} /> : <Play size={9} />}
            <span>{isAutoPlaying ? "Auto" : "Paused"}</span>
          </button>
        </div>
        <div className={styles.pillsList}>
          {top10.map((anime, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={anime.id}
                onClick={() => goToSlide(idx)}
                className={`${styles.pillBtn} ${isActive ? styles.activePillBtn : ""}`}
                title={`#${idx + 1}: ${anime.title.english || anime.title.romaji}`}
              >
                <span className={styles.pillNumber}>#{idx + 1}</span>
                {isActive && isAutoPlaying && !isHovered && (
                  <div key={`prog-${currentIndex}`} className={styles.pillProgress} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
