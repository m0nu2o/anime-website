"use client";

import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";

interface BlackHoleSimulatorProps {
  spin?: number; // 0 to 0.99 (Kerr black hole spin parameter)
  luminosity?: number; // 0.2 to 2.0
  particleCount?: number; // e.g. 5000, 10000, 20000
  isPaused?: boolean;
}

// Inner Event Horizon Sphere
function EventHorizon({ radius = 2.0 }: { radius?: number }) {
  return (
    <mesh>
      <sphereGeometry args={[radius, 64, 64]} />
      <meshBasicMaterial color="#000000" />
    </mesh>
  );
}

// Photon Sphere Ring
function PhotonSphere({ radius = 2.8 }: { radius?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[Math.PI / 6, 0, 0]}>
      <ringGeometry args={[radius * 0.96, radius * 1.04, 64]} />
      <meshBasicMaterial
        color="#60a5fa"
        side={THREE.DoubleSide}
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// Relativistic Accretion Disk Particles
function AccretionDisk({
  count = 12000,
  innerRadius = 3.2,
  outerRadius = 9.5,
  luminosity = 1.2,
  spin = 0.8,
  isPaused = false,
}: {
  count?: number;
  innerRadius?: number;
  outerRadius?: number;
  luminosity?: number;
  spin?: number;
  isPaused?: boolean;
}) {
  const pointsRef = useRef<THREE.Points>(null);

  // Initialize particle orbital coordinates
  const [positions, colors, orbitalData] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    // orbitalData: [radius, angle, speed, verticalOffset]
    const orb = new Float32Array(count * 4);

    const pseudoRandom = (seed: number) => {
      const x = Math.sin(seed * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };

    for (let i = 0; i < count; i++) {
      // Clustered towards inner edge (Keplerian density gradient)
      const u = pseudoRandom(i * 3 + 1);
      const r = innerRadius + Math.pow(u, 1.8) * (outerRadius - innerRadius);
      const theta = pseudoRandom(i * 3 + 2) * Math.PI * 2;
      // Keplerian angular velocity: v ~ 1 / sqrt(r) * (1 + spin * 0.5)
      const speed = (2.2 / Math.sqrt(r)) * (1 + spin * 0.4);
      // Small vertical disk scale height
      const zHeight = (pseudoRandom(i * 3 + 3) - 0.5) * 0.18 * (r / outerRadius);

      const i3 = i * 3;
      pos[i3] = Math.cos(theta) * r;
      pos[i3 + 1] = zHeight;
      pos[i3 + 2] = Math.sin(theta) * r;

      const i4 = i * 4;
      orb[i4] = r;
      orb[i4 + 1] = theta;
      orb[i4 + 2] = speed;
      orb[i4 + 3] = zHeight;

      // Color temperature based on radius (blue-white at center, shifting to red/orange outer)
      const t = (r - innerRadius) / (outerRadius - innerRadius);
      if (t < 0.25) {
        // Inner: Ultra-hot X-ray / UV blue-white
        col[i3] = 0.8;
        col[i3 + 1] = 0.9;
        col[i3 + 2] = 1.0;
      } else if (t < 0.6) {
        // Mid: Luminous incandescent golden orange
        col[i3] = 1.0;
        col[i3 + 1] = 0.65;
        col[i3 + 2] = 0.15;
      } else {
        // Outer: Deep gravitational redshift amber
        col[i3] = 0.9;
        col[i3 + 1] = 0.25;
        col[i3 + 2] = 0.05;
      }
    }

    return [pos, col, orb];
  }, [count, innerRadius, outerRadius, spin]);

  const orbitalDataRef = useRef<Float32Array>(orbitalData);
  useEffect(() => {
    orbitalDataRef.current = orbitalData;
  }, [orbitalData]);

  useFrame((_, delta) => {
    if (isPaused || !pointsRef.current) return;

    const posAttr = pointsRef.current.geometry.attributes.position;
    const colAttr = pointsRef.current.geometry.attributes.color;
    const posArr = posAttr.array as Float32Array;
    const colArr = colAttr.array as Float32Array;
    const orb = orbitalDataRef.current;

    for (let i = 0; i < count; i++) {
      const i4 = i * 4;
      const r = orb[i4];
      const speed = orb[i4 + 2];
      const z = orb[i4 + 3];

      // Advance orbital angle
      orb[i4 + 1] += speed * delta;
      const theta = orb[i4 + 1];

      const i3 = i * 3;
      posArr[i3] = Math.cos(theta) * r;
      posArr[i3 + 1] = z;
      posArr[i3 + 2] = Math.sin(theta) * r;

      // Relativistic Doppler Beaming factor:
      // Approaching side (cos(theta) > 0) is amplified in brightness
      const beaming = 1.0 + Math.cos(theta) * 0.45;
      const baseCol = (r - innerRadius) / (outerRadius - innerRadius);
      const intensity = Math.min(1.5, beaming * luminosity);

      if (baseCol < 0.25) {
        colArr[i3] = 0.8 * intensity;
        colArr[i3 + 1] = 0.9 * intensity;
        colArr[i3 + 2] = 1.0 * intensity;
      } else if (baseCol < 0.6) {
        colArr[i3] = 1.0 * intensity;
        colArr[i3 + 1] = 0.65 * intensity;
        colArr[i3 + 2] = 0.15 * intensity;
      } else {
        colArr[i3] = 0.9 * intensity;
        colArr[i3 + 1] = 0.25 * intensity;
        colArr[i3 + 2] = 0.05 * intensity;
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// Gravitational Lensing Halo (Upper & Lower Light Bending Arcs)
function LensingHalo({ radius = 2.9 }: { radius?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.z += delta * 0.05;
    }
  });

  return (
    <mesh ref={meshRef}>
      <ringGeometry args={[radius * 0.92, radius * 1.15, 64]} />
      <meshBasicMaterial
        color="#fbbf24"
        side={THREE.DoubleSide}
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

export default function BlackHoleSimulator({
  spin = 0.85,
  luminosity = 1.2,
  particleCount = 12000,
  isPaused = false,
}: BlackHoleSimulatorProps) {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", background: "#050508" }}>
      <Canvas
        camera={{ position: [0, 4.5, 14], fov: 50 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#030305"]} />
        <ambientLight intensity={0.1} />

        {/* Deep Field Cosmic Starfield */}
        <Stars radius={150} depth={50} count={3500} factor={4} saturation={0.5} fade speed={0.5} />

        {/* Center Black Hole System */}
        <group rotation={[Math.PI / 7, 0, Math.PI / 12]}>
          <EventHorizon radius={2.0} />
          <PhotonSphere radius={2.65} />
          <LensingHalo radius={2.85} />
          <AccretionDisk
            count={particleCount}
            innerRadius={3.0}
            outerRadius={9.5}
            luminosity={luminosity}
            spin={spin}
            isPaused={isPaused}
          />
        </group>

        {/* Camera Control */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          maxDistance={25}
          minDistance={4}
          rotateSpeed={0.8}
        />
      </Canvas>
    </div>
  );
}
