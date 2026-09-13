import { NextResponse } from "next/server";
import { getAiringSchedule } from "@/lib/api";

interface ScheduleItem {
  id: string;
  title: string;
  image: string;
  episode: number | null;
  isUpcoming?: boolean;
  status?: string;
  time: string;
  day: string;
  airingDate?: string;
  hasExactTime?: boolean;
  score?: number;
  studio?: string;
  genres?: string[];
  airingAtTimestamp?: number;
  format?: string;
}

function getJstDateKey(timestamp?: number) {
  if (!timestamp) return undefined;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp * 1000));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function GET() {
  try {
    const rawItems = await getAiringSchedule(undefined, 150);
    const schedule: Record<string, ScheduleItem[]> = {};
    const seenEntries = new Set<string>();

    for (const item of rawItems) {
      const airingDate = item.airingDate || getJstDateKey(item.airingAtTimestamp);
      const title = (item.animeTitle || "").trim();
      const episodeKey = item.episodeNumber ?? "unknown";
      const identity = item.anilistId ? `ani-${item.anilistId}` : item.malId ? `mal-${item.malId}` : item.animeId;
      const dedupeKey = `${identity}|${episodeKey}|${airingDate}`.toLowerCase();
      if (!airingDate || !title || seenEntries.has(dedupeKey)) continue;

      seenEntries.add(dedupeKey);
      schedule[airingDate] ||= [];
      schedule[airingDate].push({
        id: item.animeId,
        title,
        image: item.animeImage,
        episode: item.episodeNumber ?? null,
        isUpcoming: item.status === "upcoming",
        status: item.status || "airing_today",
        time: item.timeString ? item.timeString.replace(/\s+JST$/i, "").trim() : "TBA",
        day: (item.airingAt || airingDate).charAt(0).toUpperCase() + (item.airingAt || airingDate).slice(1),
        airingDate,
        hasExactTime: item.hasExactTime ?? Boolean(item.airingAtTimestamp),
        score: item.score,
        studio: item.studio,
        genres: item.genres || [],
        airingAtTimestamp: item.airingAtTimestamp,
        format: item.format,
      });
    }

    for (const date of Object.keys(schedule)) {
      schedule[date].sort((a, b) => (a.airingAtTimestamp || 0) - (b.airingAtTimestamp || 0));
    }

    return NextResponse.json({
      success: true,
      provider: "Jikan, AniList & Kitsu Live Broadcast Feeds",
      schedule,
      updatedAt: new Date().toISOString(),
    }, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
    });
  } catch (err: unknown) {
    console.error("Schedule API Error:", err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Unknown error occurred",
    }, { status: 500 });
  }
}
