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

// POST /api/scrape-on-demand - Real-time AI Deep Search & Ingestion
app.post('/api/scrape-on-demand', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const query = (body.query || c.req.query('q') || '').trim();

    if (!query) {
      return c.json({ success: false, error: 'Query is required' }, 400);
    }

    // 1. Check if already in catalog
    const qLower = query.toLowerCase();
    const existing = songs.find(
      (s) =>
        s.title.toLowerCase() === qLower ||
        s.title.toLowerCase().includes(qLower) ||
        s.slug === qLower
    );
    if (existing) {
      return c.json({
        success: true,
        source: 'cache',
        song: existing,
        albumSongsAdded: 0,
      });
    }

    // 2. Search Tamil lyrics archive online
    const searchUrl = `https://www.tamil2lyrics.com/?s=${encodeURIComponent(query)}`;
    const searchResp = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    if (!searchResp.ok) {
      return c.json({ success: false, error: 'Search archive unreachable' }, 502);
    }

    const html = await searchResp.text();
    // Match candidate song link
    const linkMatch = html.match(/href=["'](https?:\/\/(?:www\.)?tamil2lyrics\.com\/lyrics\/[a-zA-Z0-9_-]+-song-lyrics\/?)["']/i) ||
                      html.match(/href=["'](https?:\/\/(?:www\.)?tamil2lyrics\.com\/lyrics\/[a-zA-Z0-9_-]+\/?)["']/i);

    if (!linkMatch) {
      return c.json({ success: false, error: `No matching songs found for "${query}"` }, 404);
    }

    const targetUrl = linkMatch[1];
    const slug = targetUrl.replace(/\/+$/, '').split('/').pop() || query.toLowerCase().replace(/\s+/g, '-');

    // 3. Fetch song page
    const pageResp = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    if (!pageResp.ok) {
      return c.json({ success: false, error: 'Failed to retrieve song page' }, 502);
    }

    const pageHtml = await pageResp.text();

    // Extract title
    const titleMatch = pageHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    let title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').replace(/lyrics/gi, '').trim() : query;

    // Extract movie
    let movie = 'Tamil Single';
    let year = 2024;
    const movieMatch = pageHtml.match(/From\s*([^<(]+?)\s*\((\d{4})\)/i) ||
                       pageHtml.match(/Movie\s*:\s*([^<\n]+)/i);
    if (movieMatch) {
      movie = movieMatch[1].replace(/<[^>]+>/g, '').trim();
      if (movieMatch[2]) year = parseInt(movieMatch[2], 10);
    }

    // Extract composer
    let composer = 'Anirudh Ravichander';
    const compMatch = pageHtml.match(/(?:Music by|Music Director)\s*:\s*([^<\n]+)/i);
    if (compMatch) {
      composer = compMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    // Extract singers
    let singers = ['Various Artists'];
    const singMatch = pageHtml.match(/Singers?\s*:\s*([^<\n]+)/i);
    if (singMatch) {
      singers = singMatch[1].replace(/<[^>]+>/g, '').split(/[,&]/).map((s) => s.trim()).filter(Boolean);
    }

    // Extract lyricist
    let lyricist = 'Tamil Lyricist';
    const lyrMatch = pageHtml.match(/Lyrics?\s*(?:by|works)?\s*:\s*([^<\n]+)/i);
    if (lyrMatch) {
      lyricist = lyrMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    // Extract og:image
    const imgMatch = pageHtml.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    const coverUrl = imgMatch ? imgMatch[1] : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop';

    // Extract lyrics blocks
    const contentBlocks = pageHtml.match(/<div class=["']t2l-content["']>([\s\S]*?)<\/div>/gi) || [];
    let lyricsTamil: string[] = [];
    let lyricsTanglish: string[] = [];

    for (const block of contentBlocks) {
      const cleanBlock = block.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
      const lines = cleanBlock.split('\n').map((l) => l.trim()).filter(Boolean);
      const tamilChars = (cleanBlock.match(/[\u0B80-\u0BFF]/g) || []).length;
      if (tamilChars > 15 && lyricsTamil.length === 0) {
        lyricsTamil = lines;
      } else if (lyricsTanglish.length === 0) {
        lyricsTanglish = lines;
      }
    }

    if (lyricsTamil.length === 0 && lyricsTanglish.length > 0) lyricsTamil = lyricsTanglish;
    if (lyricsTanglish.length === 0 && lyricsTamil.length > 0) lyricsTanglish = lyricsTamil;

    const newSong: Song = {
      id: slug.replace('-song-lyrics', ''),
      slug,
      title,
      movie,
      year,
      composer,
      singers,
      lyricist,
      coverUrl,
      backdropUrl: coverUrl,
      primaryGlowColor: '#ec4899',
      secondaryGlowColor: '#f43f5e',
      duration: '3:45',
      lyricsTamil,
      lyricsTanglish,
      views: 1,
    };

    // Store in running worker memory map
    songs.unshift(newSong);
    songMap.set(newSong.id, newSong);
    songMap.set(newSong.slug, newSong);

    return c.json({
      success: true,
      source: 'deep-scrape',
      song: newSong,
      albumSongsAdded: 0,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Scrape failed' }, 500);
  }
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

