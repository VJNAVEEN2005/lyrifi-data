import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Film, 
  Music, 
  Disc3, 
  Share2, 
  Check, 
  Sparkles, 
  ChevronRight, 
  Play, 
  Calendar,
  ExternalLink
} from 'lucide-react';
import { Song, MovieAlbum, slugifyMovieTitle, getMovieUrl } from '../data';
import { fetchMovieAlbumDetails, MovieAlbumDetails } from '../services/api';

interface MovieDetailProps {
  movie: MovieAlbum;
  onBack: () => void;
  onSelectSong: (song: Song) => void;
  allSongs: Song[];
  onDeepSearch?: (data: { query: string; type: 'movie' | 'song' }) => Promise<void>;
  isDeepSearching?: boolean;
}

export const MovieDetail: React.FC<MovieDetailProps> = ({
  movie,
  onBack,
  onSelectSong,
  allSongs,
  onDeepSearch,
  isDeepSearching = false,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [backendAlbum, setBackendAlbum] = useState<MovieAlbumDetails | null>(null);

  const albumSlug = useMemo(() => slugifyMovieTitle(movie.title), [movie.title]);

  // Fetch full album details and tracks from backend API
  useEffect(() => {
    let isMounted = true;
    fetchMovieAlbumDetails(movie.year || 2024, albumSlug)
      .then((data) => {
        if (isMounted && data) {
          setBackendAlbum(data);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [movie.year, albumSlug]);

  // Merge local songs with backend album songs (deduplicating by id / slug)
  const albumSongs = useMemo<Song[]>(() => {
    const movieNameLower = movie.title.toLowerCase().trim();
    const localMatches = allSongs.filter((s) => {
      const sMovie = (s.movie || '').toLowerCase().trim();
      const sSlug = slugifyMovieTitle(s.movie);
      return sMovie === movieNameLower || sSlug === albumSlug;
    });

    const songMap = new Map<string, Song>();
    // First populate local matches
    localMatches.forEach((s) => songMap.set(s.id, s));
    // Merge backend songs if available
    if (backendAlbum && backendAlbum.songs) {
      backendAlbum.songs.forEach((s) => songMap.set(s.id, s));
    }

    return Array.from(songMap.values());
  }, [allSongs, movie.title, albumSlug, backendAlbum]);

  const composer = backendAlbum?.composer || albumSongs[0]?.composer || 'Various Artists';
  const singersList = useMemo(() => {
    const list = new Set<string>();
    albumSongs.forEach((s) => {
      s.singers?.forEach((singer) => list.add(singer));
    });
    return Array.from(list);
  }, [albumSongs]);

  const handleCopyLink = () => {
    const fullUrl = window.location.origin + getMovieUrl(movie);
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const fullUrl = window.location.origin + getMovieUrl(movie);
    const text = encodeURIComponent(
      `Check out all songs & lyrics from "${movie.title}" (${movie.year}) on Lyrifi: ${fullUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleTriggerDeepSearch = () => {
    if (onDeepSearch) {
      onDeepSearch({ query: movie.title, type: 'movie' });
    }
  };

  return (
    <div className='relative min-h-screen text-white overflow-hidden bg-[#07080b] pb-28 animate-fadeIn'>
      {/* Dynamic Background Ambient Glows */}
      <div 
        className='absolute top-0 left-1/4 w-[600px] h-[500px] rounded-full blur-[140px] pointer-events-none opacity-20'
        style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)' }}
      />
      <div 
        className='absolute top-48 right-10 w-[500px] h-[400px] rounded-full blur-[160px] pointer-events-none opacity-15'
        style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
      />

      <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8 relative z-10'>
        {/* Navigation / Back Bar */}
        <div className='flex items-center justify-between'>
          <button
            onClick={onBack}
            className='inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-semibold text-gray-300 hover:text-white transition'
          >
            <ArrowLeft className='w-4 h-4' />
            <span>Back</span>
          </button>

          <div className='flex items-center gap-2 text-xs text-gray-400'>
            <span>Unique Path:</span>
            <code className='px-2 py-1 rounded-md bg-white/5 border border-white/10 text-pink-400 font-mono text-[11px]'>
              /movie/{movie.year || 2024}/{albumSlug}
            </code>
          </div>
        </div>

        {/* HERO SECTION: Dedicated Movie Album Showcase */}
        <div className='relative rounded-3xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 shadow-2xl p-6 sm:p-10 overflow-hidden'>
          <div className='flex flex-col md:flex-row items-center md:items-start gap-8'>
            {/* Movie Poster */}
            <div className='relative w-48 sm:w-56 md:w-64 aspect-[3/4] flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/20 group'>
              <img
                src={movie.posterUrl || albumSongs[0]?.coverUrl || '/default-cover.svg'}
                alt={movie.title}
                className='w-full h-full object-cover group-hover:scale-105 transition duration-500'
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/default-cover.svg';
                }}
              />
              <div className='absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60' />
              <div className='absolute bottom-3 left-3 right-3 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-center text-xs font-bold text-white'>
                {albumSongs.length} {albumSongs.length === 1 ? 'Track' : 'Tracks'}
              </div>
            </div>

            {/* Movie Details */}
            <div className='flex-1 text-center md:text-left space-y-4'>
              <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-bold uppercase tracking-wider'>
                <Film className='w-3.5 h-3.5' />
                <span>Original Tamil Soundtrack</span>
              </div>

              <h1 className='text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight uppercase'>
                {movie.title}
              </h1>

              {/* Badges / Chips */}
              <div className='flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs sm:text-sm text-gray-300'>
                <div className='flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10'>
                  <Calendar className='w-4 h-4 text-pink-400' />
                  <span>{movie.year || 2024}</span>
                </div>

                <div className='flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10'>
                  <Music className='w-4 h-4 text-purple-400' />
                  <span>Music: <strong className='text-white'>{composer}</strong></span>
                </div>

                <div className='flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10'>
                  <Disc3 className='w-4 h-4 text-emerald-400' />
                  <span>{albumSongs.length} Songs</span>
                </div>
              </div>

              {/* Singers list snippet */}
              {singersList.length > 0 && (
                <p className='text-xs text-gray-400 max-w-2xl leading-relaxed'>
                  <strong className='text-gray-300'>Vocals:</strong> {singersList.slice(0, 6).join(', ')}
                  {singersList.length > 6 ? ` and ${singersList.length - 6} more` : ''}
                </p>
              )}

              {/* Action Buttons */}
              <div className='flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2'>
                {albumSongs.length > 0 && (
                  <button
                    onClick={() => onSelectSong(albumSongs[0])}
                    className='px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-sm shadow-xl shadow-pink-500/25 transition flex items-center gap-2'
                  >
                    <Play className='w-4 h-4 fill-white' />
                    <span>View First Song Lyrics</span>
                  </button>
                )}

                <button
                  onClick={handleCopyLink}
                  className='px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm transition flex items-center gap-2'
                  title='Copy permanent album URL'
                >
                  {copied ? <Check className='w-4 h-4 text-emerald-400' /> : <Share2 className='w-4 h-4' />}
                  <span>{copied ? 'Link Copied!' : 'Share Album'}</span>
                </button>

                <button
                  onClick={handleWhatsAppShare}
                  className='px-4 py-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold text-sm transition flex items-center gap-2'
                >
                  <ExternalLink className='w-4 h-4' />
                  <span>WhatsApp</span>
                </button>

                {onDeepSearch && (
                  <button
                    onClick={handleTriggerDeepSearch}
                    disabled={isDeepSearching}
                    className='px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-semibold text-sm transition flex items-center gap-2'
                  >
                    <Sparkles className='w-4 h-4 text-pink-400' />
                    <span>Deep Search Missing Tracks</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* TRACKLIST SECTION */}
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h2 className='text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5'>
              <Disc3 className='w-6 h-6 text-pink-500' />
              <span>Tracklist & Lyrics ({albumSongs.length})</span>
            </h2>
            <span className='text-xs text-gray-400'>Click any song to open full lyrics</span>
          </div>

          {albumSongs.length === 0 ? (
            <div className='text-center py-16 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4'>
              <Disc3 className='w-12 h-12 text-gray-500 mx-auto animate-pulse' />
              <p className='text-gray-400 text-sm'>No tracks found in local catalog for &quot;{movie.title}&quot;.</p>
              {onDeepSearch && (
                <button
                  onClick={handleTriggerDeepSearch}
                  disabled={isDeepSearching}
                  className='px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold transition inline-flex items-center gap-2'
                >
                  <Sparkles className='w-4 h-4' />
                  <span>Deep Search Album Tracks Online</span>
                </button>
              )}
            </div>
          ) : (
            <div className='space-y-2.5'>
              {albumSongs.map((song, index) => (
                <div
                  key={song.id || index}
                  onClick={() => onSelectSong(song)}
                  className='group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-pink-500/30 transition duration-200 cursor-pointer shadow-sm hover:shadow-lg'
                >
                  <div className='flex items-center gap-4 min-w-0 flex-1'>
                    {/* Track Number / Play Icon */}
                    <div className='w-8 text-center flex-shrink-0'>
                      <span className='text-sm font-bold text-gray-500 group-hover:hidden'>
                        {index + 1}
                      </span>
                      <Play className='w-4 h-4 text-pink-400 fill-pink-400 mx-auto hidden group-hover:block' />
                    </div>

                    {/* Artwork thumbnail */}
                    <div className='w-12 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 border border-white/10 shadow-sm'>
                      <img
                        src={song.coverUrl || '/default-cover.svg'}
                        alt={song.title}
                        className='w-full h-full object-cover group-hover:scale-110 transition duration-300'
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/default-cover.svg';
                        }}
                      />
                    </div>

                    {/* Track Title and Singers */}
                    <div className='min-w-0 flex-1 space-y-0.5'>
                      <div className='flex items-center gap-2'>
                        <h3 className='font-bold text-sm sm:text-base text-white group-hover:text-pink-400 transition truncate'>
                          {song.title}
                        </h3>
                        {song.lyricsTamil && song.lyricsTamil.length > 0 && (
                          <span className='px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-gray-400 border border-white/10'>
                            Tamil
                          </span>
                        )}
                        {song.lyricsTanglish && song.lyricsTanglish.length > 0 && (
                          <span className='px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-gray-400 border border-white/10'>
                            Tanglish
                          </span>
                        )}
                      </div>
                      <p className='text-xs text-gray-400 truncate'>
                        {song.singers?.join(', ') || composer}
                      </p>
                    </div>
                  </div>

                  {/* Lyricist / Composer Info (Desktop) */}
                  <div className='hidden md:block text-right text-xs text-gray-400 px-4'>
                    <div className='text-gray-300 font-medium truncate max-w-[200px]'>
                      {song.composer}
                    </div>
                    <div className='text-gray-500 truncate max-w-[200px]'>
                      {song.lyricist ? `Lyrics: ${song.lyricist}` : song.movie}
                    </div>
                  </div>

                  {/* View Lyrics Action */}
                  <div className='flex items-center gap-2 pl-3 flex-shrink-0'>
                    <button className='px-3 py-1.5 rounded-xl bg-white/5 group-hover:bg-pink-500 text-xs font-bold text-gray-300 group-hover:text-white transition flex items-center gap-1'>
                      <span>Lyrics</span>
                      <ChevronRight className='w-3.5 h-3.5' />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
