import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import MediaViewer from './components/MediaViewer';
import PromptViewer from './components/JsonViewer';
import ShotCard from './components/ShotCard';
import TagEditor from './components/TagEditor';
import ExportModal from './components/ExportModal';
import {
  fetchPlaylists,
  fetchTags,
  createPlaylist as apiCreatePlaylist,
  deletePlaylist as apiDeletePlaylist,
  renamePlaylist as apiRenamePlaylist,
  addShotToPlaylist,
  removeShotFromPlaylist,
  addTag as apiAddTag,
  removeTag as apiRemoveTag,
  renameTag as apiRenameTag,
  saveDirectory
} from './api';

// Augment React's HTMLAttributes to include non-standard directory attributes
declare module 'react' {
  interface InputHTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

export type PromptFile = {
  name: string;
  content: string;
  type: 'json' | 'text';
};

export type MediaFile = {
    name: string;
    url: string;
};

export type Shot = {
  id: string;
  imageFiles: MediaFile[];
  videoFiles: MediaFile[];
  promptFiles: PromptFile[];
  coverUrl: string; // Blob URL for the cover image/video thumbnail
  coverType: 'image' | 'video' | 'none';
};

type Playlists = Record<string, string[]>;
type Tags = Record<string, string[]>;
type ShotCovers = Record<string, string>; // Maps shot.id to cover file name

const App: React.FC = () => {
    
  const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading from localStorage key “${key}”:`, error);
        return defaultValue;
    }
  };

  const [shots, setShots] = useState<Shot[]>([]);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  
  const [playlists, setPlaylists] = useState<Playlists>({});
  const [tags, setTags] = useState<Tags>({});
  const [shotCovers, setShotCovers] = useState<ShotCovers>(() => loadFromStorage('j9_shotCovers', {}));
  const [activePlaylistName, setActivePlaylistName] = useState<string | null>(() => loadFromStorage('j9_activePlaylistName', null));
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => loadFromStorage('j9_isSidebarOpen', true));

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [renamingPlaylist, setRenamingPlaylist] = useState<{ oldName: string; newName: string } | null>(null);
  const [exportModalState, setExportModalState] = useState<{ type: 'playlists' | 'tags' | null; isOpen: boolean }>({ type: null, isOpen: false });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importPlaylistsInputRef = useRef<HTMLInputElement>(null);
  const importTagsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [pl, tg] = await Promise.all([fetchPlaylists(), fetchTags()]);
        setPlaylists(pl);
        setTags(tg);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // Effect for saving state to localStorage
  useEffect(() => {
    try {
        window.localStorage.setItem('j9_playlists', JSON.stringify(playlists));
        window.localStorage.setItem('j9_tags', JSON.stringify(tags));
        window.localStorage.setItem('j9_shotCovers', JSON.stringify(shotCovers));
        window.localStorage.setItem('j9_activePlaylistName', JSON.stringify(activePlaylistName));
        window.localStorage.setItem('j9_isSidebarOpen', JSON.stringify(isSidebarOpen));
    } catch (error) {
        console.error("Failed to save state to localStorage:", error);
    }
  }, [playlists, tags, shotCovers, activePlaylistName, isSidebarOpen]);


  useEffect(() => {
    return () => {
      shots.forEach(shot => {
        shot.imageFiles.forEach(f => URL.revokeObjectURL(f.url));
        shot.videoFiles.forEach(f => URL.revokeObjectURL(f.url));
      });
    };
  }, [shots]);

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const rootDir = (files[0] as any).webkitRelativePath?.split('/')[0];
    if (rootDir) {
      try {
        await saveDirectory(rootDir);
      } catch (err) {
        console.error('Failed to save directory', err);
      }
    }

    setIsLoading(true);
    setError(null);
    setShots([]);
    setSelectedShot(null);
    setSelectedTags(new Set());

    try {
      const groupedFiles: Map<string, { imageFiles: File[]; videoFiles: File[]; promptFiles: File[] }> = new Map();
      
      for (const file of Array.from(files)) {
        const name = file.name.split('.').slice(0, -1).join('.');
        if (!name) continue;
        const extension = file.name.split('.').pop()?.toLowerCase() || "";
        if (!groupedFiles.has(name)) groupedFiles.set(name, { imageFiles: [], videoFiles: [], promptFiles: [] });
        const group = groupedFiles.get(name)!;

        if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'].includes(extension)) group.imageFiles.push(file);
        else if (['mp4', 'webm', 'ogv'].includes(extension)) group.videoFiles.push(file);
        else if (['json', 'txt'].includes(extension)) group.promptFiles.push(file);
      }
      
      const savedCovers = loadFromStorage<ShotCovers>('j9_shotCovers', {});

      const shotPromises = Array.from(groupedFiles.entries()).map(async ([id, fileGroup]): Promise<Shot | null> => {
        if (fileGroup.imageFiles.length === 0 && fileGroup.videoFiles.length === 0 && fileGroup.promptFiles.length === 0) return null;
        
        try {
          const promptFilePromises = fileGroup.promptFiles.map(async (promptFile): Promise<PromptFile> => {
            const content = await promptFile.text();
            const type = promptFile.name.endsWith('.json') ? 'json' : 'text';
            return { name: promptFile.name, content, type };
          });
          const loadedPromptFiles = await Promise.all(promptFilePromises);
          
          const imageFiles: MediaFile[] = fileGroup.imageFiles.map(f => ({ name: f.name, url: URL.createObjectURL(f) })).sort((a,b)=> a.name.localeCompare(b.name));
          const videoFiles: MediaFile[] = fileGroup.videoFiles.map(f => ({ name: f.name, url: URL.createObjectURL(f) })).sort((a,b)=> a.name.localeCompare(b.name));

          let coverUrl = '';
          let coverType: 'image' | 'video' | 'none' = 'none';
          const savedCoverName = savedCovers[id];
          const allMediaFiles = [...imageFiles, ...videoFiles];

          let coverFile: MediaFile | undefined;

          if (savedCoverName) {
            coverFile = allMediaFiles.find(f => f.name === savedCoverName);
          }

          // If saved cover is not found (e.g., file deleted) or not set, find a default
          if (!coverFile) {
            coverFile = imageFiles[0] || videoFiles[0];
          }

          if (coverFile) {
            coverUrl = coverFile.url;
            // Check if the determined coverFile is a video by checking its presence in videoFiles array
            coverType = videoFiles.some(vf => vf.url === coverFile!.url) ? 'video' : 'image';
          }

          return {
            id,
            imageFiles,
            videoFiles,
            promptFiles: loadedPromptFiles.sort((a,b) => a.name.localeCompare(b.name)),
            coverUrl,
            coverType
          };
        } catch (readError) {
          console.error(`Could not read file for shot ${id}:`, readError);
          return null;
        }
      });

      const loadedShots = (await Promise.all(shotPromises))
        .filter((s): s is Shot => s !== null)
        .sort((a, b) => a.id.localeCompare(b.id));
      
      setShots(loadedShots);
    } catch (err) {
      setError('خطا در بارگذاری پوشه. لطفاً دوباره تلاش کنید.');
      console.error(err);
    } finally {
      setIsLoading(false);
      if (event.target) event.target.value = '';
    }
  };
  
  const handleSelectDirectoryClick = () => fileInputRef.current?.click();
  const handleImportPlaylistsClick = () => importPlaylistsInputRef.current?.click();
  const handleImportTagsClick = () => importTagsInputRef.current?.click();
  
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    Object.values(tags).forEach(shotTags => {
        shotTags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [tags]);

  const filteredShots = useMemo(() => {
    const lowerCaseQuery = searchQuery.toLowerCase().trim();
    
    let shotsToFilter = shots;

    if (selectedTags.size > 0) {
        shotsToFilter = shotsToFilter.filter(shot => {
            const shotTags = tags[shot.id] || [];
            return Array.from(selectedTags).every(selectedTag => shotTags.includes(selectedTag));
        });
    }
    
    if (!lowerCaseQuery) return shotsToFilter;

    return shotsToFilter.filter(shot => {
        const shotTags = tags[shot.id] || [];
        const promptContent = shot.promptFiles.map(p => p.content).join(' ').toLowerCase();
        return shot.id.toLowerCase().includes(lowerCaseQuery) ||
               promptContent.includes(lowerCaseQuery) ||
               shotTags.some(tag => tag.toLowerCase().includes(lowerCaseQuery));
    });
  }, [shots, searchQuery, tags, selectedTags]);
  
  const activePlaylistShots = useMemo(() => {
    if (!activePlaylistName || !playlists[activePlaylistName]) return [];
    const shotIds = new Set(playlists[activePlaylistName]);
    return shots.filter(shot => shotIds.has(shot.id));
  }, [activePlaylistName, playlists, shots]);
  
  const isInPlaylist = useCallback((shotId: string) => {
    if (!activePlaylistName) return false;
    return playlists[activePlaylistName]?.includes(shotId) ?? false;
  }, [activePlaylistName, playlists]);

  const handleTogglePlaylist = useCallback(async (shotId: string) => {
    if (!activePlaylistName) {
        alert("لطفاً ابتدا یک لیست پخش را انتخاب یا ایجاد کنید.");
        return;
    }
    const currentList = playlists[activePlaylistName] ?? [];
    if (currentList.includes(shotId)) {
      await removeShotFromPlaylist(activePlaylistName, shotId);
    } else {
      await addShotToPlaylist(activePlaylistName, shotId);
    }
    setPlaylists(prev => {
        const current = prev[activePlaylistName] ?? [];
        const newPlaylists = { ...prev };
        if (current.includes(shotId)) {
            newPlaylists[activePlaylistName] = current.filter(id => id !== shotId);
        } else {
            newPlaylists[activePlaylistName] = [...current, shotId];
        }
        return newPlaylists;
    });
  }, [activePlaylistName, playlists]);

  const handleCreatePlaylist = async () => {
    const name = newPlaylistName.trim();
    if (name && !playlists[name]) {
      await apiCreatePlaylist(name);
      setPlaylists(prev => ({ ...prev, [name]: [] }));
      setActivePlaylistName(name);
      setNewPlaylistName('');
    } else if (name) {
      alert("یک لیست پخش با این نام از قبل وجود دارد.");
    }
  };

  const handleDeletePlaylist = async (nameToDelete: string) => {
    if (!window.confirm(`آیا از حذف لیست پخش «${nameToDelete}» مطمئن هستید؟`)) return;

    await apiDeletePlaylist(nameToDelete);

    setPlaylists(prev => {
        const newPlaylists = { ...prev };
        delete newPlaylists[nameToDelete];
        return newPlaylists;
    });

    if (activePlaylistName === nameToDelete) {
        const remainingNames = Object.keys(playlists).filter(k => k !== nameToDelete).sort();
        setActivePlaylistName(remainingNames.length > 0 ? remainingNames[0] : null);
    }
  };
  
  const handleSaveRenamePlaylist = async () => {
    if (!renamingPlaylist) return;
    const { oldName, newName } = renamingPlaylist;
    const trimmedNewName = newName.trim();

    if (trimmedNewName && trimmedNewName !== oldName && !playlists[trimmedNewName]) {
        await apiRenamePlaylist(oldName, trimmedNewName);
        setPlaylists(prev => {
            const newPlaylists = { ...prev };
            newPlaylists[trimmedNewName] = newPlaylists[oldName];
            delete newPlaylists[oldName];
            return newPlaylists;
        });
        if (activePlaylistName === oldName) {
            setActivePlaylistName(trimmedNewName);
        }
    } else if (trimmedNewName && trimmedNewName !== oldName) {
        alert("یک لیست پخش با این نام از قبل وجود دارد.");
    }
    setRenamingPlaylist(null);
  };

  const handlePlaylistFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const content = event.target?.result as string;
            const importedPlaylists: Playlists = JSON.parse(content);
            if (typeof importedPlaylists !== 'object' || importedPlaylists === null || Array.isArray(importedPlaylists)) {
                 throw new Error("Invalid playlist file format.");
            }
            
            const allImportedIds = new Set(Object.values(importedPlaylists).flat());
            const currentShotIds = new Set(shots.map(s => s.id));
            let missingCount = 0;
            allImportedIds.forEach(id => {
                if (!currentShotIds.has(id)) missingCount++;
            });

            if (missingCount > 0) {
                alert(`لیست‌های پخش وارد شدند، اما ${missingCount} مورد در پوشه رسانه فعلی یافت نشد. لطفاً از بارگذاری پوشه صحیح اطمینان حاصل کنید.`);
            } else {
                alert("لیست‌های پخش با موفقیت وارد شدند.");
            }
            
            setPlaylists(prev => ({...prev, ...importedPlaylists}));
            const firstPlaylistName = Object.keys(importedPlaylists)[0];
            if(firstPlaylistName) setActivePlaylistName(firstPlaylistName);

        } catch (err) {
            alert("خطا در خواندن یا تجزیه فایل. لطفاً از یک فایل خروجی معتبر استفاده کنید.");
            console.error(err);
        } finally {
             if(e.target) e.target.value = '';
        }
    };
    reader.readAsText(file);
  };
  
  const handleAddTag = useCallback(async (shotId: string, tag: string) => {
    const cleanTag = tag.trim();
    if (!cleanTag) return;
    const currentTags = tags[shotId] || [];

    if (currentTags.length >= 20) {
        alert("حداکثر 20 تگ برای هر مورد مجاز است.");
        return;
    }

    if (currentTags.map(t => t.toLowerCase()).includes(cleanTag.toLowerCase())) {
        alert(`تگ «${cleanTag}» از قبل برای این مورد وجود دارد.`);
        return;
    }

    await apiAddTag(shotId, cleanTag);
    setTags(prev => {
        const newTagsForShot = [...(prev[shotId] || []), cleanTag].sort();
        return { ...prev, [shotId]: newTagsForShot };
    });
  }, [tags]);

  const handleRemoveTag = useCallback(async (shotId: string, tagToRemove: string) => {
    await apiRemoveTag(shotId, tagToRemove);
    setTags(prev => {
      const newTags = (prev[shotId] || []).filter(t => t !== tagToRemove);
      const newTagsState = { ...prev };
      if (newTags.length > 0) {
        newTagsState[shotId] = newTags;
      } else {
        delete newTagsState[shotId];
      }
      return newTagsState;
    });
  }, []);
  
  const handleRenameTag = useCallback(async (oldTag: string, newTag: string) => {
    const cleanedNewTag = newTag.trim();
    if (!cleanedNewTag || oldTag.toLowerCase() === cleanedNewTag.toLowerCase()) return;

    await apiRenameTag(oldTag, cleanedNewTag);
    setTags(prevTags => {
      const newGlobalTags: Tags = {};
      for (const shotId in prevTags) {
        const shotTags = prevTags[shotId];
        const oldTagIndex = shotTags.findIndex(t => t.toLowerCase() === oldTag.toLowerCase());

        if (oldTagIndex !== -1) {
          const newTagExists = shotTags.some((t, i) => i !== oldTagIndex && t.toLowerCase() === cleanedNewTag.toLowerCase());

          if (newTagExists) {
            newGlobalTags[shotId] = shotTags.filter(t => t.toLowerCase() !== oldTag.toLowerCase());
          } else {
            const updatedTags = [...shotTags];
            updatedTags[oldTagIndex] = cleanedNewTag;
            newGlobalTags[shotId] = updatedTags.sort();
          }
        } else {
          newGlobalTags[shotId] = shotTags;
        }
      }
      return newGlobalTags;
    });
  }, []);

  const handleTagFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("وارد کردن فایل، تگ‌های موجود را با تگ‌های جدید ادغام می‌کند. آیا مطمئن هستید؟")) {
      if(e.target) e.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const importedTags: Tags = JSON.parse(content);
        if (typeof importedTags !== 'object' || importedTags === null || Array.isArray(importedTags)) {
          throw new Error("Invalid tags file format.");
        }
        setTags(prev => ({...prev, ...importedTags}));
        alert("تگ‌ها با موفقیت وارد و ادغام شدند.");
      } catch (err) {
        alert("خطا در خواندن یا تجزیه فایل تگ. لطفاً از یک فایل معتبر استفاده کنید.");
        console.error(err);
      } finally {
        if(e.target) e.target.value = '';
      }
    };
    reader.readAsText(file);
  };
  
  const handleTagFilterClick = (tag: string) => {
    setSelectedTags(prev => {
        const newSet = new Set(prev);
        if (newSet.has(tag)) {
            newSet.delete(tag);
        } else {
            newSet.add(tag);
        }
        return newSet;
    });
  };

  const handleOpenExportModal = (type: 'playlists' | 'tags') => {
    if (type === 'playlists' && Object.keys(playlists).length === 0) {
        alert("هیچ لیست پخشی برای خروجی گرفتن وجود ندارد.");
        return;
    }
    if (type === 'tags' && allTags.length === 0) {
        alert("هیچ تگی برای خروجی گرفتن وجود ندارد.");
        return;
    }
    setExportModalState({ type, isOpen: true });
  };

  const handlePerformExport = (itemsToExport: Set<string>) => {
    const { type } = exportModalState;
    if (!type || itemsToExport.size === 0) {
        alert("هیچ موردی برای خروجی گرفتن انتخاب نشده است.");
        return;
    }

    let dataToExport: any;
    let fileName: string;

    if (type === 'playlists') {
        const exportedPlaylists: Playlists = {};
        itemsToExport.forEach(name => {
            if (playlists[name]) {
                exportedPlaylists[name] = playlists[name];
            }
        });
        dataToExport = exportedPlaylists;
        fileName = 'J9-playlists-selection.json';
    } else { // type === 'tags'
        const exportedTags: Tags = {};
        const relevantShotIds = new Set<string>();
        Object.entries(tags).forEach(([shotId, shotTags]) => {
            if (shotTags.some(tag => itemsToExport.has(tag))) {
                relevantShotIds.add(shotId);
            }
        });
        
        relevantShotIds.forEach(shotId => {
            if(tags[shotId]) {
               exportedTags[shotId] = tags[shotId];
            }
        });

        dataToExport = exportedTags;
        fileName = 'J9-tags-content-selection.json';
    }
    
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    setExportModalState({ type: null, isOpen: false });
  };

  const handleSetCover = useCallback((shotId: string, coverMediaName: string) => {
    const shot = shots.find(s => s.id === shotId);
    if (!shot) return;
    
    const mediaFile = [...shot.imageFiles, ...shot.videoFiles].find(f => f.name === coverMediaName);
    if (!mediaFile) return;

    const newCoverType = shot.videoFiles.some(vf => vf.name === coverMediaName) ? 'video' : 'image';

    // Persist the file name for future sessions
    setShotCovers(prev => ({...prev, [shotId]: coverMediaName}));
    
    // Update the coverUrl and coverType in the main shots state for immediate UI refresh
    setShots(prevShots => prevShots.map(s => 
        s.id === shotId ? { ...s, coverUrl: mediaFile.url, coverType: newCoverType } : s
    ));
    // Also update the selectedShot if it's the one being changed
    setSelectedShot(prevSelected => prevSelected?.id === shotId ? {...prevSelected, coverUrl: mediaFile.url, coverType: newCoverType} : prevSelected);

  }, [shots]);


  return (
    <div className="flex h-screen bg-zinc-900 text-zinc-200 overflow-hidden">
        <aside className={`flex-shrink-0 flex flex-col bg-zinc-800/50 border-l border-zinc-700/80 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-80' : 'w-0'}`}>
            <div className="w-80 h-full flex flex-col overflow-hidden">
                <div className="p-4 border-b border-zinc-700/80">
                    <h2 className="text-xl font-bold text-sky-400 mb-4">مدیریت</h2>
                    <button
                      onClick={handleSelectDirectoryClick}
                      disabled={isLoading}
                      className="w-full mb-4 px-4 py-2 bg-sky-500 text-zinc-900 font-bold rounded-lg hover:bg-sky-400 transition-all duration-300 disabled:bg-zinc-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoading ? 'در حال بارگذاری...' : 'انتخاب یا تغییر پوشه'}
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleImportPlaylistsClick} title="ورود لیست‌های پخش" className="p-2 text-sm bg-zinc-700/50 hover:bg-zinc-700 rounded-md transition-colors">ورود لیست پخش</button>
                        <button onClick={() => handleOpenExportModal('playlists')} title="خروج لیست‌های پخش" className="p-2 text-sm bg-zinc-700/50 hover:bg-zinc-700 rounded-md transition-colors">خروج لیست پخش</button>
                        <button onClick={handleImportTagsClick} title="ورود تگ‌ها" className="p-2 text-sm bg-zinc-700/50 hover:bg-zinc-700 rounded-md transition-colors">ورود تگ‌ها</button>
                        <button onClick={() => handleOpenExportModal('tags')} title="خروج تگ‌ها" className="p-2 text-sm bg-zinc-700/50 hover:bg-zinc-700 rounded-md transition-colors">خروج تگ‌ها</button>
                    </div>
                </div>
                
