import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldAlert, ArrowRight, LogOut, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function SessionLockModal() {
  const { user, isTerminalLocked, unlockTerminal, handleLogout } = useApp();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isTerminalLocked) return null;

  const handleUnlock = (e) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter your password to unlock.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const res = unlockTerminal(password);
      setLoading(false);

      if (res.success) {
        setPassword('');
      } else {
        setError(res.error || 'Incorrect password.');
      }
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#060b17]/90 backdrop-blur-md flex items-center justify-center p-4 font-sans select-none animate-fade-in">
      
      <div className="w-full max-w-sm bg-white rounded-3xl p-7 sm:p-8 shadow-2xl border border-slate-200 text-center relative overflow-hidden">
        
        {/* Top Lock Badge */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mx-auto flex items-center justify-center text-amber-600 mb-4 shadow-inner">
          <Lock className="w-8 h-8 text-amber-600" />
        </div>

        {/* User Info */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold mb-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Terminal Locked</span>
          </div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            {user?.fullName || 'Operator'}
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            @{user?.username || 'admin'} • {user?.role || 'Staff'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="relative rounded-xl">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password to unlock"
              autoFocus
              required
              className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 transition-all shadow-md shadow-blue-600/20 cursor-pointer"
          >
            {loading ? (
              <span>Verifying Password...</span>
            ) : (
              <>
                <span>Resume Session</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Sign Out Option */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center">
          <button
            onClick={() => handleLogout()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out as different user</span>
          </button>
        </div>

      </div>

    </div>
  );
}
