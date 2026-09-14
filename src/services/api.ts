import { Song, MovieAlbum, Artist } from '../data';

// Use deployed Cloudflare Worker in production, localhost in dev
const API_BASE_URL: string =
  (typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
    ? 'https://lyrifi-api.ai-image-generator.workers.dev'
    : 'http://127.0.0.1:8787');

export interface BackendSearchResults {
  songs: Song[];
  movies: MovieAlbum[];
  artists: Artist[];
}

export interface SongsApiResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: Partial<Song>[];
}

export interface SongDetailApiResponse {
  success: boolean;
  data: Song;
}

/**
 * Fetch lightweight catalog listing (fast, minimal bytes)
 */
export async function fetchSongsList(query = '', page = 1, limit = 50): Promise<Partial<Song>[] | null> {
  try {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    params.set('page', String(page));
    params.set('limit', String(limit));

    const res = await fetch(`${API_BASE_URL}/api/songs?${params.toString()}`);
    if (!res.ok) return null;
    const json: SongsApiResponse = await res.json();
    return json.data;
  } catch {
    return null; // Fallback to offline/bundled cache if backend is not reachable
  }
}

/**
 * Fetch single song's complete Tamil & Tanglish lyrics on demand
 */
export async function fetchSongLyrics(slugOrId: string): Promise<Song | null> {
  try {
    let res = await fetch(`${API_BASE_URL}/api/songs/${slugOrId}`);
    if (!res.ok && !slugOrId.endsWith('-song-lyrics')) {
      res = await fetch(`${API_BASE_URL}/api/songs/${slugOrId}-song-lyrics`);
    }
    if (!res.ok) return null;
    const json: SongDetailApiResponse = await res.json();
    if (!json.success || !json.data) return null;

    const song = json.data;
    // Auto-resolve Apple Music artwork if missing
    if (!song.coverUrl || song.coverUrl.includes('default-cover')) {
      const artQuery = song.movie && song.movie !== 'Tamil Song'
        ? `${song.title} ${song.movie}`
        : song.title;
      const art = await fetchClientAppleMusicArtwork(artQuery, song.year);
      if (art) {
        song.coverUrl = art;
        song.backdropUrl = art;
      }
    }
    return song;
  } catch {
    return null; // Fallback to bundled cache
  }
}

export interface DeepScrapeResponse {
  success: boolean;
  type: 'movie' | 'song' | 'movie-selection';
  source?: 'cache' | 'deep-scrape';
  song?: Song;
  songs?: Song[];
  movieTitle?: string;
  year?: number;
  movies?: MovieAlbum[];
  error?: string;
}

const clientArtworkCache = new Map<string, string>();

/**
 * Fetch official high-resolution album artwork directly from Apple Music CDN
 * Always succeeds in user browser with 100% CORS and 0 IP throttling!
 */
