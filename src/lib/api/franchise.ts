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

const ROMAN_NUMERAL_MAP: Record<string, number> = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5,
  vi: 6, vii: 7, viii: 8, ix: 9, x: 10
};

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

  let partNumber: number | null = null;
  let partLabel: string | null = null;
  const pMatch =
    t.match(/\bpart\s*(\d+)\b/i) ||
    t.match(/\bcour\s*(\d+)\b/i) ||
    t.match(/\bpart\s*([ivx]+)\b/i);

  if (pMatch) {
    const val = pMatch[1];
    if (/^[ivx]+$/i.test(val)) {
      partNumber = ROMAN_NUMERAL_MAP[val.toLowerCase()] || 1;
    } else {
      partNumber = parseInt(val, 10);
    }
    partLabel = `Part ${partNumber}`;
  } else if (/\bthe\s+final\s+chapters\b/i.test(t)) {
    partNumber = 3;
    partLabel = "Final Chapters";
  }

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
    } else {
      const romanSeasonMatch =
        t.match(/\b(?:season\s*([ivx]+)|([ivx]+)(?:nd|rd|th)?\s+season)\b/i) ||
        t.match(/\b(II|III|IV|V|VI|VII|VIII|IX|X)\b/);
      if (romanSeasonMatch) {
        const val = (romanSeasonMatch[1] || romanSeasonMatch[2] || "").toLowerCase();
        if (ROMAN_NUMERAL_MAP[val]) {
          seasonNumber = ROMAN_NUMERAL_MAP[val];
          seasonLabel = `Season ${seasonNumber}`;
        }
      } else if (partNumber && partNumber > 1) {
        // Preserve fallbackSeason if provided
        seasonNumber = fallbackSeason;
        seasonLabel = `Season ${seasonNumber}`;
      }
    }
  }

  return { seasonNumber, seasonLabel, partNumber, partLabel };
}

// In-memory cache for discovered franchise graphs
const franchiseGraphCache = new Map<number, { data: FranchiseEntry[]; timestamp: number }>();
const FRANCHISE_CACHE_TTL = 1000 * 60 * 60 * 2; // 2 hours

