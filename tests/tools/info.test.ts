/** Integration tests for info tools (staff, schedule, characters) */

import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { createTestClient } from "../helpers/server.js";
import { mswServer } from "../helpers/msw.js";
import {
  staffHandler,
  scheduleHandler,
  characterHandler,
} from "../helpers/handlers.js";

let callTool: Awaited<ReturnType<typeof createTestClient>>["callTool"];
let cleanup: Awaited<ReturnType<typeof createTestClient>>["cleanup"];

beforeAll(async () => {
  const client = await createTestClient();
  callTool = client.callTool;
  cleanup = client.cleanup;
});
afterAll(async () => cleanup());

describe("anilist_staff", () => {
  it("returns staff and voice actors", async () => {
    const result = await callTool("anilist_staff", { title: "Test Anime" });

    expect(result).toContain("Staff:");
    expect(result).toContain("Production Staff");
    expect(result).toContain("Director");
    expect(result).toContain("Taro Yamada");
    expect(result).toContain("Characters & Voice Actors");
    expect(result).toContain("Hero");
    expect(result).toContain("Hanako Suzuki");
  });

  it("renders by ID", async () => {
    const result = await callTool("anilist_staff", { id: 1 });

    expect(result).toContain("Staff:");
    expect(result).toContain("Test Anime");
  });

  it("handles title with no staff gracefully", async () => {
    mswServer.use(
      staffHandler({
        id: 1,
        title: { romaji: "No Staff Show", english: "No Staff Show", native: null },
        format: "TV",
        siteUrl: "https://anilist.co/anime/1",
        staff: { edges: [] },
        characters: { edges: [] },
      }),
    );

    const result = await callTool("anilist_staff", { title: "No Staff Show" });

    expect(result).toContain("No Staff Show");
    expect(result).not.toContain("Production Staff");
    expect(result).not.toContain("Characters & Voice Actors");
  });
});

describe("anilist_schedule", () => {
  it("returns airing schedule with next episode", async () => {
    const result = await callTool("anilist_schedule", { title: "Test Anime" });

    expect(result).toContain("Schedule:");
    expect(result).toContain("RELEASING");
    expect(result).toContain("Next Episode: 5");
    expect(result).toContain("Episodes: 24");
    expect(result).toContain("Upcoming:");
  });

  it("shows time until airing", async () => {
    const result = await callTool("anilist_schedule", { id: 1 });

    // 86400 seconds = "1d 0h"
    expect(result).toContain("1d 0h");
  });

  it("handles finished anime with no upcoming episodes", async () => {
    mswServer.use(
      scheduleHandler({
        id: 1,
        title: { romaji: "Done Anime", english: "Done Anime", native: null },
        status: "FINISHED",
        episodes: 12,
        nextAiringEpisode: null,
        airingSchedule: { nodes: [] },
        siteUrl: "https://anilist.co/anime/1",
      }),
    );

    const result = await callTool("anilist_schedule", { id: 1 });

    expect(result).toContain("Done Anime");
    expect(result).toContain("FINISHED");
    expect(result).toContain("No upcoming episodes");
  });
});

describe("anilist_characters", () => {
  it("returns character search results", async () => {
    const result = await callTool("anilist_characters", {
      query: "Naruto",
      limit: 5,
    });

    expect(result).toContain("Naruto Uzumaki");
    expect(result).toContain("うずまきナルト");
    expect(result).toContain("50,000 favorites");
    expect(result).toContain("MAIN");
    expect(result).toContain("VA: Junko Takeuchi");
  });

  it("shows no-results message", async () => {
    mswServer.use(characterHandler([]));

    const result = await callTool("anilist_characters", {
      query: "nonexistent",
      limit: 5,
    });

    expect(result).toContain('No characters found matching "nonexistent"');
  });
});
