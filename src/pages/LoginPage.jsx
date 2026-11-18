import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle,
  KeyRound
} from 'lucide-react';

export default function LoginPage() {
  const { isAuthenticated, handleLogin } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to dashboard or requested page
  const from = location.state?.from?.pathname || '/dashboard';
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both your Username and Password.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const res = handleLogin(username, password, rememberMe);
      setLoading(false);

      if (res.success) {
        navigate(from, { replace: true });
      } else {
        setError(res.error || 'Invalid credentials. Please verify your login details.');
      }
    }, 350);
  };

  return (
    <div className="min-h-screen bg-[#090e1a] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans select-none">
      
      {/* Subtle Ambient Background Gradients */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xl shadow-lg shadow-blue-500/25 border border-white/20">
            ଶ୍ର
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Shramik<span className="text-blue-500">Setu</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Odisha Nirman Shramik Management System
            </p>
          </div>
        </div>

        {/* Clean Login Card */}
        <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-2xl border border-slate-100">
          
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Sign In
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your credentials to access the portal
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">
                <span>{error}</span>
                <div className="mt-1">
                  <Link to="/admin-security" className="text-rose-800 font-bold underline hover:text-rose-950">
                    Reset via Security Portal →
                  </Link>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                  required
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Security Gate Link Row */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <span className="ml-2 text-xs text-slate-600">
                  Remember me
                </span>
              </label>

              <Link
                to="/admin-security"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                title="Admin Security & Password Reset"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Security Portal</span>
              </Link>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 transition-all shadow-md shadow-blue-600/20 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Minimal Clean Footer */}
        <p className="text-center text-[11px] text-slate-500">
          ShramikSetu • Private Operations Management System
        </p>

      </div>

    </div>
  );
}
