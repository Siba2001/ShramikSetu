import React, { useState } from 'react';
import { 
  X, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  ArrowUpRight, 
  RefreshCw,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { 
  fetchFromGoogleSheet, 
  pushAllToGoogleSheet 
} from '../services/db';

export default function GoogleSheetModal({ 
  isOpen, 
  onClose, 
  onSyncComplete 
}) {
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  if (!isOpen) return null;

  const handleSyncNow = async () => {
    setTesting(true);
    setStatusMsg(null);
    try {
      const apps = await fetchFromGoogleSheet();
      setTesting(false);
      setStatusMsg({ 
        type: 'success', 
        text: `Cloud sync successful! Synced ${apps.length} records across your Google Sheet module databases.` 
      });
      if (onSyncComplete) onSyncComplete();
    } catch (e) {
      setTesting(false);
      setStatusMsg({ 
        type: 'error', 
        text: `Sync notice: ${e.message}. Please verify Google Sheet deployment.` 
      });
    }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-[#0c1429] rounded-2xl max-w-lg w-full border border-slate-700 shadow-2xl my-8 overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#080D1A]">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Google Sheets Cloud Database</h2>
              <p className="text-xs text-slate-400">Managed Securely in Code Architecture</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          
          {/* Security Status Card */}
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-700/50 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-300">Cloud Backend Active & Locked</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-900/50 text-emerald-300 border border-emerald-700/50">
                  <Lock className="w-2.5 h-2.5" /> Code Protected
                </span>
              </div>
              <p className="text-[11.5px] text-emerald-200/90 mt-1 leading-relaxed">
                Backend endpoint is hardcoded into the secure service layer. URL inputs are hidden from the UI to prevent unauthorized tampering.
              </p>
            </div>
          </div>

          {statusMsg && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-fadeIn ${
              statusMsg.type === 'success' 
                ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300' 
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
              onClick={handleSyncNow}
              disabled={testing}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Syncing...' : 'Sync Latest from Cloud'}</span>
            </button>

            <button
              onClick={handlePushAll}
              disabled={testing}
              className="px-4 py-2.5 bg-[#080D1A] hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
              <span>Push All Local to Cloud</span>
            </button>
          </div>

          {/* Managed Sheets Indicator */}
          <div className="bg-[#080D1A] border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 space-y-1.5">
            <span className="block font-bold text-white text-xs">
              Connected Cloud Sheets:
            </span>
            <div className="flex flex-wrap gap-1.5 text-[10.5px]">
              <span className="px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-700/40 font-medium">New_Card</span>
              <span className="px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-700/40 font-medium">Card_Renewal</span>
              <span className="px-2 py-0.5 rounded bg-pink-900/40 text-pink-300 border border-pink-700/40 font-medium">Maternity_Benefit</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium">Death_Benefit</span>
              <span className="px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-700/40 font-medium">Users</span>
              <span className="px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-700/40 font-medium">Activity_Logs</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-[#080D1A] flex items-center justify-end">
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
}
