import { calculateFuzzyScore, normalizePhonetic } from './fuzzySearch';

export interface CatalogSong {
  id: string;
  slug: string;
  title: string;
  isFromCatalog: true;
}

export interface CatalogAlbum {
  id: string;
  slug: string;
  title: string;
  isFromCatalog: true;
}

interface RawCatalog {
  version: number;
  totalSongs: number;
  totalAlbums: number;
  songs: string[];
  albums: string[];
}

let cachedCatalog: RawCatalog | null = null;
let loadPromise: Promise<RawCatalog | null> | null = null;

export function slugToTitle(slug: string): string {
  const clean = slug
    .replace(/-song-lyrics$/i, '')
    .replace(/-lyrics$/i, '');
  return clean
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Lazy loads the 21,000+ songs and 4,600+ albums master catalog from public CDN
 */
export async function getMasterCatalog(): Promise<RawCatalog | null> {
  if (cachedCatalog) return cachedCatalog;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const resp = await fetch('/catalog.json');
      if (!resp.ok) return null;
      const data: RawCatalog = await resp.json();
      cachedCatalog = data;
      return data;
    } catch {
      return null;
    }
  })();

  return loadPromise;
}

/**
 * Searches across all 20,936 songs and 4,657 albums with phonetic and fuzzy matching.
 */
export async function searchMasterCatalog(
  query: string,
  limit = 20
): Promise<{ songs: CatalogSong[]; albums: CatalogAlbum[] }> {
  const cleanQuery = (query || '').trim().toLowerCase();
  if (!cleanQuery || cleanQuery.length < 2) {
    return { songs: [], albums: [] };
  }

  const catalog = await getMasterCatalog();
  if (!catalog) {
    return { songs: [], albums: [] };
  }

  const queryWords = cleanQuery.split(/\s+/).filter(Boolean);
  const qNorm = normalizePhonetic(cleanQuery);
  const qNormWords = qNorm.split(/\s+/).filter(Boolean);

  // Match songs
  const matchedSongs: { item: CatalogSong; score: number }[] = [];
  const songsList = catalog.songs;

  for (let i = 0; i < songsList.length; i++) {
    const slug = songsList[i];
    const slugLower = slug.toLowerCase();

    // Fast reject check
    let potentialMatch = false;
    for (const w of queryWords) {
      if (slugLower.includes(w)) {
        potentialMatch = true;
        break;
      }
    }

    if (!potentialMatch && qNormWords.length > 0) {
      const slugNorm = normalizePhonetic(slugLower);
      for (const nw of qNormWords) {
        if (nw.length >= 3 && slugNorm.includes(nw)) {
          potentialMatch = true;
          break;
        }
      }
    }

    if (potentialMatch) {
      const title = slugToTitle(slug);
      const score = Math.max(
        calculateFuzzyScore(cleanQuery, title),
        calculateFuzzyScore(cleanQuery, slugLower.replace(/-/g, ' '))
      );

      if (score >= 40) {
        matchedSongs.push({
          item: {
            id: slug.replace(/-song-lyrics$/i, ''),
            slug,
            title,
            isFromCatalog: true,
          },
          score,
        });
      }
    }
  }

  // Sort songs by match score descending
  matchedSongs.sort((a, b) => b.score - a.score);
  const topSongs = matchedSongs.slice(0, limit).map((m) => m.item);

  // Match albums
  const matchedAlbums: { item: CatalogAlbum; score: number }[] = [];
  const albumsList = catalog.albums;

  for (let i = 0; i < albumsList.length; i++) {
    const slug = albumsList[i];
    const slugLower = slug.toLowerCase();

    let potentialMatch = false;
    for (const w of queryWords) {
      if (slugLower.includes(w)) {
        potentialMatch = true;
        break;
      }
    }

    if (!potentialMatch && qNormWords.length > 0) {
      const slugNorm = normalizePhonetic(slugLower);
      for (const nw of qNormWords) {
        if (nw.length >= 3 && slugNorm.includes(nw)) {
          potentialMatch = true;
          break;
        }
      }
    }

    if (potentialMatch) {
      const title = slugToTitle(slug);
      const score = Math.max(
        calculateFuzzyScore(cleanQuery, title),
        calculateFuzzyScore(cleanQuery, slugLower.replace(/-/g, ' '))
      );

      if (score >= 40) {
        matchedAlbums.push({
          item: {
            id: slug,
            slug,
            title,
            isFromCatalog: true,
          },
          score,
        });
      }
    }
  }

  matchedAlbums.sort((a, b) => b.score - a.score);
  const topAlbums = matchedAlbums.slice(0, limit).map((m) => m.item);

  return {
    songs: topSongs,
    albums: topAlbums,
  };
}
