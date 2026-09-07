"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  Play,
  X,
  UserCheck,
  Zap,
  Shield,
  Layers
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

// World-Class Anime Hero Avatar Presets
const PRESET_AVATARS = [
  {
    name: "Satoru Gojo",
    url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=300&auto=format&fit=crop&q=80",
  },
  {
    name: "Luffy (Gear 5)",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
  },
  {
    name: "Frieren (Elf Mage)",
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80",
  },
  {
    name: "Tanjiro Kamado",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
  },
  {
    name: "Sung Jinwoo",
    url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80",
  },
  {
    name: "Makima",
    url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80",
  },
];

// Top Anime Badges & Achievements
const ACHIEVEMENTS = [
  {
    id: "pioneer",
    title: "Otaku Pioneer",
    desc: "Member of NextGen Anime's early access platform.",
    iconType: "pioneer",
    unlocked: true,
  },
  {
    id: "voyager",
    title: "Cosmic Voyager",
    desc: "Explored 3D particle black holes & quantum simulators.",
    iconType: "voyager",
    unlocked: true,
  },
  {
    id: "binge",
    title: "Marathon Legend",
    desc: "Watched over 25+ episodes of anime in one stretch.",
    iconType: "binge",
    unlocked: true,
  },
  {
    id: "critic",
    title: "Pro Anime Critic",
    desc: "Rated and reviewed series in the anime community.",
    iconType: "critic",
    unlocked: true,
  },
  {
    id: "shonen",
    title: "Shonen Prodigy",
    desc: "Tracked classic action and battle anime series.",
    iconType: "shonen",
    unlocked: true,
  },
  {
    id: "nightowl",
    title: "Midnight Streamer",
    desc: "Streamed episodes between 1:00 AM and 5:00 AM JST.",
    iconType: "nightowl",
    unlocked: true,
  },
  {
    id: "speedrun",
    title: "OP/ED Skipper",
    desc: "Mastered instant 90s opening & ending skip controls.",
    iconType: "speedrun",
    unlocked: true,
  },
  {
    id: "collector",
    title: "Master Collector",
    desc: "Added 10+ anime to personalized favorites & watchlist.",
    iconType: "collector",
    unlocked: false,
  },
];

