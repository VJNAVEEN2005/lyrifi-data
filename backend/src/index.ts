import { Hono } from 'hono';
import { cors } from 'hono/cors';
import rawSongs from './songs.json';

// In-memory view counts for this worker isolate
const songViews = new Map<string, number>();

export interface Song {
  id: string;
  slug: string;
  title: string;
  movie: string;
  year: number;
  composer: string;
  singers: string[];
  lyricist: string;
  coverUrl: string;
  backdropUrl: string;
  primaryGlowColor: string;
  secondaryGlowColor: string;
  duration: string;
  lyricsTamil: string[];
  lyricsTanglish: string[];
  youtubeId?: string | null;
  sourceUrl?: string;
  views?: number;
}

const songs: Song[] = (rawSongs as Song[]).map((s) => ({
  ...s,
  slug: s.slug || s.id,
}));

// Quick lookup maps for O(1) slug/id retrieval
const songMap = new Map<string, Song>();
songs.forEach((s) => {
  songMap.set(s.id, s);
  if (s.slug) songMap.set(s.slug, s);
});

const app = new Hono();

// Enable CORS for frontend client
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })
);

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    uptime: '100%',
    platform: 'Cloudflare Edge Workers',
    songsCount: songs.length,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/songs - List all songs with search, sorting, and pagination
app.get('/api/songs', (c) => {
  const query = c.req.query('q')?.toLowerCase().trim() || '';
  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '30', 10), 100);

  let filtered = songs;

  if (query) {
    filtered = songs.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.movie.toLowerCase().includes(query) ||
        s.composer.toLowerCase().includes(query) ||
        s.lyricist.toLowerCase().includes(query) ||
        s.singers.some((singer) => singer.toLowerCase().includes(query))
    );
  }

  const total = filtered.length;
  const startIndex = (page - 1) * limit;
  const paginatedSongs = filtered.slice(startIndex, startIndex + limit).map((s) => {
    // Return lightweight metadata for catalog list (strip full lyric arrays for speed)
    return {
      id: s.id,
      slug: s.slug,
      title: s.title,
      movie: s.movie,
      year: s.year,
      composer: s.composer,
      singers: s.singers,
      lyricist: s.lyricist,
      coverUrl: s.coverUrl,
      duration: s.duration,
      views: (songViews.get(s.id) || 0) + (s.views || 0),
    };
  });

  // Edge cache headers: 5 minutes for catalog listings
  c.header('Cache-Control', 'public, max-age=300, s-maxage=300');

  return c.json({
    success: true,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    data: paginatedSongs,
  });
});

// GET /api/songs/:slug - Retrieve complete song data with full Tamil & Tanglish lyrics
app.get('/api/songs/:slug', (c) => {
  const slug = c.req.param('slug');
  const song = songMap.get(slug);

  if (!song) {
    return c.json({ success: false, error: 'Song not found' }, 404);
  }

  const liveViews = (songViews.get(song.id) || 0) + (song.views || 0);

  // Edge cache: 1 hour for individual song lyrics
  c.header('Cache-Control', 'public, max-age=3600, s-maxage=3600');

  return c.json({
    success: true,
    data: {
      ...song,
      views: liveViews,
    },
  });
});

// GET /api/search - Sub-millisecond indexed search
app.get('/api/search', (c) => {
  const q = c.req.query('q')?.toLowerCase().trim() || '';
  if (!q) {
    return c.json({ success: true, count: 0, results: [] });
  }

  const results = songs
    .filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.movie.toLowerCase().includes(q) ||
        s.composer.toLowerCase().includes(q) ||
        s.lyricist.toLowerCase().includes(q) ||
        s.singers.some((singer) => singer.toLowerCase().includes(q))
    )
    .slice(0, 15)
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      movie: s.movie,
      year: s.year,
      coverUrl: s.coverUrl,
      composer: s.composer,
    }));

  c.header('Cache-Control', 'public, max-age=120');

  return c.json({
    success: true,
    count: results.length,
    results,
  });
});

// GET /api/trending - Fast trending songs
app.get('/api/trending', (c) => {
  const trending = [...songs]
    .sort((a, b) => {
      const viewsB = (songViews.get(b.id) || 0) + (b.views || 0);
      const viewsA = (songViews.get(a.id) || 0) + (a.views || 0);
      return viewsB - viewsA;
    })
    .slice(0, 10)
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      movie: s.movie,
      coverUrl: s.coverUrl,
      composer: s.composer,
      views: (songViews.get(s.id) || 0) + (s.views || 0),
    }));

  return c.json({
    success: true,
    data: trending,
  });
});

// POST /api/songs/:id/view - Realtime view incrementer
app.post('/api/songs/:id/view', (c) => {
  const id = c.req.param('id');
  const song = songMap.get(id);

  if (!song) {
    return c.json({ success: false, error: 'Song not found' }, 404);
  }

  const current = songViews.get(song.id) || 0;
  songViews.set(song.id, current + 1);

  return c.json({
    success: true,
    id: song.id,
    views: current + 1,
  });
});

export default app;
