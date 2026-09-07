import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import { getPeopleList } from "@/lib/api";
import Link from "next/link";
import styles from "./page.module.css";
import { Clapperboard } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function StaffPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const query = resolvedParams.q || "";

  const people = await getPeopleList({
    search: query || undefined,
    limit: 20,
  });

  const popularStaff = ["Miyazaki", "Shinkai", "Anno", "Watanabe", "Kon", "Hosoda"];

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <BackButton label="Back to Home" fallbackUrl="/" />
        <div className={styles.header}>
          <h1 className={styles.title}>Anime Creators & Staff</h1>
          <p className={styles.subtitle}>
            Celebrate the directors, animators, scriptwriters, and voice talent shaping world-renowned anime masterpieces.
          </p>
        </div>

        {/* Search Bar Form */}
        <form method="GET" action="/staff" className={styles.searchBar}>
          <div>
            <input 
              type="text" 
              name="q"
              defaultValue={query}
              placeholder="Search creators by name (e.g. Miyazaki, Shinkai)..." 
              className={styles.searchInput}
            />
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", alignSelf: "center" }}>Popular:</span>
            {popularStaff.map(tag => (
              <Link 
                key={tag}
                href={`/staff?q=${encodeURIComponent(tag)}`}
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

        {people.length === 0 ? (
          <EmptyState
            title={`No creators found matching "${query}"`}
            description="Try searching with a different name or spelling."
            actionLabel="View All Creators"
            actionHref="/staff"
          />
        ) : (
          <div className={styles.grid}>
            {people.map(person => (
              <Link 
                key={person.id} 
                href={`/staff/${person.id}`}
                className={styles.card}
              >
                <div className={styles.imageWrapper}>
                  <img 
                    src={person.image || "/placeholder-cover.svg"} 
                    alt={person.name}
                    className={styles.image}
                    loading="lazy"
                  />
                </div>
                <div className={styles.body}>
                  <div className={styles.name}>{person.name}</div>
                  <div className={styles.role}>{person.role}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
