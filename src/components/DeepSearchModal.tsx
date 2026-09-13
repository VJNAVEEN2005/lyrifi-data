import React, { useState, useEffect } from 'react';
import { Film, Music, Sparkles, X, Check, Loader2, ChevronRight, ArrowLeft } from 'lucide-react';
import { MovieAlbum } from '../data';

interface DeepSearchModalProps {
  isOpen: boolean;
  initialQuery: string;
  onClose: () => void;
  onSubmit: (data: { query: string; type: 'movie' | 'song'; targetMovieUrl?: string; year?: number }) => Promise<void>;
  isLoading?: boolean;
  candidateMovies?: MovieAlbum[];
  onClearCandidates?: () => void;
}

export const DeepSearchModal: React.FC<DeepSearchModalProps> = ({
  isOpen,
  initialQuery,
  onClose,
  onSubmit,
  isLoading = false,
  candidateMovies = [],
  onClearCandidates,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [searchType, setSearchType] = useState<'movie' | 'song'>('movie');

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    await onSubmit({ query: query.trim(), type: searchType });
  };

  const handleSelectCandidate = async (movie: MovieAlbum) => {
    await onSubmit({
      query: movie.title,
      type: 'movie',
      targetMovieUrl: movie.movieUrl,
      year: movie.year,
    });
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn'>
      <div 
        className='relative w-full max-w-xl rounded-3xl bg-[#12141e] border border-white/10 shadow-2xl p-6 sm:p-8 space-y-6 text-white overflow-hidden max-h-[90vh] flex flex-col'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Accent */}
        <div className='absolute -top-24 -right-24 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none' />
        <div className='absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none' />

        {/* Header */}
        <div className='flex items-center justify-between shrink-0'>
          <div className='flex items-center gap-2.5'>
            <div className='w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20 shrink-0'>
              <Sparkles className='w-5 h-5 text-white' />
            </div>
            <div>
              <h3 className='text-lg font-black tracking-tight'>
                {candidateMovies.length > 0 ? 'Multiple Movies Found' : 'AI Deep Search & Ingest'}
              </h3>
              <p className='text-xs text-gray-400'>
                {candidateMovies.length > 0
                  ? `Select the movie album you want to explore`
                  : 'Fetch directly from digital archives'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className='p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* CANDIDATE MOVIE SELECTION VIEW */}
        {candidateMovies.length > 0 ? (
          <div className='space-y-4 overflow-y-auto pr-1 flex-1'>
            <div className='p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-gray-300 leading-relaxed'>
              We found <strong>{candidateMovies.length} movies</strong> matching &quot;<span className='text-rose-400'>{query}</span>&quot;. Which release are you looking for?
            </div>

            <div className='space-y-3'>
              {candidateMovies.map((movie) => (
                <div
                  key={movie.id}
                  onClick={() => !isLoading && handleSelectCandidate(movie)}
                  className='group flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-pink-500/40 transition duration-200 cursor-pointer shadow-lg'
                >
                  <div className='flex items-center gap-3.5 min-w-0'>
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
                      <div className='flex items-center gap-2 mt-1'>
                        <span className='px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[11px] font-bold'>
                          Year {movie.year}
                        </span>
                        <span className='text-[11px] text-gray-400'>
                          {movie.trackCount} {movie.trackCount === 1 ? 'track' : 'tracks'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className='shrink-0 pl-2'>
                    <button
                      disabled={isLoading}
                      className='px-3.5 py-1.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition shadow-md flex items-center gap-1 group-hover:scale-105'
                    >
                      {isLoading ? (
                        <Loader2 className='w-3.5 h-3.5 animate-spin' />
                      ) : (
                        <>
                          <span>Select Album</span>
                          <ChevronRight className='w-3.5 h-3.5' />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className='pt-2 flex justify-start'>
              <button
                type='button'
                onClick={onClearCandidates}
                disabled={isLoading}
                className='text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition py-1'
              >
                <ArrowLeft className='w-3.5 h-3.5' />
                <span>Search for a different title</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className='space-y-5 flex-1'>
            {/* Question: Is this a Movie or a Song? */}
            <div className='space-y-2'>
              <label className='block text-xs font-bold uppercase tracking-wider text-gray-400'>
                What are you searching for?
              </label>
              <div className='grid grid-cols-2 gap-3'>
                <button
                  type='button'
                  onClick={() => setSearchType('movie')}
                  className={`flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border font-bold text-sm transition ${
                    searchType === 'movie'
                      ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-md shadow-rose-500/10'
                      : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <Film className='w-4 h-4' />
                  <span>Movie Album</span>
                  {searchType === 'movie' && <Check className='w-3.5 h-3.5 text-rose-400 ml-auto' />}
                </button>

                <button
                  type='button'
                  onClick={() => setSearchType('song')}
                  className={`flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border font-bold text-sm transition ${
                    searchType === 'song'
                      ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-md shadow-rose-500/10'
                      : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <Music className='w-4 h-4' />
                  <span>Specific Song</span>
                  {searchType === 'song' && <Check className='w-3.5 h-3.5 text-rose-400 ml-auto' />}
                </button>
              </div>
              <p className='text-[11px] text-gray-400'>
                {searchType === 'movie'
                  ? 'We will find and index all songs from this movie and add the album to the catalog.'
                  : 'We will find the Tamil & Tanglish lyrics for this individual track.'}
              </p>
            </div>

            {/* Title / Name Input */}
            <div className='space-y-1.5'>
              <label className='block text-xs font-bold uppercase tracking-wider text-gray-400'>
                {searchType === 'movie' ? 'Movie Name' : 'Song Title'}
              </label>
              <input
                type='text'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchType === 'movie' ? 'e.g., Leo, Youth, Jailer, Vikram' : 'e.g., Arabic Kuthu, Badass, Hukum'}
                className='w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition text-sm'
                required
                disabled={isLoading}
              />
            </div>

            {/* Action Buttons */}
            <div className='flex items-center justify-end gap-3 pt-2'>
              <button
                type='button'
                onClick={onClose}
                disabled={isLoading}
                className='px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white transition'
              >
                Cancel
              </button>
              <button
                type='submit'
                disabled={isLoading || !query.trim()}
                className='px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-rose-500/20 transition flex items-center gap-2'
              >
                {isLoading ? (
                  <>
                    <Loader2 className='w-3.5 h-3.5 animate-spin' />
                    <span>Deep Searching & Ingesting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className='w-3.5 h-3.5 text-pink-200' />
                    <span>Start Deep Search</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
