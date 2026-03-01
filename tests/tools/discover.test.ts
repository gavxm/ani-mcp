/** Integration tests for discover tools (trending, genre browse) */

import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { createTestClient } from "../helpers/server.js";
import { mswServer } from "../helpers/msw.js";
import { trendingHandler, genreBrowseHandler } from "../helpers/handlers.js";

let callTool: Awaited<ReturnType<typeof createTestClient>>["callTool"];
let cleanup: Awaited<ReturnType<typeof createTestClient>>["cleanup"];

beforeAll(async () => {
  const client = await createTestClient();
  callTool = client.callTool;
  cleanup = client.cleanup;
});
afterAll(async () => cleanup());

describe("anilist_trending", () => {
  it("returns trending results with ranking", async () => {
    const result = await callTool("anilist_trending", {
      type: "ANIME",
      limit: 10,
    });

    expect(result).toContain("Trending ANIME");
    expect(result).toContain("Test Anime");
    expect(result).toContain("1.");
  });

  it("shows empty message when no results", async () => {
    mswServer.use(trendingHandler([]));

    const result = await callTool("anilist_trending", {
      type: "ANIME",
      limit: 10,
    });

    expect(result).toContain("No trending anime found");
  });

  it("supports manga type", async () => {
    const result = await callTool("anilist_trending", {
      type: "MANGA",
      limit: 5,
    });

    expect(result).toContain("MANGA");
  });
});

describe("anilist_genres", () => {
  it("returns results for a genre", async () => {
    const result = await callTool("anilist_genres", {
      genre: "Action",
      type: "ANIME",
      sort: "SCORE",
      limit: 10,
    });

    expect(result).toContain("Action");
    expect(result).toContain("ANIME");
    expect(result).toContain("Test Anime");
  });

  it("shows filter details in header", async () => {
    const result = await callTool("anilist_genres", {
      genre: "Romance",
      type: "ANIME",
      year: 2024,
      status: "FINISHED",
      sort: "POPULARITY",
      limit: 10,
    });

    expect(result).toContain("Romance");
    expect(result).toContain("2024");
    expect(result).toContain("FINISHED");
  });

  it("shows empty message when no results", async () => {
    mswServer.use(genreBrowseHandler([]));

    const result = await callTool("anilist_genres", {
      genre: "Horror",
      type: "ANIME",
      sort: "SCORE",
      limit: 10,
    });

    expect(result).toContain('No anime found in genre "Horror"');
  });
});
