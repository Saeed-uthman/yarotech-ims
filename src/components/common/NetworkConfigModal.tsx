import React, { useMemo, useState } from 'react';
import { Activity, CheckCircle2, RefreshCw, Server, Trash2, Wifi, WifiOff, X } from 'lucide-react';
import { apiCache } from '../../services/apiCache';


interface NetworkConfigModalProps {
  isOpen: boolean;
  isOnline: boolean;
  browserOnline: boolean;
  onClose: () => void;
  onRefresh: () => void;
}


export const NetworkConfigModal: React.FC<NetworkConfigModalProps> = ({
  isOpen,
  isOnline,
  browserOnline,
  onClose,
  onRefresh,
}) => {
  const [cacheCleared, setCacheCleared] = useState(false);
  const apiBaseUrl = useMemo(
    () => import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1',
    []
  );
  if (!isOpen) return null;

  const handleClearCache = () => {
    apiCache.clear();
    setCacheCleared(true);
    onRefresh();
    window.setTimeout(() => setCacheCleared(false), 2000);
  };

  const handleRefresh = () => {
    apiCache.clear();
    onRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">API Connection & Cache</h3>
              <p className="text-xs text-slate-500">Live Django REST API runtime information</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className={`rounded-lg border p-3 flex items-center gap-3 ${
            isOnline ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
          }`}>
            {isOnline ? (
              <Wifi className="w-5 h-5 text-emerald-600" />
            ) : (
              <WifiOff className="w-5 h-5 text-rose-600" />
            )}
            <div>
              <p className={`text-xs font-bold ${isOnline ? 'text-emerald-800' : 'text-rose-800'}`}>
                Django API: {isOnline ? 'Reachable' : 'Unavailable'}
              </p>
              <p className="text-[11px] text-slate-500">
                Browser network: {browserOnline ? 'available' : 'offline'}. Authenticated API requests use JWT automatically.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-700">Django API base URL</span>
            </div>
            <code className="block text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded p-2 break-all">
              {apiBaseUrl}
            </code>
          </div>

          <div className="rounded-lg border border-slate-200 p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-700">Client response cache</p>
              <p className="text-[11px] text-slate-500">Clear cached lists, dashboard cards, and reports.</p>
            </div>
            <button
              type="button"
              onClick={handleClearCache}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
            >
              {cacheCleared ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Trash2 className="w-3.5 h-3.5" />}
              {cacheCleared ? 'Cleared' : 'Clear'}
            </button>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh live data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
