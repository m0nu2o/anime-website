import { NextRequest, NextResponse } from "next/server";
import { Anime } from "@/lib/api/types";
import { getTrendingAnime, getPopularAnime, getTopAiringAnime } from "@/lib/api";

function formatList(animeList: Anime[], cap: number = 10) {
  const seen = new Set<string>();
  const unique = animeList.filter((anime) => {
    if (!anime.id || seen.has(anime.id)) return false;
    seen.add(anime.id);
    return true;
  });

  return unique.slice(0, cap).map((anime, idx) => {
    const title = anime.title.english || anime.title.romaji || anime.title.native || "Anime";
    const image = anime.images.cover || anime.images.largeCover || "/placeholder-cover.svg";
    const score = anime.score
      ? (anime.score > 10 ? (anime.score / 10).toFixed(1) : anime.score.toFixed(1))
      : null;

    return {
      id: anime.id,
      rank: idx + 1,
      title,
      image,
      format: anime.format || "TV",
      score,
      episodes: anime.episodes ?? null,
      genres: anime.genres || [],
    };
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "trending";

  try {
    let animeList: Anime[] = [];

    if (period === "trending" || period === "week") {
      // Real trending signal: AniList TRENDING_DESC
      animeList = await getTrendingAnime(10);
      if (animeList.length < 10) {
        const fallback = await getPopularAnime(10);
        animeList = [...animeList, ...fallback];
      }
    } else if (period === "airing" || period === "today") {
      // Top currently airing series sorted by verified community score
      animeList = await getTopAiringAnime(10);
      if (animeList.length < 10) {
        const fallback = await getTrendingAnime(10);
        animeList = [...animeList, ...fallback];
      }
    } else {
      // All-time popularity leaderboard
      animeList = await getPopularAnime(10);
      if (animeList.length < 10) {
        const fallback = await getTrendingAnime(10);
        animeList = [...animeList, ...fallback];
      }
    }

    return NextResponse.json({
      success: true,
      period,
      data: formatList(animeList),
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=43200",
      },
    });
  } catch (error) {
    console.error("Top 10 API error:", error);
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}
