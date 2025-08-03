import React, { useState, useEffect, useMemo } from 'react';
import type { MediaFile } from '../App';

type MediaViewerProps = {
  shotId: string;
  imageFiles?: MediaFile[];
  videoFiles?: MediaFile[];
  coverUrl: string;
  onSetCover: (shotId: string, coverMediaName: string) => void;
};

const MediaViewer: React.FC<MediaViewerProps> = ({ shotId, imageFiles = [], videoFiles = [], coverUrl, onSetCover }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const mediaItems = useMemo(() => {
    const images = imageFiles.map(file => ({ type: 'image' as const, ...file }));
    const videos = videoFiles.map(file => ({ type: 'video' as const, ...file }));
    return [...images, ...videos];
  }, [imageFiles, videoFiles]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [mediaItems.length, shotId]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrevious();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen, currentIndex, mediaItems.length]);

  const goToPrevious = () => {
    const isFirst = currentIndex === 0;
    const newIndex = isFirst ? mediaItems.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const goToNext = () => {
    const isLast = currentIndex === mediaItems.length - 1;
    const newIndex = isLast ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  const currentItem = mediaItems[currentIndex];
  const isCurrentItemCover = currentItem?.url === coverUrl;

  const viewerContent = (
    <div className="relative w-full h-full flex items-center justify-center">
       {!currentItem && <div className="text-zinc-500">رسانه‌ای برای نمایش وجود ندارد.</div>}
       {currentItem?.type === 'image' && (
          <img 
            src={currentItem.url} 
            alt={`نمایش تصویر ${currentIndex + 1}: ${currentItem.name}`} 
            className="max-w-full max-h-full object-contain"
          />
        )}
        {currentItem?.type === 'video' && (
          <video 
            key={currentItem.url} 
            src={currentItem.url} 
            controls 
            autoPlay
            loop
            className="max-w-full max-h-full object-contain"
            aria-label={`پخش کننده ویدیو ${currentIndex + 1}: ${currentItem.name}`}
          >
            مرورگر شما از تگ ویدیو پشتیبانی نمی‌کند.
          </video>
        )}

      {mediaItems.length > 1 && (
        <>
          <button onClick={goToPrevious} className="absolute top-1/2 -translate-y-1/2 left-2 bg-black/40 text-white rounded-full p-2 hover:bg-black/70 transition-all z-10" aria-label="قبلی">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={goToNext} className="absolute top-1/2 -translate-y-1/2 right-2 bg-black/40 text-white rounded-full p-2 hover:bg-black/70 transition-all z-10" aria-label="بعدی">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
           <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs rounded-full px-3 py-1">
            {currentIndex + 1} / {mediaItems.length}
          </div>
        </>
      )}
    </div>
  );


  return (
    <div className={`bg-black rounded-lg overflow-hidden flex flex-col h-full w-full relative group/viewer`}>
        {viewerContent}
        
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover/viewer:opacity-100 transition-opacity duration-300">
            <button onClick={() => currentItem && onSetCover(shotId, currentItem.name)} disabled={!currentItem || isCurrentItemCover} title={isCurrentItemCover ? "این تصویر کاور است" : "تنظیم به عنوان کاور"} className="bg-black/40 text-white rounded-full p-2 hover:bg-black/70 transition-all z-10 disabled:opacity-50 disabled:cursor-not-allowed">
               <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isCurrentItemCover ? 'text-amber-400' : 'text-white'}`} viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
            <button onClick={() => setIsFullScreen(true)} className="bg-black/40 text-white rounded-full p-2 hover:bg-black/70 transition-all z-10" aria-label="تمام صفحه">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 1v4m0 0h-4m4 0l-5-5" /></svg>
            </button>
        </div>

        {isFullScreen && (
            <div className="fixed inset-0 bg-black z-40 flex flex-col items-center justify-center">
                 {viewerContent}
                 <button onClick={() => setIsFullScreen(false)} className="absolute top-4 right-4 bg-black/40 text-white rounded-full p-2 hover:bg-black/70 transition-all z-50" aria-label="خروج از تمام صفحه">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
            </div>
        )}
    </div>
  );
};

export default MediaViewer;
