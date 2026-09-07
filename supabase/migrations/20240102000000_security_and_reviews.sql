-- Migration: 20240102000000_security_and_reviews.sql
-- Description: Hardens anime_cache policies and introduces secure tables for anime_reviews and episode_comments with RLS.

-- 1. Tighten anime_cache policies to prevent unauthorized tampering
DROP POLICY IF EXISTS "Anime cache insertable by authenticated users." ON public.anime_cache;
CREATE POLICY "Anime cache insertable by authenticated users." ON public.anime_cache 
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Anime cache updateable by authenticated users." ON public.anime_cache;
CREATE POLICY "Anime cache updateable by authenticated users." ON public.anime_cache 
  FOR UPDATE USING (auth.role() = 'service_role');

-- 2. Anime Community Reviews & Ratings Table
CREATE TABLE IF NOT EXISTS public.anime_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  anime_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 10) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_recommended BOOLEAN DEFAULT true NOT NULL,
  helpful_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, anime_id)
);

ALTER TABLE public.anime_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviews are viewable by everyone." ON public.anime_reviews;
CREATE POLICY "Reviews are viewable by everyone." ON public.anime_reviews 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own reviews." ON public.anime_reviews;
CREATE POLICY "Users can insert their own reviews." ON public.anime_reviews 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reviews." ON public.anime_reviews;
CREATE POLICY "Users can update their own reviews." ON public.anime_reviews 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reviews." ON public.anime_reviews;
CREATE POLICY "Users can delete their own reviews." ON public.anime_reviews 
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Episode Discussion Comments Table
CREATE TABLE IF NOT EXISTS public.episode_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  anime_id TEXT NOT NULL,
  episode_number INTEGER NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  content TEXT NOT NULL,
  likes INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.episode_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Episode comments are viewable by everyone." ON public.episode_comments;
CREATE POLICY "Episode comments are viewable by everyone." ON public.episode_comments 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own episode comments." ON public.episode_comments;
CREATE POLICY "Users can insert their own episode comments." ON public.episode_comments 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own episode comments." ON public.episode_comments;
CREATE POLICY "Users can update their own episode comments." ON public.episode_comments 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own episode comments." ON public.episode_comments;
CREATE POLICY "Users can delete their own episode comments." ON public.episode_comments 
  FOR DELETE USING (auth.uid() = user_id);
