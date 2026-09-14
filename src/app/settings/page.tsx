"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/supabase/AuthContext";
import { 
  User, 
  Tv, 
  Palette, 
  ShieldAlert, 
  LogOut, 
  Download, 
  Trash2,
  Check
} from "lucide-react";
import styles from "./page.module.css";
import { getUserWatchlist } from "@/lib/supabase/dal";
import { useThemeSimulator, THEME_CONFIGS } from "@/components/ThemeSimulatorProvider";

export default function SettingsPage() {
  const { user, profile, signOut, openAuthModal } = useAuth();
  const { weather, setWeather } = useThemeSimulator();

  // Playback settings
  const [autoplay, setAutoplay] = useState(true);
  const [quality, setQuality] = useState("1080p");
  const [preferredAudio, setPreferredAudio] = useState("sub");
  const [clearedMessage, setClearedMessage] = useState("");
  const [exportMessage, setExportMessage] = useState("");

  useEffect(() => {
    // Load local storage preferences
    const savedAutoplay = localStorage.getItem("nextgen_autoplay");
    if (savedAutoplay !== null) setAutoplay(savedAutoplay === "true");

    const savedQuality = localStorage.getItem("nextgen_quality");
    if (savedQuality) setQuality(savedQuality);

    const savedAudio = localStorage.getItem("preferredLanguage");
    if (savedAudio) setPreferredAudio(savedAudio);
  }, []);

  const toggleAutoplay = () => {
    const next = !autoplay;
    setAutoplay(next);
    localStorage.setItem("nextgen_autoplay", String(next));
  };

  const handleQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setQuality(e.target.value);
    localStorage.setItem("nextgen_quality", e.target.value);
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPreferredAudio(e.target.value);
    localStorage.setItem("preferredLanguage", e.target.value);
  };

  const handleExportData = async () => {
    if (!user) return;
    try {
      const data = await getUserWatchlist(user.id);
      const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonStr);
      downloadAnchor.setAttribute("download", `nextgen_watchlist_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setExportMessage("Watchlist exported!");
      setTimeout(() => setExportMessage(""), 3000);
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  const handleClearLocalCache = () => {
    localStorage.removeItem("nextgen_autoplay");
    localStorage.removeItem("nextgen_quality");
    localStorage.removeItem("watchHistory");
    setClearedMessage("Local playback preferences and history reset.");
    setTimeout(() => setClearedMessage(""), 3000);
  };

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <h1 className={styles.title}>Preferences & Settings</h1>
        <p className={styles.subtitle}>
          Customize your streaming playback preferences, visual theme, and account management.
        </p>

        {/* Account Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <User size={20} color="var(--accent)" />
            <h2 className={styles.sectionTitle}>Account & Authentication</h2>
          </div>

          {user ? (
            <>
              <div className={styles.settingRow}>
                <div>
                  <div className={styles.settingLabel}>Email Address</div>
                  <div className={styles.settingDesc}>{user.email}</div>
                </div>
                <span style={{ fontSize: "0.82rem", color: "#10b981", fontWeight: 600 }}>Active</span>
              </div>

              <div className={styles.settingRow}>
                <div>
                  <div className={styles.settingLabel}>User ID</div>
                  <div className={styles.settingDesc} style={{ fontFamily: "monospace" }}>{user.id}</div>
                </div>
              </div>

              <div className={styles.settingRow}>
                <div>
                  <div className={styles.settingLabel}>Sign Out of All Sessions</div>
                  <div className={styles.settingDesc}>Log out from this browser session securely.</div>
                </div>
                <button onClick={signOut} className={styles.btnDanger}>
                  <LogOut size={16} style={{ display: "inline", marginRight: "6px" }} />
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className={styles.settingRow}>
              <div>
                <div className={styles.settingLabel}>Not Signed In</div>
                <div className={styles.settingDesc}>Sign in to sync your watchlists and personalize your experience.</div>
              </div>
              <button onClick={openAuthModal} className={styles.btnAction}>
                Sign In
              </button>
            </div>
          )}
        </div>

        {/* Playback Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Tv size={20} color="var(--accent)" />
            <h2 className={styles.sectionTitle}>Player & Streaming</h2>
          </div>

          <div className={styles.settingRow}>
            <div>
              <div className={styles.settingLabel}>Autoplay Next Episode</div>
              <div className={styles.settingDesc}>Automatically transition to the next episode when current finishes.</div>
            </div>
            <button 
              onClick={toggleAutoplay}
              className={`${styles.toggle} ${autoplay ? styles.toggleActive : ""}`}
              aria-label="Toggle autoplay"
            >
              <span className={`${styles.toggleThumb} ${autoplay ? styles.toggleThumbActive : ""}`} />
            </button>
          </div>

          <div className={styles.settingRow}>
            <div>
              <div className={styles.settingLabel}>Preferred Audio Language</div>
              <div className={styles.settingDesc}>Choose your default playback audio track (with graceful fallback).</div>
            </div>
            <select value={preferredAudio} onChange={handleAudioChange} className={styles.select}>
              <option value="sub">Japanese (English Subtitles)</option>
              <option value="dub">English Dubbed</option>
            </select>
          </div>

          <div className={styles.settingRow}>
            <div>
              <div className={styles.settingLabel}>Video Resolution Preference</div>
              <div className={styles.settingDesc}>Default player resolution when supported by provider (with adaptive fallback).</div>
            </div>
            <select value={quality} onChange={handleQualityChange} className={styles.select}>
              <option value="1080p">1080p FHD (Provider Supported)</option>
              <option value="720p">720p HD</option>
              <option value="auto">Auto (Adaptive)</option>
            </select>
          </div>
        </div>

        {/* Theme Accent Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Palette size={20} color="var(--accent)" />
            <h2 className={styles.sectionTitle}>3D Simulation Theme & Typography</h2>
          </div>

          <div className={styles.settingRow}>
            <div>
              <div className={styles.settingLabel}>Active Simulation Matrix</div>
              <div className={styles.settingDesc}>Select a mathematical background simulation that morphs font, typography, and color palette.</div>
            </div>
            <div className={styles.themePills}>
              {["sun", "neural", "attractor", "blackhole", "neuro", "quantum"].map(key => {
                const cfg = THEME_CONFIGS[key];
                const isSelected = (THEME_CONFIGS[weather]?.name || weather) === key;
                return (
                  <button
                    key={key}
                    onClick={() => setWeather(key)}
                    className={`${styles.themePill} ${isSelected ? styles.themePillSelected : ""}`}
                    style={{ backgroundColor: cfg.primaryColor }}
                    title={`${cfg.label} (${cfg.fontFamily.split(",")[0].replace(/'/g, "")})`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Data & Privacy */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <ShieldAlert size={20} color="var(--accent)" />
            <h2 className={styles.sectionTitle}>Data & Export</h2>
          </div>

          <div className={styles.settingRow}>
            <div>
              <div className={styles.settingLabel}>Export Watchlist</div>
              <div className={styles.settingDesc}>Download a portable JSON backup of your tracked anime library.</div>
            </div>
            <button onClick={handleExportData} className={styles.btnAction} disabled={!user}>
              <Download size={14} style={{ display: "inline", marginRight: "6px" }} />
              Export
            </button>
          </div>
          {exportMessage && (
            <div style={{ color: "#10b981", fontSize: "0.85rem", marginTop: "8px" }}>
              <Check size={14} style={{ display: "inline" }} /> {exportMessage}
            </div>
          )}

          <div className={styles.settingRow}>
            <div>
              <div className={styles.settingLabel}>Reset Local Preferences</div>
              <div className={styles.settingDesc}>Clear cached playback choices and restore defaults.</div>
            </div>
            <button onClick={handleClearLocalCache} className={styles.btnAction}>
              <Trash2 size={14} style={{ display: "inline", marginRight: "6px" }} />
              Reset Cache
            </button>
          </div>
          {clearedMessage && (
            <div style={{ color: "#10b981", fontSize: "0.85rem", marginTop: "8px" }}>
              <Check size={14} style={{ display: "inline" }} /> {clearedMessage}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
