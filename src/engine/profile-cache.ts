/** Cached taste profiles with hash-based invalidation. */

import { LRUCache } from "lru-cache";
import type { TasteProfile } from "./taste.js";
import type { AniListMediaListEntry } from "../types.js";

interface CachedProfile {
  profile: TasteProfile;
  listHash: string;
}

// 30-minute TTL, max 20 profiles
const cache = new LRUCache<string, CachedProfile>({
  max: 20,
  ttl: 30 * 60 * 1000,
});

/** Stable hash of entry IDs and scores to detect list changes */
export function computeListHash(entries: AniListMediaListEntry[]): string {
  const pairs = entries.map((e) => `${e.id}:${e.score}`).sort();
  return pairs.join(",");
}

/** Get a cached profile if the list hash matches */
export function getCachedProfile(
  key: string,
  listHash: string,
): TasteProfile | undefined {
  const cached = cache.get(key);
  if (cached && cached.listHash === listHash) return cached.profile;
  return undefined;
}

/** Store a profile in the cache */
export function setCachedProfile(
  key: string,
  profile: TasteProfile,
  listHash: string,
): void {
  cache.set(key, { profile, listHash });
}

/** Invalidate all profiles for a username */
export function invalidateUserProfiles(username: string): void {
  const lower = username.toLowerCase();
  for (const key of cache.keys()) {
    if (key.toLowerCase().startsWith(`${lower}::`)) {
      cache.delete(key);
    }
  }
}

/** Clear all cached profiles */
export function clearProfileCache(): void {
  cache.clear();
}
