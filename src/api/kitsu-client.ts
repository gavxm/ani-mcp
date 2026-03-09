/** Kitsu API client for read-only list import */

import pThrottle from "p-throttle";
import pRetry, { AbortError } from "p-retry";

const KITSU_BASE =
  process.env.KITSU_API_URL || "https://kitsu.io/api/edge";
const FETCH_TIMEOUT_MS = 15_000;
const PAGE_LIMIT = 20;

// Kitsu has no documented rate limit; be conservative
const throttle = pThrottle({
  limit: process.env.VITEST ? 10_000 : 5,
  interval: 1_000,
});
const throttled = throttle(() => {});

// === Types ===

export interface KitsuLibraryEntry {
  id: string;
  attributes: {
    status: string;
    ratingTwenty: number | null;
    progress: number;
  };
  relationships: {
    anime: {
      data: { type: string; id: string } | null;
    };
  };
}

export interface KitsuAnime {
  id: string;
  attributes: {
    canonicalTitle: string;
    episodeCount: number | null;
    averageRating: string | null;
    subtype: string;
  };
}

export interface KitsuCategory {
  id: string;
  attributes: {
    title: string;
  };
}

interface KitsuListResponse {
  data: KitsuLibraryEntry[];
  included?: Array<KitsuAnime | KitsuCategory>;
  meta: { count: number };
  links?: { next?: string };
}

// === Format Mapping ===

const KITSU_TO_ANILIST_FORMAT: Record<string, string> = {
  TV: "TV",
  movie: "MOVIE",
  OVA: "OVA",
  ONA: "ONA",
  special: "SPECIAL",
  music: "MUSIC",
};

/** Map Kitsu subtype to AniList format */
export function mapKitsuFormat(subtype: string): string {
  return KITSU_TO_ANILIST_FORMAT[subtype] ?? "TV";
}

// === Client ===

/** Resolve a Kitsu username to a user ID */
async function resolveUserId(username: string): Promise<string> {
  return pRetry(
    async () => {
      await throttled();
      const url = `${KITSU_BASE}/users?filter[name]=${encodeURIComponent(username)}&fields[users]=id,name&page[limit]=1`;
      const response = await fetch(url, {
        headers: { Accept: "application/vnd.api+json" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`Kitsu API error (HTTP ${response.status})`);
      }

      const json = (await response.json()) as {
        data: Array<{ id: string; attributes: { name: string } }>;
      };

      if (!json.data.length) {
        throw new AbortError(`Kitsu user "${username}" not found.`);
      }

      return json.data[0].id;
    },
    { retries: 3 },
  );
}

/** Fetch a Kitsu user's completed anime library */
export async function fetchKitsuList(
  username: string,
  maxPages = 10,
): Promise<{ entries: KitsuLibraryEntry[]; anime: Map<string, KitsuAnime> }> {
  const userId = await resolveUserId(username);

  const entries: KitsuLibraryEntry[] = [];
  const animeMap = new Map<string, KitsuAnime>();

  let url: string | null =
    `${KITSU_BASE}/library-entries?filter[userId]=${userId}` +
    `&filter[status]=completed&filter[kind]=anime` +
    `&page[limit]=${PAGE_LIMIT}` +
    `&include=anime` +
    `&fields[libraryEntries]=status,ratingTwenty,progress,anime` +
    `&fields[anime]=canonicalTitle,episodeCount,averageRating,subtype`;

  for (let page = 0; page < maxPages && url; page++) {
    const data = await fetchPage(url);
    entries.push(...data.data);

    // Index included anime
    if (data.included) {
      for (const inc of data.included) {
        if (inc.id && "canonicalTitle" in (inc.attributes ?? {})) {
          animeMap.set(inc.id, inc as KitsuAnime);
        }
      }
    }

    url = data.links?.next ?? null;
  }

  return { entries, anime: animeMap };
}

async function fetchPage(url: string): Promise<KitsuListResponse> {
  return pRetry(
    async () => {
      await throttled();
      const response = await fetch(url, {
        headers: { Accept: "application/vnd.api+json" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new AbortError("Kitsu user not found.");
        }
        throw new Error(`Kitsu API error (HTTP ${response.status})`);
      }

      return (await response.json()) as KitsuListResponse;
    },
    { retries: 3 },
  );
}
