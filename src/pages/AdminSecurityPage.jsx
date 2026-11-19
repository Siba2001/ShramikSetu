import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  UserPlus, 
  Users, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  User, 
  Mail, 
  Building2,
  ExternalLink,
  History,
  Download
} from 'lucide-react';
import { 
  getSystemAccounts, 
  verifyMasterKey, 
  updateUserPassword, 
  createSystemAccount, 
  deleteSystemAccount,
  getAuditLogs,
  clearAuditLogs,
  DEFAULT_MASTER_TOKEN 
} from '../services/auth';

export default function AdminSecurityPage() {
  const navigate = useNavigate();

  // Gate state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [masterKey, setMasterKey] = useState('');
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [gateError, setGateError] = useState('');
  const [gateLoading, setGateLoading] = useState(false);

  // Management State
  const [activeTab, setActiveTab] = useState('reset'); // 'reset' | 'create' | 'accounts' | 'logs'
  const [accounts, setAccounts] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [notification, setNotification] = useState(null);

  // Tab 1: Reset Password State
  const [resetTargetUser, setResetTargetUser] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Tab 2: Create Account State
  const [newUser, setNewUser] = useState({
    username: '',
    fullName: '',
    role: 'Administrator (Full Access)',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Load accounts when gate opens
  const refreshAccounts = () => {
    const list = getSystemAccounts();
    setAccounts(list);
    setSecurityLogs(getAuditLogs());
    if (!resetTargetUser && list.length > 0) {
      setResetTargetUser(list[0].username);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      refreshAccounts();
    }
  }, [isUnlocked]);

  const showNotify = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // 1. Handle Gate Authentication
  const handleGateSubmit = (e) => {
    e.preventDefault();
    setGateError('');

    if (!masterKey.trim()) {
      setGateError('Please enter the Master Security Token or Admin Password.');
      return;
    }

    setGateLoading(true);
    setTimeout(() => {
      const ok = verifyMasterKey(masterKey);
      setGateLoading(false);

      if (ok) {
        setIsUnlocked(true);
      } else {
        setGateError('Invalid Master Token or Admin Password. Access Denied.');
      }
    }, 350);
  };

  // 2. Handle Reset Password Submit
  const handleResetSubmit = (e) => {
    e.preventDefault();

    if (!resetTargetUser) {
      showNotify('error', 'Please select a target user account.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      showNotify('error', 'New password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotify('error', 'Passwords do not match. Please verify.');
      return;
    }

    setResetLoading(true);
    setTimeout(() => {
      const res = updateUserPassword(resetTargetUser, newPassword);
      setResetLoading(false);

      if (res.success) {
        showNotify('success', `Password for user "${resetTargetUser}" has been successfully updated.`);
        setNewPassword('');
        setConfirmPassword('');
        refreshAccounts();
      } else {
        showNotify('error', res.error || 'Failed to update password.');
      }
    }, 300);
  };

  // 3. Handle Create Account Submit
  const handleCreateSubmit = (e) => {
    e.preventDefault();

    if (!newUser.username.trim() || !newUser.fullName.trim()) {
      showNotify('error', 'User ID and Full Name are required.');
      return;
    }
    if (!newUser.password || newUser.password.length < 4) {
      showNotify('error', 'Password must be at least 4 characters long.');
      return;
    }
    if (newUser.password !== newUser.confirmPassword) {
      showNotify('error', 'Passwords do not match. Please verify.');
      return;
    }

    setCreateLoading(true);
    setTimeout(() => {
      const res = createSystemAccount({
        username: newUser.username,
        fullName: newUser.fullName,
        role: newUser.role,
        email: newUser.email,
        password: newUser.password
      });
      setCreateLoading(false);

      if (res.success) {
        showNotify('success', `New account @${newUser.username} provisioned successfully!`);
        setNewUser({
          username: '',
          fullName: '',
          role: 'Administrator (Full Access)',
          email: '',
          password: '',
          confirmPassword: ''
        });
        refreshAccounts();
        setActiveTab('accounts');
      } else {
        showNotify('error', res.error || 'Failed to create user account.');
      }
    }, 300);
  };

  // 4. Handle Delete Account
  const handleDeleteAccount = (username) => {
    if (window.confirm(`Are you sure you want to delete system account @${username}?`)) {
      const res = deleteSystemAccount(username);
      if (res.success) {
        showNotify('info', `Account @${username} removed.`);
        refreshAccounts();
      } else {
        showNotify('error', res.error || 'Failed to delete account.');
      }
    }
  };

  // ==========================================
  // VIEW 1: MASTER SECURITY GATE (LOCKED)
  // ==========================================
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#070d1e] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans select-none">
        
        {/* Subtle grid pattern background */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none" 
          style={{
            backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px)',
            backgroundSize: '28px 28px'
          }}
        />

        {/* Ambient Glows */}
        <div className="absolute top-1/4 -left-32 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          
          {/* Main Card matching Divy-Impex image */}
          <div className="bg-[#0e1a38] rounded-3xl border border-slate-700/60 shadow-2xl overflow-hidden backdrop-blur-xl">
            
            {/* Top Shield Header */}
            <div className="pt-8 pb-5 px-6 text-center border-b border-slate-800/80">
              <div className="w-16 h-16 rounded-full bg-slate-900/90 border border-slate-700 mx-auto flex items-center justify-center text-slate-300 shadow-inner mb-4">
                <Shield className="w-8 h-8 text-slate-200" strokeWidth={1.75} />
              </div>
              <h1 className="text-xl font-extrabold text-[#f5b324] tracking-tight">
                Admin Security Portal
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Master Credential & Password Management Gate
              </p>
            </div>

            {/* Inner Form Area */}
            <div className="p-6 sm:p-7 bg-white text-slate-800 space-y-5">
              
              {/* Yellow Alert Banner */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300/80 text-amber-900 text-xs flex items-center gap-2.5 shadow-2xs">
                <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-medium leading-relaxed">
                  Enter your <strong className="font-bold">Master Security Token</strong> or <strong className="font-bold">Admin Password</strong> to proceed.
                </span>
              </div>

              {/* Error Message */}
              {gateError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span className="font-semibold">{gateError}</span>
                </div>
              )}

              <form onSubmit={handleGateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Master Security Key / Admin Password
                  </label>
                  <div className="relative rounded-xl shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showMasterKey ? 'text' : 'password'}
                      value={masterKey}
                      onChange={(e) => setMasterKey(e.target.value)}
                      placeholder="Enter security key..."
                      autoFocus
                      required
                      className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMasterKey(!showMasterKey)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    >
                      {showMasterKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                    <span>Default Master Token: <code className="font-mono text-slate-600 font-bold">SHRAMIK-SECURE-2026</code></span>
                    <span>or Admin PW</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={gateLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#0e1a38] hover:bg-[#16274e] active:bg-[#091227] disabled:opacity-60 transition-all shadow-md cursor-pointer"
                >
                  {gateLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying Master Token...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span>Authenticate & Access Admin Portal</span>
                    </>
                  )}
                </button>
              </form>

              {/* Back to Login Link */}
              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Login</span>
                </Link>
              </div>

            </div>

          </div>

          <p className="text-center text-[11px] text-slate-500 mt-5">
            ShramikSetu • Private Application Management System
          </p>

        </div>

      </div>
    );
  }

  // ==========================================
  // VIEW 2: UNLOCKED MANAGEMENT DASHBOARD (TABS)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-16">
      
      {/* Top Black / Dark Navy Header Bar */}
      <header className="bg-[#0b1329] border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-900 font-extrabold shadow-sm">
              <ShieldCheck className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-sm tracking-tight text-white">
                  Admin Security Portal
                </span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Master Security Gate
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Master Credential & Password Management Gate
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              to="/login"
              className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors inline-flex items-center gap-1.5"
            >
              <span>Login Screen</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            <button
              onClick={() => {
                setIsUnlocked(false);
                setMasterKey('');
              }}
              className="text-xs font-bold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900 px-3 py-1.5 rounded-xl border border-rose-800/50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              title="Lock Gate"
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>Lock Gate</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        
        {/* Floating Notification */}
        {notification && (
          <div className={`mb-6 p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 shadow-md animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : notification.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : 'bg-blue-50 border-blue-300 text-blue-800'
          }`}>
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Top Tab Bar matching Divy-Impex layout */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs mb-6 flex flex-wrap gap-1.5">
          
          {/* Tab 1: Change / Reset Password */}
          <button
            onClick={() => setActiveTab('reset')}
            className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'reset'
                ? 'bg-[#0e1a38] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>1. Change / Reset Password</span>
          </button>

          {/* Tab 2: Create New User ID & Password */}
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'create'
                ? 'bg-[#0e1a38] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>2. Create New User ID & Password</span>
          </button>

          {/* Tab 3: All System Accounts */}
          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex-1 min-w-[170px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'accounts'
                ? 'bg-[#0e1a38] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>3. All System Accounts ({accounts.length})</span>
          </button>

          {/* Tab 4: Security Audit & Session Logs */}
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 min-w-[170px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-[#0e1a38] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <History className="w-4 h-4" />
            <span>4. Security Audit Trail ({securityLogs.length})</span>
          </button>

        </div>

        {/* ======================================================== */}
        {/* TAB 1: CHANGE / RESET PASSWORD (matching Screenshot 3)   */}
        {/* ======================================================== */}
        {activeTab === 'reset' && (
          <div className="space-y-4">
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 relative overflow-hidden border-l-4 border-l-[#f5b324]">
              
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Change or Reset Password
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Recover forgotten credentials or assign a new secure password to any user account.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  Direct Recovery
                </span>
              </div>

              <form onSubmit={handleResetSubmit} className="mt-6 space-y-5">
                
                {/* Select Target User Account */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Target User Account <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={resetTargetUser}
                    onChange={(e) => setResetTargetUser(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
                  >
                    <option value="">-- Choose User ID to Reset --</option>
                    {accounts.map(acc => (
                      <option key={acc.username} value={acc.username}>
                        @{acc.username} — {acc.fullName} ({acc.role})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">
                    Select the account whose password you need to reset.
                  </p>
                </div>

                {/* Password Fields Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      New Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        required
                        className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Confirm New Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        required
                        className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                      />
                    </div>
                  </div>

                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Clear Form
                  </button>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0e1a38] hover:bg-[#192b57] active:bg-[#070e1e] transition-all shadow-md cursor-pointer disabled:opacity-60"
                  >
                    {resetLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-amber-400" />
                    )}
                    <span>Update Password Now</span>
                  </button>
                </div>

              </form>

            </div>

            {/* Bottom Instant Activation Notice */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong className="font-bold text-slate-800">Instant Activation:</strong> Once updated, the user can immediately log in on the <Link to="/login" className="text-blue-600 font-bold underline hover:text-blue-800">Login Screen</Link> with the new password.
              </span>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: CREATE NEW USER (matching Screenshot 4)           */}
        {/* ======================================================== */}
        {activeTab === 'create' && (
          <div className="space-y-4">
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 relative overflow-hidden border-l-4 border-l-[#0e1a38]">
              
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Create New User ID & Password
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Provision a new internal operator, manager, or supervisor account.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#0e1a38] text-white">
                  New Account
                </span>
              </div>

              <form onSubmit={handleCreateSubmit} className="mt-6 space-y-4">
                
                {/* Row 1: Username & Full Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      User ID (Username) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={newUser.username}
                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                        placeholder="Enter username"
                        required
                        className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-normal text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 font-medium">
                      Used to sign in. Must be unique.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newUser.fullName}
                      onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                      placeholder="Enter full name"
                      required
                      className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                    />
                  </div>
                </div>

                {/* Row 2: Role & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      System Role <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all cursor-pointer"
                    >
                      <option value="Administrator (Full Access)">Administrator (Full Access)</option>
                      <option value="Field Desk Operator">Field Desk Operator</option>
                      <option value="District Welfare Officer">District Welfare Officer</option>
                      <option value="Auditor & Verification Staff">Auditor & Verification Staff</option>
                      <option value="Field Registration Agent">Field Registration Agent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="Enter email address"
                      className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-normal text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                    />
                  </div>
                </div>

                {/* Row 3: Initial Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Initial Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showCreatePassword ? 'text' : 'password'}
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder="••••••••••••"
                        required
                        className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreatePassword(!showCreatePassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                      >
                        {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Confirm Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showCreatePassword ? 'text' : 'password'}
                        value={newUser.confirmPassword}
                        onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                        placeholder="••••••••••••"
                        required
                        className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setNewUser({
                      username: '',
                      fullName: '',
                      role: 'Administrator (Full Access)',
                      email: '',
                      password: '',
                      confirmPassword: ''
                    })}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Reset Form
                  </button>

                  <button
                    type="submit"
                    disabled={createLoading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0e1a38] hover:bg-[#192b57] active:bg-[#070e1e] transition-all shadow-md cursor-pointer disabled:opacity-60"
                  >
                    <UserPlus className="w-4 h-4 text-emerald-400" />
                    <span>Create Account</span>
                  </button>
                </div>

              </form>

            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: ALL SYSTEM ACCOUNTS                               */}
        {/* ======================================================== */}
        {activeTab === 'accounts' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  All Registered System Accounts
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  View and govern internal access credentials for ShramikSetu operations.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('create')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#0e1a38] text-white hover:bg-[#192b57] transition-all"
              >
                <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                <span>+ New Account</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">System Role</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accounts.map((acc) => (
                    <tr key={acc.username} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs">
                            {acc.avatar || acc.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {acc.fullName}
                            </div>
                            <div className="text-[11px] font-mono text-blue-600">
                              @{acc.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {acc.role}
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {acc.email || '—'}
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>{acc.status || 'Active'}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => {
                              setResetTargetUser(acc.username);
                              setActiveTab('reset');
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
                            title="Reset password for this user"
                          >
                            Reset PW
                          </button>

                          {!acc.isPrimary && acc.username !== 'admin' && (
                            <button
                              onClick={() => handleDeleteAccount(acc.username)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: SECURITY AUDIT & SESSION LOGS                     */}
        {/* ======================================================== */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            
            <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Security Audit Trail & Activity Logs
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Audit log of logins, account creation, password resets, and administrative operations.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(securityLogs, null, 2));
                    const dlAnchor = document.createElement('a');
                    dlAnchor.setAttribute('href', dataStr);
                    dlAnchor.setAttribute('download', `ShramikSetu_AuditLogs_${Date.now()}.json`);
                    dlAnchor.click();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export JSON</span>
                </button>

                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to clear the security audit log history?')) {
                      clearAuditLogs();
                      setSecurityLogs(getAuditLogs());
                      showNotify('info', 'Security audit log history cleared.');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear History</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Event Action</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4 text-right">Status Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {securityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                        No security audit events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    securityLogs.map((log) => {
                      const dateStr = new Date(log.timestamp).toLocaleString();
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {dateStr}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {log.action}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-blue-600">
                            {log.user}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {log.details}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.level === 'success'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : log.level === 'security'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : log.level === 'warning'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {(log.level || 'INFO').toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </main>

    </div>
  );
}

