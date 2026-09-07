-- Supabase Schema for NextGen Anime Platform

-- Users table extension (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  preferences JSONB DEFAULT '{"theme": "dark", "autoplay": false, "notifications": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Cached Anime Data (To reduce external API hits)
CREATE TABLE IF NOT EXISTS public.anime_cache (
  id TEXT PRIMARY KEY, -- Unified ID (e.g. kitsu-7442, anilist-21)
  anilist_id INTEGER,
  mal_id INTEGER,
  kitsu_id TEXT,
  title_english TEXT,
  title_romaji TEXT,
  title_native TEXT,
  description TEXT,
  cover_image TEXT,
  banner_image TEXT,
  format TEXT,
  status TEXT,
  year INTEGER,
  episodes INTEGER,
  score NUMERIC,
  genres TEXT[],
  data_json JSONB, -- Full normalized Anime object
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Watchlists
CREATE TABLE IF NOT EXISTS public.watchlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  anime_id TEXT NOT NULL,
  anime_title TEXT,
  anime_image TEXT,
  anime_format TEXT,
  anime_score NUMERIC,
  status TEXT CHECK (status IN ('watching', 'completed', 'planning', 'dropped', 'on_hold')) DEFAULT 'watching',
  progress INTEGER DEFAULT 0,
  score INTEGER CHECK (score >= 0 AND score <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, anime_id)
);

-- Favorites
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  anime_id TEXT NOT NULL,
  anime_title TEXT,
  anime_image TEXT,
  anime_format TEXT,
  anime_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, anime_id)
);

-- Watch History & Continue Watching Progress
CREATE TABLE IF NOT EXISTS public.watch_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  anime_id TEXT NOT NULL,
  anime_title TEXT,
  anime_image TEXT,
  season INTEGER DEFAULT 1,
  episode INTEGER DEFAULT 1,
  episode_title TEXT,
  playback_position INTEGER DEFAULT 0, -- In seconds
  duration INTEGER DEFAULT 0, -- In seconds
  completed BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, anime_id, season, episode)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anime_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Anime Cache Policies
DROP POLICY IF EXISTS "Anime cache is viewable by everyone." ON public.anime_cache;
CREATE POLICY "Anime cache is viewable by everyone." ON public.anime_cache FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anime cache insertable by authenticated users." ON public.anime_cache;
CREATE POLICY "Anime cache insertable by authenticated users." ON public.anime_cache FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anime cache updateable by authenticated users." ON public.anime_cache;
CREATE POLICY "Anime cache updateable by authenticated users." ON public.anime_cache FOR UPDATE USING (true);

-- Watchlist Policies
DROP POLICY IF EXISTS "Users can view own watchlist." ON public.watchlists;
CREATE POLICY "Users can view own watchlist." ON public.watchlists FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert into own watchlist." ON public.watchlists;
CREATE POLICY "Users can insert into own watchlist." ON public.watchlists FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own watchlist." ON public.watchlists;
CREATE POLICY "Users can update own watchlist." ON public.watchlists FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete from own watchlist." ON public.watchlists;
CREATE POLICY "Users can delete from own watchlist." ON public.watchlists FOR DELETE USING (auth.uid() = user_id);

-- Favorites Policies
DROP POLICY IF EXISTS "Users can view own favorites." ON public.favorites;
CREATE POLICY "Users can view own favorites." ON public.favorites FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert into own favorites." ON public.favorites;
CREATE POLICY "Users can insert into own favorites." ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete from own favorites." ON public.favorites;
CREATE POLICY "Users can delete from own favorites." ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- Watch History Policies
DROP POLICY IF EXISTS "Users can view own watch history." ON public.watch_history;
CREATE POLICY "Users can view own watch history." ON public.watch_history FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert into own watch history." ON public.watch_history;
CREATE POLICY "Users can insert into own watch history." ON public.watch_history FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own watch history." ON public.watch_history;
CREATE POLICY "Users can update own watch history." ON public.watch_history FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete from own watch history." ON public.watch_history;
CREATE POLICY "Users can delete from own watch history." ON public.watch_history FOR DELETE USING (auth.uid() = user_id);
