import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import { getStudiosList } from "@/lib/api";
import Link from "next/link";
import styles from "./page.module.css";
import { Building2, ArrowRight } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";

export default async function StudiosPage() {
  const studios = await getStudiosList({ limit: 20 });

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <BackButton label="Back to Home" fallbackUrl="/" />
        <div className={styles.header}>
          <h1 className={styles.title}>Animation Studios</h1>
          <p className={styles.subtitle}>
            Explore the creative powerhouse animation houses responsible for bringing visionary stories to life.
          </p>
        </div>

        {studios.length === 0 ? (
          <EmptyState
            title="No Studios Found"
            description="Studio directories are currently synchronizing."
            actionLabel="Discover Anime"
            actionHref="/discover"
          />
        ) : (
          <div className={styles.grid}>
            {studios.map(studio => (
              <Link 
                key={studio.id} 
                href={`/studio/${studio.id}`}
                className={styles.card}
              >
                <div className={styles.cardIcon}>
                  <Building2 size={24} />
                </div>
                <h3 className={styles.name}>{studio.name}</h3>
                <p className={styles.desc}>{studio.description}</p>
                <div className={styles.footer}>
                  <span>View Filmography</span>
                  <ArrowRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
