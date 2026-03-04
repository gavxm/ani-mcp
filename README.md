<p align="center">
  <img src="assets/icon.svg" width="128" height="128" alt="ani-mcp">
</p>

# ani-mcp

[![npm version](https://img.shields.io/npm/v/ani-mcp)](https://www.npmjs.com/package/ani-mcp)
[![npm downloads](https://img.shields.io/npm/dm/ani-mcp)](https://www.npmjs.com/package/ani-mcp)
[![CI](https://github.com/gavxm/ani-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/gavxm/ani-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/node/v/ani-mcp)](https://nodejs.org)

A smart [MCP](https://modelcontextprotocol.io) server for [AniList](https://anilist.co) that understands your anime and manga taste - not just raw API calls.

## What makes this different

Most AniList integrations mirror the API 1:1. ani-mcp adds an intelligence layer on top:

- **Taste profiling** - builds a model of your preferences from your completed list
- **Personalized picks** - "what should I watch next?" based on your taste, mood, and seasonal lineup
- **Compatibility** - compare taste between two users
- **Sequel alerts** - find sequels airing this season for shows you've finished
- **Watch order** - franchise chain traversal for long-running series
- **Session planning** - "I have 90 minutes, what should I watch?" from your current list
- **Year in review** - your watching/reading stats wrapped up

Plus the essentials: search, details, trending, seasonal browsing, list management, social features, and community recommendations. All search and browse tools support pagination for browsing beyond the first page of results.

## Install

Add to your MCP client config (e.g. `mcp.json`, `claude_desktop_config.json`, Cursor settings, etc.):

```json
{
  "mcpServers": {
    "anilist": {
      "command": "npx",
      "args": ["-y", "ani-mcp"],
      "env": {
        "ANILIST_USERNAME": "your_username"
      }
    }
  }
}
```

Works with any MCP-compatible client.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `ANILIST_USERNAME` | No | Default username for list and stats tools. Can also pass per-call. |
| `ANILIST_TOKEN` | No | AniList OAuth token. Required for write operations and private lists. |
| `ANILIST_TITLE_LANGUAGE` | No | Title preference: `english` (default), `romaji`, or `native`. |
| `ANILIST_SCORE_FORMAT` | No | Override score display: `POINT_100`, `POINT_10_DECIMAL`, `POINT_10`, `POINT_5`, `POINT_3`. |
| `ANILIST_NSFW` | No | Set to `true` to include adult content in results. Default: `false`. |
| `ANILIST_MOOD_CONFIG` | No | JSON object to add or override mood keywords. See [Mood config](#mood-config). |
| `DEBUG` | No | Set to `true` for debug logging to stderr. |
| `MCP_TRANSPORT` | No | Set to `http` for HTTP Stream transport. Default: stdio. |
| `MCP_PORT` | No | Port for HTTP transport. Default: `3000`. |
| `MCP_HOST` | No | Host for HTTP transport. Default: `localhost`. |

## Tools

### Search & Discovery

| Tool | Description |
| --- | --- |
| `anilist_search` | Search anime/manga by title with genre, year, and format filters |
| `anilist_details` | Full details, relations, and recommendations for a title |
| `anilist_seasonal` | Browse a season's anime lineup |
| `anilist_trending` | What's trending on AniList right now |
| `anilist_genres` | Browse top titles in a genre with optional filters |
| `anilist_genre_list` | List all valid genres and content tags |
| `anilist_recommendations` | Community recommendations for a specific title |

### Lists & Stats

| Tool | Description |
| --- | --- |
| `anilist_list` | A user's anime/manga list, filtered by status |
| `anilist_stats` | Watching/reading statistics, top genres, score distribution |

### Intelligence

| Tool | Description |
| --- | --- |
| `anilist_taste` | Generate a taste profile from your completed list |
| `anilist_pick` | Personalized "what to watch next" from your backlog, seasonal lineup, or discovery pool |
| `anilist_compare` | Compare taste compatibility between two users |
| `anilist_wrapped` | Year-in-review summary |
| `anilist_explain` | "Why would I like this?" - score a title against your taste profile |
| `anilist_similar` | Find titles similar to a given anime or manga |
| `anilist_sequels` | Sequels airing this season for titles you've completed |
| `anilist_watch_order` | Viewing order for a franchise |
| `anilist_session` | Plan a viewing session within a time budget |

### Info

| Tool | Description |
| --- | --- |
| `anilist_staff` | Staff credits and voice actors for a title |
| `anilist_staff_search` | Search for a person by name and see all their works |
| `anilist_studio_search` | Search for a studio and see their productions |
| `anilist_schedule` | Airing schedule and next episode countdown |
| `anilist_characters` | Search characters by name with appearances and VAs |
| `anilist_whoami` | Check authentication status and score format |

### Social

| Tool | Description |
| --- | --- |
| `anilist_profile` | View a user's profile, bio, favourites, and stats |
| `anilist_feed` | Recent activity from a user's feed |
| `anilist_reviews` | Community reviews for a title |
| `anilist_favourite` | Toggle favourite on anime, manga, character, staff, or studio |
| `anilist_activity` | Post a text activity to your feed |

### Write (requires `ANILIST_TOKEN`)

| Tool | Description |
| --- | --- |
| `anilist_update_progress` | Update episode or chapter progress |
| `anilist_add_to_list` | Add a title to your list with a status |
| `anilist_rate` | Score a title (0-10) |
| `anilist_delete_from_list` | Remove an entry from your list |

## Examples

Here are some things you can ask your AI assistant once ani-mcp is connected:

**"What should I watch next?"**
Uses `anilist_pick` to analyze your completed list, build a taste profile, and recommend titles from your Planning list ranked by how well they match your preferences.

**"I want something dark and psychological"**
Uses `anilist_pick` with mood filtering to boost titles matching that vibe and penalize mismatches.

**"What's good this season?"**
Uses `anilist_pick` with `source: SEASONAL` to rank currently airing anime against your taste profile.

**"I have 90 minutes, what should I watch tonight?"**
Uses `anilist_session` to pick from your currently watching list and fill a time budget with the best-matching episodes.

**"Any sequels airing for stuff I've finished?"**
Uses `anilist_sequels` to cross-reference your completed list with this season's lineup.

**"What order do I watch Fate in?"**
Uses `anilist_watch_order` to traverse the franchise relation graph and produce a numbered viewing order.

**"Compare my taste with username123"**
Uses `anilist_compare` to find shared titles, compute a compatibility score, and highlight biggest disagreements.

**"Why would I like Vinland Saga?"**
Uses `anilist_explain` to score a title against your taste profile, breaking down genre affinity and theme alignment.

**"Show me my anime year in review"**
Uses `anilist_wrapped` to summarize everything you watched in a given year.

## Mood config

`anilist_pick` and `anilist_session` accept a freeform `mood` string. Built-in keywords include: dark, chill, hype, action, romantic, funny, brainy, sad, scary, epic, wholesome, intense, mystery, fantasy, scifi, trippy, nostalgic, artistic, competitive, cozy.

To add or override keywords, set `ANILIST_MOOD_CONFIG` as a JSON object:

```json
{
  "ANILIST_MOOD_CONFIG": "{\"cozy\":{\"boost\":[\"Slice of Life\",\"Iyashikei\"],\"penalize\":[\"Horror\"]},\"mykeyword\":{\"boost\":[\"Romance\"],\"penalize\":[]}}"
}
```

Each key is a mood keyword mapping to `{ boost: string[], penalize: string[] }` arrays of AniList genres and tags.

## Privacy

See [PRIVACY.md](PRIVACY.md) for details. In short: ani-mcp runs locally, sends requests only to the AniList API, stores nothing, and collects no analytics.

## Docker

```sh
docker build -t ani-mcp .
docker run -e ANILIST_USERNAME=your_username ani-mcp
```

Runs on port 3000 with HTTP Stream transport by default.

## Build from Source

```sh
git clone https://github.com/gavxm/ani-mcp.git
cd ani-mcp
npm install
npm run build
npm test
```

## Support

Bug reports and feature requests: [GitHub Issues](https://github.com/gavxm/ani-mcp/issues)

## License

MIT
