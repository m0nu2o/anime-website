"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import SimulatorControls from "@/components/simulator/SimulatorControls";
import { SunParams } from "@/components/simulator/SunSimulator";
import { Loader2 } from "lucide-react";

const SunSimulator = dynamic(() => import("@/components/simulator/SunSimulator"), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#050507", color: "#facc15", gap: 12 }}>
      <Loader2 className="spinner" size={28} />
      <span style={{ fontSize: "1.1rem", fontWeight: 600 }}>Initializing Solar Physics Engine...</span>
    </div>
  ),
});

const INITIAL_PARAMS: SunParams = {
  radius: 120,
  fusion: 2.5,
  convect: 1.2,
  magnetic: 1.4,
  wind: 1.8,
  loops: 16,
  isPaused: false,
  particleCount: 15000,
};

export default function SunSimulatorPage() {
  const [params, setParams] = useState<SunParams>(INITIAL_PARAMS);

  const handleReset = () => {
    setParams(INITIAL_PARAMS);
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", background: "#050507" }}>
      <Navbar />
      <SimulatorControls
        params={params}
        onChange={setParams}
        onReset={handleReset}
      />
      <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0, zIndex: 1 }}>
        <SunSimulator params={params} />
      </div>
    </div>
  );
}
