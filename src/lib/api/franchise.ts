export interface FranchiseEntry {
  id: string;
  title: string;
  format: string; // "TV" | "MOVIE" | "OVA" | "ONA" | "SPECIAL"
  category: "season" | "movie" | "special";
  seasonNumber: number;
  seasonLabel: string;
  partNumber?: number | null;
  partLabel?: string | null;
  year?: number;
  episodes?: number | null;
  isCurrent: boolean;
  coverImage?: string;
}

interface AniListRelationNode {
  id: number;
  title?: {
    romaji?: string;
    english?: string;
    native?: string;
  };
  format?: string;
  status?: string;
  season?: string;
  seasonYear?: number;
  startDate?: {
    year?: number;
    month?: number;
    day?: number;
  };
  episodes?: number;
  coverImage?: {
    medium?: string;
    large?: string;
  };
}

interface AniListRelationEdge {
  relationType: string;
  node: AniListRelationNode;
}

/**
 * Parses clean season and part info from a title without assigning bogus "Prequel" or "Season 0" names.
 */
export function parseCleanSeasonInfo(rawTitle: string, fallbackSeason: number = 1): {
  seasonNumber: number;
  seasonLabel: string;
  partNumber: number | null;
  partLabel: string | null;
} {
  const t = rawTitle.trim();
  let seasonNumber = fallbackSeason;
  let seasonLabel = `Season ${fallbackSeason}`;

  if (/\bfinal\s+season\b/i.test(t)) {
    seasonLabel = "Final Season";
    seasonNumber = 90;
  } else {
    const sMatch =
      t.match(/\bseason\s*(\d+)\b/i) ||
      t.match(/\b(\d+)(?:st|nd|rd|th)\s+season\b/i) ||
      t.match(/\bS(\d+)\b/);
    if (sMatch) {
      seasonNumber = parseInt(sMatch[1], 10);
      seasonLabel = `Season ${seasonNumber}`;
    }
  }

  let partNumber: number | null = null;
  let partLabel: string | null = null;
  const pMatch =
    t.match(/\bpart\s*(\d+)\b/i) ||
    t.match(/\bcour\s*(\d+)\b/i) ||
    t.match(/\bpart\s*([ivx]+)\b/i);

  if (pMatch) {
    const val = pMatch[1];
    if (/^[ivx]+$/i.test(val)) {
      const romanMap: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 };
      partNumber = romanMap[val.toLowerCase()] || 1;
    } else {
      partNumber = parseInt(val, 10);
    }
    partLabel = `Part ${partNumber}`;
  } else if (/\bthe\s+final\s+chapters\b/i.test(t)) {
    partNumber = 3;
    partLabel = "Final Chapters";
  }

  return { seasonNumber, seasonLabel, partNumber, partLabel };
}

/**
 * Fetch franchise graph for an anime, prioritizing AniList authoritative relations.
 */
