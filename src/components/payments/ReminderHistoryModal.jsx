import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  History, 
  MessageSquare, 
  Search, 
  RefreshCw, 
  Calendar, 
  Phone, 
  User, 
  FileText, 
  Loader2,
  Receipt,
  FileCheck,
  Globe2,
  Copy,
  Check
} from 'lucide-react';
import { getAgentReminderHistory } from '../../services/agentPaymentService';

export default function ReminderHistoryModal({ isOpen, onClose, agent }) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const fetchHistory = async () => {
    if (!agent) return;
    setLoading(true);
    try {
      const res = await getAgentReminderHistory(agent.id);
      if (res && res.success) {
        setHistory(res.history || []);
      }
    } catch (err) {
      console.error('Failed to load reminder history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && agent) {
      setSearchTerm('');
      fetchHistory();
    }
  }, [isOpen, agent]);

  if (!isOpen || !agent) return null;

  const filteredHistory = history.filter(item => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (item.messageType && item.messageType.toLowerCase().includes(q)) ||
      (item.mobileNumber && item.mobileNumber.includes(q)) ||
      (item.messageContent && item.messageContent.toLowerCase().includes(q)) ||
      (item.createdBy && item.createdBy.toLowerCase().includes(q)) ||
      (item.createdAt && item.createdAt.includes(q))
    );
  });

  const handleCopyMessage = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getTypeBadge = (type) => {
    switch (type) {
      case 'Receipt':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Receipt className="w-3 h-3" /> Receipt
          </span>
        );
      case 'Payment Confirmation':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <FileCheck className="w-3 h-3" /> Confirmation
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <MessageSquare className="w-3 h-3" /> Reminder
          </span>
        );
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                WhatsApp Communication History
              </h3>
              <p className="text-xs text-slate-500">
                Agent: <span className="font-semibold text-slate-800">{agent.name}</span> ({agent.mobile || 'No Mobile'})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
              title="Refresh History"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by message content, type, admin, or date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-slate-50/50">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-600" />
              <p className="text-xs font-semibold text-slate-600">Loading reminder logs...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No reminder activity found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {searchTerm ? 'Try adjusting your search query.' : 'No WhatsApp messages have been logged for this agent yet.'}
              </p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div 
                key={item.reminderId} 
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow"
              >
                {/* Top Row: Type, Language, Date, Time */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
                  <div className="flex items-center gap-2">
                    {getTypeBadge(item.messageType)}
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Globe2 className="w-2.5 h-2.5" /> {item.language || 'English'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{item.createdAt}</span>
                  </div>
                </div>

                {/* Ledger metrics snapshot */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-lg text-[10px] mb-2.5 border border-slate-100">
                  <div>
                    <span className="text-slate-400 block font-medium">Due Snapshot</span>
                    <span className="font-bold text-slate-700">{fmt(item.dueAmount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Paid Snapshot</span>
                    <span className="font-bold text-emerald-700">{fmt(item.receivedAmount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Outstanding</span>
                    <span className="font-bold text-rose-700">{fmt(item.outstandingAmount)}</span>
                  </div>
                </div>

                {/* Message Content */}
                <div className="relative bg-slate-50/80 rounded-lg p-3 text-xs text-slate-700 font-sans border border-slate-200/80 whitespace-pre-line leading-relaxed">
                  {item.messageContent}
                  <button
                    onClick={() => handleCopyMessage(item.reminderId, item.messageContent)}
                    className="absolute top-2 right-2 p-1 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors"
                    title="Copy Message Text"
                  >
                    {copiedId === item.reminderId ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* Footer metadata */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span className="font-mono text-slate-600">{item.mobileNumber}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>Logged by: <span className="font-semibold text-slate-600">{item.createdBy || 'Administrator'}</span></span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Total <span className="font-bold text-slate-800">{filteredHistory.length}</span> log entries
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
