import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createTestClient } from "../helpers/server.js";
import { mswServer } from "../helpers/msw.js";
import {
  saveEntryHandler,
  deleteEntryHandler,
  favouriteHandler,
  mediaListEntryHandler,
  listHandler,
} from "../helpers/handlers.js";
import { makeEntry } from "../fixtures.js";
import { clearUndoStack } from "../../src/engine/undo.js";

let callTool: Awaited<ReturnType<typeof createTestClient>>["callTool"];
let cleanup: Awaited<ReturnType<typeof createTestClient>>["cleanup"];

// Skip Viewer query in getScoreFormat
const savedScoreFormat = process.env.ANILIST_SCORE_FORMAT;
beforeAll(async () => {
  process.env.ANILIST_TOKEN = "test-token";
  process.env.ANILIST_SCORE_FORMAT = "POINT_10";
  const client = await createTestClient();
  callTool = client.callTool;
  cleanup = client.cleanup;
});

afterAll(async () => {
  if (savedScoreFormat === undefined) delete process.env.ANILIST_SCORE_FORMAT;
  else process.env.ANILIST_SCORE_FORMAT = savedScoreFormat;
  await cleanup();
});

beforeEach(() => clearUndoStack());

// === anilist_update_progress ===

describe("anilist_update_progress", () => {
  it("returns confirmation with status and progress", async () => {
    const result = await callTool("anilist_update_progress", {
      mediaId: 1,
      progress: 5,
    });
    expect(result).toContain("Progress updated");
    expect(result).toContain("Progress: 5");
    expect(result).toContain("Entry ID:");
  });

  it("defaults to CURRENT status", async () => {
    const result = await callTool("anilist_update_progress", {
      mediaId: 1,
      progress: 3,
    });
    expect(result).toContain("Status: CURRENT");
  });

  it("respects explicit status override", async () => {
    mswServer.use(
      saveEntryHandler({
        id: 99,
        mediaId: 1,
        status: "COMPLETED",
        score: 0,
        progress: 24,
      }),
    );
    const result = await callTool("anilist_update_progress", {
      mediaId: 1,
      progress: 24,
      status: "COMPLETED",
    });
    expect(result).toContain("Status: COMPLETED");
  });

  it("errors when ANILIST_TOKEN is missing", async () => {
    const saved = process.env.ANILIST_TOKEN;
    delete process.env.ANILIST_TOKEN;
    try {
      const result = await callTool("anilist_update_progress", {
        mediaId: 1,
        progress: 5,
      });
      expect(result).toContain("ANILIST_TOKEN");
    } finally {
      process.env.ANILIST_TOKEN = saved;
    }
  });
});

// === anilist_add_to_list ===

describe("anilist_add_to_list", () => {
  it("returns confirmation with status", async () => {
    mswServer.use(
      saveEntryHandler({
        id: 50,
        mediaId: 10,
        status: "PLANNING",
        score: 0,
        progress: 0,
      }),
    );
    const result = await callTool("anilist_add_to_list", {
      mediaId: 10,
      status: "PLANNING",
    });
    expect(result).toContain("Added to list");
    expect(result).toContain("Status: PLANNING");
    expect(result).toContain("Entry ID: 50");
  });

  it("includes score when provided", async () => {
    mswServer.use(
      saveEntryHandler({
        id: 50,
        mediaId: 10,
        status: "COMPLETED",
        score: 8,
        progress: 0,
      }),
    );
    const result = await callTool("anilist_add_to_list", {
      mediaId: 10,
      status: "COMPLETED",
      score: 8,
    });
    expect(result).toContain("Score: 8/10");
  });

  it("errors when ANILIST_TOKEN is missing", async () => {
    const saved = process.env.ANILIST_TOKEN;
    delete process.env.ANILIST_TOKEN;
    try {
      const result = await callTool("anilist_add_to_list", {
        mediaId: 1,
        status: "PLANNING",
      });
      expect(result).toContain("ANILIST_TOKEN");
    } finally {
      process.env.ANILIST_TOKEN = saved;
    }
  });
});

// === anilist_rate ===

describe("anilist_rate", () => {
  it("returns score confirmation for non-zero score", async () => {
    mswServer.use(
      saveEntryHandler({
        id: 99,
        mediaId: 1,
        status: "COMPLETED",
        score: 9,
        progress: 24,
      }),
    );
    const result = await callTool("anilist_rate", {
      mediaId: 1,
      score: 9,
    });
    expect(result).toContain("Score set to 9/10");
    expect(result).toContain("Entry ID:");
  });

  it("returns score removed for score of 0", async () => {
    mswServer.use(
      saveEntryHandler({
        id: 99,
        mediaId: 1,
        status: "COMPLETED",
        score: 0,
        progress: 24,
      }),
    );
    const result = await callTool("anilist_rate", {
      mediaId: 1,
      score: 0,
    });
    expect(result).toContain("Score removed");
  });

  it("errors when ANILIST_TOKEN is missing", async () => {
    const saved = process.env.ANILIST_TOKEN;
    delete process.env.ANILIST_TOKEN;
    try {
      const result = await callTool("anilist_rate", {
        mediaId: 1,
        score: 8,
      });
      expect(result).toContain("ANILIST_TOKEN");
    } finally {
      process.env.ANILIST_TOKEN = saved;
    }
  });
});

