import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn" onClick={onClose}>
      <div 
        className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900 rounded-t-xl">
          <h3 className="text-xl font-serif font-bold text-white flex items-center gap-2">
            <i className="fa-solid fa-circle-question text-indigo-500"></i> {title}
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-800">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto text-sm text-zinc-300 space-y-4 leading-relaxed custom-scrollbar">
          {children}
        </div>
        
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 rounded-b-xl flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs uppercase tracking-wide transition-colors shadow-lg shadow-indigo-900/20"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};