import type { Anime, Episode } from "./types";

/**
 * Accurately determines the latest verified released episode number for an anime.
 */
export function calculateLatestReleasedEpisode(
  anime: Partial<Anime> | null | undefined,
  episodes: Episode[] = []
): number {
  const now = Date.now();
  const status = anime?.status?.toLowerCase() || "";
  const isFinished = status.includes("finish") || status.includes("complete");
  const declaredTotal = typeof anime?.episodes === "number" && anime.episodes > 0 ? anime.episodes : null;

  // 1. If completed and we know the total episodes, all declared episodes have released
  if (isFinished && declaredTotal) {
    return declaredTotal;
  }

  // 2. Check episodes with verified past airdateTimestamp or airdate
  let maxAiredByTimestamp = 0;
  for (const ep of episodes) {
    if (typeof ep.number !== "number" || ep.number <= 0) continue;

    // Explicit airdateTimestamp
    if (ep.airdateTimestamp && ep.airdateTimestamp <= now) {
      if (ep.number > maxAiredByTimestamp) {
        maxAiredByTimestamp = ep.number;
      }
    } else if (ep.airdate) {
      // Parse airdate string (e.g. YYYY-MM-DD)
      let ts = NaN;
      if (/^\d{4}-\d{2}-\d{2}$/.test(ep.airdate)) {
        ts = Date.parse(`${ep.airdate}T00:00:00+09:00`); // JST broadcast
      } else {
        ts = Date.parse(ep.airdate);
      }
      if (!isNaN(ts) && ts <= now && ep.number > maxAiredByTimestamp) {
        maxAiredByTimestamp = ep.number;
      }
    }
  }

  // 3. Check AniList nextAiringEpisode
  let latestFromNextAiring: number | undefined;
  if (anime?.nextAiringEpisode?.episode) {
    const nextEp = anime.nextAiringEpisode.episode;
    const airingAt = anime.nextAiringEpisode.airingAt; // Unix seconds
    if (airingAt && airingAt * 1000 <= now) {
      // It has already aired!
      latestFromNextAiring = nextEp;
    } else {
      // Next episode airs in the future, so (nextEp - 1) is the latest released episode
      latestFromNextAiring = Math.max(0, nextEp - 1);
    }
  }

  // If completed anime, return max between episodes length, declaredTotal, or maxAired
  if (isFinished) {
    const maxNumberInList = episodes.reduce(
      (max, ep) => (typeof ep.number === "number" && ep.number > max ? ep.number : max),
      0
    );
    return declaredTotal || maxNumberInList || maxAiredByTimestamp || 1;
  }

  // Ongoing anime:
  // Take highest confirmed signal
  const candidate = Math.max(
    maxAiredByTimestamp,
    latestFromNextAiring || 0
  );

  if (candidate > 0) {
    return candidate;
  }

  // If ongoing but no airing timestamp found, but episodes have "released" status:
  const maxReleasedStatus = episodes.reduce((max, ep) => {
    if (ep.status === "released" && typeof ep.number === "number" && ep.number > max) {
      return ep.number;
    }
    return max;
  }, 0);

  return maxReleasedStatus > 0 ? maxReleasedStatus : 1;
}

/**
 * Normalizes episode status strictly:
 * - If anime is completed: all episodes <= total (or in list) are 'released'.
 * - If verified airdateTimestamp <= now: 'released'.
 * - If verified airdateTimestamp > now: 'upcoming'.
 * - If episode number <= latestReleasedEpisode: 'released'.
 * - If episode number > latestReleasedEpisode: 'upcoming'.
 */
export function normalizeEpisodeReleaseStatuses(
  anime: Partial<Anime> | null | undefined,
  episodes: Episode[] = []
): Episode[] {
  const now = Date.now();
  const status = anime?.status?.toLowerCase() || "";
  const isFinished = status.includes("finish") || status.includes("complete");
  const latestReleased = calculateLatestReleasedEpisode(anime, episodes);

  return episodes.map((ep) => {
    if (typeof ep.number !== "number" || ep.number <= 0) {
      return { ...ep, status: ep.status || "unknown" };
    }

    // 1. If finished, all episodes are released
    if (isFinished) {
      return { ...ep, status: "released" as const };
    }

    // 2. If episode has exact airdate timestamp
    if (ep.airdateTimestamp) {
      if (ep.airdateTimestamp <= now) {
        return { ...ep, status: "released" as const };
      } else {
        return { ...ep, status: "upcoming" as const };
      }
    }

    // 3. Fallback to latestReleased calculation
    if (ep.number <= latestReleased) {
      return { ...ep, status: "released" as const };
    } else {
      return { ...ep, status: "upcoming" as const };
    }
  });
}
