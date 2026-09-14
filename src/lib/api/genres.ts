/**
 * Unified Canonical Genre Registry
 * Provides single-source-of-truth genres across Home, Discover, Search, and Catalog APIs.
 */

export interface GenreInfo {
  id: number;
  name: string;
  slug: string;
  kitsuSlug?: string;
  malId?: number;
}

export const CANONICAL_GENRES: GenreInfo[] = [
  { id: 1, name: "Action", slug: "action", kitsuSlug: "action", malId: 1 },
  { id: 2, name: "Adventure", slug: "adventure", kitsuSlug: "adventure", malId: 2 },
  { id: 4, name: "Comedy", slug: "comedy", kitsuSlug: "comedy", malId: 4 },
  { id: 8, name: "Drama", slug: "drama", kitsuSlug: "drama", malId: 8 },
  { id: 10, name: "Fantasy", slug: "fantasy", kitsuSlug: "fantasy", malId: 10 },
  { id: 14, name: "Horror", slug: "horror", kitsuSlug: "horror", malId: 14 },
  { id: 7, name: "Mystery", slug: "mystery", kitsuSlug: "mystery", malId: 7 },
  { id: 22, name: "Romance", slug: "romance", kitsuSlug: "romance", malId: 22 },
  { id: 24, name: "Sci-Fi", slug: "sci-fi", kitsuSlug: "science-fiction", malId: 24 },
  { id: 36, name: "Slice of Life", slug: "slice-of-life", kitsuSlug: "slice-of-life", malId: 36 },
  { id: 30, name: "Sports", slug: "sports", kitsuSlug: "sports", malId: 30 },
  { id: 37, name: "Supernatural", slug: "supernatural", kitsuSlug: "supernatural", malId: 37 },
  { id: 41, name: "Suspense", slug: "suspense", kitsuSlug: "thriller", malId: 41 },
  { id: 62, name: "Isekai", slug: "isekai", kitsuSlug: "isekai", malId: 62 },
  { id: 27, name: "Shounen", slug: "shounen", kitsuSlug: "shounen", malId: 27 },
  { id: 25, name: "Shoujo", slug: "shoujo", kitsuSlug: "shoujo", malId: 25 },
  { id: 42, name: "Seinen", slug: "seinen", kitsuSlug: "seinen", malId: 42 },
  { id: 43, name: "Josei", slug: "josei", kitsuSlug: "josei", malId: 43 },
  { id: 18, name: "Mecha", slug: "mecha", kitsuSlug: "mecha", malId: 18 },
  { id: 19, name: "Music", slug: "music", kitsuSlug: "music", malId: 19 },
  { id: 40, name: "Psychological", slug: "psychological", kitsuSlug: "psychological", malId: 40 },
  { id: 17, name: "Martial Arts", slug: "martial-arts", kitsuSlug: "martial-arts", malId: 17 },
  { id: 31, name: "Super Power", slug: "super-power", kitsuSlug: "super-power", malId: 31 },
  { id: 6, name: "Demons", slug: "demons", kitsuSlug: "demon", malId: 6 },
  { id: 38, name: "Military", slug: "military", kitsuSlug: "military", malId: 38 },
  { id: 32, name: "Vampire", slug: "vampire", kitsuSlug: "vampire", malId: 32 },
  { id: 68, name: "Reincarnation", slug: "reincarnation", kitsuSlug: "reincarnation", malId: 68 },
];

export const GENRE_NAMES = CANONICAL_GENRES.map((g) => g.name);

export function getGenreByNameOrSlug(input: string): GenreInfo | undefined {
  const clean = input.trim().toLowerCase();
  return CANONICAL_GENRES.find(
    (g) => g.name.toLowerCase() === clean || g.slug === clean || g.kitsuSlug === clean || String(g.id) === clean
  );
}
