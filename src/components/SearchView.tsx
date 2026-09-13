import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  Film, 
  Users, 
  Music, 
  TrendingUp, 
  ChevronRight,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { Song, MovieAlbum, Artist, normalizeArtistSlug } from '../data';
import { BackendSearchResults } from '../services/api';
import { DeepSearchModal } from './DeepSearchModal';

interface SearchViewProps {
  searchQuery: string;
  onSearchSubmit: (q: string) => void;
  songs: Song[];
  movies: MovieAlbum[];
  artists: Artist[];
  backendResults?: BackendSearchResults | null;
  isSearchingBackend?: boolean;
  onSelectSong: (song: Song) => void;
  onSelectMovie: (movie: MovieAlbum) => void;
  onSelectArtist: (artist: Artist) => void;
  onDeepSearch: (data: { query: string; type: 'movie' | 'song'; targetMovieUrl?: string; year?: number }) => Promise<void>;
  isDeepSearching?: boolean;
  candidateMovies?: MovieAlbum[];
  onClearCandidates?: () => void;
}

type FilterCategory = 'all' | 'songs' | 'movies' | 'artists';

export const SearchView: React.FC<SearchViewProps> = ({
  searchQuery,
  onSearchSubmit,
  songs,
  movies,
  artists,
  backendResults,
  isSearchingBackend = false,
  onSelectSong,
  onSelectMovie,
  onSelectArtist,
  onDeepSearch,
  isDeepSearching = false,
  candidateMovies = [],
  onClearCandidates,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [localInput, setLocalInput] = useState<string>(searchQuery);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [isDeepSearchModalOpen, setIsDeepSearchModalOpen] = useState<boolean>(false);
  const [visibleSongs, setVisibleSongs] = useState<number>(20);
  const [visibleMovies, setVisibleMovies] = useState<number>(20);
  const [visibleArtists, setVisibleArtists] = useState<number>(20);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync local input if external searchQuery changes (e.g. via URL or back button) and close dropdown
  useEffect(() => {
    setLocalInput(searchQuery);
    setShowDropdown(false);
    setVisibleSongs(20);
    setVisibleMovies(20);
    setVisibleArtists(20);
  }, [searchQuery]);

  // Close recommendations dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute live recommendations for autocomplete while typing
  const trimmed = localInput.trim().toLowerCase();
  const recommendations = useMemo(() => {
    if (!trimmed) return { songs: [], movies: [], artists: [] };

    const matchedS = songs
      .filter(
        (s) =>
          s.title.toLowerCase().includes(trimmed) ||
          s.movie.toLowerCase().includes(trimmed) ||
          s.composer.toLowerCase().includes(trimmed) ||
          s.singers.some((singer) => singer.toLowerCase().includes(trimmed))
      )
      .slice(0, 4);

    const matchedM = movies
      .filter((m) => m.title.toLowerCase().includes(trimmed))
      .slice(0, 3);

    const matchedA: Artist[] = [];
    const seenArtists = new Set<string>();
    for (const a of artists) {
      if (a.name.toLowerCase().includes(trimmed)) {
        const canonical = normalizeArtistSlug(a.id || a.name);
        if (!seenArtists.has(canonical)) {
          seenArtists.add(canonical);
          matchedA.push(a);
          if (matchedA.length >= 2) break;
        }
      }
    }

    return { songs: matchedS, movies: matchedM, artists: matchedA };
  }, [trimmed, songs, movies, artists]);

  const hasRecommendations =
    recommendations.songs.length > 0 ||
    recommendations.movies.length > 0 ||
    recommendations.artists.length > 0;

  // Local fallback results if backendResults is not yet populated
  const q = searchQuery.toLowerCase().trim();
  const localMatchedSongs = useMemo(() => {
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

  const localMatchedMovies = useMemo(() => {
    if (!q) return [];
    return movies.filter((m) => {
      const matchText = m.title.toLowerCase().includes(q);
      const matchYear = selectedYear === 'all' || String(m.year) === selectedYear;
      return matchText && matchYear;
    });
  }, [q, movies, selectedYear]);

  const localMatchedArtists = useMemo(() => {
    if (!q) return [];
    return artists.filter((a) => a.name.toLowerCase().includes(q));
  }, [q, artists]);

  // Actual display results: prefer verified backend results
  const matchedSongs = useMemo(() => {
    if (backendResults) {
      if (selectedYear === 'all') return backendResults.songs;
      return backendResults.songs.filter((s) => String(s.year) === selectedYear);
    }
    return localMatchedSongs;
  }, [backendResults, localMatchedSongs, selectedYear]);

  const matchedMovies = useMemo(() => {
    if (backendResults) {
      if (selectedYear === 'all') return backendResults.movies;
      return backendResults.movies.filter((m) => String(m.year) === selectedYear);
    }
    return localMatchedMovies;
  }, [backendResults, localMatchedMovies, selectedYear]);

  const matchedArtists = useMemo(() => {
    const list = backendResults ? backendResults.artists : localMatchedArtists;
    const map = new Map<string, Artist>();
    list.forEach((a) => {
      const canonical = normalizeArtistSlug(a.id || a.name);
      if (!map.has(canonical)) {
        map.set(canonical, a);
      }
    });
    return Array.from(map.values());
  }, [backendResults, localMatchedArtists]);

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

  const handleCommitSearch = (query: string) => {
    const finalQ = query.trim();
    if (!finalQ) return;
    setShowDropdown(false);
    onSearchSubmit(finalQ);
  };

  return (
    <div className='min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-fadeIn'>
      
      {/* 1. CLEAN CENTERED SEARCH BAR WITH AUTOCOMPLETE RECOMMENDATIONS */}
      <div className='max-w-3xl mx-auto pt-4 sm:pt-8 pb-2 space-y-4 text-center'>
        
        <div ref={containerRef} className='relative max-w-2xl mx-auto'>
          <div className='relative flex items-center rounded-full bg-white/[0.07] hover:bg-white/[0.1] focus-within:bg-white/[0.12] border border-white/15 focus-within:border-rose-500/70 shadow-2xl backdrop-blur-xl transition-all duration-200'>
            <Search className='absolute left-5 w-5 h-5 text-gray-400 pointer-events-none' />
            <input
              type='text'
              autoFocus
              placeholder='Search Tamil songs, movies, artists...'
              value={localInput}
              onChange={(e) => {
                setLocalInput(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => {
                if (localInput.trim()) setShowDropdown(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && localInput.trim()) {
                  setShowDropdown(false);
                  (e.target as HTMLInputElement).blur();
                  handleCommitSearch(localInput);
                } else if (e.key === 'Escape') {
                  setShowDropdown(false);
                }
              }}
              className='w-full pl-14 pr-56 py-3.5 sm:py-4 bg-transparent text-sm sm:text-base text-white placeholder-gray-400 focus:outline-none'
            />

            {localInput && (
              <button
                onClick={() => {
                  setLocalInput('');
                  setShowDropdown(false);
                }}
                className='absolute right-48 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition'
                title='Clear search'
              >
                <X className='w-4 h-4' />
              </button>
            )}

            <div className='absolute right-2 flex items-center gap-1.5'>
              <button
                type='button'
                onClick={() => setIsDeepSearchModalOpen(true)}
                className='px-3 sm:px-3.5 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 border border-amber-500/30 hover:border-amber-500/50 text-amber-300 hover:text-amber-200 font-bold text-xs shadow-sm transition active:scale-95 flex items-center gap-1.5'
                title='AI Deep Search & Ingestion'
              >
                <Sparkles className='w-3.5 h-3.5 text-amber-300' />
                <span className='hidden sm:inline'>Deep Search</span>
              </button>

              <button
                onClick={() => localInput.trim() && handleCommitSearch(localInput)}
                className='px-3.5 sm:px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-xs shadow-md shadow-pink-500/30 transition active:scale-95 flex items-center gap-1.5'
                title='Execute search'
              >
                <Search className='w-3.5 h-3.5' />
                <span>Search</span>
              </button>
            </div>
          </div>

          {/* Autocomplete Recommendations Dropdown below center search bar */}
          {showDropdown && trimmed && (
            <div className='absolute left-0 right-0 top-full mt-2 bg-[#10121a]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-2 z-50 space-y-1 text-left max-h-[70vh] overflow-y-auto'>
              {hasRecommendations ? (
                <>
                  {/* Songs */}
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
                            setLocalInput(song.title);
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

                  {/* Movies */}
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
                            setLocalInput(movie.title);
                            handleCommitSearch(movie.title);
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
                              Movie Album • {movie.trackCount} Tracks ({movie.year})
                            </div>
                          </div>
                          <ChevronRight className='w-4 h-4 text-gray-500 shrink-0' />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Artists */}
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
                            setLocalInput(artist.name);
                            handleCommitSearch(artist.name);
                          }}
                          className='flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 cursor-pointer transition group'
                        >
                          <img
                            src={artist.imageUrl}
                            alt={artist.name}
                            className='w-9 h-9 rounded-full object-cover shrink-0 border border-white/15'
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/artists/default-artist.svg';
                            }}
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

                  {/* Press Enter footer */}
                  <div
                    onClick={() => handleCommitSearch(localInput)}
                    className='border-t border-white/10 mt-1 pt-2 px-3 py-1.5 flex items-center justify-between text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer rounded-xl hover:bg-white/5 transition'
                  >
                    <span className='flex items-center gap-2 truncate'>
                      <Search className='w-3.5 h-3.5 shrink-0' /> Search backend for &quot;{localInput}&quot;
                    </span>
                    <span className='px-2 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-[10px] shrink-0'>
                      ↵ Enter
                    </span>
                  </div>
                </>
              ) : (
                <div
                  onClick={() => handleCommitSearch(localInput)}
                  className='p-3 text-center space-y-1 cursor-pointer hover:bg-white/5 rounded-xl transition'
                >
                  <div className='text-xs text-gray-400'>
                    Press Enter to search backend database
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Centered Quick Trending Suggestions */}
        <div className='flex flex-wrap items-center justify-center gap-2 pt-1'>
          <span className='text-xs text-gray-400 font-semibold flex items-center gap-1 mr-1'>
            <TrendingUp className='w-3 h-3 text-rose-400' /> Trending:
          </span>
          {quickSearches.map((term) => (
            <button
              key={term}
              onClick={() => {
                setLocalInput(term);
                handleCommitSearch(term);
              }}
              className='px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/10 border border-white/10 text-xs text-gray-300 hover:text-white transition'
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* 2. FILTER TABS & YEAR FILTER */}
      {!isSearchingBackend && searchQuery.trim() && (
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
              onClick={() => setActiveFilter('movies')}
              className={'px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 ' + (activeFilter === 'movies' ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:text-white')}
            >
              <Film className='w-3.5 h-3.5' /> Movies ({matchedMovies.length})
            </button>
            <button
              onClick={() => setActiveFilter('songs')}
              className={'px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 ' + (activeFilter === 'songs' ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:text-white')}
            >
              <Music className='w-3.5 h-3.5' /> Songs ({matchedSongs.length})
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

      {/* 3. SEARCH RESULTS DISPLAY OR BACKEND LOADER */}
      {isSearchingBackend ? (
        <div className='py-20 flex flex-col items-center justify-center space-y-4 text-center'>
          <div className='flex items-end gap-1.5 h-10'>
            <span className='w-2 h-6 bg-pink-500 rounded-full animate-bounce'></span>
            <span className='w-2 h-10 bg-rose-500 rounded-full animate-bounce [animation-delay:0.15s]'></span>
            <span className='w-2 h-8 bg-pink-400 rounded-full animate-bounce [animation-delay:0.3s]'></span>
            <span className='w-2 h-5 bg-rose-400 rounded-full animate-bounce [animation-delay:0.45s]'></span>
          </div>
          <div className='text-lg text-white font-black'>
            Fetching results for &quot;<span className='text-rose-400'>{searchQuery}</span>&quot; from backend...
          </div>
          <p className='text-xs text-gray-400 max-w-sm'>
            Searching database catalog and verified Tamil lyrics on Cloudflare Worker
          </p>
        </div>
      ) : searchQuery.trim() ? (
        <div className='space-y-10'>
          
          {/* ZERO RESULTS / DEEP SEARCH BANNER */}
          {matchedSongs.length === 0 && matchedMovies.length === 0 && matchedArtists.length === 0 && (
            <div className='rounded-3xl border border-white/10 bg-[#12141c]/90 p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-5 shadow-2xl backdrop-blur-xl'>
              <div className='w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(244,63,94,0.3)]'>
                <Sparkles className='w-8 h-8' />
              </div>
              <div className='space-y-2'>
                <h3 className='text-2xl font-black text-white'>
                  No Matches Found in Catalog
                </h3>
                <p className='text-sm text-gray-400 leading-relaxed'>
                  Could not find songs, movies, or artists matching &quot;<strong className='text-white'>{searchQuery}</strong>&quot; in our database.
                  Click below to trigger our AI Deep Search crawler to ingest the movie album or individual song from web archives!
                </p>
              </div>
              <button
                onClick={() => setIsDeepSearchModalOpen(true)}
                disabled={isDeepSearching}
                className='px-6 py-3 rounded-full bg-gradient-to-r from-rose-500 via-pink-600 to-rose-600 hover:from-rose-600 hover:to-pink-700 text-white font-black text-sm shadow-xl shadow-pink-500/30 transition active:scale-95 flex items-center gap-2 mx-auto'
              >
                <Sparkles className='w-4 h-4 text-pink-200' />
                <span>Deep Search & Ingest &quot;{searchQuery}&quot;</span>
              </button>
            </div>
          )}

          {/* SECTION A: MATCHED MOVIES (Presented as clean list like songs, allowing user to choose) */}
          {(activeFilter === 'all' || activeFilter === 'movies') && matchedMovies.length > 0 && (
            <section className='space-y-4'>
              <div className='flex items-center justify-between'>
                <h2 className='text-xl font-bold text-white flex items-center gap-2'>
                  <Film className='w-5 h-5 text-rose-500' />
                  Movie Albums Matching &quot;{searchQuery}&quot; ({matchedMovies.length})
                </h2>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4'>
                {matchedMovies.slice(0, visibleMovies).map((movie, idx) => (
                  <div
                    key={movie.id}
                    onClick={() => onSelectMovie(movie)}
                    className='group flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-pink-500/30 transition duration-200 cursor-pointer shadow-lg'
                  >
                    <div className='flex items-center gap-3.5 min-w-0'>
                      <span className='w-5 text-center font-bold text-xs text-gray-500 group-hover:text-pink-400 font-mono'>
                        {idx + 1}
                      </span>

                      <div className='relative w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-md border border-white/10 bg-white/5'>
                        <img
                          src={movie.posterUrl || '/default-cover.svg'}
                          alt={movie.title}
                          className='w-full h-full object-cover group-hover:scale-110 transition duration-300'
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/default-cover.svg';
                          }}
                        />
                      </div>

                      <div className='min-w-0'>
                        <div className='font-bold text-sm sm:text-base text-white group-hover:text-pink-400 transition truncate uppercase'>
                          {movie.title}
                        </div>
                        <div className='text-xs text-gray-400 truncate mt-0.5'>
                          Year {movie.year} • Soundtrack Album
                        </div>
                        <div className='text-[11px] text-rose-400 font-medium truncate'>
                          {movie.trackCount} {movie.trackCount === 1 ? 'Song Track' : 'Song Tracks'} available
                        </div>
                      </div>
                    </div>

                    <div className='flex items-center gap-2 shrink-0'>
                      <button className='px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-rose-500 text-white text-xs font-bold transition group-hover:bg-rose-500 shadow-sm flex items-center gap-1'>
                        <span>View Album</span>
                        <ChevronRight className='w-3.5 h-3.5' />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {matchedMovies.length > visibleMovies && (
                <div className='text-center pt-2'>
                  <button onClick={() => setVisibleMovies((v) => v + 20)} className='px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-gray-300 hover:text-white transition'>
                    Show More Movies ({matchedMovies.length - visibleMovies} remaining)
                  </button>
                </div>
              )}
            </section>
          )}

          {/* SECTION B: MATCHED SONGS */}
          {(activeFilter === 'all' || activeFilter === 'songs') && matchedSongs.length > 0 && (
            <section className='space-y-4 pt-4'>
              <div className='flex items-center justify-between'>
                <h2 className='text-xl font-bold text-white flex items-center gap-2'>
                  <Music className='w-5 h-5 text-rose-500' />
                  Songs Matching &quot;{searchQuery}&quot; ({matchedSongs.length})
                </h2>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4'>
                {matchedSongs.slice(0, visibleSongs).map((song, idx) => (
                  <div
                    key={song.id}
                    onClick={() => onSelectSong(song)}
                    className='group flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-pink-500/30 transition duration-200 cursor-pointer shadow-lg'
                  >
                    <div className='flex items-center gap-3.5 min-w-0'>
                      <span className='w-5 text-center font-bold text-xs text-gray-500 group-hover:text-pink-400 font-mono'>
                        {idx + 1}
                      </span>

                      <div className='relative w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-md border border-white/10 bg-white/5'>
                        <img
                          src={song.coverUrl || '/default-cover.svg'}
                          alt={song.title}
                          className='w-full h-full object-cover group-hover:scale-110 transition duration-300'
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/default-cover.svg';
                          }}
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
              {matchedSongs.length > visibleSongs && (
                <div className='text-center pt-2'>
                  <button onClick={() => setVisibleSongs((v) => v + 20)} className='px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-gray-300 hover:text-white transition'>
                    Show More Songs ({matchedSongs.length - visibleSongs} remaining)
                  </button>
                </div>
              )}
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
                {matchedArtists.slice(0, visibleArtists).map((artist) => (
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
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/artists/default-artist.svg';
                        }}
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
              {matchedArtists.length > visibleArtists && (
                <div className='text-center pt-2'>
                  <button onClick={() => setVisibleArtists((v) => v + 20)} className='px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-gray-300 hover:text-white transition'>
                    Show More Artists ({matchedArtists.length - visibleArtists} remaining)
                  </button>
                </div>
              )}
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
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/artists/default-artist.svg';
                      }}
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
        </div>
      )}

      {/* Deep Search Confirmation Modal with Movie / Song Prompt & Disclaimer */}
      <DeepSearchModal
        isOpen={isDeepSearchModalOpen || candidateMovies.length > 0}
        initialQuery={localInput.trim() || searchQuery}
        onClose={() => {
          setIsDeepSearchModalOpen(false);
          onClearCandidates?.();
        }}
        onSubmit={async (data) => {
          await onDeepSearch(data);
          if (data.targetMovieUrl || data.type === 'song') {
            setIsDeepSearchModalOpen(false);
          }
        }}
        isLoading={isDeepSearching}
        candidateMovies={candidateMovies}
        onClearCandidates={onClearCandidates}
      />

    </div>
  );
};
