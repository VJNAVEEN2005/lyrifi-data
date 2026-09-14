import React, { useState, useMemo } from 'react';
import { Film, Search, ChevronRight, SlidersHorizontal, Music } from 'lucide-react';
import { MovieAlbum, Song } from '../data';

interface MoviesViewProps {
  movies: MovieAlbum[];
  onSelectMovie: (movie: MovieAlbum) => void;
  onSelectSong: (song: Song) => void;
  allSongs: Song[];
}

export const MoviesView: React.FC<MoviesViewProps> = ({
  movies,
  onSelectMovie,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(36);

  // Available unique years in descending order
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    movies.forEach((m) => m.year && years.add(m.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [movies]);

  // Sort movies strictly by latest release order (newest year first)
  const sortedAndFilteredMovies = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();

    const filtered = movies.filter((m) => {
      // Exclude generic singles albums
      const titleLower = (m.title || '').toLowerCase();
      if (titleLower === 'tamil song' || titleLower === 'tamil single') return false;

      // Year filter
      if (selectedYear !== 'all') {
        if (selectedYear === 'earlier') {
          if ((m.year || 0) >= 2015) return false;
        } else if (String(m.year) !== selectedYear) {
          return false;
        }
      }

      // Search text filter
      if (q && !titleLower.includes(q)) {
        return false;
      }

      return true;
    });

    // Strictly order by latest release year descending, then track count
    return filtered.sort((a, b) => (b.year || 0) - (a.year || 0) || b.trackCount - a.trackCount);
  }, [movies, searchFilter, selectedYear]);

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8'>
      
      {/* 1. HEADER & SEARCH BAR */}
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/10'>
        <div>
          <div className='flex items-center gap-2.5'>
            <div className='w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20 text-white'>
              <Film className='w-5 h-5' />
            </div>
            <div>
              <h1 className='text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3'>
                Movie Albums
              </h1>
              <p className='text-xs sm:text-sm text-gray-400 mt-1'>
                Browse complete Tamil soundtrack albums in <span className='text-rose-400 font-semibold'>latest release order</span> ({sortedAndFilteredMovies.length} movies)
              </p>
            </div>
          </div>
        </div>

        {/* Quick Filter Search */}
        <div className='relative max-w-xs w-full'>
          <Search className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none' />
          <input
            type='text'
            placeholder='Filter movie albums...'
            value={searchFilter}
            onChange={(e) => {
              setSearchFilter(e.target.value);
              setVisibleCount(36);
            }}
            className='w-full pl-10 pr-4 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.08] focus:bg-white/[0.1] border border-white/10 focus:border-rose-500/70 text-sm text-white placeholder-gray-400 focus:outline-none transition'
          />
        </div>
      </div>

      {/* 2. YEAR FILTER PILLS */}
      <div className='flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs'>
        <span className='text-gray-400 font-semibold flex items-center gap-1 shrink-0 mr-1'>
          <SlidersHorizontal className='w-3.5 h-3.5 text-gray-500' /> Release Year:
        </span>
        <button
          onClick={() => {
            setSelectedYear('all');
            setVisibleCount(36);
          }}
          className={'px-3 py-1.5 rounded-full font-bold transition shrink-0 ' + (selectedYear === 'all' ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md' : 'bg-white/5 hover:bg-white/10 text-gray-300')}
        >
          All Years ({movies.length})
        </button>

        {availableYears.map((yr) => (
          <button
            key={yr}
            onClick={() => {
              setSelectedYear(String(yr));
              setVisibleCount(36);
            }}
            className={'px-3 py-1.5 rounded-full font-bold transition shrink-0 ' + (selectedYear === String(yr) ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md' : 'bg-white/5 hover:bg-white/10 text-gray-300')}
          >
            {yr}
          </button>
        ))}

        <button
          onClick={() => {
            setSelectedYear('earlier');
            setVisibleCount(36);
          }}
          className={'px-3 py-1.5 rounded-full font-bold transition shrink-0 ' + (selectedYear === 'earlier' ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md' : 'bg-white/5 hover:bg-white/10 text-gray-300')}
        >
          Classics (&lt;2015)
        </button>
      </div>

      {/* 3. MOVIES GRID (Latest Released Order) */}
      {sortedAndFilteredMovies.length > 0 ? (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5'>
          {sortedAndFilteredMovies.slice(0, visibleCount).map((movie) => (
            <div
              key={movie.id}
              onClick={() => onSelectMovie(movie)}
              className='group cursor-pointer space-y-2.5 p-2 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-rose-500/30 transition duration-300 shadow-lg'
            >
              <div className='relative aspect-[3/4] rounded-xl overflow-hidden border border-white/10 shadow-md bg-white/5'>
                <img
                  src={movie.posterUrl || '/default-cover.svg'}
                  alt={movie.title}
                  className='w-full h-full object-cover group-hover:scale-105 transition duration-500'
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/default-cover.svg';
                  }}
                />
                
                {/* Year tag overlay */}
                <div className='absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono font-bold text-rose-300 border border-white/10'>
                  {movie.year}
                </div>

                {/* Track count overlay */}
                <div className='absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1 border border-white/10'>
                  <Music className='w-2.5 h-2.5 text-rose-400' />
                  <span>{movie.trackCount} {movie.trackCount === 1 ? 'Track' : 'Tracks'}</span>
                </div>
              </div>

              <div>
                <div className='font-bold text-sm text-white group-hover:text-rose-400 transition truncate uppercase'>
                  {movie.title}
                </div>
                <div className='text-xs text-gray-400 flex items-center justify-between mt-0.5'>
                  <span>Year {movie.year}</span>
                  <span className='text-[10px] text-rose-400 group-hover:underline flex items-center'>
                    View <ChevronRight className='w-3 h-3 ml-0.5' />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className='py-20 text-center space-y-3 bg-white/[0.02] border border-white/5 rounded-3xl p-8'>
          <Film className='w-12 h-12 text-gray-600 mx-auto' />
          <div className='text-lg font-bold text-white'>No movie albums found</div>
          <p className='text-xs text-gray-400 max-w-sm mx-auto'>
            No movies match your current search or year filter. Try clearing your filters or search the archive.
          </p>
          <button
            onClick={() => {
              setSearchFilter('');
              setSelectedYear('all');
            }}
            className='px-4 py-2 rounded-full bg-rose-500 text-white font-bold text-xs shadow-md hover:bg-rose-600 transition'
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Show More button if many movies */}
      {sortedAndFilteredMovies.length > visibleCount && (
        <div className='text-center pt-4'>
          <button
            onClick={() => setVisibleCount((prev) => prev + 36)}
            className='px-8 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-gray-300 hover:text-white transition active:scale-95 shadow-lg'
          >
            Show More Movies ({sortedAndFilteredMovies.length - visibleCount} remaining)
          </button>
        </div>
      )}

    </div>
  );
};
