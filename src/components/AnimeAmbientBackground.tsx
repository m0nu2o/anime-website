"use client";

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { Effects } from '@react-three/drei';
import { EffectComposer, RenderPass, UnrealBloomPass } from 'three-stdlib';
import * as THREE from 'three';

extend({ EffectComposer, RenderPass, UnrealBloomPass });

declare module '@react-three/fiber' {
  interface ThreeElements {
    unrealBloomPass: unknown;
  }
}

interface ParticleSwarmProps {
  quality: "high" | "medium" | "low" | "minimal";
  speedMult?: number;
  theme: string;
}

const ParticleSwarm = ({ quality, speedMult = 0.5, theme }: ParticleSwarmProps) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const count = useMemo(() => {
    switch(quality) {
      case "high": return 14000;
      case "medium": return 8500;
      case "low": return 4500;
      case "minimal": return 2000;
      default: return 8500;
    }
  }, [quality]);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const targetColor = useMemo(() => new THREE.Color(), []);
  
  const positions = useMemo(() => {
    const pos = [];
    for (let i = 0; i < count; i++) {
      pos.push(new THREE.Vector3(
        (Math.random() - 0.5) * 140, 
        (Math.random() - 0.5) * 140, 
        (Math.random() - 0.5) * 140
      ));
    }
    return pos;
  }, [count]);

  const colors = useMemo(() => {
    return Array.from({ length: count }, () => new THREE.Color(0xffffff));
  }, [count]);

  const geometry = useMemo(() => new THREE.TetrahedronGeometry(0.30), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ 
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
  }), []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current || (typeof document !== "undefined" && document.hidden)) return;
    timeRef.current += Math.min(delta, 0.1) * speedMult;
    const time = timeRef.current;

    const N = count;
    const GOLDEN = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < count; i++) {
      const t = i / Math.max(1, count);
      const h1 = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
      const h2 = Math.abs(Math.sin(i * 78.2330) * 12543.1230) % 1;
      const h3 = Math.abs(Math.sin(i * 45.1640) * 98765.4320) % 1;
      const h4 = Math.abs(Math.sin(i * 33.7190) * 54321.9870) % 1;
      const h5 = Math.abs(Math.sin(i * 61.4310) * 31415.9265) % 1;

      let px = 0, py = 0, pz = 0;
      let hue = 0.1, sat = 0.9, light = 0.5;

      // ================= 1. THEME: NEURAL MIND / COGNITIVE BRAIN =================
      if (theme === "neural" || theme === "day") {
        const idxF = i + 0.5;
        const cosPhiArg = 1 - 2 * idxF / N;
        const phi = Math.acos(Math.min(1, Math.max(-1, cosPhiArg)));
        const theta = GOLDEN * idxF;
        
        const dirX = Math.sin(phi) * Math.cos(theta);
        const dirY = Math.cos(phi);
        const dirZ = Math.sin(phi) * Math.sin(theta);
        
        const regionIndex = i % 8;
        const regionT = regionIndex / 8;
        const lobeAngle = regionT * Math.PI * 2;
        const lobeX = Math.cos(lobeAngle);
        const lobeZ = Math.sin(lobeAngle);
        const lobeY = Math.cos(regionIndex * Math.PI);
        
        const lobePull = 0.35;
        const blendX = dirX * (1 - lobePull) + lobeX * lobePull;
        const blendY = dirY * (1 - lobePull) + lobeY * lobePull * 0.6;
        const blendZ = dirZ * (1 - lobePull) + lobeZ * lobePull;
        const vecLen = Math.max(Math.sqrt(blendX * blendX + blendY * blendY + blendZ * blendZ), 0.0001);
        const normX = blendX / vecLen;
        const normY = blendY / vecLen;
        const normZ = blendZ / vecLen;
        
        const fold = Math.sin(phi * 14 + theta * 4 + time * 0.15) * 0.5 + Math.sin(theta * 9 - phi * 6 + time * 0.2) * 0.3;
        const foldedRadius = 1 + fold * 0.15;
        const hemiSign = Math.sign(normX + 0.0001);
        const fissureGap = 0.06;
        const breathe = 1 + Math.sin(time * 0.25 + regionT * 6.28) * 0.08 * 0.3;
        const expansion = 56;
        
        const radiusVal = expansion * foldedRadius * breathe;
        const surfaceX = normX * 1.15 * radiusVal + hemiSign * fissureGap * expansion;
        const surfaceY = normY * 0.95 * radiusVal;
        const surfaceZ = normZ * 1.0 * radiusVal;
        
        const coreWeight = Math.exp(-Math.pow(regionIndex - 2, 2) * 1.5);
        const spiralAngle = i * 0.15 + time * 1.2;
        const spiralRadius = (i % 400) * 0.05 + 2;
        const spiralX = Math.cos(spiralAngle) * spiralRadius;
        const spiralZ = Math.sin(spiralAngle) * spiralRadius;
        const spiralY = Math.sin(time * 0.5 + i * 0.01) * expansion * 0.15;
        
        const posX = surfaceX * (1 - coreWeight) + spiralX * coreWeight;
        const posY = surfaceY * (1 - coreWeight) + spiralY * coreWeight;
        const posZ = surfaceZ * (1 - coreWeight) + spiralZ * coreWeight;
        
        const rotAngle = time * 0.12;
        const cosR = Math.cos(rotAngle), sinR = Math.sin(rotAngle);
        px = posX * cosR - posZ * sinR;
        py = posY;
        pz = posX * sinR + posZ * cosR;

        const dist = Math.sqrt(px * px + py * py + pz * pz);
        const firingPhase = Math.sin(dist * 0.35 - time * 2.2 + regionIndex * 0.8);
        const firing = Math.pow(Math.max(0, firingPhase), 6);
        hue = 0.55 + regionT * 0.25 + time * 0.01;
        sat = Math.min(1, 0.6 + firing * 0.35);
        light = Math.min(0.9, 0.35 + firing * 0.45);
      }

      // ================= 2. THEME: 4D BREATHING ATTRACTOR =================
      else if (theme === "attractor" || theme === "sunset") {
        const u = i / Math.max(1, count - 1);
        const phi = i * 2.399963229728653;
        const band = u * 2 - 1;
        const ring = Math.sqrt(Math.max(0, 1 - band * band));
        const breathe = 1 + 0.18 * Math.sin(time * 0.7 + u * 9.0);
        
        const a = phi + time * 0.7 * 0.35 + band * 1.4;
        const b = phi * 1.618 + time * 0.7 * 0.22;
        const wave1 = Math.sin(a * 3.0 + time * 0.7) * 0.8;
        const wave2 = Math.cos(b * 2.0 - time * 0.7 * 0.8) * 0.8;
        const wave3 = Math.sin(a * 5.0 + b + time * 0.7 * 0.5) * 0.8;
        
        const scale = 58;
        const r = scale * ring * breathe;
        const x = Math.cos(a) * r;
        const y = band * scale * breathe;
        const z = Math.sin(a) * r;
        
        px = x + Math.sin(b * 2.0 + y * 0.035) * wave1 * 8.0;
        py = y + Math.cos(a * 3.0 + z * 0.025) * wave2 * 8.0;
        pz = z + Math.sin(a * 2.0 + x * 0.025) * wave3 * 8.0;
        
        hue = (u * 0.72 + time * 0.025 + Math.sin(a) * 0.08) % 1;
        if (hue < 0) hue += 1;
        sat = 0.88;
        light = 0.45 + 0.18 * Math.sin(a * 2.0 + time);
      }

      // ================= 3. THEME: RELATIVISTIC BLACK HOLE =================
      else if (theme === "blackhole" || theme === "night") {
        const rInner = 18;
        const rOuter = 85;
        const rad = rInner + Math.sqrt(h1) * (rOuter - rInner);
        const angSpeed = (120 / Math.pow(rad, 1.25));
        const theta = h2 * Math.PI * 2 + time * angSpeed;
        const tilt = 0.38;
        
        const diskX = Math.cos(theta) * rad;
        const diskZ = Math.sin(theta) * rad;
        const diskY = Math.sin(theta * 2 + time * 0.8) * rad * 0.08 + (h3 - 0.5) * rad * 0.15;
        
        px = diskX;
        py = diskY * Math.cos(tilt) - diskZ * Math.sin(tilt);
        pz = diskY * Math.sin(tilt) + diskZ * Math.cos(tilt);
        
        const doppler = Math.cos(theta);
        if (doppler > 0) {
          hue = 0.68 + doppler * 0.08;
          sat = 0.95;
          light = 0.55 + doppler * 0.25;
        } else {
          hue = 0.02 - doppler * 0.05;
          sat = 0.90;
          light = 0.35 + Math.abs(doppler) * 0.15;
        }
      }

      // ================= 4. THEME: NEUROPLASTICITY CORTEX =================
      else if (theme === "neuro" || theme === "cloudy") {
        const layer = t < 0.5 ? 0 : 1;
        const localI = layer === 0 ? i : i - Math.floor(count / 2);
        const totalLocal = count / 2;
        
        const phi = Math.acos(1 - 2 * (localI + 0.5) / totalLocal);
        const theta = Math.sqrt(totalLocal * Math.PI) * (localI + 0.5);
        const r = layer === 0 ? 38 : 19;
        
        let x = r * Math.sin(phi) * Math.cos(theta);
        let y = r * Math.sin(phi) * Math.sin(theta);
        let z = r * Math.cos(phi);
        
        const noiseX = Math.sin(time * 0.5 + phi * 3) * Math.cos(time * 0.3 + theta * 2);
        const noiseY = Math.cos(time * 0.4 + phi * 2) * Math.sin(time * 0.6 + theta * 3);
        const noiseZ = Math.sin(time * 0.7 + phi + theta);
        const moveAmt = layer === 0 ? 0.75 : 0.25;
        
        x += noiseX * moveAmt * 8;
        y += noiseY * moveAmt * 8;
        z += noiseZ * moveAmt * 8;
        
        const pulse = Math.sin(time * 2 + i * 0.01) * 0.08 + 1;
        px = x * pulse;
        py = y * pulse;
        pz = z * pulse;
        
        hue = layer === 0 ? 0.58 : 0.72;
        sat = layer === 0 ? 0.8 : 0.6;
        light = layer === 0 ? 0.5 : 0.35;
      }

      // ================= 5. THEME: QUANTUM STEAM / CUP SWARM =================
      else if (theme === "quantum" || theme === "rain") {
        const size = 62;
        const nBody = Math.floor(N * 0.65);
        const nRim = Math.floor(N * 0.10);
        const nHandle = Math.floor(N * 0.20);
        const nCoffee = Math.floor(N * 0.04);
        
        const breathFactor = 1 + 0.04 * Math.sin(time * 1.5);
        
        if (i < nBody) {
          const f = (i + 0.5) / nBody;
          const y = (f - 0.5) * size * 1.25;
          const radius = size * (0.68 + 0.08 * (y / size + 0.5));
          const angle = i * GOLDEN;
          const r = radius * Math.sqrt((i % 1000) / 1000);
          px = Math.cos(angle) * r;
          py = y * breathFactor;
          pz = Math.sin(angle) * r;
          hue = 0.55; sat = 0.3; light = 0.75;
        } else if (i < nBody + nRim) {
          const j = i - nBody;
          const f = j / nRim;
          const angle = f * Math.PI * 2;
          const radius = size * 0.75;
          px = Math.cos(angle) * radius;
          py = size * 0.65;
          pz = Math.sin(angle) * radius;
          hue = 0.50; sat = 0.6; light = 0.85;
        } else if (i < nBody + nRim + nHandle) {
          const j = i - nBody - nRim;
          const f = j / nHandle;
          const angle = -Math.PI * 0.85 + f * Math.PI * 1.7;
          const centerX = size * 0.72;
          const handleRadius = size * 0.48;
          px = centerX + Math.cos(angle) * handleRadius;
          py = Math.sin(angle) * handleRadius;
          pz = 0;
          px += Math.cos(angle) * size * 0.08 * (((j * 17) % 100) / 100);
          py += Math.sin(angle) * size * 0.08 * (((j * 17) % 100) / 100);
          hue = 0.98; sat = 0.92; light = 0.55;
        } else if (i < nBody + nRim + nHandle + nCoffee) {
          const j = i - nBody - nRim - nHandle;
          const f = j / nCoffee;
          const angle = j * GOLDEN;
          const radius = size * 0.58 * Math.sqrt(f);
          px = Math.cos(angle) * radius;
          py = size * 0.66;
          pz = Math.sin(angle) * radius;
          hue = 0.08; sat = 0.85; light = 0.28;
        } else {
          const j = i - nBody - nRim - nHandle - nCoffee;
          const f = j / Math.max(1, N - (nBody + nRim + nHandle + nCoffee));
          const angle = j * 2.4;
          px = Math.sin(time * 0.8 + angle) * size * 0.25;
          py = size * 0.7 + f * size * 1.1;
          pz = Math.cos(time * 0.6 + angle) * size * 0.18;
          hue = 0.52; sat = 0.7; light = 0.88;
        }
      }

      // ================= 6. THEME: SUN / AMBIENT STELLAR FIELD (Replaces harsh Solar Corona) =================
      else {
        const scaleR = 75;
        const theta = h1 * Math.PI * 2 + time * 0.08;
        const phi = (h2 - 0.5) * Math.PI * 0.85;
        const rad = scaleR * (0.4 + 0.6 * Math.sqrt(h3));
        
        // Gentle undulating ambient stardust wave (no harsh magnetic flares)
        const wave = Math.sin(theta * 3 + time * 0.4) * 4.0;
        px = Math.cos(theta) * Math.cos(phi) * rad + wave;
        py = Math.sin(phi) * rad * 0.7 + Math.cos(theta * 2 + time * 0.3) * 3.0;
        pz = Math.sin(theta) * Math.cos(phi) * rad;

        if (theme === "sun") {
          hue = 0.09 + Math.sin(time * 0.2 + h4) * 0.03;
          sat = 0.85;
          light = 0.45 + Math.sin(theta + time * 0.5) * 0.15;
        } else {
          // General ambient stardust fallback
          hue = 0.65;
          sat = 0.70;
          light = 0.40;
        }
      }

      target.set(px, py, pz);
      positions[i].lerp(target, 0.08);
      dummy.position.copy(positions[i]);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      targetColor.setHSL(hue, sat, light);
      colors[i].lerp(targetColor, 0.08);
      meshRef.current.setColorAt(i, colors[i]);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} />
  );
};

