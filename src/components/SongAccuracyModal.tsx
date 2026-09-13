import React, { useState } from 'react';
import {
  X,
  AlertCircle,
  Image as ImageIcon,
  FileText,
  Search,
  Upload,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  Heart,
  Check
} from 'lucide-react';
import { Song } from '../data';
import { scrapeAlternatives, submitSongFeedback } from '../services/api';

interface SongAccuracyModalProps {
  song: Song;
  isOpen: boolean;
  onClose: () => void;
  onSongUpdated?: (updatedSong: Song) => void;
}

export const SongAccuracyModal: React.FC<SongAccuracyModalProps> = ({
  song,
  isOpen,
  onClose,
  onSongUpdated,
}) => {
  if (!isOpen) return null;

  // Step flow: 'select-issue' -> 'scraping' -> 'choose-option' -> 'custom-input' -> 'success'
  const [step, setStep] = useState<'select-issue' | 'scraping' | 'choose-option' | 'custom-input' | 'success'>('select-issue');
  const [issueType, setIssueType] = useState<'artwork' | 'lyrics'>('artwork');
  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [scrapedOptions, setScrapedOptions] = useState<any[]>([]);
  const [selectedScrapedIndex, setSelectedScrapedIndex] = useState<number | null>(null);

  // Custom user input fallback ("None of the above")
  const [customImageFile, setCustomImageFile] = useState<string | null>(null);
  const [customTamilLyrics, setCustomTamilLyrics] = useState<string>('');
  const [customTanglishLyrics, setCustomTanglishLyrics] = useState<string>('');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reset state on close
  const handleClose = () => {
    setStep('select-issue');
    setIsScraping(false);
    setScrapedOptions([]);
    setSelectedScrapedIndex(null);
    setCustomImageFile(null);
    setCustomTamilLyrics('');
    setCustomTanglishLyrics('');
    setCustomNotes('');
    onClose();
  };

  // Start web scraping for alternatives
  const handleStartScrape = async (type: 'artwork' | 'lyrics') => {
    setIssueType(type);
    setStep('scraping');
    setIsScraping(true);

    try {
      const res = await scrapeAlternatives(song.title, song.movie, type, song.composer);
      if (res && res.options && res.options.length > 0) {
        setScrapedOptions(res.options);
        setStep('choose-option');
      } else {
        // If no alternative found, jump directly to custom input
        setStep('custom-input');
      }
    } catch {
      setStep('custom-input');
    } finally {
      setIsScraping(false);
    }
  };

  // Handle local image file upload and convert to base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCustomImageFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit selected option or custom user correction
  const handleSubmitCorrection = async (chosenValue?: any) => {
    setIsSubmitting(true);

    let correctionValue: any = chosenValue;

    if (!correctionValue) {
      if (issueType === 'artwork') {
        correctionValue = customImageFile;
      } else {
        const tamilLines = customTamilLyrics.split('\n').map((l) => l.trim()).filter(Boolean);
        const tanglishLines = customTanglishLyrics.split('\n').map((l) => l.trim()).filter(Boolean);
        correctionValue = {
          tamil: tamilLines,
          tanglish: tanglishLines,
        };
      }
    }

    if (!correctionValue) {
      alert('Please select an option or provide your correction.');
      setIsSubmitting(false);
      return;
    }

    try {
      await submitSongFeedback({
        songId: song.id,
        songTitle: song.title,
        movie: song.movie,
        type: issueType,
        correctionValue,
        customNotes,
      });

      // Show celebratory animation screen
      setStep('success');
    } catch {
      alert('Could not submit at this moment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-xl animate-fadeIn'>
      <div className='relative w-full max-w-xl rounded-3xl bg-[#0f1117] border border-white/15 p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.9)] text-white'>
        
        {/* Top Close Button */}
        <button
          onClick={handleClose}
          className='absolute top-5 right-5 w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition'
        >
          <X className='w-4 h-4' />
        </button>

        {/* STEP 1: Select What Is Wrong */}
        {step === 'select-issue' && (
          <div className='space-y-6 text-center'>
            <div className='w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/10'>
              <AlertCircle className='w-7 h-7' />
            </div>

            <div>
              <h2 className='text-xl sm:text-2xl font-black text-white tracking-tight'>
                Help us improve this song
              </h2>
              <p className='text-xs sm:text-sm text-gray-400 mt-1.5'>
                Spotted something inaccurate in <span className='text-white font-semibold'>{song.title}</span> ({song.movie})?
              </p>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2'>
              {/* Option: Artwork Wrong */}
              <button
                onClick={() => handleStartScrape('artwork')}
                className='flex flex-col items-center justify-center p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-pink-500/40 transition group text-center space-y-2.5 active:scale-95'
              >
                <div className='w-12 h-12 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center group-hover:scale-110 transition'>
                  <ImageIcon className='w-6 h-6' />
                </div>
                <div>
                  <div className='font-bold text-sm text-white group-hover:text-pink-400 transition'>
                    Wrong Image / Artwork
                  </div>
                  <div className='text-[11px] text-gray-400 mt-0.5'>
                    Cover photo is incorrect or poor quality
                  </div>
                </div>
              </button>

              {/* Option: Lyrics Wrong */}
              <button
                onClick={() => handleStartScrape('lyrics')}
                className='flex flex-col items-center justify-center p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-rose-500/40 transition group text-center space-y-2.5 active:scale-95'
              >
                <div className='w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center group-hover:scale-110 transition'>
                  <FileText className='w-6 h-6' />
                </div>
                <div>
                  <div className='font-bold text-sm text-white group-hover:text-rose-400 transition'>
                    Wrong Lyrics
                  </div>
                  <div className='text-[11px] text-gray-400 mt-0.5'>
                    Spelling mistakes, missing lines, or incorrect text
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Real-time Automated Web Scrape Loading */}
        {step === 'scraping' && (
          <div className='py-12 text-center space-y-5'>
            <div className='relative w-16 h-16 mx-auto'>
              <div className='absolute inset-0 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 animate-spin blur-md opacity-50' />
              <div className='relative w-full h-full rounded-full bg-[#111319] border border-white/20 flex items-center justify-center text-pink-400'>
                <RefreshCw className='w-7 h-7 animate-spin' />
              </div>
            </div>

            <div className='space-y-1.5'>
              <h3 className='text-lg font-bold text-white'>
                Searching the web for {issueType === 'artwork' ? 'official artworks' : 'verified lyrics'}...
              </h3>
              <p className='text-xs text-gray-400 max-w-sm mx-auto'>
                Checking Apple Music & Tamil web archives in real-time to find candidate replacements for you.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: Choose from Scraped Alternatives */}
        {step === 'choose-option' && (
          <div className='space-y-5'>
            <div className='text-center space-y-1'>
              <h3 className='text-lg sm:text-xl font-bold text-white'>
                Select the correct {issueType === 'artwork' ? 'artwork' : 'lyrics'}
              </h3>
              <p className='text-xs text-gray-400'>
                We retrieved these alternatives online. Click the right one, or select "None of the above".
              </p>
            </div>

            {/* Artwork Grid */}
            {issueType === 'artwork' && (
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-1 custom-scrollbar'>
                {scrapedOptions.map((url: string, index: number) => {
                  const isSelected = selectedScrapedIndex === index;
                  return (
                    <div
                      key={index}
                      onClick={() => setSelectedScrapedIndex(index)}
                      className={`relative aspect-square rounded-2xl overflow-hidden border-2 cursor-pointer transition group ${
                        isSelected
                          ? 'border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.5)] scale-[1.02]'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img src={url} alt={`Candidate ${index + 1}`} className='w-full h-full object-cover' />
                      {isSelected && (
                        <div className='absolute top-2 right-2 w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-lg'>
                          <Check className='w-3.5 h-3.5 stroke-[3]' />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Lyrics Options List */}
            {issueType === 'lyrics' && (
              <div className='space-y-3 max-h-[300px] overflow-y-auto p-1 custom-scrollbar'>
                {scrapedOptions.map((opt: any, index: number) => {
                  const isSelected = selectedScrapedIndex === index;
                  return (
                    <div
                      key={index}
                      onClick={() => setSelectedScrapedIndex(index)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition text-left space-y-2 ${
                        isSelected
                          ? 'border-rose-500 bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                          : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className='flex items-center justify-between'>
                        <span className='text-xs font-bold text-rose-400'>
                          Option #{index + 1}: {opt.title}
                        </span>
                        {isSelected && (
                          <span className='w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center'>
                            <Check className='w-3 h-3 stroke-[3]' />
                          </span>
                        )}
                      </div>
                      <div className='text-xs text-gray-300 line-clamp-3 font-tamil leading-relaxed'>
                        {opt.lyricsTamil?.slice(0, 3)?.join(' • ') || opt.lyricsTanglish?.slice(0, 3)?.join(' • ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Buttons: Submit Chosen OR 'None of the above' */}
            <div className='flex flex-col sm:flex-row items-center gap-2.5 pt-2'>
              <button
                disabled={selectedScrapedIndex === null || isSubmitting}
                onClick={() => {
                  if (selectedScrapedIndex !== null) {
                    const chosen = scrapedOptions[selectedScrapedIndex];
                    handleSubmitCorrection(chosen);
                  }
                }}
                className='w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 font-bold text-sm text-white shadow-lg shadow-pink-500/25 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition'
              >
                {isSubmitting ? 'Submitting...' : 'Use Selected & Submit'}
              </button>

              <button
                onClick={() => setStep('custom-input')}
                className='w-full sm:w-auto py-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 hover:text-white transition'
              >
                None of the above
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Custom Input / Upload (When 'None of the above' is chosen) */}
        {step === 'custom-input' && (
          <div className='space-y-4 text-left'>
            <div className='text-center space-y-1 mb-3'>
              <h3 className='text-lg sm:text-xl font-bold text-white'>
                {issueType === 'artwork' ? 'Upload the Correct Image' : 'Provide the Correct Lyrics'}
              </h3>
              <p className='text-xs text-gray-400'>
                {issueType === 'artwork'
                  ? 'Attach an authentic cover picture from your computer or device.'
                  : 'Type or paste the accurate Tamil or Tanglish lyrics.'}
              </p>
            </div>

            {/* Artwork File Upload Box */}
            {issueType === 'artwork' && (
              <div className='space-y-3'>
                <label className='relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/20 hover:border-pink-500/50 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition group'>
                  <input
                    type='file'
                    accept='image/*'
                    onChange={handleFileUpload}
                    className='hidden'
                  />
                  {customImageFile ? (
                    <div className='flex flex-col items-center space-y-2'>
                      <img
                        src={customImageFile}
                        alt='Uploaded preview'
                        className='w-28 h-28 object-cover rounded-xl shadow-lg border border-white/20'
                      />
                      <span className='text-xs text-pink-400 font-semibold group-hover:underline'>
                        Change photo
                      </span>
                    </div>
                  ) : (
                    <div className='flex flex-col items-center space-y-2 text-center'>
                      <div className='w-12 h-12 rounded-full bg-pink-500/10 text-pink-400 flex items-center justify-center group-hover:scale-110 transition'>
                        <Upload className='w-5 h-5' />
                      </div>
                      <span className='text-xs font-bold text-white'>Click or Drag to Upload Cover Art</span>
                      <span className='text-[10px] text-gray-400'>Supports PNG, JPG, JPEG, WEBP</span>
                    </div>
                  )}
                </label>
              </div>
            )}

            {/* Lyrics Input Box */}
            {issueType === 'lyrics' && (
              <div className='space-y-3'>
                <div>
                  <label className='block text-xs font-bold text-rose-400 mb-1'>
                    தமிழ் வரிகள் (Tamil Script Lyrics)
                  </label>
                  <textarea
                    rows={4}
                    value={customTamilLyrics}
                    onChange={(e) => setCustomTamilLyrics(e.target.value)}
                    placeholder='பாடல் வரிகளை இங்கே உள்ளிடவும்...'
                    className='w-full p-3 rounded-xl bg-black/60 border border-white/10 text-xs font-tamil text-white placeholder:text-gray-500 focus:outline-none focus:border-rose-500 transition resize-none'
                  />
                </div>

                <div>
                  <label className='block text-xs font-bold text-blue-400 mb-1'>
                    Tanglish / English Lyrics
                  </label>
                  <textarea
                    rows={3}
                    value={customTanglishLyrics}
                    onChange={(e) => setCustomTanglishLyrics(e.target.value)}
                    placeholder='Type or paste Tanglish lyrics here...'
                    className='w-full p-3 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 transition resize-none'
                  />
                </div>
              </div>
            )}

            {/* Additional Notes (Optional) */}
            <div>
              <label className='block text-[11px] font-semibold text-gray-400 mb-1'>
                Additional Notes (Optional)
              </label>
              <input
                type='text'
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder='e.g. Official poster from Sony Music South release'
                className='w-full p-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-white/30 transition'
              />
            </div>

            {/* Action Buttons */}
            <div className='flex items-center gap-2 pt-2'>
              <button
                type='button'
                onClick={() => setStep(scrapedOptions.length > 0 ? 'choose-option' : 'select-issue')}
                className='py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300'
              >
                Back
              </button>
              <button
                type='button'
                disabled={isSubmitting || (issueType === 'artwork' && !customImageFile) || (issueType === 'lyrics' && !customTamilLyrics && !customTanglishLyrics)}
                onClick={() => handleSubmitCorrection()}
                className='flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 font-bold text-xs text-white shadow-lg shadow-pink-500/25 hover:opacity-95 disabled:opacity-40 transition'
              >
                {isSubmitting ? 'Submitting...' : 'Submit to Curators'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Celebration Greeting Animation */}
        {step === 'success' && (
          <div className='py-8 text-center space-y-6 animate-scaleUp'>
            {/* Pulsing Festive Icon with floating sparkles */}
            <div className='relative w-20 h-20 mx-auto'>
              <div className='absolute -inset-2 rounded-full bg-gradient-to-r from-emerald-500 to-pink-500 animate-pulse blur-xl opacity-60' />
              <div className='relative w-full h-full rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-black flex items-center justify-center shadow-2xl'>
                <CheckCircle2 className='w-10 h-10 text-[#07080b] stroke-[2.5]' />
              </div>
              <Sparkles className='absolute -top-3 -right-3 w-7 h-7 text-amber-300 animate-bounce' />
            </div>

            <div className='space-y-2'>
              <h3 className='text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-amber-200'>
                Thanks for your help! 🎉
              </h3>
              <p className='text-xs sm:text-sm text-gray-300 max-w-md mx-auto leading-relaxed'>
                Your contribution makes Lyrifi better for millions of Tamil music lovers! Our curators will review and accept your update shortly.
              </p>
            </div>

            {/* Gratitude Badge */}
            <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 text-xs text-gray-300'>
              <Heart className='w-3.5 h-3.5 text-rose-500 fill-rose-500' />
              <span>Community powered lyrics</span>
            </div>

            <div>
              <button
                onClick={handleClose}
                className='py-2.5 px-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition active:scale-95'
              >
                Done
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