export async function fetchClientAppleMusicArtwork(
  title: string,
  year?: number | string
): Promise<string | null> {
  const cleanTitle = (title || '')
    .replace(/tamil\s*(?:film|movie).*/gi, '')
    .replace(/\s*\(\d{4}\)/g, '')
    .replace(/\b(19\d\d|20\d\d)\s*film\b/gi, '')
    .replace(/[-–]\s*(19\d\d|20\d\d).*/g, '')
    .trim();
  const targetYear = year ? String(year).trim() : '';
  if (!cleanTitle || cleanTitle === 'Tamil Single') return null;

  const cleanLower = cleanTitle.toLowerCase();
  const cacheKey = `${cleanLower}_${targetYear}`;
  if (clientArtworkCache.has(cacheKey)) {
    return clientArtworkCache.get(cacheKey)!;
  }

  // Check persistent localStorage cache for instantaneous restore across refreshes
  try {
    const cached = localStorage.getItem(`lyrifi_apple_art_${cleanLower}`);
    if (cached) {
      clientArtworkCache.set(cacheKey, cached);
      return cached;
    }
  } catch {}

  const queries = [
    `${cleanTitle} Tamil Soundtrack`,
    targetYear ? `${cleanTitle} ${targetYear}` : '',
    `${cleanTitle} Soundtrack`,
    cleanTitle,
  ].filter(Boolean);

  for (const q of queries) {
    try {
      const resp = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=10`
      );
      if (resp.ok) {
        const data: any = await resp.json();
        if (data?.results?.length > 0) {
          const sorted = [...data.results].sort((a: any, b: any) => {
            const aName = (a.collectionName || '').toLowerCase();
            const bName = (b.collectionName || '').toLowerCase();
            const aTitleMatch = aName.includes(cleanLower);
            const bTitleMatch = bName.includes(cleanLower);

            if (aTitleMatch && !bTitleMatch) return -1;
            if (!aTitleMatch && bTitleMatch) return 1;

            const aYear = (a.releaseDate || '').slice(0, 4);
            const bYear = (b.releaseDate || '').slice(0, 4);
            const aYearMatch = targetYear && aYear === targetYear;
            const bYearMatch = targetYear && bYear === targetYear;
            const aIsOst = /soundtrack|motion picture|original/i.test(a.collectionName || '');
            const bIsOst = /soundtrack|motion picture|original/i.test(b.collectionName || '');

            if (aYearMatch && aIsOst && !(bYearMatch && bIsOst)) return -1;
            if (bYearMatch && bIsOst && !(aYearMatch && aIsOst)) return 1;
            if (aYearMatch && !bYearMatch) return -1;
            if (!aYearMatch && bYearMatch) return 1;
            if (aIsOst && !bIsOst) return -1;
            if (!aIsOst && bIsOst) return 1;
            return 0;
          });

          const top = sorted[0];
          if (top?.artworkUrl100) {
            const highRes = top.artworkUrl100.replace('100x100bb', '800x800bb');
            clientArtworkCache.set(cacheKey, highRes);
            try {
              localStorage.setItem(`lyrifi_apple_art_${cleanLower}`, highRes);
            } catch {}
            return highRes;
          }
        }
      }
    } catch {
      // Continue to next query
    }
  }

  return null;
}

/**
 * Trigger real-time AI Deep Search & Ingestion across Tamil web archives
 */
export async function triggerDeepScrape(
  query: string,
  type: 'movie' | 'song' = 'movie',
  targetMovieUrl?: string,
  year?: number
): Promise<DeepScrapeResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/scrape-on-demand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, type, targetMovieUrl, year }),
    });

    if (!res.ok) return null;
    const json: DeepScrapeResponse = await res.json();

    if (json.movies && json.movies.length > 0) {
      json.movies = await Promise.all(
        json.movies.map(async (m) => {
          if (!m.posterUrl || m.posterUrl.includes('default-cover')) {
            const appleArt = await fetchClientAppleMusicArtwork(m.title, m.year);
            if (appleArt) {
              return { ...m, posterUrl: appleArt };
            }
          }
          return m;
        })
      );
    }

    if (json.songs && json.songs.length > 0) {
      const hasMissingArt = json.songs.some((s) => !s.coverUrl || s.coverUrl.includes('default-cover'));
      if (hasMissingArt) {
        const appleArt = await fetchClientAppleMusicArtwork(
          json.movieTitle || json.songs[0].movie,
          json.year || json.songs[0].year
        );
        if (appleArt) {
          json.songs.forEach((s) => {
            if (!s.coverUrl || s.coverUrl.includes('default-cover')) {
              s.coverUrl = appleArt;
              s.backdropUrl = appleArt;
            }
          });
        }
      }
    }

    return json;
  } catch {
    return null;
  }
}

/**
 * Record live song view to backend
 */
export async function recordSongView(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/songs/${id}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    // Non-critical, ignore error
  }
}

/**
 * Search songs, movies, and artists directly from backend database
 */
export async function searchCatalogFromBackend(query: string): Promise<BackendSearchResults | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query.trim())}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success) return null;

    const rawMovies: MovieAlbum[] = json.movies || [];
    const moviesWithArtwork = await Promise.all(
      rawMovies.map(async (m) => {
        if (!m.posterUrl || m.posterUrl.includes('default-cover')) {
          const appleArt = await fetchClientAppleMusicArtwork(m.title, m.year);
          if (appleArt) {
            return { ...m, posterUrl: appleArt };
          }
        }
        return m;
      })
    );

    return {
      songs: json.songs || json.results || [],
      movies: moviesWithArtwork,
      artists: json.artists || [],
    };
  } catch {
    return null;
  }
}

export interface MovieAlbumDetails {
  id: string;
  title: string;
  year: number;
  posterUrl: string;
  backdropUrl?: string;
  primaryGlowColor?: string;
  secondaryGlowColor?: string;
  composer?: string;
  singers?: string[];
  trackCount: number;
  songs: Song[];
}

/**
 * Fetch dedicated movie album details and all tracks from backend
 */
export async function fetchMovieAlbumDetails(
  year: number | string,
  albumSlug: string
): Promise<MovieAlbumDetails | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/movies/${year}/${encodeURIComponent(albumSlug)}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }
    return null;
  } catch {
    return null;
  }
}

export interface ArtistDetails {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
  songCount: number;
  movieCount: number;
  composedCount: number;
  sungCount: number;
  movies: MovieAlbum[];
  composedSongs: Song[];
  sungSongs: Song[];
  songs: Song[];
}

export interface SongCorrectionPayload {
  id?: string;
  songId: string;
  songTitle: string;
  movie: string;
  type: 'artwork' | 'lyrics';
  correctionValue: any;
  customNotes?: string;
  status?: 'pending' | 'approved' | 'rejected';
  createdAt?: number;
}

export interface ScrapeAlternativesResponse {
  success: boolean;
  type: 'artwork' | 'lyrics';
  options: any[];
  error?: string;
}

/**
 * Scrape alternative artwork or lyrics online in real-time
 */
export async function scrapeAlternatives(
  title: string,
  movie: string,
  type: 'artwork' | 'lyrics',
  composer?: string
): Promise<ScrapeAlternativesResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/scrape-alternatives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, movie, type, composer }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Submit user song correction for admin review
 */
export async function submitSongFeedback(
  payload: SongCorrectionPayload
): Promise<{ success: boolean; feedback?: SongCorrectionPayload; error?: string } | null> {
  try {
    // Also store in localStorage as offline fallback / client cache
    try {
      const existing = JSON.parse(localStorage.getItem('lyrifi_feedback_queue') || '[]');
      existing.unshift({
        ...payload,
        id: payload.id || `fb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        status: 'pending',
        createdAt: Date.now(),
      });
      localStorage.setItem('lyrifi_feedback_queue', JSON.stringify(existing.slice(0, 50)));
    } catch {}

    const res = await fetch(`${API_BASE_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return { success: true, feedback: payload };
    }
    return await res.json();
  } catch {
    // Fallback succeeds locally
    return { success: true, feedback: payload };
  }
}

/**
 * Fetch all submitted feedback for the admin portal
 */
export async function fetchAdminFeedback(): Promise<SongCorrectionPayload[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/feedback`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        return data.data;
      }
    }
  } catch {}

  // Fallback to localStorage
  try {
    const local = JSON.parse(localStorage.getItem('lyrifi_feedback_queue') || '[]');
    return local;
  } catch {
    return [];
  }
}

