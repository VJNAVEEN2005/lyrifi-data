import React, { useState, useMemo, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { SearchView } from './components/SearchView';
import { SongDetail } from './components/SongDetail';
import { MovieDetail } from './components/MovieDetail';
import { ArtistDetail } from './components/ArtistDetail';
import { LogoLoader } from './components/LogoLoader';
import {
  sampleSongs,
  Song,
  MovieAlbum,
  Artist,
  slugifyMovieTitle,
  getMovieUrl,
  slugifyArtistName,
  getArtistUrl,
  getArtistPhoto,
} from './data';
import { scrapedCatalog } from './scrapedData';
import { 
  fetchSongLyrics, 
  recordSongView, 
  triggerDeepScrape, 
  searchCatalogFromBackend, 
  BackendSearchResults 
} from './services/api';
import { Heart, Sparkles } from 'lucide-react';
import { useAnimatedFavicon } from './hooks/useAnimatedFavicon';

export function App() {
  const [extraSongs, setExtraSongs] = useState<Song[]>([]);

  // Combine custom polished songs with scraped catalog (metadata) and dynamically scraped songs
  const allAvailableSongs = useMemo(() => {
    const map = new Map<string, Song>();
    sampleSongs.forEach((s) => map.set(s.id, s));
    scrapedCatalog.forEach((s) => {
      if (!map.has(s.id)) {
        map.set(s.id, s);
      }
    });
    extraSongs.forEach((s) => {
      map.set(s.id, s);
    });
    return Array.from(map.values());
  }, [extraSongs]);

  // Compute live Movie Albums matching actual songs by Movie Name and Year
  const dynamicMovieAlbums = useMemo<MovieAlbum[]>(() => {
    const movieMap = new Map<string, MovieAlbum>();
    allAvailableSongs.forEach((s) => {
      const movieName = s.movie?.trim();
      if (!movieName) return;
      const key = `${movieName.toLowerCase()}_${s.year || 2024}`;
      if (!movieMap.has(key)) {
        movieMap.set(key, {
          id: movieName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          title: movieName,
          year: s.year || 2024,
          posterUrl: s.coverUrl,
          trackCount: 1,
        });
      } else {
        const item = movieMap.get(key)!;
        item.trackCount += 1;
        // Prefer higher quality non-default artwork if available
        if (!item.posterUrl && s.coverUrl) {
          item.posterUrl = s.coverUrl;
        }
      }
    });
    // Sort movies with most tracks first, or latest year
    return Array.from(movieMap.values()).sort((a, b) => b.trackCount - a.trackCount || b.year - a.year);
  }, [allAvailableSongs]);

  // Compute live Artists & Composers matching actual songs
  const dynamicArtists = useMemo<Artist[]>(() => {
    const artistMap = new Map<string, { artist: Artist; songCount: number }>();
    
    allAvailableSongs.forEach((s) => {
      // 1. Composer
      const comp = s.composer?.trim();
      if (comp && comp !== 'Unknown Composer') {
        const key = comp.toLowerCase();
        const existing = artistMap.get(key);
        if (existing) {
          existing.songCount += 1;
        } else {
          artistMap.set(key, {
            artist: {
              id: slugifyArtistName(comp),
              name: comp,
              role: 'Music Director',
              imageUrl: getArtistPhoto(comp),
            },
            songCount: 1,
          });
        }
      }

      // 2. Singers
      s.singers?.forEach((singer) => {
        const sing = singer?.trim();
        if (sing && sing !== 'Various Artists' && sing.length > 2) {
          const key = sing.toLowerCase();
          const existing = artistMap.get(key);
          if (existing) {
            existing.songCount += 1;
          } else {
            artistMap.set(key, {
              artist: {
                id: slugifyArtistName(sing),
                name: sing,
                role: 'Playback Singer',
                imageUrl: getArtistPhoto(sing),
              },
              songCount: 1,
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
      return {
        id: albumSlug,
        title: albumSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        year,
        posterUrl: '',
        trackCount: 0,
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

  const [activeTab, setActiveTab] = useState<'home' | 'movies' | 'artists' | 'search'>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/search')) {
      return 'search';
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
        const qLower = trimmed.toLowerCase();
        const localSongs = allAvailableSongs.filter(
          (s) =>
            s.title.toLowerCase().includes(qLower) ||
            s.movie.toLowerCase().includes(qLower) ||
            s.composer.toLowerCase().includes(qLower) ||
            s.singers.some((singer) => singer.toLowerCase().includes(qLower))
        );
        const localMovies = dynamicMovieAlbums.filter((m) => m.title.toLowerCase().includes(qLower));
        const localArtists = dynamicArtists.filter((a) => a.name.toLowerCase().includes(qLower));
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
  const handleDeepSearch = async (data: { query: string; type: 'movie' | 'song' }) => {
    const { query, type } = data;
    if (!query.trim() || isDeepSearching) return;
    setIsDeepSearching(true);
    setDeepSearchMessage(
      type === 'movie'
        ? `Finding & organizing all songs from movie "${query}"...`
        : `Searching & verifying lyrics for "${query}" across web...`
    );
    
    try {
      const response = await triggerDeepScrape(query.trim(), type);
      if (response && response.success) {
        setIsDeepSearching(false);
        if (type === 'movie' && response.songs && response.songs.length > 0) {
          // Add newly scraped songs to extra songs state
          setExtraSongs((prev) => [...response.songs!, ...prev]);
          const movieTitle = response.movieTitle || query.trim();
          const firstSong = response.songs[0];
          handleSelectMovie({
            id: slugifyMovieTitle(movieTitle),
            title: movieTitle,
            year: firstSong.year || 2024,
            posterUrl: firstSong.coverUrl,
            trackCount: response.songs.length,
          });
        } else if (response.song) {
          // Single song scraped
          setExtraSongs((prev) => [response.song!, ...prev]);
          handleSelectSong(response.song);
          setSearchQuery('');
        } else if (response.songs && response.songs.length > 0) {
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
    if (selectedSong) {
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
  }, [selectedSong, selectedMovie, selectedArtist, activeTab, searchQuery]);

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
    if (tab === 'home') {
      handleGoHome();
    } else if (tab === 'movies' || tab === 'artists') {
      setSelectedSong(null);
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
      setCurrentPlayingSong(song);
      return;
    }

    // Otherwise fetch on-demand with Lyrifi animated equalizer loader
    setIsLoadingSong(true);
    setSelectedSong(song);
    setSelectedMovie(null);
    setSelectedArtist(null);
    setCurrentPlayingSong(song);
    const fullSong = await fetchSongLyrics(song.slug || song.id);
    if (fullSong) {
      setSelectedSong(fullSong);
      setCurrentPlayingSong(fullSong);
    }
    setIsLoadingSong(false);
  };

  const handleGoHome = () => {
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

  const handleSelectMovie = (movie: MovieAlbum) => {
    setSelectedSong(null);
    setSelectedArtist(null);
    setSelectedMovie(movie);
    const targetPath = getMovieUrl(movie);
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ type: 'movie', movie }, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectArtist = (artist: Artist) => {
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
        {isDeepSearching ? (
          <div className='min-h-[70vh] flex items-center justify-center'>
            <LogoLoader message={deepSearchMessage} />
          </div>
        ) : isLoadingSong ? (
          <div className='min-h-[70vh] flex items-center justify-center'>
            <LogoLoader message='Fetching authentic verified lyrics...' />
          </div>
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
            />
          </div>
        )}
      </main>

      {/* Footer (Genius / Clean style with legal & sitemap for Google crawl) */}
      <footer className='border-t border-white/10 bg-[#06070a] py-8 text-xs text-gray-400'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4'>
          <div className='flex items-center gap-2'>
            <div className='font-black text-white text-base tracking-tight'>Lyrifi</div>
            <span className='text-gray-400'>•</span>
            <span>Music feels better with words.</span>
          </div>

          <div className='flex flex-wrap items-center gap-5 text-gray-400'>
            <a href='#about' className='hover:text-white transition'>About</a>
            <a href='#contact' className='hover:text-white transition'>Contact</a>
            <a href='#dmca' className='hover:text-white transition'>DMCA / Copyright</a>
            <a href='#privacy' className='hover:text-white transition'>Privacy Policy</a>
            <a href='#sitemap' className='hover:text-white transition'>Sitemap</a>
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