import { NextRequest, NextResponse } from "next/server";
import { getAiringSchedule } from "@/lib/api";

const KUHI_API_URL = process.env.KUHI_API_URL || "http://localhost:8000";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export async function GET(request: NextRequest) {
  // 1. Primary: Kuhi API /anime/schedule
  try {
    const res = await fetch(`${KUHI_API_URL}/anime/schedule`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === "object") {
        return NextResponse.json({
          success: true,
          provider: "Kuhi API (FastAPI)",
          schedule: data,
          updatedAt: new Date().toISOString(),
        }, {
          headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" },
        });
      }
    }
  } catch {}

  // 2. Fallback: Jikan & Kitsu Normalized Broadcast Schedule
  try {
    const rawItems = await getAiringSchedule(undefined, 60);
    const schedule: Record<string, any[]> = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    };

    const seenKeys = new Set<string>();

    for (const item of rawItems) {
      const dayKey = (item.airingAt || "").toLowerCase();
      if (!schedule[dayKey]) continue;

      const normTitle = (item.animeTitle || "").toLowerCase().trim();
      if (!normTitle || seenKeys.has(normTitle)) continue;
      seenKeys.add(normTitle);

      schedule[dayKey].push({
        id: item.animeId,
        title: item.animeTitle,
        image: item.animeImage,
        episode: item.episodeNumber,
        isUpcoming: item.status === "upcoming",
        status: item.status || "airing_today",
        time: (item.timeString || "18:00 JST").replace(" JST", "").trim(),
        day: item.airingAt,
        score: item.score,
        studio: item.studio,
        genres: item.genres || [],
      });
    }

    return NextResponse.json({
      success: true,
      provider: "Jikan & Kitsu Live Network",
      schedule,
      updatedAt: new Date().toISOString(),
    }, {
      headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" },
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}
