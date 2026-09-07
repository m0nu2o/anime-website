import Link from "next/link";
import { Sparkles, Sun, ArrowRight, Play } from "lucide-react";
import styles from "./SimulatorSpotlight.module.css";

export default function SimulatorSpotlight() {
  return (
    <div className={styles.spotlight}>
      <div className={styles.glowOrb} />
      <div className={styles.content}>
        <div className={styles.badge}>
          <Sparkles size={14} /> Interactive 3D Physics
        </div>
        <h2 className={styles.title}>Solar Corona & Stellar Flare Simulator</h2>
        <p className={styles.desc}>
          Explore a realtime Three.js particle physics simulation of the sun. Adjust nuclear fusion rates, 
          convection turbulence, coronal magnetic loops, and solar wind velocity with live telemetry.
        </p>
        <div className={styles.pills}>
          <span className={styles.pill}>Up to 20,000 Particles</span>
          <span className={styles.pill}>Unreal Bloom & Glow</span>
          <span className={styles.pill}>3D Orbit Controls</span>
        </div>
        <div className={styles.actions}>
          <Link href="/simulators/sun" className={styles.launchBtn}>
            <Sun size={18} /> Launch 3D Simulator
          </Link>
          <Link href="/simulators" className={styles.allBtn}>
            Browse All Simulators <ArrowRight size={14} style={{ display: "inline", verticalAlign: "middle" }} />
          </Link>
        </div>
      </div>
    </div>
  );
}
