# ani-mcp

A smart [MCP](https://modelcontextprotocol.io) server for [AniList](https://anilist.co) that gets your anime/manga taste - not just API calls.

## What makes this different

Most AniList integrations mirror the API 1:1. ani-mcp gives your AI assistant actual understanding of your watching habits:

- **anilist_pick** - "What should I watch next?" based on your taste profile and mood
- **anilist_taste** - Natural language summary of your anime/manga preferences
- **anilist_compare** - Compare taste between two users
- **anilist_wrapped** - Your year-in-review stats

Plus the essentials: search, details, seasonal browsing, list management, and community recommendations.

## Install

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

## Tools

| Tool | Description |
| ------ | ------------- |
| `anilist_search` | Search anime/manga by title with filters |
| `anilist_details` | Full details for a specific anime/manga |
| `anilist_seasonal` | Browse a season's anime lineup |
| `anilist_list` | Get a user's anime/manga list |
| `anilist_stats` | User watching/reading statistics |
| `anilist_pick` | Personalized "what to watch next" recommendations |
| `anilist_taste` | Generate your taste profile |
| `anilist_compare` | Compare taste between two users |
| `anilist_wrapped` | Year-in-review summary |
| `anilist_recommendations` | Community recs for a specific title |

## License

MIT
