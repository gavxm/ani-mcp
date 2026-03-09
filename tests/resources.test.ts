/** Integration tests for MCP resources */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { createTestClient } from "./helpers/server.js";
import { mswServer } from "./helpers/msw.js";
import { listHandler, profileHandler } from "./helpers/handlers.js";
import { makeEntry } from "./fixtures.js";

let readResource: Awaited<ReturnType<typeof createTestClient>>["readResource"];
let cleanup: Awaited<ReturnType<typeof createTestClient>>["cleanup"];

const savedUsername = process.env.ANILIST_USERNAME;

beforeAll(async () => {
  process.env.ANILIST_USERNAME = "testuser";
  const client = await createTestClient();
  readResource = client.readResource;
  cleanup = client.cleanup;
});

afterEach(() => {
  process.env.ANILIST_USERNAME = "testuser";
});

afterAll(async () => {
  process.env.ANILIST_USERNAME = savedUsername;
  await cleanup();
});

// === anilist://profile ===

describe("anilist://profile", () => {
  it("returns formatted profile with stats and favourites", async () => {
    const result = await readResource("anilist://profile");
    expect(result).toContain("# testuser");
    expect(result).toContain("anilist.co/user/testuser");
    expect(result).toContain("I love anime!");
    expect(result).toContain("50 titles");
    expect(result).toContain("600 episodes");
    expect(result).toContain("Fav Anime");
    expect(result).toContain("Member since");
  });

  it("returns profile without bio when absent", async () => {
    mswServer.use(
      profileHandler({
        id: 1,
        name: "nobio",
        about: null,
        avatar: { large: null },
        bannerImage: null,
        siteUrl: "https://anilist.co/user/nobio",
        createdAt: 1500000000,
        updatedAt: 1700000000,
        donatorTier: 0,
        statistics: {
          anime: { count: 5, meanScore: 7.0, episodesWatched: 60, minutesWatched: 1440 },
          manga: { count: 0, meanScore: 0, chaptersRead: 0, volumesRead: 0 },
        },
        favourites: {
          anime: { nodes: [] },
          manga: { nodes: [] },
          characters: { nodes: [] },
          staff: { nodes: [] },
          studios: { nodes: [] },
        },
      }),
    );
    const result = await readResource("anilist://profile");
    expect(result).toContain("# nobio");
    expect(result).toContain("5 titles");
    expect(result).not.toContain("Favourite Anime");
  });
});

// === anilist://taste/{type} ===

describe("anilist://taste/{type}", () => {
  it("returns taste profile with genre weights", async () => {
    const result = await readResource("anilist://taste/ANIME");
    expect(result).toContain("Taste Profile");
    expect(result).toContain("Top genres");
    expect(result).toContain("Genre Weights");
  });

  it("handles user with too few scored entries", async () => {
    mswServer.use(
      listHandler([
        makeEntry({ id: 1, score: 0 }),
        makeEntry({ id: 2, score: 0 }),
      ]),
    );
    const result = await readResource("anilist://taste/ANIME");
    expect(result).toContain("not enough have scores");
  });

  it("accepts MANGA type", async () => {
    const result = await readResource("anilist://taste/MANGA");
    expect(result).toContain("Taste Profile");
  });
});

// === anilist://list/{type} ===

describe("anilist://list/{type}", () => {
  it("returns current anime entries", async () => {
    mswServer.use(
      listHandler(
        [
          makeEntry({ id: 1, genres: ["Action"] }),
          makeEntry({ id: 2, genres: ["Comedy"] }),
        ],
        "CURRENT",
      ),
    );
    const result = await readResource("anilist://list/ANIME");
    expect(result).toContain("current anime");
    expect(result).toContain("2 entries");
    expect(result).toContain("Test Anime");
  });

  it("returns empty message when no current entries", async () => {
    mswServer.use(listHandler([], "CURRENT"));
    const result = await readResource("anilist://list/ANIME");
    expect(result).toContain("no current anime entries");
  });

  it("accepts lowercase type argument", async () => {
    mswServer.use(
      listHandler(
        [makeEntry({ id: 1, genres: ["Drama"] })],
        "CURRENT",
      ),
    );
    const result = await readResource("anilist://list/manga");
    expect(result).toContain("current manga");
  });
});

// === anilist://status ===

describe("anilist://status", () => {
  it("returns server status with version and cache info", async () => {
    const result = await readResource("anilist://status");
    expect(result).toContain("ani-mcp Status");
    expect(result).toContain("Version:");
    expect(result).toContain("Cache:");
  });

  it("shows auth status when token is set", async () => {
    process.env.ANILIST_TOKEN = "test-token";
    const result = await readResource("anilist://status");
    expect(result).toContain("token configured");
    delete process.env.ANILIST_TOKEN;
  });

  it("shows no token when not set", async () => {
    delete process.env.ANILIST_TOKEN;
    const result = await readResource("anilist://status");
    expect(result).toContain("no token");
  });

  it("shows configured username", async () => {
    const result = await readResource("anilist://status");
    expect(result).toContain("testuser");
  });
});
