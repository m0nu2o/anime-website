import React from "react";
import Link from "next/link";
import { AnimeRelation } from "@/lib/api/types";
import { GitBranch, ArrowRight } from "lucide-react";
import styles from "./AnimeRelationsGraph.module.css";

interface Props {
  relations: AnimeRelation[];
  currentAnimeTitle: string;
}

export default function AnimeRelationsGraph({ relations, currentAnimeTitle }: Props) {
  if (!relations || relations.length === 0) {
    return null;
  }

  const getRoleBadgeClass = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes("sequel")) return styles.sequel;
    if (r.includes("prequel")) return styles.prequel;
    if (r.includes("adaptation")) return styles.adaptation;
    if (r.includes("spinoff")) return styles.spinoff;
    return styles.default;
  };

  const formatRole = (role: string) => {
    return role.replace(/_/g, " ").toUpperCase();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <GitBranch size={18} className={styles.branchIcon} />
          <h3>Franchise &amp; Relationship Graph</h3>
        </div>
        <span className={styles.count}>{relations.length} Connected Titles</span>
      </div>

      <div className={styles.graphGrid}>
        {relations.map((rel) => (
          <Link
            key={rel.id}
            href={`/anime/${rel.anime.id}`}
            className={styles.relationCard}
          >
            <div className={styles.posterWrapper}>
              <img
                src={rel.anime.image || "/placeholder-cover.svg"}
                alt={rel.anime.title}
                className={styles.poster}
              />
            </div>
            <div className={styles.info}>
              <span className={`${styles.roleBadge} ${getRoleBadgeClass(rel.role)}`}>
                {formatRole(rel.role)}
              </span>
              <h4 className={styles.title} title={rel.anime.title}>
                {rel.anime.title}
              </h4>
              <div className={styles.meta}>
                {rel.anime.format && <span>{rel.anime.format}</span>}
                {rel.anime.year && <span>• {rel.anime.year}</span>}
              </div>
            </div>
            <div className={styles.arrowIcon}>
              <ArrowRight size={16} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
