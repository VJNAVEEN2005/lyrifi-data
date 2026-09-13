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
  activeLineIndexDefault?: number;
  youtubeId?: string | null;
  sourceUrl?: string;
  views?: number;
}

export interface MovieAlbum {
  id: string;
  title: string;
  year: number;
  posterUrl: string;
  trackCount: number;
  backdropUrl?: string;
  composer?: string;
  singers?: string[];
  songs?: Song[];
  movieUrl?: string;
}

export const slugifyMovieTitle = (title: string): string => {
  return (title || '')
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const getMovieUrl = (movie: { title: string; year?: number }): string => {
  const year = movie.year || 2024;
  const slug = slugifyMovieTitle(movie.title);
  return `/movie/${year}/${slug}`;
};

export interface Artist {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
  songCount?: number;
  movieCount?: number;
}

export const normalizeArtistSlug = (nameOrSlug: string): string => {
  const raw = (nameOrSlug || '')
    .toLowerCase()
    .trim()
    .replace(/['’\.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Consolidate known aliases & spelling variations to one canonical slug
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

export const slugifyArtistName = (name: string): string => {
  return normalizeArtistSlug(name);
};

export const getArtistUrl = (artist: { name: string }): string => {
  const slug = slugifyArtistName(artist.name);
  return `/artist/${slug}`;
};

export const KNOWN_ARTIST_PHOTOS: Record<string, string> = {
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

/**
 * Returns original photo for an artist, or clean avatar placeholder.
 * NEVER returns song or album cover photo!
 */
export const getArtistPhoto = (nameOrSlug: string): string => {
  if (!nameOrSlug) return '/artists/default-artist.svg';
  const slug = slugifyArtistName(nameOrSlug);
  if (KNOWN_ARTIST_PHOTOS[slug]) {
    return KNOWN_ARTIST_PHOTOS[slug];
  }
  const clean = slug.replace(/[^a-z0-9]/g, '');
  for (const [key, path] of Object.entries(KNOWN_ARTIST_PHOTOS)) {
    if (clean === key.replace(/[^a-z0-9]/g, '')) {
      return path;
    }
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(nameOrSlug)}&background=18181b&color=f43f5e&size=512&bold=true`;
};

export const sampleSongs: Song[] = [];

export const sampleMovies: MovieAlbum[] = [
  {
    "id": "coolie",
    "title": "Coolie",
    "year": 2025,
    "posterUrl": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/c6/49/b3/c649b3aa-21de-1541-e346-8b5683e5f2b3/194646005267.png/800x800bb.jpg",
    "trackCount": 6
  },
  {
    "id": "thug-life",
    "title": "Thug Life",
    "year": 2025,
    "posterUrl": "https://is1-ssl.mzstatic.com/image/thumb/Music/da/91/75/mzi.fyfplbwi.jpg/800x800bb.jpg",
    "trackCount": 5
  },
  {
    "id": "kuberaa",
    "title": "Kuberaa",
    "year": 2025,
    "posterUrl": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/f4/9e/4a/f49e4ac8-51c9-544b-3ab0-e1cd0f29a578/cover.jpg/800x800bb.jpg",
    "trackCount": 4
  },
  {
    "id": "good-bad-ugly",
    "title": "Good Bad Ugly",
    "year": 2025,
    "posterUrl": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/47/03/4c/47034c71-831b-61a2-8cc2-502f927834bd/196873057620.jpg/800x800bb.jpg",
    "trackCount": 5
  },
  {
    "id": "dragon",
    "title": "Dragon",
    "year": 2025,
    "posterUrl": "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/49/84/ad/4984ad2c-3c84-1f75-1785-a63ef0bc770e/67010.jpg/800x800bb.jpg",
    "trackCount": 4
  },
  {
    "id": "vidaamuyarchi",
    "title": "Vidaamuyarchi",
    "year": 2025,
    "posterUrl": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/11/26/6e/11266e7f-4079-9591-101a-77ae202589c9/196872810776.jpg/800x800bb.jpg",
    "trackCount": 5
  }
];

export const sampleArtists: Artist[] = [
  {
    "id": "anirudh",
    "name": "Anirudh Ravichander",
    "role": "Music Director",
    "imageUrl": "/artists/anirudh-ravichander.jpg"
  },
  {
    "id": "ar-rahman",
    "name": "A.R. Rahman",
    "role": "Music Director",
    "imageUrl": "/artists/a-r-rahman.jpg"
  },
  {
    "id": "ilaiyaraaja",
    "name": "Ilaiyaraaja",
    "role": "Isaignani",
    "imageUrl": "/artists/ilaiyaraaja.jpg"
  },
  {
    "id": "yuvan",
    "name": "Yuvan Shankar Raja",
    "role": "Music Director",
    "imageUrl": "/artists/yuvan-shankar-raja.jpg"
  },
  {
    "id": "harris",
    "name": "Harris Jayaraj",
    "role": "Music Director",
    "imageUrl": "/artists/harris-jayaraj.jpg"
  },
  {
    "id": "spb",
    "name": "S.P. Balasubrahmanyam",
    "role": "Legend Singer",
    "imageUrl": "/artists/s-p-balasubrahmanyam.jpg"
  },
  {
    "id": "sid-sriram",
    "name": "Sid Sriram",
    "role": "Playback Singer",
    "imageUrl": "/artists/sid-sriram.jpg"
  },
  {
    "id": "thalapathy-vijay",
    "name": "Thalapathy Vijay",
    "role": "Playback Singer & Actor",
    "imageUrl": "/artists/thalapathy-vijay.jpg"
  },
  {
    "id": "vairamuthu",
    "name": "Vairamuthu",
    "role": "Lyricist",
    "imageUrl": "/artists/vairamuthu.jpg"
  }
];