import Navbar from "@/components/Navbar";
import AnimeCard from "@/components/AnimeCard";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import TrendingHeroCarousel from "@/components/TrendingHeroCarousel";
import { getTrendingAnime, getPopularAnime, getAllTimeFavorites, getSeasonalAnime, getLatestAiringAnime } from "@/lib/api";
import styles from "./page.module.css";
import HomeExploreSections from "@/components/HomeExploreSections";
import HomeCommunityPosts from "@/components/HomeCommunityPosts";
import Link from "next/link";
import { TrendingUp, Compass, Heart } from "lucide-react";

export const revalidate = 1800; // Cache homepage for 30 minutes

// Anime-industry season convention: Winter Jan–Mar, Spring Apr–Jun, Summer Jul–Sep, Fall Oct–Dec.
function getCurrentSeasonAndYear(): { season: string; label: string; year: number } {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  if (month <= 2) return { season: "winter", label: "Winter", year };
  if (month <= 5) return { season: "spring", label: "Spring", year };
  if (month <= 8) return { season: "summer", label: "Summer", year };
  return { season: "fall", label: "Fall", year };
}

export default async function Home() {
  const { season: currentSeason, label: currentSeasonLabel, year: currentSeasonYear } = getCurrentSeasonAndYear();

  const [trendingAnime, popularAnime, allTimeFavorites, seasonalAnime, latestReleases] = await Promise.all([
    getTrendingAnime(15),
    getPopularAnime(15),
    getAllTimeFavorites(15),
    getSeasonalAnime(currentSeason, currentSeasonYear, 15).catch(() => []),
    getLatestAiringAnime(24).catch(() => []),
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

        {/* Real Anime Sections: Latest Real Releases, Top 10 Leaderboard, Real API Genre Discovery */}
        <HomeExploreSections
          trendingAnime={trendingAnime}
          popularAnime={popularAnime}
          seasonalAnime={seasonalAnime}
          latestReleases={latestReleases}
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

        {/* Current Season Spotlight Carousel (derived dynamically from the real date) */}
        {seasonalAnime.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <Compass size={22} color="#38bdf8" style={{ display: "inline", verticalAlign: "middle", marginRight: "8px" }} />
                {currentSeasonLabel} {currentSeasonYear} Spotlight
              </h2>
              <Link href={`/seasonal?season=${currentSeason}&year=${currentSeasonYear}`} className={styles.viewAll}>Seasonal Browser</Link>
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

        {/* All-Time Favorites Carousel */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Heart size={22} color="#ec4899" fill="#ec4899" style={{ display: "inline", verticalAlign: "middle", marginRight: "8px" }} />
              All-Time Favorites
            </h2>
            <Link href="/discover?sort=favorite" className={styles.viewAll}>View All</Link>
          </div>
          
          <div className={styles.carouselContainer}>
            <div className={styles.carousel}>
              {(allTimeFavorites.length > 0 ? allTimeFavorites : popularAnime).map(anime => (
                <div key={anime.id} className={styles.cardWrapper}>
                  <AnimeCard anime={anime} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Real Community Discussions / CTA */}
        <HomeCommunityPosts />

      </main>
    </>
  );
}
