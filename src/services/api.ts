import { Song, MovieAlbum, Artist } from '../data';

// If Cloudflare Worker is deployed or running locally, use it; otherwise fallback cleanly
const API_BASE_URL = ((import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL) || 'http://127.0.0.1:8787';

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
    const res = await fetch(`${API_BASE_URL}/api/songs/${slugOrId}`);
    if (!res.ok) return null;
    const json: SongDetailApiResponse = await res.json();
    return json.data;
  } catch {
    return null; // Fallback to bundled cache
  }
}

export interface DeepScrapeResponse {
  success: boolean;
  type: 'movie' | 'song';
  source: 'cache' | 'deep-scrape';
  song?: Song;
  songs?: Song[];
  movieTitle?: string;
  error?: string;
}

/**
 * Trigger real-time AI Deep Search & Ingestion across Tamil web archives
 */
export async function triggerDeepScrape(
  query: string,
  type: 'movie' | 'song' = 'movie'
): Promise<DeepScrapeResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/scrape-on-demand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, type }),
    });

    if (!res.ok) return null;
    const json = await res.json();
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
    return {
      songs: json.songs || json.results || [],
      movies: json.movies || [],
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



