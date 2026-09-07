import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import { getCharactersList } from "@/lib/api";
import Link from "next/link";
import styles from "./page.module.css";
import { Users, Search } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function CharactersPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const query = resolvedParams.q || "";

  const characters = await getCharactersList({
    search: query || undefined,
    limit: 20,
  });

  const popularTags = ["Luffy", "Naruto", "Goku", "Levi", "Eren", "Zoro", "Kakashi", "Gojo", "Spike"];

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <BackButton label="Back to Home" fallbackUrl="/" />
        <div className={styles.header}>
          <h1 className={styles.title}>Anime Characters</h1>
          <p className={styles.subtitle}>
            Explore the most iconic and beloved personalities across anime history, from classic legends to current seasonal stars.
          </p>
        </div>

        {/* Search Bar Form */}
        <form method="GET" action="/characters" className={styles.searchBar}>
          <div style={{ position: "relative" }}>
            <input 
              type="text" 
              name="q"
              defaultValue={query}
              placeholder="Search characters by name (e.g. Naruto, Luffy)..." 
              className={styles.searchInput}
            />
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", alignSelf: "center" }}>Popular:</span>
            {popularTags.map(tag => (
              <Link 
                key={tag}
                href={`/characters?q=${encodeURIComponent(tag)}`}
                style={{
                  fontSize: "0.8rem",
                  padding: "4px 10px",
                  borderRadius: "9999px",
                  background: query.toLowerCase() === tag.toLowerCase() ? "var(--accent)" : "rgba(255, 255, 255, 0.05)",
                  color: "#fff",
                  textDecoration: "none",
                  border: "1px solid rgba(255, 255, 255, 0.1)"
                }}
              >
                {tag}
              </Link>
            ))}
          </div>
        </form>

        {characters.length === 0 ? (
          <EmptyState
            title={`No characters found matching "${query}"`}
            description="Try searching with a different name or spelling."
            actionLabel="View All Characters"
            actionHref="/characters"
          />
        ) : (
          <div className={styles.grid}>
            {characters.map(char => (
              <Link 
                key={char.id} 
                href={`/character/${char.id}`}
                className={styles.card}
              >
                <div className={styles.imageWrapper}>
                  <img 
                    src={char.image || "/placeholder-cover.svg"} 
                    alt={char.name}
                    className={styles.image}
                    loading="lazy"
                  />
                </div>
                <div className={styles.body}>
                  <div className={styles.name}>{char.name}</div>
                  {char.nativeName && (
                    <div className={styles.nativeName}>{char.nativeName}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
