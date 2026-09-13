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

  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [currentPlayingSong, setCurrentPlayingSong] = useState<Song>(allAvailableSongs[0]);
  const [activeTab, setActiveTab] = useState<'home' | 'trending' | 'movies' | 'artists' | 'charts'>('home');
  const [searchQuery, setSearchQuery] = useState('');

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
        onHomeClick={() => setSelectedSong(null)}
      />

      {/* Main View Router */}
      <main className='flex-1 pb-24'>
        {selectedSong ? (
          <SongDetail
            song={selectedSong}
            onBack={() => setSelectedSong(null)}
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