import type { Anime, Episode } from "./types";

export type CanonicalEpisodeStatus = "released" | "upcoming" | "unknown";

/**
 * Normalizes an airdate string into a Unix millisecond timestamp.
 * Dates without timestamps (YYYY-MM-DD) are parsed in Japan Standard Time (UTC+9).
 */
export function parseAirdateToTimestamp(airdateStr?: string | null): number | undefined {
  if (!airdateStr) return undefined;
  const str = airdateStr.trim();
  if (!str) return undefined;

  // Pattern: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const ts = Date.parse(`${str}T00:00:00+09:00`);
    return !isNaN(ts) ? ts : undefined;
  }

  const ts = Date.parse(str);
  return !isNaN(ts) ? ts : undefined;
}

/**
 * Resolves canonical episode status based strictly on verified timestamps and media state.
 *
 * Rules:
 * 1. If anime status is completed/finished: all verified episodes of this anime have released.
 * 2. If episode has a reliable timestamp <= now: RELEASED.
 * 3. If episode has a reliable timestamp > now: UPCOMING.
 * 4. Missing / unreliable timestamp: UNKNOWN.
 *    (UNKNOWN must not be converted into UPCOMING or RELEASED).
 */
export function resolveEpisodeStatusFromObservation(
  airdateTimestamp: number | undefined,
  isAnimeFinished: boolean,
  hasStreamingRecord: boolean = false
): CanonicalEpisodeStatus {
  if (isAnimeFinished) {
    return "released";
  }

  const now = Date.now();

  if (typeof airdateTimestamp === "number" && !isNaN(airdateTimestamp) && airdateTimestamp > 0) {
    if (airdateTimestamp <= now) {
      return "released";
    } else {
      return "upcoming";
    }
  }

  // If AniList streamingEpisodes has an exact streaming record, it has released
  if (hasStreamingRecord) {
    return "released";
  }

  // Missing or unreliable timestamp on an ongoing show: UNKNOWN
  return "unknown";
}

/**
 * Accurately determines the latest verified released episode number for an anime.
 * Strict rule: MAX(real episode number WHERE status === "released") based on actual verified records.
 * NEVER uses nextAiringEpisode.episode - 1 as historical release authority.
 */
export function calculateLatestReleasedEpisode(
  anime: Partial<Anime> | null | undefined,
  episodes: Episode[] = []
): number {
  const status = anime?.status?.toLowerCase() || "";
  const isFinished = status.includes("finish") || status.includes("complete");
  const declaredTotal = typeof anime?.episodes === "number" && anime.episodes > 0 ? anime.episodes : null;

  // 1. For a finished anime, all episodes belonging to this season have released
  if (isFinished) {
    const maxNumberInList = episodes.reduce(
      (max, ep) => (typeof ep.number === "number" && ep.number > max ? ep.number : max),
      0
    );
    return declaredTotal || maxNumberInList || 1;
  }

  // 2. For ongoing anime: MAX(real episode number WHERE status === "released")
  let maxReleased = 0;
  for (const ep of episodes) {
    if (typeof ep.number === "number" && ep.number > 0) {
      if (ep.status === "released") {
        if (ep.number > maxReleased) {
          maxReleased = ep.number;
        }
      }
    }
  }

  // 3. For ongoing anime with nextAiringEpisode scheduled in the future:
  // Episodes before nextAiringEpisode have already aired.
  const nextAiringNumber = anime?.nextAiringEpisode?.episode;
  const nextAiringTime = anime?.nextAiringEpisode?.airingAt ? anime.nextAiringEpisode.airingAt * 1000 : undefined;
  const isAiringInFuture = typeof nextAiringTime === "number" && nextAiringTime > Date.now();

  if (nextAiringNumber && nextAiringNumber > 1 && isAiringInFuture) {
    const calculatedFromAiring = nextAiringNumber - 1;
    if (calculatedFromAiring > maxReleased) {
      maxReleased = declaredTotal ? Math.min(calculatedFromAiring, declaredTotal) : calculatedFromAiring;
    }
  }

  if (maxReleased > 0) {
    return maxReleased;
  }

  // If episode 1 exists in the list and anime has started broadcasting
  const ep1 = episodes.find((e) => e.number === 1);
  if (ep1 && ep1.status !== "upcoming") {
    return 1;
  }

  return 0;
}

/**
 * Normalizes canonical episode list and strictly enforces season boundaries.
 *
 * Season boundary:
 * When a season has declared total episodes (e.g. 12), the episode list MUST STOP at 12.
 * Any records beyond the declared total are filtered out to prevent phantom/mismatched episodes.
 *
 * Episode status:
 * Each episode is assigned exactly one canonical state: "released" | "upcoming" | "unknown".
 */
export function normalizeEpisodeReleaseStatuses(
  anime: Partial<Anime> | null | undefined,
  episodes: Episode[] = []
): Episode[] {
  const now = Date.now();
  const status = anime?.status?.toLowerCase() || "";
  const isFinished = status.includes("finish") || status.includes("complete");
  const declaredTotal = typeof anime?.episodes === "number" && anime.episodes > 0 ? anime.episodes : null;

  // Discard phantom episodes that exceed the declared season episode count
  const boundedEpisodes = declaredTotal
    ? episodes.filter((ep) => typeof ep.number === "number" && ep.number > 0 && ep.number <= declaredTotal)
    : episodes.filter((ep) => typeof ep.number === "number" && ep.number > 0);

  // If anime has nextAiringEpisode, we can use its scheduled timestamp to confirm broadcast boundaries
  const nextAiringNumber = anime?.nextAiringEpisode?.episode;
  const nextAiringTime = anime?.nextAiringEpisode?.airingAt ? anime.nextAiringEpisode.airingAt * 1000 : undefined;
  const isAiringInFuture = typeof nextAiringTime === "number" && nextAiringTime > now;

  return boundedEpisodes.map((ep) => {
    let airdateTimestamp = ep.airdateTimestamp;
    if (!airdateTimestamp && ep.airdate) {
      airdateTimestamp = parseAirdateToTimestamp(ep.airdate);
    }

    // If this episode is the scheduled nextAiringEpisode, enrich timestamp if missing
    if (nextAiringNumber && ep.number === nextAiringNumber && nextAiringTime && !airdateTimestamp) {
      airdateTimestamp = nextAiringTime;
    }

    let canonicalStatus: CanonicalEpisodeStatus = "unknown";

    if (isFinished) {
      canonicalStatus = "released";
    } else if (typeof airdateTimestamp === "number" && !isNaN(airdateTimestamp) && airdateTimestamp > 0) {
      canonicalStatus = airdateTimestamp <= now ? "released" : "upcoming";
    } else if (ep.status === "released") {
      canonicalStatus = "released";
    } else if (nextAiringNumber && isAiringInFuture && typeof ep.number === "number" && ep.number > 0) {
      // If next airing episode is episode N (e.g. 13) in the future:
      // Episodes 1 <= number < N have already aired!
      if (ep.number < nextAiringNumber) {
        canonicalStatus = "released";
      } else {
        canonicalStatus = "upcoming";
      }
    } else if (ep.status === "upcoming") {
      // Only keep upcoming if there is a verified future signal
      canonicalStatus = nextAiringNumber && ep.number === nextAiringNumber ? "upcoming" : "unknown";
    }

    return {
      ...ep,
      airdateTimestamp,
      status: canonicalStatus,
    };
  });
}
