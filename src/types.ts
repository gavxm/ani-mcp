/** AniList API response types. */

/** Partial date from AniList (some fields may be null) */
export interface AniListDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

/** User-generated tag with relevance ranking */
export interface AniListTag {
  name: string;
  rank: number;
  isMediaSpoiler: boolean;
}

/** Core media object shared across all query responses */
export interface AniListMedia {
  id: number;
  title: {
    romaji: string | null;
    english: string | null;
    native: string | null;
  };
  format: string | null;
  status: string | null;
  episodes: number | null;
  chapters: number | null;
  volumes: number | null;
  meanScore: number | null;
  averageScore: number | null;
  popularity: number | null;
  genres: string[];
  tags: AniListTag[];
  season: string | null;
  seasonYear: number | null;
  startDate: AniListDate;
  endDate: AniListDate;
  studios: {
    nodes: Array<{ name: string }>;
  };
  source: string | null;
  coverImage: { large: string | null };
  siteUrl: string;
  description: string | null;
}

/** Pagination metadata from AniList's Page type */
interface AniListPageInfo {
  total: number;
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
}

/** Paginated search results with media entries */
export interface SearchMediaResponse {
  Page: {
    pageInfo: AniListPageInfo;
    media: AniListMedia[];
  };
}

/** Single media with full details, relations, and recommendations */
export interface MediaDetailsResponse {
  Media: AniListMedia & {
    relations: {
      edges: Array<{
        relationType: string;
        node: {
          id: number;
          title: { romaji: string | null; english: string | null };
          format: string | null;
          status: string | null;
          type: string;
        };
      }>;
    };
    recommendations: {
      nodes: Array<{
        rating: number;
        mediaRecommendation: {
          id: number;
          title: { romaji: string | null; english: string | null };
          format: string | null;
          meanScore: number | null;
          genres: string[];
          siteUrl: string;
        } | null;
      }>;
    };
  };
}

/** Single entry from a user's anime/manga list */
export interface AniListMediaListEntry {
  id: number;
  score: number;
  progress: number;
  status: string;
  updatedAt: number;
  startedAt: AniListDate;
  completedAt: AniListDate;
  notes: string | null;
  media: AniListMedia;
}

/** User's anime/manga list, grouped by watching status */
export interface UserListResponse {
  MediaListCollection: {
    lists: Array<{
      name: string;
      status: string;
      entries: AniListMediaListEntry[];
    }>;
  };
}
