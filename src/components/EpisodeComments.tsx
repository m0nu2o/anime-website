"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/supabase/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { 
  MessageSquare, 
  Send, 
  ThumbsUp, 
  AlertTriangle, 
  Trash2, 
  Eye, 
  EyeOff,
  Sparkles
} from "lucide-react";
import styles from "./EpisodeComments.module.css";
import Skeleton from "@/components/ui/Skeleton";

interface CommentItem {
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

interface EpisodeCommentsProps {
  animeId: string;
  episode: number;
}

export default function EpisodeComments({ animeId, episode }: EpisodeCommentsProps) {
  const { user, profile, openAuthModal } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadComments() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("episode_comments")
          .select("*")
          .eq("anime_id", animeId)
          .eq("episode", episode)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setComments(data as CommentItem[]);
        }
      } catch (err) {
        console.warn("Failed to load episode comments:", err);
      } finally {
        setLoading(false);
      }
    }

    loadComments();
  }, [animeId, episode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !text.trim()) return;

    setSubmitting(true);
    const authorName = profile?.username || user.email?.split("@")[0] || "Anime Otaku";
    const authorAvatar = profile?.avatar_url || "";

    try {
      const { data, error } = await supabase
        .from("episode_comments")
        .insert({
          user_id: user.id,
          anime_id: animeId,
          episode,
          username: authorName,
          avatar_url: authorAvatar,
          content: text.trim(),
          is_spoiler: isSpoiler,
          likes: 0,
        })
        .select()
        .single();

      if (!error && data) {
        setComments((prev) => [data as CommentItem, ...prev]);
        setText("");
        setIsSpoiler(false);
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (commentId: string, currentLikes: number) => {
    const nextLikes = currentLikes + 1;
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, likes: nextLikes } : c))
    );
    if (!user) return;
    try {
      await supabase.rpc("increment_comment_likes", { row_id: commentId });
    } catch (err) {
      console.warn("Failed to like comment:", err);
    }
  };

  const handleDelete = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    try {
      await supabase
        .from("episode_comments")
        .delete()
        .eq("id", commentId);
    } catch (err) {
      console.warn("Failed to delete comment:", err);
    }
  };

  const toggleRevealSpoiler = (id: string) => {
    setRevealedSpoilers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className={styles.commentsSection}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <MessageSquare size={20} color="var(--accent)" />
          Episode Discussion
          <span className={styles.commentCount}>{comments.length}</span>
        </h2>
        <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
          Episode {episode} Reactions
        </span>
      </div>

      {/* New Comment Input */}
      {user ? (
        <form onSubmit={handleSubmit} className={styles.formWrapper}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`What did you think of Episode ${episode}? Share your reaction, theories, or favorite moments...`}
            className={styles.textarea}
            maxLength={1000}
            required
          />
          <div className={styles.formControls}>
            <label className={styles.spoilerToggle}>
              <input
                type="checkbox"
                checked={isSpoiler}
                onChange={(e) => setIsSpoiler(e.target.checked)}
                style={{ accentColor: "#f59e0b" }}
              />
              <AlertTriangle size={14} /> Contains Spoilers
            </label>

            <button
              type="submit"
              disabled={submitting || !text.trim()}
              className={styles.submitBtn}
            >
              {submitting ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.authPrompt}>
          <span>Want to join the discussion?</span>
          <button onClick={openAuthModal} className={styles.signInLink}>
            Sign In to Comment
          </button>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[1, 2].map((i) => (
            <Skeleton key={i} width="100%" height="70px" borderRadius="10px" />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
          No comments on this episode yet. Be the first to start the conversation!
        </div>
      ) : (
        <div className={styles.commentsList}>
          {comments.map((comment) => {
            const isRevealed = revealedSpoilers[comment.id];
            const isAuthor = user?.id === comment.user_id;

            return (
              <div key={comment.id} className={styles.commentCard}>
                <img
                  src={comment.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
                  alt={comment.username}
                  className={styles.avatar}
                />
                <div className={styles.commentBody}>
                  <div className={styles.commentMeta}>
                    <span className={styles.author}>{comment.username}</span>
                    <span className={styles.timestamp}>
                      {new Date(comment.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {comment.is_spoiler && (
                      <span className={styles.spoilerBadge}>SPOILER</span>
                    )}
                  </div>

                  {comment.is_spoiler && !isRevealed ? (
                    <div
                      onClick={() => toggleRevealSpoiler(comment.id)}
                      className={styles.spoilerHidden}
                    >
                      <Eye size={14} style={{ display: "inline", marginRight: "6px" }} />
                      Warning: This comment contains spoilers for Episode {episode}. Click to reveal.
                    </div>
                  ) : (
                    <p className={styles.content}>{comment.content}</p>
                  )}

                  <div className={styles.commentActions}>
                    <button
                      onClick={() => handleLike(comment.id, comment.likes)}
                      className={styles.actionBtn}
                      title="Upvote comment"
                    >
                      <ThumbsUp size={13} /> {comment.likes > 0 ? comment.likes : "Like"}
                    </button>

                    {comment.is_spoiler && isRevealed && (
                      <button
                        onClick={() => toggleRevealSpoiler(comment.id)}
                        className={styles.actionBtn}
                      >
                        <EyeOff size={13} /> Hide spoiler
                      </button>
                    )}

                    {isAuthor && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        title="Delete comment"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
