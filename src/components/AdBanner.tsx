import React from 'react';

interface AdBannerProps {
  type: 'leaderboard' | 'in-lyrics' | 'sidebar';
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ type, className = '' }) => {
  if (type === 'leaderboard') {
    return (
      <div className={'w-full max-w-5xl mx-auto my-6 px-4 ' + className}>
        <div className='relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#181a24] via-[#12141c] to-[#1a1528] border border-white/10 p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 group'>
          <div className='absolute top-2 left-3 text-[10px] uppercase font-bold tracking-widest text-white/40'>
            Advertisement
          </div>
          <div className='flex items-center gap-4 mt-2 md:mt-0'>
            <div className='w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-pink-500/30'>
              
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className='font-bold text-white text-lg tracking-tight'>Music Unlimited</span>
                <span className='text-xs px-2 py-0.5 rounded-full bg-white/10 text-pink-400 font-semibold'>Special Offer</span>
              </div>
              <p className='text-sm text-gray-400'>Millions of songs. Ad-free streaming in Lossless Audio.</p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <button className='px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-gray-100 transition shadow-lg shadow-white/10 active:scale-95'>
              Try Free Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'in-lyrics') {
    return (
      <div className={'my-8 w-full max-w-xl mx-auto ' + className}>
        <div className='relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950/40 via-purple-950/30 to-black/60 border border-white/15 p-4 shadow-xl flex items-center justify-between gap-3 group backdrop-blur-md'>
          <span className='absolute top-1.5 left-3 text-[9px] uppercase font-extrabold tracking-wider text-white/40'>
            AD
          </span>
          <div className='flex items-center gap-3 pl-6'>
            <div className='text-2xl text-white font-bold'> Music</div>
            <div className='text-xs text-gray-300 hidden sm:block'>
              Millions of songs.<br />Just for you.
            </div>
          </div>
          <button className='px-4 py-1.5 rounded-full bg-white text-black text-xs font-bold hover:bg-gray-200 transition active:scale-95 shrink-0 shadow-md'>
            Try Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={'w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1528] via-[#10121a] to-[#25101f] border border-white/10 p-5 shadow-2xl relative ' + className}>
      <div className='flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-white/40 mb-3'>
        <span>Advertisement</span>
        <span className='text-pink-400'>A Better Tomorrow</span>
      </div>
      <div className='relative rounded-xl overflow-hidden mb-4 aspect-[4/3] bg-black/40'>
        <img
          src='https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop'
          alt='Ad creative'
          className='w-full h-full object-cover opacity-85 group-hover:scale-105 transition duration-500'
        />
        <div className='absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-4'>
          <div className='text-xl font-black text-white'> Music</div>
          <p className='text-xs text-gray-300'>Millions of songs. Just for you.</p>
        </div>
      </div>
      <button className='w-full py-2.5 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-gray-100 transition shadow-lg shadow-white/10 active:scale-95'>
        Try Now
      </button>
      <div className='mt-2 text-center text-[10px] text-gray-500'>
        Music again ❤️
      </div>
    </div>
  );
};