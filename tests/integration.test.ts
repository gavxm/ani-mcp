/** Integration smoke test against real AniList API.
 *  Skipped unless ANILIST_SMOKE_TEST=1 is set.
 *  Catches schema drift without hitting the API in CI.
 */

import { describe, it, expect } from "vitest";

const SMOKE = process.env.ANILIST_SMOKE_TEST === "1";
const ANILIST_API = "https://graphql.anilist.co";

// Simple search query matching the shape we rely on
const SEARCH_QUERY = `
  query SmokeSearch($search: String) {
    Page(page: 1, perPage: 1) {
      media(search: $search, type: ANIME) {
        id
        title { romaji english }
        format
        status
        episodes
        meanScore
        genres
        siteUrl
      }
    }
  }
`;

describe.skipIf(!SMOKE)("AniList API smoke test", () => {
  it("search returns expected schema", async () => {
    const response = await fetch(ANILIST_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: SEARCH_QUERY,
        variables: { search: "Cowboy Bebop" },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    expect(response.ok).toBe(true);

    const json = (await response.json()) as {
      data?: {
        Page?: {
          media?: Array<{
            id: number;
            title: { romaji: string | null; english: string | null };
            format: string | null;
            status: string | null;
            episodes: number | null;
            meanScore: number | null;
            genres: string[];
            siteUrl: string;
          }>;
        };
      };
      errors?: Array<{ message: string }>;
    };

    expect(json.errors).toBeUndefined();

    const media = json.data?.Page?.media;
    expect(media).toBeDefined();
    expect(media?.length).toBeGreaterThan(0);

    const first = media?.[0];
    expect(first).toBeDefined();

    // Verify fields we depend on exist and have correct types
    expect(typeof first?.id).toBe("number");
    expect(first?.title).toHaveProperty("romaji");
    expect(first?.title).toHaveProperty("english");
    expect(typeof first?.siteUrl).toBe("string");
    expect(Array.isArray(first?.genres)).toBe(true);
  });

  it("user list returns expected schema", async () => {
    const LIST_QUERY = `
      query SmokeList($userName: String, $type: MediaType) {
        MediaListCollection(userName: $userName, type: $type, perChunk: 1, chunk: 1) {
          lists {
            name
            status
            entries {
              id
              score
              progress
              status
              media { id title { romaji } format genres }
            }
          }
        }
      }
    `;

    const response = await fetch(ANILIST_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: LIST_QUERY,
        // "AniList" is a well-known public profile
        variables: { userName: "AniList", type: "ANIME" },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    expect(response.ok).toBe(true);

    const json = (await response.json()) as {
      data?: {
        MediaListCollection?: {
          lists?: Array<{
            name: string;
            status: string;
            entries: Array<{
              id: number;
              score: number;
              progress: number;
              status: string;
              media: { id: number };
            }>;
          }>;
        };
      };
      errors?: Array<{ message: string }>;
    };

    expect(json.errors).toBeUndefined();
    expect(json.data?.MediaListCollection?.lists).toBeDefined();
    expect(Array.isArray(json.data?.MediaListCollection?.lists)).toBe(true);
  });
});
