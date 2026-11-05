import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

type Toast = { id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' };

type ToastContextType = {
  toast: (msg: string, type?: Toast['type']) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(t => [{ id, message, type }, ...t]);
    // auto remove
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3">
          {toasts.map(t => (
            <div key={t.id} className={`max-w-sm px-4 py-2 rounded shadow-lg text-sm animate-toast-in ${t.type === 'success' ? 'bg-green-600 text-white' : t.type === 'error' ? 'bg-red-600 text-white' : 'bg-[#1f0c05] text-cream'}`}>
              {t.message}
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
};

export default ToastProvider;
