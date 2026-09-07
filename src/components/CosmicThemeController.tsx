"use client";

import React, { useState, useEffect } from "react";
import { Sun, Sparkles, Zap, Eye, Gauge, Compass } from "lucide-react";
import styles from "./CosmicThemeController.module.css";

type CelestialTheme = "solar" | "hypernova" | "nebula" | "stealth";

export default function CosmicThemeController() {
  const [theme, setTheme] = useState<CelestialTheme>("solar");
  const [intensity, setIntensity] = useState<number>(65);

  useEffect(() => {
    const savedTheme = localStorage.getItem("nextgen_celestial_theme") as CelestialTheme;
    if (savedTheme) setTheme(savedTheme);
    const savedIntensity = localStorage.getItem("nextgen_fx_intensity");
    if (savedIntensity) setIntensity(parseInt(savedIntensity, 10));
  }, []);

  const handleSelectTheme = (t: CelestialTheme) => {
    setTheme(t);
    localStorage.setItem("nextgen_celestial_theme", t);
    // Dispatch custom event for ambient canvas
    window.dispatchEvent(new CustomEvent("nextgen-theme-change", { detail: { theme: t } }));
  };

  const handleIntensityChange = (val: number) => {
    setIntensity(val);
    localStorage.setItem("nextgen_fx_intensity", String(val));
    window.dispatchEvent(new CustomEvent("nextgen-intensity-change", { detail: { intensity: val / 100 } }));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.badge}>
          <Sun size={14} /> Living Celestial Engine
        </div>
        <h2 className={styles.title}>Ambient Background Controls</h2>
        <p className={styles.subtitle}>
          Customize the interactive 3D Solar Fusion simulation that illuminates the background across the entire NextGen Anime platform.
        </p>
      </div>

      <div className={styles.grid}>
        {/* Preset Selector */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Celestial Color Preset</h3>
          <div className={styles.themeOptions}>
            <button
              onClick={() => handleSelectTheme("solar")}
              className={`${styles.themeBtn} ${theme === "solar" ? styles.activeSolar : ""}`}
            >
              <div className={styles.colorDot} style={{ background: "linear-gradient(135deg, #f59e0b, #f43f5e)" }} />
              <div>
                <h4>Solar Fusion (Default)</h4>
                <p>Golden photosphere, fiery spicules, and plasma loops</p>
              </div>
            </button>

            <button
              onClick={() => handleSelectTheme("hypernova")}
              className={`${styles.themeBtn} ${theme === "hypernova" ? styles.activeHypernova : ""}`}
            >
              <div className={styles.colorDot} style={{ background: "linear-gradient(135deg, #38bdf8, #818cf8)" }} />
              <div>
                <h4>Hypernova Cyan</h4>
                <p>Relativistic particle jets and electric magnetic arches</p>
              </div>
            </button>

            <button
              onClick={() => handleSelectTheme("nebula")}
              className={`${styles.themeBtn} ${theme === "nebula" ? styles.activeNebula : ""}`}
            >
              <div className={styles.colorDot} style={{ background: "linear-gradient(135deg, #ec4899, #a855f7)" }} />
              <div>
                <h4>Cosmic Nebula</h4>
                <p>Ultraviolet ionization and interstellar gas glow</p>
              </div>
            </button>

            <button
              onClick={() => handleSelectTheme("stealth")}
              className={`${styles.themeBtn} ${theme === "stealth" ? styles.activeStealth : ""}`}
            >
              <div className={styles.colorDot} style={{ background: "linear-gradient(135deg, #64748b, #1e293b)" }} />
              <div>
                <h4>Stealth Void</h4>
                <p>Low-contrast deep space starlight for focused reading</p>
              </div>
            </button>
          </div>
        </div>

        {/* Dynamic Sliders */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Simulation Parameters</h3>
          <div className={styles.sliders}>
            <div className={styles.sliderGroup}>
              <div className={styles.sliderHeader}>
                <span className={styles.sliderLabel}><Eye size={14} /> Background Opacity</span>
                <span className={styles.sliderValue}>{intensity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={intensity}
                onChange={(e) => handleIntensityChange(parseInt(e.target.value, 10))}
                className={styles.rangeInput}
              />
            </div>

            <div className={styles.statusBox}>
              <Sparkles size={16} className={styles.statusIcon} />
              <p>
                Settings are automatically saved in local storage and synchronize across all tabs in real-time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
