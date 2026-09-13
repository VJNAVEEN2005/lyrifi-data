-- ==============================================================================
-- Supabase Schema for High-Traffic Tamil Lyrics Engine
-- 100% Free PostgreSQL Tier Compatible with Row Level Security & Trigram Full-Text Search
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. MOVIES / ALBUMS TABLE
CREATE TABLE IF NOT EXISTS public.movies (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    year INTEGER NOT NULL DEFAULT 2024,
    poster_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ARTISTS TABLE (Composers, Singers, Lyricists)
CREATE TABLE IF NOT EXISTS public.artists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    role TEXT DEFAULT 'Artist',
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. SONGS TABLE
CREATE TABLE IF NOT EXISTS public.songs (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    movie TEXT NOT NULL,
    year INTEGER NOT NULL DEFAULT 2024,
    composer TEXT NOT NULL,
    singers TEXT[] NOT NULL DEFAULT '{}',
    lyricist TEXT NOT NULL,
    cover_url TEXT NOT NULL,
    backdrop_url TEXT NOT NULL,
    primary_glow_color TEXT DEFAULT '#06b6d4',
    secondary_glow_color TEXT DEFAULT '#ec4899',
    duration TEXT DEFAULT '3:45',
    active_line_index_default INTEGER DEFAULT 2,
    lyrics_tamil TEXT[] NOT NULL DEFAULT '{}',
    lyrics_tanglish TEXT[] NOT NULL DEFAULT '{}',
    youtube_id TEXT,
    views_count BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. FAST FULL-TEXT SEARCH INDEXES (GIN Trigram for Instant Autocomplete & Search)
CREATE INDEX IF NOT EXISTS idx_songs_title_trgm ON public.songs USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_songs_movie_trgm ON public.songs USING gin (movie gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_songs_composer_trgm ON public.songs USING gin (composer gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_songs_lyricist_trgm ON public.songs USING gin (lyricist gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_songs_views ON public.songs (views_count DESC);
CREATE INDEX IF NOT EXISTS idx_songs_year ON public.songs (year DESC);

-- 5. ROW LEVEL SECURITY (RLS) - Public Read Access (100% Free & Fast Anonymous Reads)
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on songs"
    ON public.songs FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow public read access on movies"
    ON public.movies FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow public read access on artists"
    ON public.artists FOR SELECT
    TO anon, authenticated
    USING (true);

-- Allow service_role / scraper full insert/update privileges
CREATE POLICY "Allow service role write access on songs"
    ON public.songs FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service role write access on movies"
    ON public.movies FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service role write access on artists"
    ON public.artists FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
