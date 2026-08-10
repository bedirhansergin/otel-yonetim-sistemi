import { useState } from 'react';
import { translateError } from '../lib/errorMessages';

interface ErrorDisplayProps {
  message: string;
  onClose?: () => void;
  variant?: 'inline' | 'modal';
}

export function ErrorDisplay({ message, onClose, variant = 'inline' }: ErrorDisplayProps) {
  const [showDetail, setShowDetail] = useState(false);
  const { friendly, systemError } = translateError(message);

  if (variant === 'modal') {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 px-4">
        <div className="w-full max-w-md rounded-3xl border-2 border-rose-500/40 bg-slate-900 p-6 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-rose-300">Hata</h3>
              <p className="mt-3 text-sm text-white leading-relaxed">{friendly}</p>
              {systemError && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowDetail(!showDetail)}
                    className="text-xs text-rose-300/70 underline hover:text-rose-300 transition"
                  >
                    {showDetail ? 'Hata Detayını Gizle' : 'Hata Detayı'}
                  </button>
                  {showDetail && (
                    <p className="mt-2 text-xs text-slate-400 bg-slate-800 rounded-xl p-3 font-mono break-all">
                      {systemError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border-2 border-slate-600 bg-white/5 px-5 py-2.5 text-sm text-white transition hover:bg-white/10"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
      <p className="text-sm text-red-200">{friendly}</p>
      {systemError && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowDetail(!showDetail)}
            className="text-xs text-red-300/70 underline hover:text-red-300 transition"
          >
            {showDetail ? 'Hata Detayını Gizle' : 'Hata Detayı'}
          </button>
          {showDetail && (
            <p className="mt-2 text-xs text-slate-400 bg-slate-800/50 rounded-xl p-3 font-mono break-all">
              {systemError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
