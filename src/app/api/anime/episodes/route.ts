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

    const [episodes, anime] = await Promise.all([
      getAnimeEpisodes(animeId),
      getAnimeById(animeId).catch(() => null),
    ]);

    const totalEpisodes = episodes.length > 0 ? episodes.length : (anime?.episodes || 12);

    return NextResponse.json({
      animeId,
      episodes,
      totalEpisodes,
      dubAvailable: true,
      subAvailable: true,
      currentLanguage: language,
    });
  } catch (error: any) {
    console.error("Failed to fetch episodes:", error);
    return NextResponse.json(
      { error: "Failed to fetch episodes", details: error.message },
      { status: 500 }
    );
  }
}
