// lib/feed.ts
// Client-side Supabase functions for Feed system (Global + Spot)

import { createClient } from '@/lib/supabase/client';
import type {
  FeedPost,
  FeedComment,
  CreatePostPayload,
  GlobalFeedFilters,
  SpotFeedFilters,
} from '@/types/feed';

const supabase = createClient();

// ── Global feed (proximity, spot_id IS NULL) ────────────────
export async function fetchGlobalFeed(filters: GlobalFeedFilters): Promise<FeedPost[]> {
  const { data, error } = await supabase.rpc('global_feed', {
    user_lat: filters.lat,
    user_lng: filters.lng,
    radius_miles: filters.radius_miles,
    sort_by: filters.sort_by,
    page_limit: filters.page_limit ?? 50,
    page_offset: filters.page_offset ?? 0,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as FeedPost[];
}

// ── Spot sub-feed ───────────────────────────────────────────
export async function fetchSpotFeed(filters: SpotFeedFilters): Promise<FeedPost[]> {
  const { data, error } = await supabase.rpc('spot_feed', {
    p_spot_id: filters.spot_id,
    sort_by: filters.sort_by,
    page_limit: filters.page_limit ?? 50,
    page_offset: filters.page_offset ?? 0,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as FeedPost[];
}

// ── Create a post (global if no spot_id, spot sub-feed if set) ──
export async function createPost(payload: CreatePostPayload): Promise<FeedPost> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('feed_posts')
    .insert({
      user_id: userData.user.id,
      nickname: payload.nickname ?? 'Anonymous',
      content: payload.content,
      image_url: payload.image_url ?? null,
      lat: payload.lat,
      lng: payload.lng,
      spot_id: payload.spot_id ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as FeedPost;
}

// ── Vote on a post ──────────────────────────────────────────
export async function voteOnPost(
  postId: string,
  direction: 1 | -1
): Promise<number> {
  const { data, error } = await supabase.rpc('vote_on_post', {
    p_post_id: postId,
    p_direction: direction,
  });

  if (error) throw new Error(error.message);
  return (data as { new_score: number }[])[0]?.new_score ?? 0;
}

// ── Comments ────────────────────────────────────────────────
export async function fetchComments(postId: string): Promise<FeedComment[]> {
  const { data, error } = await supabase
    .from('feed_post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as FeedComment[];
}

export async function addComment(
  postId: string,
  content: string,
  nickname: string = 'Anonymous'
): Promise<FeedComment> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('feed_post_comments')
    .insert({
      post_id: postId,
      user_id: userData.user.id,
      nickname,
      content,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as FeedComment;
}

// ── Delete own post ─────────────────────────────────────────
export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase
    .from('feed_posts')
    .delete()
    .eq('id', postId);

  if (error) throw new Error(error.message);
}

// ── Upload image ────────────────────────────────────────────
export async function uploadPostImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `feed/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('spot-photos')
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('spot-photos').getPublicUrl(path);
  return data.publicUrl;
}
