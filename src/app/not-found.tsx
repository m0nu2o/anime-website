import Link from 'next/link';
import Navbar from '@/components/Navbar';
import styles from './not-found.module.css';
import { Search, Home, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <div className={styles.content}>
          <h1 className={styles.glitch} data-text="404">404</h1>
          <h2>Lost in the void</h2>
          <p>The anime, character, or page you are looking for doesn't exist or has been removed.</p>
          
          <div className={styles.actions}>
            <Link href="/" className={styles.primaryBtn}>
              <Home size={18} /> Back to Home
            </Link>
            <Link href="/discover" className={styles.secondaryBtn}>
              <Compass size={18} /> Discover Anime
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
