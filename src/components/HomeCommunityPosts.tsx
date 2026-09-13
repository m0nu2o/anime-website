"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MessageSquare, Flame, Sparkles, ExternalLink, ThumbsUp, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import styles from "./HomeCommunityPosts.module.css";

interface RecentDiscussion {
  id: string;
  user_id: string;
  anime_id: string;
  episode: number;
  username: string;
  avatar_url?: string;
  content: string;
  is_spoiler: boolean;
  likes: number;
  created_at: string;
}

export default function HomeCommunityPosts() {
  const [discussions, setDiscussions] = useState<RecentDiscussion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentDiscussions() {
      try {
        const { data, error } = await supabase
          .from("episode_comments")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(4);

        if (!error && data && data.length > 0) {
          setDiscussions(data as RecentDiscussion[]);
        }
      } catch {
        // Quietly fallback to empty state
      } finally {
        setLoading(false);
      }
    }

    fetchRecentDiscussions();
  }, []);

  function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name[0] || "U").toUpperCase();
  }

  function formatTimeAgo(iso: string): string {
    try {
      const diff = Date.now() - new Date(iso).getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return "just now";
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return "";
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.titleWrap}>
            <MessageSquare size={22} className={styles.headerIcon} />
            <h2 className={styles.title}>Community Discussions</h2>
          </div>
          <p className={styles.subtitle}>
            Live conversations and episode reactions from fellow anime watchers
          </p>
        </div>
        <Link href="/discover?sort=popular" className={styles.browseAllBtn}>
          <span>Explore Series</span>
          <ExternalLink size={14} />
        </Link>
      </div>

      {!loading && discussions.length > 0 ? (
        <div className={styles.postsGrid}>
          {discussions.map((disc) => (
            <div key={disc.id} className={styles.postCard}>
              <div className={styles.postHeader}>
                <div className={styles.avatarWrap}>
                  {disc.avatar_url ? (
                    <img src={disc.avatar_url} alt={disc.username} className={styles.avatarImg} />
                  ) : (
                    <div className={styles.avatarFallback}>{getInitials(disc.username)}</div>
                  )}
                </div>
                <div className={styles.authorMeta}>
                  <span className={styles.username}>{disc.username}</span>
                  <div className={styles.subMeta}>
                    <span className={styles.badge}>Episode {disc.episode}</span>
                    {disc.created_at && (
                      <span className={styles.timeAgo}>{formatTimeAgo(disc.created_at)}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.postBody}>
                {disc.is_spoiler ? (
                  <div className={styles.spoilerNotice}>
                    <span>Contains Spoilers</span>
                  </div>
                ) : (
                  <p className={styles.commentContent}>
                    {disc.content.length > 140 ? `${disc.content.slice(0, 140)}...` : disc.content}
                  </p>
                )}
              </div>

              <div className={styles.postFooter}>
                <div className={styles.likes}>
                  <ThumbsUp size={14} />
                  <span>{disc.likes || 0}</span>
                </div>
                <Link
                  href={`/watch/${disc.anime_id}/${disc.episode}`}
                  className={styles.joinDiscussionLink}
                >
                  Join Thread
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Brand empty state CTA - Authentic and Zero fabricated comments */
        <div className={styles.emptyStateCard}>
          <div className={styles.emptyStateGlow} />
          <div className={styles.emptyStateInner}>
            <div className={styles.iconCircle}>
              <Flame size={32} className={styles.flameIcon} />
            </div>
            <h3 className={styles.emptyTitle}>Join the Episode Discussions</h3>
            <p className={styles.emptyDesc}>
              Jump into real-time discussions, react to plot twists, and share your theorycrafting with the community.
              Pick any airing episode to be the first voice in the room!
            </p>
            <div className={styles.ctaRow}>
              <Link href="/calendar" className={styles.primaryCta}>
                <Calendar size={16} />
                <span>Today&apos;s Airing Calendar</span>
              </Link>
              <Link href="/discover?sort=trending" className={styles.secondaryCta}>
                <Sparkles size={16} />
                <span>Browse Trending Anime</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