export async function getFranchiseGraph(
  currentAnimeId: string,
  currentTitle: string,
  anilistId?: number,
  fallbackYear?: number,
  fallbackFormat?: string
): Promise<FranchiseEntry[]> {
  const resolvedAnilistId = anilistId || (currentAnimeId.startsWith("anilist-") ? parseInt(currentAnimeId.replace("anilist-", ""), 10) : undefined);

  if (resolvedAnilistId && !isNaN(resolvedAnilistId)) {
    try {
      const query = `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            id
            title { romaji english native }
            format
            status
            season
            seasonYear
            startDate { year month day }
            episodes
            coverImage { large medium }
            relations {
              edges {
                relationType(version: 2)
                node {
                  id
                  title { romaji english native }
                  format
                  status
                  season
                  seasonYear
                  startDate { year month day }
                  episodes
                  coverImage { large medium }
                }
              }
            }
          }
        }
      `;

      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { id: resolvedAnilistId } }),
        next: { revalidate: 3600 },
      });

      if (res.ok) {
        const json = await res.json();
        const media = json?.data?.Media;
        if (media) {
          const rawEdges: AniListRelationEdge[] = media.relations?.edges || [];

          // Map the root media
          const rootNode: AniListRelationNode = {
            id: media.id,
            title: media.title,
            format: media.format,
            status: media.status,
            season: media.season,
            seasonYear: media.seasonYear,
            startDate: media.startDate,
            episodes: media.episodes,
            coverImage: media.coverImage,
          };

          // Collect anime-only nodes (ignore MANGA, NOVEL, etc.)
          const validRelationTypes = [
            "PREQUEL",
            "SEQUEL",
            "PARENT",
            "SIDE_STORY",
            "SPIN_OFF",
            "ALTERNATIVE",
            "SUMMARY",
          ];

          const relatedNodes: { relationType: string; node: AniListRelationNode }[] = [
            { relationType: "CURRENT", node: rootNode },
          ];

          const seenIds = new Set<number>([rootNode.id]);

          for (const edge of rawEdges) {
            if (!edge?.node?.id || seenIds.has(edge.node.id)) continue;
            if (!validRelationTypes.includes(edge.relationType)) continue;
            const fmt = edge.node.format?.toUpperCase();
            if (fmt === "MANGA" || fmt === "NOVEL" || fmt === "ONE_SHOT") continue;

            seenIds.add(edge.node.id);
            relatedNodes.push(edge);
          }

          // Separate into TV series (Main Story seasons), Movies, and Specials/OVAs
          const tvNodes: typeof relatedNodes = [];
          const movieNodes: typeof relatedNodes = [];
          const specialNodes: typeof relatedNodes = [];

          for (const item of relatedNodes) {
            const fmt = item.node.format?.toUpperCase() || "";
            if (fmt === "MOVIE") {
              movieNodes.push(item);
            } else if (fmt === "OVA" || fmt === "ONA" || fmt === "SPECIAL") {
              specialNodes.push(item);
            } else {
              tvNodes.push(item);
            }
          }

          // Sort TV series chronologically by startDate
          const getTimestamp = (node: AniListRelationNode) => {
            const y = node.startDate?.year || node.seasonYear || 9999;
            const m = (node.startDate?.month || 1) - 1;
            const d = node.startDate?.day || 1;
            return new Date(y, m, d).getTime();
          };

          tvNodes.sort((a, b) => getTimestamp(a.node) - getTimestamp(b.node));
          movieNodes.sort((a, b) => getTimestamp(a.node) - getTimestamp(b.node));
          specialNodes.sort((a, b) => getTimestamp(a.node) - getTimestamp(b.node));

          const result: FranchiseEntry[] = [];

          // Format TV seasons
          tvNodes.forEach((item, index) => {
            const node = item.node;
            const title = node.title?.english || node.title?.romaji || node.title?.native || "Anime";
            const seasonIndex = index + 1;
            const parsed = parseCleanSeasonInfo(title, seasonIndex);

            result.push({
              id: `anilist-${node.id}`,
              title,
              format: node.format || "TV",
              category: "season",
              seasonNumber: parsed.seasonNumber,
              seasonLabel: parsed.seasonLabel,
              partNumber: parsed.partNumber,
              partLabel: parsed.partLabel,
              year: node.startDate?.year || node.seasonYear,
              episodes: node.episodes,
              isCurrent: node.id === resolvedAnilistId,
              coverImage: node.coverImage?.large || node.coverImage?.medium,
            });
          });

          // Format Movies
          movieNodes.forEach((item, index) => {
            const node = item.node;
            const title = node.title?.english || node.title?.romaji || node.title?.native || `Movie ${index + 1}`;
            result.push({
              id: `anilist-${node.id}`,
              title,
              format: "MOVIE",
              category: "movie",
              seasonNumber: 95,
              seasonLabel: movieNodes.length > 1 ? `Movie ${index + 1}` : "Movie",
              year: node.startDate?.year || node.seasonYear,
              episodes: node.episodes || 1,
              isCurrent: node.id === resolvedAnilistId,
              coverImage: node.coverImage?.large || node.coverImage?.medium,
            });
          });

          // Format Specials / OVAs
          specialNodes.forEach((item, index) => {
            const node = item.node;
            const title = node.title?.english || node.title?.romaji || node.title?.native || `Special ${index + 1}`;
            const fmt = node.format || "OVA";
            result.push({
              id: `anilist-${node.id}`,
              title,
              format: fmt,
              category: "special",
              seasonNumber: 96,
              seasonLabel: `${fmt} ${index + 1}`,
              year: node.startDate?.year || node.seasonYear,
              episodes: node.episodes,
              isCurrent: node.id === resolvedAnilistId,
              coverImage: node.coverImage?.large || node.coverImage?.medium,
            });
          });

          if (result.length > 0) {
            return result;
          }
        }
      }
    } catch (e) {
      console.warn("Error fetching AniList relations for franchise:", e);
    }
  }

  // Fallback single-entry franchise if AniList fails or non-AniList ID
  const parsed = parseCleanSeasonInfo(currentTitle, 1);
  return [
    {
      id: currentAnimeId,
      title: currentTitle,
      format: fallbackFormat || "TV",
      category: "season",
      seasonNumber: parsed.seasonNumber,
      seasonLabel: parsed.seasonLabel,
      partNumber: parsed.partNumber,
      partLabel: parsed.partLabel,
      year: fallbackYear,
      isCurrent: true,
    },
  ];
}
