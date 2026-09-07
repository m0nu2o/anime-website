-- Migration: 20240103000000_atomic_updates.sql
-- Description: Add RPC functions for atomic increments

CREATE OR REPLACE FUNCTION increment_review_helpful_count(row_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.anime_reviews
  SET helpful_count = helpful_count + 1
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_comment_likes(row_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.episode_comments
  SET likes = likes + 1
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;

