import Link from "next/link";
import { Sparkles, Orbit, ArrowRight } from "lucide-react";
import styles from "./SimulatorSpotlight.module.css";

export default function SimulatorSpotlight() {
  return (
    <div className={styles.spotlight}>
      <div className={styles.glowOrb} />
      <div className={styles.content}>
        <div className={styles.badge}>
          <Sparkles size={14} /> Interactive 3D Physics
        </div>
        <h2 className={styles.title}>Supermassive Black Hole & Accretion Lab</h2>
        <p className={styles.desc}>
          Explore a realtime Three.js relativistic simulation of a spinning Kerr black hole. Adjust accretion disk spin, 
          gravitational lensing, relativistic plasma jets, and event horizon velocity with live physics telemetry.
        </p>
        <div className={styles.pills}>
          <span className={styles.pill}>Up to 20,000 Particles</span>
          <span className={styles.pill}>Relativistic Lensing</span>
          <span className={styles.pill}>3D Orbit Controls</span>
        </div>
        <div className={styles.actions}>
          <Link href="/simulators/blackhole" className={styles.launchBtn}>
            <Orbit size={18} /> Launch 3D Simulator
          </Link>
          <Link href="/simulators" className={styles.allBtn}>
            Browse All Simulators <ArrowRight size={14} style={{ display: "inline", verticalAlign: "middle" }} />
          </Link>
        </div>
      </div>
    </div>
  );
}
