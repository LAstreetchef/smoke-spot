// types/feed.ts
// Feed System Types

export type FeedSort = 'hot' | 'new';

export interface FeedPost {
  id: string;
  user_id: string;
  spot_id: string | null;
  content: string;
  image_url: string | null;
  nickname: string;
  latitude: number;
  longitude: number;
  score: number;
  comment_count: number;
  expires_at: string;
  created_at: string;
  distance_miles?: number; // Only present in global feed
  tip_total_cents?: number; // Light It Up! 🔥 tipping
  tip_count?: number; // Number of tips received
}

export interface FeedComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  nickname: string;
  created_at: string;
}

export interface FeedVote {
  id: string;
  post_id: string;
  user_id: string;
  vote_type: -1 | 1;
  created_at: string;
}

export interface CreatePostPayload {
  content: string;
  image_url?: string | null;
  nickname?: string;
  latitude: number;
  longitude: number;
  spot_id?: string | null;
}

export interface CreateCommentPayload {
  post_id: string;
  content: string;
  nickname?: string;
}

export interface GlobalFeedFilters {
  lat: number;
  lng: number;
  radius_miles?: number;
  sort?: FeedSort;
  limit?: number;
  offset?: number;
}

export interface SpotFeedFilters {
  spot_id: string;
  sort?: FeedSort;
  limit?: number;
  offset?: number;
}

export type VoteType = -1 | 1 | null;
