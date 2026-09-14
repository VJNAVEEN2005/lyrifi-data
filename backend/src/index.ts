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

// Canonical artist normalization to prevent duplicate profiles (e.g. "A. R. Rahman" vs "A.R. Rahman")
export const normalizeArtistSlug = (nameOrSlug: string): string => {
  const raw = (nameOrSlug || '')
    .toLowerCase()
    .trim()
    .replace(/['’\.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const ALIAS_MAP: Record<string, string> = {
    'ar-rahman': 'a-r-rahman',
    'arrahman': 'a-r-rahman',
    'a-r-rahman': 'a-r-rahman',
    'allah-rakha-rahman': 'a-r-rahman',
    'gv-prakash': 'g-v-prakash-kumar',
    'gv-prakash-kumar': 'g-v-prakash-kumar',
    'g-v-prakash': 'g-v-prakash-kumar',
    'g-v-prakash-kumar': 'g-v-prakash-kumar',
    'ilayaraja': 'ilaiyaraaja',
    'ilaiyaraja': 'ilaiyaraaja',
    'ilaiyaraaja': 'ilaiyaraaja',
    'yuvan': 'yuvan-shankar-raja',
    'yuvan-shankar': 'yuvan-shankar-raja',
    'yuvan-shankar-raja': 'yuvan-shankar-raja',
    'harris': 'harris-jayaraj',
    'harris-jayaraj': 'harris-jayaraj',
    'spb': 's-p-balasubrahmanyam',
    'sp-balasubrahmanyam': 's-p-balasubrahmanyam',
    's-p-balasubrahmanyam': 's-p-balasubrahmanyam',
    'sp-balasubramaniam': 's-p-balasubrahmanyam',
    's-p-balasubramaniam': 's-p-balasubrahmanyam',
    'sid-sriram': 'sid-sriram',
    'thalapathy-vijay': 'thalapathy-vijay',
    'vijay': 'thalapathy-vijay',
    'actor-vijay': 'thalapathy-vijay',
    'd-imman': 'd-imman',
    'imman': 'd-imman',
    'devi-sri-prasad': 'devi-sri-prasad',
    'dsp': 'devi-sri-prasad',
    'hiphop-tamizha': 'hiphop-tamizha',
    'hiphop-tamizha-adhi': 'hiphop-tamizha',
    'k-s-chithra': 'k-s-chithra',
    'ks-chithra': 'k-s-chithra',
    'chithra': 'k-s-chithra',
    'chinmayi': 'chinmayi',
    'chinmayi-sripaada': 'chinmayi',
    'sujatha': 'sujatha-mohan',
    'sujatha-mohan': 'sujatha-mohan',
    'andrea': 'andrea-jeremiah',
    'andrea-jeremiah': 'andrea-jeremiah',
    'str': 'silambarasan-tr',
    'silambarasan': 'silambarasan-tr',
    'silambarasan-tr': 'silambarasan-tr',
    'simbu': 'silambarasan-tr',
    'kamal': 'kamal-haasan',
    'kamal-haasan': 'kamal-haasan',
    'kamal-hassan': 'kamal-haasan',
    'spb-charan': 's-p-b-charan',
    's-p-b-charan': 's-p-b-charan',
  };

  return ALIAS_MAP[raw] || raw;
};

export const CANONICAL_ARTIST_NAMES: Record<string, string> = {
  'a-r-rahman': 'A. R. Rahman',
  'g-v-prakash-kumar': 'G. V. Prakash Kumar',
  'ilaiyaraaja': 'Ilaiyaraaja',
  'yuvan-shankar-raja': 'Yuvan Shankar Raja',
  'harris-jayaraj': 'Harris Jayaraj',
  's-p-balasubrahmanyam': 'S. P. Balasubrahmanyam',
  'sid-sriram': 'Sid Sriram',
  'thalapathy-vijay': 'Thalapathy Vijay',
  'd-imman': 'D. Imman',
  'devi-sri-prasad': 'Devi Sri Prasad',
  'hiphop-tamizha': 'Hiphop Tamizha',
  'k-s-chithra': 'K. S. Chithra',
  'chinmayi': 'Chinmayi Sripaada',
  'sujatha-mohan': 'Sujatha Mohan',
  'andrea-jeremiah': 'Andrea Jeremiah',
  'silambarasan-tr': 'Silambarasan TR',
  'kamal-haasan': 'Kamal Haasan',
  's-p-b-charan': 'S. P. B. Charan',
};

const knownPortraits: Record<string, string> = {
  'anirudh': '/artists/anirudh-ravichander.jpg',
  'anirudh-ravichander': '/artists/anirudh-ravichander.jpg',
  'ar-rahman': '/artists/a-r-rahman.jpg',
  'a-r-rahman': '/artists/a-r-rahman.jpg',
  'ilaiyaraaja': '/artists/ilaiyaraaja.jpg',
  'ilayaraja': '/artists/ilaiyaraaja.jpg',
  'yuvan': '/artists/yuvan-shankar-raja.jpg',
  'yuvan-shankar-raja': '/artists/yuvan-shankar-raja.jpg',
  'harris': '/artists/harris-jayaraj.jpg',
  'harris-jayaraj': '/artists/harris-jayaraj.jpg',
  'spb': '/artists/s-p-balasubrahmanyam.jpg',
  's-p-balasubrahmanyam': '/artists/s-p-balasubrahmanyam.jpg',
  'sp-balasubrahmanyam': '/artists/s-p-balasubrahmanyam.jpg',
  'sid-sriram': '/artists/sid-sriram.jpg',
  'vijay': '/artists/thalapathy-vijay.jpg',
  'thalapathy-vijay': '/artists/thalapathy-vijay.jpg',
  'actor-vijay': '/artists/thalapathy-vijay.jpg',
  'gv-prakash': '/artists/g-v-prakash-kumar.jpg',
  'gv-prakash-kumar': '/artists/g-v-prakash-kumar.jpg',
  'g-v-prakash-kumar': '/artists/g-v-prakash-kumar.jpg',
  'santhosh-narayanan': '/artists/santhosh-narayanan.jpg',
  'd-imman': '/artists/d-imman.jpg',
  'imman': '/artists/d-imman.jpg',
  'devi-sri-prasad': '/artists/devi-sri-prasad.jpg',
  'dsp': '/artists/devi-sri-prasad.jpg',
  'shankar-mahadevan': '/artists/shankar-mahadevan.jpg',
  'hariharan': '/artists/hariharan.jpg',
  'udit-narayan': '/artists/udit-narayan.jpg',
  'vijay-antony': '/artists/vijay-antony.jpg',
  'hiphop-tamizha': '/artists/hiphop-tamizha.jpg',
  'hiphop-tamizha-adhi': '/artists/hiphop-tamizha.jpg',
  'mano': '/artists/mano.jpg',
  'haricharan': '/artists/haricharan.jpg',
  'shreya-ghoshal': '/artists/shreya-ghoshal.jpg',
  'k-s-chithra': '/artists/k-s-chithra.jpg',
  'ks-chithra': '/artists/k-s-chithra.jpg',
  'chithra': '/artists/k-s-chithra.jpg',
  'jonita-gandhi': '/artists/jonita-gandhi.jpg',
  'chinmayi': '/artists/chinmayi.jpg',
  'chinmayi-sripaada': '/artists/chinmayi.jpg',
  'sujatha-mohan': '/artists/sujatha-mohan.jpg',
  'sujatha': '/artists/sujatha-mohan.jpg',
  'anuradha-sriram': '/artists/anuradha-sriram.jpg',
  'andrea-jeremiah': '/artists/andrea-jeremiah.jpg',
  'andrea': '/artists/andrea-jeremiah.jpg',
  'dhanush': '/artists/dhanush.jpg',
  'silambarasan': '/artists/silambarasan-tr.jpg',
  'silambarasan-tr': '/artists/silambarasan-tr.jpg',
  'str': '/artists/silambarasan-tr.jpg',
  'kamal-haasan': '/artists/kamal-haasan.jpg',
  'kamal': '/artists/kamal-haasan.jpg',
  'rajinikanth': '/artists/rajinikanth.jpg',
  'vairamuthu': '/artists/vairamuthu.jpg',
  's-p-b-charan': '/artists/s-p-b-charan.jpg',
  'spb-charan': '/artists/s-p-b-charan.jpg',
};

const toSlug = (str: string) =>
  (str || '')
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Phonetic & Fuzzy Search matching functions for typo tolerance
function normalizePhonetic(text: string): string {
  if (!text) return '';
  let s = text.toLowerCase().trim();
  s = s.replace(/[^a-z0-9\s]/g, '');
  s = s.replace(/([a-z])\1+/g, '$1');
  s = s.replace(/th/g, 't').replace(/dh/g, 't').replace(/d/g, 't');
  s = s.replace(/ph/g, 'f');
  s = s.replace(/ee/g, 'i').replace(/ea/g, 'i').replace(/y/g, 'i');
  s = s.replace(/oo/g, 'u');
  s = s.replace(/kh/g, 'k').replace(/c/g, 'k').replace(/q/g, 'k').replace(/g/g, 'k');
  s = s.replace(/zh/g, 'l').replace(/sh/g, 's').replace(/z/g, 's');
  // Tamil/Indian r/l interchange (e.g., choran vs chozhan vs cholan)
  s = s.replace(/r/g, 'l');
  return s.trim();
}

function levenshteinDistance(s1: string, s2: string): number {
  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;

  let prev = Array.from({ length: s2.length + 1 }, (_, i) => i);
  let curr = new Array(s2.length + 1);

  for (let i = 0; i < s1.length; i++) {
    curr[0] = i + 1;
    for (let j = 0; j < s2.length; j++) {
      const cost = s1[i] === s2[j] ? 0 : 1;
      curr[j + 1] = Math.min(
        curr[j] + 1,
        prev[j + 1] + 1,
        prev[j] + cost
      );
    }
    prev = [...curr];
  }
  return prev[s2.length];
}

function calculateFuzzyScore(query: string, target: string): number {
  const qRaw = (query || '').toLowerCase().trim();
  const tRaw = (target || '').toLowerCase().trim();
  if (!qRaw || !tRaw) return 0;

  if (qRaw === tRaw) return 100;
  if (tRaw.startsWith(qRaw)) return 90;
  if (tRaw.includes(qRaw)) return 80;

  const qNorm = normalizePhonetic(qRaw);
  const tNorm = normalizePhonetic(tRaw);
  if (!qNorm || !tNorm) return 0;

  if (qNorm === tNorm) return 85;
  if (tNorm.startsWith(qNorm)) return 75;
  if (tNorm.includes(qNorm)) return 70;

  const qWords = qNorm.split(/\s+/).filter(Boolean);
  const tWords = tNorm.split(/\s+/).filter(Boolean);

  let matchedWordCount = 0;
  for (const qw of qWords) {
    for (const tw of tWords) {
      if (qw === tw) {
        matchedWordCount++;
        break;
      }
      if (qw.length >= 3 && tw.length >= 3) {
        if (qw.includes(tw) || (tw.length >= 4 && tw.includes(qw))) {
          matchedWordCount++;
          break;
        }
        const dist = levenshteinDistance(qw, tw);
        const maxAllowed = qw.length <= 5 ? 1 : 2;
        if (dist <= maxAllowed) {
          matchedWordCount++;
          break;
        }
      }
    }
  }

  if (qWords.length > 0 && matchedWordCount === qWords.length) {
    return 65;
  }

  if (qWords.length === 1 && tWords.length === 1) {
    const dist = levenshteinDistance(qNorm, tNorm);
    const maxLen = Math.max(qNorm.length, tNorm.length);
    const threshold = maxLen <= 4 ? 1 : maxLen <= 7 ? 2 : 3;
    if (dist <= threshold) {
      return Math.max(40, 60 - dist * 5);
    }
  }

  return 0;
}

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

// GET /api/search - Sub-millisecond indexed search with full fuzzy song, movie & artist matching
app.get('/api/search', async (c) => {
  const q = c.req.query('q')?.toLowerCase().trim() || '';
  if (!q) {
    return c.json({ success: true, count: 0, results: [], songs: [], movies: [], artists: [] });
  }

  // 1. Matched songs with fuzzy scoring and ranking
  const scoredSongs: Array<{ song: Song; score: number }> = [];
  songs.forEach((s) => {
    let maxScore = 0;
    const titleScore = calculateFuzzyScore(q, s.title);
    const movieScore = calculateFuzzyScore(q, s.movie);
    const compScore = calculateFuzzyScore(q, s.composer);
    maxScore = Math.max(maxScore, titleScore, movieScore, compScore);

    if (s.singers && s.singers.length > 0) {
      for (const singer of s.singers) {
        maxScore = Math.max(maxScore, calculateFuzzyScore(q, singer));
      }
    }
    if (s.lyricist) {
      maxScore = Math.max(maxScore, calculateFuzzyScore(q, s.lyricist));
    }

    if (maxScore >= 40) {
      scoredSongs.push({ song: s, score: maxScore });
    }
  });

  scoredSongs.sort((a, b) => b.score - a.score);
  const matchedSongs = scoredSongs.map((item) => item.song);

  // 2. Matched movie albums (keyed by title + year to prevent collisions across releases)
  const movieMap = new Map<string, { id: string; title: string; year: number; posterUrl: string; trackCount: number; movieUrl?: string; score: number }>();
  songs.forEach((s) => {
    if (s.movie) {
      const score = calculateFuzzyScore(q, s.movie);
      if (score >= 40) {
        const key = `${s.movie.toLowerCase().trim()}_${s.year || ''}`;
        if (!movieMap.has(key)) {
          movieMap.set(key, {
            id: `${s.movie.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')}_${s.year || 'album'}`,
            title: s.movie,
            year: s.year || 2024,
            posterUrl: s.coverUrl,
            trackCount: 1,
            score,
          });
        } else {
          const item = movieMap.get(key)!;
          item.trackCount += 1;
          item.score = Math.max(item.score, score);
        }
      }
    }
  });

  // Calculate total relevant data items currently in database
  const currentTotalMatches = matchedSongs.length + movieMap.size;

  // 3. Auto-Scrape & Ingest if database has fewer than 5 relevant matches!
  if (currentTotalMatches < 5 && q.length >= 2) {
    let onlineCandidates = discoveredMoviesCache.get(q);
    if (!onlineCandidates) {
      try {
        const searchUrl = `https://www.tamil2lyrics.com/?s=${encodeURIComponent(q)}`;
        const sResp = await fetch(searchUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
        });
        if (sResp.ok) {
          const html = await sResp.text();
          const rawCandidates = parseMovieCandidatesFromSearchHtml(html, q);
          if (rawCandidates.length > 0) {
            onlineCandidates = await Promise.all(
              rawCandidates.map(async (cand) => {
                const poster = await fetchMovieAlbumArtwork(cand.title, undefined, cand.year);
                return {
                  id: `${cand.slug}_${cand.year}`,
                  slug: cand.slug,
                  title: cand.title,
                  year: cand.year,
                  trackCount: cand.trackCount,
                  posterUrl: poster,
                  url: cand.url,
                  movieUrl: cand.url,
                };
              })
            );
            if (discoveredMoviesCache.size > 100) {
              const firstKey = discoveredMoviesCache.keys().next().value;
              if (firstKey) discoveredMoviesCache.delete(firstKey);
            }
            discoveredMoviesCache.set(q, onlineCandidates);
          } else {
            discoveredMoviesCache.set(q, []);
          }
        }
      } catch {
        // Fallback to local catalog
      }
    }

    if (onlineCandidates && onlineCandidates.length > 0) {
      onlineCandidates.forEach((cand) => {
        const key = `${cand.title.toLowerCase().trim()}_${cand.year || ''}`;
        if (!movieMap.has(key)) {
          movieMap.set(key, {
            id: cand.id,
            title: cand.title,
            year: cand.year,
            posterUrl: cand.posterUrl,
            trackCount: cand.trackCount,
            movieUrl: cand.movieUrl,
            score: 75,
          });
        }
      });
    }
  }

  // Sort movies by score descending
  const sortedMovies = Array.from(movieMap.values())
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...m }) => m);

  // 4. Matched artists (deduplicated by canonical slug, including composers & singers with fuzzy scoring)
  const artistMap = new Map<string, { id: string; name: string; role: string; imageUrl: string; score: number }>();
  songs.forEach((s) => {
    // Check composer
    if (s.composer) {
      const canonicalKey = normalizeArtistSlug(s.composer);
      const displayName = CANONICAL_ARTIST_NAMES[canonicalKey] || s.composer;
      const score = Math.max(
        calculateFuzzyScore(q, s.composer),
        calculateFuzzyScore(q, displayName),
        calculateFuzzyScore(q, canonicalKey.replace(/-/g, ' '))
      );
      if (score >= 45) {
        if (!artistMap.has(canonicalKey)) {
          artistMap.set(canonicalKey, {
            id: canonicalKey,
            name: displayName,
            role: 'Music Director',
            imageUrl: knownPortraits[canonicalKey] || `/artists/${canonicalKey}.jpg`,
            score,
          });
        } else {
          const item = artistMap.get(canonicalKey)!;
          item.score = Math.max(item.score, score);
        }
      }
    }
    // Check singers
    s.singers?.forEach((singer) => {
      if (singer) {
        const canonicalKey = normalizeArtistSlug(singer);
        const displayName = CANONICAL_ARTIST_NAMES[canonicalKey] || singer;
        const score = Math.max(
          calculateFuzzyScore(q, singer),
          calculateFuzzyScore(q, displayName),
          calculateFuzzyScore(q, canonicalKey.replace(/-/g, ' '))
        );
        if (score >= 45) {
          if (!artistMap.has(canonicalKey)) {
            artistMap.set(canonicalKey, {
              id: canonicalKey,
              name: displayName,
              role: 'Playback Singer',
              imageUrl: knownPortraits[canonicalKey] || `/artists/${canonicalKey}.jpg`,
              score,
            });
          } else {
            const item = artistMap.get(canonicalKey)!;
            item.score = Math.max(item.score, score);
          }
        }
      }
    });
  });

  const sortedArtists = Array.from(artistMap.values())
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...a }) => a);

  c.header('Cache-Control', 'no-cache, no-store, must-revalidate');

  return c.json({
    success: true,
    query: q,
    count: matchedSongs.length,
    results: matchedSongs,
    songs: matchedSongs,
    movies: sortedMovies,
    artists: sortedArtists,
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

// GET /api/movies/:year/:album - Get dedicated movie album details and all tracks
app.get('/api/movies/:year/:album', (c) => {
  const yearParam = parseInt(c.req.param('year'), 10);
  const albumSlug = c.req.param('album').toLowerCase().trim();

  const toSlug = (str: string) =>
    (str || '')
      .toLowerCase()
      .trim()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  // 1. Try exact slug and year match
  let albumSongs = songs.filter((s) => {
    const slug = toSlug(s.movie);
    const yearMatch = isNaN(yearParam) || !s.year || s.year === yearParam;
    return slug === albumSlug && yearMatch;
  });

  // 2. Fallback: match slug without year
  if (albumSongs.length === 0) {
    albumSongs = songs.filter((s) => toSlug(s.movie) === albumSlug);
  }

  // 3. Fallback: partial slug match
  if (albumSongs.length === 0) {
    albumSongs = songs.filter((s) => {
      const slug = toSlug(s.movie);
      return slug.includes(albumSlug) || albumSlug.includes(slug);
    });
  }

  if (albumSongs.length === 0) {
    return c.json({ success: false, error: 'Movie album not found' }, 404);
  }

  const movieTitle = albumSongs[0].movie;
  const movieYear = albumSongs[0].year || (!isNaN(yearParam) ? yearParam : 2024);

  return c.json({
    success: true,
    data: {
      id: albumSlug,
      title: movieTitle,
      year: movieYear,
      posterUrl: albumSongs[0].coverUrl,
      backdropUrl: albumSongs[0].backdropUrl || albumSongs[0].coverUrl,
      primaryGlowColor: albumSongs[0].primaryGlowColor || '#ec4899',
      secondaryGlowColor: albumSongs[0].secondaryGlowColor || '#f43f5e',
      composer: albumSongs[0].composer,
      singers: Array.from(new Set(albumSongs.flatMap((s) => s.singers || []))),
      trackCount: albumSongs.length,
      songs: albumSongs,
    },
  });
});

// GET /api/movies/:album - Alias without year in path
app.get('/api/movies/:album', (c) => {
  const albumSlug = c.req.param('album').toLowerCase().trim();
  const toSlug = (str: string) =>
    (str || '')
      .toLowerCase()
      .trim()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const albumSongs = songs.filter((s) => {
    const slug = toSlug(s.movie);
    return slug === albumSlug || slug.includes(albumSlug) || albumSlug.includes(slug);
  });

  if (albumSongs.length === 0) {
    return c.json({ success: false, error: 'Movie album not found' }, 404);
  }

  const movieTitle = albumSongs[0].movie;
  const movieYear = albumSongs[0].year || 2024;

  return c.json({
    success: true,
    data: {
      id: albumSlug,
      title: movieTitle,
      year: movieYear,
      posterUrl: albumSongs[0].coverUrl,
      backdropUrl: albumSongs[0].backdropUrl || albumSongs[0].coverUrl,
      primaryGlowColor: albumSongs[0].primaryGlowColor || '#ec4899',
      secondaryGlowColor: albumSongs[0].secondaryGlowColor || '#f43f5e',
      composer: albumSongs[0].composer,
      singers: Array.from(new Set(albumSongs.flatMap((s) => s.singers || []))),
      trackCount: albumSongs.length,
      songs: albumSongs,
    },
  });
});

// GET /api/artists/:slug - Dedicated Artist / Composer details, songs, and albums
app.get('/api/artists/:slug', (c) => {
  const artistSlug = c.req.param('slug').toLowerCase().trim();
  const normSlug = normalizeArtistSlug(artistSlug);

  // 1. Find all songs composed by this artist
  const composedSongs = songs.filter((s) => {
    const cSlug = normalizeArtistSlug(s.composer);
    return cSlug === normSlug;
  });

  // 2. Find all songs sung by this artist
  const sungSongs = songs.filter((s) => {
    return s.singers.some((singer) => {
      const sSlug = normalizeArtistSlug(singer);
      return sSlug === normSlug;
    });
  });

  // Combined songs (deduplicated by song id)
  const combinedMap = new Map<string, Song>();
  composedSongs.forEach((s) => combinedMap.set(s.id, s));
  sungSongs.forEach((s) => combinedMap.set(s.id, s));
  const artistSongs = Array.from(combinedMap.values());

  if (artistSongs.length === 0) {
    return c.json({ success: false, error: 'Artist not found' }, 404);
  }

  // Determine artist display name and role using canonical naming
  const isPrimarilyComposer = composedSongs.length >= sungSongs.length;
  let artistName = CANONICAL_ARTIST_NAMES[normSlug] || '';
  if (!artistName) {
    if (isPrimarilyComposer && composedSongs[0]?.composer) {
      artistName = composedSongs[0].composer;
    } else if (sungSongs.length > 0) {
      for (const s of sungSongs) {
        const match = s.singers.find((singer) => normalizeArtistSlug(singer) === normSlug);
        if (match) {
          artistName = match;
          break;
        }
      }
    }
  }
  if (!artistName) {
    artistName = artistSongs[0].composer || 'Artist';
  }

  const role =
    composedSongs.length > 0 && sungSongs.length > 0
      ? 'Music Director & Playback Singer'
      : composedSongs.length > 0
      ? 'Music Director & Composer'
      : 'Playback Singer';

  // Get associated movie albums
  const movieMap = new Map<string, { id: string; title: string; year: number; posterUrl: string; trackCount: number }>();
  artistSongs.forEach((s) => {
    if (s.movie && s.movie !== 'Tamil Single') {
      const key = s.movie.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (!movieMap.has(key)) {
        movieMap.set(key, {
          id: key,
          title: s.movie,
          year: s.year || 2024,
          posterUrl: s.coverUrl,
          trackCount: 1,
        });
      } else {
        movieMap.get(key)!.trackCount += 1;
      }
    }
  });

  // Curated high-res original portraits for top Tamil music legends & playback singers
  const knownPortraits: Record<string, string> = {
    'anirudh': '/artists/anirudh-ravichander.jpg',
    'anirudh-ravichander': '/artists/anirudh-ravichander.jpg',
    'ar-rahman': '/artists/a-r-rahman.jpg',
    'a-r-rahman': '/artists/a-r-rahman.jpg',
    'ilaiyaraaja': '/artists/ilaiyaraaja.jpg',
    'ilayaraja': '/artists/ilaiyaraaja.jpg',
    'yuvan': '/artists/yuvan-shankar-raja.jpg',
    'yuvan-shankar-raja': '/artists/yuvan-shankar-raja.jpg',
    'harris': '/artists/harris-jayaraj.jpg',
    'harris-jayaraj': '/artists/harris-jayaraj.jpg',
    'spb': '/artists/s-p-balasubrahmanyam.jpg',
    's-p-balasubrahmanyam': '/artists/s-p-balasubrahmanyam.jpg',
    'sp-balasubrahmanyam': '/artists/s-p-balasubrahmanyam.jpg',
    'sid-sriram': '/artists/sid-sriram.jpg',
    'vijay': '/artists/thalapathy-vijay.jpg',
    'thalapathy-vijay': '/artists/thalapathy-vijay.jpg',
    'actor-vijay': '/artists/thalapathy-vijay.jpg',
    'gv-prakash': '/artists/g-v-prakash-kumar.jpg',
    'gv-prakash-kumar': '/artists/g-v-prakash-kumar.jpg',
    'g-v-prakash-kumar': '/artists/g-v-prakash-kumar.jpg',
    'santhosh-narayanan': '/artists/santhosh-narayanan.jpg',
    'd-imman': '/artists/d-imman.jpg',
    'imman': '/artists/d-imman.jpg',
    'devi-sri-prasad': '/artists/devi-sri-prasad.jpg',
    'dsp': '/artists/devi-sri-prasad.jpg',
    'shankar-mahadevan': '/artists/shankar-mahadevan.jpg',
    'hariharan': '/artists/hariharan.jpg',
    'udit-narayan': '/artists/udit-narayan.jpg',
    'vijay-antony': '/artists/vijay-antony.jpg',
    'hiphop-tamizha': '/artists/hiphop-tamizha.jpg',
    'hiphop-tamizha-adhi': '/artists/hiphop-tamizha.jpg',
    'mano': '/artists/mano.jpg',
    'haricharan': '/artists/haricharan.jpg',
    'shreya-ghoshal': '/artists/shreya-ghoshal.jpg',
    'k-s-chithra': '/artists/k-s-chithra.jpg',
    'ks-chithra': '/artists/k-s-chithra.jpg',
    'chithra': '/artists/k-s-chithra.jpg',
    'jonita-gandhi': '/artists/jonita-gandhi.jpg',
    'chinmayi': '/artists/chinmayi.jpg',
    'chinmayi-sripaada': '/artists/chinmayi.jpg',
    'sujatha-mohan': '/artists/sujatha-mohan.jpg',
    'sujatha': '/artists/sujatha-mohan.jpg',
    'anuradha-sriram': '/artists/anuradha-sriram.jpg',
    'andrea-jeremiah': '/artists/andrea-jeremiah.jpg',
    'andrea': '/artists/andrea-jeremiah.jpg',
    'dhanush': '/artists/dhanush.jpg',
    'silambarasan': '/artists/silambarasan-tr.jpg',
    'silambarasan-tr': '/artists/silambarasan-tr.jpg',
    'str': '/artists/silambarasan-tr.jpg',
    'kamal-haasan': '/artists/kamal-haasan.jpg',
    'kamal': '/artists/kamal-haasan.jpg',
    'rajinikanth': '/artists/rajinikanth.jpg',
    'vairamuthu': '/artists/vairamuthu.jpg',
    's-p-b-charan': '/artists/s-p-b-charan.jpg',
    'spb-charan': '/artists/s-p-b-charan.jpg',
  };

  const imageUrl =
    knownPortraits[normSlug] ||
    `/artists/${normSlug}.jpg` ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&background=18181b&color=f43f5e&size=512&bold=true`;

  c.header('Cache-Control', 'public, max-age=1800, s-maxage=1800');

  return c.json({
    success: true,
    data: {
      id: normSlug,
      name: artistName,
      role,
      imageUrl,
      songCount: artistSongs.length,
      movieCount: movieMap.size,
      composedCount: composedSongs.length,
      sungCount: sungSongs.length,
      movies: Array.from(movieMap.values()),
      composedSongs,
      sungSongs,
      songs: artistSongs,
    },
  });
});

// Helper to fetch clean, high-resolution official music artwork from Apple Music CDN
// NEVER uses image URLs from scraped websites (avoids hotlink blocks and keeps catalog professional)
async function fetchCleanArtwork(
  title: string,
  movie: string,
  composer?: string
): Promise<string> {
  const cleanTitle = (title || '').replace(/lyrics/gi, '').trim();
  const cleanMovie = (movie || '').replace(/tamil\s*(?:film|movie).*/gi, '').trim();
  const cleanComp = (composer || '').trim();

  // 1. Song-level searches exclusively on Apple Music (prioritize accurate track matches)
  const songQueries: string[] = [];
  if (cleanTitle && cleanMovie && cleanMovie !== 'Tamil Single') {
    songQueries.push(`${cleanTitle} ${cleanMovie}`);
    songQueries.push(`${cleanMovie} ${cleanTitle}`);
    songQueries.push(`${cleanTitle} ${cleanMovie} Tamil`);
    if (cleanComp) {
      songQueries.push(`${cleanTitle} ${cleanComp}`);
    }
  }
  if (cleanTitle) {
    songQueries.push(`${cleanTitle} Tamil`);
    songQueries.push(cleanTitle);
  }

  for (const q of songQueries) {
    try {
      const resp = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=5`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
        }
      );
      if (resp.ok) {
        const data: any = await resp.json();
        if (data?.results?.length > 0) {
          const track = data.results[0];
          if (track.artworkUrl100) {
            return track.artworkUrl100.replace('100x100bb', '800x800bb');
          }
        }
      }
    } catch {
      // Continue to next candidate
    }
  }

  // 2. Album-level searches exclusively on Apple Music (soundtrack / movie album)
  if (cleanMovie && cleanMovie !== 'Tamil Single') {
    const albumQueries = [
      cleanComp ? `${cleanMovie} ${cleanComp}` : '',
      `${cleanMovie} Tamil Soundtrack`,
      `${cleanMovie} Tamil`,
      `${cleanMovie} Soundtrack`,
      cleanMovie,
      `${cleanMovie} Original Motion Picture`,
    ].filter(Boolean);

    for (const q of albumQueries) {
      try {
        const resp = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=5`,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            },
          }
        );
        if (resp.ok) {
          const data: any = await resp.json();
          if (data?.results?.length > 0) {
            // Sort by soundtrack/motion picture preference
            const results = [...data.results].sort((a: any, b: any) => {
              const aIsOst = /soundtrack|motion picture|original/i.test(a.collectionName || '');
              const bIsOst = /soundtrack|motion picture|original/i.test(b.collectionName || '');
              if (aIsOst && !bIsOst) return -1;
              if (!aIsOst && bIsOst) return 1;
              return 0;
            });
            const top = results[0];
            if (top?.artworkUrl100) {
              return top.artworkUrl100.replace('100x100bb', '800x800bb');
            }
          }
        }
      } catch {
        // Continue
      }
    }
  }

  // Clean branded fallback SVG, never external stock photo or unrelated foreign art
  return '/default-cover.svg';
}

// Helper to fetch official movie album soundtrack artwork exclusively from Apple Music CDN
async function fetchMovieAlbumArtwork(
  movie: string,
  composer?: string,
  year?: number | string
): Promise<string> {
  const cleanMovie = (movie || '')
    .replace(/tamil\s*(?:film|movie).*/gi, '')
    .replace(/\s*\(\d{4}\)/g, '')
    .replace(/\b(19\d\d|20\d\d)\s*film\b/gi, '')
    .replace(/[-–]\s*(19\d\d|20\d\d).*/g, '')
    .trim();
  const cleanComp = (composer || '').trim();
  const targetYear = year ? String(year).trim() : '';

  if (!cleanMovie || cleanMovie === 'Tamil Single') return '/default-cover.svg';

  const queries = [
    `${cleanMovie} Tamil Soundtrack`,
    cleanComp ? `${cleanMovie} ${cleanComp}` : '',
    targetYear ? `${cleanMovie} ${targetYear}` : '',
    `${cleanMovie} Soundtrack`,
    `${cleanMovie} Original Motion Picture`,
    cleanMovie,
  ].filter(Boolean);

  for (const q of queries) {
    try {
      const resp = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=10`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
        }
      );
      if (resp.ok) {
        const data: any = await resp.json();
        if (data?.results?.length > 0) {
          const sorted = [...data.results].sort((a: any, b: any) => {
            const aYear = (a.releaseDate || '').slice(0, 4);
            const bYear = (b.releaseDate || '').slice(0, 4);
            const aYearMatch = targetYear && aYear === targetYear;
            const bYearMatch = targetYear && bYear === targetYear;
            const aIsOst = /soundtrack|motion picture|original/i.test(a.collectionName || '');
            const bIsOst = /soundtrack|motion picture|original/i.test(b.collectionName || '');

            // Exact year and soundtrack match gets highest priority
            if (aYearMatch && aIsOst && !(bYearMatch && bIsOst)) return -1;
            if (bYearMatch && bIsOst && !(aYearMatch && aIsOst)) return 1;

            // Year match
            if (aYearMatch && !bYearMatch) return -1;
            if (!aYearMatch && bYearMatch) return 1;

            // Soundtrack match
            if (aIsOst && !bIsOst) return -1;
            if (!aIsOst && bIsOst) return 1;
            return 0;
          });
          const top = sorted[0];
          if (top?.artworkUrl100) {
            return top.artworkUrl100.replace('100x100bb', '800x800bb');
          }
        }
      }
    } catch {
      // Continue
    }
  }

  return '/default-cover.svg';
}

