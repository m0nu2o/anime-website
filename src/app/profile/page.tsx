"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/supabase/AuthContext";
import { 
  getUserWatchlist, 
  getUserFavorites, 
  upsertProfile,
  WatchlistItem, 
  FavoriteItem 
} from "@/lib/supabase/dal";
import Link from "next/link";
import { 
  User, 
  Mail, 
  Calendar, 
  Edit3, 
  Heart, 
  Bookmark, 
  CheckCircle2, 
  Sparkles,
  Save,
  X
} from "lucide-react";
import styles from "./page.module.css";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

const DEFAULT_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
];

export default function ProfilePage() {
  const { user, profile, refreshProfile, openAuthModal } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const currentUserId = user.id;

    async function loadData() {
      setLoading(true);
      try {
        const [wlData, favData] = await Promise.all([
          getUserWatchlist(currentUserId),
          getUserFavorites(currentUserId),
        ]);
        setWatchlist(wlData);
        setFavorites(favData);
      } catch (err) {
        console.error("Failed to load profile data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  useEffect(() => {
    if (profile) {
      setEditUsername(profile.username || "");
      setEditBio(profile.bio || "");
      setEditAvatar(profile.avatar_url || "");
    } else if (user) {
      setEditUsername(user.email?.split("@")[0] || "");
    }
  }, [profile, user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      await upsertProfile({
        id: user.id,
        username: editUsername.trim() || undefined,
        bio: editBio.trim() || undefined,
        avatar_url: editAvatar.trim() || undefined,
      });
      await refreshProfile();
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const completedCount = watchlist.filter(w => w.status === "completed").length;
  const watchingCount = watchlist.filter(w => w.status === "watching").length;
  const totalEpisodesWatched = watchlist.reduce((acc, curr) => acc + (curr.progress || 0), 0);

  if (!user && !loading) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <div className={styles.authNotice}>
            <Sparkles size={40} color="var(--accent)" style={{ marginBottom: "16px" }} />
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "12px" }}>Sign In to View Profile</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "24px" }}>
              Log in to view your anime profile, customize your avatar and bio, and inspect your anime tracking stats.
            </p>
            <button onClick={openAuthModal} className={styles.saveBtn}>
              Sign In to Your Account
            </button>
          </div>
        </div>
      </>
    );
  }

  const avatarSrc = profile?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80";

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        {/* Profile Card */}
        <div className={styles.profileCard}>
          <div className={styles.avatarWrapper}>
            <img 
              src={avatarSrc} 
              alt={profile?.username || "User avatar"} 
              className={styles.avatar} 
            />
          </div>

          <div className={styles.profileInfo}>
            <div className={styles.usernameRow}>
              <h1 className={styles.username}>
                {profile?.username || user?.email?.split("@")[0] || "Anime Otaku"}
              </h1>
              <span className={styles.badge}>NextGen Member</span>
            </div>

            <div className={styles.metaInfo}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Mail size={14} /> {user?.email}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Calendar size={14} /> Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "2026"}
              </span>
            </div>

            <p className={styles.bio}>
              {profile?.bio || "No bio yet. Tell the anime community about your favorite series and genres!"}
            </p>

            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className={styles.editBtn}>
                <Edit3 size={16} /> Edit Profile
              </button>
            )}

            {saveSuccess && (
              <span style={{ marginLeft: "12px", color: "#10b981", fontSize: "0.88rem", fontWeight: 600 }}>
                Profile updated successfully!
              </span>
            )}
          </div>
        </div>

        {/* Edit Form Modal/Inline */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className={styles.editForm}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "16px" }}>Edit Your Profile</h3>
            
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Username</label>
              <input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className={styles.formInput}
                placeholder="Choose your display username"
                maxLength={30}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Avatar Image URL</label>
              <input
                type="url"
                value={editAvatar}
                onChange={(e) => setEditAvatar(e.target.value)}
                className={styles.formInput}
                placeholder="https://... (or choose from presets below)"
              />
              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                {DEFAULT_AVATARS.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt="Preset"
                    onClick={() => setEditAvatar(url)}
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      cursor: "pointer",
                      border: editAvatar === url ? "2px solid var(--accent)" : "1px solid rgba(255,255,255,0.2)",
                      objectFit: "cover"
                    }}
                  />
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Bio</label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className={styles.formTextarea}
                placeholder="Share your favorite anime, favorite characters, or genres..."
                maxLength={300}
              />
            </div>

            <div className={styles.formActions}>
              <button 
                type="button" 
                onClick={() => setIsEditing(false)} 
                className={styles.cancelBtn}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className={styles.saveBtn}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}

        {/* Stats Row */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{watchingCount}</div>
            <div className={styles.statTitle}>Watching</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{completedCount}</div>
            <div className={styles.statTitle}>Completed</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{totalEpisodesWatched}</div>
            <div className={styles.statTitle}>Episodes Watched</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{favorites.length}</div>
            <div className={styles.statTitle}>Favorites</div>
          </div>
        </div>

        {/* Favorites Preview */}
        <h2 className={styles.sectionTitle}>
          <Heart size={20} color="#ec4899" />
          Favorites ({favorites.length})
        </h2>

        {loading ? (
          <div className={styles.grid}>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} width="100%" height="240px" borderRadius="12px" />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <EmptyState
            title="No Favorites Added Yet"
            description="Browse anime and click the heart icon on any detail page to feature your favorites here."
            actionLabel="Discover Anime"
            actionHref="/discover"
          />
        ) : (
          <div className={styles.grid}>
            {favorites.slice(0, 6).map(fav => (
              <Link 
                key={fav.anime_id} 
                href={`/anime/${fav.anime_id}`}
                className={styles.favCard}
              >
                <img 
                  src={fav.anime_image || "/placeholder-cover.svg"} 
                  alt={fav.anime_title} 
                  className={styles.favPoster}
                />
                <div className={styles.favTitle}>{fav.anime_title}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
