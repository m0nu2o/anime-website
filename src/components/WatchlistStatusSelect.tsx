"use client";

import React, { useState, useEffect, useRef } from "react";
import { Anime } from "@/lib/api/types";
import { WatchlistStatus } from "@/lib/supabase/types";
import { useAuth } from "@/lib/supabase/AuthContext";
import {
  addToWatchlist,
  updateWatchlistStatus,
  removeFromWatchlist,
  getWatchlistItem,
} from "@/lib/supabase/dal";
import {
  PlayCircle,
  CheckCircle2,
  Clock,
  PauseCircle,
  XCircle,
  ChevronDown,
  Check,
  Trash2,
  Plus,
  Loader2,
  LucideIcon,
} from "lucide-react";
import styles from "./WatchlistStatusSelect.module.css";

export interface StatusConfig {
  value: WatchlistStatus;
  label: string;
  color: string;
  bg: string;
  borderColor: string;
  Icon: LucideIcon;
}

export const WATCHLIST_CATEGORIES: StatusConfig[] = [
  {
    value: "watching",
    label: "Watching",
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.4)",
    Icon: PlayCircle,
  },
  {
    value: "completed",
    label: "Completed",
    color: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.15)",
    borderColor: "rgba(59, 130, 246, 0.4)",
    Icon: CheckCircle2,
  },
  {
    value: "planning",
    label: "Plan to Watch",
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.15)",
    borderColor: "rgba(245, 158, 11, 0.4)",
    Icon: Clock,
  },
  {
    value: "on_hold",
    label: "On Hold",
    color: "#a855f7",
    bg: "rgba(168, 85, 247, 0.15)",
    borderColor: "rgba(168, 85, 247, 0.4)",
    Icon: PauseCircle,
  },
  {
    value: "dropped",
    label: "Dropped",
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.4)",
    Icon: XCircle,
  },
];

interface WatchlistStatusSelectProps {
  anime: Anime;
  compact?: boolean;
  onStatusChange?: (status: WatchlistStatus | null) => void;
  className?: string;
}

export default function WatchlistStatusSelect({
  anime,
  compact = false,
  onStatusChange,
  className = "",
}: WatchlistStatusSelectProps) {
  const { user, openAuthModal } = useAuth();
  const [currentStatus, setCurrentStatus] = useState<WatchlistStatus | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (text: string) => {
    setToastText(text);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastText(null), 3000);
  };

  const refreshStatus = async () => {
    if (!anime?.id || !user) {
      setCurrentStatus(null);
      return;
    }
    try {
      const item = await getWatchlistItem(user.id, anime.id);
      setCurrentStatus(item ? item.status : null);
    } catch {
      setCurrentStatus(null);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, [user, anime?.id]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelectStatus = async (status: WatchlistStatus) => {
    setLoading(true);
    setIsOpen(false);

    if (!user) {
      openAuthModal();
      setLoading(false);
      return;
    }

    const config = WATCHLIST_CATEGORIES.find((c) => c.value === status);
    const label = config?.label || status;

    try {
      if (currentStatus) {
        await updateWatchlistStatus(user.id, anime.id, status);
      } else {
        await addToWatchlist({
          userId: user.id,
          anime,
          status,
        });
      }
      setCurrentStatus(status);
      showToast(`✨ Saved to ${label}`);
      onStatusChange?.(status);
    } catch (err) {
      console.error("Failed to update watchlist status:", err);
      showToast("❌ Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setLoading(true);
    setIsOpen(false);

    try {
      if (!user) {
        openAuthModal();
        return;
      }
      await removeFromWatchlist(user.id, anime.id);
      setCurrentStatus(null);
      showToast("🗑️ Removed from Watchlist");
      onStatusChange?.(null);
    } catch (err) {
      console.error("Failed to remove from watchlist:", err);
      showToast("❌ Failed to remove");
    } finally {
      setLoading(false);
    }
  };

  const activeConfig = WATCHLIST_CATEGORIES.find((c) => c.value === currentStatus);

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${compact ? styles.compact : ""} ${className}`}
    >
      {toastText && <div className={styles.toastFeedback}>{toastText}</div>}

      <button
        type="button"
        className={styles.triggerBtn}
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={currentStatus ? `Watchlist status: ${activeConfig?.label}` : "Add to Watchlist"}
        style={
          activeConfig
            ? {
                borderColor: activeConfig.borderColor,
                background: activeConfig.bg,
                color: "#fff",
              }
            : {}
        }
      >
        <div className={styles.btnContent}>
          {loading ? (
            <Loader2 size={16} className="spinner" />
          ) : activeConfig ? (
            <>
              <activeConfig.Icon size={16} style={{ color: activeConfig.color }} />
              <span className={styles.btnLabel} style={{ color: "#fff" }}>
                {activeConfig.label}
              </span>
            </>
          ) : (
            <>
              <Plus size={16} />
              <span className={styles.btnLabel}>Add to Watchlist</span>
            </>
          )}
        </div>
        <ChevronDown
          size={15}
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
        />
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="listbox">
          <div className={styles.menuHeader}>
            <span>Watchlist Status</span>
          </div>

          {WATCHLIST_CATEGORIES.map((cat) => {
            const isSelected = currentStatus === cat.value;
            const Icon = cat.Icon;

            return (
              <button
                key={cat.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`${styles.statusOption} ${isSelected ? styles.statusOptionActive : ""}`}
                onClick={() => handleSelectStatus(cat.value)}
              >
                <div className={styles.optionLeft}>
                  <div
                    className={styles.optionDot}
                    style={{ background: cat.color }}
                  />
                  <Icon size={15} style={{ color: cat.color }} />
                  <span>{cat.label}</span>
                </div>
                {isSelected && <Check size={14} className={styles.activeCheck} />}
              </button>
            );
          })}

          {currentStatus && (
            <>
              <div className={styles.divider} />
              <button
                type="button"
                className={styles.removeOption}
                onClick={handleRemove}
              >
                <Trash2 size={14} />
                <span>Remove from Watchlist</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
