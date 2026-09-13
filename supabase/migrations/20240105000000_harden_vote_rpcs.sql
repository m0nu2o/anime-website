-- Migration: 20240105000000_harden_vote_rpcs.sql
-- Description: Defense-in-depth for vote/like RPCs: restrict EXECUTE to authenticated users
-- and raise explicit exceptions when invoked without a session (complements the
-- auth.uid() checks already inside the functions).

REVOKE ALL ON FUNCTION public.increment_review_helpful_count(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_review_helpful_count(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.increment_comment_likes(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_comment_likes(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.increment_review_helpful_count(row_id UUID)
RETURNS boolean AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.review_votes WHERE user_id = v_user_id AND review_id = row_id) THEN
    RETURN false;
  END IF;

  INSERT INTO public.review_votes (user_id, review_id) VALUES (v_user_id, row_id);

  UPDATE public.anime_reviews
  SET helpful_count = helpful_count + 1
  WHERE id = row_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_comment_likes(row_id UUID)
RETURNS boolean AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.comment_likes WHERE user_id = v_user_id AND comment_id = row_id) THEN
    RETURN false;
  END IF;

  INSERT INTO public.comment_likes (user_id, comment_id) VALUES (v_user_id, row_id);

  UPDATE public.episode_comments
  SET likes = likes + 1
  WHERE id = row_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
