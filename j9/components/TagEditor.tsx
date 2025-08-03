
import React, { useState, useRef, useEffect } from 'react';

type TagEditorProps = {
  shotId: string;
  tags: string[];
  onAddTag: (shotId: string, tag: string) => void;
  onRemoveTag: (shotId: string, tag: string) => void;
  onRenameTag: (oldTag: string, newTag: string) => void;
};

const TagEditor: React.FC<TagEditorProps> = ({ shotId, tags, onAddTag, onRemoveTag, onRenameTag }) => {
  const [newTag, setNewTag] = useState('');
  const [editingTag, setEditingTag] = useState<{ old: string; current: string } | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const tagLimit = 20;

  useEffect(() => {
    if (editingTag && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingTag]);

  const handleAdd = () => {
    if (newTag.trim() && tags.length < tagLimit) {
      onAddTag(shotId, newTag);
      setNewTag('');
    }
  };

  const handleAddKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleStartEditing = (tag: string) => {
    setEditingTag({ old: tag, current: tag });
  };
  
  const handleCancelEditing = () => {
    setEditingTag(null);
  };

  const handleSaveRename = () => {
    if (editingTag) {
      const { old, current } = editingTag;
      const trimmedCurrent = current.trim();
      if (trimmedCurrent && trimmedCurrent.toLowerCase() !== old.toLowerCase()) {
        onRenameTag(old, trimmedCurrent);
      }
      setEditingTag(null);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      handleCancelEditing();
    }
  };

  return (
    <div className="bg-zinc-800/60 rounded-b-lg flex flex-col h-full overflow-hidden">
      <h2 className="text-xl font-bold p-4 border-b border-zinc-700/80 text-zinc-300 flex-shrink-0 flex justify-between items-center">
        <span>تگ‌ها</span>
        <span className="text-sm font-normal text-zinc-400">{tags.length} / {tagLimit}</span>
      </h2>
      <div className="flex-grow p-4 overflow-auto scroll-hidden bg-zinc-900/50">
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              editingTag?.old === tag ? (
                <input
                  key="editing-tag"
                  ref={editInputRef}
                  type="text"
                  value={editingTag.current}
                  onChange={e => setEditingTag({ ...editingTag, current: e.target.value })}
                  onBlur={handleSaveRename}
                  onKeyDown={handleEditKeyDown}
                  className="bg-zinc-600 text-zinc-100 text-sm font-medium px-2 py-1 rounded-md border border-sky-500 outline-none"
                />
              ) : (
              <span key={tag} className="group flex items-center bg-sky-800/70 text-sky-200 text-sm font-medium pl-2.5 rounded-full">
                {tag}
                <div className="flex items-center ml-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => handleStartEditing(tag)} title="تغییر نام تگ" className="p-0.5 text-sky-200 hover:text-white transition-colors">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                   </button>
                   <button onClick={() => onRemoveTag(shotId, tag)} title="حذف تگ" className="p-0.5 text-sky-200 hover:text-white transition-colors">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                   </button>
                </div>
              </span>
              )
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-center text-sm">هیچ تگی اضافه نشده است.</p>
        )}
      </div>
      <div className="p-4 border-t border-zinc-700/80 flex-shrink-0 bg-zinc-800/60">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={handleAddKeyDown}
            placeholder={tags.length < tagLimit ? "افزودن تگ..." : "محدودیت تگ پر شده"}
            disabled={tags.length >= tagLimit}
            className="flex-grow bg-zinc-700/50 text-zinc-200 placeholder-zinc-400 rounded-lg px-3 py-2 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500 transition disabled:opacity-50"
            aria-label="New tag input"
          />
          <button
            onClick={handleAdd}
            disabled={!newTag.trim() || tags.length >= tagLimit}
            className="px-4 py-2 bg-sky-500 text-zinc-900 font-bold rounded-lg hover:bg-sky-400 transition-all duration-300 disabled:bg-zinc-600 disabled:cursor-not-allowed"
          >
            افزودن
          </button>
        </div>
      </div>
    </div>
  );
};

export default TagEditor;
