import React from "react";
import styles from "./EmptyState.module.css";
import Link from "next/link";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionText,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  const label = actionText || actionLabel;
  return (
    <div className={styles.container}>
      {icon && <div className={styles.iconWrapper}>{icon}</div>}
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {label && (
        actionHref ? (
          <Link href={actionHref} className={styles.actionBtn}>
            {label}
          </Link>
        ) : onAction ? (
          <button onClick={onAction} className={styles.actionBtn}>
            {label}
          </button>
        ) : null
      )}
    </div>
  );
}
