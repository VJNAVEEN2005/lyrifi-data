import React, { useState, useMemo, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { SearchView } from './components/SearchView';
import { SongDetail } from './components/SongDetail';
import { LogoLoader } from './components/LogoLoader';
import { sampleSongs, Song, MovieAlbum, Artist } from './data';
import { scrapedCatalog } from './scrapedData';
import { 
  fetchSongLyrics, 
  recordSongView, 
  triggerDeepScrape, 
  searchCatalogFromBackend, 
  BackendSearchResults 
} from './services/api';
import { Heart, Sparkles } from 'lucide-react';

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
    
    // Curated high-res portraits for top Tamil music legends
    const knownImages: Record<string, string> = {
      'anirudh': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
      'a. r. rahman': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
      'ar rahman': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
      'yuvan shankar raja': 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=400&auto=format&fit=crop',
      'harris jayaraj': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&auto=format&fit=crop',
      'sai abhyankkar': 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=400&auto=format&fit=crop',
      'g. v. prakash kumar': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop',
      'g.v. prakash kumar': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop',
    };

    allAvailableSongs.forEach((s) => {
      const comp = s.composer?.trim();
      if (comp) {
        const key = comp.toLowerCase();
        const existing = artistMap.get(key);
        if (existing) {
          existing.songCount += 1;
        } else {
          artistMap.set(key, {
            artist: {
              id: key.replace(/[^a-z0-9]+/g, '-'),
              name: comp,
              role: 'Music Director',
              imageUrl: knownImages[key] || s.coverUrl,
            },
            songCount: 1,
          });
        }
      }
    });

    return Array.from(artistMap.values())
      .sort((a, b) => b.songCount - a.songCount)
      .map((item) => item.artist);
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
        ? `Scraping & ingesting all songs from movie "${query}"...`
        : `Scraping & verifying lyrics for "${query}" across web...`
    );
    
    try {
      const response = await triggerDeepScrape(query.trim(), type);
      if (response && response.success) {
        setIsDeepSearching(false);
        if (type === 'movie' && response.songs && response.songs.length > 0) {
          // Add newly scraped songs to extra songs state
          setExtraSongs((prev) => [...response.songs!, ...prev]);
          // Refresh search with the movie title to display movie album card and all songs
          const movieSearchQuery = response.movieTitle || query.trim();
          await executeSearch(movieSearchQuery);
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
          setCurrentPlayingSong(found);
          return;
        }
      } else if (path.startsWith('/search')) {
        setSelectedSong(null);
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
      setActiveTab('home');
      setSearchQuery('');
      setBackendResults(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [allAvailableSongs]);

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
      setCurrentPlayingSong(song);
      return;
    }

    // Otherwise fetch on-demand with Lyrifi animated equalizer loader
    setIsLoadingSong(true);
    setSelectedSong(song);
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
    setActiveTab('home');
    setSearchQuery('');
    setBackendResults(null);
    if (window.location.pathname !== '/' || window.location.search) {
      window.history.pushState({}, '', '/');
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
        onSelectMovie={(movie) => executeSearch(movie.title)}
        onSelectArtist={(artist) => executeSearch(artist.name)}
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
            onSelectMovie={(movie) => executeSearch(movie.title)}
            onSelectArtist={(artist) => executeSearch(artist.name)}
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
              onSelectMovie={(movie) => executeSearch(movie.title)}
              onSelectArtist={(artist) => executeSearch(artist.name)}
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