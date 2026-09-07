"use client";

import React, { useState } from "react";
import { Play, Pause, RotateCcw, Maximize2, Minimize2, Info, Sliders, Sparkles } from "lucide-react";
import { SunParams } from "./SunSimulator";
import styles from "./SimulatorControls.module.css";

interface ControlsProps {
  params: SunParams;
  onChange: (updated: SunParams) => void;
  onReset: () => void;
}

export default function SimulatorControls({ params, onChange, onReset }: ControlsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleSlider = (key: keyof SunParams, val: number) => {
    onChange({
      ...params,
      [key]: val,
    });
  };

  return (
    <>
      {/* Floating Header Actions */}
      <div className={styles.topBar}>
        <div className={styles.titleGroup}>
          <span className={styles.badge}>
            <Sparkles size={14} /> Live WebGL Simulation
          </span>
          <h1 className={styles.title}>The Sun: Stellar Dynamics</h1>
        </div>

        <div className={styles.topActions}>
          <button
            className={styles.iconBtn}
            onClick={() => handleSlider("isPaused", params.isPaused ? 0 : 1)}
            aria-label={params.isPaused ? "Play" : "Pause"}
            title={params.isPaused ? "Play Simulation" : "Pause Simulation"}
          >
            {params.isPaused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button
            className={styles.iconBtn}
            onClick={onReset}
            aria-label="Reset Parameters"
            title="Reset Parameters"
          >
            <RotateCcw size={18} />
          </button>
          <button
            className={`${styles.iconBtn} ${showInfo ? styles.activeBtn : ""}`}
            onClick={() => setShowInfo(!showInfo)}
            aria-label="Stellar Information"
            title="Solar Physics Annotations"
          >
            <Info size={18} />
          </button>
          <button
            className={`${styles.iconBtn} ${isOpen ? styles.activeBtn : ""}`}
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle Controls"
            title="Adjust Simulation Sliders"
          >
            <Sliders size={18} />
          </button>
          <button
            className={styles.iconBtn}
            onClick={toggleFullscreen}
            aria-label="Toggle Fullscreen"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* Information Panel */}
      {showInfo && (
        <div className={styles.infoPanel}>
          <div className={styles.panelHeader}>
            <h3>Solar Architecture</h3>
            <button className={styles.closeBtn} onClick={() => setShowInfo(false)}>?</button>
          </div>
          <div className={styles.infoList}>
            <div className={styles.infoItem}>
              <span className={styles.tag} style={{ color: "#facc15" }}>01 � Fusion Core</span>
              <p>Temperatures exceed 15,000,000 K. Hydrogen nuclei fuse into helium via proton-proton chain reactions, generating pure radiant energy.</p>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.tag} style={{ color: "#fb923c" }}>02 � Radiative Zone</span>
              <p>Energy diffuses slowly outward via photons. Photons undergo countless absorptions and re-emissions taking over 100,000 years to reach the surface.</p>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.tag} style={{ color: "#f43f5e" }}>03 � Convection Cells</span>
              <p>Hot plasma boils up toward the surface in colossal hexagonal B�nard convection granules, sinking back down as it cools.</p>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.tag} style={{ color: "#c084fc" }}>04 � Coronal Loops</span>
              <p>Intense twisted magnetic flux tubes trap superheated plasma at 2�3 million K, erupting in solar flares and coronal mass ejections (CMEs).</p>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.tag} style={{ color: "#38bdf8" }}>05 � Solar Wind</span>
              <p>A continuous outward stream of charged protons and electrons escapes through coronal holes at speeds from 400 to 800 km/s.</p>
            </div>
          </div>
        </div>
      )}

      {/* Controls HUD */}
      {isOpen && (
        <div className={styles.hudPanel}>
          <div className={styles.panelHeader}>
            <h3>Simulation Parameters</h3>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>?</button>
          </div>

          <div className={styles.sliderList}>
            <div className={styles.sliderRow}>
              <div className={styles.sliderHeader}>
                <label>Radius</label>
                <span>{params.radius}</span>
              </div>
              <input
                type="range"
                min={40}
                max={260}
                step={5}
                value={params.radius}
                onChange={(e) => handleSlider("radius", Number(e.target.value))}
              />
            </div>

            <div className={styles.sliderRow}>
              <div className={styles.sliderHeader}>
                <label>Fusion Rate</label>
                <span>{params.fusion.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={5.0}
                step={0.1}
                value={params.fusion}
                onChange={(e) => handleSlider("fusion", Number(e.target.value))}
              />
            </div>

            <div className={styles.sliderRow}>
              <div className={styles.sliderHeader}>
                <label>Convection Turbulence</label>
                <span>{params.convect.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={2.5}
                step={0.1}
                value={params.convect}
                onChange={(e) => handleSlider("convect", Number(e.target.value))}
              />
            </div>

            <div className={styles.sliderRow}>
              <div className={styles.sliderHeader}>
                <label>Magnetic Activity</label>
                <span>{params.magnetic.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={3.0}
                step={0.1}
                value={params.magnetic}
                onChange={(e) => handleSlider("magnetic", Number(e.target.value))}
              />
            </div>

            <div className={styles.sliderRow}>
              <div className={styles.sliderHeader}>
                <label>Solar Wind Speed</label>
                <span>{params.wind.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={4.0}
                step={0.1}
                value={params.wind}
                onChange={(e) => handleSlider("wind", Number(e.target.value))}
              />
            </div>

            <div className={styles.sliderRow}>
              <div className={styles.sliderHeader}>
                <label>Active Regions (Loops)</label>
                <span>{params.loops}</span>
              </div>
              <input
                type="range"
                min={4}
                max={32}
                step={2}
                value={params.loops}
                onChange={(e) => handleSlider("loops", Number(e.target.value))}
              />
            </div>

            {/* Particle Density Preset */}
            <div className={styles.presetSection}>
              <span className={styles.presetLabel}>Particle Density</span>
              <div className={styles.presetGroup}>
                {[
                  { label: "Eco 6K", count: 6000 },
                  { label: "Balanced 12K", count: 12000 },
                  { label: "Ultra 20K", count: 20000 },
                ].map((tier) => (
                  <button
                    key={tier.label}
                    className={`${styles.presetBtn} ${params.particleCount === tier.count ? styles.activePreset : ""}`}
                    onClick={() => handleSlider("particleCount", tier.count)}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
