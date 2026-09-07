import Navbar from "@/components/Navbar";
import AnimeCard from "@/components/AnimeCard";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import TrendingHeroCarousel from "@/components/TrendingHeroCarousel";
import { getTrendingAnime, getPopularAnime, getSeasonalAnime } from "@/lib/api";
import styles from "./page.module.css";
import Link from "next/link";
import { 
  TrendingUp, 
  Compass, 
  Sparkles, 
  Play, 
  Star, 
  Flame, 
  Calendar, 
  ArrowRight,
  Layers,
  Activity
} from "lucide-react";

export const revalidate = 3600; // Cache homepage for 1 hour

export default async function Home() {
  const currentYear = new Date().getFullYear();
  const [trendingAnime, popularAnime, seasonalAnime] = await Promise.all([
    getTrendingAnime(15),
    getPopularAnime(15),
    getSeasonalAnime("winter", currentYear, 12).catch(() => []),
  ]);

  const spotlight = seasonalAnime[0] || trendingAnime[0];
  const spotlightScore = spotlight?.score 
    ? (spotlight.score > 10 ? (spotlight.score / 10).toFixed(1) : spotlight.score.toFixed(1)) 
    : "8.9";
  const spotlightTitle = spotlight?.title.english || spotlight?.title.romaji || "Spotlight Anime";
  const spotlightImg = spotlight?.images.largeCover || spotlight?.images.banner || spotlight?.images.cover;

  const leaderboard = trendingAnime.slice(0, 4);

  return (
    <>
      <Navbar />
      
      {/* Top 10 Trending Interactive Sweep Hero Carousel */}
      {trendingAnime.length > 0 && (
        <TrendingHeroCarousel animeList={trendingAnime} />
      )}

      {/* Main Content */}
      <main className="container">
        {/* Continue Watching for authenticated users */}
        <ContinueWatchingRow />

        {/* ============================================================
            EDITORIAL BENTO GRID ARCHITECTURE
            ============================================================ */}
        {spotlight && (
          <section className={styles.bentoSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <Sparkles size={22} color="var(--primary)" style={{ display: "inline", verticalAlign: "middle", marginRight: "8px" }} />
                Curated Editorial Bento
              </h2>
              <span className={styles.bentoSubtitle}>Curated picks & broadcast radar</span>
            </div>

            <div className={styles.bentoGrid}>
              {/* Module 1: Featured Spotlight Card (Large 7 Cols) */}
              <div className={`${styles.bentoSpotlight} glass-elevated`}>
                <div 
                  className={styles.spotlightBackdrop} 
                  style={{ backgroundImage: `url(${spotlightImg})` }}
                />
                <div className={styles.spotlightOverlay} />
                
                <div className={styles.spotlightContent}>
                  <div className={styles.spotlightBadges}>
                    <span className={styles.spotlightBadge}>Seasonal Spotlight</span>
                    <span className={styles.spotlightScoreBadge}>
                      <Star size={12} fill="#facc15" color="#facc15" />
                      <span>{spotlightScore}</span>
                    </span>
                  </div>

                  <h3 className={styles.spotlightTitle}>{spotlightTitle}</h3>
                  <p className={styles.spotlightSynopsis}>
                    {(spotlight.description || "Stream the newest releases with studio-grade spatial audio and crystal clear visuals.")
                      .replace(/<[^>]+>/g, "")
                      .slice(0, 180)}...
                  </p>

                  <div className={styles.spotlightActions}>
                    <Link href={`/watch/${spotlight.id}/1`} className={styles.spotlightPlayBtn}>
                      <Play size={16} fill="#fff" />
                      <span>Watch Now</span>
                    </Link>
                    <Link href={`/anime/${spotlight.id}`} className={styles.spotlightDetailsBtn}>
                      <span>Explore</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Module 2: High-Density Trending Leaderboard (5 Cols) */}
              <div className={`${styles.bentoLeaderboard} glass-standard`}>
                <div className={styles.leaderboardHeader}>
                  <div className={styles.leaderboardTitle}>
                    <Flame size={18} color="var(--primary)" />
                    <span>Top Trending Radar</span>
                  </div>
                  <Link href="/discover?sort=trending" className={styles.radarLink}>Live Rank</Link>
                </div>

                <div className={styles.leaderboardList}>
                  {leaderboard.map((item, idx) => {
                    const itemTitle = item.title.english || item.title.romaji || "Anime";
                    const itemScore = item.score 
                      ? (item.score > 10 ? (item.score / 10).toFixed(1) : item.score.toFixed(1)) 
                      : "8.5";
                    return (
                      <Link 
                        key={item.id} 
                        href={`/anime/${item.id}`} 
                        className={styles.leaderboardItem}
                      >
                        <div className={styles.rankNum} data-rank={idx + 1}>
                          #{idx + 1}
                        </div>
                        <img 
                          src={item.images.cover || item.images.largeCover} 
                          alt={itemTitle}
                          className={styles.leaderboardThumb}
                        />
                        <div className={styles.leaderboardInfo}>
                          <h4 className={styles.leaderboardItemTitle}>{itemTitle}</h4>
                          <div className={styles.leaderboardMeta}>
                            <span>{item.format || "TV"}</span>
                            <span>•</span>
                            <span className={styles.itemScore}>★ {itemScore}</span>
                          </div>
                        </div>
                        <div className={styles.itemPlayIcon}>
                          <Play size={12} fill="currentColor" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Module 3: Broadcast Radar Utility (4 Cols) */}
              <div className={`${styles.bentoUtility} glass-standard`}>
                <div className={styles.utilityIconBadge} style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
                  <Calendar size={18} />
                </div>
                <h4 className={styles.utilityTitle}>Broadcast Schedule</h4>
                <p className={styles.utilityDesc}>
                  Live Japanese airtimes synchronized with your local timezone and countdowns.
                </p>
                <Link href="/calendar" className={styles.utilityAction}>
                  <span>View Weekly Grid</span>
                  <ArrowRight size={13} />
                </Link>
              </div>

              {/* Module 4: 3D Quantum Engine Radar (4 Cols) */}
              <div className={`${styles.bentoUtility} glass-standard`}>
                <div className={styles.utilityIconBadge} style={{ background: "rgba(244, 63, 94, 0.15)", color: "var(--primary)" }}>
                  <Activity size={18} />
                </div>
                <h4 className={styles.utilityTitle}>Simulation Engine</h4>
                <p className={styles.utilityDesc}>
                  Interactive 6-attractor 3D physics environment reacting to local time and theme.
                </p>
                <Link href="/simulators" className={styles.utilityAction}>
                  <span>Inspect Attractors</span>
                  <ArrowRight size={13} />
                </Link>
              </div>

              {/* Module 5: Seasonal Explorer Matrix (4 Cols) */}
              <div className={`${styles.bentoUtility} glass-standard`}>
                <div className={styles.utilityIconBadge} style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
                  <Layers size={18} />
                </div>
                <h4 className={styles.utilityTitle}>Seasonal Archive</h4>
                <p className={styles.utilityDesc}>
                  Explore quarterly broadcast archives from 1990 to present season.
                </p>
                <Link href="/seasonal" className={styles.utilityAction}>
                  <span>Browse Seasons</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Trending Now Carousel */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <TrendingUp size={22} color="var(--accent)" style={{ display: "inline", verticalAlign: "middle", marginRight: "8px" }} />
              Trending Now
            </h2>
            <Link href="/discover?sort=trending" className={styles.viewAll}>View All</Link>
          </div>
          
          <div className={styles.carouselContainer}>
            <div className={styles.carousel}>
              {trendingAnime.map(anime => (
                <div key={anime.id} className={styles.cardWrapper}>
                  <AnimeCard anime={anime} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Seasonal Spotlight Carousel */}
        {seasonalAnime.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <Compass size={22} color="#38bdf8" style={{ display: "inline", verticalAlign: "middle", marginRight: "8px" }} />
                Winter {currentYear} Spotlight
              </h2>
              <Link href="/seasonal" className={styles.viewAll}>Seasonal Browser</Link>
            </div>
            
            <div className={styles.carouselContainer}>
              <div className={styles.carousel}>
                {seasonalAnime.map(anime => (
                  <div key={anime.id} className={styles.cardWrapper}>
                    <AnimeCard anime={anime} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* All-Time Popular Carousel */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Sparkles size={22} color="#f59e0b" style={{ display: "inline", verticalAlign: "middle", marginRight: "8px" }} />
              All-Time Popular
            </h2>
            <Link href="/discover?sort=popular" className={styles.viewAll}>View All</Link>
          </div>
          
          <div className={styles.carouselContainer}>
            <div className={styles.carousel}>
              {popularAnime.map(anime => (
                <div key={anime.id} className={styles.cardWrapper}>
                  <AnimeCard anime={anime} />
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
    </>
  );
}
