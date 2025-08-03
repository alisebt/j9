
import React, { useState, useEffect } from 'react';

type ExportModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onExport: (selectedItems: Set<string>) => void;
    items: string[];
    title: string;
};

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport, items, title }) => {
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    useEffect(() => {
        // Reset selection when modal is opened
        if (isOpen) {
            setSelectedItems(new Set());
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const handleToggleItem = (item: string) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(item)) {
                newSet.delete(item);
            } else {
                newSet.add(item);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectedItems.size === items.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(items));
        }
    };
    
    const handleExportClick = () => {
        onExport(selectedItems);
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose} dir="rtl">
            <div className="bg-zinc-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-zinc-700">
                    <h2 className="text-xl font-bold text-sky-400">{title}</h2>
                </header>
                <div className="p-4 flex-grow overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                            <input
                                type="checkbox"
                                className="form-checkbox h-5 w-5 rounded bg-zinc-700 border-zinc-600 text-sky-500 focus:ring-sky-500"
                                checked={items.length > 0 && selectedItems.size === items.length}
                                onChange={handleSelectAll}
                            />
                            انتخاب همه
                        </label>
                        <span className="text-sm text-zinc-400">{selectedItems.size} / {items.length} انتخاب شده</span>
                    </div>
                    <div className="space-y-2">
                        {items.map(item => (
                            <label key={item} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-700/50 hover:bg-zinc-700 cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    className="form-checkbox h-5 w-5 rounded bg-zinc-600 border-zinc-500 text-sky-500 focus:ring-sky-500"
                                    checked={selectedItems.has(item)}
                                    onChange={() => handleToggleItem(item)}
                                />
                                <span className="text-zinc-200 truncate">{item}</span>
                            </label>
                        ))}
                         {items.length === 0 && <p className="text-zinc-500 text-center py-8">موردی برای نمایش وجود ندارد.</p>}
                    </div>
                </div>
                <footer className="p-4 border-t border-zinc-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-semibold transition-colors">
                        انصراف
                    </button>
                    <button onClick={handleExportClick} disabled={selectedItems.size === 0} className="px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-900 font-bold transition-colors disabled:bg-zinc-600 disabled:cursor-not-allowed">
                        خروجی گرفتن
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ExportModal;
