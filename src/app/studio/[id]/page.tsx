import Navbar from "@/components/Navbar";
import { getStudioById, getStudioAnime } from "@/lib/api";
import Link from "next/link";
import styles from "./page.module.css";
import { ArrowLeft, Building2 } from "lucide-react";
import AnimeCard from "@/components/AnimeCard";
import EmptyState from "@/components/ui/EmptyState";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudioDetailPage({ params }: PageProps) {
  const { id } = await params;
  const studio = await getStudioById(id);

  if (!studio) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <Link href="/studios" className={styles.backLink}>
            <ArrowLeft size={16} /> Back to Studios
          </Link>
          <EmptyState
            title="Studio Not Found"
            description="The requested animation studio could not be located in our production records."
            actionLabel="Browse Studios"
            actionHref="/studios"
          />
        </div>
      </>
    );
  }

  const animeList = await getStudioAnime(id);

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <Link href="/studios" className={styles.backLink}>
          <ArrowLeft size={16} /> Back to Studios
        </Link>

        <div className={styles.hero}>
          <div className={styles.studioHeader}>
            <div className={styles.studioIcon}>
              <Building2 size={28} />
            </div>
            <div>
              <h1 className={styles.name}>{studio.name}</h1>
              <div className={styles.role}>{studio.role}</div>
            </div>
          </div>
          <p className={styles.desc}>{studio.description}</p>
        </div>

        <h2 className={styles.sectionTitle}>
          Produced Anime & Productions ({animeList.length})
        </h2>

        {animeList.length === 0 ? (
          <EmptyState
            title="No Productions Cataloged"
            description="Anime titles produced by this studio are currently being mapped to our database."
            actionLabel="Discover Anime"
            actionHref="/discover"
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