                <div className="p-4 border-b border-zinc-700/80 flex flex-col min-h-[30%]">
                    <h2 className="text-xl font-bold text-sky-400 mb-3">لیست‌های پخش</h2>
                    <div className="flex gap-2 mb-4">
                      <input type="text" value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreatePlaylist()} placeholder="نام لیست پخش جدید..." className="flex-grow bg-zinc-700/50 text-zinc-200 placeholder-zinc-400 rounded-lg px-3 py-2 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"/>
                      <button onClick={handleCreatePlaylist} disabled={!newPlaylistName.trim()} className="px-4 py-2 bg-sky-500 text-zinc-900 font-bold rounded-lg hover:bg-sky-400 transition-all duration-300 disabled:bg-zinc-600 disabled:cursor-not-allowed">ایجاد</button>
                    </div>
                    <div className="flex-grow overflow-y-auto scroll-hidden -mr-2 pr-2 space-y-1">
                      {Object.keys(playlists).sort().map(name => (
                        renamingPlaylist?.oldName === name ? (
                          <div key={name} className="flex gap-2">
                            <input type="text" value={renamingPlaylist.newName} onChange={e => setRenamingPlaylist({...renamingPlaylist, newName: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleSaveRenamePlaylist()} onBlur={handleSaveRenamePlaylist} autoFocus className="flex-grow bg-zinc-600 text-zinc-100 rounded-md px-3 py-2 border border-sky-500 outline-none"/>
                            <button onClick={handleSaveRenamePlaylist} className="px-3 bg-sky-500 text-zinc-900 rounded-md hover:bg-sky-400">ذخیره</button>
                          </div>
                        ) : (
                          <div key={name} className={`group flex items-center justify-between rounded-md transition-colors ${activePlaylistName === name ? 'bg-sky-500/20' : 'hover:bg-zinc-700/50'}`}>
                              <button onClick={() => setActivePlaylistName(name)} className={`flex-grow text-right px-3 py-2 truncate ${activePlaylistName === name ? 'text-sky-300 font-semibold' : 'text-zinc-300'}`}>
                                  {name}
                              </button>
                              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                                  <button onClick={() => setRenamingPlaylist({ oldName: name, newName: name })} title="تغییر نام" className="p-1 text-zinc-400 hover:text-sky-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg></button>
                                  <button onClick={() => handleDeletePlaylist(name)} title="حذف" className="p-1 text-zinc-400 hover:text-red-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                              </div>
                          </div>
                        )
                      ))}
                      {Object.keys(playlists).length === 0 && <p className="text-zinc-500 text-center text-sm py-4">برای شروع یک لیست پخش ایجاد کنید.</p>}
                    </div>
                </div>
                
                <div className="p-4 border-b border-zinc-700/80 flex flex-col flex-grow min-h-0">
                    <h2 className="text-xl font-bold text-sky-400 mb-3">فیلتر با تگ</h2>
                    <div className="flex-grow overflow-y-auto scroll-hidden -mr-2 pr-2">
                      {allTags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {allTags.map(tag => (
                            <button key={tag} onClick={() => handleTagFilterClick(tag)} className={`px-3 py-1 text-sm font-medium rounded-full border transition-colors ${selectedTags.has(tag) ? 'bg-sky-500 border-sky-500 text-zinc-900' : 'bg-zinc-700/60 border-zinc-600 hover:bg-zinc-700 hover:border-zinc-500 text-zinc-300'}`}>
                                {tag}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-zinc-500 text-center text-sm py-4">هیچ تگی برای فیلتر کردن وجود ندارد.</p>
                      )}
                    </div>
                </div>

                <div className="overflow-y-auto scroll-hidden p-2 border-t border-zinc-700/80 min-h-[20%]">
                   <h3 className="font-semibold text-zinc-400 px-2 pt-2 pb-1 text-sm">محتوای «{activePlaylistName || '...'}»</h3>
                   {activePlaylistShots.map(shot => (
                    <div key={shot.id} onClick={() => setSelectedShot(shot)} className="flex items-center gap-3 p-2 rounded-md hover:bg-zinc-700/50 cursor-pointer">
                      <ShotCard key={`${shot.id}-playlist`} shot={shot} onSelect={() => {}} onTogglePlaylist={() => {}} isInPlaylist={false} isPlaylistActive={false} />
                      <span className="flex-grow truncate text-sm">{shot.id}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleTogglePlaylist(shot.id);}} title="حذف از لیست پخش" className="text-red-400 hover:text-red-300 p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                      </button>
                    </div>
                  ))}
                  {activePlaylistName && activePlaylistShots.length === 0 && <p className="text-zinc-500 text-center p-4">این لیست پخش خالی است.</p>}
                  {!activePlaylistName && <p className="text-zinc-500 text-center p-4">یک لیست پخش را برای دیدن محتوای آن انتخاب کنید.</p>}
                </div>
            </div>
        </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 bg-sky-500/80 hover:bg-sky-500 text-white rounded-full p-2 z-30 transition-transform hover:scale-110" title={isSidebarOpen ? "بستن پنل" : "باز کردن پنل"}>
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 transition-transform duration-300 ${isSidebarOpen ? '' : 'rotate-180'}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        {selectedShot ? (
          <div className="flex-1 flex flex-col min-h-0">
            <header className="p-4 flex items-center justify-between bg-zinc-800/50 border-b border-zinc-700/80 flex-shrink-0">
              <button onClick={() => setSelectedShot(null)} className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-zinc-700 transition-colors">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                بازگشت به گالری
              </button>
              <h1 className="text-xl font-bold text-sky-400 truncate px-4">{selectedShot.id}</h1>
              <button onClick={() => handleTogglePlaylist(selectedShot.id)} disabled={!activePlaylistName} title={!activePlaylistName ? "ابتدا یک لیست پخش فعال انتخاب کنید" : (isInPlaylist(selectedShot.id) ? `حذف از «${activePlaylistName}»` : `افزودن به «${activePlaylistName}»`)} className={`flex items-center gap-2 px-3 py-1 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isInPlaylist(selectedShot.id) ? 'bg-amber-500/80 hover:bg-amber-500 text-white' : 'hover:bg-zinc-700'}`}>
                {isInPlaylist(selectedShot.id) ? 'حذف از لیست پخش' : 'افزودن به لیست پخش'}
              </button>
            </header>
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 xl:grid-cols-3 gap-1 p-1 overflow-hidden">
              <div className="lg:col-span-3 xl:col-span-2 bg-black rounded-lg min-h-0">
                <MediaViewer 
                  key={selectedShot.id}
                  shotId={selectedShot.id}
                  imageFiles={selectedShot.imageFiles} 
                  videoFiles={selectedShot.videoFiles}
                  coverUrl={selectedShot.coverUrl}
                  onSetCover={handleSetCover}
                />
              </div>
              <div className="lg:col-span-2 xl:col-span-1 bg-zinc-800/60 rounded-lg flex flex-col overflow-hidden min-h-0">
                <div className="flex-[3_3_0%] min-h-0"><PromptViewer promptFiles={selectedShot.promptFiles} /></div>
                <div className="flex-[2_2_0%] min-h-0"><TagEditor shotId={selectedShot.id} tags={tags[selectedShot.id] || []} onAddTag={handleAddTag} onRemoveTag={handleRemoveTag} onRenameTag={handleRenameTag} /></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="p-4 bg-zinc-800/50 border-b border-zinc-700/80">
              <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="جستجو در نام‌ها، پرامپت‌ها و تگ‌ها..." className="w-full bg-zinc-700/50 text-zinc-200 placeholder-zinc-400 rounded-lg px-4 py-2 border border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition" />
            </header>
            <div className="flex-1 overflow-y-auto p-4">
              {shots.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                    {filteredShots.map(shot => (
                      <ShotCard key={shot.id} shot={shot} onSelect={() => setSelectedShot(shot)} onTogglePlaylist={() => handleTogglePlaylist(shot.id)} isInPlaylist={isInPlaylist(shot.id)} isPlaylistActive={!!activePlaylistName}/>
                    ))}
                  </div>
                  {(filteredShots.length === 0 && (searchQuery || selectedTags.size > 0)) && <p className="text-center text-zinc-500 mt-8">هیچ موردی با فیلترهای شما مطابقت ندارد.</p>}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <h1 className="text-3xl font-bold text-sky-400 mb-4">به J9 خوش آمدید</h1>
                  <p className="text-zinc-400 mb-8 max-w-md">برای شروع، پوشه‌ای حاوی فایل‌های رسانه (jpg, png, mp4...) و پرامپت‌ها (txt, json) خود را انتخاب کنید.</p>
                  <button
                      onClick={handleSelectDirectoryClick}
                      disabled={isLoading}
                      className="px-6 py-3 bg-sky-500 text-zinc-900 font-bold rounded-lg hover:bg-sky-400 transition-all duration-300 disabled:bg-zinc-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                    >
                      {isLoading ? 'در حال بارگذاری...' : 'انتخاب پوشه'}
                    </button>
                  {error && <p className="text-red-400 mt-4 mb-4">{error}</p>}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <input type="file" ref={fileInputRef} onChange={handleFilesSelected} className="hidden" webkitdirectory="" directory="" multiple />
      <input type="file" ref={importPlaylistsInputRef} onChange={handlePlaylistFileSelected} className="hidden" accept=".json" />
      <input type="file" ref={importTagsInputRef} onChange={handleTagFileSelected} className="hidden" accept=".json" />
      
      <ExportModal 
        isOpen={exportModalState.isOpen}
        onClose={() => setExportModalState({ type: null, isOpen: false })}
        onExport={handlePerformExport}
        items={exportModalState.type === 'playlists' ? Object.keys(playlists).sort() : allTags}
        title={exportModalState.type === 'playlists' ? "انتخاب لیست‌های پخش برای خروجی" : "انتخاب تگ‌ها برای خروجی"}
      />
    </div>
  );
};

export default App;