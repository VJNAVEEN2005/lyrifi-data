import React, { useMemo } from 'react';
import { Play, Sparkles, TrendingUp, ChevronRight, Music2, Eye, Disc3, Mic2, Film } from 'lucide-react';
import { Song, MovieAlbum, Artist } from '../data';
import { SEOHead } from './SEOHead';

interface HomeViewProps {
  songs: Song[];
  movies: MovieAlbum[];
  artists: Artist[];
  onSelectSong: (song: Song) => void;
  onSelectMovie?: (movie: MovieAlbum) => void;
  onSelectArtist?: (artist: Artist) => void;
  onTabChange?: (tab: 'home' | 'movies' | 'artists' | 'search') => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  songs,
  movies,
  artists,
  onSelectSong,
  onSelectMovie,
  onSelectArtist,
  onTabChange,
}) => {
  // Show new songs: ordered by latest year (2026, 2025, 2024...) and strictly ONE song per movie!
  const displaySongs = useMemo(() => {
    const sorted = [...songs].sort((a, b) => {
      const yearDiff = (b.year || 0) - (a.year || 0);
      if (yearDiff !== 0) return yearDiff;
      return (b.views || 0) - (a.views || 0);
    });

    const seenMovies = new Set<string>();
    const oneSongPerMovie: Song[] = [];

    for (const song of sorted) {
      const movieKey = (song.movie || '').toLowerCase().trim();
      // For independent singles, treat them individually so singles don't collide
      const dedupeKey = (!movieKey || movieKey === 'tamil song' || movieKey === 'tamil single')
        ? `single_${song.id}`
        : movieKey;

      if (!seenMovies.has(dedupeKey)) {
        seenMovies.add(dedupeKey);
        oneSongPerMovie.push(song);
      }

      if (oneSongPerMovie.length >= 24) break;
    }

    return oneSongPerMovie;
  }, [songs]);

  // Show latest movies: sorted strictly by latest release year descending
  const displayMovies = useMemo(() => {
    const valid = movies.filter((m) => {
      const t = (m.title || '').toLowerCase().trim();
      return t !== 'tamil song' && t !== 'tamil single';
    });
    return [...valid]
      .sort((a, b) => (b.year || 0) - (a.year || 0) || b.trackCount - a.trackCount)
      .slice(0, 18);
  }, [movies]);

  const displayArtists = useMemo(() => artists.slice(0, 16), [artists]);

  const homeSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Lyrifi',
    alternateName: 'Lyrifi Tamil Lyrics',
    url: 'https://lyrifi-data.vercel.app/',
    description: 'Find authentic Tamil & Tanglish song lyrics with synchronized Apple Music line glow across 20,000+ songs and 4,600+ movie albums.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://lyrifi-data.vercel.app/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }), []);

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-12'>
      <SEOHead
        title='Lyrifi - Tamil Songs Lyrics, Movie Albums & Artists'
        description='Explore 20,000+ authentic Tamil and Tanglish song lyrics, 4,600+ movie tracklists, latest 2026 releases and famous artists with synchronized Apple Music line glow.'
        keywords='tamil song lyrics, tamil lyrics 2026, latest tamil songs, tamil movie songs lyrics, tanglish lyrics, lyrifi'
        canonicalUrl='https://lyrifi-data.vercel.app/'
        ogImage='https://lyrifi-data.vercel.app/default-cover.svg'
        schema={homeSchema}
      />
      
      {/* 1. NEW RELEASES & TRENDING SONGS (One song per movie) */}
      <section className='space-y-6'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
          <div>
            <h2 className='text-2xl font-black tracking-tight text-white flex items-center gap-2'>
              New Releases &amp; Trending Songs <ChevronRight className='w-5 h-5 text-gray-500' />
            </h2>
            <p className='text-xs text-gray-400 mt-0.5'>
              Latest songs across Tamil cinema • <span className='text-rose-400 font-semibold'>1 song featured per movie</span>
            </p>
          </div>
          <div className='flex items-center gap-2 text-xs font-semibold self-start sm:self-auto'>
            <span className='px-3 py-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-sm'>
              Latest Released
            </span>
            <span 
              onClick={() => onTabChange?.('movies')} 
              className='px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 cursor-pointer transition flex items-center gap-1'
            >
              <Film className='w-3 h-3' /> By Movie
            </span>
          </div>
        </div>

        {/* 2-Column Song List Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4'>
          {displaySongs.map((song, idx) => (
            <div
              key={song.id}
              onClick={() => onSelectSong(song)}
              className='group flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/15 transition cursor-pointer'
            >
              <div className='flex items-center gap-3.5 min-w-0'>
                <span className='w-6 text-center font-bold text-base text-gray-400 group-hover:text-pink-400 transition font-mono'>
                  {idx + 1}
                </span>

                <div className='relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-md'>
                  <img
                    src={song.coverUrl || '/default-cover.svg'}
                    alt={song.title}
                    className='w-full h-full object-cover group-hover:scale-105 transition'
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/default-cover.svg';
                    }}
                  />
                </div>

                <div className='min-w-0'>
                  <div className='font-bold text-sm text-white group-hover:text-pink-400 transition truncate'>
                    {song.title}
                  </div>
                  <div className='text-xs text-gray-400 truncate'>
                    {song.composer} • {song.movie}
                  </div>
                </div>
              </div>

              <div className='flex items-center gap-2 shrink-0'>
                <button className='px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition group-hover:bg-pink-500 group-hover:text-white'>
                  Lyrics
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. LATEST MOVIE ALBUMS (Posters Grid) */}
      <section id='movies' className='space-y-5 scroll-mt-20'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-2xl font-black tracking-tight text-white flex items-center gap-2'>
              Latest Movie Albums <ChevronRight className='w-5 h-5 text-gray-500' />
            </h2>
            <p className='text-xs text-gray-400 mt-0.5'>
              Soundtracks ordered by latest theatrical release
            </p>
          </div>
          <button 
            onClick={() => onTabChange?.('movies')} 
            className='text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer transition flex items-center gap-1 hover:underline'
          >
            <span>View All Movies ({movies.length})</span>
            <ChevronRight className='w-3.5 h-3.5' />
          </button>
        </div>

        <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4'>
          {displayMovies.map((movie) => (
            <div
              key={movie.id}
              className='group cursor-pointer space-y-2.5'
              onClick={() => {
                if (onSelectMovie) {
                  onSelectMovie(movie);
                } else {
                  // Fallback to finding first song matching this movie
                  const match = songs.find((s) => s.movie.toLowerCase() === movie.title.toLowerCase());
                  if (match) onSelectSong(match);
                }
              }}
            >
              <div className='relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-white/5'>
                <img
                  src={movie.posterUrl || '/default-cover.svg'}
                  alt={movie.title}
                  className='w-full h-full object-cover group-hover:scale-105 transition duration-500'
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/default-cover.svg';
                  }}
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

      {/* 2. POPULAR ARTISTS & COMPOSERS (Circular Avatars) */}
      <section id='artists' className='space-y-5 pt-2 scroll-mt-20'>
        <div className='flex items-center justify-between'>
          <h2 className='text-2xl font-black tracking-tight text-white flex items-center gap-2'>
            Popular Artists & Composers <ChevronRight className='w-5 h-5 text-gray-500' />
          </h2>
          <span className='text-xs text-gray-400 hover:text-white cursor-pointer transition'>View All</span>
        </div>

        <div className='grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 text-center'>
          {displayArtists.map((artist) => (
            <div
              key={artist.id}
              className='group cursor-pointer space-y-2 flex flex-col items-center'
              onClick={() => {
                if (onSelectArtist) {
                  onSelectArtist(artist);
                } else {
                  const match = songs.find(
                    (s) =>
                      s.composer.toLowerCase().includes(artist.name.toLowerCase()) ||
                      s.singers.some((singer) => singer.toLowerCase().includes(artist.name.toLowerCase()))
                  );
                  if (match) onSelectSong(match);
                }
              }}
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
                <div className='font-bold text-xs text-white group-hover:text-pink-400 transition line-clamp-1'>
                  {artist.name}
                </div>
                <div className='text-[10px] text-gray-400 truncate'>{artist.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};