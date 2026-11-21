import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Clock, 
  User, 
  Lock, 
  History, 
  Download, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert, 
  Info,
  Laptop
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function SessionTrackerModal({ isOpen, onClose }) {
  const { 
    user, 
    auditLogs, 
    clearAudit, 
    lockTerminal, 
    handleLogout,
    sessionDuration
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('ALL');

  if (!isOpen) return null;

  // Filter logs
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLevel = filterLevel === 'ALL' || log.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  const handleExportLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `ShramikSetu_AuditTrail_${Date.now()}.json`);
    dlAnchor.click();
  };

  const getLevelBadge = (level) => {
    switch (level) {
      case 'success':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">SUCCESS</span>;
      case 'security':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">SECURITY</span>;
      case 'warning':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">WARNING</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">INFO</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 font-sans select-none animate-fade-in">
      
      <div className="bg-[#0c1429] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-700 overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-[#080D1A]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-extrabold text-white">
                  Session & Security Tracker
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-700/50">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Live terminal metrics, inactivity protection, and security audit log
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Active Session Diagnostic Card */}
          <div className="bg-[#080D1A] border border-slate-800 rounded-2xl p-5 text-white shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center font-black text-blue-300 text-sm">
                  {user?.avatar || 'AD'}
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{user?.fullName || 'Operator'}</span>
                    <span className="text-xs text-blue-400 font-mono">@{user?.username}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {user?.role || 'Staff'} • {user?.district || 'Odisha Operations'}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    onClose();
                    lockTerminal();
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Lock terminal screen immediately"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Now</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    handleLogout();
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
              <div className="bg-[#0c1429] rounded-xl p-3 border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Active Time</div>
                <div className="text-sm font-black text-white mt-0.5">{sessionDuration}</div>
              </div>

              <div className="bg-[#0c1429] rounded-xl p-3 border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Auto-Lock Limit</div>
                <div className="text-sm font-black text-amber-400 mt-0.5">20 Minutes</div>
              </div>

              <div className="bg-[#0c1429] rounded-xl p-3 border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Protection</div>
                <div className="text-sm font-black text-emerald-400 mt-0.5">Encrypted</div>
              </div>

              <div className="bg-[#0c1429] rounded-xl p-3 border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Cross-Tab Sync</div>
                <div className="text-sm font-black text-blue-400 mt-0.5">Enabled</div>
              </div>
            </div>
          </div>

          {/* Security Audit Trail Section */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  Security Activity Log ({auditLogs.length})
                </h3>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportLogs}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Export audit trail to JSON"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Export</span>
                </button>

                <button
                  onClick={clearAudit}
                  className="px-2.5 py-1.5 rounded-lg border border-rose-900/40 text-xs font-semibold text-rose-400 hover:bg-rose-950/40 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Clear history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search action, user, or details..."
                className="flex-1 px-3 py-1.5 text-xs bg-[#080D1A] border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-500"
              />

              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="px-3 py-1.5 text-xs bg-[#080D1A] border border-slate-700 rounded-xl font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="ALL">All Levels</option>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="security">Security</option>
              </select>
            </div>

            {/* Logs List */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-800">
              {filteredLogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No activity events found.
                </div>
              ) : (
                filteredLogs.map(log => {
                  const dateStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  return (
                    <div key={log.id} className="p-3 text-xs hover:bg-[#111c38] transition-colors flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{log.action}</span>
                          {getLevelBadge(log.level)}
                          <span className="text-[10px] text-blue-400 font-mono">{log.user}</span>
                        </div>
                        <div className="text-[11px] text-slate-300">{log.details}</div>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0 font-mono mt-0.5">
                        {dateStr}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-[#080D1A] flex items-center justify-between text-xs text-slate-400">
          <span>Session Inactivity Guard • 20 Min Auto-Lock</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-200 bg-[#0c1429] border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>

    </div>
  );
}

