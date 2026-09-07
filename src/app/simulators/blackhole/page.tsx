"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import { Loader2, Play, Pause, RotateCcw, Sparkles, Orbit, Gauge } from "lucide-react";
import styles from "./page.module.css";

const BlackHoleSimulator = dynamic(() => import("@/components/simulator/BlackHoleSimulator"), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#030305", color: "#60a5fa", gap: 12 }}>
      <Loader2 className="spinner" size={28} />
      <span style={{ fontSize: "1.1rem", fontWeight: 600 }}>Calculating Relativistic Spacetime Curvature...</span>
    </div>
  ),
});

export default function BlackHolePage() {
  const [spin, setSpin] = useState(0.85);
  const [luminosity, setLuminosity] = useState(1.2);
  const [particleCount, setParticleCount] = useState(12000);
  const [isPaused, setIsPaused] = useState(false);

  const handleReset = () => {
    setSpin(0.85);
    setLuminosity(1.2);
    setParticleCount(12000);
    setIsPaused(false);
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", background: "#030305" }}>
      <Navbar />

      {/* Floating HUD Controls */}
      <div className={styles.hudPanel}>
        <div className={styles.hudHeader}>
          <div>
            <div className={styles.hudBadge}>
              <Sparkles size={12} /> General Relativity
            </div>
            <h2 className={styles.hudTitle}>Supermassive Black Hole</h2>
            <p className={styles.hudSubtitle}>Kerr Metric &amp; Accretion Disk</p>
          </div>
        </div>

        {/* Sliders */}
        <div className={styles.controlGroup}>
          <div className={styles.sliderLabelRow}>
            <span>Kerr Spin Parameter (a)</span>
            <span className={styles.paramVal}>{spin.toFixed(2)}c</span>
          </div>
          <input
            type="range"
            min={0}
            max={0.99}
            step={0.01}
            value={spin}
            onChange={(e) => setSpin(parseFloat(e.target.value))}
            className={styles.slider}
          />
        </div>

        <div className={styles.controlGroup}>
          <div className={styles.sliderLabelRow}>
            <span>Accretion Luminosity</span>
            <span className={styles.paramVal}>{luminosity.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min={0.4}
            max={2.0}
            step={0.1}
            value={luminosity}
            onChange={(e) => setLuminosity(parseFloat(e.target.value))}
            className={styles.slider}
          />
        </div>

        {/* Quality Selector */}
        <div className={styles.controlGroup}>
          <div className={styles.sliderLabelRow}>
            <span>Particle Density</span>
            <span className={styles.paramVal}>{particleCount.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
            {[
              { label: "Eco 6K", count: 6000 },
              { label: "Bal 12K", count: 12000 },
              { label: "Ultra 20K", count: 20000 },
            ].map((tier) => (
              <button
                key={tier.count}
                onClick={() => setParticleCount(tier.count)}
                className={`${styles.qualityBtn} ${particleCount === tier.count ? styles.qualityBtnActive : ""}`}
              >
                {tier.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className={styles.hudActions}>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={styles.actionBtn}
          >
            {isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
            <span>{isPaused ? "Resume" : "Pause"}</span>
          </button>
          <button onClick={handleReset} className={styles.actionBtn}>
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>

        {/* Physics Telemetry */}
        <div className={styles.telemetryCard}>
          <div className={styles.telemetryRow}>
            <span>Event Horizon:</span>
            <span className={styles.telemetryValue}>r_s = 2GM / c²</span>
          </div>
          <div className={styles.telemetryRow}>
            <span>Photon Sphere:</span>
            <span className={styles.telemetryValue}>r_ph = 1.5 r_s</span>
          </div>
          <div className={styles.telemetryRow}>
            <span>Doppler Beaming:</span>
            <span style={{ color: "#60a5fa", fontWeight: 700 }}>Active (Blue Lobe)</span>
          </div>
        </div>
      </div>

      {/* 3D Canvas Viewport */}
      <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0, zIndex: 1 }}>
        <BlackHoleSimulator
          spin={spin}
          luminosity={luminosity}
          particleCount={particleCount}
          isPaused={isPaused}
        />
      </div>
    </div>
  );
}
