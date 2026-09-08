import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const genre = searchParams.get("genre") || "action";
  const cleanGenre = genre.trim().toLowerCase();

  try {
    const url = `https://kitsu.io/api/edge/anime?filter[categories]=${encodeURIComponent(cleanGenre)}&sort=-userCount&page[limit]=8`;
    const res = await fetch(url, {
      headers: { "Accept": "application/vnd.api+json" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, data: [] }, { status: 500 });
    }

    const json = await res.json();
    if (!json.data || !Array.isArray(json.data)) {
      return NextResponse.json({ success: true, data: [] });
    }

    const results = json.data.map((item: any) => {
      const a = item.attributes;
      const rawScore = a.averageRating ? parseFloat(a.averageRating) : null;
      const score = rawScore ? (rawScore / 10).toFixed(1) : null;

      return {
        id: `kitsu-${item.id}`,
        title: a.canonicalTitle || a.titles?.en || a.titles?.en_jp || "Anime",
        image: a.posterImage?.large || a.posterImage?.medium || a.posterImage?.original || "/placeholder-cover.svg",
        format: a.subtype?.toUpperCase() || "TV",
        score: score,
        episodes: a.episodeCount,
        year: a.startDate ? new Date(a.startDate).getFullYear() : undefined,
        genres: [genre.charAt(0).toUpperCase() + genre.slice(1)],
      };
    });

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Genre API route error:", error);
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}
