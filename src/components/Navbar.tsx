import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Film, Users, Music, ChevronRight, X } from 'lucide-react';
import { Song, MovieAlbum, Artist } from '../data';

interface NavbarProps {
  activeTab: 'home' | 'movies' | 'artists' | 'search';
  onTabChange: (tab: 'home' | 'movies' | 'artists' | 'search') => void;
  onHomeClick: () => void;
  songs: Song[];
  movies: MovieAlbum[];
  artists: Artist[];
  onSelectSong: (song: Song) => void;
  onSelectMovie: (movie: MovieAlbum) => void;
  onSelectArtist: (artist: Artist) => void;
  onSubmitSearch: (query: string) => void;
  onDeepSearch?: (data: { query: string; type: 'movie' | 'song' }) => Promise<void>;
  isDeepSearching?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onHomeClick,
  songs,
  movies,
  artists,
  onSelectSong,
  onSelectMovie,
  onSelectArtist,
  onSubmitSearch,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute live fast recommendations (matching songs, movies, artists)
  const trimmed = inputValue.trim().toLowerCase();
  const recommendations = useMemo(() => {
    if (!trimmed) return { songs: [], movies: [], artists: [] };

    const matchedSongs = songs
      .filter(
        (s) =>
          s.title.toLowerCase().includes(trimmed) ||
          s.movie.toLowerCase().includes(trimmed) ||
          s.composer.toLowerCase().includes(trimmed) ||
          s.singers.some((singer) => singer.toLowerCase().includes(trimmed))
      )
      .slice(0, 4);

    const matchedMovies = movies
      .filter((m) => m.title.toLowerCase().includes(trimmed))
      .slice(0, 3);

    const matchedArtists = artists
      .filter((a) => a.name.toLowerCase().includes(trimmed))
      .slice(0, 2);

    return { songs: matchedSongs, movies: matchedMovies, artists: matchedArtists };
  }, [trimmed, songs, movies, artists]);

  const hasRecommendations =
    recommendations.songs.length > 0 ||
    recommendations.movies.length > 0 ||
    recommendations.artists.length > 0;

  const handleTriggerSearch = (q: string) => {
    const query = q.trim();
    if (!query) return;
    setShowDropdown(false);
    onSubmitSearch(query);
  };

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

        {/* Center Navigation (Only Home, Movies, Artists) */}
        <nav className='hidden md:flex items-center gap-1 bg-white/[0.03] border border-white/5 p-1 rounded-full text-xs font-medium'>
          <button
            onClick={() => onTabChange('home')}
            className={'px-4 py-1.5 rounded-full transition ' + (activeTab === 'home' ? 'bg-white text-black font-bold shadow-sm' : 'text-gray-400 hover:text-white')}
          >
            Home
          </button>
          <button
            onClick={() => onTabChange('movies')}
            className={'px-4 py-1.5 rounded-full transition flex items-center gap-1.5 ' + (activeTab === 'movies' ? 'bg-white text-black font-bold shadow-sm' : 'text-gray-400 hover:text-white')}
          >
            <Film className='w-3.5 h-3.5' /> Movies
          </button>
          <button
            onClick={() => onTabChange('artists')}
            className={'px-4 py-1.5 rounded-full transition flex items-center gap-1.5 ' + (activeTab === 'artists' ? 'bg-white text-black font-bold shadow-sm' : 'text-gray-400 hover:text-white')}
          >
            <Users className='w-3.5 h-3.5' /> Artists
          </button>
        </nav>

