import React, { useState, useEffect } from 'react';
import type { PromptFile } from '../App';

type PromptViewerProps = {
  promptFiles: PromptFile[];
};

const HighlightedJson: React.FC<{ jsonString: string }> = ({ jsonString }) => {
  const highlight = (json: string) => {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      let cls = 'text-green-400'; // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'text-sky-400'; // key
        } else {
          cls = 'text-amber-400'; // string
        }
      } else if (/true|false/.test(match)) {
        cls = 'text-violet-400'; // boolean
      } else if (/null/.test(match)) {
        cls = 'text-zinc-500'; // null
      }
      return `<span class="${cls}">${match}</span>`;
    });
  };
  
  try {
    const parsedJson = JSON.parse(jsonString);
    const formattedJson = JSON.stringify(parsedJson, null, 2);
    const highlightedHtml = highlight(formattedJson);
    return (
        <pre className="text-sm text-left leading-relaxed whitespace-pre-wrap break-words" dir="ltr">
            <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
        </pre>
    );
  } catch (e) {
     return <pre className="text-sm text-red-400 text-left" dir="ltr">خطا در تجزیه JSON: {e instanceof Error ? e.message : 'Invalid JSON'}</pre>;
  }
};

const detectDirection = (text: string): 'rtl' | 'ltr' => {
    const persianRegex = /[\u0600-\u06FF]/;
    return persianRegex.test(text) ? 'rtl' : 'ltr';
};

const PromptViewer: React.FC<PromptViewerProps> = ({ promptFiles }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [promptFiles]);

  const activePrompt = promptFiles?.[activeIndex];

  return (
    <div className="bg-zinc-800/60 rounded-lg flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 border-b border-zinc-700/80">
        {promptFiles.length > 1 ? (
            <div className="p-2 flex gap-2 overflow-x-auto scroll-hidden">
                {promptFiles.map((file, index) => (
                    <button 
                        key={index} 
                        onClick={() => setActiveIndex(index)}
                        className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors flex-shrink-0 ${activeIndex === index ? 'bg-sky-500/20 text-sky-300' : 'text-zinc-400 hover:bg-zinc-700/50'}`}
                    >
                        {file.name}
                    </button>
                ))}
            </div>
        ) : (
             <h2 className="text-xl font-bold p-4 text-zinc-300 truncate">
                {promptFiles[0]?.name || 'پرامپت'}
             </h2>
        )}
      </div>
      
      <div className="flex-grow p-4 overflow-auto scroll-hidden bg-zinc-900/50 rounded-b-lg">
        {!activePrompt && <p className="text-zinc-500">فایل پرامپتی برای نمایش وجود ندارد.</p>}
        {activePrompt?.type === 'json' ? (
            <HighlightedJson jsonString={activePrompt.content} />
        ) : (
            activePrompt && <pre className="text-sm leading-relaxed whitespace-pre-wrap break-words text-zinc-300" dir={detectDirection(activePrompt.content)}>
                {activePrompt.content}
            </pre>
        )}
      </div>
    </div>
  );
};

export default PromptViewer;