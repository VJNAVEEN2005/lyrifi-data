import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  CheckCircle,
  XCircle,
  Clock,
  Edit2,
  Save,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  FileText,
  AlertCircle,
  Check,
  RefreshCw,
  Eye
} from 'lucide-react';
import { SongCorrectionPayload, fetchAdminFeedback, approveAdminFeedback, rejectAdminFeedback } from '../services/api';
import { Song } from '../data';

interface AdminPortalProps {
  allSongs: Song[];
  onSongUpdated?: (updatedSong: Song) => void;
  onGoHome: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  allSongs,
  onSongUpdated,
  onGoHome,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string>('');

  const [feedbackList, setFeedbackList] = useState<SongCorrectionPayload[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active item being edited
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editArtworkUrl, setEditArtworkUrl] = useState<string>('');
  const [editTamilLyrics, setEditTamilLyrics] = useState<string>('');
  const [editTanglishLyrics, setEditTanglishLyrics] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');

  // Passcode verification
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default secret passcode
    if (passcode.trim() === 'lyrifi2024' || passcode.trim() === 'admin') {
      setIsAuthenticated(true);
      setPasscodeError('');
      loadData();
    } else {
      setPasscodeError('Invalid passcode. Access restricted.');
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    const data = await fetchAdminFeedback();
    setFeedbackList(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const startEditing = (item: SongCorrectionPayload) => {
    setEditingItemId(item.id || null);
    if (item.type === 'artwork') {
      setEditArtworkUrl(typeof item.correctionValue === 'string' ? item.correctionValue : '');
    } else {
      const val = item.correctionValue || {};
      const tamilArr = Array.isArray(val) ? val : val.tamil || [];
      const tanglishArr = Array.isArray(val) ? [] : val.tanglish || [];
      setEditTamilLyrics(tamilArr.join('\n'));
      setEditTanglishLyrics(tanglishArr.join('\n'));
    }
  };

  const handleApprove = async (item: SongCorrectionPayload) => {
    if (!item.id) return;
    setIsProcessing(true);

    let finalValue = item.correctionValue;

    if (editingItemId === item.id) {
      if (item.type === 'artwork') {
        finalValue = editArtworkUrl;
      } else {
        finalValue = {
          tamil: editTamilLyrics.split('\n').map((l) => l.trim()).filter(Boolean),
          tanglish: editTanglishLyrics.split('\n').map((l) => l.trim()).filter(Boolean),
        };
      }
    }

    const success = await approveAdminFeedback(item.id, finalValue);
    if (success) {
      setActionSuccessMsg(`Approved and updated ${item.songTitle} live!`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
      setEditingItemId(null);
      await loadData();

      // Find song and notify parent
      const song = allSongs.find((s) => s.id === item.songId || s.slug === item.songId);
      if (song && onSongUpdated) {
        if (item.type === 'artwork' && typeof finalValue === 'string') {
          song.coverUrl = finalValue;
          song.backdropUrl = finalValue;
        } else if (item.type === 'lyrics') {
          if (finalValue.tamil) song.lyricsTamil = finalValue.tamil;
          if (finalValue.tanglish) song.lyricsTanglish = finalValue.tanglish;
        }
        onSongUpdated(song);
      }
    }
    setIsProcessing(false);
  };

  const handleReject = async (id?: string) => {
    if (!id) return;
    setIsProcessing(true);
    await rejectAdminFeedback(id);
    setActionSuccessMsg('Submission rejected and archived.');
    setTimeout(() => setActionSuccessMsg(''), 4000);
    setEditingItemId(null);
    await loadData();
    setIsProcessing(false);
  };

  // Filtered feedback list
  const filteredList = feedbackList.filter((item) => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  // Login Gate
  if (!isAuthenticated) {
    return (
      <div className='min-h-[80vh] flex items-center justify-center px-4'>
        <div className='w-full max-w-md p-8 rounded-3xl bg-[#0e1017] border border-white/10 shadow-2xl text-center space-y-6'>
          <div className='w-16 h-16 mx-auto rounded-2xl bg-pink-500/10 border border-pink-500/30 text-pink-400 flex items-center justify-center shadow-lg shadow-pink-500/10'>
            <Lock className='w-8 h-8' />
          </div>

          <div className='space-y-1.5'>
            <h1 className='text-2xl font-black text-white tracking-tight'>
              Secret Review Portal
            </h1>
            <p className='text-xs text-gray-400'>
              Private administration area for review and verification of community submissions.
            </p>
          </div>

          <form onSubmit={handleLogin} className='space-y-4'>
            <div>
              <input
                type='password'
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder='Enter admin passcode...'
                className='w-full p-3.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white text-center focus:outline-none focus:border-pink-500 transition tracking-widest'
                autoFocus
              />
              {passcodeError && (
                <p className='text-xs text-rose-400 font-semibold mt-2'>
                  {passcodeError}
                </p>
              )}
            </div>

            <button
              type='submit'
              className='w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 font-bold text-sm text-white shadow-lg shadow-pink-500/25 hover:opacity-95 transition'
            >
              Access Portal
            </button>
          </form>

          <div className='pt-2'>
            <button
              onClick={onGoHome}
              className='text-xs text-gray-500 hover:text-white transition'
            >
              Return to Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8'>
      
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10'>
        <div className='flex items-center gap-3'>
          <div className='w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10'>
            <ShieldCheck className='w-6 h-6' />
          </div>
          <div>
            <h1 className='text-2xl font-black text-white tracking-tight flex items-center gap-2'>
              Admin Review Portal
              <span className='text-[10px] uppercase px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-400 font-extrabold'>
                Secret URL
              </span>
            </h1>
            <p className='text-xs text-gray-400'>
              Review, edit, accept, or reject user-submitted artwork and lyrics updates.
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <button
            onClick={loadData}
            className='flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300'
          >
            <RefreshCw className={'w-3.5 h-3.5 ' + (isLoading ? 'animate-spin' : '')} />
            <span>Refresh</span>
          </button>
          <button
            onClick={onGoHome}
            className='py-2 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300'
          >
            View Website
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionSuccessMsg && (
        <div className='p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn'>
          <CheckCircle className='w-4 h-4' />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className='flex items-center gap-2 p-1.5 rounded-2xl bg-[#111319] border border-white/10 w-fit'>
        {(['pending', 'approved', 'rejected', 'all'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition ${
              filter === tab
                ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab} ({feedbackList.filter((i) => tab === 'all' || i.status === tab).length})
          </button>
        ))}
      </div>

      {/* Feedback Submissions List */}
      {isLoading ? (
        <div className='py-20 text-center text-gray-400 text-sm'>
          Loading pending feedback submissions...
        </div>
      ) : filteredList.length === 0 ? (
        <div className='py-16 text-center space-y-3 bg-[#0d0f15] rounded-3xl border border-white/5 p-8'>
          <Clock className='w-12 h-12 text-gray-600 mx-auto' />
          <h3 className='text-base font-bold text-white'>No submissions found</h3>
          <p className='text-xs text-gray-400 max-w-sm mx-auto'>
            There are currently no items in the <span className='capitalize font-semibold'>{filter}</span> queue.
          </p>
        </div>
      ) : (
        <div className='space-y-4'>
          {filteredList.map((item) => {
            const isEditing = editingItemId === item.id;
            const currentSong = allSongs.find((s) => s.id === item.songId || s.slug === item.songId);

            return (
              <div
                key={item.id}
                className='p-5 sm:p-6 rounded-3xl bg-[#0f1118] border border-white/10 shadow-xl space-y-5 transition hover:border-white/20'
              >
                {/* Header: Title, Movie, Status Badge & Timestamp */}
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-pink-400'>
                      {item.type === 'artwork' ? <ImageIcon className='w-5 h-5' /> : <FileText className='w-5 h-5' />}
                    </div>
                    <div>
                      <h3 className='text-base font-bold text-white flex items-center gap-2'>
                        {item.songTitle}
                        <span className='text-xs font-normal text-gray-400'>• {item.movie}</span>
                      </h3>
                      <div className='text-[11px] text-gray-400 flex items-center gap-2 mt-0.5'>
                        <span className='capitalize text-rose-400 font-semibold'>{item.type} correction</span>
                        <span>•</span>
                        <span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Just now'}</span>
                      </div>
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    <span
                      className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                        item.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : item.status === 'rejected'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Optional User Notes */}
                {item.customNotes && (
                  <div className='p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-300'>
                    <span className='font-bold text-gray-400 mr-2'>User note:</span>
                    {item.customNotes}
                  </div>
                )}

                {/* Side-by-Side Comparison: Current vs Submitted */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 pt-1'>
                  {/* Current in Live Catalog */}
                  <div className='p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2'>
                    <div className='text-xs font-bold text-gray-400 uppercase tracking-wider'>
                      Current Live Version
                    </div>
                    {item.type === 'artwork' ? (
                      <div className='flex items-center gap-3'>
                        <img
                          src={currentSong?.coverUrl || '/default-cover.svg'}
                          alt='Current'
                          className='w-20 h-20 rounded-xl object-cover border border-white/10'
                        />
                        <div className='text-xs text-gray-400 break-all line-clamp-3'>
                          {currentSong?.coverUrl}
                        </div>
                      </div>
                    ) : (
                      <div className='text-xs text-gray-300 font-tamil max-h-36 overflow-y-auto space-y-1 p-2 bg-black/50 rounded-xl'>
                        {currentSong?.lyricsTamil?.slice(0, 8)?.map((line, idx) => (
                          <div key={idx}>{line}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Submitted by User (Editable) */}
                  <div className='p-4 rounded-2xl bg-pink-500/[0.03] border border-pink-500/20 space-y-2'>
                    <div className='flex items-center justify-between'>
                      <div className='text-xs font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5'>
                        <span>Proposed Correction</span>
                        {isEditing && <span className='text-[10px] text-amber-300 font-normal'>(Editing)</span>}
                      </div>
                      {!isEditing && item.status === 'pending' && (
                        <button
                          onClick={() => startEditing(item)}
                          className='text-[11px] font-bold text-pink-400 hover:text-white flex items-center gap-1'
                        >
                          <Edit2 className='w-3 h-3' />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>

                    {item.type === 'artwork' ? (
                      <div className='space-y-3'>
                        <div className='flex items-center gap-3'>
                          <img
                            src={isEditing ? editArtworkUrl : item.correctionValue}
                            alt='Proposed'
                            className='w-20 h-20 rounded-xl object-cover border border-pink-500/30'
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/default-cover.svg';
                            }}
                          />
                          <div className='flex-1 text-xs text-gray-300 break-all line-clamp-3'>
                            {isEditing ? (
                              <input
                                type='text'
                                value={editArtworkUrl}
                                onChange={(e) => setEditArtworkUrl(e.target.value)}
                                placeholder='Paste image URL...'
                                className='w-full p-2 rounded-lg bg-black/70 border border-white/20 text-xs text-white'
                              />
                            ) : (
                              item.correctionValue
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className='space-y-2'>
                        {isEditing ? (
                          <div className='space-y-2'>
                            <textarea
                              rows={4}
                              value={editTamilLyrics}
                              onChange={(e) => setEditTamilLyrics(e.target.value)}
                              placeholder='Edit Tamil lyrics lines...'
                              className='w-full p-2.5 rounded-xl bg-black/70 border border-white/20 text-xs font-tamil text-white'
                            />
                            <textarea
                              rows={3}
                              value={editTanglishLyrics}
                              onChange={(e) => setEditTanglishLyrics(e.target.value)}
                              placeholder='Edit Tanglish lyrics lines...'
                              className='w-full p-2.5 rounded-xl bg-black/70 border border-white/20 text-xs text-white'
                            />
                          </div>
                        ) : (
                          <div className='text-xs text-white font-tamil max-h-36 overflow-y-auto space-y-1 p-2 bg-black/50 rounded-xl'>
                            {Array.isArray(item.correctionValue) ? (
                              item.correctionValue.slice(0, 8).map((line: string, idx: number) => (
                                <div key={idx}>{line}</div>
                              ))
                            ) : item.correctionValue?.tamil ? (
                              item.correctionValue.tamil.slice(0, 8).map((line: string, idx: number) => (
                                <div key={idx}>{line}</div>
                              ))
                            ) : (
                              <div>Lyrics submitted</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions: Approve / Edit / Reject */}
                {item.status === 'pending' && (
                  <div className='flex items-center justify-end gap-2.5 pt-2 border-t border-white/5'>
                    <button
                      disabled={isProcessing}
                      onClick={() => handleReject(item.id)}
                      className='py-2 px-4 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 border border-white/10 text-xs font-bold text-gray-400 transition'
                    >
                      Reject
                    </button>

                    <button
                      disabled={isProcessing}
                      onClick={() => handleApprove(item)}
                      className='py-2 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 font-bold text-xs text-black shadow-lg shadow-emerald-500/20 hover:opacity-95 transition flex items-center gap-1.5'
                    >
                      <Check className='w-3.5 h-3.5 stroke-[3]' />
                      <span>{isEditing ? 'Save Edits & Approve' : 'Approve & Apply Live'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
