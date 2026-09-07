"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import styles from "./BackButton.module.css";

interface BackButtonProps {
  label?: string;
  fallbackUrl?: string;
  className?: string;
}

export default function BackButton({
  label = "Back",
  fallbackUrl = "/",
  className = "",
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (fallbackUrl && fallbackUrl !== "/") {
      router.push(fallbackUrl);
      return;
    }
    if (typeof window !== "undefined" && document.referrer && document.referrer.startsWith(window.location.origin)) {
      router.back();
    } else {
      router.push(fallbackUrl || "/");
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`${styles.backBtn} ${className}`}
      aria-label={label}
      title={label}
    >
      <ArrowLeft size={16} className={styles.icon} />
      <span>{label}</span>
    </button>
  );
}
