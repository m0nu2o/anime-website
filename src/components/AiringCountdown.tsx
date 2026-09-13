"use client";

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface AiringCountdownProps {
  dayName?: string;
  timeString?: string;
  airingAtTimestamp?: number; // Unix timestamp in seconds
}

export default function AiringCountdown({ dayName, timeString, airingAtTimestamp }: AiringCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    function calculateTime() {
      // 1. Exact Unix timestamp calculation (authoritative & timezone-independent)
      if (typeof airingAtTimestamp === "number" && Number.isFinite(airingAtTimestamp)) {
        const diffMs = (airingAtTimestamp * 1000) - Date.now();
        if (diffMs <= 0) {
          setTimeLeft(null);
          return;
        }
        const totalSecs = Math.floor(diffMs / 1000);
        const days = Math.floor(totalSecs / 86400);
        const hours = Math.floor((totalSecs % 86400) / 3600);
        const minutes = Math.floor((totalSecs % 3600) / 60);
        const seconds = totalSecs % 60;
        setTimeLeft({ days, hours, minutes, seconds });
        return;
      }

      if (!timeString || timeString.includes("TBA") || !dayName) return;
      
      // 2. Fallback: Parse JST time (e.g. "18:00 JST" or "09:30 JST")
      const timeMatch = timeString.match(/(\d{1,2}):(\d{2})/);
      const jstHour = timeMatch ? parseInt(timeMatch[1], 10) : 0;
      const jstMin = timeMatch ? parseInt(timeMatch[2], 10) : 0;

      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const targetDayIndex = daysOfWeek.findIndex(d => d.toLowerCase() === dayName.toLowerCase());

      const now = new Date();
      const utcNow = now.getTime() + now.getTimezoneOffset() * 60000;
      const jstNow = new Date(utcNow + 3600000 * 9);

      const targetDate = new Date(jstNow);
      targetDate.setHours(jstHour, jstMin, 0, 0);

      if (targetDayIndex !== -1) {
        const currentDayIndex = jstNow.getDay();
        let daysUntil = targetDayIndex - currentDayIndex;
        if (daysUntil < 0 || (daysUntil === 0 && jstNow.getTime() > targetDate.getTime())) {
          daysUntil += 7;
        }
        targetDate.setDate(targetDate.getDate() + daysUntil);
      }

      const diffMs = targetDate.getTime() - jstNow.getTime();
      if (diffMs <= 0) {
        setTimeLeft(null);
        return;
      }

      const totalSecs = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSecs / 86400);
      const hours = Math.floor((totalSecs % 86400) / 3600);
      const minutes = Math.floor((totalSecs % 3600) / 60);
      const seconds = totalSecs % 60;
      setTimeLeft({ days, hours, minutes, seconds });
    }

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [dayName, timeString, airingAtTimestamp]);

  if (typeof airingAtTimestamp !== "number" && (!timeString || timeString.includes("TBA"))) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        <Clock size={13} />
        <span>Time TBA</span>
      </span>
    );
  }

  if (!timeLeft) {
    return <span>📡 Broadcast Live / Aired</span>;
  }

  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <Clock size={13} />
      <span>
        {timeLeft.days > 0
          ? `Airs in ${timeLeft.days}d ${pad(timeLeft.hours)}h ${pad(timeLeft.minutes)}m`
          : `Airs in ${pad(timeLeft.hours)}h ${pad(timeLeft.minutes)}m ${pad(timeLeft.seconds)}s`}
      </span>
    </span>
  );
}
