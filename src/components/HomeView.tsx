import React from 'react';
import { Play, Sparkles, TrendingUp, ChevronRight, Music2, Eye } from 'lucide-react';
import { Song, MovieAlbum, Artist } from '../data';
import { AdBanner } from './AdBanner';

interface HomeViewProps {
  songs: Song[];
  movies: MovieAlbum[];
  artists: Artist[];
  onSelectSong: (song: Song) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  songs,
  movies,
  artists,
  onSelectSong,
}) => {
  const heroSong = songs[0];
  const nextSong = songs[2] || songs[1];

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-12'>
      
      {/* 1. TOP SPONSOR BANNER (Leaderboard Ad) */}
      <AdBanner type='leaderboard' />

      {/* 2. HERO SPOTLIGHT CAROUSEL (Direct from the UI Design) */}
      <div className='relative rounded-3xl overflow-hidden border border-white/10 bg-[#12141c]/90 backdrop-blur-2xl shadow-2xl p-6 sm:p-8'>
        {/* Ambient Blur Glow behind Hero */}
        <div 
          className='absolute -top-24 -left-24 w-96 h-96 rounded-full blur-[100px] opacity-40 pointer-events-none'
          style={{ background: heroSong.primaryGlowColor }}
        />

        <div className='relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center'>
          
          {/* Hero Left Meta */}
          <div className='lg:col-span-6 space-y-4'>
            <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-bold uppercase tracking-wider'>
              <Sparkles className='w-3.5 h-3.5' /> Trending Now
            </div>

            <h1 className='text-4xl sm:text-5xl font-black tracking-tight text-white'>
              {heroSong.title}
            </h1>

            <p className='text-base text-gray-300'>
              <span className='font-semibold text-white'>{heroSong.composer}</span> • From {heroSong.movie} ({heroSong.year})
            </p>

            <p className='text-sm text-gray-400 line-clamp-2 max-w-lg'>
              A timeless anthem that still gives goosebumps. Explore lyrics in both authentic Tamil font and easy-read Tanglish.
            </p>

            <div className='flex flex-wrap items-center gap-4 pt-2'>
              <button
                onClick={() => onSelectSong(heroSong)}
                className='px-6 py-3 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-sm shadow-xl shadow-pink-500/25 transition active:scale-95 flex items-center gap-2'
              >
                View Lyrics <ChevronRight className='w-4 h-4' />
              </button>

              <button
                onClick={() => onSelectSong(heroSong)}
                className='px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-sm backdrop-blur-md transition active:scale-95 flex items-center gap-2'
              >
                <Play className='w-4 h-4 fill-white' /> Play Preview
              </button>
            </div>
          </div>

          {/* Hero Center & Right Showcase Covers */}
          <div className='lg:col-span-6 flex items-center justify-center lg:justify-end gap-5'>
            {/* Main Center Artwork */}
            <div 
              onClick={() => onSelectSong(heroSong)}
              className='relative w-48 sm:w-64 aspect-square rounded-2xl overflow-hidden shadow-2xl group cursor-pointer border border-white/15 transform hover:-translate-y-1 transition duration-300'
            >
              <img
                src={heroSong.coverUrl}
                alt={heroSong.title}
                className='w-full h-full object-cover group-hover:scale-105 transition duration-500'
              />
              <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4'>
                <div className='text-lg font-black text-white leading-tight'>{heroSong.title}</div>
                <div className='text-xs text-gray-300'>{heroSong.movie}</div>
              </div>
            </div>

            {/* Next Up Card */}
            {nextSong && (
              <div 
                onClick={() => onSelectSong(nextSong)}
                className='hidden sm:block relative w-36 sm:w-48 aspect-square rounded-2xl overflow-hidden shadow-xl group cursor-pointer border border-white/10 opacity-75 hover:opacity-100 transform hover:-translate-y-1 transition duration-300'
              >
                <img
                  src={nextSong.coverUrl}
                  alt={nextSong.title}
                  className='w-full h-full object-cover group-hover:scale-105 transition duration-500'
                />
                <div className='absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-3'>
                  <span className='text-[10px] uppercase font-bold text-pink-400 tracking-wider mb-0.5'>Next Up</span>
                  <div className='text-sm font-bold text-white leading-tight truncate'>{nextSong.title}</div>
                  <div className='text-[11px] text-gray-400 truncate'>{nextSong.movie}</div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 3. TOP 10 CHARTS (Apple Music / Genius Style Grid) */}
      <section className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <h2 className='text-2xl font-black tracking-tight text-white flex items-center gap-2'>
              Top 10 Charts <ChevronRight className='w-5 h-5 text-gray-500' />
            </h2>
          </div>
          <div className='flex items-center gap-2 text-xs font-semibold'>
            <span className='px-3 py-1 rounded-full bg-rose-500 text-white shadow-sm'>All</span>
            <span className='px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 cursor-pointer transition'>Tamil</span>
            <span className='px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 cursor-pointer transition'>Movies</span>
          </div>
        </div>

        {/* 2-Column Song List Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4'>
          {songs.map((song, idx) => (
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
                    src={song.coverUrl}
                    alt={song.title}
                    className='w-full h-full object-cover group-hover:scale-105 transition'
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

      {/* 4. LATEST MOVIE ALBUMS (Posters Grid) */}
      <section className='space-y-5'>
        <div className='flex items-center justify-between'>
          <h2 className='text-2xl font-black tracking-tight text-white flex items-center gap-2'>
            Latest Movie Albums <ChevronRight className='w-5 h-5 text-gray-500' />
          </h2>
          <span className='text-xs text-gray-400 hover:text-white cursor-pointer transition'>View All</span>
        </div>

        <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4'>
          {movies.map((movie) => (
            <div
              key={movie.id}
              className='group cursor-pointer space-y-2.5'
              onClick={() => onSelectSong(songs[0])}
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
                <div className='font-bold text-sm text-white group-hover:text-pink-400 transition truncate'>
                  {movie.title}
                </div>
                <div className='text-xs text-gray-400'>{movie.year}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. POPULAR ARTISTS & COMPOSERS (Circular Avatars) */}
      <section className='space-y-5 pt-2'>
        <div className='flex items-center justify-between'>
          <h2 className='text-2xl font-black tracking-tight text-white flex items-center gap-2'>
            Popular Artists & Composers <ChevronRight className='w-5 h-5 text-gray-500' />
          </h2>
          <span className='text-xs text-gray-400 hover:text-white cursor-pointer transition'>View All</span>
        </div>

        <div className='grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 text-center'>
          {artists.map((artist) => (
            <div
              key={artist.id}
              className='group cursor-pointer space-y-2 flex flex-col items-center'
              onClick={() => onSelectSong(songs[0])}
            >
              <div className='relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-pink-500 shadow-xl transition duration-300'>
                <img
                  src={artist.imageUrl}
                  alt={artist.name}
                  className='w-full h-full object-cover group-hover:scale-110 transition duration-500'
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

      {/* 6. A - Z DIRECTORY (CRITICAL FOR SEO AND GOOGLE SPIDER CRAWLING) */}
      <section className='pt-6 border-t border-white/10 space-y-3'>
        <div className='text-xs uppercase font-extrabold tracking-wider text-gray-400'>
          Browse Songs by Letter (A - Z Index)
        </div>
        <div className='flex flex-wrap gap-2 text-xs font-mono font-bold'>
          {['#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'].map((letter) => (
            <button
              key={letter}
              className='w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-gray-300 hover:text-white transition flex items-center justify-center'
            >
              {letter}
            </button>
          ))}
        </div>
      </section>

    </div>
  );
};