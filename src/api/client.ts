/**
 * AniList GraphQL API Client
 *
 * Handles rate limiting (token bucket), retry with exponential backoff,
 * and in-memory caching.
 */

import { LRUCache } from "lru-cache";
import pRetry from "p-retry";

const ANILIST_API_URL =
  process.env.ANILIST_API_URL || "https://graphql.anilist.co";

// Budget under the 90 req/min limit to leave headroom
const RATE_LIMIT_PER_MINUTE = 85;
const MAX_RETRIES = 3;

/** Per-category TTLs for the query cache */
export const CACHE_TTLS = {
  media: 60 * 60 * 1000, // 1h
  search: 2 * 60 * 1000, // 2m
  list: 5 * 60 * 1000, // 5m
  seasonal: 30 * 60 * 1000, // 30m
  stats: 10 * 60 * 1000, // 10m
} as const;

export type CacheCategory = keyof typeof CACHE_TTLS;

/**
 * Token Bucket Rate Limiter
 *
 * Avoids the boundary-reset problem of simple per-minute counters.
 * Token bucket spreads capacity evenly by refilling at a constant rate.
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms

  constructor(tokensPerMinute: number) {
    this.maxTokens = tokensPerMinute;
    this.tokens = tokensPerMinute;
    this.lastRefill = Date.now();
    this.refillRate = tokensPerMinute / 60_000; // convert to per-ms
  }

  /** Wait for a token to become available, then consume it */
  async consume(): Promise<void> {
    this.refill();

    // Token available - use it immediately
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // No tokens - wait until one replenishes
    const waitMs = Math.ceil((1 - this.tokens) / this.refillRate);
    await new Promise((resolve) => setTimeout(resolve, waitMs));

    // Recalculate after sleeping since time has passed
    this.refill();
    this.tokens = Math.max(0, this.tokens - 1);
  }

  /** Add tokens based on elapsed time since last refill */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    // Add fractional tokens proportional to elapsed time, capped at max
    this.tokens = Math.min(
      this.maxTokens,
      this.tokens + elapsed * this.refillRate,
    );
    this.lastRefill = now;
  }
}

// === In-Memory Cache ===

/** LRU cache with per-entry TTL, keyed on query + variables */
const queryCache = new LRUCache<string, Record<string, unknown>>({
  max: 500,
  allowStale: false,
});

// === Error Types ===

/** API error with HTTP status and retry eligibility */
export class AniListApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "AniListApiError";
  }
}

// === Client ===

/** Options for a single query call */
export interface QueryOptions {
  /** Cache category to use. Pass null to skip caching. */
  cache?: CacheCategory | null;
}

/** Manages authenticated requests to the AniList GraphQL API */
class AniListClient {
  private rateLimiter = new TokenBucket(RATE_LIMIT_PER_MINUTE);
  private token: string | undefined;

  constructor() {
    // Optional - unauthenticated requests still work for public data
    this.token = process.env.ANILIST_TOKEN || undefined;
  }

  /** Execute a GraphQL query with caching and automatic retry */
  async query<T = unknown>(
    query: string,
    variables: Record<string, unknown> = {},
    options: QueryOptions = {},
  ): Promise<T> {
    const cacheCategory = options.cache ?? null;

    // Cache-through: return cached result or fetch, store, and return
    if (cacheCategory) {
      // Same query with different variables = different cache entry
      const cacheKey = `${query}::${JSON.stringify(variables)}`;
      const cached = queryCache.get(cacheKey);
      if (cached !== undefined) return cached as T;

      const data = await this.executeWithRetry<T>(query, variables);
      queryCache.set(cacheKey, data as Record<string, unknown>, {
        ttl: CACHE_TTLS[cacheCategory],
      });
      return data;
    }

    // No cache category - skip caching entirely
    return this.executeWithRetry<T>(query, variables);
  }

  /** Invalidate the entire query cache */
  clearCache(): void {
    queryCache.clear();
  }

  /** Retries with exponential backoff via p-retry */
  private async executeWithRetry<T>(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<T> {
    return pRetry(
      async () => {
        // Each attempt (including retries) counts toward the rate limit
        await this.rateLimiter.consume();
        return this.makeRequest<T>(query, variables);
      },
      {
        retries: MAX_RETRIES,
        shouldRetry: (error) => {
          // Non-retryable API errors (e.g. 404) abort immediately
          if (error instanceof AniListApiError && !error.retryable) {
            return false;
          }
          return true;
        },
      },
    );
  }

  /** Send a single GraphQL POST request and parse the response */
  private async makeRequest<T>(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    // Attach auth header if an OAuth token is configured
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    // Network errors (DNS, timeout, etc.) are retryable
    let response: Response;
    try {
      response = await fetch(ANILIST_API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables }),
      });
    } catch (error) {
      throw new AniListApiError(
        `Network error connecting to AniList: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        true,
      );
    }

    // Map HTTP errors to AniListApiError with appropriate retryability
    if (!response.ok) {
      // Read error body for context, but don't mask the HTTP error if reading fails
      const body = await response.text().catch(() => "");

      if (response.status === 429) {
        throw new AniListApiError(
          "AniList rate limit hit. The server will retry automatically.",
          429,
          true,
        );
      }

      if (response.status === 404) {
        throw new AniListApiError(
          "Resource not found on AniList. Check that the ID or username is correct.",
          404,
          false,
        );
      }

      // Only server errors (5xx) are worth retrying
      const retryable = response.status >= 500;
      throw new AniListApiError(
        `AniList API error (HTTP ${response.status}): ${body.slice(0, 200)}`,
        response.status,
        retryable,
      );
    }

    // AniList returns { data, errors } - both can be present simultaneously
    const json = (await response.json()) as {
      data?: T;
      errors?: Array<{ message: string; status?: number }>;
    };

    // GraphQL can return 200 OK with errors in the body
    if (json.errors?.length) {
      // Use the error's own status if present, otherwise fall back to HTTP status
      const firstError = json.errors[0];
      const status = firstError.status ?? response.status;
      throw new AniListApiError(
        `AniList GraphQL error: ${firstError.message}`,
        status,
        status === 429 || (status !== undefined && status >= 500),
      );
    }

    // Shouldn't happen with a well-formed query, but guard against it
    if (!json.data) {
      throw new AniListApiError(
        "AniList returned an empty response. Try again.",
      );
    }

    return json.data;
  }
}

/** Singleton. Rate limiter and cache must be shared across all tools. */
export const anilistClient = new AniListClient();
