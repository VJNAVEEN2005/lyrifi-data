import React, { useState, useEffect } from 'react';
import { Film, Music, Sparkles, AlertCircle, X, Check, Loader2 } from 'lucide-react';

interface DeepSearchModalProps {
  isOpen: boolean;
  initialQuery: string;
  onClose: () => void;
  onSubmit: (data: { query: string; type: 'movie' | 'song' }) => Promise<void>;
  isLoading?: boolean;
}

export const DeepSearchModal: React.FC<DeepSearchModalProps> = ({
  isOpen,
  initialQuery,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [searchType, setSearchType] = useState<'movie' | 'song'>('movie');
  const [isConfirmedAccurate, setIsConfirmedAccurate] = useState(true);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    await onSubmit({ query: query.trim(), type: searchType });
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn'>
      <div 
        className='relative w-full max-w-lg rounded-3xl bg-[#12141e] border border-white/10 shadow-2xl p-6 sm:p-8 space-y-6 text-white overflow-hidden'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Accent */}
        <div className='absolute -top-24 -right-24 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none' />
        <div className='absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none' />

        {/* Header */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2.5'>
            <div className='w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20'>
              <Sparkles className='w-5 h-5 text-white' />
            </div>
            <div>
              <h3 className='text-lg font-black tracking-tight'>AI Deep Search & Ingest</h3>
              <p className='text-xs text-gray-400'>Scrape directly from web archives</p>
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

        <form onSubmit={handleSubmit} className='space-y-5'>
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
                ? 'We will scrape all songs from this movie and add the album to the catalog.'
                : 'We will scrape the Tamil & Tanglish lyrics for this individual track.'}
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
              placeholder={searchType === 'movie' ? 'e.g., Leo, Jailer, Vikram' : 'e.g., Arabic Kuthu, Badass, Hukum'}
              className='w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition text-sm'
              required
              disabled={isLoading}
            />
          </div>

          {/* Mandatory Disclaimer Alert */}
          <div className='p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-200 text-xs leading-relaxed'>
            <AlertCircle className='w-4 h-4 text-amber-400 shrink-0 mt-0.5' />
            <div className='space-y-1'>
              <div className='font-bold text-amber-300'>Important Disclaimer</div>
              <p className='text-amber-200/90 text-[11px]'>
                Please make sure that the name and spelling are correct. If the spelling does not match official archives, our crawler might not be able to find the lyrics or tracks.
              </p>
            </div>
          </div>

          {/* Accuracy Checkbox */}
          <label className='flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer select-none'>
            <input
              type='checkbox'
              checked={isConfirmedAccurate}
              onChange={(e) => setIsConfirmedAccurate(e.target.checked)}
              className='w-4 h-4 rounded border-white/20 bg-white/10 text-rose-500 focus:ring-0 focus:ring-offset-0'
            />
            <span>I have verified the title and spelling</span>
          </label>

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
              disabled={isLoading || !query.trim() || !isConfirmedAccurate}
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
      </div>
    </div>
  );
};