export interface DiscoveredMovieCandidate {
  id: string;
  slug: string;
  title: string;
  year: number;
  trackCount: number;
  posterUrl: string;
  url: string;
  movieUrl?: string;
}

// In-memory cache for discovered online movie candidates
const discoveredMoviesCache = new Map<string, DiscoveredMovieCandidate[]>();

function parseMovieCandidatesFromSearchHtml(
  html: string,
  query: string
): Array<{
  slug: string;
  title: string;
  year: number;
  trackCount: number;
  url: string;
}> {
  const qLower = query.toLowerCase().trim();
  const pattern = /<a[^>]+href=["'](https?:\/\/(?:www\.)?tamil2lyrics\.com\/movie\/([^/"']+)\/?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const candidates: Array<{
    slug: string;
    title: string;
    year: number;
    trackCount: number;
    url: string;
  }> = [];
  const seenUrls = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const rawUrl = match[1].trim();
    const slug = match[2].trim();
    const inner = match[3];

    if (seenUrls.has(rawUrl)) continue;
    seenUrls.add(rawUrl);

    // Extract year from badge: <span class="... rounded-full ...">\s*(\d{4})\s*</span>
    const yearMatch =
      inner.match(/class=["'][^"']*rounded-full[^"']*["'][^>]*>\s*(\d{4})\s*</i) ||
      inner.match(/\b(19\d\d|20\d\d)\b/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : 2024;

    // Extract title from <h3>...</h3>
    const h3Match = inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    let cleanTitle = h3Match ? h3Match[1] : slug.replace(/-/g, ' ');
    cleanTitle = cleanTitle
      .replace(/<[^>]+>/g, '')
      .replace(/&#8211;/g, '-')
      .replace(/&ndash;/g, '-')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/&amp;/g, '&')
      .replace(/&#038;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s*-\s*(\d{4})\s*film/i, ' ($1)')
      .replace(/\s*film/i, '')
      .trim();

    // Extract track count
    const countMatch = inner.match(/(\d+)\s*songs?/i);
    const trackCount = countMatch ? parseInt(countMatch[1], 10) : 0;

    const titleLower = cleanTitle.toLowerCase();
    const slugLower = slug.toLowerCase();

    // Keep candidate if slug or title matches query directly or phonetically with fuzzy tolerance
    const fuzzyTitleScore = calculateFuzzyScore(query, cleanTitle);
    const fuzzySlugScore = calculateFuzzyScore(query, slug.replace(/-/g, ' '));
    const isDirectMatch =
      slugLower.includes(qLower) ||
      titleLower.includes(qLower) ||
      qLower.includes(slugLower);

    if (isDirectMatch || fuzzyTitleScore >= 50 || fuzzySlugScore >= 50) {
      candidates.push({
        slug,
        title: cleanTitle,
        year,
        trackCount,
        url: rawUrl,
      });
    }
  }

  return candidates;
}

// POST /api/scrape-on-demand - Real-time AI Deep Search & Ingestion
// Helper to scrape a single song page from URL
async function scrapeSongPage(
  targetUrl: string,
  fallbackTitle?: string,
  fallbackMovie?: string
): Promise<Song | null> {
  try {
    const pageResp = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    if (!pageResp.ok) return null;
    const pageHtml = await pageResp.text();

    // 1. Extract clean song title from H1 or <title>
    let title = '';
    const titleMatch = pageHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (titleMatch) {
      title = titleMatch[1]
        .replace(/<[^>]+>/g, '')
        .replace(/song\s*lyrics/gi, '')
        .replace(/lyrics/gi, '')
        .trim();
    }
    if (!title) {
      const titleTagMatch = pageHtml.match(/<title>([\s\S]*?)<\/title>/i);
      if (titleTagMatch) {
        const candidate = titleTagMatch[1].split(/[-–|]/)[0];
        title = candidate
          .replace(/<[^>]+>/g, '')
          .replace(/song\s*lyrics/gi, '')
          .replace(/lyrics/gi, '')
          .trim();
      }
    }

    const slug =
      targetUrl.replace(/\/+$/, '').split('/').pop() ||
      (title ? title.toLowerCase().replace(/\s+/g, '-') : 'song');

    if (!title && fallbackTitle) {
      title = fallbackTitle;
    }
    if (!title) {
      title = slug
        .replace(/-song-lyrics/i, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    // Clean smart quotes / corrupted unicode quotes
    title = title.replace(/[\uFFFD’‘`´]/g, "'");

    // 2. Extract Movie, Singers, Composer, Lyricist from print-meta or meta description
    let movie = fallbackMovie || 'Tamil Single';
    let year = 2023;
    let composer = 'Anirudh Ravichander';
    let singers = ['Various Artists'];
    let lyricist = 'Tamil Lyricist';

    // 2a. First try dedicated print-meta block (present on modern song pages)
    const printMetaMatch = pageHtml.match(
      /From\s*<strong>([^<]+)<\/strong>\s*(?:\((\d{4})\))?\s*&middot;\s*Singer:\s*<strong>([^<]+)<\/strong>\s*&middot;\s*Lyricist:\s*<strong>([^<]+)<\/strong>\s*&middot;\s*Music:\s*<strong>([^<]+)<\/strong>/i
    );
    if (printMetaMatch) {
      if (printMetaMatch[1]) movie = printMetaMatch[1].trim();
      if (printMetaMatch[2]) year = parseInt(printMetaMatch[2], 10);
      if (printMetaMatch[3]) {
        let rawS = printMetaMatch[3].replace(/Rap by/gi, '').replace(/\band\b|&/gi, ',');
        singers = rawS
          .split(',')
          .map((s) => s.trim().replace(/[\uFFFD]/g, ''))
          .filter((s) => s.length > 1);
      }
      if (printMetaMatch[4]) lyricist = printMetaMatch[4].trim().replace(/[\uFFFD]/g, '');
      if (printMetaMatch[5]) composer = printMetaMatch[5].trim().replace(/[\uFFFD]/g, '');
    } else {
      const metaDescMatch =
        pageHtml.match(/<meta\s+(?:name|property)=["'](?:description|og:description)["']\s+content=["']([^"']+)["']/i);
      if (metaDescMatch) {
        const desc = metaDescMatch[1]
          .replace(/&quot;/g, '')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&');

        const mMatch = desc.match(/Movie(?:\s*Name)?\s*:\s*([^,]+)/i);
        if (mMatch) {
          const cleanM = mMatch[1].replace(/["']/g, '').trim();
          if (cleanM) movie = cleanM;
        }

        const compM = desc.match(/(?:Music\s*Director|Music\s*by)\s*:\s*([^,]+)/i);
        if (compM) {
          const cleanC = compM[1].replace(/["']/g, '').trim();
          if (cleanC) composer = cleanC;
        }

        const singM = desc.match(/Singers?\s*:\s*([^,]+)/i);
        if (singM) {
          singers = singM[1]
            .split(/,\s*|\s+(?:and|&)\s+/i)
            .map((s) => s.trim().replace(/["']/g, ''))
            .filter(Boolean);
        }

        const lyrM = desc.match(/Lyrics?\s*:\s*([^,]+)/i);
        if (lyrM) {
          const cleanL = lyrM[1].replace(/["']/g, '').trim();
          if (cleanL) lyricist = cleanL;
        }
      }
    }

    // Fallback movie extraction from anchor tags: href=".../movie/..."
    if (movie === 'Tamil Single' && !fallbackMovie) {
      const movieAnchorMatch = pageHtml.match(
        /href=["']https?:\/\/(?:www\.)?tamil2lyrics\.com\/movie\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/i
      );
      if (movieAnchorMatch) {
        const candidateMovie = movieAnchorMatch[1].replace(/<[^>]+>/g, '').trim();
        if (candidateMovie && candidateMovie.length > 1) {
          movie = candidateMovie;
        }
      }
    }

    // Fallback year extraction from page
    const yearMatch = pageHtml.match(/\b(19\d\d|20\d\d)\b/);
    if (yearMatch) {
      year = parseInt(yearMatch[1], 10);
    }

    // Official Apple Music CDN artwork (crisp 800x800, zero hotlink blocks, never uses scraped website images)
    const coverUrl = await fetchCleanArtwork(title, movie, composer);

    // Lyrics extraction - Parse dedicated Tamil and English tab panels
    let lyricsTamil: string[] = [];
    let lyricsTanglish: string[] = [];

    // 1. Extract Tamil Panel: data-t2l-tab-panel="tamil" or data-print-lang="tamil" or lang="ta"
    const tamilPanelMatch =
      pageHtml.match(/<div[^>]*data-t2l-tab-panel=["']tamil["'][^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|<div)/i) ||
      pageHtml.match(/<div[^>]*data-print-lang=["']tamil["'][^>]*>([\s\S]*?)<\/div>/i) ||
      pageHtml.match(/<div[^>]*lang=["']ta["'][^>]*>([\s\S]*?)<\/div>/i);

    if (tamilPanelMatch) {
      let tHtml = tamilPanelMatch[1];
      tHtml = tHtml.replace(
        /<div[^>]*class=["'][^"']*t2l-part-divider[^"']*["'][^>]*>[\s\S]*?<span[^>]*class=["'][^"']*text-[^"']*["'][^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/div>/gi,
        '\n$1\n'
      );
      tHtml = tHtml.replace(/<strong>\s*([^<:]+:\s*)<\/strong>/gi, '\n$1\n');
      tHtml = tHtml.replace(/<br\s*\/?>/gi, '\n');
      const pMatches = tHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [tHtml];
      for (const p of pMatches) {
        const clean = p.replace(/<[^>]+>/g, '').trim();
        const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);
        for (const line of lines) {
          if (/[\u0B80-\u0BFF]/.test(line) || line.includes(':')) {
            lyricsTamil.push(line);
          }
        }
      }
    }

    // 2. Extract English / Tanglish Panel: data-t2l-tab-panel="english" or data-print-lang="english"
    const englishPanelMatch =
      pageHtml.match(/<div[^>]*data-t2l-tab-panel=["']english["'][^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|<div)/i) ||
      pageHtml.match(/<div[^>]*data-print-lang=["']english["'][^>]*>([\s\S]*?)<\/div>/i);

    if (englishPanelMatch) {
      let eHtml = englishPanelMatch[1];
      eHtml = eHtml.replace(
        /<div[^>]*class=["'][^"']*t2l-part-divider[^"']*["'][^>]*>[\s\S]*?<span[^>]*class=["'][^"']*text-[^"']*["'][^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/div>/gi,
        '\n$1\n'
      );
      eHtml = eHtml.replace(/<strong>\s*([^<:]+:\s*)<\/strong>/gi, '\n$1\n');
      eHtml = eHtml.replace(/<br\s*\/?>/gi, '\n');
      const pMatches = eHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [eHtml];
      const skipWords = new Set(['home', 'movies', 'music directors', 'lyricists', 'tamil2lyrics', 'copy', 'a+', 'a-']);
      for (const p of pMatches) {
        const clean = p.replace(/<[^>]+>/g, '').trim();
        const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);
        for (const line of lines) {
          const lClean = line.toLowerCase();
          if (
            !skipWords.has(lClean) &&
            line.length > 1 &&
            !line.startsWith('http') &&
            !lClean.includes('track from') &&
            !lClean.includes('lyrics is the') &&
            !lClean.startsWith('singers :') &&
            !lClean.startsWith('music director :') &&
            !lClean.startsWith('lyricist :')
          ) {
            lyricsTanglish.push(line);
          }
        }
      }
    }

    // 3. Fallback scan across all <p> and t2l-verse tags if either is missing
    if (lyricsTamil.length === 0 || lyricsTanglish.length === 0) {
      const allP = pageHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
      for (const p of allP) {
        const clean = p.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
        if (!clean) continue;
        const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);
        const hasTamilChar = /[\u0B80-\u0BFF]/.test(clean);

        if (hasTamilChar && lyricsTamil.length === 0) {
          lyricsTamil.push(...lines);
        } else if (!hasTamilChar && lyricsTanglish.length === 0) {
          if (p.includes('t2l-verse') || lines.length > 1) {
            lyricsTanglish.push(...lines);
          }
        }
      }
    }

    // Do NOT copy Tanglish into Tamil if no Tamil script exists on page!
    // A song with only English lyrics will correctly have lyricsTamil = []

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

// GET /api/songs/:slug - Retrieve complete song data with full Tamil & Tanglish lyrics
// On-demand scraping ensures any song URL automatically fetches authentic Apple Music artwork & lyrics
app.get('/api/songs/:slug', async (c) => {
  const slug = c.req.param('slug');
  let song = songMap.get(slug) || songs.find((s) => s.slug === slug || s.id === slug);

  if (!song) {
    // Attempt real-time ingestion from Tamil archive
    const targetUrl = `https://www.tamil2lyrics.com/lyrics/${slug}/`;
    const scraped = await scrapeSongPage(targetUrl);
    if (scraped) {
      if (!songMap.has(scraped.id)) {
        songs.unshift(scraped);
      }
      songMap.set(scraped.id, scraped);
      songMap.set(scraped.slug, scraped);
      song = scraped;
    }
  }

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

// POST /api/scrape-on-demand - Real-time AI Deep Search & Ingestion
app.post('/api/scrape-on-demand', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const query = (body.query || c.req.query('q') || '').trim();
    const type: 'movie' | 'song' = body.type === 'movie' ? 'movie' : 'song';
    let targetMovieUrl = (body.targetMovieUrl || body.movieUrl || '').trim();
    const requestedYear = body.year ? parseInt(String(body.year), 10) : undefined;

    if (!query && !targetMovieUrl) {
      return c.json({ success: false, error: 'Query or movie URL is required' }, 400);
    }

    const qLower = query.toLowerCase();

    if (type === 'movie') {
      let movieTitleForSearch = query;

      // If no explicit targetMovieUrl was provided, check online candidate movies
      if (!targetMovieUrl) {
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
        const rawCandidates = parseMovieCandidatesFromSearchHtml(html, query);

        // If a specific year was requested, check if candidates match that year
        let effectiveCandidates = rawCandidates;
        if (requestedYear && rawCandidates.length > 1) {
          const yearMatched = rawCandidates.filter((cand) => cand.year === requestedYear);
          if (yearMatched.length >= 1) {
            effectiveCandidates = yearMatched;
          }
        }

        // If multiple candidates still remain, check for exact slug or exact title match
        if (effectiveCandidates.length > 1) {
          const exactMatched = effectiveCandidates.filter(
            (cand) =>
              cand.slug === qLower ||
              cand.title.toLowerCase().trim() === qLower ||
              cand.slug === toSlug(query)
          );
          if (exactMatched.length === 1) {
            effectiveCandidates = exactMatched;
          }
        }

        // If MULTIPLE candidate movies exist, let the user pick which one they want!
        if (effectiveCandidates.length > 1) {
          const candidateMovies = await Promise.all(
            effectiveCandidates.map(async (cand) => {
              const poster = await fetchMovieAlbumArtwork(cand.title, undefined, cand.year);
              return {
                id: `${cand.slug}_${cand.year}`,
                slug: cand.slug,
                title: cand.title,
                year: cand.year,
                trackCount: cand.trackCount,
                posterUrl: poster,
                url: cand.url,
                movieUrl: cand.url,
              };
            })
          );

          return c.json({
            success: true,
            type: 'movie-selection',
            query,
            movies: candidateMovies,
            count: candidateMovies.length,
          });
        }

        if (effectiveCandidates.length === 1) {
          targetMovieUrl = effectiveCandidates[0].url;
          movieTitleForSearch = effectiveCandidates[0].title;
        } else {
          // Fallback to legacy regex if candidate parser found 0
          const movieLinks = Array.from(
            new Set(
              (html.match(/href=["'](https?:\/\/(?:www\.)?tamil2lyrics\.com\/movie\/[^"']+)["']/gi) || []).map(
                (s) => s.replace(/href=["']|["']/gi, '')
              )
            )
          );
          targetMovieUrl = movieLinks.find((l) => l.toLowerCase().includes(qLower)) || movieLinks[0];
        }
      }

      let songLinks: string[] = [];

      if (targetMovieUrl) {
        // Fetch movie album page to get all song tracks
        const mResp = await fetch(targetMovieUrl, {
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

      // If no dedicated movie page or no tracks found, extract matching song links from search page
      if (songLinks.length === 0) {
        const searchUrl = `https://www.tamil2lyrics.com/?s=${encodeURIComponent(query)}`;
        const searchResp = await fetch(searchUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
        });
        if (searchResp.ok) {
          const html = await searchResp.text();
          const found = html.match(/href=["'](https?:\/\/(?:www\.)?tamil2lyrics\.com\/lyrics\/[^"']+)["']/gi) || [];
          songLinks = Array.from(
            new Set(
              found.map((s) => s.replace(/href=["']|["']/gi, ''))
            )
          );
        }
      }

      if (songLinks.length === 0) {
        // Check if songs exist in cache as fallback
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
        return c.json({ success: false, error: `No songs or movie album found for "${query}"` }, 404);
      }

      // Collect all tracks in this movie album
      const allMovieSongs: Song[] = [];
      const toScrape: string[] = [];

      for (const link of songLinks) {
        const slug = link.replace(/\/+$/, '').split('/').pop() || '';
        const songId = slug.replace('-song-lyrics', '');
        const existing = songMap.get(songId) || songMap.get(slug);

        if (existing && existing.lyricsTamil && existing.lyricsTamil.length > 0) {
          allMovieSongs.push(existing);
        } else {
          toScrape.push(link);
        }
      }

      // Scrape missing tracks concurrently (batches of 4)
      const batchSize = 4;
      for (let i = 0; i < toScrape.length; i += batchSize) {
        const batch = toScrape.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map((link) => scrapeSongPage(link, undefined, movieTitleForSearch || query))
        );
        for (const s of results) {
          if (s) {
            if (!s.movie || s.movie === 'Tamil Single') {
              s.movie = movieTitleForSearch || query;
            }
            if (requestedYear) {
              s.year = requestedYear;
            }
            if (!songMap.has(s.id)) {
              songs.unshift(s);
            }
            songMap.set(s.id, s);
            songMap.set(s.slug, s);
            allMovieSongs.push(s);
          }
        }
      }

      const rawDetectedMovie =
        allMovieSongs.find((s) => s.movie && s.movie !== 'Tamil Single')?.movie || movieTitleForSearch || query;

      const detectedMovieTitle = rawDetectedMovie
        .split(/[-–|]|(?:\s+tamil\s+(?:film|movie))/i)[0]
        .trim() || query;

      const detectedYear =
        requestedYear ||
        allMovieSongs.find((s) => s.year && s.year !== 2024)?.year ||
        2024;

      const detectedComposer =
        allMovieSongs.find((s) => s.composer && s.composer !== 'Anirudh Ravichander')?.composer ||
        allMovieSongs[0]?.composer;

      // Ensure every song in this album has the clean detected movie title and year
      allMovieSongs.forEach((s) => {
        s.movie = detectedMovieTitle;
        if (detectedYear) s.year = detectedYear;
      });

      // Fetch primary official album artwork for the movie using dedicated soundtrack search with year!
      const albumArtwork = await fetchMovieAlbumArtwork(
        detectedMovieTitle,
        detectedComposer,
        detectedYear
      );

      // Prioritize authentic mzstatic artwork from the movie album search or from any authentic track
      const bestArtwork =
        (albumArtwork && !albumArtwork.includes('default-cover') ? albumArtwork : '') ||
        allMovieSongs.find((s) => s.coverUrl && s.coverUrl.includes('mzstatic'))?.coverUrl ||
        albumArtwork ||
        '/default-cover.svg';

      // Enforce uniform, official album artwork across ALL tracks in this movie album!
      if (bestArtwork && !bestArtwork.includes('default-cover')) {
        allMovieSongs.forEach((s) => {
          s.coverUrl = bestArtwork;
          s.backdropUrl = bestArtwork;
          songMap.set(s.id, s);
          if (s.slug) songMap.set(s.slug, s);
        });
      }

      return c.json({
        success: true,
        type: 'movie',
        source: 'deep-scrape',
        movieTitle: detectedMovieTitle,
        year: detectedYear,
        songs: allMovieSongs,
        count: allMovieSongs.length,
      });
    } else {
      // Individual Song Deep Scrape
      const existing = songs.find(
        (s) =>
          s.title.toLowerCase() === qLower ||
          s.title.toLowerCase().includes(qLower) ||
          s.slug === qLower
      );
      if (existing && existing.lyricsTamil && existing.lyricsTamil.length > 5) {
        return c.json({
          success: true,
          type: 'song',
          source: 'cache',
          song: existing,
          songs: [existing],
        });
      }

      // Build search variations including phonetic normalization to find songs even with typos
      const searchVariations = [
        query,
        query.replace(/choran/gi, 'chozhan').replace(/cholan/gi, 'chozhan'),
        query.replace(/chozhan/gi, 'cholan'),
        query.replace(/song\s*lyrics/gi, '').trim(),
      ];

      // Also try querying iTunes if it finds a more canonical Tamil song title
      try {
        const itunesResp = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=3`,
          { headers: { 'User-Agent': 'Mozilla/5.0' } }
        );
        if (itunesResp.ok) {
          const itunesData: any = await itunesResp.json();
          if (itunesData?.results?.length > 0) {
            for (const item of itunesData.results) {
              if (item.trackName) searchVariations.push(item.trackName);
            }
          }
        }
      } catch {}

      const uniqueVariations = Array.from(new Set(searchVariations.filter(Boolean)));
      let linkMatch: RegExpMatchArray | null = null;
      let matchedSearchText = query;

      for (const sVar of uniqueVariations) {
        try {
          const searchUrl = `https://www.tamil2lyrics.com/?s=${encodeURIComponent(sVar)}`;
          const searchResp = await fetch(searchUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            },
          });

          if (searchResp.ok) {
            const html = await searchResp.text();
            linkMatch =
              html.match(/href=["'](https?:\/\/(?:www\.)?tamil2lyrics\.com\/lyrics\/[a-zA-Z0-9_-]+-song-lyrics\/?)["']/i) ||
              html.match(/href=["'](https?:\/\/(?:www\.)?tamil2lyrics\.com\/lyrics\/[a-zA-Z0-9_-]+\/?)["']/i);

            if (linkMatch) {
              matchedSearchText = sVar;
              break;
            }
          }
        } catch {}
      }

      if (!linkMatch) {
        if (existing) {
          return c.json({
            success: true,
            type: 'song',
            source: 'cache',
            song: existing,
            songs: [existing],
          });
        }
        return c.json({ success: false, error: `No matching song found for "${query}"` }, 404);
      }

      const targetUrl = linkMatch[1];
      const newSong = await scrapeSongPage(targetUrl, query);

      if (!newSong) {
        if (existing) {
          return c.json({
            success: true,
            type: 'song',
            source: 'cache',
            song: existing,
            songs: [existing],
          });
        }
        return c.json({ success: false, error: 'Failed to parse song lyrics' }, 502);
      }

      // Guarantee authentic high-resolution Apple Music artwork
      if (!newSong.coverUrl || newSong.coverUrl.includes('default-cover')) {
        const art = await fetchCleanArtwork(newSong.title, newSong.movie, newSong.composer);
        if (art && !art.includes('default-cover')) {
          newSong.coverUrl = art;
          newSong.backdropUrl = art;
        }
      }

      if (!songMap.has(newSong.id)) {
        songs.unshift(newSong);
      }
      songMap.set(newSong.id, newSong);
      songMap.set(newSong.slug, newSong);

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

// In-memory feedback/corrections store
export interface SongCorrection {
  id: string;
  songId: string;
  songTitle: string;
  movie: string;
  type: 'artwork' | 'lyrics';
  correctionValue: any; // artwork URL string OR { tamil: string[]; tanglish: string[] }
  customNotes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

const feedbackStore: SongCorrection[] = [];

// POST /api/scrape-alternatives - Search online for alternative artwork or lyrics
app.post('/api/scrape-alternatives', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const title = (body.title || '').trim();
    const movie = (body.movie || '').trim();
    const composer = (body.composer || '').trim();
    const type: 'artwork' | 'lyrics' = body.type === 'lyrics' ? 'lyrics' : 'artwork';

    if (!title) {
      return c.json({ success: false, error: 'Title is required' }, 400);
    }

    if (type === 'artwork') {
      const cleanTitle = title.replace(/lyrics/gi, '').trim();
      const cleanMovie = movie.replace(/tamil\s*(?:film|movie).*/gi, '').trim();

      const candidateUrls: string[] = [];
      const queries = [
        `${cleanTitle} ${cleanMovie}`,
        `${cleanTitle} Tamil`,
        `${cleanMovie} Tamil Soundtrack`,
        `${cleanMovie} Tamil`,
      ].filter(Boolean);

      for (const q of queries) {
        try {
          const resp = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=5`,
            {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              },
            }
          );
          if (resp.ok) {
            const data: any = await resp.json();
            for (const item of data?.results || []) {
              if (item.artworkUrl100) {
                const highRes = item.artworkUrl100.replace('100x100bb', '800x800bb');
                if (!candidateUrls.includes(highRes)) {
                  candidateUrls.push(highRes);
                }
              }
            }
          }
        } catch {
          // Continue
        }
      }

      // Also search album covers
      if (cleanMovie) {
        try {
          const resp = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(`${cleanMovie} Tamil`)}&entity=album&limit=4`,
            {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              },
            }
          );
          if (resp.ok) {
            const data: any = await resp.json();
            for (const item of data?.results || []) {
              if (item.artworkUrl100) {
                const highRes = item.artworkUrl100.replace('100x100bb', '800x800bb');
                if (!candidateUrls.includes(highRes)) {
                  candidateUrls.push(highRes);
                }
              }
            }
          }
        } catch {
          // Continue
        }
      }

      return c.json({
        success: true,
        type: 'artwork',
        options: candidateUrls.slice(0, 8),
      });
    } else {
      // Scrape alternative lyrics from online archives
      const searchUrl = `https://www.tamil2lyrics.com/?s=${encodeURIComponent(`${title} ${movie}`)}`;
      const searchResp = await fetch(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      });

      const options: Array<{ title: string; source: string; lyricsTamil: string[]; lyricsTanglish: string[] }> = [];

      if (searchResp.ok) {
        const html = await searchResp.text();
        const matches = Array.from(
          new Set(
            (html.match(/href=["'](https?:\/\/(?:www\.)?tamil2lyrics\.com\/lyrics\/[a-zA-Z0-9_-]+-song-lyrics\/?)["']/gi) || [])
              .map((s) => s.replace(/href=["']|["']/gi, ''))
          )
        );

        for (const link of matches.slice(0, 3)) {
          const parsed = await scrapeSongPage(link, title, movie);
          if (parsed && (parsed.lyricsTamil.length > 0 || parsed.lyricsTanglish.length > 0)) {
            options.push({
              title: parsed.title || title,
              source: link,
              lyricsTamil: parsed.lyricsTamil,
              lyricsTanglish: parsed.lyricsTanglish,
            });
          }
        }
      }

      return c.json({
        success: true,
        type: 'lyrics',
        options,
      });
    }
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Scrape alternatives failed' }, 500);
  }
});

// POST /api/feedback - User submits wrong artwork/lyrics report
app.post('/api/feedback', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    if (!body.songId || !body.type || !body.correctionValue) {
      return c.json({ success: false, error: 'Missing required feedback fields' }, 400);
    }

    const item: SongCorrection = {
      id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      songId: body.songId,
      songTitle: body.songTitle || 'Unknown Song',
      movie: body.movie || 'Unknown Movie',
      type: body.type,
      correctionValue: body.correctionValue,
      customNotes: body.customNotes || '',
      status: 'pending',
      createdAt: Date.now(),
    };

    feedbackStore.unshift(item);

    return c.json({
      success: true,
      message: 'Correction submitted for admin review',
      feedback: item,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Feedback submission failed' }, 500);
  }
});

// GET /api/admin/feedback - List all submissions for admin review
app.get('/api/admin/feedback', (c) => {
  return c.json({
    success: true,
    count: feedbackStore.length,
    data: feedbackStore,
  });
});

// POST /api/admin/feedback/:id/approve - Approve and apply edit live
app.post('/api/admin/feedback/:id/approve', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const item = feedbackStore.find((f) => f.id === id);

    if (!item) {
      return c.json({ success: false, error: 'Feedback item not found' }, 404);
    }

    item.status = 'approved';

    // Allow admin to override the correction value with edits before applying
    const finalValue = body.correctionValue !== undefined ? body.correctionValue : item.correctionValue;

    // Apply to in-memory song catalog
    const song = songMap.get(item.songId);
    if (song) {
      if (item.type === 'artwork') {
        song.coverUrl = finalValue;
        song.backdropUrl = finalValue;
      } else if (item.type === 'lyrics') {
        if (Array.isArray(finalValue)) {
          song.lyricsTamil = finalValue;
        } else if (finalValue && typeof finalValue === 'object') {
          if (finalValue.tamil) song.lyricsTamil = finalValue.tamil;
          if (finalValue.tanglish) song.lyricsTanglish = finalValue.tanglish;
        }
      }
      songMap.set(song.id, song);
      if (song.slug) songMap.set(song.slug, song);
    }

    return c.json({
      success: true,
      message: 'Correction approved and applied live',
      data: item,
      song,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Approval failed' }, 500);
  }
});

// POST /api/admin/feedback/:id/reject - Reject submission
app.post('/api/admin/feedback/:id/reject', (c) => {
  const id = c.req.param('id');
  const item = feedbackStore.find((f) => f.id === id);

  if (!item) {
    return c.json({ success: false, error: 'Feedback item not found' }, 404);
  }

  item.status = 'rejected';

  return c.json({
    success: true,
    message: 'Correction rejected',
    data: item,
  });
});

export default app;


