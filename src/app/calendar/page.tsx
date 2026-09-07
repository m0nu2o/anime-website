import React from "react";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import ScheduleViewer from "@/components/ScheduleViewer";
import { Sparkles, Calendar as CalendarIcon } from "lucide-react";
import styles from "./page.module.css";

export const metadata = {
  title: "Airing Schedule & Broadcast Calendar | NextGen Anime",
  description: "Live weekly anime release schedule with automatic local timezone conversion, live episode countdowns, and 6-hour caching.",
};

export default function CalendarPage() {
  return (
    <>
      <Navbar />
      <div className={`container ${styles.calendarPage}`}>
        <div style={{ width: "100%", marginBottom: "8px" }}>
          <BackButton label="Back to Home" fallbackUrl="/" />
        </div>

        {/* Page Header */}
        <div className={styles.header}>
          <span className={styles.badge}>
            <Sparkles size={13} /> Official Broadcast Calendar
          </span>
          <h1 className={styles.title}>Live Airing Schedule</h1>
          <p className={styles.subtitle}>
            Accurate broadcast schedules automatically converted from Japan Standard Time (JST) to your local timezone with live countdowns.
          </p>
        </div>

        {/* Interactive Schedule Viewer with Local Timezone & 6h Caching */}
        <ScheduleViewer />
      </div>
    </>
  );
}
