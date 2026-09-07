import React from "react";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import SimulatorCard from "@/components/simulator/SimulatorCard";
import CosmicThemeController from "@/components/CosmicThemeController";
import styles from "./page.module.css";
import { Sparkles, Cpu, Layers, Zap } from "lucide-react";

export const metadata = {
  title: "Cosmic Observatory & 3D Physics Lab | NextGen Anime",
  description: "Interactive real-time astrophysical simulations and celestial background controls powered by React Three Fiber.",
};

export default function SimulatorsHubPage() {
  return (
    <>
      <Navbar />
      <div className={`container ${styles.page}`}>
        <BackButton label="Back to Home" fallbackUrl="/" />

        {/* Header Hero */}
        <div className={styles.hero}>
          <div className={styles.badge}>
            <Sparkles size={14} /> NextGen Cosmic Observatory
          </div>
          <h1 className={styles.title}>Cosmic Observatory & 3D Lab</h1>
          <p className={styles.subtitle}>
            Control the real-time celestial simulations that illuminate the background across the entire NextGen Anime platform.
          </p>

          <div className={styles.techPills}>
            <span className={styles.pill}><Cpu size={14} /> WebGL 2.0</span>
            <span className={styles.pill}><Layers size={14} /> 20,000+ Instanced Meshes</span>
            <span className={styles.pill}><Zap size={14} /> Real-Time Solar Fusion</span>
          </div>
        </div>

        {/* Live Ambient Background Controls */}
        <CosmicThemeController />

        {/* Dedicated Simulators Grid */}
        <section className={styles.gridSection} style={{ marginTop: "40px" }}>
          <h2 className={styles.sectionHeading}>Dedicated Simulation Laboratories</h2>
          <div className={styles.grid}>
            <SimulatorCard
              title="The Sun: Solar Corona & Fusion Dynamics"
              category="Astrophysics / Stellar Model"
              description="A multi-layered interactive model of our central star featuring nuclear fusion core reactions, convective Bénard cells, dynamic sunspots, coronal loops, and outward solar wind flux."
              stats={[
                { label: "Particles", value: "20,000" },
                { label: "Layers", value: "7 Zones" },
                { label: "Post-FX", value: "UnrealBloom" },
              ]}
              href="/simulators/sun"
              badge="Full Screen Lab"
              isAvailable={true}
            />

            <SimulatorCard
              title="Supermassive Black Hole: Accretion Disk"
              category="General Relativity / Gravitational Lensing"
              description="Relativistic photon sphere orbit calculation and Doppler boosting of superheated plasma spiraling into an event horizon."
              stats={[
                { label: "Particles", value: "20,000" },
                { label: "Metric", value: "Kerr Metric" },
                { label: "Lensing", value: "Relativistic" },
              ]}
              href="/simulators/blackhole"
              badge="Full Screen Lab"
              isAvailable={true}
            />
          </div>
        </section>
      </div>
    </>
  );
}
