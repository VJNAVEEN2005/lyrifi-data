import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Music, 
  Disc3, 
  Share2, 
  Check, 
  Sparkles, 
  ChevronRight, 
  Play, 
  Users,
  Mic2,
  Film
} from 'lucide-react';
import { Song, MovieAlbum, Artist, getArtistUrl, slugifyArtistName, slugifyMovieTitle, getArtistPhoto } from '../data';
import { fetchArtistDetails, ArtistDetails } from '../services/api';

interface ArtistDetailProps {
  artist: Artist;
  onBack: () => void;
  onSelectSong: (song: Song) => void;
  onSelectMovie: (movie: MovieAlbum) => void;
  allSongs: Song[];
  onDeepSearch?: (data: { query: string; type: 'movie' | 'song' }) => Promise<void>;
  isDeepSearching?: boolean;
}

export const ArtistDetail: React.FC<ArtistDetailProps> = ({
  artist,
  onBack,
  onSelectSong,
  onSelectMovie,
  allSongs,
  onDeepSearch,
  isDeepSearching = false,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [backendArtist, setBackendArtist] = useState<ArtistDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'composed' | 'sung'>('all');

  const artistSlug = useMemo(() => slugifyArtistName(artist.name), [artist.name]);

  // Fetch full artist details and tracks from backend API
  useEffect(() => {
    let isMounted = true;
    fetchArtistDetails(artistSlug).then((data) => {
      if (isMounted && data) {
        setBackendArtist(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [artistSlug]);

  // Compute all matching songs locally and merge with backend
  const { allArtistSongs, composedSongs, sungSongs, artistMovies } = useMemo(() => {
    const norm = artistSlug;
    const toSlug = (s: string) =>
      (s || '')
        .toLowerCase()
        .trim()
        .replace(/['’\.]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const localComposed = allSongs.filter((s) => {
      const cSlug = toSlug(s.composer);
      return cSlug === norm || cSlug.includes(norm) || norm.includes(cSlug);
    });

    const localSung = allSongs.filter((s) => {
      return s.singers.some((singer) => {
        const sSlug = toSlug(singer);
        return sSlug === norm || sSlug.includes(norm) || norm.includes(sSlug);
      });
    });

    const songMap = new Map<string, Song>();
    localComposed.forEach((s) => songMap.set(s.id, s));
    localSung.forEach((s) => songMap.set(s.id, s));

    if (backendArtist && backendArtist.songs) {
      backendArtist.songs.forEach((s) => songMap.set(s.id, s));
    }

    const mergedAll = Array.from(songMap.values());

    const cMap = new Map<string, Song>();
    localComposed.forEach((s) => cMap.set(s.id, s));
    if (backendArtist?.composedSongs) {
      backendArtist.composedSongs.forEach((s) => cMap.set(s.id, s));
    }

    const sMap = new Map<string, Song>();
    localSung.forEach((s) => sMap.set(s.id, s));
    if (backendArtist?.sungSongs) {
      backendArtist.sungSongs.forEach((s) => sMap.set(s.id, s));
    }

    // Build associated movies
    const movieMap = new Map<string, MovieAlbum>();
    mergedAll.forEach((s) => {
      if (s.movie && s.movie !== 'Tamil Single') {
        const mSlug = slugifyMovieTitle(s.movie);
        if (!movieMap.has(mSlug)) {
          movieMap.set(mSlug, {
            id: mSlug,
            title: s.movie,
            year: s.year || 2024,
            posterUrl: s.coverUrl,
            trackCount: 1,
            composer: s.composer,
          });
        } else {
          movieMap.get(mSlug)!.trackCount += 1;
        }
      }
    });

    if (backendArtist?.movies) {
      backendArtist.movies.forEach((m) => {
        if (!movieMap.has(m.id)) {
          movieMap.set(m.id, m);
        }
      });
    }

    return {
      allArtistSongs: mergedAll,
      composedSongs: Array.from(cMap.values()),
      sungSongs: Array.from(sMap.values()),
      artistMovies: Array.from(movieMap.values()),
    };
  }, [allSongs, artistSlug, backendArtist]);

  const displayedSongs = useMemo(() => {
    if (activeTab === 'composed') return composedSongs;
    if (activeTab === 'sung') return sungSongs;
    return allArtistSongs;
  }, [activeTab, composedSongs, sungSongs, allArtistSongs]);

  const [visibleArtistSongs, setVisibleArtistSongs] = useState<number>(20);
  const [visibleArtistMovies, setVisibleArtistMovies] = useState<number>(12);

  // Reset when tab changes
  React.useEffect(() => { setVisibleArtistSongs(20); }, [activeTab]);

  const handleCopyLink = () => {
    const fullUrl = window.location.origin + getArtistUrl(artist);
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const fullUrl = window.location.origin + getArtistUrl(artist);
    const text = encodeURIComponent(
      `Check out songs & lyrics by ${artist.name} on Lyrifi: ${fullUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleTriggerDeepSearch = () => {
    if (onDeepSearch) {
      onDeepSearch({ query: artist.name, type: 'song' });
    }
  };

  const role = backendArtist?.role || artist.role || 'Music Director & Artist';

  return (
    <div className='relative min-h-screen text-white pb-32 overflow-x-hidden'>
      {/* Background Ambient Glow */}
      <div className='fixed inset-0 pointer-events-none z-0'>
        <div
          className='absolute -top-32 left-1/2 -translate-x-1/2 w-[750px] h-[550px] rounded-full blur-[140px] opacity-25'
          style={{ backgroundColor: '#ec4899' }}
        />
        <div className='absolute inset-0 bg-gradient-to-b from-transparent via-[#07080b]/90 to-[#07080b]' />
      </div>

      <div className='relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8'>
        
        {/* Top Back Navigation Bar */}
        <div className='flex items-center justify-between'>
          <button
            onClick={onBack}
            className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition backdrop-blur-md active:scale-95 group'
          >
            <ArrowLeft className='w-4 h-4 group-hover:-translate-x-0.5 transition' />
            <span>Back</span>
          </button>

          <div className='flex items-center gap-2'>
            <button
              onClick={handleWhatsAppShare}
              className='p-2 sm:px-3 sm:py-2 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95'
              title='Share via WhatsApp'
            >
              <Share2 className='w-3.5 h-3.5' />
              <span className='hidden sm:inline'>WhatsApp</span>
            </button>
            <button
              onClick={handleCopyLink}
              className='p-2 sm:px-3 sm:py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95'
              title='Copy Page Link'
            >
              {copied ? <Check className='w-3.5 h-3.5 text-green-400' /> : <Share2 className='w-3.5 h-3.5' />}
              <span className='hidden sm:inline'>{copied ? 'Copied' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* ARTIST HERO BANNER */}
        <div className='relative p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 backdrop-blur-2xl shadow-2xl overflow-hidden'>
          <div className='flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8'>
            
            {/* Circular Artist Avatar */}
            <div className='relative w-36 h-36 sm:w-48 sm:h-48 rounded-full overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] shrink-0 border-4 border-white/20 group'>
              <img
                src={backendArtist?.imageUrl || artist.imageUrl || getArtistPhoto(artist.name)}
                alt={artist.name}
                className='w-full h-full object-cover group-hover:scale-105 transition duration-500'
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/artists/default-artist.svg';
                }}
              />
              <div className='absolute inset-0 rounded-full ring-2 ring-pink-500/40 ring-offset-2 ring-offset-black' />
            </div>

            {/* Artist Info & Meta */}
            <div className='flex-1 text-center md:text-left space-y-3 pt-1'>
              <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-extrabold uppercase tracking-wider'>
                <Sparkles className='w-3 h-3' />
                <span>{role}</span>
              </div>

              <h1 className='text-3xl sm:text-5xl font-black tracking-tight text-white'>
                {artist.name}
              </h1>

              {/* Stats Badges */}
              <div className='flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1 text-xs text-gray-300'>
                <span className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 font-semibold'>
                  <Music className='w-3.5 h-3.5 text-pink-400' />
                  {allArtistSongs.length} {allArtistSongs.length === 1 ? 'Song' : 'Songs'}
                </span>
                {artistMovies.length > 0 && (
                  <span className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 font-semibold'>
                    <Film className='w-3.5 h-3.5 text-rose-400' />
                    {artistMovies.length} {artistMovies.length === 1 ? 'Movie' : 'Movies'}
                  </span>
                )}
                {composedSongs.length > 0 && sungSongs.length > 0 && (
                  <span className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 font-semibold'>
                    <Mic2 className='w-3.5 h-3.5 text-amber-400' />
                    {sungSongs.length} Sung • {composedSongs.length} Composed
                  </span>
                )}
              </div>

              <p className='text-xs sm:text-sm text-gray-400 max-w-2xl leading-relaxed pt-1'>
                Explore all official Tamil song lyrics composed and sung by {artist.name}. Read lyrics in authentic Tamil script and English/Tanglish with synchronized highlighting.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION: ASSOCIATED MOVIES / ALBUMS */}
        {artistMovies.length > 0 && (
          <section className='space-y-4'>
            <div className='flex items-center justify-between'>
              <h2 className='text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2'>
                <Disc3 className='w-5 h-5 text-rose-500' />
                <span>Featured Movie Albums</span>
              </h2>
              <span className='text-xs text-gray-400 font-semibold'>
                {artistMovies.length} {artistMovies.length === 1 ? 'Album' : 'Albums'}
              </span>
            </div>

            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4'>
              {artistMovies.slice(0, visibleArtistMovies).map((album) => (
                <div
                  key={album.id}
                  onClick={() => onSelectMovie(album)}
                  className='group relative rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-pink-500/50 p-3 transition duration-300 cursor-pointer flex flex-col space-y-2'
                >
                  <div className='relative w-full aspect-square rounded-xl overflow-hidden bg-black/40 shadow-lg'>
                    <img
                      src={album.posterUrl}
                      alt={album.title}
                      className='w-full h-full object-cover group-hover:scale-105 transition duration-500'
                    />
                    <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2'>
                      <span className='text-[10px] font-bold text-pink-400 flex items-center gap-1'>
                        View Album <ChevronRight className='w-3 h-3' />
                      </span>
                    </div>
                  </div>
                  <div className='space-y-0.5 text-left'>
                    <h3 className='font-bold text-xs text-white group-hover:text-pink-400 transition truncate'>
                      {album.title}
                    </h3>
                    <p className='text-[10px] text-gray-400'>
                      {album.year} • {album.trackCount} {album.trackCount === 1 ? 'Track' : 'Tracks'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {artistMovies.length > visibleArtistMovies && (
              <div className='text-center pt-2'>
                <button onClick={() => setVisibleArtistMovies((v) => v + 12)} className='px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-gray-300 hover:text-white transition'>
                  Show More Albums ({artistMovies.length - visibleArtistMovies} remaining)
                </button>
              </div>
            )}
          </section>
        )}

        {/* SECTION: SONGS DISCOGRAPHY */}
        <section className='space-y-4'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
            <h2 className='text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2'>
              <Music className='w-5 h-5 text-pink-500' />
              <span>Songs & Lyrics</span>
            </h2>

            {/* Filter Tabs if artist has both composed and sung songs */}
            {composedSongs.length > 0 && sungSongs.length > 0 && (
              <div className='inline-flex p-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-xl'>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3.5 py-1 rounded-full text-xs font-bold transition ${
                    activeTab === 'all'
                      ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-pink-500/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  All ({allArtistSongs.length})
                </button>
                <button
                  onClick={() => setActiveTab('composed')}
                  className={`px-3.5 py-1 rounded-full text-xs font-bold transition ${
                    activeTab === 'composed'
                      ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-pink-500/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Composed ({composedSongs.length})
                </button>
                <button
                  onClick={() => setActiveTab('sung')}
                  className={`px-3.5 py-1 rounded-full text-xs font-bold transition ${
                    activeTab === 'sung'
                      ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-pink-500/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Sung ({sungSongs.length})
                </button>
              </div>
            )}
          </div>

          {/* Songs List */}
          {displayedSongs.length > 0 ? (
            <div className='space-y-2'>
              {displayedSongs.slice(0, visibleArtistSongs).map((song, idx) => (
                <div
                  key={song.id || idx}
                  onClick={() => onSelectSong(song)}
                  className='group flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-pink-500/30 transition duration-200 cursor-pointer'
                >
                  <div className='flex items-center gap-4 min-w-0'>
                    <span className='w-6 text-center text-xs font-mono font-bold text-gray-500 group-hover:text-pink-400 shrink-0'>
                      {idx + 1}
                    </span>
                    <img
                      src={song.coverUrl}
                      alt={song.title}
                      className='w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10 group-hover:scale-105 transition'
                    />
                    <div className='min-w-0'>
                      <div className='font-bold text-sm text-white group-hover:text-pink-400 transition truncate'>
                        {song.title}
                      </div>
                      <div className='text-xs text-gray-400 truncate flex items-center gap-1.5'>
                        <span>{song.movie} ({song.year})</span>
                        <span>•</span>
                        <span className='truncate'>{song.singers.join(', ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className='flex items-center gap-3 shrink-0 pl-2'>
                    {song.lyricsTamil && song.lyricsTamil.length > 0 && (
                      <span className='hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/20'>
                        தமிழ்
                      </span>
                    )}
                    <span className='inline-flex items-center gap-1 text-xs font-bold text-pink-400 group-hover:translate-x-0.5 transition'>
                      <span>Lyrics</span>
                      <ChevronRight className='w-3.5 h-3.5' />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='p-8 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-3'>
              <Music className='w-10 h-10 text-gray-500 mx-auto' />
              <p className='text-sm text-gray-300'>No tracks found in this category.</p>
            </div>
          )}
          {displayedSongs.length > visibleArtistSongs && (
            <div className='text-center pt-2'>
              <button onClick={() => setVisibleArtistSongs((v) => v + 20)} className='px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-gray-300 hover:text-white transition'>
                Show More Songs ({displayedSongs.length - visibleArtistSongs} remaining)
              </button>
            </div>
          )}
        </section>

        {/* DEEP SEARCH BANNER */}
        <div className='p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-pink-900/30 via-purple-900/20 to-rose-900/30 border border-pink-500/20 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4'>
          <div className='text-center sm:text-left space-y-1'>
            <h3 className='font-extrabold text-base sm:text-lg text-white flex items-center justify-center sm:justify-start gap-2'>
              <Sparkles className='w-4 h-4 text-pink-400' />
              Looking for more songs by {artist.name}?
            </h3>
            <p className='text-xs text-gray-400'>
              Trigger our intelligent search engine to find and add more songs and lyrics for {artist.name}.
            </p>
          </div>

          <button
            onClick={handleTriggerDeepSearch}
            disabled={isDeepSearching}
            className='inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs shadow-lg shadow-pink-500/30 transition duration-200 active:scale-95 shrink-0 disabled:opacity-60'
          >
            <Sparkles className={`w-3.5 h-3.5 ${isDeepSearching ? 'animate-spin' : ''}`} />
            <span>{isDeepSearching ? 'Deep Searching...' : `Deep Search ${artist.name}`}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
