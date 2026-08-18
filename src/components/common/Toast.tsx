import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto p-3.5 rounded-lg shadow-lg border flex items-start justify-between gap-3 text-xs sm:text-sm animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === 'success'
              ? 'bg-slate-900 text-white border-slate-800'
              : toast.type === 'error'
              ? 'bg-rose-950 text-white border-rose-800'
              : 'bg-slate-900 text-white border-slate-800'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />}
            <div>
              <p className="font-bold text-xs">{toast.title}</p>
              {toast.message && <p className="text-slate-300 text-[11px] mt-0.5">{toast.message}</p>}
            </div>
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="text-slate-400 hover:text-white p-1 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