export default function AnimeAmbientBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [quality, setQuality] = useState<"high" | "medium" | "low" | "minimal">("medium");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [dpr, setDpr] = useState(1);
  const [fxMode, setFxMode] = useState<"vibrant" | "ambient" | "stealth" | "off">("ambient");
  const [customOpacity, setCustomOpacity] = useState<number | null>(null);
  const [theme, setTheme] = useState<string>("blackhole");

  useEffect(() => {
    const savedFx = localStorage.getItem("nextgen_fx_mode");
    if (savedFx && ["vibrant", "ambient", "stealth", "off"].includes(savedFx)) {
      setFxMode(savedFx as "vibrant" | "ambient" | "stealth" | "off");
    }
    // Also read saved theme for correct particle colors on mount
    const savedTheme = localStorage.getItem("theme_state");
    if (savedTheme) {
      setTheme(savedTheme);
    }

    const handleFxChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.mode) setFxMode(detail.mode);
    };
    const handleThemeChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.theme) setTheme(detail.theme);
    };
    const handleIntensityChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail?.intensity === "number") setCustomOpacity(detail.intensity);
    };

    window.addEventListener("nextgen-fx-change", handleFxChange);
    window.addEventListener("nextgen-theme-change", handleThemeChange);
    window.addEventListener("nextgen-intensity-change", handleIntensityChange);

    const handleResize = () => {
      const width = window.innerWidth;
      if (width > 1200) setQuality("high");
      else if (width > 768) setQuality("medium");
      else if (width > 480) setQuality("low");
      else setQuality("minimal");
    };
    
    setDpr(Math.min(window.devicePixelRatio || 1, 1.5));
    handleResize();
    window.addEventListener('resize', handleResize);

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(motionQuery?.matches || false);

    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      window.removeEventListener("nextgen-fx-change", handleFxChange);
      window.removeEventListener("nextgen-theme-change", handleThemeChange);
      window.removeEventListener("nextgen-intensity-change", handleIntensityChange);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const pathname = usePathname();
  const isWatchPage = Boolean(pathname?.startsWith('/watch'));

  if (fxMode === "off" || reducedMotion || !isVisible) {
    return (
      <div 
        style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 0, 
          pointerEvents: 'none',
          background: 'radial-gradient(circle at 50% 15%, #18091e 0%, #08080c 100%)' 
        }} 
      />
    );
  }

  const opacityMap = {
    vibrant: 0.65,
    ambient: 0.40,
    stealth: 0.20,
  };
  const bloomStrengthMap = {
    vibrant: 1.2,
    ambient: 0.8,
    stealth: 0.4,
  };

  const currentOpacity = customOpacity !== null ? customOpacity : (opacityMap[fxMode as keyof typeof opacityMap] || 0.60);
  const currentBloom = isWatchPage ? 0.45 : (bloomStrengthMap[fxMode as keyof typeof bloomStrengthMap] || 1.0);
  const effectiveQuality = isWatchPage && quality === "high" ? "medium" : quality;

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        zIndex: 0,
        pointerEvents: 'none',
        opacity: currentOpacity,
        transition: 'opacity 0.5s ease',
      }} 
    >
      <Canvas 
        eventSource={containerRef as unknown as React.RefObject<HTMLElement>}
        eventPrefix="client"
        dpr={isWatchPage ? 1 : dpr} 
        camera={{ position: [0, 0, 115], fov: 50 }}
        gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
      >
        <fog attach="fog" args={['#050508', 90, 240]} />
        <ParticleSwarm quality={effectiveQuality} theme={theme} />
        <Effects disableGamma>
          <unrealBloomPass threshold={0.05} strength={currentBloom} radius={0.35} />
        </Effects>
      </Canvas>
    </div>
  );
}
