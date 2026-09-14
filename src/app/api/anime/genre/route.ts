import { NextRequest, NextResponse } from "next/server";
import { getGenreByNameOrSlug } from "@/lib/api/genres";
import catalogData from "@/lib/api/genreCatalog.json";

interface GenreMeta {
  name: string;
  slug: string;
  malId?: number;
}

const GENRE_MAP: Record<string, GenreMeta> = {
  // Action
  "1": { name: "Action", slug: "action", malId: 1 },
  "action": { name: "Action", slug: "action", malId: 1 },

  // Adventure
  "2": { name: "Adventure", slug: "adventure", malId: 2 },
  "adventure": { name: "Adventure", slug: "adventure", malId: 2 },

  // Comedy
  "4": { name: "Comedy", slug: "comedy", malId: 4 },
  "comedy": { name: "Comedy", slug: "comedy", malId: 4 },

  // Mystery
  "7": { name: "Mystery", slug: "mystery", malId: 7 },
  "mystery": { name: "Mystery", slug: "mystery", malId: 7 },

  // Drama
  "8": { name: "Drama", slug: "drama", malId: 8 },
  "drama": { name: "Drama", slug: "drama", malId: 8 },

  // Fantasy
  "10": { name: "Fantasy", slug: "fantasy", malId: 10 },
  "fantasy": { name: "Fantasy", slug: "fantasy", malId: 10 },

  // Horror
  "14": { name: "Horror", slug: "horror", malId: 14 },
  "horror": { name: "Horror", slug: "horror", malId: 14 },

  // Romance
  "22": { name: "Romance", slug: "romance", malId: 22 },
  "romance": { name: "Romance", slug: "romance", malId: 22 },

  // Sci-Fi
  "24": { name: "Sci-Fi", slug: "science-fiction", malId: 24 },
  "sci-fi": { name: "Sci-Fi", slug: "science-fiction", malId: 24 },
  "scifi": { name: "Sci-Fi", slug: "science-fiction", malId: 24 },
  "science-fiction": { name: "Sci-Fi", slug: "science-fiction", malId: 24 },

  // Slice of Life
  "36": { name: "Slice of Life", slug: "slice-of-life", malId: 36 },
  "slice-of-life": { name: "Slice of Life", slug: "slice-of-life", malId: 36 },
  "slice of life": { name: "Slice of Life", slug: "slice-of-life", malId: 36 },

  // Sports
  "30": { name: "Sports", slug: "sports", malId: 30 },
  "sports": { name: "Sports", slug: "sports", malId: 30 },

  // Supernatural
  "37": { name: "Supernatural", slug: "supernatural", malId: 37 },
  "supernatural": { name: "Supernatural", slug: "supernatural", malId: 37 },

  // Suspense / Thriller
  "41": { name: "Suspense", slug: "thriller", malId: 41 },
  "suspense": { name: "Suspense", slug: "thriller", malId: 41 },
  "thriller": { name: "Thriller", slug: "thriller", malId: 41 },

  // Isekai
  "62": { name: "Isekai", slug: "isekai", malId: 62 },
  "isekai": { name: "Isekai", slug: "isekai", malId: 62 },

  // Shounen
  "27": { name: "Shounen", slug: "shounen", malId: 27 },
  "shounen": { name: "Shounen", slug: "shounen", malId: 27 },

  // Shoujo
  "25": { name: "Shoujo", slug: "shoujo", malId: 25 },
  "shoujo": { name: "Shoujo", slug: "shoujo", malId: 25 },

  // Seinen
  "42": { name: "Seinen", slug: "seinen", malId: 42 },
  "seinen": { name: "Seinen", slug: "seinen", malId: 42 },

  // Josei
  "43": { name: "Josei", slug: "josei", malId: 43 },
  "josei": { name: "Josei", slug: "josei", malId: 43 },

  // Mecha
  "18": { name: "Mecha", slug: "mecha", malId: 18 },
  "mecha": { name: "Mecha", slug: "mecha", malId: 18 },

  // Music
  "19": { name: "Music", slug: "music", malId: 19 },
  "music": { name: "Music", slug: "music", malId: 19 },

  // Psychological
  "40": { name: "Psychological", slug: "psychological", malId: 40 },
  "psychological": { name: "Psychological", slug: "psychological", malId: 40 },

  // Martial Arts
  "17": { name: "Martial Arts", slug: "martial-arts", malId: 17 },
  "martial-arts": { name: "Martial Arts", slug: "martial-arts", malId: 17 },
  "martial arts": { name: "Martial Arts", slug: "martial-arts", malId: 17 },

  // Super Power
  "31": { name: "Super Power", slug: "super-power", malId: 31 },
  "super-power": { name: "Super Power", slug: "super-power", malId: 31 },
  "super power": { name: "Super Power", slug: "super-power", malId: 31 },

  // Demons
  "6": { name: "Demons", slug: "demon", malId: 6 },
  "demons": { name: "Demons", slug: "demon", malId: 6 },
  "demon": { name: "Demons", slug: "demon", malId: 6 },

  // Military
  "38": { name: "Military", slug: "military", malId: 38 },
  "military": { name: "Military", slug: "military", malId: 38 },

  // Vampire
  "32": { name: "Vampire", slug: "vampire", malId: 32 },
  "vampire": { name: "Vampire", slug: "vampire", malId: 32 },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawGenre = searchParams.get("genre") || "Action";
  const parsedPage = parseInt(searchParams.get("page") || "1", 10);
  const parsedLimit = parseInt(searchParams.get("limit") || "24", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 24;

  const cleanKey = rawGenre.trim().toLowerCase();
  const meta: GenreMeta = GENRE_MAP[cleanKey] || {
    name: rawGenre.charAt(0).toUpperCase() + rawGenre.slice(1),
    slug: cleanKey.replace(/\s+/g, "-"),
  };

  const offset = (page - 1) * Math.min(limit, 20);
  const kitsuLimit = Math.min(limit, 20);

  // 1. Try Live Kitsu API with mapped category slug
  try {
    const url = `https://kitsu.io/api/edge/anime?filter[categories]=${encodeURIComponent(meta.slug)}&sort=-userCount&page[limit]=${kitsuLimit}&page[offset]=${offset}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      headers: {
        "Accept": "application/vnd.api+json",
        "User-Agent": "Mozilla/5.0 NextGenAnime/1.0",
      },
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.data) && json.data.length > 0) {
        const results = json.data.map((item: { id: string | number; attributes?: Record<string, unknown> }) => {
          const a = item.attributes || {};
          const averageRating = typeof a.averageRating === "string" ? a.averageRating : null;
          const rawScore = averageRating ? parseFloat(averageRating) : null;
          const titles = (a.titles || {}) as Record<string, string | undefined>;
          const posterImage = (a.posterImage || {}) as Record<string, string | undefined>;

          return {
            id: `kitsu-${item.id}`,
            title: typeof a.canonicalTitle === "string" ? a.canonicalTitle : (titles.en || titles.en_jp || "Anime"),
            image: posterImage.large || posterImage.medium || posterImage.original || "/placeholder-cover.svg",
            format: typeof a.subtype === "string" ? a.subtype.toUpperCase() : "TV",
            score: rawScore,
            episodes: typeof a.episodeCount === "number" ? a.episodeCount : undefined,
            year: typeof a.startDate === "string" ? new Date(a.startDate).getFullYear() : undefined,
            genres: [meta.name],
          };
        });

        return NextResponse.json({
          success: true,
          source: "kitsu",
          genre: meta.name,
          page,
          hasMore: Boolean(json?.links?.next),
          data: results,
        });
      }
    }
  } catch (err) {
    console.warn(`Live Kitsu genre fetch for "${meta.name}" (${meta.slug}) failed, using verified catalog fallback:`, err);
  }

  // Robust verified static catalog fallback
  const catalogMap = catalogData as Record<string, any[]>;
  const catalogItems = catalogMap[meta.name] || catalogMap["Action"] || [];
  const startIndex = (page - 1) * limit;
  const slicedCatalog = catalogItems.slice(startIndex, startIndex + limit);

  return NextResponse.json({
    success: true,
    source: "catalog",
    stale: true,
    genre: meta.name,
    page,
    hasMore: startIndex + limit < catalogItems.length,
    data: slicedCatalog,
  });
}
