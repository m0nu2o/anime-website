"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/supabase/AuthContext";
import { 
  getUserWatchlist, 
  getUserFavorites, 
  upsertProfile,
  WatchlistItem, 
  FavoriteItem 
} from "@/lib/supabase/dal";
import { 
  Sparkles, 
  Film, 
  Clock, 
  Star, 
  CheckCircle2, 
  Bookmark, 
  Heart, 
  Edit3, 
  Share2, 
  Settings, 
  Calendar, 
  Award, 
  Image as ImageIcon,
  Flame,
  X,
  Shield,
  Upload,
  Trash2
} from "lucide-react";
import styles from "./page.module.css";

// World-Class Anime Scenery Banners
const PRESET_BANNERS = [
  {
    id: "cyberpunk",
    name: "Cyberpunk Tokyo",
    url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&auto=format&fit=crop&q=80",
  },
  {
    id: "ghibli",
    name: "Ghibli Grasslands",
    url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80",
  },
  {
    id: "galaxy",
    name: "Cosmic Nebula",
    url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1600&auto=format&fit=crop&q=80",
  },
  {
    id: "shrine",
    name: "Cherry Blossom Shrine",
    url: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1600&auto=format&fit=crop&q=80",
  },
  {
    id: "moonlight",
    name: "Fantasy Eclipse",
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
  },
];


type ActiveTab = "overview" | "watchlist" | "favorites" | "badges";

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("");
  return (initials || "U").toUpperCase();
}

function getJoinedYear(value?: string): string {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? `Joined ${date.getFullYear()}`
    : "Join date unavailable";
}

