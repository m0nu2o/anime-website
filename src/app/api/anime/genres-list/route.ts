import { NextResponse } from "next/server";
import { fetchJikanGenres } from "@/lib/api/jikan";

const FALLBACK_GENRES = [
  { id: 1, name: "Action" },
  { id: 2, name: "Adventure" },
  { id: 4, name: "Comedy" },
  { id: 8, name: "Drama" },
  { id: 10, name: "Fantasy" },
  { id: 14, name: "Horror" },
  { id: 7, name: "Mystery" },
  { id: 22, name: "Romance" },
  { id: 24, name: "Sci-Fi" },
  { id: 36, name: "Slice of Life" },
  { id: 30, name: "Sports" },
  { id: 37, name: "Supernatural" },
  { id: 41, name: "Suspense" },
  { id: 62, name: "Isekai" },
  { id: 27, name: "Shounen" },
  { id: 25, name: "Shoujo" },
  { id: 42, name: "Seinen" },
  { id: 43, name: "Josei" },
  { id: 18, name: "Mecha" },
  { id: 19, name: "Music" },
  { id: 20, name: "Parody" },
  { id: 40, name: "Psychological" },
  { id: 38, name: "Military" },
  { id: 6, name: "Demons" },
  { id: 17, name: "Martial Arts" },
  { id: 31, name: "Super Power" },
  { id: 32, name: "Vampire" },
  { id: 68, name: "Reincarnation" },
];

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
    console.warn("genres-list API route error, using fallback:", err);
  }

  return NextResponse.json({
    success: true,
    genres: [],
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
    },
  });
}
