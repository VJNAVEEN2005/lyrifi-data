import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Share2, 
  Copy, 
  Check, 
  Play, 
  Pause, 
  Type, 
  Heart, 
  MoreHorizontal,
  Home,
  Compass,
  TrendingUp,
  Music,
  Users,
  PlayCircle,
  ChevronRight,
  HelpCircle,
  Edit3
} from 'lucide-react';
import {
  Song,
  slugifyMovieTitle,
  getMovieUrl,
  MovieAlbum,
  Artist,
  slugifyArtistName,
  getArtistUrl,
  getArtistPhoto,
} from '../data';
import { SongAccuracyModal } from './SongAccuracyModal';
import { fetchClientAppleMusicArtwork } from '../services/api';
import { SEOHead } from './SEOHead';

interface SongDetailProps {
  song: Song;
  onBack: () => void;
  onSelectSong: (song: Song) => void;
  allSongs: Song[];
  onSelectMovie?: (movie: MovieAlbum) => void;
  onSelectArtist?: (artist: Artist) => void;
}

interface ParsedLyricLine {
  isHeading: boolean;
  prefix?: string;
  text: string;
}

// Helper to detect section headings and inline singer/role labels in Tamil and English/Tanglish
const parseLyricLine = (rawLine: string): ParsedLyricLine => {
  const line = rawLine.trim();
  if (!line) return { isHeading: false, text: '' };

  const clean = line.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const headingKeywords = [
    'female part', 'male part', 'female', 'male', 'both', 'both part',
    'chorus', 'verse 1', 'verse 2', 'verse 3', 'verse',
    'singers', 'singer', 'music', 'music director', 'lyricist',
    'humming', 'whistle', 'dialogue', 'intro', 'outro', 'hook', 'bridge',
    'male and chorus', 'female and chorus', 'male chorus', 'female chorus',
    'part 1', 'part 2'
  ];

  if (headingKeywords.includes(clean)) {
    return { isHeading: true, text: line };
  }

  // Explicit colon ending e.g. "Male :", "Female :", "Chorus :", "Male and Chorus :"
  if (line.endsWith(':') && line.length <= 40) {
    return { isHeading: true, text: line };
  }

  // Tamil heading keywords when short or ending with colon
  if (
    line.includes('பாடகர்கள்') || 
    line.includes('இசையமைப்பாளர்') || 
    line.includes('பாடலாசிரியர்') || 
    line.includes('பாடல் ஆசிரியர்') ||
    line.includes('பெண்') || 
    line.includes('ஆண்') || 
    line.includes('குழு')
  ) {
    if (line.endsWith(':') || line.length <= 25) {
      return { isHeading: true, text: line };
    }
  }

  // Inline singer/chorus/role tag prefix
  // e.g. "Male and Chorus : I am shit scared of that"
  // "Singer : Anirudh Ravichander"
  // "Music by : Anirudh Ravichander"
  // "Lyrics by : Heisenberg"
  // "ஆண் : உயிர் பாதி உனக்கே"
  const prefixMatch = line.match(
    /^((?:Male(?:\s+(?:and|&)\s+|\s+)Chorus|Female(?:\s+(?:and|&)\s+|\s+)Chorus|Male\s+Part|Female\s+Part|Male|Female|Chorus|Singer[s]?|Music(?:\s+by)?|Lyrics(?:\s+by)?|Lyricist|ஆண்(?:\s+(?:மற்றும்|&)\s+|\s+)குழு|பெண்(?:\s+(?:மற்றும்|&)\s+|\s+)குழு|ஆண்|பெண்|குழு|பாடகர்கள்|பாடகர்|இசையமைப்பாளர்|பாடல்\s*ஆசிரியர்|பாடலாசிரியர்)\s*[:–—-])\s*(.*)$/i
  );

  if (prefixMatch) {
    const prefix = prefixMatch[1].trim();
    const rest = prefixMatch[2].trim();
    if (!rest) {
      return { isHeading: true, text: prefix };
    }
    return { isHeading: false, prefix, text: rest };
  }

  return { isHeading: false, text: line };
};

