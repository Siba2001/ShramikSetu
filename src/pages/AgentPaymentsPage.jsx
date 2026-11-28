import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, 
  IndianRupee, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  Clock, 
  Search, 
  RefreshCw, 
  PlusCircle, 
  Banknote, 
  History, 
  ChevronLeft, 
  ChevronRight, 
  Filter,
  AlertTriangle,
  FileSpreadsheet,
  MessageSquare,
  Receipt
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { 
  getAgentPaymentDashboard, 
  addAgentDue, 
  receiveAgentPayment 
} from '../services/agentPaymentService';
import AddDueModal from '../components/payments/AddDueModal';
import ReceivePaymentModal from '../components/payments/ReceivePaymentModal';
import PaymentHistoryModal from '../components/payments/PaymentHistoryModal';
import WhatsAppReminderModal from '../components/payments/WhatsAppReminderModal';
import ReminderHistoryModal from '../components/payments/ReminderHistoryModal';

export default function AgentPaymentsPage() {
  const { agents, showToast } = useApp();

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalAgents: 0,
    totalDue: 0,
    totalReceived: 0,
    totalOutstanding: 0,
    fullyPaid: 0,
    pendingPayment: 0,
    agentSummaries: []
  });

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Modals state
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isAddDueOpen, setIsAddDueOpen] = useState(false);
  const [isReceivePaymentOpen, setIsReceivePaymentOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsAppMode, setWhatsAppMode] = useState('reminder'); // 'reminder' | 'receipt' | 'confirmation'
  const [whatsAppPaymentDetails, setWhatsAppPaymentDetails] = useState(null);
  const [isReminderHistoryOpen, setIsReminderHistoryOpen] = useState(false);

  // Fetch dashboard stats & agent payment records
  const loadPaymentData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAgentPaymentDashboard();
      if (res && res.success) {
        setDashboardData(res);
      }
    } catch (err) {
      console.error('Failed to load agent payment dashboard:', err);
      showToast('error', 'Failed to fetch agent payment data.');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPaymentData();
  }, [loadPaymentData]);

  // Merge registered agents from AppContext with backend payment summaries
  const mergedAgents = useMemo(() => {
    const summaryMap = new Map();
    if (Array.isArray(dashboardData.agentSummaries)) {
      dashboardData.agentSummaries.forEach(s => {
        if (s.agentId) summaryMap.set(String(s.agentId), s);
        if (s.agentName) summaryMap.set(String(s.agentName).toLowerCase(), s);
      });
    }

    return agents.map(agent => {
      const summary = summaryMap.get(String(agent.id)) || 
                      summaryMap.get(String(agent.name).toLowerCase()) || {};

      const totalDue = Number(summary.totalDue || 0);
      const totalPaid = Number(summary.totalPaid || 0);
      const remaining = Math.max(0, totalDue - totalPaid);

      let paymentStatus = 'No Dues';
      if (totalDue > 0) {
        if (remaining === 0) {
          paymentStatus = 'Paid';
        } else if (totalPaid > 0) {
          paymentStatus = 'Partially Paid';
        } else {
          paymentStatus = 'Unpaid';
        }
      }

      return {
        id: agent.id,
        name: agent.name,
        mobile: agent.mobile || agent.phone || '-',
        district: agent.district || 'Ganjam',
        block: agent.block || agent.village || '-',
        totalDue,
        totalPaid,
        remaining,
        paymentStatus,
        lastPaymentDate: summary.lastPaymentDate || '-',
        lastReminderDate: summary.lastReminderDate || '-'
      };
    });
  }, [agents, dashboardData.agentSummaries]);

  // Filtered rows
  const filteredAgents = useMemo(() => {
    return mergedAgents.filter(ag => {
      if (statusFilter !== 'All' && ag.paymentStatus !== statusFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match = (
          (ag.name && ag.name.toLowerCase().includes(q)) ||
          (ag.mobile && ag.mobile.toLowerCase().includes(q)) ||
          (ag.district && ag.district.toLowerCase().includes(q)) ||
          (ag.block && ag.block.toLowerCase().includes(q))
        );
        if (!match) return false;
      }
      return true;
    });
  }, [mergedAgents, statusFilter, searchTerm]);

  // Aggregated summary cards
  const summaryKPIs = useMemo(() => {
    let totalDue = 0;
    let totalPaid = 0;
    let fullyPaid = 0;
    let pendingPayment = 0;

    mergedAgents.forEach(a => {
      totalDue += a.totalDue;
      totalPaid += a.totalPaid;
      if (a.totalDue > 0) {
        if (a.remaining === 0) fullyPaid++;
        else pendingPayment++;
      }
    });

    return {
      totalAgents: mergedAgents.length,
      totalDue,
      totalReceived: totalPaid,
      totalOutstanding: Math.max(0, totalDue - totalPaid),
      fullyPaid,
      pendingPayment
    };
  }, [mergedAgents]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAgents.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAgents.slice(start, start + pageSize);
  }, [filteredAgents, currentPage, pageSize]);

  // Handlers for action modals
  const handleOpenAddDue = (agent) => {
    setSelectedAgent(agent);
    setIsAddDueOpen(true);
  };

  const handleOpenReceivePayment = (agent) => {
    setSelectedAgent(agent);
    setIsReceivePaymentOpen(true);
  };

  const handleOpenHistory = (agent) => {
    setSelectedAgent(agent);
    setIsHistoryOpen(true);
  };

  const handleOpenWhatsAppReminder = (agent, mode = 'reminder') => {
    setSelectedAgent(agent);
    setWhatsAppMode(mode);
    setWhatsAppPaymentDetails(null);
    setIsWhatsAppOpen(true);
  };

  const handleOpenWhatsAppConfirmation = (agent, details) => {
    setSelectedAgent(agent);
    setWhatsAppMode('confirmation');
    setWhatsAppPaymentDetails(details);
    setIsWhatsAppOpen(true);
  };

  const handleOpenReminderHistory = (agent) => {
    setSelectedAgent(agent);
    setIsReminderHistoryOpen(true);
  };

  const handleReminderSuccess = (ag, msgType) => {
    showToast('success', `${msgType} logged successfully for ${ag.name}.`);
    loadPaymentData();
  };

  const handleAddDueSubmit = async (payload) => {
    await addAgentDue(payload);
    showToast('success', `Due of ₹${payload.dueAmount} recorded for ${payload.agentName}.`);
    await loadPaymentData();
  };

  const handleReceivePaymentSubmit = async (payload) => {
    await receiveAgentPayment(payload);
    showToast('success', `Payment of ₹${payload.amount} received from ${payload.agentName}.`);
    await loadPaymentData();
  };

  const handleExportSummaryExcel = () => {
    if (!filteredAgents.length) return;
    const rows = filteredAgents.map((a, idx) => ({
      'SL No': idx + 1,
      'Agent Name': a.name,
      'Mobile Number': a.mobile,
      'District': a.district,
      'Block / Village': a.block,
      'Total Due Amount (INR)': a.totalDue,
      'Total Paid Amount (INR)': a.totalPaid,
      'Remaining Amount (INR)': a.remaining,
      'Payment Status': a.paymentStatus,
      'Last Payment Date': a.lastPaymentDate,
      'Last Reminder Date': a.lastReminderDate
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Agent_Payments');
    XLSX.writeFile(workbook, `Agent_Payments_Summary_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Paid
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Partially Paid
          </span>
        );
      case 'Unpaid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3" /> Unpaid
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            No Dues
          </span>
        );
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <IndianRupee className="w-6 h-6 text-amber-500" />
            Agent Payment Management
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Track agent financial dues, collect multi-method payments, audit FIFO allocations and review ledger history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSummaryExcel}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-xl hover:bg-emerald-100 transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={loadPaymentData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 6 KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. Total Agents */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Agents</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">{summaryKPIs.totalAgents}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Active registered agents</span>
        </div>

        {/* 2. Total Due Amount */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Due</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">{fmt(summaryKPIs.totalDue)}</p>
          <span className="text-[10px] text-amber-600 font-medium mt-0.5 block">Total dues charged</span>
        </div>

        {/* 3. Total Received Amount */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Received</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-emerald-600 mt-2">{fmt(summaryKPIs.totalReceived)}</p>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">Payments collected</span>
        </div>

        {/* 4. Total Outstanding Amount */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Outstanding</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-rose-600 mt-2">{fmt(summaryKPIs.totalOutstanding)}</p>
          <span className="text-[10px] text-rose-600 font-medium mt-0.5 block">Unsettled balance</span>
        </div>

        {/* 5. Fully Paid Agents */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fully Paid</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">{summaryKPIs.fullyPaid}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Zero balance agents</span>
        </div>

        {/* 6. Pending Payment Agents */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Payment</span>
            <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-orange-600 mt-2">{summaryKPIs.pendingPayment}</p>
          <span className="text-[10px] text-orange-600 font-medium mt-0.5 block">Agents with dues</span>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by agent name, mobile, block..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="py-2 px-3 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="All">All Statuses</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Paid">Paid</option>
                <option value="No Dues">No Dues</option>
              </select>
            </div>

            {(searchTerm || statusFilter !== 'All') && (
              <button
                onClick={() => { setSearchTerm(''); setStatusFilter('All'); setCurrentPage(1); }}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
              >
                Reset filters
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500">
            Total <span className="font-semibold text-slate-800">{filteredAgents.length}</span> agents found
          </div>
        </div>

        {/* Agent Wise Payment Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-3 px-3.5 w-12 text-center">SL</th>
                <th className="py-3 px-3.5">Agent Name</th>
                <th className="py-3 px-3.5">Mobile Number</th>
                <th className="py-3 px-3.5 text-right">Total Due</th>
                <th className="py-3 px-3.5 text-right">Total Paid</th>
                <th className="py-3 px-3.5 text-right">Remaining</th>
                <th className="py-3 px-3.5 text-center">Payment Status</th>
                <th className="py-3 px-3.5 text-center">Last Payment Date</th>
                <th className="py-3 px-3.5 text-center">Last Reminder Date</th>
                <th className="py-3 px-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No agent payment records match your filters</p>
                    <p className="text-xs text-slate-400 mt-1">Try clearing your search query or status filter.</p>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((agent, idx) => {
                  const sl = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={agent.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3.5 text-center text-slate-500 font-mono">
                        {sl}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-slate-900">
                        <div>{agent.name}</div>
                        <div className="text-[10px] font-normal text-slate-400">{agent.block}, {agent.district}</div>
                      </td>
                      <td className="py-3 px-3.5 text-slate-700 font-mono">
                        {agent.mobile}
                      </td>
                      <td className="py-3 px-3.5 text-right font-semibold text-slate-800">
                        {fmt(agent.totalDue)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-semibold text-emerald-600">
                        {fmt(agent.totalPaid)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-slate-900">
                        <span className={agent.remaining > 0 ? 'text-rose-600' : 'text-slate-700'}>
                          {fmt(agent.remaining)}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        {getStatusBadge(agent.paymentStatus)}
                      </td>
                      <td className="py-3 px-3.5 text-center text-slate-600 font-medium">
                        {agent.lastPaymentDate}
                      </td>
                      <td className="py-3 px-3.5 text-center text-slate-600 font-medium">
                        {agent.lastReminderDate !== '-' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <MessageSquare className="w-3 h-3 text-emerald-600" />
                            {agent.lastReminderDate}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* WhatsApp Reminder or Receipt Button */}
                          {agent.remaining > 0 ? (
                            <button
                              onClick={() => handleOpenWhatsAppReminder(agent, 'reminder')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-2xs"
                              title="Send WhatsApp Payment Reminder"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Remind</span>
                            </button>
                          ) : agent.totalDue > 0 ? (
                            <button
                              onClick={() => handleOpenWhatsAppReminder(agent, 'receipt')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition-colors shadow-2xs"
                              title="Send WhatsApp Payment Receipt"
                            >
                              <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Receipt</span>
                            </button>
                          ) : null}

                          {/* Add Due */}
                          <button
                            onClick={() => handleOpenAddDue(agent)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                            title="Add Due Amount"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Add Due</span>
                          </button>

                          {/* Receive Payment */}
                          <button
                            onClick={() => handleOpenReceivePayment(agent)}
                            disabled={agent.remaining <= 0}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title="Receive Payment"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            <span>Receive</span>
                          </button>

                          {/* View History */}
                          <button
                            onClick={() => handleOpenHistory(agent)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                            title="View Transaction History"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>History</span>
                          </button>

                          {/* View Reminder Logs */}
                          <button
                            onClick={() => handleOpenReminderHistory(agent)}
                            className="inline-flex items-center gap-1 p-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors"
                            title="View WhatsApp Reminder History"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing page <span className="font-semibold text-slate-800">{currentPage}</span> of <span className="font-semibold text-slate-800">{totalPages}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Modals */}
      <AddDueModal
        isOpen={isAddDueOpen}
        onClose={() => setIsAddDueOpen(false)}
        agent={selectedAgent}
        onSubmit={handleAddDueSubmit}
      />

      <ReceivePaymentModal
        isOpen={isReceivePaymentOpen}
        onClose={() => setIsReceivePaymentOpen(false)}
        agent={selectedAgent}
        agentSummary={selectedAgent ? {
          totalDue: selectedAgent.totalDue,
          totalPaid: selectedAgent.totalPaid,
          outstanding: selectedAgent.remaining
        } : null}
        onSubmit={handleReceivePaymentSubmit}
        onShareWhatsApp={(ag, details) => handleOpenWhatsAppConfirmation(ag, details)}
      />

      <PaymentHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        agent={selectedAgent}
        onTransactionUpdated={loadPaymentData}
      />

      {/* WhatsApp Click-to-Chat Reminder & Receipt Modal */}
      <WhatsAppReminderModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        agent={selectedAgent}
        mode={whatsAppMode}
        paymentDetails={whatsAppPaymentDetails}
        onSuccess={handleReminderSuccess}
      />

      {/* WhatsApp Communication History Modal */}
      <ReminderHistoryModal
        isOpen={isReminderHistoryOpen}
        onClose={() => setIsReminderHistoryOpen(false)}
        agent={selectedAgent}
      />
    </div>
  );
}
