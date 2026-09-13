import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Sparkles, 
  Disc, 
  Film, 
  Users, 
  Music, 
  Clock, 
  TrendingUp, 
  Play, 
  ChevronRight,
  Filter,
  Flame,
  CheckCircle2,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { Song, MovieAlbum, Artist } from '../data';
import { AdBanner } from './AdBanner';

interface SearchViewProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  songs: Song[];
  movies: MovieAlbum[];
  artists: Artist[];
  onSelectSong: (song: Song) => void;
  onSelectMovie: (movie: MovieAlbum) => void;
  onSelectArtist: (artist: Artist) => void;
  onDeepSearch: (q: string) => void;
  isDeepSearching?: boolean;
}

type FilterCategory = 'all' | 'songs' | 'movies' | 'artists';

export const SearchView: React.FC<SearchViewProps> = ({
  searchQuery,
  onSearchChange,
  songs,
  movies,
  artists,
  onSelectSong,
  onSelectMovie,
  onSelectArtist,
  onDeepSearch,
  isDeepSearching = false,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  const q = searchQuery.toLowerCase().trim();

  // 1. Matched Songs
  const matchedSongs = useMemo(() => {
    if (!q) return [];
    return songs.filter((s) => {
      const matchText =
        s.title.toLowerCase().includes(q) ||
        s.movie.toLowerCase().includes(q) ||
        s.composer.toLowerCase().includes(q) ||
        s.lyricist.toLowerCase().includes(q) ||
        s.singers.some((sing) => sing.toLowerCase().includes(q));

      const matchYear = selectedYear === 'all' || String(s.year) === selectedYear;
      return matchText && matchYear;
    });
  }, [q, songs, selectedYear]);

  // 2. Matched Movies
  const matchedMovies = useMemo(() => {
    if (!q) return [];
    return movies.filter((m) => {
      const matchText = m.title.toLowerCase().includes(q);
      const matchYear = selectedYear === 'all' || String(m.year) === selectedYear;
      return matchText && matchYear;
    });
  }, [q, movies, selectedYear]);

  // 3. Matched Artists & Composers
  const matchedArtists = useMemo(() => {
    if (!q) return [];
    return artists.filter((a) => a.name.toLowerCase().includes(q));
  }, [q, artists]);

  // Available Years Filter Pills
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    songs.forEach((s) => s.year && years.add(s.year));
    return Array.from(years).sort((a, b) => b - a).slice(0, 8);
  }, [songs]);

  // Quick Trending Search Pills
  const quickSearches = [
    'Arabic Kuthu',
    'Vaathi Coming',
    'Kanmani Anbodu',
    'Oru Naalil',
    'Munbe Vaa',
    'Leo',
    'Jailer',
    'Anirudh',
    'A.R. Rahman',
    'Yuvan Shankar Raja'
  ];

  return (
    <div className='min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-fadeIn'>
      
      {/* 1. HERO SEARCH HEADER (Genius & Apple Music Aesthetic) */}
      <div className='relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#12131c] via-[#0d0e14] to-[#090a0f] p-6 sm:p-10 shadow-2xl'>
        {/* Ambient Blur */}
        <div className='absolute -top-24 -right-24 w-96 h-96 rounded-full bg-pink-500/20 blur-[120px] pointer-events-none' />
        <div className='absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-rose-500/15 blur-[120px] pointer-events-none' />

        <div className='relative z-10 max-w-3xl space-y-6'>
          <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-rose-400'>
            <Sparkles className='w-3.5 h-3.5' /> Instant & Deep AI Ingestion Search
          </div>

          <h1 className='text-3xl sm:text-5xl font-black tracking-tight text-white'>
            Search Any Tamil Song, Movie, or Artist
          </h1>

          <p className='text-sm sm:text-base text-gray-400 leading-relaxed'>
            Browse our verified database of authentic Tamil & Tanglish lyrics. If a song isn&apos;t here yet, our AI Deep Search engine will scrape, verify, and add the entire movie album in seconds.
          </p>

          {/* Large Search Input Box */}
          <div className='relative'>
            <div className='relative flex items-center shadow-2xl'>
              <Search className='absolute left-4 w-5 h-5 text-gray-400 pointer-events-none' />
              <input
                type='text'
                autoFocus
                placeholder='Type song name, movie, composer, or singer...'
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    onDeepSearch(searchQuery.trim());
                  }
                }}
                className='w-full pl-12 pr-36 py-4 bg-white/[0.07] hover:bg-white/[0.1] focus:bg-white/[0.12] border border-white/15 focus:border-rose-500/80 rounded-2xl text-base text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40 transition shadow-inner'
              />

              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className='absolute right-32 text-gray-400 hover:text-white p-1'
                >
                  <X className='w-4 h-4' />
                </button>
              )}

              <button
                onClick={() => searchQuery.trim() && onDeepSearch(searchQuery.trim())}
                disabled={!searchQuery.trim() || isDeepSearching}
                className='absolute right-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 via-pink-600 to-rose-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-xs shadow-lg shadow-pink-500/30 transition active:scale-95 disabled:opacity-40 flex items-center gap-1.5'
              >
                <Sparkles className='w-3.5 h-3.5 text-pink-200' />
                <span>{isDeepSearching ? 'Scraping...' : 'Deep Search'}</span>
              </button>
            </div>
          </div>

          {/* Quick Trending Suggestions */}
          <div className='flex flex-wrap items-center gap-2 pt-1'>
            <span className='text-xs text-gray-400 font-bold flex items-center gap-1 mr-1'>
              <TrendingUp className='w-3 h-3 text-rose-400' /> Trending:
            </span>
            {quickSearches.map((term) => (
              <button
                key={term}
                onClick={() => onSearchChange(term)}
                className='px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-xs text-gray-300 hover:text-white transition'
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. FILTER TABS & YEAR FILTER */}
      {searchQuery.trim() && (
        <div className='flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4'>
          {/* Category Filter Pills */}
          <div className='flex items-center gap-2'>
            <button
              onClick={() => setActiveFilter('all')}
              className={'px-4 py-1.5 rounded-full text-xs font-bold transition ' + (activeFilter === 'all' ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:text-white')}
            >
              All Results ({matchedSongs.length + matchedMovies.length + matchedArtists.length})
            </button>
            <button
              onClick={() => setActiveFilter('songs')}
              className={'px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 ' + (activeFilter === 'songs' ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:text-white')}
            >
              <Music className='w-3.5 h-3.5' /> Songs ({matchedSongs.length})
            </button>
            <button
              onClick={() => setActiveFilter('movies')}
              className={'px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 ' + (activeFilter === 'movies' ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:text-white')}
            >
              <Film className='w-3.5 h-3.5' /> Movies ({matchedMovies.length})
            </button>
            <button
              onClick={() => setActiveFilter('artists')}
              className={'px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 ' + (activeFilter === 'artists' ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:text-white')}
            >
              <Users className='w-3.5 h-3.5' /> Artists ({matchedArtists.length})
            </button>
          </div>

          {/* Release Year Filter Pills */}
          <div className='flex items-center gap-1.5 overflow-x-auto text-xs'>
            <span className='text-gray-400 font-semibold mr-1 flex items-center gap-1'>
              <SlidersHorizontal className='w-3 h-3 text-gray-500' /> Year:
            </span>
            <button
              onClick={() => setSelectedYear('all')}
              className={'px-2.5 py-1 rounded-lg text-xs font-bold transition ' + (selectedYear === 'all' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:text-white')}
            >
              All
            </button>
            {availableYears.map((yr) => (
              <button
                key={yr}
                onClick={() => setSelectedYear(String(yr))}
                className={'px-2.5 py-1 rounded-lg text-xs font-bold transition ' + (selectedYear === String(yr) ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:text-white')}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. SEARCH RESULTS DISPLAY */}
      {searchQuery.trim() ? (
        <div className='space-y-10'>
          
          {/* ZERO RESULTS / DEEP SEARCH BANNER */}
          {matchedSongs.length === 0 && matchedMovies.length === 0 && matchedArtists.length === 0 && (
            <div className='rounded-3xl border border-white/10 bg-[#12141c]/90 p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-5 shadow-2xl backdrop-blur-xl'>
              <div className='w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(244,63,94,0.3)]'>
                <Sparkles className='w-8 h-8' />
              </div>
              <div className='space-y-2'>
                <h3 className='text-2xl font-black text-white'>
                  Song Not in Local Catalog Yet
                </h3>
                <p className='text-sm text-gray-400 leading-relaxed'>
                  No local matches found for &quot;<strong className='text-white'>{searchQuery}</strong>&quot;.
                  Click below to trigger our AI Deep Search engine—we will fetch verified Tamil & Tanglish lyrics and scrape the entire movie album in seconds!
                </p>
              </div>
              <button
                onClick={() => onDeepSearch(searchQuery)}
                disabled={isDeepSearching}
                className='px-6 py-3 rounded-full bg-gradient-to-r from-rose-500 via-pink-600 to-rose-600 hover:from-rose-600 hover:to-pink-700 text-white font-black text-sm shadow-xl shadow-pink-500/30 transition active:scale-95 flex items-center gap-2 mx-auto'
              >
                <Sparkles className='w-4 h-4 text-pink-200' />
                <span>Deep Search & Ingest &quot;{searchQuery}&quot;</span>
              </button>
            </div>
          )}

          {/* SECTION A: MATCHED SONGS */}
          {(activeFilter === 'all' || activeFilter === 'songs') && matchedSongs.length > 0 && (
            <section className='space-y-4'>
              <div className='flex items-center justify-between'>
                <h2 className='text-xl font-bold text-white flex items-center gap-2'>
                  <Music className='w-5 h-5 text-rose-500' />
                  Songs Matching &quot;{searchQuery}&quot; ({matchedSongs.length})
                </h2>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4'>
                {matchedSongs.map((song, idx) => (
                  <div
                    key={song.id}
                    onClick={() => onSelectSong(song)}
                    className='group flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-pink-500/30 transition duration-200 cursor-pointer shadow-lg'
                  >
                    <div className='flex items-center gap-3.5 min-w-0'>
                      <span className='w-5 text-center font-bold text-xs text-gray-500 group-hover:text-pink-400 font-mono'>
                        {idx + 1}
                      </span>

                      <div className='relative w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-md border border-white/10'>
                        <img
                          src={song.coverUrl}
                          alt={song.title}
                          className='w-full h-full object-cover group-hover:scale-110 transition duration-300'
                        />
                      </div>

                      <div className='min-w-0'>
                        <div className='font-bold text-sm sm:text-base text-white group-hover:text-pink-400 transition truncate'>
                          {song.title}
                        </div>
                        <div className='text-xs text-gray-400 truncate mt-0.5'>
                          {song.movie} • {song.year}
                        </div>
                        <div className='text-[11px] text-gray-400 truncate'>
                          {song.composer} {song.singers.length > 0 && `• ${song.singers.slice(0, 2).join(', ')}`}
                        </div>
                      </div>
                    </div>

                    <div className='flex items-center gap-2 shrink-0'>
                      <button className='px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-rose-500 text-white text-xs font-bold transition group-hover:bg-rose-500 shadow-sm'>
                        Lyrics
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SECTION B: MATCHED MOVIES */}
          {(activeFilter === 'all' || activeFilter === 'movies') && matchedMovies.length > 0 && (
            <section className='space-y-4 pt-4'>
              <h2 className='text-xl font-bold text-white flex items-center gap-2'>
                <Film className='w-5 h-5 text-pink-500' />
                Movie Albums Matching &quot;{searchQuery}&quot; ({matchedMovies.length})
              </h2>

              <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4'>
                {matchedMovies.map((movie) => (
                  <div
                    key={movie.id}
                    onClick={() => onSelectMovie(movie)}
                    className='group cursor-pointer space-y-2.5'
                  >
                    <div className='relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-white/5'>
                      <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        className='w-full h-full object-cover group-hover:scale-105 transition duration-500'
                      />
                      <div className='absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] text-white font-bold'>
                        {movie.trackCount} {movie.trackCount === 1 ? 'Track' : 'Tracks'}
                      </div>
                    </div>
                    <div>
                      <div className='font-bold text-sm text-white group-hover:text-pink-400 transition truncate'>
                        {movie.title}
                      </div>
                      <div className='text-xs text-gray-400'>{movie.year}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SECTION C: MATCHED ARTISTS & COMPOSERS */}
          {(activeFilter === 'all' || activeFilter === 'artists') && matchedArtists.length > 0 && (
            <section className='space-y-4 pt-4'>
              <h2 className='text-xl font-bold text-white flex items-center gap-2'>
                <Users className='w-5 h-5 text-purple-400' />
                Artists & Composers Matching &quot;{searchQuery}&quot; ({matchedArtists.length})
              </h2>

              <div className='grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-center'>
                {matchedArtists.map((artist) => (
                  <div
                    key={artist.id}
                    onClick={() => onSelectArtist(artist)}
                    className='group cursor-pointer space-y-2 flex flex-col items-center p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 transition'
                  >
                    <div className='relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-pink-500 shadow-xl transition duration-300'>
                      <img
                        src={artist.imageUrl}
                        alt={artist.name}
                        className='w-full h-full object-cover group-hover:scale-110 transition duration-500'
                      />
                    </div>
                    <div>
                      <div className='font-bold text-xs sm:text-sm text-white group-hover:text-pink-400 transition line-clamp-1'>
                        {artist.name}
                      </div>
                      <div className='text-[10px] text-gray-400 truncate mt-0.5'>{artist.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      ) : (
        /* EMPTY STATE / DISCOVERY MODE (Before User Types) */
        <div className='space-y-12 pt-4'>
          {/* Popular Artists quick carousel */}
          <div className='space-y-4'>
            <h2 className='text-lg font-bold text-white flex items-center gap-2'>
              <Users className='w-4 h-4 text-rose-500' /> Browse by Top Music Composers
            </h2>
            <div className='grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center'>
              {artists.slice(0, 8).map((artist) => (
                <div
                  key={artist.id}
                  onClick={() => onSelectArtist(artist)}
                  className='group cursor-pointer space-y-2 flex flex-col items-center'
                >
                  <div className='relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-pink-500 shadow-lg transition duration-300'>
                    <img
                      src={artist.imageUrl}
                      alt={artist.name}
                      className='w-full h-full object-cover group-hover:scale-110 transition duration-500'
                    />
                  </div>
                  <div className='font-bold text-xs text-white group-hover:text-pink-400 transition line-clamp-1'>
                    {artist.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Movie Albums */}
          <div className='space-y-4'>
            <h2 className='text-lg font-bold text-white flex items-center gap-2'>
              <Film className='w-4 h-4 text-rose-500' /> Browse by Movie Albums
            </h2>
            <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4'>
              {movies.slice(0, 6).map((movie) => (
                <div
                  key={movie.id}
                  onClick={() => onSelectMovie(movie)}
                  className='group cursor-pointer space-y-2'
                >
                  <div className='relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-white/5'>
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className='w-full h-full object-cover group-hover:scale-105 transition duration-500'
                    />
                    <div className='absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] text-white font-bold'>
                      {movie.trackCount} Tracks
                    </div>
                  </div>
                  <div>
                    <div className='font-bold text-xs sm:text-sm text-white group-hover:text-pink-400 transition truncate'>
                      {movie.title}
                    </div>
                    <div className='text-[10px] text-gray-400'>{movie.year}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <AdBanner type='leaderboard' />
        </div>
      )}

    </div>
  );
};