export const SongDetail: React.FC<SongDetailProps> = ({
  song,
  onBack,
  onSelectSong,
  allSongs,
  onSelectMovie,
  onSelectArtist,
}) => {
  // Detect whether authentic Tamil characters exist in lyricsTamil
  const hasTamil = useMemo(
    () => Boolean(song.lyricsTamil?.length && song.lyricsTamil.some((l) => /[\u0B80-\u0BFF]/.test(l))),
    [song]
  );
  const hasTanglish = useMemo(
    () => Boolean(song.lyricsTanglish?.length),
    [song]
  );

  const [language, setLanguage] = useState<'tamil' | 'tanglish'>(() => {
    if (hasTamil) return 'tamil';
    return 'tanglish';
  });

  useEffect(() => {
    if (hasTamil) {
      setLanguage('tamil');
    } else if (hasTanglish) {
      setLanguage('tanglish');
    }
  }, [hasTamil, hasTanglish, song.id]);

  const [activeLine, setActiveLine] = useState<number>(song.activeLineIndexDefault || 3);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<number>(20);
  const [copied, setCopied] = useState<boolean>(false);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isAccuracyModalOpen, setIsAccuracyModalOpen] = useState<boolean>(false);

  // High-res Apple Music artwork resolution with localStorage caching
  const [resolvedCover, setResolvedCover] = useState<string>(() => {
    if (song.coverUrl && !song.coverUrl.includes('default-cover')) {
      return song.coverUrl;
    }
    const cleanMovie = (song.movie || '').toLowerCase().trim();
    const cleanTitle = (song.title || '').toLowerCase().trim();
    try {
      const cached =
        localStorage.getItem(`lyrifi_apple_art_${cleanTitle}`) ||
        localStorage.getItem(`lyrifi_apple_art_${cleanMovie}`) ||
        localStorage.getItem(`lyrifi_poster_${slugifyMovieTitle(song.movie)}`);
      if (cached) return cached;
    } catch {}
    return song.coverUrl || '/default-cover.svg';
  });

  useEffect(() => {
    if (song.coverUrl && !song.coverUrl.includes('default-cover')) {
      setResolvedCover(song.coverUrl);
      return;
    }

    const cleanMovie = (song.movie || '').toLowerCase().trim();
    const cleanTitle = (song.title || '').toLowerCase().trim();

    try {
      const cached =
        localStorage.getItem(`lyrifi_apple_art_${cleanTitle}`) ||
        localStorage.getItem(`lyrifi_apple_art_${cleanMovie}`) ||
        localStorage.getItem(`lyrifi_poster_${slugifyMovieTitle(song.movie)}`);
      if (cached) {
        setResolvedCover(cached);
        return;
      }
    } catch {}

    // Resolve official Apple Music artwork on the fly
    const query = song.movie && song.movie !== 'Tamil Song' && song.movie !== 'Tamil Single'
      ? `${song.title} ${song.movie}`
      : song.title;

    fetchClientAppleMusicArtwork(query, song.year).then((art) => {
      if (art) {
        setResolvedCover(art);
        try {
          localStorage.setItem(`lyrifi_apple_art_${cleanTitle}`, art);
          if (song.movie) {
            localStorage.setItem(`lyrifi_apple_art_${cleanMovie}`, art);
          }
        } catch {}
      } else if (song.movie && song.movie !== 'Tamil Song') {
        fetchClientAppleMusicArtwork(song.movie, song.year).then((movieArt) => {
          if (movieArt) {
            setResolvedCover(movieArt);
          }
        });
      }
    });
  }, [song.id, song.coverUrl, song.title, song.movie, song.year]);

  const currentLyrics = useMemo(() => {
    if (language === 'tamil' && hasTamil) return song.lyricsTamil;
    if (language === 'tanglish' && hasTanglish) return song.lyricsTanglish;
    return hasTamil ? song.lyricsTamil : (song.lyricsTanglish || []);
  }, [language, hasTamil, hasTanglish, song]);

  const handleCopy = () => {
    const text = currentLyrics.join('\n');
    navigator.clipboard.writeText(song.title + ' (' + song.movie + ') Lyrics:\n\n' + text + '\n\nVia Lyrifi');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      'Check out ' + song.title + ' (' + song.movie + ') lyrics on Lyrifi: ' + window.location.href
    );
    window.open('https://api.whatsapp.com/send?text=' + text, '_blank');
  };

  const seoTitle = `${song.title} Song Lyrics - ${song.movie} | தமிழ் & Tanglish | Lyrifi`;
  const seoDescription = `Read complete ${song.title} lyrics from ${song.movie} (${song.year || 2024}). Composed by ${song.composer}, sung by ${song.singers?.join(', ') || 'Various Artists'}. Authentic தமிழ் and Tanglish with synchronized Apple Music line glow.`;
  const seoKeywords = `${song.title} song lyrics, ${song.title} lyrics, ${song.title} ${song.movie} lyrics, ${song.title} tamil lyrics, ${song.movie} songs lyrics, ${song.composer} songs, tamil song lyrics 2026`;
  const seoCanonical = `https://lyrifi-data.vercel.app/song/${song.slug || song.id}`;
  const seoImage = resolvedCover || song.coverUrl;

  const songSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: song.title,
    url: seoCanonical,
    image: seoImage,
    datePublished: String(song.year || 2024),
    inAlbum: song.movie && song.movie !== 'Tamil Song' ? {
      '@type': 'MusicAlbum',
      name: song.movie,
    } : undefined,
    byArtist: song.singers?.map((s) => ({ '@type': 'Person', name: s })) || [],
    recordingOf: {
      '@type': 'MusicComposition',
      name: song.title,
      composer: song.composer && song.composer !== 'Music Director' ? [{ '@type': 'Person', name: song.composer }] : undefined,
      lyricist: song.lyricist && song.lyricist !== 'Lyricist' ? [{ '@type': 'Person', name: song.lyricist }] : undefined,
      lyrics: (song.lyricsTamil?.length > 0 || song.lyricsTanglish?.length > 0) ? {
        '@type': 'MusicLyrics',
        text: (song.lyricsTamil?.length > 0 ? song.lyricsTamil : song.lyricsTanglish).slice(0, 30).join('\n'),
      } : undefined,
    },
  }), [song, seoCanonical, seoImage]);

  return (
    <div className='relative min-h-screen text-white overflow-hidden bg-[#07080b] pb-32'>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalUrl={seoCanonical}
        ogImage={seoImage}
        ogType='music.song'
        schema={songSchema}
      />
      
      {/* 
        ========================================================================
        EXACT REFERENCE BACKGROUND SPREAD
        The square artwork is positioned cleanly in the center red-box stage,
        with reduced blur, never overlapping the right song information box.
        The left lyrics stage is dimmed and dark for pristine readability.
        ========================================================================
      */}
      <div className='fixed inset-0 pointer-events-none z-0 overflow-hidden select-none' aria-hidden='true'>
        {/* Left area soft ambient glow (toned down so text stays crisp and dim) */}
        <div 
          className='absolute -top-24 -left-24 w-[600px] sm:w-[700px] h-[600px] sm:h-[700px] rounded-full blur-[140px] opacity-25 transition-all duration-1000 pointer-events-none'
          style={{ background: song.primaryGlowColor || '#06b6d4' }}
        />

        {/* Ambient Aura directly behind the Center Square Artwork */}
        <div 
          className='absolute top-14 md:top-13 left-1/2 xl:left-[48.5%] w-[320px] sm:w-[400px] md:w-[500px] xl:w-[42%] aspect-square rounded-full blur-[90px] opacity-50 transition-all duration-1000 pointer-events-none'
          style={{ 
            transform: 'translateX(-50%)',
            background: song.primaryGlowColor || '#06b6d4' 
          }}
        />

        {/* Full Image Square Canvas - Positioned Exactly in Center Red-Box Stage */}
        <div 
          className='absolute top-14 md:top-13 left-1/2 xl:left-[48.5%] w-[300px] sm:w-[380px] md:w-[500px] xl:w-[40%] aspect-square rounded-3xl overflow-hidden bg-cover bg-center bg-no-repeat transition-all duration-700 pointer-events-none shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-white/10'
          style={{ 
            transform: 'translateX(-50%)',
            backgroundImage: 'url(' + (resolvedCover || song.coverUrl) + ')',
            filter: 'blur(4px) brightness(0.4) saturate(1.35)',
            opacity: 0.88
          }}
        />

        {/* Left-side dark vignette: Dims the left lyrics & header region for high contrast and readability */}
        <div className='hidden md:block absolute left-0 top-0 bottom-0 w-[42%] bg-gradient-to-r from-[#07080b] via-[#07080b]/92 to-transparent pointer-events-none z-[1]' />

        {/* Right-side solid dark barrier protecting Song Information column from any bleed */}
        <div className='hidden xl:block absolute right-0 top-0 bottom-0 w-[35%] bg-gradient-to-r from-transparent via-[#07080b]/90 to-[#07080b] pointer-events-none z-[1]' />

        {/* Bottom smooth vignette */}
        <div className='absolute inset-0 bg-gradient-to-b from-transparent via-[#07080b]/15 to-[#07080b]/80 pointer-events-none' />
      </div>

      {/* Main Container Layout */}
      <div className='relative z-10 w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6'>
        
        {/* Desktop Grid / Mobile Stack */}
        <div className='grid grid-cols-1 xl:grid-cols-12 gap-8 items-start'>
          
          {/* CENTER HERO & LYRICS STAGE (Matches Mobile and Desktop) */}
          <div className='xl:col-span-8 space-y-6 sm:space-y-8'>
            
            {/* Top Back Navigation */}
            <div className='flex items-center mb-2'>
              <button
                onClick={onBack}
                className='w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white backdrop-blur-md transition active:scale-95 hover:bg-white/10'
              >
                <ArrowLeft className='w-5 h-5' />
              </button>
            </div>

            {/* Header: Album Art + Song Title + Movie + Pill Toggle + Action Buttons */}
            <div className='flex flex-row items-center sm:items-start gap-4 sm:gap-6'>
              {/* Album Art Card */}
              <div className='relative w-24 h-24 sm:w-44 sm:h-44 rounded-2xl overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.8)] shrink-0 border border-white/15 group'>
                <img 
                  src={resolvedCover || song.coverUrl || '/default-cover.svg'} 
                  alt={song.title} 
                  className='w-full h-full object-cover group-hover:scale-105 transition duration-500'
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/default-cover.svg';
                  }}
                />
              </div>

              {/* Title & Metadata */}
              <div className='flex-1 text-left space-y-1 sm:space-y-2 pt-0.5'>
                <div className='flex items-center justify-between gap-4'>
                  <h1 className='text-xl sm:text-4xl font-black tracking-tight text-white leading-tight'>
                    {song.title}
                  </h1>

                  {/* Header Actions (Heart + More) */}
                  <div className='flex items-center gap-2 shrink-0'>
                    <button 
                      onClick={() => setIsLiked(!isLiked)}
                      className={'w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-white/10 flex items-center justify-center backdrop-blur-md transition ' + (isLiked ? 'bg-rose-500/20 text-rose-500 border-rose-500/30' : 'bg-white/5 text-gray-300 hover:text-white')}
                    >
                      <Heart className={'w-4 h-4 sm:w-5 sm:h-5 ' + (isLiked ? 'fill-rose-500' : '')} />
                    </button>
                    <button 
                      onClick={() => setIsAccuracyModalOpen(true)}
                      className='w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white hover:border-pink-500/40 backdrop-blur-md transition group'
                      title='Something wrong with this image or lyrics? Suggest correction'
                    >
                      <Edit3 className='w-4 h-4 text-gray-300 group-hover:text-pink-400' />
                    </button>
                  </div>
                </div>

                <p className='text-xs sm:text-sm text-gray-300 font-medium'>
                  {onSelectArtist ? (
                    <button
                      onClick={() =>
                        onSelectArtist({
                          id: slugifyArtistName(song.singers[0]),
                          name: song.singers[0],
                          role: 'Playback Singer',
                          imageUrl: getArtistPhoto(song.singers[0]),
                        })
                      }
                      className='hover:text-pink-400 hover:underline transition'
                      title={`View all songs by ${song.singers[0]}`}
                    >
                      {song.singers[0]}
                    </button>
                  ) : (
                    <span>{song.singers[0]}</span>
                  )}
                </p>

                <div className='text-[11px] sm:text-xs text-gray-400 font-normal flex items-center gap-1 flex-wrap'>
                  {onSelectMovie ? (
                    <button
                      onClick={() =>
                        onSelectMovie({
                          id: slugifyMovieTitle(song.movie),
                          title: song.movie,
                          year: song.year || 2024,
                          posterUrl: song.coverUrl,
                          trackCount: 1,
                        })
                      }
                      className='text-gray-300 hover:text-pink-400 hover:underline font-semibold transition'
                      title={`View all songs from ${song.movie}`}
                    >
                      {song.movie}
                    </button>
                  ) : (
                    <span>{song.movie}</span>
                  )}
                  <span>({song.year}) • </span>
                  {onSelectArtist ? (
                    <button
                      onClick={() =>
                        onSelectArtist({
                          id: slugifyArtistName(song.composer),
                          name: song.composer,
                          role: 'Music Director',
                          imageUrl: getArtistPhoto(song.composer),
                        })
                      }
                      className='text-gray-300 hover:text-pink-400 hover:underline font-semibold transition'
                      title={`View all songs composed by ${song.composer}`}
                    >
                      {song.composer}
                    </button>
                  ) : (
                    <span>{song.composer}</span>
                  )}
                </div>

                {/* Language Switcher & Accuracy Action Pill */}
                <div className='pt-2 flex flex-wrap items-center gap-2.5'>
                  {hasTamil && hasTanglish ? (
                    <div className='inline-flex p-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-xl shadow-inner'>
                      <button
                        onClick={() => setLanguage('tamil')}
                        className={'px-4 sm:px-5 py-1 sm:py-1.5 rounded-full text-xs font-bold transition duration-200 ' + (language === 'tamil' ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg shadow-pink-500/30' : 'text-gray-400 hover:text-white')}
                      >
                        தமிழ்
                      </button>
                      <button
                        onClick={() => setLanguage('tanglish')}
                        className={'px-4 sm:px-5 py-1 sm:py-1.5 rounded-full text-xs font-bold transition duration-200 ' + (language === 'tanglish' ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg shadow-pink-500/30' : 'text-gray-400 hover:text-white')}
                      >
                        Tanglish
                      </button>
                    </div>
                  ) : hasTamil ? (
                    <span className='inline-flex items-center px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold'>
                      தமிழ் வரிகள் (Tamil Only)
                    </span>
                  ) : (
                    <span className='inline-flex items-center px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold'>
                      English / Tanglish Lyrics
                    </span>
                  )}

                  {/* Quick Accuracy Feedback Button */}
                  <button
                    onClick={() => setIsAccuracyModalOpen(true)}
                    className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-pink-500/30 text-[11px] font-semibold text-gray-400 hover:text-pink-300 transition'
                  >
                    <HelpCircle className='w-3.5 h-3.5 text-pink-400' />
                    <span>Wrong artwork or lyrics?</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Song Lyrics - High-Contrast & Clearly Visible with Highlighted Headings & Singer Tags */}
            <div className='py-6 text-center mx-auto max-w-3xl space-y-4 sm:space-y-5'>
              {currentLyrics.map((rawLine: string, index: number) => {
                const parsed = parseLyricLine(rawLine);
                const isActive = index === activeLine;

                return (
                  <React.Fragment key={index}>
                    {parsed.isHeading ? (
                      <p className='text-rose-400 font-extrabold text-sm sm:text-base uppercase tracking-widest pt-4 pb-1 select-text drop-shadow-[0_2px_8px_rgba(244,63,94,0.5)]'>
                        {parsed.text}
                      </p>
                    ) : (
                      <div
                        onClick={() => setActiveLine(index)}
                        style={{ fontSize: fontSize + 'px' }}
                        className={`cursor-pointer transition-all duration-200 select-text py-1 px-3 rounded-2xl ${
                          isActive
                            ? 'text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-rose-200 to-amber-100 font-black drop-shadow-[0_4px_16px_rgba(244,63,94,0.6)] scale-[1.03] bg-white/[0.05]'
                            : 'text-white/90 font-bold tracking-tight leading-relaxed hover:text-white hover:scale-[1.01]'
                        }`}
                      >
                        {parsed.prefix && (
                          <span className='text-rose-400 font-extrabold uppercase tracking-wider mr-2 drop-shadow-[0_2px_8px_rgba(244,63,94,0.4)]'>
                            {parsed.prefix}
                          </span>
                        )}
                        <span>{parsed.text}</span>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

          </div>

          {/* RIGHT COLUMN: Song Information & Apple Music Card (Desktop) */}
          <div className='hidden xl:block xl:col-span-4 space-y-6 pt-2'>
            <div className='p-6 rounded-3xl bg-[#111319]/80 border border-white/10 backdrop-blur-xl shadow-2xl'>
              <h3 className='text-xs uppercase font-extrabold tracking-wider text-gray-400 mb-5'>
                Song Information
              </h3>
              
              <div className='space-y-4 text-xs'>
                <div className='flex items-start justify-between'>
                  <span className='text-gray-400'>Music</span>
                  {onSelectArtist ? (
                    <button
                      onClick={() =>
                        onSelectArtist({
                          id: slugifyArtistName(song.composer),
                          name: song.composer,
                          role: 'Music Director',
                          imageUrl: getArtistPhoto(song.composer),
                        })
                      }
                      className='font-bold text-white text-right hover:text-pink-400 hover:underline transition'
                    >
                      {song.composer}
                    </button>
                  ) : (
                    <span className='font-bold text-white text-right'>{song.composer}</span>
                  )}
                </div>
                <div className='border-t border-white/5 pt-3 flex items-start justify-between'>
                  <span className='text-gray-400'>Singers</span>
                  <div className='font-semibold text-white text-right max-w-[180px] flex flex-wrap justify-end gap-1'>
                    {song.singers.map((singer, i) => (
                      <React.Fragment key={singer}>
                        {onSelectArtist ? (
                          <button
                            onClick={() =>
                              onSelectArtist({
                                id: slugifyArtistName(singer),
                                name: singer,
                                role: 'Playback Singer',
                                imageUrl: getArtistPhoto(singer),
                              })
                            }
                            className='hover:text-pink-400 hover:underline transition'
                          >
                            {singer}
                          </button>
                        ) : (
                          <span>{singer}</span>
                        )}
                        {i < song.singers.length - 1 && <span>,</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <div className='border-t border-white/5 pt-3 flex items-start justify-between'>
                  <span className='text-gray-400'>Lyricist</span>
                  <span className='font-semibold text-white text-right'>{song.lyricist}</span>
                </div>
                <div className='border-t border-white/5 pt-3 flex items-start justify-between'>
                  <span className='text-gray-400'>Album</span>
                  <span className='font-semibold text-white text-right'>{song.movie} ({song.year})</span>
                </div>
                <div className='border-t border-white/5 pt-3 flex items-start justify-between'>
                  <span className='text-gray-400'>Movie</span>
                  <span className='font-semibold text-white text-right'>{song.movie}</span>
                </div>
                <div className='border-t border-white/5 pt-3 flex items-start justify-between'>
                  <span className='text-gray-400'>Release Year</span>
                  <span className='font-semibold text-white text-right'>{song.year}</span>
                </div>
              </div>
            </div>

            {/* Other Tracks from Same Movie Album */}
            {(() => {
              const movieTracks = allSongs.filter(
                (s) => s.movie.toLowerCase() === song.movie.toLowerCase() && s.id !== song.id
              );
              if (movieTracks.length === 0) return null;
              return (
                <div className='p-5 rounded-3xl bg-[#111319]/80 border border-white/10 backdrop-blur-xl shadow-2xl space-y-3'>
                  <div className='flex items-center justify-between'>
                    {onSelectMovie ? (
                      <button
                        onClick={() =>
                          onSelectMovie({
                            id: slugifyMovieTitle(song.movie),
                            title: song.movie,
                            year: song.year || 2024,
                            posterUrl: song.coverUrl,
                            trackCount: movieTracks.length + 1,
                          })
                        }
                        className='text-xs uppercase font-extrabold tracking-wider text-gray-400 hover:text-pink-400 flex items-center gap-1.5 transition group/mov'
                        title={`Open ${song.movie} dedicated album page`}
                      >
                        <Music className='w-3.5 h-3.5 text-rose-500' />
                        <span className='group-hover/mov:underline'>More from {song.movie}</span>
                        <ChevronRight className='w-3 h-3 opacity-0 group-hover/mov:opacity-100 transition' />
                      </button>
                    ) : (
                      <h3 className='text-xs uppercase font-extrabold tracking-wider text-gray-400 flex items-center gap-1.5'>
                        <Music className='w-3.5 h-3.5 text-rose-500' /> More from {song.movie}
                      </h3>
                    )}
                    <span className='text-[11px] text-gray-400'>{movieTracks.length} more track{movieTracks.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className='space-y-2'>
                    {movieTracks.map((trk) => (
                      <div
                        key={trk.id}
                        onClick={() => onSelectSong(trk)}
                        className='flex items-center gap-3 p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.08] border border-white/5 transition cursor-pointer group'
                      >
                        <img
                          src={trk.coverUrl}
                          alt={trk.title}
                          className='w-10 h-10 rounded-lg object-cover group-hover:scale-105 transition'
                        />
                        <div className='min-w-0 flex-1'>
                          <div className='font-bold text-xs text-white group-hover:text-pink-400 transition truncate'>
                            {trk.title}
                          </div>
                          <div className='text-[10px] text-gray-400 truncate'>
                            {trk.singers.join(', ')}
                          </div>
                        </div>
                        <span className='text-[10px] text-pink-400 font-bold opacity-0 group-hover:opacity-100 transition'>
                          Lyrics →
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Other Hits from the Same Composer */}
            {(() => {
              const composerHits = allSongs.filter(
                (s) =>
                  s.composer.toLowerCase() === song.composer.toLowerCase() &&
                  s.movie.toLowerCase() !== song.movie.toLowerCase() &&
                  s.id !== song.id
              ).slice(0, 4);
              if (composerHits.length === 0) return null;
              return (
                <div className='p-5 rounded-3xl bg-[#111319]/80 border border-white/10 backdrop-blur-xl shadow-2xl space-y-3'>
                  <div className='flex items-center justify-between'>
                    <h3 className='text-xs uppercase font-extrabold tracking-wider text-gray-400 flex items-center gap-1.5'>
                      <Users className='w-3.5 h-3.5 text-pink-500' /> Hits by {song.composer}
                    </h3>
                  </div>
                  <div className='space-y-2'>
                    {composerHits.map((trk) => (
                      <div
                        key={trk.id}
                        onClick={() => onSelectSong(trk)}
                        className='flex items-center gap-3 p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.08] border border-white/5 transition cursor-pointer group'
                      >
                        <img
                          src={trk.coverUrl}
                          alt={trk.title}
                          className='w-10 h-10 rounded-lg object-cover group-hover:scale-105 transition'
                        />
                        <div className='min-w-0 flex-1'>
                          <div className='font-bold text-xs text-white group-hover:text-pink-400 transition truncate'>
                            {trk.title}
                          </div>
                          <div className='text-[10px] text-gray-400 truncate'>
                            {trk.movie} ({trk.year})
                          </div>
                        </div>
                        <span className='text-[10px] text-pink-400 font-bold opacity-0 group-hover:opacity-100 transition'>
                          Lyrics →
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Official YouTube Lyrical Video Player if available */}
            {song.youtubeId && (
              <div className='p-4 rounded-3xl bg-[#111319]/80 border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden'>
                <div className='flex items-center gap-2 mb-3 px-1'>
                  <PlayCircle className='w-4 h-4 text-rose-500' />
                  <span className='text-xs font-bold text-gray-300'>Official Video Stream</span>
                </div>
                <div className='w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black'>
                  <iframe
                    src={`https://www.youtube.com/embed/${song.youtubeId}?rel=0&modestbranding=1&origin=${typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : ''}`}
                    title={song.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    className='w-full h-full border-0'
                  />
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 
        ========================================================================
        EXACT STICKY BOTTOM ACTION PILLS (From Reference Image)
        1. Share to WhatsApp Button
        2. Copy Lyrics Button
        3. Font Zoom Slider Control (Aa)
        ========================================================================
      */}
      <div className='fixed bottom-4 left-0 right-0 z-50 px-4 pointer-events-auto'>
        <div className='max-w-md mx-auto flex items-center gap-2 sm:gap-3 p-2 rounded-2xl bg-[#0c0d14]/95 border border-white/15 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.9)]'>
          
          {/* Share to WhatsApp */}
          <button
            onClick={handleWhatsAppShare}
            className='flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition active:scale-95 group'
          >
            <div className='w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0'>
              <Share2 className='w-3 h-3' />
            </div>
            <span className='text-[11px] leading-tight text-left'>
              Share to<br/><strong className='font-bold text-white'>WhatsApp</strong>
            </span>
          </button>

          {/* Copy Lyrics */}
          <button
            onClick={handleCopy}
            className='flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition active:scale-95'
          >
            <div className='w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0'>
              {copied ? <Check className='w-3 h-3 text-green-400' /> : <Copy className='w-3 h-3' />}
            </div>
            <span className='text-[11px] leading-tight text-left'>
              Copy<br/><strong className='font-bold text-white'>{copied ? 'Copied!' : 'Lyrics'}</strong>
            </span>
          </button>

          {/* Font Zoom Aa Slider */}
          <div className='flex-1 flex flex-col justify-center px-2 py-1 rounded-xl bg-white/[0.04] border border-white/10'>
            <div className='flex items-center justify-between text-[10px] text-gray-400 font-bold px-1'>
              <span>Aa</span>
              <span>Aa</span>
            </div>
            <input 
              type='range' 
              min='16' 
              max='32' 
              value={fontSize} 
              onChange={(e) => setFontSize(Number(e.target.value))} 
              className='w-full accent-pink-500 h-1 bg-white/20 rounded-lg cursor-pointer'
            />
          </div>

        </div>
      </div>

      {/* Accuracy Feedback & Correction Modal */}
      <SongAccuracyModal
        song={song}
        isOpen={isAccuracyModalOpen}
        onClose={() => setIsAccuracyModalOpen(false)}
      />

    </div>
  );
};