// === anilist_delete_from_list ===

describe("anilist_delete_from_list", () => {
  it("returns deletion confirmation", async () => {
    const result = await callTool("anilist_delete_from_list", {
      entryId: 42,
    });
    expect(result).toContain("Entry 42 deleted");
  });

  it("returns not found when deleted is false", async () => {
    mswServer.use(deleteEntryHandler(false));
    const result = await callTool("anilist_delete_from_list", {
      entryId: 999,
    });
    expect(result).toContain("not found or already removed");
  });

  it("errors when ANILIST_TOKEN is missing", async () => {
    const saved = process.env.ANILIST_TOKEN;
    delete process.env.ANILIST_TOKEN;
    try {
      const result = await callTool("anilist_delete_from_list", {
        entryId: 1,
      });
      expect(result).toContain("ANILIST_TOKEN");
    } finally {
      process.env.ANILIST_TOKEN = saved;
    }
  });
});

// === anilist_favourite ===

describe("anilist_favourite", () => {
  it("reports added when entity is in response nodes", async () => {
    const result = await callTool("anilist_favourite", {
      type: "ANIME",
      id: 42,
    });
    expect(result).toContain("Added");
    expect(result).toContain("anime");
    expect(result).toContain("42");
  });

  it("reports removed when entity is absent from response nodes", async () => {
    mswServer.use(
      favouriteHandler({
        anime: { nodes: [] },
        manga: { nodes: [] },
        characters: { nodes: [] },
        staff: { nodes: [] },
        studios: { nodes: [] },
      }),
    );
    const result = await callTool("anilist_favourite", {
      type: "ANIME",
      id: 42,
    });
    expect(result).toContain("Removed");
    expect(result).toContain("anime");
  });

  it("handles each entity type", async () => {
    for (const type of ["MANGA", "CHARACTER", "STAFF", "STUDIO"] as const) {
      const result = await callTool("anilist_favourite", { type, id: 1 });
      expect(result).toContain(type.toLowerCase());
    }
  });

  it("errors when ANILIST_TOKEN is missing", async () => {
    const saved = process.env.ANILIST_TOKEN;
    delete process.env.ANILIST_TOKEN;
    try {
      const result = await callTool("anilist_favourite", {
        type: "ANIME",
        id: 1,
      });
      expect(result).toContain("ANILIST_TOKEN");
    } finally {
      process.env.ANILIST_TOKEN = saved;
    }
  });
});

// === anilist_activity ===

describe("anilist_activity", () => {
  it("returns confirmation with activity ID", async () => {
    const result = await callTool("anilist_activity", {
      text: "Hello world!",
    });
    expect(result).toContain("Activity posted");
    expect(result).toContain("Activity ID: 1000");
    expect(result).toContain("testuser");
  });

  it("errors when ANILIST_TOKEN is missing", async () => {
    const saved = process.env.ANILIST_TOKEN;
    delete process.env.ANILIST_TOKEN;
    try {
      const result = await callTool("anilist_activity", {
        text: "Hello!",
      });
      expect(result).toContain("ANILIST_TOKEN");
    } finally {
      process.env.ANILIST_TOKEN = saved;
    }
  });
});

// === Undo hints ===

describe("undo hints", () => {
  it("update_progress includes undo hint", async () => {
    const result = await callTool("anilist_update_progress", {
      mediaId: 1,
      progress: 5,
    });
    expect(result).toContain("undo");
  });

  it("add_to_list includes undo hint for new entry", async () => {
    mswServer.use(mediaListEntryHandler(null));
    mswServer.use(
      saveEntryHandler({
        id: 50,
        mediaId: 10,
        status: "PLANNING",
        score: 0,
        progress: 0,
      }),
    );
    const result = await callTool("anilist_add_to_list", {
      mediaId: 10,
      status: "PLANNING",
    });
    expect(result).toContain("undo");
  });

  it("delete includes undo hint", async () => {
    const result = await callTool("anilist_delete_from_list", {
      entryId: 42,
    });
    expect(result).toContain("undo");
  });
});

// === anilist_undo ===

