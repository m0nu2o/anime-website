"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Sun, Sunset, CloudRain, Cpu, Activity, Orbit } from "lucide-react";

export type WeatherState = "sun" | "neural" | "attractor" | "blackhole" | "neuro" | "quantum" | "day" | "sunset" | "night" | "cloudy" | "rain";

interface ThemeConfig {
  name: string;
  label: string;
  subLabel: string;
  icon: React.ReactNode;
  bgGradient: string;
  textColor: string;
  accentColor: string;
  primaryColor: string;
  primaryHover: string;
  primaryGlow: string;
  fontFamily: string;
  cardBg: string;
  ambientIntensity: number;
}

export const THEME_CONFIGS: Record<string, ThemeConfig> = {
  sun: {
    name: "sun",
    label: "Solar Sun",
    subLabel: "Solar Corona & Magnetic Loops",
    icon: <Sun size={15} />,
    bgGradient: "radial-gradient(circle at 50% 15%, #2a1505 0%, #170902 60%, #0a0300 100%)",
    textColor: "#fffbeb",
    accentColor: "#fbbf24",
    primaryColor: "#f59e0b",
    primaryHover: "#d97706",
    primaryGlow: "rgba(245, 158, 11, 0.5)",
    fontFamily: "'Outfit', -apple-system, sans-serif",
    cardBg: "rgba(42, 21, 5, 0.82)",
    ambientIntensity: 0.75,
  },
  neural: {
    name: "neural",
    label: "Neural Mind",
    subLabel: "Architecture of Mind & Synapses",
    icon: <Cpu size={15} />,
    bgGradient: "radial-gradient(circle at 50% 15%, #081b29 0%, #040d18 60%, #02070d 100%)",
    textColor: "#f0fdf4",
    accentColor: "#38bdf8",
    primaryColor: "#0284c7",
    primaryHover: "#0369a1",
    primaryGlow: "rgba(2, 132, 199, 0.5)",
    fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
    cardBg: "rgba(8, 27, 41, 0.82)",
    ambientIntensity: 0.70,
  },
  attractor: {
    name: "attractor",
    label: "4D Attractor",
    subLabel: "Hyperspace Dimensional Twist",
    icon: <Sunset size={15} />,
    bgGradient: "radial-gradient(circle at 50% 20%, #2b0f2a 0%, #1a081f 60%, #0b020d 100%)",
    textColor: "#fff1f2",
    accentColor: "#f97316",
    primaryColor: "#e11d48",
    primaryHover: "#be123c",
    primaryGlow: "rgba(225, 29, 72, 0.5)",
    fontFamily: "'Syne', -apple-system, sans-serif",
    cardBg: "rgba(43, 15, 42, 0.82)",
    ambientIntensity: 0.65,
  },
  blackhole: {
    name: "blackhole",
    label: "Black Hole",
    subLabel: "Relativistic Accretion Horizon",
    icon: <Orbit size={15} />,
    bgGradient: "radial-gradient(circle at 50% 15%, #130a24 0%, #07040f 60%, #020105 100%)",
    textColor: "#e2e8f0",
    accentColor: "#c084fc",
    primaryColor: "#9333ea",
    primaryHover: "#7e22ce",
    primaryGlow: "rgba(147, 51, 234, 0.5)",
    fontFamily: "'Inter', -apple-system, sans-serif",
    cardBg: "rgba(19, 10, 36, 0.82)",
    ambientIntensity: 0.55,
  },
  neuro: {
    name: "neuro",
    label: "Neuroplasticity",
    subLabel: "Dual-Layer Cortical Pulsing",
    icon: <Activity size={15} />,
    bgGradient: "radial-gradient(circle at 50% 20%, #06231b 0%, #031410 60%, #010806 100%)",
    textColor: "#ecfdf5",
    accentColor: "#34d399",
    primaryColor: "#059669",
    primaryHover: "#047857",
    primaryGlow: "rgba(5, 150, 105, 0.5)",
    fontFamily: "'Space Grotesk', -apple-system, sans-serif",
    cardBg: "rgba(6, 35, 27, 0.82)",
    ambientIntensity: 0.50,
  },
  quantum: {
    name: "quantum",
    label: "Quantum Steam",
    subLabel: "Thermal Convection Swarm",
    icon: <CloudRain size={15} />,
    bgGradient: "radial-gradient(circle at 50% 20%, #29080c 0%, #170407 60%, #0a0103 100%)",
    textColor: "#fef2f2",
    accentColor: "#06b6d4",
    primaryColor: "#dc2626",
    primaryHover: "#b91c1c",
    primaryGlow: "rgba(220, 38, 38, 0.5)",
    fontFamily: "'JetBrains Mono', monospace, sans-serif",
    cardBg: "rgba(41, 8, 12, 0.82)",
    ambientIntensity: 0.60,
  },
};

