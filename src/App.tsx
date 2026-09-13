import React, { useState, useMemo, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { SearchView } from './components/SearchView';
import { SongDetail } from './components/SongDetail';
import { LogoLoader } from './components/LogoLoader';
import { sampleSongs, Song, MovieAlbum, Artist } from './data';
import { scrapedCatalog } from './scrapedData';
import { fetchSongLyrics, recordSongView, triggerDeepScrape } from './services/api';
import { Heart, Sparkles } from 'lucide-react';

export function App() {
  // Combine custom polished songs with scraped catalog (metadata)
  const allAvailableSongs = useMemo(() => {
    const map = new Map<string, Song>();
    sampleSongs.forEach((s) => map.set(s.id, s));
    scrapedCatalog.forEach((s) => {
      if (!map.has(s.id)) {
        map.set(s.id, s);
      }
    });
    return Array.from(map.values());
  }, []);

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
  const [activeTab, setActiveTab] = useState<'home' | 'trending' | 'movies' | 'artists' | 'charts' | 'search'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingSong, setIsLoadingSong] = useState<boolean>(false);
  const [isDeepSearching, setIsDeepSearching] = useState<boolean>(false);
  const [deepSearchMessage, setDeepSearchMessage] = useState<string>('Searching verified Tamil lyrics...');

  // Handle on-demand deep search
  const handleDeepSearch = async (query: string) => {
    if (!query.trim() || isDeepSearching) return;
    setIsDeepSearching(true);
    setDeepSearchMessage(`Scraping & verifying "${query}" across web...`);
    
    try {
      const scrapedSong = await triggerDeepScrape(query.trim());
      if (scrapedSong) {
        // Automatically open the newly scraped song
        handleSelectSong(scrapedSong);
        setSearchQuery('');
      } else {
        alert(`Could not find lyrics for "${query}". Please check spelling.`);
      }
    } catch {
      alert(`Search failed for "${query}". Please try again.`);
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
      }
      // If returning to home
      setSelectedSong(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [allAvailableSongs]);

  // Filter songs based on live search query
  const filteredSongs = useMemo(() => {
    if (!searchQuery.trim()) return allAvailableSongs;
    const q = searchQuery.toLowerCase();
    return allAvailableSongs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.movie.toLowerCase().includes(q) ||
        s.composer.toLowerCase().includes(q) ||
        s.singers.some((singer) => singer.toLowerCase().includes(q)) ||
        s.lyricist.toLowerCase().includes(q)
    );
  }, [searchQuery, allAvailableSongs]);

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
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className='min-h-screen bg-[#08090c] text-white flex flex-col font-sans selection:bg-pink-500/30'>
      {/* Universal Top Navigation */}
      {/* Universal Top Navigation with AI Deep Search */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onHomeClick={handleGoHome}
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
            onBack={handleGoHome}
            onSelectSong={handleSelectSong}
            allSongs={allAvailableSongs}
          />
        ) : activeTab === 'search' || searchQuery.trim().length > 0 ? (
          /* DEDICATED SEARCH PAGE VIEW */
          <SearchView
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            songs={allAvailableSongs}
            movies={dynamicMovieAlbums}
            artists={dynamicArtists}
            onSelectSong={handleSelectSong}
            onSelectMovie={(movie) => {
              setSearchQuery(movie.title);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectArtist={(artist) => {
              setSearchQuery(artist.name);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onDeepSearch={handleDeepSearch}
            isDeepSearching={isDeepSearching}
          />
        ) : (
          <div>
            <HomeView
              songs={filteredSongs}
              movies={dynamicMovieAlbums}
              artists={dynamicArtists}
              onSelectSong={handleSelectSong}
              onSelectMovie={(movie) => {
                setActiveTab('search');
                setSearchQuery(movie.title);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSelectArtist={(artist) => {
                setActiveTab('search');
                setSearchQuery(artist.name);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
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