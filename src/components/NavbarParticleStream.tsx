"use client";

import React, { useEffect, useRef } from "react";
import { THEME_CONFIGS } from "./ThemeSimulatorProvider";

interface NavbarParticleStreamProps {
  theme?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  baseAlpha: number;
  pulseSpeed: number;
  phase: number;
  colorType: "primary" | "accent";
}

export default function NavbarParticleStream({ theme = "blackhole" }: NavbarParticleStreamProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = (canvas.offsetWidth || window.innerWidth) * (window.devicePixelRatio || 1));
    let height = (canvas.height = (canvas.offsetHeight || 52) * (window.devicePixelRatio || 1));

    const handleResize = () => {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      width = canvas.width = (canvas.parentElement?.clientWidth || window.innerWidth) * dpr;
      height = canvas.height = (canvas.parentElement?.clientHeight || 56) * dpr;
    };

    window.addEventListener("resize", handleResize);

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      mouseRef.current = {
        x: (e.clientX - rect.left) * dpr,
        y: (e.clientY - rect.top) * dpr,
        active: true,
      };
    };

    const onMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener("mousemove", onMouseMove);
      parent.addEventListener("mouseleave", onMouseLeave);
    }

    const particleCount = Math.min(130, Math.max(50, Math.floor(window.innerWidth / 15)));
    const particles: Particle[] = [];
    const dpr = window.devicePixelRatio || 1;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() * 0.45 + 0.15) * (Math.random() > 0.35 ? 1 : -0.7),
        vy: (Math.random() - 0.5) * 0.18,
        size: (Math.random() * 1.8 + 0.9) * dpr,
        alpha: Math.random() * 0.6 + 0.25,
        baseAlpha: Math.random() * 0.5 + 0.35,
        pulseSpeed: Math.random() * 0.03 + 0.015,
        phase: Math.random() * Math.PI * 2,
        colorType: Math.random() > 0.35 ? "primary" : "accent",
      });
    }

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      const cfg = THEME_CONFIGS[theme] || THEME_CONFIGS.blackhole;
      const primaryColor = cfg?.primaryColor || "#9333ea";
      const accentColor = cfg?.accentColor || "#c084fc";

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Wave motion
        p.x += p.vx;
        p.y += p.vy + Math.sin(time * 0.8 + p.phase) * 0.15;
        p.alpha = p.baseAlpha + Math.sin(time * 2 + p.phase) * 0.25;

        // Wrap around boundaries
        if (p.x > width + 10) p.x = -10;
        if (p.x < -10) p.x = width + 10;
        if (p.y > height) p.y = 0;
        if (p.y < 0) p.y = height;

        // Mouse gentle interaction
        if (mouseRef.current.active) {
          const dx = p.x - mouseRef.current.x;
          const dy = p.y - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 85 * dpr;
          if (dist < maxDist && dist > 0) {
            const force = (1 - dist / maxDist) * 1.2;
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
          }
        }

        const color = p.colorType === "primary" ? primaryColor : accentColor;
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.6, p.size), 0, Math.PI * 2);

        ctx.shadowBlur = Math.max(3, p.size * 3.5);
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.globalAlpha = Math.max(0.15, Math.min(0.95, p.alpha));
        ctx.fill();
        ctx.restore();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      if (parent) {
        parent.removeEventListener("mousemove", onMouseMove);
        parent.removeEventListener("mouseleave", onMouseLeave);
      }
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 3,
        bottom: 3,
        left: 0,
        right: 0,
        width: "100%",
        height: "calc(100% - 6px)",
        pointerEvents: "none",
        zIndex: 0,
        opacity: 0.95,
      }}
    />
  );
}
