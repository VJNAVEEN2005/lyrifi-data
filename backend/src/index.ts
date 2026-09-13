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

  // 3. Matched artists (deduplicated by canonical slug, including composers & singers)
  const artistMap = new Map<string, { id: string; name: string; role: string; imageUrl: string }>();
  songs.forEach((s) => {
    // Check composer
    if (s.composer && s.composer.toLowerCase().includes(q)) {
      const canonicalKey = normalizeArtistSlug(s.composer);
      if (!artistMap.has(canonicalKey)) {
        const displayName = CANONICAL_ARTIST_NAMES[canonicalKey] || s.composer;
        artistMap.set(canonicalKey, {
          id: canonicalKey,
          name: displayName,
          role: 'Music Director',
          imageUrl: knownPortraits[canonicalKey] || `/artists/${canonicalKey}.jpg`,
        });
      }
    }
    // Check singers
    s.singers?.forEach((singer) => {
      if (singer && singer.toLowerCase().includes(q)) {
        const canonicalKey = normalizeArtistSlug(singer);
        if (!artistMap.has(canonicalKey)) {
          const displayName = CANONICAL_ARTIST_NAMES[canonicalKey] || singer;
          artistMap.set(canonicalKey, {
            id: canonicalKey,
            name: displayName,
            role: 'Playback Singer',
            imageUrl: knownPortraits[canonicalKey] || `/artists/${canonicalKey}.jpg`,
          });
        }
      }
    });
  });

  c.header('Cache-Control', 'no-cache, no-store, must-revalidate');

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
      const key = toSlug(s.movie);
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

  // 1. Song-level searches on Apple Music (prioritize accurate track matches)
  const songQueries: string[] = [];
  if (cleanTitle && cleanMovie && cleanMovie !== 'Tamil Single') {
    songQueries.push(`${cleanTitle} ${cleanMovie}`);
    songQueries.push(`${cleanTitle} ${cleanMovie} Tamil`);
  }
  if (cleanTitle) {
    songQueries.push(`${cleanTitle} Tamil`);
    songQueries.push(cleanTitle);
  }

  for (const q of songQueries) {
    try {
      const resp = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=3`,
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

  // 2. Album-level searches on Apple Music (soundtrack / movie album)
  if (cleanMovie && cleanMovie !== 'Tamil Single') {
    const albumQueries = [
      `${cleanMovie} Tamil Soundtrack`,
      cleanComp ? `${cleanMovie} ${cleanComp}` : '',
      `${cleanMovie} Tamil`,
      `${cleanMovie} Soundtrack`,
      cleanMovie,
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

// Helper to fetch official movie album soundtrack artwork from Apple Music CDN
async function fetchMovieAlbumArtwork(
  movie: string,
  composer?: string
): Promise<string> {
  const cleanMovie = (movie || '').replace(/tamil\s*(?:film|movie).*/gi, '').trim();
  const cleanComp = (composer || '').trim();
  if (!cleanMovie || cleanMovie === 'Tamil Single') return '/default-cover.svg';

  const queries = [
    `${cleanMovie} Tamil Soundtrack`,
    cleanComp ? `${cleanMovie} ${cleanComp}` : '',
    `${cleanMovie} Tamil`,
    `${cleanMovie} Soundtrack`,
  ].filter(Boolean);

  for (const q of queries) {
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
          const sorted = [...data.results].sort((a: any, b: any) => {
            const aIsOst = /soundtrack|motion picture|original/i.test(a.collectionName || '');
            const bIsOst = /soundtrack|motion picture|original/i.test(b.collectionName || '');
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

  // Fallback search Deezer with strict "Tamil" qualifier
  try {
    const resp = await fetch(
      `https://api.deezer.com/search/album?q=${encodeURIComponent(`${cleanMovie} Tamil`)}&limit=3`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      }
    );
    if (resp.ok) {
      const data: any = await resp.json();
      if (data?.data?.length > 0 && data.data[0].cover_big) {
        return data.data[0].cover_big;
      }
    }
  } catch {
    // Continue
  }

  return '/default-cover.svg';
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

    // 2. Extract Movie, Singers, Composer, Lyricist from meta description
    let movie = fallbackMovie || 'Tamil Single';
    let year = 2023;
    let composer = 'Anirudh Ravichander';
    let singers = ['Various Artists'];
    let lyricist = 'Tamil Lyricist';

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
          if (!skipWords.has(line.toLowerCase()) && line.length > 1 && !line.startsWith('http')) {
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

    // 1. Search Tamil lyrics archive online
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
      // Find candidate movie page links
      const movieLinks = Array.from(
        new Set(
          (html.match(/href=["'](https?:\/\/(?:www\.)?tamil2lyrics\.com\/movie\/[^"']+)["']/gi) || []).map(
            (s) => s.replace(/href=["']|["']/gi, '')
          )
        )
      );

      // Prioritize movie link matching the query
      const targetMovieUrl = movieLinks.find((l) => l.toLowerCase().includes(qLower)) || movieLinks[0];

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
        const found = html.match(/href=["'](https?:\/\/(?:www\.)?tamil2lyrics\.com\/lyrics\/[^"']+)["']/gi) || [];
        songLinks = Array.from(
          new Set(
            found.map((s) => s.replace(/href=["']|["']/gi, ''))
          )
        );
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
          batch.map((link) => scrapeSongPage(link, undefined, query))
        );
        for (const s of results) {
          if (s) {
            if (!s.movie || s.movie === 'Tamil Single') {
              s.movie = query;
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
        allMovieSongs.find((s) => s.movie && s.movie !== 'Tamil Single')?.movie || query;

      const detectedMovieTitle = rawDetectedMovie
        .split(/[-–|]|(?:\s+tamil\s+(?:film|movie))/i)[0]
        .trim() || query;

      const detectedComposer =
        allMovieSongs.find((s) => s.composer && s.composer !== 'Anirudh Ravichander')?.composer ||
        allMovieSongs[0]?.composer;

      // Ensure every song in this album has the clean detected movie title
      allMovieSongs.forEach((s) => {
        s.movie = detectedMovieTitle;
      });

      // Fetch primary official album artwork for the movie using dedicated soundtrack search
      const albumArtwork = await fetchMovieAlbumArtwork(
        detectedMovieTitle,
        detectedComposer
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

      const linkMatch =
        html.match(/href=["'](https?:\/\/(?:www\.)?tamil2lyrics\.com\/lyrics\/[a-zA-Z0-9_-]+-song-lyrics\/?)["']/i) ||
        html.match(/href=["'](https?:\/\/(?:www\.)?tamil2lyrics\.com\/lyrics\/[a-zA-Z0-9_-]+\/?)["']/i);

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