describe("anilist_undo", () => {
  it("returns nothing to undo on empty stack", async () => {
    const result = await callTool("anilist_undo", {});
    expect(result).toContain("Nothing to undo");
  });

  it("restores previous progress after update", async () => {
    // First, update progress (pushes undo record)
    await callTool("anilist_update_progress", {
      mediaId: 1,
      progress: 10,
    });

    // Now undo
    const result = await callTool("anilist_undo", {});
    expect(result).toContain("Undone");
    expect(result).toContain("restored");
  });

  it("removes entry after undo of add (new entry)", async () => {
    // Simulate adding a new entry (no prior entry)
    mswServer.use(mediaListEntryHandler(null));
    mswServer.use(
      saveEntryHandler({
        id: 77,
        mediaId: 200,
        status: "PLANNING",
        score: 0,
        progress: 0,
      }),
    );
    await callTool("anilist_add_to_list", {
      mediaId: 200,
      status: "PLANNING",
    });

    // Undo should delete the new entry
    const result = await callTool("anilist_undo", {});
    expect(result).toContain("Undone");
    expect(result).toContain("removed");
  });

  it("restores entry after undo of delete", async () => {
    // Delete an entry (pushes delete undo record)
    await callTool("anilist_delete_from_list", { entryId: 42 });

    // Undo should re-create
    const result = await callTool("anilist_undo", {});
    expect(result).toContain("Undone");
    expect(result).toContain("restored");
  });

  it("errors when ANILIST_TOKEN is missing", async () => {
    const saved = process.env.ANILIST_TOKEN;
    delete process.env.ANILIST_TOKEN;
    try {
      const result = await callTool("anilist_undo", {});
      expect(result).toContain("ANILIST_TOKEN");
    } finally {
      process.env.ANILIST_TOKEN = saved;
    }
  });
});

// === anilist_unscored ===

describe("anilist_unscored", () => {
  it("returns unscored completed titles", async () => {
    mswServer.use(
      listHandler([
        makeEntry({ id: 1, score: 0, genres: ["Action"] }),
        makeEntry({ id: 2, score: 8, genres: ["Drama"] }),
        makeEntry({ id: 3, score: 0, genres: ["Comedy"] }),
      ]),
    );
    const result = await callTool("anilist_unscored", {
      username: "testuser",
    });
    expect(result).toContain("Unscored");
    expect(result).toContain("2 completed but unscored");
    expect(result).toContain("Media ID:");
  });

  it("returns all-scored message when none are unscored", async () => {
    mswServer.use(
      listHandler([
        makeEntry({ id: 1, score: 8 }),
        makeEntry({ id: 2, score: 7 }),
      ]),
    );
    const result = await callTool("anilist_unscored", {
      username: "testuser",
    });
    expect(result).toContain("All");
    expect(result).toContain("scored");
  });

  it("respects limit parameter", async () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      makeEntry({ id: i + 1, score: 0 }),
    );
    mswServer.use(listHandler(entries));
    const result = await callTool("anilist_unscored", {
      username: "testuser",
      limit: 3,
    });
    expect(result).toContain("showing 3");
  });
});

// === anilist_batch_update ===

describe("anilist_batch_update", () => {
  it("returns dry-run preview by default", async () => {
    mswServer.use(
      listHandler([
        makeEntry({ id: 1, score: 3, status: "COMPLETED" }),
        makeEntry({ id: 2, score: 4, status: "COMPLETED" }),
        makeEntry({ id: 3, score: 8, status: "COMPLETED" }),
      ]),
    );
    const result = await callTool("anilist_batch_update", {
      username: "testuser",
      filter: { scoreBelow: 5 },
      action: { setStatus: "DROPPED" },
    });
    expect(result).toContain("Preview");
    expect(result).toContain("Matched: 2");
    expect(result).toContain("DROPPED");
  });

  it("executes mutations when dryRun is false", async () => {
    mswServer.use(
      listHandler([
        makeEntry({ id: 1, score: 3, status: "COMPLETED" }),
      ]),
    );
    const result = await callTool("anilist_batch_update", {
      username: "testuser",
      filter: { scoreBelow: 5 },
      action: { setStatus: "DROPPED" },
      dryRun: false,
    });
    expect(result).toContain("Complete");
    expect(result).toContain("Updated 1");
    expect(result).toContain("undo");
  });

  it("returns no matches for empty filter result", async () => {
    mswServer.use(
      listHandler([
        makeEntry({ id: 1, score: 9, status: "COMPLETED" }),
      ]),
    );
    const result = await callTool("anilist_batch_update", {
      username: "testuser",
      filter: { scoreBelow: 3 },
      action: { setStatus: "DROPPED" },
    });
    expect(result).toContain("No entries match");
  });

  it("filters by unscored", async () => {
    mswServer.use(
      listHandler([
        makeEntry({ id: 1, score: 0, status: "COMPLETED" }),
        makeEntry({ id: 2, score: 8, status: "COMPLETED" }),
      ]),
    );
    const result = await callTool("anilist_batch_update", {
      username: "testuser",
      filter: { unscored: true },
      action: { setScore: 5 },
    });
    expect(result).toContain("Matched: 1");
  });

  it("errors when ANILIST_TOKEN is missing", async () => {
    const saved = process.env.ANILIST_TOKEN;
    delete process.env.ANILIST_TOKEN;
    try {
      const result = await callTool("anilist_batch_update", {
        filter: { status: "COMPLETED" },
        action: { setStatus: "DROPPED" },
        dryRun: false,
      });
      expect(result).toContain("ANILIST_TOKEN");
    } finally {
      process.env.ANILIST_TOKEN = saved;
    }
  });
});
