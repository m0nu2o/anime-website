import Navbar from "@/components/Navbar";
import AnimeCard from "@/components/AnimeCard";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import TrendingHeroCarousel from "@/components/TrendingHeroCarousel";
import { getTrendingAnime, getPopularAnime, getSeasonalAnime } from "@/lib/api";
import styles from "./page.module.css";
import HomeExploreSections from "@/components/HomeExploreSections";
import Link from "next/link";
import { TrendingUp, Compass, Sparkles } from "lucide-react";

export const revalidate = 3600; // Cache homepage for 1 hour

export default async function Home() {
  const currentYear = new Date().getFullYear();
  const [trendingAnime, popularAnime, seasonalAnime] = await Promise.all([
    getTrendingAnime(15),
    getPopularAnime(15),
    getSeasonalAnime("winter", currentYear, 12).catch(() => []),
  ]);

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

        {/* Real Anime Sections: Latest Releases, Top 10 Leaderboard, Genre Discovery, Airing Radar */}
        <HomeExploreSections
          trendingAnime={trendingAnime}
          popularAnime={popularAnime}
          seasonalAnime={seasonalAnime}
        />

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