export default function ProfilePage() {
  const { user, profile, refreshProfile, openAuthModal } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [watchlistFilter, setWatchlistFilter] = useState<string>("all");

  // Customizer Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editBanner, setEditBanner] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user data or local guest data
  useEffect(() => {
    async function loadData() {
      if (user) {
        try {
          const { syncGuestDataToSupabase } = await import("@/lib/storage/guestStore");
          await syncGuestDataToSupabase(user.id);
          const [wlData, favData] = await Promise.all([
            getUserWatchlist(user.id),
            getUserFavorites(user.id),
          ]);
          setWatchlist(wlData || []);
          setFavorites(favData || []);
        } catch (err) {
          console.warn("Error loading user profile data:", err);
        }
      } else {
        // Real local data for guests
        try {
          const { getGuestWatchlist, getGuestFavorites } = await import("@/lib/storage/guestStore");
          setWatchlist(getGuestWatchlist());
          setFavorites(getGuestFavorites());
        } catch {}
      }
      setLoading(false);
    }
    loadData();
  }, [user]);

  // Load initial form values
  useEffect(() => {
    if (profile) {
      setEditUsername(profile.username || "");
      setEditBio(profile.bio || "");
      setEditAvatar(profile.avatar_url || "");
    } else if (user) {
      setEditUsername(user.email?.split("@")[0] || "User");
    } else {
      // Guest values
      setEditUsername("Guest");
      setEditBio("Guest profiles do not have a saved bio.");
      setEditBanner(PRESET_BANNERS[0].url);
    }

    try {
      const savedBanner = localStorage.getItem("profile_banner");
      if (savedBanner) setEditBanner(savedBanner);
      else setEditBanner(PRESET_BANNERS[0].url);

      const savedAvatar = localStorage.getItem("profile_avatar");
      if (savedAvatar && (!profile || !profile.avatar_url)) {
        setEditAvatar(savedAvatar);
      }
    } catch {}
  }, [profile, user]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file (PNG, JPG, WebP, etc.).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast("Avatar image must be under 2MB.");
      return;
    }

    setAvatarLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setEditAvatar(reader.result);
        showToast("Avatar image loaded!");
      }
      setAvatarLoading(false);
    };
    reader.onerror = () => {
      showToast("Failed to read image file.");
      setAvatarLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setEditAvatar("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    showToast("Avatar reset to default initials.");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editBanner) {
        localStorage.setItem("profile_banner", editBanner);
      }

      if (editAvatar) {
        localStorage.setItem("profile_avatar", editAvatar);
      } else {
        localStorage.removeItem("profile_avatar");
      }

      if (user) {
        await upsertProfile({
          id: user.id,
          username: editUsername.trim() || undefined,
          bio: editBio.trim() || undefined,
          avatar_url: editAvatar.trim() || undefined,
        });
        await refreshProfile();
      }
      setIsModalOpen(false);
      showToast("Profile customized successfully!");
    } catch (err) {
      console.error("Failed to update profile:", err);
      showToast("Error updating profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleShareProfile = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      showToast("Profile link copied to clipboard!");
    }
  };

  // Metric computations - 100% genuine data, no fabricated placeholders
  const completedCount = watchlist.filter((w) => w.status === "completed").length;
  const watchingCount = watchlist.filter((w) => w.status === "watching").length;
  const planningCount = watchlist.filter((w) => w.status === "planning").length;
  const totalEpisodesWatched = watchlist.reduce((acc, curr) => acc + (curr.progress || 0), 0);
  const totalDaysWatched = "Unavailable";
  const scoredItems = watchlist.filter((w) => typeof w.score === "number" && w.score > 0);
  const meanScore = scoredItems.length > 0
    ? (scoredItems.reduce((acc, curr) => acc + (curr.score || 0), 0) / scoredItems.length).toFixed(1)
    : "—";
  const totalTracked = completedCount + watchingCount + planningCount;
  const completedWidth = totalTracked > 0 ? (completedCount / totalTracked) * 100 : 0;
  const watchingWidth = totalTracked > 0 ? (watchingCount / totalTracked) * 100 : 0;
  const planningWidth = totalTracked > 0 ? (planningCount / totalTracked) * 100 : 0;


  // Filtered watchlist
  const filteredWatchlist = useMemo(() => {
    if (watchlistFilter === "all") return watchlist;
    return watchlist.filter((w) => w.status === watchlistFilter);
  }, [watchlist, watchlistFilter]);

  const currentBanner = editBanner || PRESET_BANNERS[0].url;
  const currentAvatar = editAvatar || profile?.avatar_url;
  const currentUsername = profile?.username || editUsername || (user ? "Account" : "Guest");
  const currentBio = profile?.bio || editBio || (user ? "No bio added yet." : "Guest profiles do not have a saved bio.");

  return (
    <>
      <Navbar />
      <div className={styles.profileContainer}>
        {/* Toast Notification */}
        {toast && (
          <div style={{
            position: "fixed",
            top: "90px",
            right: "24px",
            background: "var(--glass-elevated-bg)",
            border: "1px solid var(--primary)",
            padding: "12px 20px",
            borderRadius: "12px",
            color: "#fff",
            zIndex: 999,
            boxShadow: "0 10px 30px rgba(0,0,0,0.8), 0 0 20px var(--primary-glow)",
            fontSize: "0.9rem",
            fontWeight: 700,
          }}>
            {toast}
          </div>
        )}

        {/* Guest Banner Callout */}
        {!user && (
          <div style={{
            margin: "16px 24px 0",
            padding: "16px 20px",
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)",
            border: "1px solid rgba(99, 102, 241, 0.35)",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
            color: "#fff"
          }}>
            <div>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "1rem", fontWeight: 800 }}>👋 Guest Profile Mode</h3>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#cbd5e1" }}>
                You are currently browsing without an account. Sign in to permanently save your watchlist, unlock custom badges, and sync across all devices.
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={openAuthModal}
                style={{
                  background: "var(--primary, #6366f1)",
                  color: "#fff",
                  border: "none",
                  padding: "8px 18px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)"
                }}
              >
                Sign In / Register
              </button>
            </div>
          </div>
        )}

        {/* 1. Cinematic Hero Banner */}
        <div className={styles.bannerWrapper}>
          <img 
            src={currentBanner} 
            alt="Profile scenery banner" 
            className={styles.bannerImage} 
          />
          <div className={styles.bannerOverlay} />
          
          <button 
            onClick={() => setIsModalOpen(true)} 
            className={styles.changeBannerBtn}
            title="Change Anime Header Banner"
          >
            <ImageIcon size={14} />
            <span>Customize Banner</span>
          </button>
        </div>

        {/* 2. Identity Card Overlapping Banner */}
        <div className={styles.identityCard}>
          <div className={styles.identityLeft}>
            <div className={styles.avatarContainer}>
              {currentAvatar ? (
                <img 
                  src={currentAvatar} 
                  alt={currentUsername} 
                  className={styles.avatarImg} 
                />
              ) : (
                <div className={styles.avatarImg} style={{ display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: "2rem" }}>
                  {getInitials(currentUsername)}
                </div>
              )}
              <span className={styles.levelBadge} title="Account level unavailable">
                <Shield size={11} /> Status unavailable
              </span>
            </div>

            <div className={styles.identityText}>
              <div className={styles.nameRow}>
                <h1 className={styles.displayName}>{currentUsername}</h1>
                <span className={styles.proPill}>
                  <Sparkles size={11} /> {user ? "Member" : "Guest"}
                </span>
                {!user && (
                  <span style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#cbd5e1",
                    padding: "3px 8px",
                    borderRadius: "9999px",
                    fontSize: "0.72rem",
                    fontWeight: 600
                  }}>
                    Guest Preview
                  </span>
                )}
              </div>

              <div className={styles.handleRow}>
                <span className={styles.handle}>@{currentUsername.toLowerCase().replace(/\s+/g, "_")}</span>
                <span>•</span>
                <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <Calendar size={13} /> {getJoinedYear(profile?.created_at)}
                </span>
                <span>•</span>
                <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <Shield size={13} style={{ color: "#94a3b8" }} /> Streaming status unavailable
                </span>
              </div>
            </div>
          </div>

          <div className={styles.identityActions}>
            <button 
              onClick={() => setIsModalOpen(true)} 
              className={`${styles.actionBtn} ${styles.primaryActionBtn}`}
            >
              <Edit3 size={15} />
              <span>Edit Profile</span>
            </button>
            <button onClick={handleShareProfile} className={styles.actionBtn} title="Share Profile">
              <Share2 size={15} />
              <span>Share</span>
            </button>
            <Link href="/settings" className={styles.actionBtn} title="Account Settings">
              <Settings size={15} />
              <span>Settings</span>
            </Link>
          </div>
        </div>

        {/* Bio Strip */}
        <div className={styles.bioBox}>
          <p style={{ margin: 0 }}>&quot;{currentBio}&quot;</p>
        </div>

        {/* 3. World-Class Anime Metrics Dashboard Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIconBadge} style={{ background: "rgba(244, 63, 94, 0.15)", color: "var(--primary)" }}>
              <Film size={22} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{totalEpisodesWatched}</span>
              <span className={styles.statLabel}>Episodes Watched</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconBadge} style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
              <Clock size={22} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{totalDaysWatched}</span>
              <span className={styles.statLabel}>Days Watched</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconBadge} style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
              <Star size={22} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{meanScore}</span>
              <span className={styles.statLabel}>Mean Score</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconBadge} style={{ background: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6" }}>
              <CheckCircle2 size={22} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{completedCount}</span>
              <span className={styles.statLabel}>Completed Anime</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconBadge} style={{ background: "rgba(6, 182, 212, 0.15)", color: "#06b6d4" }}>
              <Flame size={22} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{watchingCount}</span>
              <span className={styles.statLabel}>Currently Watching</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconBadge} style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}>
              <Bookmark size={22} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{planningCount}</span>
              <span className={styles.statLabel}>Planning To Watch</span>
            </div>
          </div>
        </div>

        {/* 4. Color-Coded Anime Life Distribution Bar */}
        <div className={styles.progressDistribution}>
          <div className={styles.progressHeader}>
            <span>Anime Consumption Distribution</span>
            <span>{completedCount + watchingCount + planningCount} Series Total</span>
          </div>
          <div className={styles.multiBar}>
            <div className={styles.barCompleted} style={{ width: `${completedWidth}%` }} title="Completed" />
            <div className={styles.barWatching} style={{ width: `${watchingWidth}%` }} title="Watching" />
            <div className={styles.barPlanning} style={{ width: `${planningWidth}%` }} title="Planning" />

          </div>
          <div className={styles.progressLegend}>
            <div className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: "#8b5cf6" }} />
              <span>Completed ({completedCount})</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: "#10b981" }} />
              <span>Watching ({watchingCount})</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: "#3b82f6" }} />
              <span>Planning ({planningCount})</span>
            </div>
          </div>
        </div>

        {/* 5. World-Class Tabbed Navigation */}
        <div className={styles.tabsNav}>
          <button 
            onClick={() => setActiveTab("overview")} 
            className={`${styles.tabBtn} ${activeTab === "overview" ? styles.activeTabBtn : ""}`}
          >
            <Sparkles size={16} />
            <span>Overview & Favorites</span>
          </button>
          <button 
            onClick={() => setActiveTab("watchlist")} 
            className={`${styles.tabBtn} ${activeTab === "watchlist" ? styles.activeTabBtn : ""}`}
          >
            <Bookmark size={16} />
            <span>Watchlist ({watchlist.length})</span>
          </button>
          <button 
            onClick={() => setActiveTab("favorites")} 
            className={`${styles.tabBtn} ${activeTab === "favorites" ? styles.activeTabBtn : ""}`}
          >
            <Heart size={16} />
            <span>Favorite Series ({favorites.length})</span>
          </button>
          <button 
            onClick={() => setActiveTab("badges")} 
            className={`${styles.tabBtn} ${activeTab === "badges" ? styles.activeTabBtn : ""}`}
          >
            <Award size={16} />
            <span>Achievements unavailable</span>
          </button>
        </div>

        {/* 6. Tab Content Panels */}
        <div className={styles.tabContent}>
          {activeTab === "overview" && (
            <div>
              {/* Highlighted Favorites Shelf */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Heart size={18} fill="var(--primary)" color="var(--primary)" /> Favorite Anime Showcase
                </h3>
                <button onClick={() => setActiveTab("favorites")} style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
                  View All &rarr;
                </button>
              </div>

              {favorites.length > 0 ? (
                <div className={styles.animeGrid}>
                  {favorites.slice(0, 6).map((item) => (
                    <Link href={`/anime/${item.anime_id}`} key={item.id} className={styles.animeCard}>
                      <img src={item.anime_image || "/placeholder-cover.svg"} alt={item.anime_title || "Favorite anime"} className={styles.animePoster} loading="lazy" />
                      <div className={styles.animeOverlay}>
                        <h4 className={styles.animeTitle}>{item.anime_title || "Untitled favorite"}</h4>
                        <div className={styles.animeMeta}>
                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <Star size={11} fill="currentColor" /> {item.anime_score ?? "Score unavailable"}
                          </span>
                          <span style={{ color: "#94a3b8" }}>{item.anime_format || "Format unavailable"}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--text-muted)", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: "16px" }}>
                  Favorite anime data is unavailable.
                </div>
              )}

              <div style={{ marginTop: "36px", padding: "24px", borderRadius: "20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <h4 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>Favorite Anime Genres</h4>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                  Genre statistics are unavailable for this profile.
                </p>
              </div>
            </div>
          )}

          {activeTab === "watchlist" && (
            <div>
              <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
                {["all", "watching", "completed", "planning"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setWatchlistFilter(status)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "9999px",
                      border: "1px solid",
                      borderColor: watchlistFilter === status ? "var(--primary)" : "rgba(255,255,255,0.1)",
                      background: watchlistFilter === status ? "var(--primary-glow)" : "rgba(255,255,255,0.04)",
                      color: watchlistFilter === status ? "#fff" : "var(--text-muted)",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      textTransform: "capitalize"
                    }}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className={styles.animeGrid}>
                {filteredWatchlist.length > 0 ? (
                  filteredWatchlist.map((item) => (
                    <Link href={`/anime/${item.anime_id}`} key={item.id} className={styles.animeCard}>
                      <img src={item.anime_image || "/placeholder-cover.svg"} alt={item.anime_title || "Anime"} className={styles.animePoster} loading="lazy" />
                      <div className={styles.animeOverlay}>
                        <h4 className={styles.animeTitle}>{item.anime_title}</h4>
                        <div className={styles.animeMeta}>
                          <span style={{ textTransform: "capitalize" }}>{item.status}</span>
                          <span>Ep {item.progress || 1}</span>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div style={{ gridColumn: "1 / -1", padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
                    <Bookmark size={40} style={{ opacity: 0.4, marginBottom: "12px" }} />
                    <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>No anime found in this watchlist category.</p>
                    <Link href="/discover" style={{ display: "inline-block", marginTop: "16px", color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}>
                      Discover New Anime &rarr;
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "favorites" && (
            <div className={styles.animeGrid}>
              {favorites.length > 0 ? (
                favorites.map((item) => (
                  <Link href={`/anime/${item.anime_id}`} key={item.id} className={styles.animeCard}>
                    <img src={item.anime_image || "/placeholder-cover.svg"} alt={item.anime_title || "Favorite"} className={styles.animePoster} loading="lazy" />
                    <div className={styles.animeOverlay}>
                      <h4 className={styles.animeTitle}>{item.anime_title}</h4>
                      <div className={styles.animeMeta}>
                        <span style={{ color: "var(--primary)" }}>Favorited</span>
                        <span>{item.anime_format || "TV"}</span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div style={{ gridColumn: "1 / -1", padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
                  <Heart size={40} style={{ opacity: 0.4, marginBottom: "12px" }} />
                  <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>You haven&apos;t added any favorite anime yet.</p>
                  <Link href="/discover" style={{ display: "inline-block", marginTop: "16px", color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}>
                    Explore Popular Anime &rarr;
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === "badges" && (
            <div className={styles.badgesGrid}>
              <div className={styles.badgeCard}>
                <div className={styles.badgeIcon}>
                  <Award size={24} style={{ color: "#ec4899" }} />
                </div>
                <div className={styles.badgeInfo}>
                  <h4>Achievements unavailable</h4>
                  <p>Profile achievement data is not available.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 7. World-Class Customizer Modal */}
        {isModalOpen && (
          <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Customize Anime Profile</h3>
                <button onClick={() => setIsModalOpen(false)} className={styles.closeBtn}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveProfile}>
                {/* Banner Presets */}
                <div className={styles.formField}>
                  <label>Select Profile Header Banner</label>
                  <div className={styles.presetBannerGrid}>
                    {PRESET_BANNERS.map((banner) => (
                      <img
                        key={banner.id}
                        src={banner.url}
                        alt={banner.name}
                        title={banner.name}
                        onClick={() => setEditBanner(banner.url)}
                        className={`${styles.presetBannerThumb} ${editBanner === banner.url ? styles.presetBannerSelected : ""}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Profile Avatar Upload */}
                <div className={styles.formField}>
                  <label>Profile Avatar</label>
                  <div className={styles.avatarCustomizerRow}>
                    <div className={styles.avatarPreviewWrap}>
                      {editAvatar ? (
                        <img src={editAvatar} alt="Avatar preview" className={styles.avatarPreviewImg} />
                      ) : (
                        <div className={styles.avatarPreviewFallback}>
                          {getInitials(editUsername || "User")}
                        </div>
                      )}
                    </div>
                    <div className={styles.avatarUploadControls}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileChange}
                        style={{ display: "none" }}
                      />
                      <div className={styles.avatarBtnRow}>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className={styles.uploadAvatarBtn}
                          disabled={avatarLoading}
                        >
                          <Upload size={14} />
                          <span>{avatarLoading ? "Uploading..." : "Upload Image"}</span>
                        </button>
                        {editAvatar && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            className={styles.removeAvatarBtn}
                          >
                            <Trash2 size={13} />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                      <span className={styles.avatarHint}>
                        JPG, PNG, WebP up to 2MB. Preview updates instantly.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Username */}
                <div className={styles.formField}>
                  <label>Display Username</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className={styles.formInput}
                    placeholder="Enter your display username"
                    maxLength={30}
                    required
                  />
                </div>

                {/* Custom Bio */}
                <div className={styles.formField}>
                  <label>Otaku Bio & Favorite Series</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className={styles.formTextarea}
                    rows={3}
                    placeholder="Share your favorite genres, anime characters, and top series..."
                    maxLength={250}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className={styles.actionBtn}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={`${styles.actionBtn} ${styles.primaryActionBtn}`}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
