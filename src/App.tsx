import React, { useState, useMemo, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { MoviesView } from './components/MoviesView';
import { SearchView } from './components/SearchView';
import { SongDetail } from './components/SongDetail';
import { MovieDetail } from './components/MovieDetail';
import { ArtistDetail } from './components/ArtistDetail';
import { AdminPortal } from './components/AdminPortal';
import { LogoLoader } from './components/LogoLoader';
import { LegalPages, LegalPageType } from './components/LegalPages';
import {
  Song,
  MovieAlbum,
  Artist,
  slugifyMovieTitle,
  getMovieUrl,
  slugifyArtistName,
  normalizeArtistSlug,
  CANONICAL_ARTIST_NAMES,
  getArtistUrl,
  getArtistPhoto,
} from './data';
import { scrapedCatalog } from './scrapedData';
import { 
  fetchSongLyrics, 
  recordSongView, 
  triggerDeepScrape, 
  searchCatalogFromBackend, 
  fetchClientAppleMusicArtwork,
  BackendSearchResults 
} from './services/api';
import { calculateFuzzyScore } from './services/fuzzySearch';
import { Heart, Sparkles } from 'lucide-react';
import { useAnimatedFavicon } from './hooks/useAnimatedFavicon';

export function App() {
  const [extraSongs, setExtraSongs] = useState<Song[]>(() => {
    try {
      const saved = localStorage.getItem('lyrifi_extra_songs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist extra scraped songs so they are NEVER lost on page refresh
  useEffect(() => {
    try {
      if (extraSongs.length > 0) {
        localStorage.setItem('lyrifi_extra_songs', JSON.stringify(extraSongs.slice(0, 500)));
      }
    } catch {}
  }, [extraSongs]);

  // Combine verified catalog with dynamically added songs (no dummy/placeholder songs)
  const allAvailableSongs = useMemo(() => {
    const map = new Map<string, Song>();
    scrapedCatalog.forEach((s) => {
      map.set(s.id, s);
    });
    extraSongs.forEach((s) => {
      map.set(s.id, s);
    });
    return Array.from(map.values());
  }, [extraSongs]);

  // Compute live Movie Albums matching actual songs by Movie Name and Year
  const dynamicMovieAlbums = useMemo<MovieAlbum[]>(() => {
    const movieMap = new Map<string, MovieAlbum>();
    const DISALLOWED_LABELS = new Set([
      'tamil song',
      'tamil single',
      'sony music south',
      'think music india',
      'saregama tamil',
      'aditya music',
      'lahari music',
      't-series tamil',
      'universal music group',
    ]);

    allAvailableSongs.forEach((s) => {
      const rawMovie = s.movie?.trim();
      if (!rawMovie) return;
      const lowerName = rawMovie.toLowerCase();
      if (DISALLOWED_LABELS.has(lowerName)) return;

      // Canonicalize common title capitalizations (e.g. LEO vs Leo)
      const canonicalTitle = lowerName === 'leo' ? 'Leo' : rawMovie;
      const key = `${canonicalTitle.toLowerCase()}_${s.year || 2024}`;

      if (!movieMap.has(key)) {
        movieMap.set(key, {
          id: canonicalTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          title: canonicalTitle,
          year: s.year || 2024,
          posterUrl: s.coverUrl,
          trackCount: 1,
        });
      } else {
        const item = movieMap.get(key)!;
        item.trackCount += 1;
        // Prefer higher quality non-default artwork if available
        if ((!item.posterUrl || item.posterUrl.includes('default-cover')) && s.coverUrl && !s.coverUrl.includes('default-cover')) {
          item.posterUrl = s.coverUrl;
        }
      }
    });
    // Sort strictly by latest released year first, then by track count
    return Array.from(movieMap.values()).sort((a, b) => (b.year || 0) - (a.year || 0) || b.trackCount - a.trackCount);
  }, [allAvailableSongs]);

  // Compute live Artists & Composers matching actual songs (deduplicated by canonical artist slug)
  const dynamicArtists = useMemo<Artist[]>(() => {
    const artistMap = new Map<string, { artist: Artist; songCount: number; isComposer: boolean }>();
    
    allAvailableSongs.forEach((s) => {
      // 1. Composer
      const comp = s.composer?.trim();
      if (comp && comp !== 'Unknown Composer') {
        const canonicalKey = normalizeArtistSlug(comp);
        const displayName = CANONICAL_ARTIST_NAMES[canonicalKey] || comp;
        const existing = artistMap.get(canonicalKey);
        if (existing) {
          existing.songCount += 1;
          existing.isComposer = true;
          existing.artist.role = 'Music Director';
          if (!existing.artist.name || existing.artist.name.length < displayName.length) {
            existing.artist.name = displayName;
          }
        } else {
          artistMap.set(canonicalKey, {
            artist: {
              id: canonicalKey,
              name: displayName,
              role: 'Music Director',
              imageUrl: getArtistPhoto(canonicalKey),
            },
            songCount: 1,
            isComposer: true,
          });
        }
      }

      // 2. Singers
      s.singers?.forEach((singer) => {
        const sing = singer?.trim();
        if (sing && sing !== 'Various Artists' && sing.length > 2) {
          const canonicalKey = normalizeArtistSlug(sing);
          const displayName = CANONICAL_ARTIST_NAMES[canonicalKey] || sing;
          const existing = artistMap.get(canonicalKey);
          if (existing) {
            existing.songCount += 1;
            if (!existing.isComposer) {
              existing.artist.role = 'Playback Singer';
            }
          } else {
            artistMap.set(canonicalKey, {
              artist: {
                id: canonicalKey,
                name: displayName,
                role: 'Playback Singer',
                imageUrl: getArtistPhoto(canonicalKey),
              },
              songCount: 1,
              isComposer: false,
            });
          }
        }
      });
    });

    return Array.from(artistMap.values())
      .sort((a, b) => b.songCount - a.songCount)
      .map((item) => ({
        ...item.artist,
        songCount: item.songCount,
      }));
  }, [allAvailableSongs]);

  const [selectedSong, setSelectedSong] = useState<Song | null>(() => {
    // Initial deep-link check from URL path on first load / refresh
    const path = window.location.pathname;
    const songMatch = path.match(/^\/song\/([a-zA-Z0-9_-]+)/);
    if (songMatch) {
      const slugOrId = songMatch[1];
      const found = allAvailableSongs.find((s) => s.slug === slugOrId || s.id === slugOrId);
      if (found) return found;
      // Generate clean initial placeholder for on-demand ingestion
      const cleanTitle = slugOrId
        .replace(/-song-lyrics/i, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return {
        id: slugOrId.replace('-song-lyrics', ''),
        slug: slugOrId,
        title: cleanTitle,
        movie: 'Tamil Song',
        year: 2024,
        composer: 'Music Director',
        singers: ['Various Artists'],
        lyricist: 'Tamil Lyricist',
        coverUrl: '',
        backdropUrl: '',
        primaryGlowColor: '#ec4899',
        secondaryGlowColor: '#f43f5e',
        duration: '3:45',
        lyricsTamil: [],
        lyricsTanglish: [],
      };
    }
    return null;
  });
  const [currentPlayingSong, setCurrentPlayingSong] = useState<Song>(() => {
    const path = window.location.pathname;
    const songMatch = path.match(/^\/song\/([a-zA-Z0-9_-]+)/);
    if (songMatch) {
      const slugOrId = songMatch[1];
      const found = allAvailableSongs.find((s) => s.slug === slugOrId || s.id === slugOrId);
      if (found) return found;
    }
    return allAvailableSongs[0];
  });
  const [selectedMovie, setSelectedMovie] = useState<MovieAlbum | null>(() => {
    const path = window.location.pathname;
    const movieMatch = path.match(/^\/movie\/([0-9]{4})\/([a-zA-Z0-9_-]+)/);
    if (movieMatch) {
      const year = parseInt(movieMatch[1], 10);
      const albumSlug = movieMatch[2].toLowerCase();

      // Check dynamicMovieAlbums first
      const existing = dynamicMovieAlbums.find(
        (m) => slugifyMovieTitle(m.title) === albumSlug && (isNaN(year) || m.year === year)
      ) || dynamicMovieAlbums.find((m) => slugifyMovieTitle(m.title) === albumSlug);

      if (existing && existing.posterUrl && !existing.posterUrl.includes('default-cover')) {
        return existing;
      }

      // Check persistent localStorage for poster
      let cachedPoster = '';
      try {
        cachedPoster =
          localStorage.getItem(`lyrifi_poster_${albumSlug}`) ||
          localStorage.getItem(`lyrifi_apple_art_${albumSlug.replace(/-/g, ' ')}`) ||
          '';
      } catch {}

      return {
        id: albumSlug,
        title: existing?.title || albumSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        year: existing?.year || year,
        posterUrl: existing?.posterUrl || cachedPoster || '',
        trackCount: existing?.trackCount || 0,
      };
    }
    return null;
  });
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(() => {
    const path = window.location.pathname;
    const artistMatch = path.match(/^\/artist\/([a-zA-Z0-9_-]+)/);
    if (artistMatch) {
      const artistSlug = artistMatch[1].toLowerCase();
      return {
        id: artistSlug,
        name: artistSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        role: 'Music Director & Artist',
        imageUrl: getArtistPhoto(artistSlug),
      };
    }
    return null;
  });

  const [selectedLegalPage, setSelectedLegalPage] = useState<LegalPageType | null>(() => {
    const path = window.location.pathname.replace(/^\//, '').toLowerCase();
    if (['privacy', 'terms', 'about', 'contact', 'dmca'].includes(path)) {
      return path as LegalPageType;
    }
    return null;
  });

  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    const path = window.location.pathname;
    return path.startsWith('/secret-admin') || path.startsWith('/admin');
  });

  const [activeTab, setActiveTab] = useState<'home' | 'movies' | 'artists' | 'search'>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/search')) {
      return 'search';
    }
    if (path === '/movies' || path.startsWith('/movies/')) {
      return 'movies';
    }
    if (path === '/artists' || path.startsWith('/artists/')) {
      return 'artists';
    }
    return 'home';
  });
  const [searchQuery, setSearchQuery] = useState<string>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/search')) {
      const params = new URLSearchParams(window.location.search);
      return params.get('q') || '';
    }
    return '';
  });
  const [backendResults, setBackendResults] = useState<BackendSearchResults | null>(null);
  const [isSearchingBackend, setIsSearchingBackend] = useState<boolean>(false);
  const [isLoadingSong, setIsLoadingSong] = useState<boolean>(false);
  const [isDeepSearching, setIsDeepSearching] = useState<boolean>(false);
  const [deepSearchMessage, setDeepSearchMessage] = useState<string>('Searching verified Tamil lyrics...');
  const [candidateMovies, setCandidateMovies] = useState<MovieAlbum[]>([]);

  // Animate browser tab favicon with pulsing equalizer bars during any loading state
  const isAnyLoading = isLoadingSong || isDeepSearching || isSearchingBackend;
  useAnimatedFavicon(isAnyLoading);

  // Execute authentic backend search when Enter is pressed or recommendation selected
  const executeSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchQuery('');
      setBackendResults(null);
      if (window.location.pathname !== '/search') {
        window.history.pushState(null, '', '/search');
      }
      return;
    }

    setSearchQuery(trimmed);
    setSelectedSong(null);
    setActiveTab('search');

    const targetUrl = `/search?q=${encodeURIComponent(trimmed)}`;
    if (window.location.pathname + window.location.search !== targetUrl) {
      window.history.pushState({ tab: 'search', q: trimmed }, '', targetUrl);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Request from backend database
    setIsSearchingBackend(true);
    try {
      const results = await searchCatalogFromBackend(trimmed);
      if (results) {
        setBackendResults(results);
      } else {
        // Fallback to local catalog if backend is offline
        const localSongs = allAvailableSongs
          .map((s) => {
            const score = Math.max(
              calculateFuzzyScore(trimmed, s.title),
              calculateFuzzyScore(trimmed, s.movie),
              calculateFuzzyScore(trimmed, s.composer),
              s.singers ? Math.max(...s.singers.map((sing) => calculateFuzzyScore(trimmed, sing))) : 0
            );
            return { s, score };
          })
          .filter((item) => item.score >= 40)
          .sort((a, b) => b.score - a.score)
          .map((item) => item.s);

        const localMovies = dynamicMovieAlbums
          .map((m) => ({ m, score: calculateFuzzyScore(trimmed, m.title) }))
          .filter((item) => item.score >= 40)
          .sort((a, b) => b.score - a.score)
          .map((item) => item.m);

        const localArtists = dynamicArtists
          .map((a) => ({ a, score: calculateFuzzyScore(trimmed, a.name) }))
          .filter((item) => item.score >= 45)
          .sort((a, b) => b.score - a.score)
          .map((item) => item.a);

        setBackendResults({ songs: localSongs, movies: localMovies, artists: localArtists });
      }
    } catch {
      // fallback
    } finally {
      setIsSearchingBackend(false);
    }
  };

  // If initial load or refresh on /search?q=..., trigger backend search
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/search')) {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q) {
        executeSearch(q);
      }
    }
  }, []);

  // Handle on-demand deep search for movie album or specific song
  const handleDeepSearch = async (data: {
    query: string;
    type: 'movie' | 'song';
    targetMovieUrl?: string;
    year?: number;
  }) => {
    const { query, type, targetMovieUrl, year } = data;
    if (!query.trim() || isDeepSearching) return;
    setIsDeepSearching(true);
    setDeepSearchMessage(
      type === 'movie'
        ? `Finding & organizing all songs from movie "${query}"...`
        : `Searching & verifying lyrics for "${query}" across web...`
    );
    
    try {
      const response = await triggerDeepScrape(query.trim(), type, targetMovieUrl, year);
      if (response && response.success) {
        setIsDeepSearching(false);
        if (response.type === 'movie-selection' && response.movies && response.movies.length > 0) {
          // If the user requested a specific movie or we're on a movie page, check for an exact match first
          const qLower = query.toLowerCase().trim();
          const qSlug = slugifyMovieTitle(query);
          const exactCandidate = response.movies.find((m) => {
            const mTitleLower = m.title.toLowerCase().trim();
            const mSlug = slugifyMovieTitle(m.title);
            const yearMatch = !year || m.year === year;
            return (mTitleLower === qLower || mSlug === qSlug) && yearMatch;
          });

          if (exactCandidate) {
            handleDeepSearch({
              query: exactCandidate.title,
              type: 'movie',
              targetMovieUrl: exactCandidate.movieUrl,
              year: exactCandidate.year,
            });
            return;
          }

          // Multiple matching candidate movies found!
          setCandidateMovies(response.movies);
          setBackendResults((prev) => ({
            songs: prev?.songs || [],
            movies: response.movies!,
            artists: prev?.artists || [],
          }));
          setActiveTab('search');
          setSearchQuery(query);
          return;
        }

        if (type === 'movie' && response.songs && response.songs.length > 0) {
          setCandidateMovies([]);
          const movieTitle = response.movieTitle || query.trim();
          const firstSong = response.songs[0];
          const movieYear = response.year || year || firstSong.year || 2024;
          const movieSlug = slugifyMovieTitle(movieTitle);

          // Retrieve verified Apple Music artwork
          let movieArtwork = await fetchClientAppleMusicArtwork(movieTitle, movieYear);
          if (!movieArtwork || movieArtwork.includes('default-cover')) {
            movieArtwork =
              (selectedMovie?.posterUrl && !selectedMovie.posterUrl.includes('default-cover'))
                ? selectedMovie.posterUrl
                : (firstSong.coverUrl && !firstSong.coverUrl.includes('default-cover'))
                ? firstSong.coverUrl
                : '';
          }

          // Ensure every track receives high-resolution Apple Music artwork instead of /default-cover.svg
          const enrichedSongs = response.songs.map((s) => ({
            ...s,
            movie: movieTitle,
            year: movieYear,
            coverUrl:
              s.coverUrl && !s.coverUrl.includes('default-cover')
                ? s.coverUrl
                : movieArtwork || '/default-cover.svg',
            backdropUrl:
              s.backdropUrl && !s.backdropUrl.includes('default-cover')
                ? s.backdropUrl
                : movieArtwork || '/default-cover.svg',
          }));

          setExtraSongs((prev) => [...enrichedSongs, ...prev]);

          const chosenPoster =
            movieArtwork ||
            (firstSong.coverUrl && !firstSong.coverUrl.includes('default-cover')
              ? firstSong.coverUrl
              : selectedMovie?.posterUrl || '/default-cover.svg');

          if (chosenPoster && !chosenPoster.includes('default-cover')) {
            try {
              localStorage.setItem(`lyrifi_poster_${movieSlug}`, chosenPoster);
              localStorage.setItem(`lyrifi_apple_art_${movieTitle.toLowerCase().trim()}`, chosenPoster);
            } catch {}
          }

          handleSelectMovie(
            {
              id: movieSlug,
              title: movieTitle,
              year: movieYear,
              posterUrl: chosenPoster,
              trackCount: enrichedSongs.length,
              songs: enrichedSongs,
            },
            true // preventScroll = true (never scroll back up while user is reading!)
          );
        } else if (response.song) {
          setCandidateMovies([]);
          // Single song scraped
          setExtraSongs((prev) => [response.song!, ...prev]);
          handleSelectSong(response.song);
          setSearchQuery('');
        } else if (response.songs && response.songs.length > 0) {
          setCandidateMovies([]);
          setExtraSongs((prev) => [...response.songs!, ...prev]);
          handleSelectSong(response.songs[0]);
          setSearchQuery('');
        } else {
          alert(`Could not locate ${type === 'movie' ? 'movie album' : 'song'} for "${query}". Please check the spelling.`);
        }
      } else {
        setIsDeepSearching(false);
        alert(`Could not find ${type === 'movie' ? 'movie album' : 'song'} for "${query}". Please verify the spelling and try again.`);
      }
    } catch {
      setIsDeepSearching(false);
      alert(`Deep Search failed for "${query}". Please try again.`);
    } finally {
      setIsDeepSearching(false);
    }
  };

  // If a song is deep-linked or refreshed, ensure full lyrics are loaded
  useEffect(() => {
    if (selectedSong && (!selectedSong.lyricsTamil || selectedSong.lyricsTamil.length === 0)) {
      setIsLoadingSong(true);
      fetchSongLyrics(selectedSong.slug || selectedSong.id).then((fullSong) => {
        if (fullSong && fullSong.lyricsTamil && fullSong.lyricsTamil.length > 0) {
          setSelectedSong(fullSong);
          setCurrentPlayingSong(fullSong);
          setExtraSongs((prev) => {
            if (prev.some((s) => s.id === fullSong.id)) return prev;
            return [fullSong, ...prev];
          });
        }
        setIsLoadingSong(false);
      });
    }
  }, [selectedSong]);

  // Synchronize selectedMovie with dynamicMovieAlbums once loaded
  useEffect(() => {
    if (selectedMovie && (!selectedMovie.posterUrl || selectedMovie.trackCount === 0)) {
      const albumSlug = slugifyMovieTitle(selectedMovie.title);
      const matched = dynamicMovieAlbums.find(
        (m) => slugifyMovieTitle(m.title) === albumSlug && (isNaN(selectedMovie.year) || m.year === selectedMovie.year)
      ) || dynamicMovieAlbums.find((m) => slugifyMovieTitle(m.title) === albumSlug);

      if (matched) {
        setSelectedMovie(matched);
      }
    }
  }, [selectedMovie, dynamicMovieAlbums]);

  // Synchronize selectedArtist with dynamicArtists once loaded
  useEffect(() => {
    if (selectedArtist && (!selectedArtist.imageUrl || !selectedArtist.songCount)) {
      const artistSlug = slugifyArtistName(selectedArtist.name);
      const matched = dynamicArtists.find((a) => slugifyArtistName(a.name) === artistSlug);
      if (matched) {
        setSelectedArtist(matched);
      }
    }
  }, [selectedArtist, dynamicArtists]);

  // Synchronize Browser Tab Name & Title dynamically
  useEffect(() => {
    if (isAdminRoute) {
      document.title = 'Admin Review Portal | Lyrifi';
    } else if (selectedSong) {
      document.title = `${selectedSong.title} Lyrics - ${selectedSong.movie} | Lyrifi`;
    } else if (selectedMovie) {
      document.title = `${selectedMovie.title} (${selectedMovie.year || 2024}) Album & Lyrics | Lyrifi`;
    } else if (selectedArtist) {
      document.title = `${selectedArtist.name} - Songs & Discography | Lyrifi`;
    } else if (activeTab === 'search' && searchQuery) {
      document.title = `Search: "${searchQuery}" | Lyrifi`;
    } else if (activeTab === 'movies') {
      document.title = 'Tamil Movie Soundtracks & Albums | Lyrifi';
    } else if (activeTab === 'artists') {
      document.title = 'Popular Music Directors & Playback Singers | Lyrifi';
    } else {
      document.title = 'Lyrifi - Tamil Songs Lyrics | தமிழ் & Tanglish';
    }
  }, [isAdminRoute, selectedSong, selectedMovie, selectedArtist, activeTab, searchQuery]);

  // Handle browser Back / Forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const songMatch = path.match(/^\/song\/([a-zA-Z0-9_-]+)/);
      if (songMatch) {
        const slugOrId = songMatch[1];
        const found = allAvailableSongs.find((s) => s.slug === slugOrId || s.id === slugOrId);
        if (found) {
          setSelectedSong(found);
          setSelectedMovie(null);
          setSelectedArtist(null);
          setCurrentPlayingSong(found);
          return;
        }
      }

      const movieMatch = path.match(/^\/movie\/([0-9]{4})\/([a-zA-Z0-9_-]+)/);
      if (movieMatch) {
        const year = parseInt(movieMatch[1], 10);
        const albumSlug = movieMatch[2].toLowerCase();
        setSelectedSong(null);
        setSelectedArtist(null);
        const found = dynamicMovieAlbums.find(
          (m) => slugifyMovieTitle(m.title) === albumSlug && (isNaN(year) || m.year === year)
        ) || dynamicMovieAlbums.find((m) => slugifyMovieTitle(m.title) === albumSlug);

        setSelectedMovie(
          found || {
            id: albumSlug,
            title: albumSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            year,
            posterUrl: '',
            trackCount: 0,
          }
        );
        return;
      }

      const artistMatch = path.match(/^\/artist\/([a-zA-Z0-9_-]+)/);
      if (artistMatch) {
        const artistSlug = artistMatch[1].toLowerCase();
        setSelectedSong(null);
        setSelectedMovie(null);
        const found = dynamicArtists.find((a) => slugifyArtistName(a.name) === artistSlug);
        setSelectedArtist(
          found || {
            id: artistSlug,
            name: artistSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            role: 'Music Director & Artist',
            imageUrl: getArtistPhoto(artistSlug),
          }
        );
        return;
      }

      if (path.startsWith('/search')) {
        setSelectedSong(null);
        setSelectedMovie(null);
        setSelectedArtist(null);
        setActiveTab('search');
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q') || '';
        if (q) {
          executeSearch(q);
        } else {
          setSearchQuery('');
          setBackendResults(null);
        }
        return;
      }

      if (path === '/movies' || path.startsWith('/movies')) {
        setSelectedSong(null);
        setSelectedMovie(null);
        setSelectedArtist(null);
        setActiveTab('movies');
        setSearchQuery('');
        setBackendResults(null);
        return;
      }

      if (path.startsWith('/secret-admin') || path.startsWith('/admin')) {
        setSelectedSong(null);
        setSelectedMovie(null);
        setSelectedArtist(null);
        setSelectedLegalPage(null);
        setIsAdminRoute(true);
        return;
      }

      const cleanLegalPath = path.replace(/^\//, '').toLowerCase();
      if (['privacy', 'terms', 'about', 'contact', 'dmca'].includes(cleanLegalPath)) {
        setSelectedSong(null);
        setSelectedMovie(null);
        setSelectedArtist(null);
        setIsAdminRoute(false);
        setSelectedLegalPage(cleanLegalPath as LegalPageType);
        return;
      }

      setIsAdminRoute(false);
      setSelectedLegalPage(null);

      // If returning to home or any other path
      setSelectedSong(null);
      setSelectedMovie(null);
      setSelectedArtist(null);
      setActiveTab('home');
      setSearchQuery('');
      setBackendResults(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [allAvailableSongs, dynamicMovieAlbums, dynamicArtists]);

  // Handle tab switching
  const handleTabChange = (tab: 'home' | 'movies' | 'artists' | 'search') => {
    setActiveTab(tab);
    setSelectedSong(null);
    setSelectedMovie(null);
    setSelectedArtist(null);
    setIsAdminRoute(false);
    setSearchQuery('');
    setBackendResults(null);

    if (tab === 'home') {
      handleGoHome();
    } else if (tab === 'movies') {
      if (window.location.pathname !== '/movies') {
        window.history.pushState({ tab: 'movies' }, '', '/movies');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'artists') {
      if (window.location.pathname !== '/') {
        window.history.pushState({}, '', '/');
      }
      setTimeout(() => {
        const section = document.getElementById(tab);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
    }
  };

  const handleSelectSong = async (song: Song) => {
    setIsAdminRoute(false);
    setSelectedLegalPage(null);
    // Record live analytics view in backend
    recordSongView(song.id);

    // Push new clean song URL into browser address bar
    const targetPath = `/song/${song.slug || song.id}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ slug: song.slug || song.id }, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // If lyrics are already present, render immediately
    if (song.lyricsTamil && song.lyricsTamil.length > 0) {
      setSelectedSong(song);
      setSelectedMovie(null);
      setSelectedArtist(null);
      setSelectedLegalPage(null);
      setCurrentPlayingSong(song);
      return;
    }

    // Otherwise fetch on-demand with Lyrifi animated equalizer loader
    setIsLoadingSong(true);
    setSelectedSong(song);
    setSelectedMovie(null);
    setSelectedArtist(null);
    setSelectedLegalPage(null);
    setCurrentPlayingSong(song);
    const fullSong = await fetchSongLyrics(song.slug || song.id);
    if (fullSong) {
      setSelectedSong(fullSong);
      setCurrentPlayingSong(fullSong);
    }
    setIsLoadingSong(false);
  };

  const handleGoHome = () => {
    setIsAdminRoute(false);
    setSelectedLegalPage(null);
    setSelectedSong(null);
    setSelectedMovie(null);
    setSelectedArtist(null);
    setActiveTab('home');
    setSearchQuery('');
    setBackendResults(null);
    if (window.location.pathname !== '/' || window.location.search) {
      window.history.pushState({}, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLegalPage = (page: LegalPageType) => {
    setIsAdminRoute(false);
    setSelectedSong(null);
    setSelectedMovie(null);
    setSelectedArtist(null);
    setSelectedLegalPage(page);
    const targetPath = `/${page}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ page }, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectMovie = (movie: MovieAlbum, preventScroll: boolean = false) => {
    setIsAdminRoute(false);
    setSelectedLegalPage(null);
    setSelectedSong(null);
    setSelectedArtist(null);
    setSelectedMovie(movie);
    const targetPath = getMovieUrl(movie);
    const isDifferentPath = window.location.pathname !== targetPath;
    if (isDifferentPath) {
      window.history.pushState({ type: 'movie', movie }, '', targetPath);
    }
    if (isDifferentPath && !preventScroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // If movie already has songs provided, never trigger deep search!
    if (movie.songs && movie.songs.length > 0) {
      return;
    }

    // Check if album tracks exist in catalog. If not, auto-trigger deep scrape with targetMovieUrl & year!
    const albumSlug = slugifyMovieTitle(movie.title);
    const hasLocalTracks = allAvailableSongs.some((s) => {
      const sMovie = (s.movie || '').toLowerCase().trim();
      const sSlug = slugifyMovieTitle(s.movie);
      return (sMovie === movie.title.toLowerCase().trim() || sSlug === albumSlug) && (!movie.year || s.year === movie.year);
    });

    if (!hasLocalTracks && (movie.movieUrl || movie.trackCount > 0)) {
      handleDeepSearch({
        query: movie.title,
        type: 'movie',
        targetMovieUrl: movie.movieUrl,
        year: movie.year,
      });
    }
  };

  const handleSelectArtist = (artist: Artist) => {
    setIsAdminRoute(false);
    setSelectedLegalPage(null);
    const verifiedPhoto = artist.imageUrl && !artist.imageUrl.includes('-art.jpg') && !artist.imageUrl.includes('mzstatic')
      ? artist.imageUrl
      : getArtistPhoto(artist.name || artist.id);
    const enrichedArtist: Artist = {
      ...artist,
      imageUrl: verifiedPhoto,
    };
    setSelectedSong(null);
    setSelectedMovie(null);
    setSelectedArtist(enrichedArtist);
    const targetPath = getArtistUrl(enrichedArtist);
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ type: 'artist', artist: enrichedArtist }, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromSong = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      handleGoHome();
    }
  };

  const handleBackFromMovie = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      handleGoHome();
    }
  };

  const handleBackFromArtist = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      handleGoHome();
    }
  };

  return (
    <div className='min-h-screen bg-[#08090c] text-white flex flex-col font-sans selection:bg-pink-500/30'>
      {/* Universal Top Navigation with Live Autocomplete Search */}
      <Navbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onHomeClick={handleGoHome}
        songs={allAvailableSongs}
        movies={dynamicMovieAlbums}
        artists={dynamicArtists}
        onSelectSong={handleSelectSong}
        onSelectMovie={handleSelectMovie}
        onSelectArtist={handleSelectArtist}
        onSubmitSearch={executeSearch}
        onDeepSearch={handleDeepSearch}
        isDeepSearching={isDeepSearching}
      />

      {/* Main View Router */}
      <main className='flex-1 pb-12'>
        {isAdminRoute ? (
          /* SECRET ADMIN REVIEW PORTAL (NO PUBLIC BUTTONS) */
          <AdminPortal
            allSongs={allAvailableSongs}
            onSongUpdated={(updatedSong) => {
              setExtraSongs((prev) => {
                const next = prev.filter((s) => s.id !== updatedSong.id);
                next.unshift(updatedSong);
                return next;
              });
            }}
            onGoHome={handleGoHome}
          />
        ) : selectedSong ? (
          <SongDetail
            song={selectedSong}
            onBack={handleBackFromSong}
            onSelectSong={handleSelectSong}
            allSongs={allAvailableSongs}
            onSelectMovie={handleSelectMovie}
            onSelectArtist={handleSelectArtist}
          />
        ) : selectedMovie ? (
          /* DEDICATED MOVIE ALBUM PAGE VIEW */
          <MovieDetail
            movie={selectedMovie}
            onBack={handleBackFromMovie}
            onSelectSong={handleSelectSong}
            allSongs={allAvailableSongs}
            onDeepSearch={handleDeepSearch}
            isDeepSearching={isDeepSearching}
          />
        ) : selectedArtist ? (
          /* DEDICATED ARTIST & COMPOSER PAGE VIEW */
          <ArtistDetail
            artist={selectedArtist}
            onBack={handleBackFromArtist}
            onSelectSong={handleSelectSong}
            onSelectMovie={handleSelectMovie}
            allSongs={allAvailableSongs}
            onDeepSearch={handleDeepSearch}
            isDeepSearching={isDeepSearching}
          />
        ) : selectedLegalPage ? (
          /* DEDICATED LEGAL & POLICY PAGES (PRIVACY, TERMS, ABOUT, CONTACT, DMCA) */
          <LegalPages
            page={selectedLegalPage}
            onBack={handleGoHome}
          />
        ) : isDeepSearching ? (
          <div className='min-h-[70vh] flex items-center justify-center'>
            <LogoLoader message={deepSearchMessage} />
          </div>
        ) : isLoadingSong ? (
          <div className='min-h-[70vh] flex items-center justify-center'>
            <LogoLoader message='Fetching authentic verified lyrics...' />
          </div>
        ) : activeTab === 'search' || searchQuery.trim().length > 0 ? (
          /* DEDICATED SEARCH PAGE VIEW */
          <SearchView
            searchQuery={searchQuery}
            onSearchSubmit={executeSearch}
            songs={allAvailableSongs}
            movies={dynamicMovieAlbums}
            artists={dynamicArtists}
            backendResults={backendResults}
            isSearchingBackend={isSearchingBackend}
            onSelectSong={handleSelectSong}
            onSelectMovie={handleSelectMovie}
            onSelectArtist={handleSelectArtist}
            onDeepSearch={handleDeepSearch}
            isDeepSearching={isDeepSearching}
            candidateMovies={candidateMovies}
            onClearCandidates={() => setCandidateMovies([])}
          />
        ) : activeTab === 'movies' ? (
          /* DEDICATED MOVIES TAB (LATEST RELEASED ORDER) */
          <MoviesView
            movies={dynamicMovieAlbums}
            onSelectMovie={handleSelectMovie}
            onSelectSong={handleSelectSong}
            allSongs={allAvailableSongs}
          />
        ) : (
          <div>
            <HomeView
              songs={allAvailableSongs}
              movies={dynamicMovieAlbums}
              artists={dynamicArtists}
              onSelectSong={handleSelectSong}
              onSelectMovie={handleSelectMovie}
              onSelectArtist={handleSelectArtist}
              onTabChange={handleTabChange}
            />
          </div>
        )}
      </main>

      {/* Footer (Genius / Clean style with legal & sitemap for Google crawl & AdSense approval) */}
      <footer className='border-t border-white/10 bg-[#06070a] py-8 text-xs text-gray-400'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4'>
          <div className='flex items-center gap-2 cursor-pointer' onClick={handleGoHome}>
            <div className='font-black text-white text-base tracking-tight hover:text-pink-400 transition'>Lyrifi</div>
            <span className='text-gray-400'>•</span>
            <span>Music feels better with words.</span>
          </div>

          <div className='flex flex-wrap items-center gap-5 text-gray-400'>
            <button
              onClick={() => handleOpenLegalPage('about')}
              className='hover:text-white transition cursor-pointer'
            >
              About
            </button>
            <button
              onClick={() => handleOpenLegalPage('privacy')}
              className='hover:text-white transition cursor-pointer text-pink-400 font-semibold'
            >
              Privacy Policy
            </button>
            <button
              onClick={() => handleOpenLegalPage('terms')}
              className='hover:text-white transition cursor-pointer'
            >
              Terms of Service
            </button>
            <button
              onClick={() => handleOpenLegalPage('contact')}
              className='hover:text-white transition cursor-pointer'
            >
              Contact
            </button>
            <button
              onClick={() => handleOpenLegalPage('dmca')}
              className='hover:text-white transition cursor-pointer'
            >
              DMCA / Copyright
            </button>
            <a
              href='/sitemap.xml'
              target='_blank'
              rel='noopener noreferrer'
              className='hover:text-white transition'
            >
              Sitemap
            </a>
          </div>

          <div className='flex items-center gap-1.5 text-gray-400'>
            Made for Tamil music lovers with <Heart className='w-3.5 h-3.5 text-rose-500 fill-rose-500' />
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;