import Navbar from "@/components/Navbar";
import { getCharacterById, getCharacterAnime } from "@/lib/api";
import Link from "next/link";
import styles from "./page.module.css";
import { ArrowLeft, Film, Heart } from "lucide-react";
import AnimeCard from "@/components/AnimeCard";
import EmptyState from "@/components/ui/EmptyState";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CharacterDetailPage({ params }: PageProps) {
  const { id } = await params;
  const character = await getCharacterById(id);

  if (!character) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <Link href="/characters" className={styles.backLink}>
            <ArrowLeft size={16} /> Back to Characters
          </Link>
          <EmptyState
            title="Character Not Found"
            description="The requested anime character could not be retrieved from the archives."
            actionLabel="Browse Characters"
            actionHref="/characters"
          />
        </div>
      </>
    );
  }

  const animeList = await getCharacterAnime(id);

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <Link href="/characters" className={styles.backLink}>
          <ArrowLeft size={16} /> Back to Characters
        </Link>

        {/* Hero Section */}
        <div className={styles.hero}>
          <div className={styles.portraitWrapper}>
            <img 
              src={character.image || "/placeholder-cover.svg"} 
              alt={character.name}
              className={styles.portrait}
            />
          </div>

          <div className={styles.info}>
            <h1 className={styles.name}>{character.name}</h1>
            {character.nativeName && (
              <div className={styles.nativeName}>{character.nativeName}</div>
            )}

            <div className={styles.bioSection}>
              <h3 className={styles.bioTitle}>Character Biography</h3>
              <p className={styles.bioText}>
                {character.description 
                  ? character.description.replace(/\\n/g, "\n") 
                  : "No extended biography is documented for this character yet."}
              </p>
            </div>
          </div>
        </div>

        {/* Appearances / Filmography */}
        <h2 className={styles.sectionTitle}>
          Anime Appearances ({animeList.length})
        </h2>

        {animeList.length === 0 ? (
          <EmptyState
            title="No Listed Anime Appearances"
            description="This character's media associations are currently being cataloged."
            actionLabel="Discover More Characters"
            actionHref="/characters"
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
