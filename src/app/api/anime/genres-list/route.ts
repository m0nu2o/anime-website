import { NextResponse } from "next/server";
import { fetchJikanGenres } from "@/lib/api/jikan";
import { CANONICAL_GENRES } from "@/lib/api/genres";

export async function GET() {
  try {
    const genres = await fetchJikanGenres();
    if (genres && genres.length > 0) {
      // Filter out adult/explicit genres to keep clean family-safe catalog
      const cleanGenres = genres.filter(
        (g) => !["Hentai", "Erotica", "Ecchi"].includes(g.name)
      );
      return NextResponse.json({
        success: true,
        genres: cleanGenres,
      }, {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
        },
      });
    }
  } catch (err) {
    console.warn("genres-list API route error, using canonical fallback:", err);
  }

  // Unified canonical fallback guaranteeing rich genre choices
  return NextResponse.json({
    success: true,
    genres: CANONICAL_GENRES.map((g) => ({ id: g.id, name: g.name })),
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
    },
  });
}
