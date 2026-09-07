import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import styles from "./SimulatorCard.module.css";

interface SimulatorCardProps {
  title: string;
  category: string;
  description: string;
  stats: { label: string; value: string }[];
  href: string;
  badge?: string;
  isAvailable?: boolean;
}

export default function SimulatorCard({
  title,
  category,
  description,
  stats,
  href,
  badge = "Interactive 3D",
  isAvailable = true,
}: SimulatorCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.category}>{category}</span>
        <span className={styles.badge}>
          <Sparkles size={12} /> {badge}
        </span>
      </div>

      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>

      <div className={styles.statsGrid}>
        {stats.map((s, i) => (
          <div key={i} className={styles.statItem}>
            <span className={styles.statLabel}>{s.label}</span>
            <span className={styles.statValue}>{s.value}</span>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        {isAvailable ? (
          <Link href={href} className={styles.launchBtn}>
            <span>Launch Simulation</span>
            <ArrowRight size={16} />
          </Link>
        ) : (
          <span className={styles.unavailableBadge}>In Laboratory</span>
        )}
      </div>
    </div>
  );
}
