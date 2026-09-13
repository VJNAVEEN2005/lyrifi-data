import React from 'react';

interface LogoLoaderProps {
  message?: string;
  fullscreen?: boolean;
}

export const LogoLoader: React.FC<LogoLoaderProps> = ({
  message = 'Loading authentic lyrics...',
  fullscreen = false,
}) => {
  const content = (
    <div className='flex flex-col items-center justify-center gap-4 select-none'>
      {/* Animated Glowing Logo Equalizer */}
      <div className='relative flex items-center justify-center p-6'>
        {/* Ambient Glow Aura */}
        <div className='absolute w-32 h-32 rounded-full bg-gradient-to-tr from-pink-500/30 via-rose-500/20 to-purple-600/30 blur-2xl animate-pulse pointer-events-none' />

        <div className='relative flex items-end gap-1.5 h-10'>
          <span className='w-1.5 bg-gradient-to-t from-pink-600 to-rose-400 rounded-full animate-eq-1 shadow-[0_0_12px_rgba(236,72,153,0.8)]' />
          <span className='w-1.5 bg-gradient-to-t from-rose-600 to-pink-400 rounded-full animate-eq-2 shadow-[0_0_12px_rgba(244,63,94,0.8)]' />
          <span className='w-1.5 bg-gradient-to-t from-pink-500 to-rose-300 rounded-full animate-eq-3 shadow-[0_0_15px_rgba(236,72,153,0.9)]' />
          <span className='w-1.5 bg-gradient-to-t from-rose-500 to-purple-400 rounded-full animate-eq-4 shadow-[0_0_12px_rgba(244,63,94,0.8)]' />
          <span className='w-1.5 bg-gradient-to-t from-pink-600 to-rose-400 rounded-full animate-eq-5 shadow-[0_0_12px_rgba(236,72,153,0.8)]' />
        </div>
      </div>

      {/* Brand Title */}
      <div className='flex flex-col items-center gap-1 text-center'>
        <span className='text-2xl font-black tracking-tight text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]'>
          Lyrifi
        </span>
        <span className='text-xs text-gray-400 font-medium tracking-wide'>
          {message}
        </span>
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <div className='fixed inset-0 z-50 bg-[#08090c]/90 backdrop-blur-xl flex items-center justify-center'>
        {content}
      </div>
    );
  }

  return <div className='py-20 flex items-center justify-center'>{content}</div>;
};
