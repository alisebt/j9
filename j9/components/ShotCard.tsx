import React from 'react';
import type { Shot } from '../App';

type ShotCardProps = {
  shot: Shot;
  onSelect: () => void;
  onTogglePlaylist: () => void;
  isInPlaylist: boolean;
  isPlaylistActive: boolean;
};

const ShotCard: React.FC<ShotCardProps> = ({ shot, onSelect, onTogglePlaylist, isInPlaylist, isPlaylistActive }) => {
  const handlePlaylistClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    onTogglePlaylist();
  };
  
  const hasMedia = shot.imageFiles.length > 0 || shot.videoFiles.length > 0;

  return (
    <div className="group relative rounded-lg overflow-hidden bg-zinc-800 shadow-lg cursor-pointer transform hover:-translate-y-1 transition-all duration-300" onClick={onSelect}>
      <div className="w-full h-40 bg-zinc-700 flex items-center justify-center">
        {shot.coverType === 'image' && shot.coverUrl ? (
          <img 
            src={shot.coverUrl} 
            alt={shot.id} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
          />
        ) : shot.coverType === 'video' && shot.coverUrl ? (
          <video
            src={shot.coverUrl}
            muted
            playsInline
            disablePictureInPicture
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          >
            مرورگر شما از تگ ویدیو پشتیبانی نمی‌کند.
          </video>
        ) : hasMedia ? (
           // Fallback icon if there is media but cover somehow failed
           <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ) : (
          // Icon for prompt-only shots
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
        <h3 className="font-bold truncate">{shot.id}</h3>
      </div>
      <button 
        onClick={handlePlaylistClick}
        disabled={!isPlaylistActive}
        title={!isPlaylistActive ? "برای افزودن، یک لیست پخش را فعال کنید" : (isInPlaylist ? "حذف از لیست پخش فعال" : "افزودن به لیست پخش فعال")}
        className={`absolute top-2 right-2 p-1.5 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 focus:opacity-100
            ${isInPlaylist ? 'bg-amber-500/80 text-white' : 'bg-zinc-900/50 text-zinc-200 hover:bg-sky-500'}
            disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-zinc-900/50`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            {isInPlaylist 
                ? <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                : <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            }
        </svg>
      </button>
    </div>
  );
};

export default ShotCard;