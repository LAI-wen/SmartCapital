import React, { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ToastMessage {
  id: number;
  message: string;
  status: number;
}

let _addToast: ((msg: Omit<ToastMessage, 'id'>) => void) | null = null;

export function showApiError(status: number, message: string): void {
  _addToast?.({ status, message });
}

const ErrorToast: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    _addToast = (msg) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, ...msg }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    };
    return () => { _addToast = null; };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-md max-w-sm"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-sm flex-1">
            {toast.status === 403 && '沒有權限執行此操作'}
            {toast.status === 0 && '網路連線失敗，請稍後再試'}
            {toast.status >= 500 && '伺服器發生錯誤，請稍後再試'}
            {toast.status > 0 && toast.status < 500 && toast.status !== 403 && toast.message}
          </span>
          <button
            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            className="shrink-0 text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ErrorToast;
