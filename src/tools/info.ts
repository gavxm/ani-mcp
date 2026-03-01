/** Info tools: staff credits, airing schedule, and character search. */

import type { FastMCP } from "fastmcp";
import { anilistClient } from "../api/client.js";
import {
  STAFF_QUERY,
  AIRING_SCHEDULE_QUERY,
  CHARACTER_SEARCH_QUERY,
} from "../api/queries.js";
import {
  StaffInputSchema,
  ScheduleInputSchema,
  CharacterSearchInputSchema,
} from "../schemas.js";
import type {
  StaffResponse,
  AiringScheduleResponse,
  CharacterSearchResponse,
} from "../types.js";
import { getTitle, throwToolError } from "../utils.js";

// === Helpers ===

/** Format seconds until airing as a readable duration */
function formatTimeUntil(seconds: number): string {
  if (seconds <= 0) return "aired";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

// === Tool Registration ===

/** Register info tools on the MCP server */
export function registerInfoTools(server: FastMCP): void {
  // === Staff Credits ===

  server.addTool({
    name: "anilist_staff",
    description:
      "Get staff and voice actor credits for an anime or manga. " +
      "Use when the user asks who directed, wrote, or voiced characters in a title. " +
      "Shows directors, writers, character designers, and Japanese voice actors.",
    parameters: StaffInputSchema,
    execute: async (args) => {
      try {
        const variables: Record<string, unknown> = {};
        if (args.id) variables.id = args.id;
        if (args.title) variables.search = args.title;

        const data = await anilistClient.query<StaffResponse>(
          STAFF_QUERY,
          variables,
          { cache: "media" },
        );

        const m = data.Media;

        const lines: string[] = [
          `# Staff: ${getTitle(m.title)}`,
          `Format: ${m.format ?? "Unknown"}`,
          "",
        ];

        // Staff roles (director, writer, etc.)
        if (m.staff.edges.length > 0) {
          lines.push("## Production Staff");
          for (const edge of m.staff.edges) {
            const name = edge.node.name.full;
            const native = edge.node.name.native
              ? ` (${edge.node.name.native})`
              : "";
            lines.push(`  ${edge.role}: ${name}${native}`);
          }
          lines.push("");
        }

        // Characters with voice actors
        if (m.characters.edges.length > 0) {
          lines.push("## Characters & Voice Actors");
          for (const edge of m.characters.edges) {
            const charName = edge.node.name.full;
            const role = edge.role;
            const va = edge.voiceActors[0];
            const vaStr = va ? ` - VA: ${va.name.full}` : "";
            lines.push(`  ${charName} (${role})${vaStr}`);
          }
          lines.push("");
        }

        lines.push(`AniList: ${m.siteUrl}`);

        return lines.join("\n");
      } catch (error) {
        return throwToolError(error, "fetching staff");
      }
    },
  });

  // === Airing Schedule ===

  server.addTool({
    name: "anilist_schedule",
    description:
      "Get the airing schedule for an anime. " +
      "Use when the user asks when the next episode airs, " +
      "or wants to see upcoming episode dates for a currently airing show.",
    parameters: ScheduleInputSchema,
    execute: async (args) => {
      try {
        const variables: Record<string, unknown> = { notYetAired: true };
        if (args.id) variables.id = args.id;
        if (args.title) variables.search = args.title;

        const data = await anilistClient.query<AiringScheduleResponse>(
          AIRING_SCHEDULE_QUERY,
          variables,
          { cache: "search" },
        );

        const m = data.Media;

        const lines: string[] = [
          `# Schedule: ${getTitle(m.title)}`,
          `Status: ${m.status?.replace(/_/g, " ") ?? "Unknown"}`,
        ];

        if (m.episodes) lines.push(`Episodes: ${m.episodes}`);

        // Next episode
        if (m.nextAiringEpisode) {
          const next = m.nextAiringEpisode;
          const date = new Date(next.airingAt * 1000);
          lines.push("");
          lines.push(`Next Episode: ${next.episode}`);
          lines.push(
            `Airs: ${date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} ` +
              `at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`,
          );
          lines.push(`In: ${formatTimeUntil(next.timeUntilAiring)}`);
        } else {
          lines.push("", "No upcoming episodes scheduled.");
        }

        // Upcoming episodes
        const upcoming = m.airingSchedule.nodes.filter(
          (n) => n.timeUntilAiring > 0,
        );
        if (upcoming.length > 1) {
          lines.push("", "Upcoming:");
          for (const ep of upcoming.slice(0, 8)) {
            const date = new Date(ep.airingAt * 1000);
            const dateStr = date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            lines.push(
              `  Ep ${ep.episode}: ${dateStr} (${formatTimeUntil(ep.timeUntilAiring)})`,
            );
          }
        }

        lines.push("", `AniList: ${m.siteUrl}`);

        return lines.join("\n");
      } catch (error) {
        return throwToolError(error, "fetching schedule");
      }
    },
  });

  // === Character Search ===

  server.addTool({
    name: "anilist_characters",
    description:
      "Search for anime/manga characters by name. " +
      "Use when the user asks about a specific character, wants to know " +
      "which series a character appears in, or who voices them.",
    parameters: CharacterSearchInputSchema,
    execute: async (args) => {
      try {
        const data = await anilistClient.query<CharacterSearchResponse>(
          CHARACTER_SEARCH_QUERY,
          { search: args.query, page: 1, perPage: args.limit },
          { cache: "search" },
        );

        const results = data.Page.characters;

        if (!results.length) {
          return `No characters found matching "${args.query}".`;
        }

        const lines: string[] = [
          `Found ${data.Page.pageInfo.total} character(s) matching "${args.query}"`,
          "",
        ];

        for (let i = 0; i < results.length; i++) {
          const char = results[i];
          const native = char.name.native ? ` (${char.name.native})` : "";
          const favs =
            char.favourites > 0
              ? ` - ${char.favourites.toLocaleString()} favorites`
              : "";

          lines.push(`${i + 1}. ${char.name.full}${native}${favs}`);

          // Appearances
          for (const edge of char.media.edges.slice(0, 3)) {
            const mediaTitle =
              edge.node.title.english || edge.node.title.romaji || "?";
            const va = edge.voiceActors[0];
            const vaStr = va ? ` (VA: ${va.name.full})` : "";
            lines.push(
              `   ${edge.characterRole}: ${mediaTitle} (${edge.node.format ?? edge.node.type})${vaStr}`,
            );
          }

          lines.push(`   URL: ${char.siteUrl}`);
          lines.push("");
        }

        return lines.join("\n");
      } catch (error) {
        return throwToolError(error, "searching characters");
      }
    },
  });
}
