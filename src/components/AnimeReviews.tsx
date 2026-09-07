"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/supabase/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  Edit3, 
  Trash2, 
  Sparkles,
  Award,
  CheckCircle2
} from "lucide-react";
import styles from "./AnimeReviews.module.css";
import Skeleton from "@/components/ui/Skeleton";

interface ReviewItem {
  id: string;
  user_id: string;
  anime_id: string;
  username: string;
  avatar_url?: string;
  rating: number; // 1 to 10
  title: string;
  content: string;
  is_recommended: boolean;
  helpful_count: number;
  created_at: string;
}

interface AnimeReviewsProps {
  animeId: string;
  animeTitle: string;
  defaultScore?: number;
}

const RATING_DESCRIPTIONS: Record<number, string> = {
  10: "Masterpiece",
  9: "Great",
  8: "Very Good",
  7: "Good",
  6: "Fine",
  5: "Average",
  4: "Bad",
  3: "Very Bad",
  2: "Horrible",
  1: "Appalling",
};

export default function AnimeReviews({ animeId, animeTitle, defaultScore }: AnimeReviewsProps) {
  const { user, profile, openAuthModal } = useAuth();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWriting, setIsWriting] = useState(false);

  // Review Form State
  const [rating, setRating] = useState<number>(9);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isRecommended, setIsRecommended] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadReviews() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("anime_reviews")
          .select("*")
          .eq("anime_id", animeId)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setReviews(data as ReviewItem[]);
        }
      } catch (err) {
        console.warn("Failed to load anime reviews:", err);
      } finally {
        setLoading(false);
      }
    }

    loadReviews();
  }, [animeId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !content.trim()) return;

    setSubmitting(true);
    const authorName = profile?.username || user.email?.split("@")[0] || "Anime Otaku";
    const authorAvatar = profile?.avatar_url || "";

    try {
      const { data, error } = await supabase
        .from("anime_reviews")
        .upsert(
          {
            user_id: user.id,
            anime_id: animeId,
            username: authorName,
            avatar_url: authorAvatar,
            rating,
            title: title.trim(),
            content: content.trim(),
            is_recommended: isRecommended,
            created_at: new Date().toISOString(),
          },
          { onConflict: "user_id,anime_id" }
        )
        .select()
        .single();

      if (!error && data) {
        setReviews((prev) => {
          const filtered = prev.filter((r) => r.user_id !== user.id);
          return [data as ReviewItem, ...filtered];
        });
        setIsWriting(false);
      }
    } catch (err) {
      console.error("Failed to submit review:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleHelpful = async (reviewId: string, currentHelpful: number) => {
    const next = currentHelpful + 1;
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, helpful_count: next } : r))
    );
    if (!user) return;
    try {
      await supabase.rpc("increment_review_helpful_count", { row_id: reviewId });
    } catch (err) {
      console.warn("Failed to upvote review:", err);
    }
  };

  const handleDelete = async (reviewId: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    try {
      await supabase
        .from("anime_reviews")
        .delete()
        .eq("id", reviewId);
    } catch (err) {
      console.warn("Failed to delete review:", err);
    }
  };

  // Metrics
  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : defaultScore ? (defaultScore > 10 ? (defaultScore / 10).toFixed(1) : defaultScore.toFixed(1)) : null;

  const recCount = reviews.filter((r) => r.is_recommended).length;
  const recPercent = reviews.length > 0
    ? Math.round((recCount / reviews.length) * 100)
    : null;

  const currentActiveRating = hoverRating || rating;

  return (
    <section className={styles.reviewsSection}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <Award size={24} color="#fbbf24" />
          Community Reviews &amp; Ratings
        </h2>

        {!isWriting && (
          <button
            onClick={() => {
              if (!user) openAuthModal();
              else setIsWriting(true);
            }}
            className={styles.writeBtn}
          >
            <Edit3 size={16} /> Write a Review
          </button>
        )}
      </div>

      {/* Ratings Overview Card */}
      {(avgRating || reviews.length > 0) && (
        <div className={styles.statsRow}>
          {avgRating && (
            <div className={styles.bigScore}>
              <span className={styles.scoreNumber}>{avgRating}</span>
              <span className={styles.scoreMax}>/ 10</span>
            </div>
          )}

          <div className={styles.statsMeta}>
            {recPercent !== null && (
              <div className={styles.recPercentage}>
                <CheckCircle2 size={16} style={{ display: "inline", marginRight: "4px" }} />
                {recPercent}% of reviewers recommend this anime
              </div>
            )}
            <div className={styles.reviewCount}>
              Based on {reviews.length} community review{reviews.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>
      )}

      {/* Review Submission Form */}
      {isWriting && (
        <form onSubmit={handleSubmitReview} className={styles.formContainer}>
          <h3 className={styles.formTitle}>Write Your Review for {animeTitle}</h3>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Your Score (1 to 10 Stars)</label>
            <div className={styles.starRatingPicker}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className={styles.starBtn}
                >
                  <Star
                    size={22}
                    fill={star <= currentActiveRating ? "#fbbf24" : "transparent"}
                    color={star <= currentActiveRating ? "#fbbf24" : "rgba(255,255,255,0.3)"}
                  />
                </button>
              ))}
              <span className={styles.scoreLabel}>
                {currentActiveRating}/10 ({RATING_DESCRIPTIONS[currentActiveRating]})
              </span>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Review Headline</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. A breathless emotional journey with unbelievable animation"
              className={styles.input}
              maxLength={120}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Written Review</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Detail your thoughts on pacing, character development, animation style, and sound design..."
              className={styles.textarea}
              maxLength={3000}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Do you recommend this anime?</label>
            <div className={styles.recToggle}>
              <label className={styles.recOption}>
                <input
                  type="radio"
                  name="recommended"
                  checked={isRecommended}
                  onChange={() => setIsRecommended(true)}
                  style={{ accentColor: "#10b981" }}
                />
                <ThumbsUp size={16} color="#10b981" /> Yes, Recommended
              </label>
              <label className={styles.recOption}>
                <input
                  type="radio"
                  name="recommended"
                  checked={!isRecommended}
                  onChange={() => setIsRecommended(false)}
                  style={{ accentColor: "#ef4444" }}
                />
                <ThumbsDown size={16} color="#ef4444" /> Not Recommended
              </label>
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={() => setIsWriting(false)}
              className={styles.cancelBtn}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !content.trim()}
              className={styles.submitBtn}
            >
              {submitting ? "Publishing..." : "Publish Review"}
            </button>
          </div>
        </form>
      )}

      {/* Community Reviews List */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {[1, 2].map((i) => (
            <Skeleton key={i} width="100%" height="120px" borderRadius="14px" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: "center", padding: "36px 0", color: "var(--text-muted)", fontSize: "0.95rem" }}>
          No reviews written for this anime yet. Be the first critic to rate and review!
        </div>
      ) : (
        <div className={styles.reviewsList}>
          {reviews.map((review) => {
            const isAuthor = user?.id === review.user_id;

            return (
              <div key={review.id} className={styles.reviewCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.userCol}>
                    <img
                      src={review.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
                      alt={review.username}
                      className={styles.avatar}
                    />
                    <div>
                      <div className={styles.authorName}>{review.username}</div>
                      <div className={styles.reviewDate}>
                        {new Date(review.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  </div>

                  <div className={styles.badgeCol}>
                    <div className={styles.ratingBadge}>
                      <Star size={14} fill="#fbbf24" /> {review.rating}/10
                    </div>
                    {review.is_recommended ? (
                      <div className={styles.recBadge}>
                        <ThumbsUp size={12} /> Recommended
                      </div>
                    ) : (
                      <div className={styles.notRecBadge}>
                        <ThumbsDown size={12} /> Not Recommended
                      </div>
                    )}
                  </div>
                </div>

                <h3 className={styles.reviewItemTitle}>{review.title}</h3>
                <p className={styles.reviewText}>{review.content}</p>

                <div className={styles.reviewActions}>
                  <button
                    onClick={() => handleHelpful(review.id, review.helpful_count)}
                    className={styles.helpfulBtn}
                  >
                    <ThumbsUp size={13} /> Helpful ({review.helpful_count})
                  </button>

                  {isAuthor && (
                    <button
                      onClick={() => handleDelete(review.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Trash2 size={13} /> Delete Review
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
