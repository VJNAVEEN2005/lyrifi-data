import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

interface AdBannerProps {
  type: 'leaderboard' | 'in-lyrics' | 'sidebar' | 'inline';
  adSlot?: string;
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ type, adSlot, className = '' }) => {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.adsbygoogle && adSlot) {
        window.adsbygoogle.push({});
      }
    } catch {
      // Ignore adsbygoogle duplicate push errors
    }
  }, [adSlot]);

  // If a real Google AdSense adSlot ID is configured, render the official AdSense unit
  if (adSlot) {
    return (
      <div className={`w-full overflow-hidden text-center my-4 ${className}`}>
        <ins
          ref={adRef}
          className='adsbygoogle'
          style={{ display: 'block' }}
          data-ad-client='ca-pub-4141318884953659'
          data-ad-slot={adSlot}
          data-ad-format='auto'
          data-full-width-responsive='true'
        />
      </div>
    );
  }

  // Native High-Conversion Responsive Ads (styled seamlessly like Apple Music / Spotify with real click-through)
  if (type === 'leaderboard') {
    return (
      <div className={'w-full max-w-5xl mx-auto my-6 px-4 ' + className}>
        <div className='relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#181a24] via-[#12141c] to-[#1a1528] border border-white/10 p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 group'>
          <div className='absolute top-2 left-3 text-[10px] uppercase font-bold tracking-widest text-white/40'>
            Sponsored
          </div>
          <div className='flex items-center gap-4 mt-2 md:mt-0'>
            <div className='w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-pink-500/30 shrink-0'>
              
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className='font-bold text-white text-base sm:text-lg tracking-tight'>Apple Music Unlimited</span>
                <span className='text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 font-semibold border border-pink-500/30'>Free Trial</span>
              </div>
              <p className='text-xs sm:text-sm text-gray-400'>Listen to 100M+ songs with synced lyrics in Spatial Audio.</p>
            </div>
          </div>
          <div className='flex items-center gap-3 shrink-0'>
            <a
              href='https://music.apple.com'
              target='_blank'
              rel='noopener noreferrer'
              className='px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-gray-100 transition shadow-lg shadow-white/10 active:scale-95 text-center'
            >
              Try Free Now
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'in-lyrics') {
    return (
      <div className={'my-6 w-full max-w-xl mx-auto ' + className}>
        <div className='relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950/40 via-purple-950/30 to-black/60 border border-white/15 p-4 shadow-xl flex items-center justify-between gap-3 group backdrop-blur-md'>
          <span className='absolute top-1.5 left-3 text-[9px] uppercase font-extrabold tracking-wider text-white/40'>
            Sponsored
          </span>
          <div className='flex items-center gap-3 pl-8'>
            <div className='text-xl sm:text-2xl text-white font-bold tracking-tight'> Music</div>
            <div className='text-xs text-gray-300 hidden sm:block leading-snug'>
              Over 100M songs in Lossless Audio.<br />Get 1 month free.
            </div>
          </div>
          <a
            href='https://music.apple.com'
            target='_blank'
            rel='noopener noreferrer'
            className='px-4 py-2 rounded-full bg-white text-black text-xs font-bold hover:bg-gray-200 transition active:scale-95 shrink-0 shadow-md'
          >
            Listen Now
          </a>
        </div>
      </div>
    );
  }

  if (type === 'inline') {
    return (
      <div className={'w-full my-6 ' + className}>
        <div className='relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#12141e] via-[#181528] to-[#14121e] border border-white/10 p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4'>
          <div className='absolute top-2 left-3 text-[9px] uppercase font-extrabold tracking-wider text-white/40'>
            Advertisement
          </div>
          <div className='flex items-center gap-3 mt-1 sm:mt-0'>
            <div className='w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center font-black text-lg text-pink-400 shrink-0'>
              ♪
            </div>
            <div>
              <div className='font-bold text-sm text-white'>Stream High-Res Audio</div>
              <div className='text-xs text-gray-400'>Discover unlimited Tamil playlists and soundtracks ad-free.</div>
            </div>
          </div>
          <a
            href='https://music.apple.com'
            target='_blank'
            rel='noopener noreferrer'
            className='px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-xs hover:from-pink-600 hover:to-rose-700 transition active:scale-95 shrink-0 shadow-md shadow-pink-500/20'
          >
            Explore Music
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={'w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1528] via-[#10121a] to-[#25101f] border border-white/10 p-5 shadow-2xl relative ' + className}>
      <div className='flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-white/40 mb-3'>
        <span>Sponsored</span>
        <span className='text-pink-400 font-semibold'>Apple Music</span>
      </div>
      <div className='relative rounded-2xl overflow-hidden mb-4 aspect-[4/3] bg-black/40'>
        <img
          src='https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop'
          alt='Ad creative'
          className='w-full h-full object-cover opacity-85 group-hover:scale-105 transition duration-500'
        />
        <div className='absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent flex flex-col justify-end p-4'>
          <div className='text-xl font-black text-white'> Music</div>
          <p className='text-xs text-gray-300'>Over 100M songs in Lossless Audio.</p>
        </div>
      </div>
      <a
        href='https://music.apple.com'
        target='_blank'
        rel='noopener noreferrer'
        className='block w-full py-2.5 text-center rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-gray-100 transition shadow-lg shadow-white/10 active:scale-95'
      >
        Try Free Now
      </a>
      <div className='mt-2.5 text-center text-[10px] text-gray-500'>
        Listen without interruptions ❤️
      </div>
    </div>
  );
};