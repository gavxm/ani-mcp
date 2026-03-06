/** Unit tests for undo stack */

import { describe, it, expect, beforeEach } from "vitest";
import {
  pushUndo,
  popUndo,
  peekUndo,
  undoStackSize,
  clearUndoStack,
} from "../../src/engine/undo.js";
import type { UndoRecord, EntrySnapshot } from "../../src/engine/undo.js";

const snapshot: EntrySnapshot = {
  id: 1,
  mediaId: 100,
  status: "CURRENT",
  score: 7,
  progress: 5,
  notes: null,
  private: false,
};

function makeRecord(desc = "test"): UndoRecord {
  return {
    operation: { type: "update", before: { ...snapshot } },
    toolName: "anilist_update_progress",
    timestamp: Date.now(),
    description: desc,
  };
}

beforeEach(() => clearUndoStack());

describe("undo stack", () => {
  it("push and pop", () => {
    pushUndo(makeRecord("first"));
    pushUndo(makeRecord("second"));
    expect(undoStackSize()).toBe(2);

    const popped = popUndo();
    expect(popped?.description).toBe("second");
    expect(undoStackSize()).toBe(1);
  });

  it("pop returns undefined on empty stack", () => {
    expect(popUndo()).toBeUndefined();
  });

  it("peek without removing", () => {
    pushUndo(makeRecord("peeked"));
    expect(peekUndo()?.description).toBe("peeked");
    expect(undoStackSize()).toBe(1);
  });

  it("peek returns undefined on empty stack", () => {
    expect(peekUndo()).toBeUndefined();
  });

  it("trims to max 20", () => {
    for (let i = 0; i < 25; i++) {
      pushUndo(makeRecord(`item-${i}`));
    }
    expect(undoStackSize()).toBe(20);
    // Oldest items trimmed, newest remain
    expect(popUndo()?.description).toBe("item-24");
  });

  it("clear empties the stack", () => {
    pushUndo(makeRecord());
    pushUndo(makeRecord());
    clearUndoStack();
    expect(undoStackSize()).toBe(0);
    expect(popUndo()).toBeUndefined();
  });

  it("stores batch operation", () => {
    const batch: UndoRecord = {
      operation: {
        type: "batch",
        entries: [{ before: { ...snapshot } }, { before: { ...snapshot, mediaId: 200 } }],
      },
      toolName: "anilist_batch_update",
      timestamp: Date.now(),
      description: "batch test",
    };
    pushUndo(batch);
    const popped = popUndo();
    expect(popped?.operation.type).toBe("batch");
    if (popped?.operation.type === "batch") {
      expect(popped.operation.entries).toHaveLength(2);
    }
  });

  it("stores create operation", () => {
    const record: UndoRecord = {
      operation: { type: "create", entryId: 99, mediaId: 100 },
      toolName: "anilist_add_to_list",
      timestamp: Date.now(),
      description: "create test",
    };
    pushUndo(record);
    const popped = popUndo();
    expect(popped?.operation.type).toBe("create");
  });

  it("stores delete operation", () => {
    const record: UndoRecord = {
      operation: { type: "delete", before: { ...snapshot } },
      toolName: "anilist_delete_from_list",
      timestamp: Date.now(),
      description: "delete test",
    };
    pushUndo(record);
    const popped = popUndo();
    expect(popped?.operation.type).toBe("delete");
  });
});
