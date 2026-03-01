/** Zod input schemas for MCP tool validation. */

import { z } from "zod";

/** Input for searching anime or manga by title and filters */
export const SearchInputSchema = z.object({
  query: z
    .string()
    .min(1, "Search query cannot be empty")
    .describe('Search term, e.g. "steins gate", "one piece", "chainsaw man"'),
  type: z
    .enum(["ANIME", "MANGA"])
    .default("ANIME")
    .describe("Search for anime or manga"),
  genre: z
    .string()
    .optional()
    .describe('Filter by genre, e.g. "Action", "Romance", "Thriller"'),
  year: z
    .number()
    .int()
    .min(1940)
    .max(2030)
    .optional()
    .describe("Filter by release year"),
  format: z
    .enum([
      "TV",
      "MOVIE",
      "OVA",
      "ONA",
      "SPECIAL",
      "MANGA",
      "NOVEL",
      "ONE_SHOT",
    ])
    .optional()
    .describe("Filter by format (TV, MOVIE, etc.)"),
  // Capped at 25. Sending 100 results to an LLM wastes context window.
  limit: z
    .number()
    .int()
    .min(1)
    .max(25)
    .default(10)
    .describe("Number of results to return (default 10, max 25)"),
});

export type SearchInput = z.infer<typeof SearchInputSchema>;

/** Input for looking up a single anime or manga by ID or title */
export const DetailsInputSchema = z
  .object({
    id: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        "AniList media ID (e.g. 1 for Cowboy Bebop). Use this if you know the exact ID.",
      ),
    title: z
      .string()
      .optional()
      .describe(
        'Search by title if no ID is known (e.g. "Attack on Titan"). Finds the best match.',
      ),
  })
  .refine((data) => data.id !== undefined || data.title !== undefined, {
    message: "Provide either an id or a title to look up.",
  });

export type DetailsInput = z.infer<typeof DetailsInputSchema>;

/** Input for fetching a user's anime or manga list */
export const ListInputSchema = z.object({
  username: z
    .string()
    .optional()
    .describe(
      "AniList username. Falls back to configured default if not provided.",
    ),
  type: z
    .enum(["ANIME", "MANGA"])
    .default("ANIME")
    .describe("Get anime or manga list"),
  status: z
    .enum(["CURRENT", "COMPLETED", "PLANNING", "DROPPED", "PAUSED", "ALL"])
    .default("ALL")
    .describe("Filter by list status. CURRENT = watching/reading now."),
  sort: z
    .enum(["SCORE", "TITLE", "UPDATED", "PROGRESS"])
    .default("UPDATED")
    .describe("How to sort results"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum entries to return (default 25, max 100)"),
});

export type ListInput = z.infer<typeof ListInputSchema>;
