import React from 'react';
import { Clock, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';

export default function SessionTimeoutWarningModal({
  isOpen,
  remainingSeconds,
  onExtendSession,
  onLogoutNow
}) {
  if (!isOpen) return null;

  const minutes = Math.floor(Math.max(0, remainingSeconds) / 60);
  const seconds = Math.max(0, remainingSeconds) % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-3xl max-w-sm w-full border border-blue-200 shadow-2xl p-6 sm:p-7 text-center relative overflow-hidden animate-scale-in"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-warning-title"
      >
        {/* Animated Top Pulse Badge */}
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-sm animate-pulse">
          <Clock className="w-8 h-8 text-blue-600" />
        </div>

        {/* Title */}
        <h3 id="session-warning-title" className="text-base font-extrabold text-slate-900 mb-1.5 tracking-tight">
          1-Hour Session Expiring
        </h3>
        
        {/* User Permission Description */}
        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          You have been signed in for <strong>1 hour</strong>. To keep beneficiary data protected, please confirm if you want to continue working.
        </p>

        {/* Countdown Timer */}
        <div className="mb-5 py-3 px-5 bg-gradient-to-b from-blue-50 to-indigo-50/50 border border-blue-200 rounded-2xl inline-block shadow-inner">
          <span className="font-mono text-3xl font-black text-blue-700 tracking-wider">
            {timeFormatted}
          </span>
          <span className="block text-[10.5px] uppercase font-bold text-blue-600 tracking-wider mt-0.5">
            Auto Logout If No Response
          </span>
        </div>

        {/* Action Buttons: Ask Permission */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onLogoutNow}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span>Log Out</span>
          </button>
          
          <button
            type="button"
            onClick={onExtendSession}
            className="w-full px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Continue Working</span>
          </button>
        </div>

        {/* Security Policy Footnote */}
        <p className="text-[10px] text-slate-400 mt-4 font-medium">
          If you are away or inactive, your session will automatically log out.
        </p>
      </div>
    </div>
  );
}
