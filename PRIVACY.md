# Privacy Policy

## Data Collection

ani-mcp does not collect, store, or transmit any personal data beyond what is needed to fulfill your requests in real time.

**User-provided configuration (optional):**

- `ANILIST_USERNAME` - Your AniList username, used to look up your public anime/manga lists
- `ANILIST_TOKEN` - Your AniList OAuth token, used only for write operations (updating progress, rating, managing your list)

These values are provided by you and are never sent anywhere other than the AniList API.

## External Services

All requests are made to the [AniList GraphQL API](https://anilist.gitbook.io/anilist-apiv2-docs) at `graphql.anilist.co`. No other external services are contacted.

## Data Storage

- **No server-side storage.** ani-mcp runs entirely on your machine.
- **In-memory cache only.** API responses are cached in a short-lived LRU cache to reduce redundant requests. The cache is cleared when the process exits.
- **No analytics or telemetry.** No usage data, crash reports, or metrics are collected.

## Data Retention

ani-mcp does not persist any data to disk. All cached API responses are held in memory only and are discarded when the process exits. No user data, credentials, or list information is retained between sessions.

## Third-Party Sharing

ani-mcp does not share any data with third parties. Your AniList credentials and list data stay between your machine and AniList's servers.

## Contact

For privacy questions or concerns, open an issue at [github.com/gavxm/ani-mcp/issues](https://github.com/gavxm/ani-mcp/issues) or email [gavxm@pm.me](mailto:gavxm@pm.me).

## Changes

This policy may be updated as the project evolves. Changes will be reflected in this file and in the project's repository.
