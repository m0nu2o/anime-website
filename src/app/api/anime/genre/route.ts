import { NextRequest, NextResponse } from "next/server";
import catalogData from "@/lib/api/genreCatalog.json";

const ANILIST_GENRES = new Set([
  "Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy",
  "Horror", "Mahou Shoujo", "Mecha", "Music", "Mystery", "Psychological",
  "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller"
]);

const GENRE_ALIASES: Record<string, { type: "genre" | "tag"; value: string; displayName: string }> = {
  "suspense": { type: "genre", value: "Thriller", displayName: "Suspense" },
  "thriller": { type: "genre", value: "Thriller", displayName: "Thriller" },
  "sci-fi": { type: "genre", value: "Sci-Fi", displayName: "Sci-Fi" },
  "scifi": { type: "genre", value: "Sci-Fi", displayName: "Sci-Fi" },
  "science-fiction": { type: "genre", value: "Sci-Fi", displayName: "Sci-Fi" },
  "slice of life": { type: "genre", value: "Slice of Life", displayName: "Slice of Life" },
  "slice-of-life": { type: "genre", value: "Slice of Life", displayName: "Slice of Life" },
  "martial arts": { type: "tag", value: "Martial Arts", displayName: "Martial Arts" },
  "martial-arts": { type: "tag", value: "Martial Arts", displayName: "Martial Arts" },
  "super power": { type: "tag", value: "Super Power", displayName: "Super Power" },
  "super-power": { type: "tag", value: "Super Power", displayName: "Super Power" },
  "isekai": { type: "tag", value: "Isekai", displayName: "Isekai" },
  "demons": { type: "tag", value: "Demons", displayName: "Demons" },
  "demon": { type: "tag", value: "Demons", displayName: "Demons" },
  "military": { type: "tag", value: "Military", displayName: "Military" },
  "vampire": { type: "tag", value: "Vampire", displayName: "Vampire" },
  "reincarnation": { type: "tag", value: "Reincarnation", displayName: "Reincarnation" },
  "shounen": { type: "tag", value: "Shounen", displayName: "Shounen" },
  "shoujo": { type: "tag", value: "Shoujo", displayName: "Shoujo" },
  "seinen": { type: "tag", value: "Seinen", displayName: "Seinen" },
  "josei": { type: "tag", value: "Josei", displayName: "Josei" },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawGenre = searchParams.get("genre") || "Action";
  const parsedPage = parseInt(searchParams.get("page") || "1", 10);
  const parsedLimit = parseInt(searchParams.get("limit") || "12", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 12;

  const clean = rawGenre.trim().toLowerCase();
  const alias = GENRE_ALIASES[clean];

  let isGenre = false;
  let queryValue = "";
  let displayName = rawGenre.trim();

  if (alias) {
    isGenre = alias.type === "genre";
    queryValue = alias.value;
    displayName = alias.displayName;
  } else {
    const matchedGenre = Array.from(ANILIST_GENRES).find((g) => g.toLowerCase() === clean);
    if (matchedGenre) {
      isGenre = true;
      queryValue = matchedGenre;
      displayName = matchedGenre;
    } else {
      isGenre = false;
      queryValue = displayName.charAt(0).toUpperCase() + displayName.slice(1);
      displayName = queryValue;
    }
  }

  // 1. Authoritative AniList GraphQL Query (Accurate genres and tags)
  try {
    const query = `
      query ($val: String, $page: Int, $limit: Int) {
        Page(page: $page, perPage: $limit) {
          pageInfo {
            hasNextPage
          }
          media(${isGenre ? "genre: $val" : "tag: $val"}, type: ANIME, sort: POPULARITY_DESC) {
            id
            title { english romaji native }
            coverImage { large medium }
            episodes
            averageScore
            format
            status
            startDate { year }
            genres
          }
        }
      }
    `;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 NextGenAnime/1.0",
      },
      body: JSON.stringify({
        query,
        variables: { val: queryValue, page, limit },
      }),
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      const media = json.data?.Page?.media;
      if (Array.isArray(media) && media.length > 0) {
        const results = media.map((item: any) => {
          const rawScore = typeof item.averageScore === "number" ? Math.round((item.averageScore / 10) * 10) / 10 : undefined;
          const title = item.title?.english || item.title?.romaji || "Anime";
          return {
            id: `anilist-${item.id}`,
            title,
            image: item.coverImage?.large || item.coverImage?.medium || "/placeholder-cover.svg",
            format: item.format || "TV",
            status: item.status,
            score: rawScore,
            episodes: item.episodes,
            year: item.startDate?.year,
            genres: item.genres || [displayName],
          };
        });

        return NextResponse.json({
          success: true,
          source: "anilist",
          genre: displayName,
          page,
          hasMore: Boolean(json.data?.Page?.pageInfo?.hasNextPage),
          data: results,
        }, {
          headers: {
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        });
      }
    }
  } catch (err) {
    console.warn(`AniList genre query for "${displayName}" failed:`, err);
  }

  // 2. Secondary Fallback: Static Genre Catalog
  const catalogMap = catalogData as Record<string, any[]>;
  const catalogItems = catalogMap[displayName] || catalogMap["Action"] || [];
  const startIndex = (page - 1) * limit;
  const slicedCatalog = catalogItems.slice(startIndex, startIndex + limit);

  return NextResponse.json({
    success: true,
    source: "catalog",
    stale: true,
    genre: displayName,
    page,
    hasMore: startIndex + limit < catalogItems.length,
    data: slicedCatalog,
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
