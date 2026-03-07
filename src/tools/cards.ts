/** Shareable card image tools: taste profile and compatibility cards */

import type { FastMCP } from "fastmcp";
import { imageContent, UserError } from "fastmcp";
import { anilistClient } from "../api/client.js";
import { USER_PROFILE_QUERY } from "../api/queries.js";
import type { UserProfileResponse } from "../types.js";
import { TasteCardInputSchema, CompatCardInputSchema } from "../schemas.js";
import { getDefaultUsername, getTitle } from "../utils.js";
import { buildTasteProfile } from "../engine/taste.js";
import {
  computeCompatibility,
  computeGenreDivergences,
} from "../engine/compare.js";
import {
  buildTasteCardSvg,
  buildCompatCardSvg,
  svgToPng,
  fetchAvatarB64,
  type CompatCardData,
} from "../engine/card.js";
import {
  computeListHash,
  getCachedProfile,
  setCachedProfile,
} from "../engine/profile-cache.js";

// === Registration ===

/** Register shareable card tools */
export function registerCardTools(server: FastMCP): void {
  // === Taste Profile Card ===

  server.addTool({
    name: "anilist_taste_card",
    description:
      "Generate a shareable taste profile card image for an AniList user. " +
      "Returns a PNG image showing top genres, themes, score distribution, " +
      "and format breakdown. Use when someone wants a visual summary of their anime taste.",
    parameters: TasteCardInputSchema,
    annotations: {
      title: "Taste Profile Card",
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true,
    },
    execute: async (args) => {
      const username = args.username ?? getDefaultUsername();
      const entries = await anilistClient.fetchList(
        username,
        args.type,
        "COMPLETED",
      );

      if (entries.length === 0) {
        return `${username} has no completed ${args.type.toLowerCase()}.`;
      }

      // Use cached profile if available
      const cacheKey = `${username}::${args.type}`;
      const hash = computeListHash(entries);
      let profile = getCachedProfile(cacheKey, hash);
      if (!profile) {
        profile = buildTasteProfile(entries);
        setCachedProfile(cacheKey, profile, hash);
      }

      if (profile.genres.length === 0) {
        throw new UserError(
          `${username} doesn't have enough scored titles to generate a card. ` +
            `Score more titles on AniList for a taste card.`,
        );
      }

      // Fetch avatar in parallel with nothing else, but keep it non-blocking
      const avatarUrl = await getAvatarUrl(username);
      const avatarB64 = avatarUrl ? await fetchAvatarB64(avatarUrl) : null;

      const svg = buildTasteCardSvg(username, profile, avatarB64);
      const png = await svgToPng(svg);
      return imageContent({ buffer: png });
    },
  });

  // === Compatibility Card ===

  server.addTool({
    name: "anilist_compat_card",
    description:
      "Generate a shareable compatibility card image comparing two AniList users. " +
      "Returns a PNG image showing compatibility %, genre comparison, shared favorites, " +
      "and key differences. Use when someone wants a visual comparison of taste.",
    parameters: CompatCardInputSchema,
    annotations: {
      title: "Compatibility Card",
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true,
    },
    execute: async (args) => {
      // Fetch both lists in parallel
      const [entries1, entries2] = await Promise.all([
        anilistClient.fetchList(args.user1, args.type, "COMPLETED"),
        anilistClient.fetchList(args.user2, args.type, "COMPLETED"),
      ]);

      if (entries1.length === 0) {
        return `${args.user1} has no completed ${args.type.toLowerCase()}.`;
      }
      if (entries2.length === 0) {
        return `${args.user2} has no completed ${args.type.toLowerCase()}.`;
      }

      const profile1 = buildTasteProfile(entries1);
      const profile2 = buildTasteProfile(entries2);

      // Find shared titles
      const scores1 = new Map(entries1.map((e) => [e.media.id, e]));
      const shared: Array<{
        title: string;
        score1: number;
        score2: number;
        id: number;
      }> = [];
      for (const e2 of entries2) {
        const e1 = scores1.get(e2.media.id);
        if (e1) {
          shared.push({
            title: getTitle(e1.media.title),
            score1: e1.score,
            score2: e2.score,
            id: e1.media.id,
          });
        }
      }

      const compatibility =
        shared.length >= 3 ? computeCompatibility(shared) : 0;

      // Shared favorites (both 8+)
      const sharedFavorites = shared
        .filter((s) => s.score1 >= 8 && s.score2 >= 8)
        .sort((a, b) => b.score1 + b.score2 - (a.score1 + a.score2))
        .slice(0, 5);

      const divergences = computeGenreDivergences(
        profile1,
        profile2,
        args.user1,
        args.user2,
      );

      // Fetch both avatars in parallel
      const [avatarUrl1, avatarUrl2] = await Promise.all([
        getAvatarUrl(args.user1),
        getAvatarUrl(args.user2),
      ]);
      const [avatar1, avatar2] = await Promise.all([
        avatarUrl1 ? fetchAvatarB64(avatarUrl1) : null,
        avatarUrl2 ? fetchAvatarB64(avatarUrl2) : null,
      ]);

      const data: CompatCardData = {
        user1: args.user1,
        user2: args.user2,
        compatibility,
        sharedCount: shared.length,
        sharedFavorites,
        divergences,
        profile1,
        profile2,
        avatar1,
        avatar2,
      };

      const svg = buildCompatCardSvg(data);
      const png = await svgToPng(svg);
      return imageContent({ buffer: png });
    },
  });
}

// === Helpers ===

async function getAvatarUrl(username: string): Promise<string | null> {
  try {
    const data = await anilistClient.query<UserProfileResponse>(
      USER_PROFILE_QUERY,
      { name: username },
      { cache: "stats" },
    );
    return data.User.avatar.large;
  } catch {
    return null;
  }
}
