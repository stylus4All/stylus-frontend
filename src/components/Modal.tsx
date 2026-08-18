import React, { useEffect, useRef } from 'react';
import { Button } from './Button';

type Props = {
  open: boolean;
  title?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  footer?: React.ReactNode;
};

const Modal: React.FC<Props> = ({ open, title, children, onClose, footer }) => {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    const focusableSelector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const focusable = panel ? Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter(el => !el.hasAttribute('disabled')) : [];

    // focus first focusable element or the panel itself
    if (focusable.length) {
      focusable[0].focus();
    } else if (panel) {
      panel.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose && onClose();
        return;
      }

      if (e.key === 'Tab' && panel) {
        const focusableInside = focusable;
        if (focusableInside.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusableInside[0];
        const last = focusableInside[focusableInside.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4" aria-hidden={!open}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-[10000] w-full max-w-2xl bg-[#1f0c05] border border-golden-orange rounded-sm shadow-lg overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-serif text-lg text-cream">{title}</h3>
          {/* <Button variant="outline" onClick={onClose} className="text-cream/60">Close</Button> */}
        </div>
        <div className="p-6 text-cream text-sm">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-white/5 bg-black/5">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
