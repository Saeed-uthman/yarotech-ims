import React, { useState } from 'react';
import { X, Activity, RefreshCw, Zap, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';
import { mockRepository } from '../../services/mockRepository';
import { apiCache } from '../../services/apiCache';

interface NetworkConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const NetworkConfigModal: React.FC<NetworkConfigModalProps> = ({
  isOpen,
  onClose,
  onRefresh,
}) => {
  const currentConfig = mockRepository.getConfig();
  const [minLatency, setMinLatency] = useState(currentConfig.simulatedLatencyMin);
  const [maxLatency, setMaxLatency] = useState(currentConfig.simulatedLatencyMax);
  const [errorRate, setErrorRate] = useState(currentConfig.simulatedErrorRate * 100);
  const [forceError, setForceError] = useState(currentConfig.forceNextError);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    mockRepository.setConfig({
      simulatedLatencyMin: Number(minLatency),
      simulatedLatencyMax: Number(maxLatency),
      simulatedErrorRate: Number(errorRate) / 100,
      forceNextError: forceError,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleClearCache = () => {
    apiCache.clear();
    onRefresh();
  };

  const handleResetFactory = () => {
    mockRepository.resetDatabase();
    apiCache.clear();
    setMinLatency(250);
    setMaxLatency(650);
    setErrorRate(0);
    setForceError(false);
    onRefresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Network & Repository Control</h3>
              <p className="text-xs text-slate-500">Simulate REST API latency and test rollback resilience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Latency Range */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Simulated Latency Range (ms)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Min Delay (ms)</span>
                <input
                  type="number"
                  min="0"
                  max="3000"
                  step="50"
                  value={minLatency}
                  onChange={(e) => setMinLatency(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Max Delay (ms)</span>
                <input
                  type="number"
                  min="0"
                  max="5000"
                  step="50"
                  value={maxLatency}
                  onChange={(e) => setMaxLatency(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setMinLatency(0);
                  setMaxLatency(0);
                }}
                className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
              >
                Instant (0ms)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMinLatency(250);
                  setMaxLatency(650);
                }}
                className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
              >
                Normal (250-650ms)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMinLatency(1000);
                  setMaxLatency(2000);
                }}
                className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
              >
                Slow 3G (1-2s)
              </button>
            </div>
          </div>

          {/* Test Error Injection */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Fault Injection & Rollback Testing
            </label>
            <label className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-md cursor-pointer">
              <input
                type="checkbox"
                checked={forceError}
                onChange={(e) => setForceError(e.target.checked)}
                className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-xs text-amber-900 font-medium">
                Force error on next API operation (test optimistic rollback)
              </span>
            </label>
          </div>

          {/* Cache Management */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-700">Client Memory Cache</p>
              <p className="text-[11px] text-slate-500">Clear in-flight deduplication and SWR store</p>
            </div>
            <button
              type="button"
              onClick={handleClearCache}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
            >
              Clear Cache
            </button>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetFactory}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
            >
              Reset Mock DB
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {isSaved ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Apply Settings</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