type ActiveTab = "overview" | "watchlist" | "favorites" | "badges";

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
  const [toast, setToast] = useState<string | null>(null);

  // Load user data or local demo data
  useEffect(() => {
    async function loadData() {
      if (user) {
        try {
          const [wlData, favData] = await Promise.all([
            getUserWatchlist(user.id),
            getUserFavorites(user.id),
          ]);
          setWatchlist(wlData || []);
          setFavorites(favData || []);
        } catch (err) {
          console.warn("Error loading user profile data:", err);
        }
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
      setEditAvatar(profile.avatar_url || PRESET_AVATARS[0].url);
    } else if (user) {
      setEditUsername(user.email?.split("@")[0] || "NextGen Otaku");
      setEditAvatar(PRESET_AVATARS[0].url);
    } else {
      // Demo guest fallback values
      setEditUsername("ShadowOtaku");
      setEditBio("Obsessed with dark fantasy, Isekai, and high-octane battle Shonen. Catch me streaming late into Tokyo midnight.");
      setEditAvatar(PRESET_AVATARS[0].url);
      setEditBanner(PRESET_BANNERS[0].url);
    }

    try {
      const savedBanner = localStorage.getItem("profile_banner");
      if (savedBanner) setEditBanner(savedBanner);
      else setEditBanner(PRESET_BANNERS[0].url);
    } catch {}
  }, [profile, user]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editBanner) {
        localStorage.setItem("profile_banner", editBanner);
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

  // Metric computations
  const completedCount = watchlist.filter((w) => w.status === "completed").length || (user ? 0 : 18);
  const watchingCount = watchlist.filter((w) => w.status === "watching").length || (user ? 0 : 7);
  const planningCount = watchlist.filter((w) => w.status === "planning").length || (user ? 0 : 14);
  const totalEpisodesWatched = watchlist.reduce((acc, curr) => acc + (curr.progress || 0), 0) || (user ? 0 : 342);
  const totalDaysWatched = (totalEpisodesWatched * 23.5 / 1440).toFixed(1);
  const meanScore = "8.8";

  // Filtered watchlist
  const filteredWatchlist = useMemo(() => {
    if (watchlistFilter === "all") return watchlist;
    return watchlist.filter((w) => w.status === watchlistFilter);
  }, [watchlist, watchlistFilter]);

  const currentBanner = editBanner || PRESET_BANNERS[0].url;
  const currentAvatar = editAvatar || (profile?.avatar_url) || PRESET_AVATARS[0].url;
  const currentUsername = profile?.username || editUsername || "Anime Otaku";
  const currentBio = profile?.bio || editBio || "Passionate anime fan exploring worlds, seasons, and cinematic anime simulations.";

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
              <img 
                src={currentAvatar} 
                alt={currentUsername} 
                className={styles.avatarImg} 
              />
              <span className={styles.levelBadge} title="Level 42 Master Otaku">
                <Flame size={11} /> LV. 42
              </span>
            </div>

            <div className={styles.identityText}>
              <div className={styles.nameRow}>
                <h1 className={styles.displayName}>{currentUsername}</h1>
                <span className={styles.proPill}>
                  <Sparkles size={11} /> Master Otaku
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
                  <Calendar size={13} /> Joined 2026
                </span>
                <span>•</span>
                <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <Shield size={13} style={{ color: "#10b981" }} /> Verified Streamer
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
          <p style={{ margin: 0 }}>"{currentBio}"</p>
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
            <div className={styles.barCompleted} style={{ width: "55%" }} title="Completed" />
            <div className={styles.barWatching} style={{ width: "25%" }} title="Watching" />
            <div className={styles.barPlanning} style={{ width: "20%" }} title="Planning" />
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
            <span>Watchlist ({watchlist.length || 25})</span>
          </button>
          <button 
            onClick={() => setActiveTab("favorites")} 
            className={`${styles.tabBtn} ${activeTab === "favorites" ? styles.activeTabBtn : ""}`}
          >
            <Heart size={16} />
            <span>Favorite Series ({favorites.length || 8})</span>
          </button>
          <button 
            onClick={() => setActiveTab("badges")} 
            className={`${styles.tabBtn} ${activeTab === "badges" ? styles.activeTabBtn : ""}`}
          >
            <Award size={16} />
            <span>Achievements ({ACHIEVEMENTS.filter(a => a.unlocked).length}/{ACHIEVEMENTS.length})</span>
          </button>
        </div>

        {/* 6. Tab Content Panels */}
        <div className={styles.tabContent}>
          {activeTab === "overview" && (
            <div>
              {/* Highlighted Favorites Shelf */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Heart size={18} fill="var(--primary)" color="var(--primary)" /> Top Anime Showcase
                </h3>
                <button onClick={() => setActiveTab("favorites")} style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
                  View All &rarr;
                </button>
              </div>

              <div className={styles.animeGrid}>
                {[
                  { id: "anilist-16498", title: "Attack on Titan", image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400", score: "9.0", format: "TV" },
                  { id: "anilist-154587", title: "Frieren: Beyond Journey's End", image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400", score: "9.1", format: "TV" },
                  { id: "anilist-11061", title: "Hunter x Hunter (2011)", image: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=400", score: "9.0", format: "TV" },
                  { id: "anilist-99147", title: "Vinland Saga", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400", score: "8.8", format: "TV" },
                  { id: "anilist-1535", title: "Death Note", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400", score: "8.7", format: "TV" },
                  { id: "anilist-21", title: "One Piece", image: "https://images.unsplash.com/photo-1563089145-599997674d42?w=400", score: "8.9", format: "TV" },
                ].map((anime) => (
                  <Link href={`/anime/${anime.id}`} key={anime.id} className={styles.animeCard}>
                    <img src={anime.image} alt={anime.title} className={styles.animePoster} loading="lazy" />
                    <div className={styles.animeOverlay}>
                      <h4 className={styles.animeTitle}>{anime.title}</h4>
                      <div className={styles.animeMeta}>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Star size={11} fill="currentColor" /> {anime.score}
                        </span>
                        <span style={{ color: "#94a3b8" }}>{anime.format}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Favorite Anime Genres Breakdown */}
              <div style={{ marginTop: "36px", padding: "24px", borderRadius: "20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <h4 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>Top Watched Genres</h4>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {[
                    { name: "Action & Adventure", percent: "88%", color: "#ef4444" },
                    { name: "Dark Fantasy & Supernatural", percent: "76%", color: "#8b5cf6" },
                    { name: "Isekai & Reincarnation", percent: "64%", color: "#06b6d4" },
                    { name: "Sci-Fi & Cyberpunk", percent: "52%", color: "#10b981" },
                    { name: "Psychological Thriller", percent: "48%", color: "#f59e0b" },
                  ].map((genre) => (
                    <div key={genre.name} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 16px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      fontSize: "0.85rem",
                      fontWeight: 700
                    }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: genre.color }} />
                      <span style={{ color: "#fff" }}>{genre.name}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{genre.percent}</span>
                    </div>
                  ))}
                </div>
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
                  <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>You haven't added any favorite anime yet.</p>
                  <Link href="/discover" style={{ display: "inline-block", marginTop: "16px", color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}>
                    Explore Popular Anime &rarr;
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === "badges" && (
            <div className={styles.badgesGrid}>
              {ACHIEVEMENTS.map((badge) => (
                <div 
                  key={badge.id} 
                  className={`${styles.badgeCard} ${badge.unlocked ? styles.badgeUnlocked : ""}`}
                  style={{ opacity: badge.unlocked ? 1 : 0.5 }}
                >
                  <div className={styles.badgeIcon}>
                    {badge.iconType === "pioneer" && <Shield size={24} style={{ color: "#3b82f6" }} />}
                    {badge.iconType === "voyager" && <Sparkles size={24} style={{ color: "#8b5cf6" }} />}
                    {badge.iconType === "binge" && <Zap size={24} style={{ color: "#f59e0b" }} />}
                    {badge.iconType === "critic" && <Star size={24} style={{ color: "#facc15" }} />}
                    {badge.iconType === "shonen" && <Flame size={24} style={{ color: "#ef4444" }} />}
                    {badge.iconType === "nightowl" && <Clock size={24} style={{ color: "#06b6d4" }} />}
                    {badge.iconType === "speedrun" && <Play size={24} style={{ color: "#10b981" }} />}
                    {badge.iconType === "collector" && <Award size={24} style={{ color: "#ec4899" }} />}
                  </div>
                  <div className={styles.badgeInfo}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <h4>{badge.title}</h4>
                      {badge.unlocked && (
                        <CheckCircle2 size={14} style={{ color: "#10b981" }} />
                      )}
                    </div>
                    <p>{badge.desc}</p>
                  </div>
                </div>
              ))}
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

                {/* Avatar Presets */}
                <div className={styles.formField}>
                  <label>Choose Anime Avatar Preset</label>
                  <div className={styles.presetGrid}>
                    {PRESET_AVATARS.map((avatar) => (
                      <img
                        key={avatar.name}
                        src={avatar.url}
                        alt={avatar.name}
                        title={avatar.name}
                        onClick={() => setEditAvatar(avatar.url)}
                        className={`${styles.presetAvatar} ${editAvatar === avatar.url ? styles.presetSelected : ""}`}
                      />
                    ))}
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
