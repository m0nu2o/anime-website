import { NextRequest, NextResponse } from "next/server";
import { getAnimeEpisodes, getAnimeById } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const animeId = searchParams.get("animeId");
    const language = (searchParams.get("language") || "sub").toLowerCase();

    if (!animeId) {
      return NextResponse.json(
        { error: "Missing animeId query parameter" },
        { status: 400 }
      );
    }

    const anime = await getAnimeById(animeId).catch(() => null);
    const episodes = await getAnimeEpisodes(animeId, anime?.title?.english || anime?.title?.romaji, anime);

    const declaredTotalEpisodes =
      typeof anime?.episodes === "number" && anime.episodes > 0 ? anime.episodes : null;

    // Real provider episodes only. Never fabricate synthetic episodes.
    const effectiveEpisodes = episodes;

    const releasedList = effectiveEpisodes.filter((e) => e.status === "released");
    const upcomingList = effectiveEpisodes.filter((e) => e.status === "upcoming");
    const releasedCount = releasedList.length;
    const upcomingCount = upcomingList.length > 0 
      ? upcomingList.length 
      : (declaredTotalEpisodes !== null && declaredTotalEpisodes > releasedCount ? declaredTotalEpisodes - releasedCount : 0);

    return NextResponse.json({
      animeId,
      episodes: effectiveEpisodes,
      declaredTotalEpisodes,
      releasedEpisodes: releasedCount,
      upcomingEpisodes: upcomingCount > 0 ? upcomingCount : null,
      dubAvailable: null,
      subAvailable: null,
      currentLanguage: language,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Failed to fetch episodes:", msg);
    return NextResponse.json(
      { error: "Failed to fetch episodes", details: msg },
      { status: 500 }
    );
  }
}
