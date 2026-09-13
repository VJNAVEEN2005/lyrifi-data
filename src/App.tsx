import React, { useState, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { SongDetail } from './components/SongDetail';
import { PlayerBar } from './components/PlayerBar';
import { sampleSongs, sampleMovies, sampleArtists, Song } from './data';
import { scrapedCatalog } from './scrapedData';
import { Heart } from 'lucide-react';

export function App() {
  // Combine custom polished songs with newly scraped songs (avoiding duplicates)
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
    // If a song was deep-linked, set it as current playing, otherwise default to first
    const path = window.location.pathname;
    const songMatch = path.match(/^\/song\/([a-zA-Z0-9_-]+)/);
    if (songMatch) {
      const slugOrId = songMatch[1];
      const found = allAvailableSongs.find((s) => s.slug === slugOrId || s.id === slugOrId);
      if (found) return found;
    }
    return allAvailableSongs[0];
  });
  const [activeTab, setActiveTab] = useState<'home' | 'trending' | 'movies' | 'artists' | 'charts'>('home');
  const [searchQuery, setSearchQuery] = useState('');

  // Handle browser Back / Forward buttons (popstate)
  React.useEffect(() => {
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

  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
    setCurrentPlayingSong(song);
    // Push new clean song URL into browser address bar
    const targetPath = `/song/${song.slug || song.id}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ slug: song.slug || song.id }, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onHomeClick={handleGoHome}
      />

      {/* Main View Router */}
      <main className='flex-1 pb-24'>
        {selectedSong ? (
          <SongDetail
            song={selectedSong}
            onBack={handleGoHome}
            onSelectSong={handleSelectSong}
            allSongs={allAvailableSongs}
          />
        ) : (
          <div>
            {searchQuery && (
              <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6'>
                <div className='text-sm text-gray-400 mb-2'>
                  Search results for &quot;<span className='text-white font-bold'>{searchQuery}</span>&quot; ({filteredSongs.length} found)
                </div>
              </div>
            )}
            <HomeView
              songs={filteredSongs}
              movies={sampleMovies}
              artists={sampleArtists}
              onSelectSong={handleSelectSong}
            />
          </div>
        )}
      </main>

      {/* Bottom Sticky Player Bar */}
      <PlayerBar
        song={currentPlayingSong}
        onOpenSong={(song) => handleSelectSong(song)}
      />

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