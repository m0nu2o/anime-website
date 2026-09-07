"use client";

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface AiringCountdownProps {
  dayName: string;
  timeString?: string;
}

export default function AiringCountdown({ dayName, timeString = "18:00 JST" }: AiringCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    function calculateTime() {
      // Parse JST time (e.g. "18:00 JST" or "09:30 JST")
      const timeMatch = timeString.match(/(\d{1,2}):(\d{2})/);
      const jstHour = timeMatch ? parseInt(timeMatch[1], 10) : 18;
      const jstMin = timeMatch ? parseInt(timeMatch[2], 10) : 0;

      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const targetDayIndex = daysOfWeek.findIndex(d => d.toLowerCase() === dayName.toLowerCase());

      const now = new Date();
      // Current UTC time
      const utcNow = now.getTime() + now.getTimezoneOffset() * 60000;
      // JST is UTC+9
      const jstNow = new Date(utcNow + 3600000 * 9);

      let targetDate = new Date(jstNow);
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
      const hours = Math.floor(totalSecs / 3600);
      const minutes = Math.floor((totalSecs % 3600) / 60);
      const seconds = totalSecs % 60;
      setTimeLeft({ hours, minutes, seconds });
    }

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [dayName, timeString]);

  if (!timeLeft) {
    return <span>🟢 Broadcast Live Now</span>;
  }

  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <Clock size={13} />
      <span>
        Airs in {pad(timeLeft.hours)}h {pad(timeLeft.minutes)}m {pad(timeLeft.seconds)}s
      </span>
    </span>
  );
}
