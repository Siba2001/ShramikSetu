import React from 'react';
import { LogOut, X, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function LogoutConfirmModal() {
  const {
    isLogoutConfirmOpen,
    cancelLogout,
    handleLogout
  } = useApp();

  if (!isLogoutConfirmOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={cancelLogout}
    >
      <div
        className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl overflow-hidden relative animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={cancelLogout}
          className="absolute top-3.5 right-3.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Body */}
        <div className="p-6 text-center">

          {/* Warning Icon Badge */}
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <LogOut className="w-6 h-6 text-rose-600 translate-x-0.5" />
          </div>

          {/* Title & Subtitle */}
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Confirm Sign Out
          </h3>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            Are you sure you want to log out of ShramikSetu? Your active session on this device will be securely closed.
          </p>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={cancelLogout}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleLogout(true)}
              className="w-full px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold transition-all shadow-sm shadow-rose-600/25 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Yes, Sign Out</span>
            </button>
          </div>

        </div>

        {/* Footer Security Note */}
        <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Session credentials will be cleared securely</span>
        </div>

      </div>
    </div>
  );
}
