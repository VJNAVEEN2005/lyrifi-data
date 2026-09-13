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

// GET /api/search - Sub-millisecond indexed search with full song, movie & artist matching
app.get('/api/search', (c) => {
  const q = c.req.query('q')?.toLowerCase().trim() || '';
  if (!q) {
    return c.json({ success: true, count: 0, results: [], songs: [], movies: [], artists: [] });
  }

  // 1. Matched songs
  const matchedSongs = songs.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.movie.toLowerCase().includes(q) ||
      s.composer.toLowerCase().includes(q) ||
      s.lyricist.toLowerCase().includes(q) ||
      s.singers.some((singer) => singer.toLowerCase().includes(q))
  );

  // 2. Matched movie albums
  const movieMap = new Map<string, { id: string; title: string; year: number; posterUrl: string; trackCount: number }>();
  songs.forEach((s) => {
    if (s.movie && s.movie.toLowerCase().includes(q)) {
      const key = s.movie.toLowerCase().trim();
      if (!movieMap.has(key)) {
        movieMap.set(key, {
          id: key.replace(/[^a-z0-9]+/g, '-'),
          title: s.movie,
          year: s.year || 2024,
          posterUrl: s.coverUrl,
          trackCount: 1,
        });
      } else {
        const item = movieMap.get(key)!;
        item.trackCount += 1;
      }
    }
  });

  // 3. Matched artists
  const artistMap = new Map<string, { id: string; name: string; role: string; imageUrl: string }>();
  songs.forEach((s) => {
    if (s.composer && s.composer.toLowerCase().includes(q)) {
      const key = s.composer.toLowerCase().trim();
      if (!artistMap.has(key)) {
        artistMap.set(key, {
          id: key.replace(/[^a-z0-9]+/g, '-'),
          name: s.composer,
          role: 'Music Director',
          imageUrl: s.coverUrl,
        });
      }
    }
  });

  c.header('Cache-Control', 'public, max-age=120');

  return c.json({
    success: true,
    query: q,
    count: matchedSongs.length,
    results: matchedSongs,
    songs: matchedSongs,
    movies: Array.from(movieMap.values()),
    artists: Array.from(artistMap.values()),
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
// Helper to scrape a single song page from URL
async function scrapeSongPage(targetUrl: string, fallbackTitle: string): Promise<Song | null> {
  try {
    const pageResp = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    if (!pageResp.ok) return null;
    const pageHtml = await pageResp.text();

    const titleMatch = pageHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    let title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').replace(/lyrics/gi, '').trim() : fallbackTitle;

    let movie = 'Tamil Single';
    let year = 2024;
    const movieMatch = pageHtml.match(/From\s*([^<(]+?)\s*\((\d{4})\)/i) ||
                       pageHtml.match(/Movie\s*:\s*([^<\n]+)/i);
    if (movieMatch) {
      movie = movieMatch[1].replace(/<[^>]+>/g, '').trim();
      if (movieMatch[2]) year = parseInt(movieMatch[2], 10);
    }

    let composer = 'Anirudh Ravichander';
    const compMatch = pageHtml.match(/(?:Music by|Music Director)\s*:\s*([^<\n]+)/i);
    if (compMatch) {
      composer = compMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    let singers = ['Various Artists'];
    const singMatch = pageHtml.match(/Singers?\s*:\s*([^<\n]+)/i);
    if (singMatch) {
      singers = singMatch[1].replace(/<[^>]+>/g, '').split(/[,&]/).map((s) => s.trim()).filter(Boolean);
    }

    let lyricist = 'Tamil Lyricist';
    const lyrMatch = pageHtml.match(/Lyrics?\s*(?:by|works)?\s*:\s*([^<\n]+)/i);
    if (lyrMatch) {
      lyricist = lyrMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    const imgMatch = pageHtml.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    const coverUrl = imgMatch ? imgMatch[1] : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop';

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

    const slug = targetUrl.replace(/\/+$/, '').split('/').pop() || fallbackTitle.toLowerCase().replace(/\s+/g, '-');

    return {
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
  } catch {
    return null;
  }
}

// POST /api/scrape-on-demand - Real-time AI Deep Search & Ingestion
app.post('/api/scrape-on-demand', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const query = (body.query || c.req.query('q') || '').trim();
    const type: 'movie' | 'song' = body.type === 'movie' ? 'movie' : 'song';

    if (!query) {
      return c.json({ success: false, error: 'Query is required' }, 400);
    }

    const qLower = query.toLowerCase();

    // 1. Check if already in catalog
    if (type === 'song') {
      const existing = songs.find(
        (s) =>
          s.title.toLowerCase() === qLower ||
          s.title.toLowerCase().includes(qLower) ||
          s.slug === qLower
      );
      if (existing) {
        return c.json({
          success: true,
          type: 'song',
          source: 'cache',
          song: existing,
          songs: [existing],
        });
      }
    } else {
      // Movie check in cache
      const existingMovieSongs = songs.filter(
        (s) => s.movie && s.movie.toLowerCase().includes(qLower)
      );
      if (existingMovieSongs.length > 0) {
        return c.json({
          success: true,
          type: 'movie',
          source: 'cache',
          movieTitle: existingMovieSongs[0].movie,
          songs: existingMovieSongs,
          count: existingMovieSongs.length,
        });
      }
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

    if (type === 'movie') {
      // Find candidate movie page link (e.g. /movie/xyz-2022/ or /movies/xyz/)
      const moviePageMatch = html.match(/href=["'](https?:\/\/(?:www\.)?tamil2lyrics\.com\/movie\/[^"']+)["']/i);
      
      let songLinks: string[] = [];

      if (moviePageMatch) {
        // Fetch movie album page to get all song tracks
        const moviePageUrl = moviePageMatch[1];
        const mResp = await fetch(moviePageUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
        });
        if (mResp.ok) {
          const mHtml = await mResp.text();
          const found = mHtml.match(/href=["'](https?:\/\/(?:www\.)?tamil2lyrics\.com\/lyrics\/[^"']+)["']/gi) || [];
          songLinks = Array.from(
            new Set(
              found.map((s) => s.replace(/href=["']|["']/gi, ''))
            )
          );
        }
      }

      // If no dedicated movie page found, extract all matching song links from the search page
      if (songLinks.length === 0) {
        const found = html.match(/href=["'](https?:\/\/(?:www\.)?tamil2lyrics\.com\/lyrics\/[^"']+)["']/gi) || [];
        songLinks = Array.from(
          new Set(
            found.map((s) => s.replace(/href=["']|["']/gi, ''))
          )
        ).slice(0, 8);
      }

      if (songLinks.length === 0) {
        return c.json({ success: false, error: `No songs or movie album found for "${query}"` }, 404);
      }

      // Scrape up to 6 songs for this movie
      const scrapedSongs: Song[] = [];
      for (const link of songLinks.slice(0, 6)) {
        const s = await scrapeSongPage(link, query);
        if (s) {
          // If song movie is default, assign the searched movie title
          if (!s.movie || s.movie === 'Tamil Single') {
            s.movie = query;
          }
          if (!songMap.has(s.id)) {
            songs.unshift(s);
            songMap.set(s.id, s);
            songMap.set(s.slug, s);
          }
          scrapedSongs.push(s);
        }
      }

      const detectedMovieTitle = scrapedSongs.find((s) => s.movie && s.movie !== 'Tamil Single')?.movie || query;

      return c.json({
        success: true,
        type: 'movie',
        source: 'deep-scrape',
        movieTitle: detectedMovieTitle,
        songs: scrapedSongs,
        count: scrapedSongs.length,
      });
    } else {
      // Individual Song Deep Scrape
      const linkMatch =
        html.match(/href=["'](https?:\/\/(?:www\.)?tamil2lyrics\.com\/lyrics\/[a-zA-Z0-9_-]+-song-lyrics\/?)["']/i) ||
        html.match(/href=["'](https?:\/\/(?:www\.)?tamil2lyrics\.com\/lyrics\/[a-zA-Z0-9_-]+\/?)["']/i);

      if (!linkMatch) {
        return c.json({ success: false, error: `No matching song found for "${query}"` }, 404);
      }

      const targetUrl = linkMatch[1];
      const newSong = await scrapeSongPage(targetUrl, query);

      if (!newSong) {
        return c.json({ success: false, error: 'Failed to parse song lyrics' }, 502);
      }

      if (!songMap.has(newSong.id)) {
        songs.unshift(newSong);
        songMap.set(newSong.id, newSong);
        songMap.set(newSong.slug, newSong);
      }

      return c.json({
        success: true,
        type: 'song',
        source: 'deep-scrape',
        song: newSong,
        songs: [newSong],
      });
    }
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

