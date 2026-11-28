import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  RefreshCw,
  Globe,
  Save,
  RotateCcw
} from 'lucide-react';
import { 
  fetchFromGoogleSheet, 
  pushAllToGoogleSheet,
  getGoogleScriptUrl,
  setGoogleScriptUrl
} from '../services/db';
import { DEFAULT_PRODUCTION_SCRIPT_URL } from '../config/backendConfig';
import { useApp } from '../context/AppContext';

export default function GoogleSheetModal({ 
  isOpen, 
  onClose, 
  onSyncComplete 
}) {
  const { refreshData } = useApp();
  const [urlInput, setUrlInput] = useState(() => getGoogleScriptUrl() || DEFAULT_PRODUCTION_SCRIPT_URL);
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  if (!isOpen) return null;

  const handleSaveAndSync = async () => {
    setTesting(true);
    setStatusMsg(null);
    try {
      const cleanUrl = urlInput.trim();
      setGoogleScriptUrl(cleanUrl);

      const apps = await fetchFromGoogleSheet();
      refreshData();
      setTesting(false);
      setStatusMsg({ 
        type: 'success', 
        text: `Successfully synced ${apps.length} applications from your Google Sheet cloud database!` 
      });
      if (onSyncComplete) onSyncComplete();
    } catch (e) {
      setTesting(false);
      setStatusMsg({ 
        type: 'error', 
        text: `Sync error: ${e.message}. Please verify the Web App URL and deployment access.` 
      });
    }
  };

  const handleResetDefaultUrl = () => {
    setUrlInput(DEFAULT_PRODUCTION_SCRIPT_URL);
    setGoogleScriptUrl(DEFAULT_PRODUCTION_SCRIPT_URL);
    setStatusMsg({
      type: 'info',
      text: 'Reset to default official production endpoint.'
    });
  };

  const handlePushAll = async () => {
    setTesting(true);
    setStatusMsg(null);
    try {
      await pushAllToGoogleSheet();
      setTesting(false);
      setStatusMsg({ type: 'success', text: 'All local records successfully uploaded to Google Sheet databases!' });
      if (onSyncComplete) onSyncComplete();
    } catch (e) {
      setTesting(false);
      setStatusMsg({ type: 'error', text: `Upload notice: ${e.message}` });
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0c1429] rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col border border-slate-700 shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 flex items-center justify-between bg-[#080D1A] shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">Cloud Database Sync</h2>
              <p className="text-xs text-slate-400 truncate">Google Sheets Web App Backend</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
          
          {/* Endpoint Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                Google Apps Script Web App URL
              </label>
              <button
                type="button"
                onClick={handleResetDefaultUrl}
                className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                title="Reset to default official URL"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Default</span>
              </button>
            </div>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-3.5 py-2.5 text-xs bg-[#080D1A] border border-slate-700 rounded-xl text-slate-200 font-mono focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Connects directly to your Google Spreadsheet via Google Apps Script.
            </p>
          </div>

          {statusMsg && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-fadeIn ${
              statusMsg.type === 'success' 
                ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300' 
                : statusMsg.type === 'info'
                ? 'bg-blue-950/40 border-blue-700/50 text-blue-300'
                : 'bg-rose-950/40 border-rose-700/50 text-rose-300'
            }`}>
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleSaveAndSync}
              disabled={testing}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Syncing...' : 'Sync Now from Cloud'}</span>
            </button>

            <button
              onClick={handlePushAll}
              disabled={testing}
              className="px-4 py-2.5 bg-[#080D1A] hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
              <span>Push Local to Cloud</span>
            </button>
          </div>

          {/* Managed Sheets Indicator */}
          <div className="bg-[#080D1A] border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 space-y-1.5">
            <span className="block font-bold text-white text-xs">
              Connected Cloud Sheets:
            </span>
            <div className="flex flex-wrap gap-1.5 text-[10.5px]">
              <span className="px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-700/40 font-medium">New_Card</span>
              <span className="px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700/40 font-medium">Card_Renewal</span>
              <span className="px-2 py-0.5 rounded bg-pink-900/40 text-pink-300 border border-pink-700/40 font-medium">Maternity_Benefit</span>
              <span className="px-2 py-0.5 rounded bg-rose-900/40 text-rose-300 border border-rose-700/40 font-medium">Marriage_Benefit</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium">Death_Benefit</span>
              <span className="px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-700/40 font-medium">Education_Assistance</span>
              <span className="px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-700/40 font-medium">Agents</span>
              <span className="px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-700/40 font-medium">Activity_Logs</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-800 bg-[#080D1A] flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
