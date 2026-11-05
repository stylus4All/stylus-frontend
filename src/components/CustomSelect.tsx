import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
};

const CustomSelect: React.FC<Props> = ({ options, value, onChange, className = '', placeholder = 'Select' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const [portalPos, setPortalPos] = useState<{ left: number; top: number; width: number } | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const toggleOpen = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPortalPos({ left: r.left, top: r.bottom, width: r.width });
    }
    setOpen(s => !s);
  };

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-[#1f0c05] border border-golden-orange/30 text-cream rounded-sm text-sm focus:outline-none focus:ring-0"
      >
        <span className="truncate">{value ?? placeholder}</span>
        <svg className="ml-2 w-3 h-3 text-golden-orange" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && portalPos && createPortal(
        <ul style={{ position: 'fixed', left: portalPos.left, top: portalPos.top, width: portalPos.width, zIndex: 9999 }} className="max-h-60 overflow-auto bg-[#1f0c05] border border-white/10 rounded-sm p-1 shadow-lg animate-pop-in">
          {options.map(opt => (
            <li key={opt}>
              <button
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-[#2a1508] ${opt === value ? 'bg-[#2a1508] font-bold' : 'text-cream/90'}`}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
};

export default CustomSelect;
