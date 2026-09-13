import React from 'react';
import { Search, Flame, Film, Users, BarChart3, Sparkles, Loader2 } from 'lucide-react';

interface NavbarProps {
  activeTab: 'home' | 'trending' | 'movies' | 'artists' | 'charts' | 'search';
  onTabChange: (tab: 'home' | 'trending' | 'movies' | 'artists' | 'charts' | 'search') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onHomeClick: () => void;
  onDeepSearch?: (query: string) => void;
  isDeepSearching?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  onHomeClick,
  onDeepSearch,
  isDeepSearching = false,
}) => {
  return (
    <header className='sticky top-0 z-50 w-full backdrop-blur-xl bg-[#090a0d]/80 border-b border-white/10 transition'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4'>
        
        {/* Brand Logo */}
        <div 
          onClick={onHomeClick}
          className='flex items-center gap-3 cursor-pointer group shrink-0'
        >
          <div className='flex items-end gap-[3px] h-6'>
            <span className='w-1 h-3 bg-pink-500 rounded-full group-hover:h-5 transition-all duration-300'></span>
            <span className='w-1 h-5 bg-rose-500 rounded-full group-hover:h-3 transition-all duration-300'></span>
            <span className='w-1 h-6 bg-pink-400 rounded-full group-hover:h-4 transition-all duration-300'></span>
            <span className='w-1 h-4 bg-rose-400 rounded-full group-hover:h-6 transition-all duration-300'></span>
          </div>
          <div className='flex flex-col'>
            <span className='text-xl font-black tracking-tight text-white flex items-center'>
              Lyrifi
            </span>
          </div>
          <span className='text-[11px] text-gray-400 hidden xl:inline border-l border-white/10 pl-3 italic'>
            Music feels better with words.
          </span>
        </div>

        {/* Center Navigation */}
        <nav className='hidden md:flex items-center gap-1 bg-white/[0.03] border border-white/5 p-1 rounded-full text-xs font-medium'>
          <button
            onClick={() => onTabChange('home')}
            className={'px-3.5 py-1.5 rounded-full transition ' + (activeTab === 'home' ? 'bg-white text-black font-bold shadow-sm' : 'text-gray-400 hover:text-white')}
          >
            Home
          </button>
          <button
            onClick={() => onTabChange('trending')}
            className={'px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5 ' + (activeTab === 'trending' ? 'bg-white text-black font-bold shadow-sm' : 'text-gray-400 hover:text-white')}
          >
            <Flame className='w-3.5 h-3.5' /> Trending
          </button>
          <button
            onClick={() => onTabChange('movies')}
            className={'px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5 ' + (activeTab === 'movies' ? 'bg-white text-black font-bold shadow-sm' : 'text-gray-400 hover:text-white')}
          >
            <Film className='w-3.5 h-3.5' /> Movies
          </button>
          <button
            onClick={() => onTabChange('artists')}
            className={'px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5 ' + (activeTab === 'artists' ? 'bg-white text-black font-bold shadow-sm' : 'text-gray-400 hover:text-white')}
          >
            <Users className='w-3.5 h-3.5' /> Artists
          </button>
          <button
            onClick={() => onTabChange('charts')}
            className={'px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5 ' + (activeTab === 'charts' ? 'bg-white text-black font-bold shadow-sm' : 'text-gray-400 hover:text-white')}
          >
            <BarChart3 className='w-3.5 h-3.5' /> Charts
          </button>
          <button
            onClick={() => onTabChange('search')}
            className={'px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5 ' + (activeTab === 'search' ? 'bg-white text-black font-bold shadow-sm' : 'text-gray-400 hover:text-white')}
          >
            <Search className='w-3.5 h-3.5' /> Search
          </button>
        </nav>

        {/* Search Bar with Deep Search action */}
        <div className='relative flex-1 max-w-md'>
          <div className='relative flex items-center'>
            <Search className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none' />
            <input
              type='text'
              placeholder='Search songs, movies, artists...'
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim() && onDeepSearch) {
                  onDeepSearch(searchQuery.trim());
                }
              }}
              className='w-full pl-10 pr-28 py-2 bg-white/[0.06] hover:bg-white/[0.08] focus:bg-white/10 border border-white/10 focus:border-pink-500/50 rounded-full text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-pink-500/50 transition'
            />
            {searchQuery.trim() ? (
              <button
                onClick={() => onDeepSearch && onDeepSearch(searchQuery.trim())}
                disabled={isDeepSearching}
                className='absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white text-[11px] font-bold shadow-md shadow-pink-500/30 transition active:scale-95 disabled:opacity-50'
                title='Scrape & ingest full song and movie album'
              >
                {isDeepSearching ? (
                  <>
                    <Loader2 className='w-3 h-3 animate-spin' />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className='w-3 h-3 text-pink-200' />
                    <span>Deep Search</span>
                  </>
                )}
              </button>
            ) : (
              <div className='absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-gray-400 bg-white/5 border border-white/10 font-mono'>
                Ctrl K
              </div>
            )}
          </div>
        </div>

        {/* Right Badge */}
        <div className='hidden lg:flex items-center gap-2'>
          <span className='text-xs px-2.5 py-1 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 font-medium'>
            100% Free Lyrics
          </span>
        </div>
      </div>
    </header>
  );
};