/**
 * Fetch franchise graph for an anime, prioritizing AniList authoritative relations.
 * Recursively traverses PREQUEL and SEQUEL connections to discover full series history.
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
    // Check in-memory cache
    if (franchiseGraphCache.has(resolvedAnilistId)) {
      const cached = franchiseGraphCache.get(resolvedAnilistId)!;
      if (Date.now() - cached.timestamp < FRANCHISE_CACHE_TTL) {
        return cached.data.map(item => ({
          ...item,
          isCurrent: item.id === `anilist-${resolvedAnilistId}`
        }));
      }
    }

    try {
      const query = `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            id
            title { romaji english native }
            format
            type
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
                  type
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

      const queue: number[] = [resolvedAnilistId];
      const visited = new Set<number>([resolvedAnilistId]);
      const allNodesMap = new Map<number, { node: AniListRelationNode; relationType: string }>();
      const MAX_DISCOVERED = 20;

      while (queue.length > 0 && visited.size <= MAX_DISCOVERED) {
        const currentId = queue.shift()!;
        const res = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables: { id: currentId } }),
          next: { revalidate: 3600 },
        });

        if (!res.ok) continue;
        const json = await res.json();
        const media = json?.data?.Media;
        if (!media) continue;

        if (!allNodesMap.has(media.id)) {
          allNodesMap.set(media.id, {
            node: media,
            relationType: media.id === resolvedAnilistId ? "CURRENT" : "MAINLINE"
          });
        }

        for (const edge of media.relations?.edges || []) {
          const node = edge.node;
          if (!node?.id || node.type !== "ANIME") continue;
          const fmt = node.format?.toUpperCase();
          if (fmt === "MANGA" || fmt === "NOVEL" || fmt === "ONE_SHOT") continue;

          // Exclude unreleased phantom entries with no episodes and no start date
          if (node.status === "NOT_YET_RELEASED" && !node.episodes && !node.startDate?.year) {
            continue;
          }

          const rel = edge.relationType;
          if (!allNodesMap.has(node.id)) {
            allNodesMap.set(node.id, { node, relationType: rel });
          }

          // Traverse prequels and sequels of TV series to discover complete chronological timeline
          if ((rel === "PREQUEL" || rel === "SEQUEL") && (fmt === "TV" || fmt === "TV_SHORT" || !fmt)) {
            if (!visited.has(node.id) && visited.size < MAX_DISCOVERED) {
              visited.add(node.id);
              queue.push(node.id);
            }
          }
        }
      }

      if (allNodesMap.size > 0) {
        const tvNodes: { node: AniListRelationNode; relationType: string }[] = [];
        const movieNodes: { node: AniListRelationNode; relationType: string }[] = [];
        const specialNodes: { node: AniListRelationNode; relationType: string }[] = [];

        for (const item of allNodesMap.values()) {
          const fmt = item.node.format?.toUpperCase() || "";
          const rel = item.relationType;
          const titleStr = item.node.title?.english || item.node.title?.romaji || "";
          const eps = item.node.episodes;

          // Skip unreleased phantom entries with 0 episodes
          if (item.node.status === "NOT_YET_RELEASED" && (!eps || eps === 0)) {
            continue;
          }

          // Movies
          if (fmt === "MOVIE") {
            movieNodes.push(item);
            continue;
          }

          // Explicit specials / OVAs / ONAs / Music
          if (fmt === "OVA" || fmt === "ONA" || fmt === "SPECIAL" || fmt === "MUSIC") {
            specialNodes.push(item);
            continue;
          }

          // Single-episode side stories or specials without explicit Season title belong to specials
          const hasExplicitSeasonInTitle = /\bseason\s*\d+\b/i.test(titleStr) || /\b\d+(?:st|nd|rd|th)\s+season\b/i.test(titleStr) || /\b(II|III|IV|V)\b/.test(titleStr);
          if (eps === 1 && !hasExplicitSeasonInTitle) {
            specialNodes.push(item);
            continue;
          }

          // Mainline TV series
          const isMainlineRelation = rel === "CURRENT" || rel === "MAINLINE" || rel === "PREQUEL" || rel === "SEQUEL" || rel === "PARENT";
          if ((fmt === "TV" || fmt === "TV_SHORT") && (isMainlineRelation || hasExplicitSeasonInTitle || (eps && eps > 1))) {
            tvNodes.push(item);
          } else {
            specialNodes.push(item);
          }
        }

        // Sort chronologically by startDate
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

        // Ensure distinct TV series receive distinct season numbers unless they share an explicit multi-part title
        const seasonsMap = new Map<number, FranchiseEntry[]>();
        for (const entry of result) {
          if (entry.category === "season") {
            const list = seasonsMap.get(entry.seasonNumber) || [];
            list.push(entry);
            seasonsMap.set(entry.seasonNumber, list);
          }
        }

        for (const [sNum, group] of seasonsMap.entries()) {
          if (group.length > 1) {
            const hasExplicitParts = group.some(p => Boolean(p.partLabel));
            if (!hasExplicitParts) {
              group.forEach((p, idx) => {
                p.seasonNumber = sNum + idx;
                p.seasonLabel = `Season ${p.seasonNumber}`;
                p.partNumber = null;
                p.partLabel = null;
              });
            } else {
              group.sort((a, b) => (a.year || 0) - (b.year || 0));
              group.forEach((p, idx) => {
                if (!p.partNumber) {
                  p.partNumber = idx + 1;
                  p.partLabel = `Part ${idx + 1}`;
                }
              });
            }
          }
        }

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
            seasonLabel: specialNodes.length > 1 ? `Special ${index + 1}` : "Special",
            year: node.startDate?.year || node.seasonYear,
            episodes: node.episodes,
            isCurrent: node.id === resolvedAnilistId,
            coverImage: node.coverImage?.large || node.coverImage?.medium,
          });
        });

        if (result.length > 0) {
          // Cache under all discovered node IDs for instant reuse
          for (const visitedId of visited) {
            franchiseGraphCache.set(visitedId, { data: result, timestamp: Date.now() });
          }
          return result;
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
