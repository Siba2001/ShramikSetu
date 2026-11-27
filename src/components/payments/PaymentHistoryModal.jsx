import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Calendar, 
  Filter, 
  Download, 
  Printer, 
  IndianRupee, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RotateCcw, 
  Search, 
  FileSpreadsheet, 
  FileText, 
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getAgentPaymentHistory, reverseAgentTransaction } from '../../services/agentPaymentService';

function getJsPdfInstance(options) {
  const Constructor = (typeof jsPDF === 'function') 
    ? jsPDF 
    : (jsPDF?.default || (typeof window !== 'undefined' && (window.jspdf?.jsPDF || window.jsPDF)));
  return new Constructor(options);
}

function runAutoTable(doc, tableOptions) {
  if (typeof autoTable === 'function') {
    autoTable(doc, tableOptions);
  } else if (autoTable?.default && typeof autoTable.default === 'function') {
    autoTable.default(doc, tableOptions);
  } else if (typeof doc.autoTable === 'function') {
    doc.autoTable(tableOptions);
  }
}

export default function PaymentHistoryModal({ isOpen, onClose, agent, onTransactionUpdated }) {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');
  
  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [methodFilter, setMethodFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [search, setSearch] = useState('');

  // Reversal dialog state
  const [reversalTarget, setReversalTarget] = useState(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalLoading, setReversalLoading] = useState(false);
  const [reversalError, setReversalError] = useState('');

  useEffect(() => {
    if (isOpen && agent) {
      loadHistory();
    }
  }, [isOpen, agent]);

  const loadHistory = async () => {
    if (!agent) return;
    setLoading(true);
    setError('');
    try {
      const res = await getAgentPaymentHistory(agent.id);
      if (res && res.success) {
        setTransactions(res.transactions || []);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load transaction history.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = (t.date || t.createdAt || '').slice(0, 10);
      if (fromDate && tDate < fromDate) return false;
      if (toDate && tDate > toDate) return false;
      if (typeFilter !== 'All' && t.type !== typeFilter) return false;
      if (methodFilter !== 'All' && t.method !== methodFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const match = (
          (t.id && t.id.toLowerCase().includes(q)) ||
          (t.reference && t.reference.toLowerCase().includes(q)) ||
          (t.remarks && t.remarks.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.createdBy && t.createdBy.toLowerCase().includes(q))
        );
        if (!match) return false;
      }
      return true;
    });
  }, [transactions, fromDate, toDate, typeFilter, methodFilter, search]);

  const handleOpenReversal = (tx) => {
    setReversalTarget(tx);
    setReversalReason('');
    setReversalError('');
  };

  const handleConfirmReversal = async (e) => {
    e.preventDefault();
    if (!reversalReason.trim()) {
      setReversalError('Mandatory reason required for transaction reversal.');
      return;
    }

    setReversalLoading(true);
    setReversalError('');
    try {
      await reverseAgentTransaction({
        transactionId: reversalTarget.id,
        transactionType: reversalTarget.type,
        agentId: agent.id,
        reason: reversalReason.trim()
      });
      setReversalTarget(null);
      await loadHistory();
      if (onTransactionUpdated) onTransactionUpdated();
    } catch (err) {
      setReversalError(err.message || 'Failed to process reversal.');
    } finally {
      setReversalLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!filteredTransactions.length) return;
    const rows = filteredTransactions.map((t, idx) => ({
      'SL': idx + 1,
      'Transaction ID': t.id,
      'Date': t.date || t.createdAt?.slice(0, 10) || '',
      'Type': t.type,
      'Due Amount (INR)': t.type === 'Due' ? t.amount : 0,
      'Received Amount (INR)': t.type === 'Payment' ? t.amount : 0,
      'Running Balance (INR)': t.runningBalance !== undefined ? t.runningBalance : '',
      'Payment Method': t.method || '-',
      'Reference / Txn No': t.reference || '-',
      'Description / Purpose': t.description || '-',
      'Remarks': t.remarks || '-',
      'Recorded By': t.createdBy || 'System',
      'Status': t.status || 'Active'
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transaction_History');
    XLSX.writeFile(workbook, `Payment_History_${agent?.name || 'Agent'}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleExportPDF = () => {
    if (!filteredTransactions.length) return;
    try {
      const doc = getJsPdfInstance({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      
      doc.setFontSize(14);
      doc.text(`Agent Payment Transaction History - ${agent?.name || 'Agent'}`, 14, 15);
      doc.setFontSize(9);
      doc.text(`Agent Mobile: ${agent?.mobile || agent?.phone || 'N/A'} | Export Date: ${new Date().toLocaleDateString('en-IN')}`, 14, 21);

      const tableData = filteredTransactions.map((t, idx) => [
        idx + 1,
        t.date || t.createdAt?.slice(0, 10) || '',
        t.id,
        t.type,
        t.type === 'Due' ? `INR ${Number(t.amount).toFixed(2)}` : '-',
        t.type === 'Payment' ? `INR ${Number(t.amount).toFixed(2)}` : '-',
        t.runningBalance !== undefined ? `INR ${Number(t.runningBalance).toFixed(2)}` : '-',
        t.method || '-',
        t.reference || '-',
        t.remarks || t.description || '-',
        t.status || 'Active'
      ]);

      runAutoTable(doc, {
        startY: 25,
        head: [['#', 'Date', 'Txn ID', 'Type', 'Due Amt', 'Paid Amt', 'Running Bal', 'Method', 'Reference', 'Remarks', 'Status']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 18 },
          2: { cellWidth: 26 },
          3: { cellWidth: 16 },
          4: { cellWidth: 22 },
          5: { cellWidth: 22 },
          6: { cellWidth: 24 },
          7: { cellWidth: 18 },
          8: { cellWidth: 26 },
          9: { cellWidth: 40 },
          10: { cellWidth: 16 }
        }
      });

      doc.save(`Payment_History_${agent?.name || 'Agent'}_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (e) {
      console.error('PDF generation error:', e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !agent) return null;

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:p-0 print:bg-white animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 print:shadow-none print:max-h-none print:w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white rounded-t-2xl print:bg-white print:text-black print:border-b-2">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold">Transaction History</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-400 text-slate-950">
                {agent.name}
              </span>
            </div>
            <p className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
              Phone: {agent.mobile || agent.phone || 'N/A'} | District: {agent.district || 'Ganjam'} | Block: {agent.block || agent.village || 'N/A'}
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar / Filters */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Txn / Ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-36"
              />
            </div>

            {/* Type */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="py-1.5 px-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Types</option>
              <option value="Due">Dues Only</option>
              <option value="Payment">Payments Only</option>
              <option value="Reversal">Reversals Only</option>
            </select>

            {/* Method */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="py-1.5 px-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>

            {/* Date Range */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="py-1 px-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
                title="From Date"
              />
              <span>to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="py-1 px-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
                title="To Date"
              />
            </div>

            {(fromDate || toDate || typeFilter !== 'All' || methodFilter !== 'All' || search) && (
              <button
                onClick={() => { setFromDate(''); setToDate(''); setTypeFilter('All'); setMethodFilter('All'); setSearch(''); }}
                className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
              >
                Reset
              </button>
            )}
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={filteredTransactions.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 disabled:opacity-40 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <button
              onClick={handleExportPDF}
              disabled={filteredTransactions.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-300 rounded-lg hover:bg-rose-100 disabled:opacity-40 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={filteredTransactions.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <p className="text-xs">Loading complete transaction ledger...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No transactions recorded</p>
              <p className="text-xs text-slate-400 mt-1">Dues and payments for this agent will appear here chronologically.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Txn ID</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Due Amt</th>
                    <th className="py-2.5 px-3 text-right">Paid Amt</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Reference / Remarks</th>
                    <th className="py-2.5 px-3">Recorded By</th>
                    <th className="py-2.5 px-3 text-center print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((tx) => {
                    const isDue = tx.type === 'Due';
                    const isReversal = tx.type === 'Reversal' || tx.status === 'Reversed';
                    return (
                      <tr key={tx.id} className={`hover:bg-slate-50 transition-colors ${isReversal ? 'bg-rose-50/40 text-slate-400' : ''}`}>
                        <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-700">
                          {tx.date || tx.createdAt?.slice(0, 10)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {tx.id}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isDue ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                              <ArrowUpRight className="w-3 h-3" /> Due
                            </span>
                          ) : isReversal ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                              <RotateCcw className="w-3 h-3" /> Reversal
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ArrowDownLeft className="w-3 h-3" /> Payment
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                          {isDue ? fmt(tx.amount) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-emerald-600">
                          {!isDue && !isReversal ? fmt(tx.amount) : isReversal ? `-${fmt(tx.amount)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                          {tx.runningBalance !== undefined ? fmt(tx.runningBalance) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {tx.method || '-'}
                        </td>
                        <td className="py-2.5 px-3 max-w-xs">
                          <div className="truncate text-slate-800" title={tx.reference || tx.description || tx.remarks}>
                            {tx.reference && <span className="font-mono text-[10px] text-slate-500 mr-1">[{tx.reference}]</span>}
                            {tx.description || tx.remarks || '-'}
                          </div>
                          {tx.reversalReason && (
                            <div className="text-[10px] text-rose-600 italic">
                              Reason: {tx.reversalReason}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                          {tx.createdBy || 'System'}
                        </td>
                        <td className="py-2.5 px-3 text-center print:hidden">
                          {tx.status !== 'Reversed' && tx.type !== 'Reversal' ? (
                            <button
                              onClick={() => handleOpenReversal(tx)}
                              className="text-[10px] font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded transition-colors"
                              title="Authorized Reversal"
                            >
                              Reverse
                            </button>
                          ) : (
                            <span className="text-[10px] text-rose-500 italic">Reversed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex items-center justify-between text-xs text-slate-500 print:hidden">
          <span>Showing {filteredTransactions.length} of {transactions.length} total entries</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Reversal Confirmation Modal */}
      {reversalTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="text-base font-bold text-slate-900">Confirm Transaction Reversal</h4>
            </div>
            
            <p className="text-xs text-slate-600 mb-3">
              You are reversing {reversalTarget.type} <span className="font-mono font-semibold">{reversalTarget.id}</span> of <span className="font-bold text-slate-800">{fmt(reversalTarget.amount)}</span>. 
              Financial records are permanent; a counter-reversal entry will be created and agent balances will be adjusted.
            </p>

            {reversalError && (
              <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {reversalError}
              </div>
            )}

            <form onSubmit={handleConfirmReversal} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Reversal Reason *
                </label>
                <textarea
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g., Incorrect amount entered, duplicate entry, payment bounce..."
                  rows={3}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReversalTarget(null)}
                  disabled={reversalLoading}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reversalLoading || !reversalReason.trim()}
                  className="flex-1 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {reversalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  {reversalLoading ? 'Processing...' : 'Authorize Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
