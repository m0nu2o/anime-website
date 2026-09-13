-- Migration: 20240104000000_review_votes_tracking.sql
-- Description: Track user votes on reviews and comments to enforce one vote per user atomically

CREATE TABLE IF NOT EXISTS public.review_votes (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  review_id UUID REFERENCES public.anime_reviews(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, review_id)
);

ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Review votes viewable by authenticated users" ON public.review_votes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own review votes" ON public.review_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update increment_review_helpful_count with duplicate vote check
CREATE OR REPLACE FUNCTION increment_review_helpful_count(row_id UUID)
RETURNS boolean AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN false;
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

-- Episode Comment Likes Tracking Table
CREATE TABLE IF NOT EXISTS public.comment_likes (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment_id UUID REFERENCES public.episode_comments(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, comment_id)
);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comment likes viewable by authenticated users" ON public.comment_likes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own comment likes" ON public.comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update increment_comment_likes with duplicate check
CREATE OR REPLACE FUNCTION increment_comment_likes(row_id UUID)
RETURNS boolean AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN false;
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
