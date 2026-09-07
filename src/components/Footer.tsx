import React from "react";
import Link from "next/link";
import styles from "./Footer.module.css";
import { Sparkles, Compass, Film, Shield, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.container}`}>
        <div className={styles.topSection}>
          <div className={styles.brandCol}>
            <Link href="/" className={styles.logo}>
              NextGen<span className={styles.accent}>Anime</span>
            </Link>
            <p className={styles.tagline}>
              The ultimate anime discovery and immersive simulator platform. Powered by real-time community metadata and interactive visual simulations.
            </p>
            <div className={styles.attribution}>
              <span>Data provided by Kitsu, AniList &amp; MyAnimeList APIs</span>
            </div>
          </div>

          <div className={styles.linksGrid}>
            <div className={styles.linkGroup}>
              <h4 className={styles.groupTitle}>
                <Compass size={16} /> Discover
              </h4>
              <ul className={styles.linkList}>
                <li><Link href="/discover">All Anime</Link></li>
                <li><Link href="/seasonal">Seasonal Anime</Link></li>
                <li><Link href="/calendar">Release Calendar</Link></li>
                <li><Link href="/random">Random Anime</Link></li>
                <li><Link href="/compare">Compare Anime</Link></li>
              </ul>
            </div>

            <div className={styles.linkGroup}>
              <h4 className={styles.groupTitle}>
                <Film size={16} /> Content
              </h4>
              <ul className={styles.linkList}>
                <li><Link href="/characters">Characters</Link></li>
                <li><Link href="/staff">Staff &amp; Creators</Link></li>
                <li><Link href="/studios">Animation Studios</Link></li>
                <li><Link href="/watchlist">My Watchlist</Link></li>
                <li><Link href="/favorites">Favorites</Link></li>
              </ul>
            </div>

            <div className={styles.linkGroup}>
              <h4 className={styles.groupTitle}>
                <Sparkles size={16} /> Simulators
              </h4>
              <ul className={styles.linkList}>
                <li><Link href="/simulators">Simulator Hub</Link></li>
                <li><Link href="/simulators/blackhole">Black Hole Simulator</Link></li>
                <li><Link href="/dashboard">User Dashboard</Link></li>
                <li><Link href="/settings">Preferences</Link></li>
              </ul>
            </div>

            <div className={styles.linkGroup}>
              <h4 className={styles.groupTitle}>
                <Shield size={16} /> Platform
              </h4>
              <ul className={styles.linkList}>
                <li><span className={styles.staticLink}>Privacy Policy</span></li>
                <li><span className={styles.staticLink}>Terms of Service</span></li>
                <li><span className={styles.staticLink}>API Status: Operational</span></li>
                <li><span className={styles.staticLink}>Version 2.0 (Turbopack)</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className={styles.bottomSection}>
          <p className={styles.copyright}>
            &copy; {new Date().getFullYear()} NextGenAnime Platform. All anime rights, artwork, and trademarks belong to their respective studios and creators.
          </p>
          <div className={styles.madeWith}>
            <span>Crafted with</span> <Heart size={14} className={styles.heartIcon} /> <span>for anime fans worldwide</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