        {/* Top-Right Search Input with Live Recommendations Dropdown */}
        <div ref={containerRef} className='relative flex-1 max-w-md'>
          <div className='relative flex items-center'>
            <Search className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none' />
            <input
              type='text'
              placeholder='Search songs, movies, artists...'
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => {
                if (inputValue.trim()) setShowDropdown(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputValue.trim()) {
                  handleTriggerSearch(inputValue);
                } else if (e.key === 'Escape') {
                  setShowDropdown(false);
                }
              }}
              className='w-full pl-10 pr-28 py-2 bg-white/[0.06] hover:bg-white/[0.08] focus:bg-white/10 border border-white/10 focus:border-rose-500/50 rounded-full text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-rose-500/50 transition'
            />

            {inputValue.trim() ? (
              <div className='absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1'>
                <button
                  onClick={() => {
                    setInputValue('');
                    setShowDropdown(false);
                  }}
                  className='p-1 text-gray-400 hover:text-white rounded-full'
                  title='Clear input'
                >
                  <X className='w-3.5 h-3.5' />
                </button>
                <button
                  onClick={() => handleTriggerSearch(inputValue)}
                  className='px-2.5 py-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-[11px] font-bold shadow-md shadow-pink-500/30 transition active:scale-95 flex items-center gap-1'
                >
                  <Search className='w-3 h-3' />
                  <span>Search</span>
                </button>
              </div>
            ) : (
              <div className='absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-gray-400 bg-white/5 border border-white/10 font-mono'>
                ↵ Enter
              </div>
            )}
          </div>

          {/* Autocomplete / Recommendations Dropdown */}
          {showDropdown && trimmed && (
            <div className='absolute left-0 right-0 top-full mt-2 bg-[#10121a]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-2 z-50 space-y-1 max-h-[80vh] overflow-y-auto'>
              {hasRecommendations ? (
                <>
                  {/* Songs Section */}
                  {recommendations.songs.length > 0 && (
                    <div className='space-y-0.5'>
                      <div className='px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1'>
                        <Music className='w-3 h-3 text-rose-400' /> Songs
                      </div>
                      {recommendations.songs.map((song) => (
                        <div
                          key={song.id}
                          onClick={() => {
                            setShowDropdown(false);
                            setInputValue(song.title);
                            onSelectSong(song);
                          }}
                          className='flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 cursor-pointer transition group'
                        >
                          <img
                            src={song.coverUrl}
                            alt={song.title}
                            className='w-9 h-9 rounded-lg object-cover shrink-0 shadow-sm border border-white/10'
                          />
                          <div className='min-w-0 flex-1'>
                            <div className='text-sm font-bold text-white group-hover:text-rose-400 transition truncate'>
                              {song.title}
                            </div>
                            <div className='text-xs text-gray-400 truncate'>
                              {song.movie} • {song.composer}
                            </div>
                          </div>
                          <span className='text-[10px] text-gray-500 font-medium px-2 py-0.5 rounded bg-white/5'>
                            Lyrics
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Movies Section */}
                  {recommendations.movies.length > 0 && (
                    <div className='space-y-0.5 pt-1 border-t border-white/5'>
                      <div className='px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1'>
                        <Film className='w-3 h-3 text-rose-400' /> Movies
                      </div>
                      {recommendations.movies.map((movie) => (
                        <div
                          key={movie.id}
                          onClick={() => {
                            setShowDropdown(false);
                            setInputValue(movie.title);
                            onSelectMovie(movie);
                          }}
                          className='flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 cursor-pointer transition group'
                        >
                          <div className='w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-rose-400'>
                            <Film className='w-4 h-4' />
                          </div>
                          <div className='min-w-0 flex-1'>
                            <div className='text-sm font-bold text-white group-hover:text-rose-400 transition truncate'>
                              {movie.title}
                            </div>
                            <div className='text-xs text-gray-400 truncate'>
                              Movie Album • {movie.trackCount} {movie.trackCount === 1 ? 'Song' : 'Songs'} ({movie.year})
                            </div>
                          </div>
                          <ChevronRight className='w-4 h-4 text-gray-500 shrink-0' />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Artists Section */}
                  {recommendations.artists.length > 0 && (
                    <div className='space-y-0.5 pt-1 border-t border-white/5'>
                      <div className='px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1'>
                        <Users className='w-3 h-3 text-rose-400' /> Artists & Composers
                      </div>
                      {recommendations.artists.map((artist) => (
                        <div
                          key={artist.id}
                          onClick={() => {
                            setShowDropdown(false);
                            setInputValue(artist.name);
                            onSelectArtist(artist);
                          }}
                          className='flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 cursor-pointer transition group'
                        >
                          <img
                            src={artist.imageUrl}
                            alt={artist.name}
                            className='w-9 h-9 rounded-full object-cover shrink-0 border border-white/15'
                          />
                          <div className='min-w-0 flex-1'>
                            <div className='text-sm font-bold text-white group-hover:text-rose-400 transition truncate'>
                              {artist.name}
                            </div>
                            <div className='text-xs text-gray-400 truncate'>
                              {artist.role}
                            </div>
                          </div>
                          <ChevronRight className='w-4 h-4 text-gray-500 shrink-0' />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer Action: Press Enter to search backend */}
                  <div
                    onClick={() => handleTriggerSearch(inputValue)}
                    className='border-t border-white/10 mt-1.5 pt-2 px-3 py-2 flex items-center justify-between text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer rounded-xl hover:bg-white/5 transition'
                  >
                    <span className='flex items-center gap-2 truncate'>
                      <Search className='w-3.5 h-3.5 shrink-0' /> Search backend for &quot;{inputValue}&quot;
                    </span>
                    <span className='px-2 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-[10px] shrink-0'>
                      ↵ Enter
                    </span>
                  </div>
                </>
              ) : (
                /* No quick recommendations - prompt to search backend */
                <div
                  onClick={() => handleTriggerSearch(inputValue)}
                  className='p-3 text-center space-y-1 cursor-pointer hover:bg-white/5 rounded-xl transition'
                >
                  <div className='text-xs text-gray-400'>
                    No local cache preview for &quot;<strong className='text-white'>{inputValue}</strong>&quot;
                  </div>
                  <div className='text-xs font-bold text-rose-400 flex items-center justify-center gap-1.5'>
                    <Search className='w-3.5 h-3.5' /> Press Enter to query backend database
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Badge */}
        <div className='hidden lg:flex items-center gap-2 shrink-0'>
          <span className='text-xs px-2.5 py-1 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 font-medium'>
            100% Free Lyrics
          </span>
        </div>
      </div>
    </header>
  );
};