// Aliases for backward compatibility
THEME_CONFIGS.day = THEME_CONFIGS.neural;
THEME_CONFIGS.sunset = THEME_CONFIGS.attractor;
THEME_CONFIGS.night = THEME_CONFIGS.blackhole;
THEME_CONFIGS.cloudy = THEME_CONFIGS.neuro;
THEME_CONFIGS.rain = THEME_CONFIGS.quantum;

interface ThemeContextType {
  weather: string;
  setWeather: (w: string) => void;
  brightness: number;
  setBrightness: (b: number) => void;
  autoCycle: boolean;
  setAutoCycle: (a: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  weather: "blackhole",
  setWeather: () => {},
  brightness: 1.0,
  setBrightness: () => {},
  autoCycle: false,
  setAutoCycle: () => {},
});

export const useThemeSimulator = () => useContext(ThemeContext);

export default function ThemeSimulatorProvider({ children }: { children: React.ReactNode }) {
  const [weather, setWeatherState] = useState<string>("blackhole");
  const [brightness, setBrightnessState] = useState<number>(1.0);
  const [autoCycle, setAutoCycle] = useState<boolean>(false);

  // Apply CSS variables & dispatch theme morph event to 3D background
  const applyTheme = (w: string, b: number) => {
    const config = THEME_CONFIGS[w] || THEME_CONFIGS.blackhole;

    const root = document.documentElement;
    root.style.setProperty("--bg-gradient", config.bgGradient);
    root.style.setProperty("--text-color", config.textColor);
    root.style.setProperty("--text-main", config.textColor);
    root.style.setProperty("--accent-color", config.accentColor);
    root.style.setProperty("--accent", config.accentColor);
    root.style.setProperty("--primary", config.primaryColor);
    root.style.setProperty("--primary-hover", config.primaryHover);
    root.style.setProperty("--primary-glow", config.primaryGlow);
    root.style.setProperty("--font-family", config.fontFamily);
    root.style.setProperty("--card-bg", config.cardBg);
    root.style.setProperty("--site-brightness", String(b));

    // Update all glass tier variables so every surface changes with the theme
    root.style.setProperty("--glass-standard-bg", config.cardBg);
    root.style.setProperty("--glass-ambient-bg", config.cardBg.replace(/[\d.]+\)$/, "0.42)"));
    root.style.setProperty("--glass-elevated-bg", config.cardBg.replace(/[\d.]+\)$/, "0.88)"));
    root.style.setProperty("--glass-focus-bg", config.cardBg.replace(/[\d.]+\)$/, "0.95)"));
    root.style.setProperty("--glass-elevated-shadow", `0 24px 60px rgba(0,0,0,0.7), 0 0 28px ${config.primaryGlow}`);

    if (typeof document !== "undefined") {
      document.body.className = `theme-${config.name}`;
      document.documentElement.className = `theme-${config.name}`;
      document.body.style.fontFamily = config.fontFamily;
      document.body.style.color = config.textColor;
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("nextgen-intensity-change", {
          detail: { intensity: config.ambientIntensity * b },
        })
      );
      window.dispatchEvent(
        new CustomEvent("nextgen-theme-change", {
          detail: { theme: config.name },
        })
      );
    }
  };

  const setWeather = (w: string) => {
    setWeatherState(w);
    localStorage.setItem("theme_state", w);
    applyTheme(w, brightness);
  };

  const setBrightness = (b: number) => {
    setBrightnessState(b);
    localStorage.setItem("theme_brightness", String(b));
    applyTheme(weather, b);
  };

  useEffect(() => {
    const savedWeather = localStorage.getItem("theme_state") || "blackhole";
    const savedBrightness = localStorage.getItem("theme_brightness");

    const w = THEME_CONFIGS[savedWeather] ? savedWeather : "blackhole";
    const b = savedBrightness ? parseFloat(savedBrightness) : 1.0;

    setWeatherState(w);
    setBrightnessState(b);
    applyTheme(w, b);
  }, []);

  // 30-Second Morphing auto-cycle loop if enabled
  useEffect(() => {
    if (!autoCycle) return;
    const states = ["sun", "neural", "attractor", "blackhole", "neuro", "quantum"];
    const timer = setInterval(() => {
      setWeatherState((current) => {
        const curName = THEME_CONFIGS[current]?.name || "blackhole";
        const nextIdx = (states.indexOf(curName) + 1) % states.length;
        const next = states[nextIdx];
        localStorage.setItem("theme_state", next);
        applyTheme(next, brightness);
        return next;
      });
    }, 30000);

    return () => clearInterval(timer);
  }, [autoCycle, brightness]);

  return (
    <ThemeContext.Provider
      value={{
        weather,
        setWeather,
        brightness,
        setBrightness,
        autoCycle,
        setAutoCycle,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
