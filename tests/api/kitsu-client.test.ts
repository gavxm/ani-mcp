/** Kitsu client unit tests */

import { describe, it, expect } from "vitest";
import {
  fetchKitsuList,
  mapKitsuFormat,
} from "../../src/api/kitsu-client.js";
import { mswServer } from "../helpers/msw.js";
import { kitsuUserHandler, kitsuListHandler } from "../helpers/handlers.js";

// === mapKitsuFormat ===

describe("mapKitsuFormat", () => {
  it("maps known Kitsu subtypes to AniList formats", () => {
    expect(mapKitsuFormat("TV")).toBe("TV");
    expect(mapKitsuFormat("movie")).toBe("MOVIE");
    expect(mapKitsuFormat("OVA")).toBe("OVA");
    expect(mapKitsuFormat("ONA")).toBe("ONA");
    expect(mapKitsuFormat("special")).toBe("SPECIAL");
    expect(mapKitsuFormat("music")).toBe("MUSIC");
  });

  it("defaults to TV for unknown subtypes", () => {
    expect(mapKitsuFormat("unknown")).toBe("TV");
    expect(mapKitsuFormat("")).toBe("TV");
  });
});

// === fetchKitsuList ===

describe("fetchKitsuList", () => {
  it("returns entries and anime map from default fixture", async () => {
    const { entries, anime } = await fetchKitsuList("testuser");
    expect(entries.length).toBe(6);
    expect(anime.size).toBe(6);

    const first = anime.get("300");
    expect(first).toBeDefined();
    expect(first?.attributes.canonicalTitle).toBe("Kitsu Anime 1");
  });

  it("throws for non-existent user", async () => {
    mswServer.use(kitsuUserHandler(null));
    await expect(fetchKitsuList("nobody")).rejects.toThrow("not found");
  });

  it("handles empty library", async () => {
    mswServer.use(kitsuListHandler([]));
    const { entries, anime } = await fetchKitsuList("testuser");
    expect(entries).toHaveLength(0);
    expect(anime.size).toBe(0);
  });

  it("indexes included anime by id", async () => {
    const entries = [
      {
        id: "1",
        type: "libraryEntries",
        attributes: { status: "completed", ratingTwenty: 16, progress: 24 },
        relationships: { anime: { data: { type: "anime", id: "99" } } },
      },
    ];
    const included = [
      {
        id: "99",
        type: "anime",
        attributes: {
          canonicalTitle: "Test Show",
          episodeCount: 24,
          averageRating: "82",
          subtype: "TV",
        },
      },
    ];
    mswServer.use(kitsuListHandler(entries, included));
    const result = await fetchKitsuList("testuser");
    expect(result.entries).toHaveLength(1);
    expect(result.anime.get("99")?.attributes.canonicalTitle).toBe("Test Show");
  });
});
