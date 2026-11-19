import React from 'react';
import { Clock, ShieldAlert, LogOut, RefreshCw } from 'lucide-react';

export default function SessionTimeoutWarningModal({
  isOpen,
  remainingSeconds,
  onExtendSession,
  onLogoutNow
}) {
  if (!isOpen) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-3xl max-w-sm w-full border border-amber-200 shadow-2xl p-6 text-center relative overflow-hidden animate-scale-in"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-warning-title"
      >
        {/* Warning Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-sm animate-pulse">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>

        {/* Title & Warning message */}
        <h3 id="session-warning-title" className="text-base font-bold text-slate-900 mb-1">
          Session Expiring Soon
        </h3>
        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          Due to <strong>13 minutes of inactivity</strong>, your secure session will automatically log out for data protection in:
        </p>

        {/* Large Countdown Clock */}
        <div className="mb-5 py-3 px-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl inline-block">
          <span className="font-mono text-3xl font-black text-amber-700 tracking-wider">
            {timeFormatted}
          </span>
          <span className="block text-[10px] uppercase font-bold text-amber-600 tracking-wider mt-0.5">
            Seconds Remaining
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onLogoutNow}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span>Log Out</span>
          </button>
          <button
            type="button"
            onClick={onExtendSession}
            className="w-full px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold transition-all shadow-sm shadow-blue-600/25 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Stay Signed In</span>
          </button>
        </div>

        {/* Security Rule Note */}
        <p className="text-[10px] text-slate-400 mt-4">
          Government compliance: 15-minute auto-timeout policy is active.
        </p>
      </div>
    </div>
  );
}
