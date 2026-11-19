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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl my-8 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Google Sheets Cloud Database</h2>
              <p className="text-xs text-slate-500">Managed Securely in Code Architecture</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          
          {/* Security Status Card */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-900">Cloud Backend Active & Locked</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-800">
                  <Lock className="w-2.5 h-2.5" /> Code Protected
                </span>
              </div>
              <p className="text-[11.5px] text-emerald-800 mt-1 leading-relaxed">
                Backend endpoint is hardcoded into the secure service layer. URL inputs are hidden from the UI to prevent unauthorized tampering.
              </p>
            </div>
          </div>

          {statusMsg && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-fadeIn ${
              statusMsg.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleSyncNow}
              disabled={testing}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Syncing...' : 'Sync Latest from Cloud'}</span>
            </button>

            <button
              onClick={handlePushAll}
              disabled={testing}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
              <span>Push All Local to Cloud</span>
            </button>
          </div>

          {/* Managed Sheets Indicator */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-1.5">
            <span className="block font-bold text-slate-900 text-xs">
              Connected Cloud Sheets:
            </span>
            <div className="flex flex-wrap gap-1.5 text-[10.5px]">
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">New_Card</span>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">Card_Renewal</span>
              <span className="px-2 py-0.5 rounded bg-pink-100 text-pink-800 font-medium">Maternity_Benefit</span>
              <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-medium">Death_Benefit</span>
              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-medium">Users</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">Completed_Archive</span>
              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-medium">Activity_Logs</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
