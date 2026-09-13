import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Maximize2 } from 'lucide-react';
import { Song } from '../data';

interface PlayerBarProps {
  song: Song;
  onOpenSong: (song: Song) => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({ song, onOpenSong }) => {
  const [isPlaying, setIsPlaying] = useState(true);

  return (
    <div className='fixed bottom-0 left-0 right-0 z-40 bg-[#0c0d12]/95 backdrop-blur-2xl border-t border-white/10 px-4 py-3 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]'>
      <div className='max-w-7xl mx-auto flex items-center justify-between gap-4'>
        
        {/* Left: Current Song */}
        <div 
          onClick={() => onOpenSong(song)}
          className='flex items-center gap-3 cursor-pointer group min-w-0 max-w-[240px] sm:max-w-xs'
        >
          <div className='relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-lg border border-white/10'>
            <img src={song.coverUrl} alt={song.title} className='w-full h-full object-cover group-hover:scale-105 transition' />
          </div>
          <div className='min-w-0'>
            <div className='text-sm font-bold text-white group-hover:text-pink-400 transition truncate'>
              {song.title}
            </div>
            <div className='text-xs text-gray-400 truncate'>
              {song.movie}
            </div>
          </div>
        </div>

        {/* Center: Playback Controls & Waveform indicator */}
        <div className='flex flex-col items-center gap-1.5 flex-1 max-w-md'>
          <div className='flex items-center gap-4'>
            <button className='text-gray-400 hover:text-white transition'>
              <SkipBack className='w-4 h-4' />
            </button>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className='w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg shadow-white/20'
            >
              {isPlaying ? <Pause className='w-4 h-4 fill-black' /> : <Play className='w-4 h-4 fill-black ml-0.5' />}
            </button>
            <button className='text-gray-400 hover:text-white transition'>
              <SkipForward className='w-4 h-4' />
            </button>
          </div>
          <div className='w-full flex items-center gap-2 text-[10px] text-gray-400 font-mono'>
            <span>1:24</span>
            <div className='flex-1 h-1 bg-white/10 rounded-full overflow-hidden'>
              <div className='w-1/3 h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full'></div>
            </div>
            <span>{song.duration}</span>
          </div>
        </div>

        {/* Right: Quick Expand to Lyrics */}
        <div className='flex items-center gap-3 shrink-0'>
          <button
            onClick={() => onOpenSong(song)}
            className='flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-400 hover:bg-pink-500 hover:text-white transition text-xs font-bold'
          >
            <Maximize2 className='w-3.5 h-3.5' />
            <span className='hidden sm:inline'>Open Lyrics</span>
          </button>
        </div>

      </div>
    </div>
  );
};