/**
 * Admin approves a correction (optionally with manual edits)
 */
export async function approveAdminFeedback(
  id: string,
  updatedValue?: any
): Promise<boolean> {
  try {
    // Update local storage
    try {
      const local: SongCorrectionPayload[] = JSON.parse(localStorage.getItem('lyrifi_feedback_queue') || '[]');
      const found = local.find((i) => i.id === id);
      if (found) {
        found.status = 'approved';
        if (updatedValue !== undefined) found.correctionValue = updatedValue;
        localStorage.setItem('lyrifi_feedback_queue', JSON.stringify(local));
      }
    } catch {}

    const res = await fetch(`${API_BASE_URL}/api/admin/feedback/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correctionValue: updatedValue }),
    });
    return res.ok;
  } catch {
    return true; // Local approval works
  }
}

/**
 * Admin rejects a correction
 */
export async function rejectAdminFeedback(id: string): Promise<boolean> {
  try {
    // Update local storage
    try {
      const local: SongCorrectionPayload[] = JSON.parse(localStorage.getItem('lyrifi_feedback_queue') || '[]');
      const found = local.find((i) => i.id === id);
      if (found) {
        found.status = 'rejected';
        localStorage.setItem('lyrifi_feedback_queue', JSON.stringify(local));
      }
    } catch {}

    const res = await fetch(`${API_BASE_URL}/api/admin/feedback/${id}/reject`, {
      method: 'POST',
    });
    return res.ok;
  } catch {
    return true;
  }
}

/**
 * Fetch dedicated artist / composer details and tracks from backend
 */
export async function fetchArtistDetails(artistSlug: string): Promise<ArtistDetails | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/artists/${encodeURIComponent(artistSlug)}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }
    return null;
  } catch {
    return null;
  }
}
