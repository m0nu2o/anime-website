import Navbar from "@/components/Navbar";
import { getStaffPersonById, getPersonAnime } from "@/lib/api";
import Link from "next/link";
import styles from "./page.module.css";
import { ArrowLeft } from "lucide-react";
import AnimeCard from "@/components/AnimeCard";
import EmptyState from "@/components/ui/EmptyState";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StaffDetailPage({ params }: PageProps) {
  const { id } = await params;
  const person = await getStaffPersonById(id);

  if (!person) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <Link href="/staff" className={styles.backLink}>
            <ArrowLeft size={16} /> Back to Creators & Staff
          </Link>
          <EmptyState
            title="Creator Not Found"
            description="The requested anime creator or staff member could not be retrieved from the archives."
            actionLabel="Browse Creators"
            actionHref="/staff"
          />
        </div>
      </>
    );
  }

  const animeList = await getPersonAnime(id);

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <Link href="/staff" className={styles.backLink}>
          <ArrowLeft size={16} /> Back to Creators & Staff
        </Link>

        {/* Hero Section */}
        <div className={styles.hero}>
          <div className={styles.portraitWrapper}>
            <img 
              src={person.image || "/placeholder-cover.svg"} 
              alt={person.name}
              className={styles.portrait}
            />
          </div>

          <div className={styles.info}>
            <h1 className={styles.name}>{person.name}</h1>
            <div className={styles.role}>{person.role}</div>

            <div className={styles.bioSection}>
              <h3 className={styles.bioTitle}>Creator Profile</h3>
              <p className={styles.bioText}>
                {person.description 
                  ? person.description.replace(/\\n/g, "\n") 
                  : "Known for contributions across distinguished anime productions and creative media."}
              </p>
            </div>
          </div>
        </div>

        {/* Works / Filmography */}
        <h2 className={styles.sectionTitle}>
          Anime Filmography & Works ({animeList.length})
        </h2>

        {animeList.length === 0 ? (
          <EmptyState
            title="No Listed Works Yet"
            description="Production credits for this creator are currently being aggregated."
            actionLabel="Discover More Creators"
            actionHref="/staff"
          />
        ) : (
          <div className={styles.animeGrid}>
            {animeList.map(anime => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
