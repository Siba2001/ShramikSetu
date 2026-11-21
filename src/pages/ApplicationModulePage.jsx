import React, { useState, useMemo } from 'react';
import { 
  Search, 
  PlusCircle, 
  FileDown, 
  Filter, 
  Copy, 
  Check, 
  Edit3, 
  Eye, 
  Trash2, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  MapPin, 
  User, 
  FileSpreadsheet,
  Phone,
  AlertCircle,
  Printer
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportApplications, exportBlockWisePDF, exportBlockWiseExcel } from '../utils/exportUtils';

export default function ApplicationModulePage({ 
  serviceKey, 
  title, 
  description, 
  icon: Icon 
}) {
  const { 
    applications, 
    allBlocksList, 
    allAgentsList, 
    handleOpenAddModal, 
    handleOpenEditModal, 
    handleOpenViewModal, 
    handleUpdateStatus, 
    handleDeleteApplication,
    showToast 
  } = useApp();

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('All');
  const [selectedAgent, setSelectedAgent] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // Selection & Pagination
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [copiedTrack, setCopiedTrack] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Filter applications belonging to this module
  const moduleApplications = useMemo(() => {
    return applications.filter(a => {
      if (serviceKey === 'Card Renewal' || serviceKey === 'Annual Contribution') {
        return a.serviceType === 'Card Renewal' || a.serviceType === 'Annual Contribution';
      }
      return a.serviceType === serviceKey;
    });
  }, [applications, serviceKey]);

  const isNewCard = serviceKey === 'New Card';
  const isRenewal = serviceKey === 'Card Renewal' || serviceKey === 'Annual Contribution';
  const isDeath = serviceKey === 'Death Benefit Apply';
  const isMaternity = serviceKey === 'Maternity Benefit Apply';
  const totalCols = (isRenewal || isNewCard) ? 9 : 10;

  const searchPlaceholder = useMemo(() => {
    if (isRenewal) return `Search ${title} by Block, Card Holder Name, Card No, Track No, Agent...`;
    if (isDeath) return `Search ${title} by Block, Card Holder Name, Card No, Track No, Agent, Remark...`;
    if (isMaternity) return `Search ${title} by Block, Beneficiary Name, Card No, Track No, Agent, Remark...`;
    if (isNewCard) return `Search ${title} by Block, Applicant Name, Aadhaar No, Track No, Agent...`;
    return `Search ${title} by Name, Card, Aadhaar, Track...`;
  }, [isRenewal, isDeath, isMaternity, isNewCard, title]);

  // Compute Module-specific stats
  const moduleStats = useMemo(() => {
    const total = moduleApplications.length;
    const pending = moduleApplications.filter(a => a.status === 'Pending' || a.status === 'E-Sign Pending').length;
    const inProgress = moduleApplications.filter(a => a.status === 'In Progress' || a.status === 'Query Replied').length;
    const queries = moduleApplications.filter(a => a.status === 'Query Raised').length;
    const approved = moduleApplications.filter(a => a.status === 'Approved').length;
    return { total, pending, inProgress, queries, approved };
  }, [moduleApplications]);

  // Apply User Filters
  const filteredList = useMemo(() => {
    return moduleApplications.filter(app => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches = 
          (app.applicantName && app.applicantName.toLowerCase().includes(q)) ||
          (app.cardNo && app.cardNo.toLowerCase().includes(q)) ||
          (app.aadhaarNo && app.aadhaarNo.toLowerCase().includes(q)) ||
          (app.trackNo && app.trackNo.toLowerCase().includes(q)) ||
          (app.block && app.block.toLowerCase().includes(q)) ||
          (app.agent && app.agent.toLowerCase().includes(q)) ||
          (app.phone && app.phone.includes(q)) ||
          (app.remarks && app.remarks.toLowerCase().includes(q)) ||
          (app.officer && app.officer.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Block
      if (selectedBlock !== 'All' && app.block !== selectedBlock) return false;

      // Agent
      if (selectedAgent !== 'All' && app.agent !== selectedAgent) return false;

      // Status
      if (selectedStatus !== 'All') {
        if (selectedStatus === 'Pending' && !(app.status === 'Pending' || app.status === 'E-Sign Pending')) return false;
        if (selectedStatus === 'Approved' && app.status !== 'Approved') return false;
        if (selectedStatus === 'In Progress' && !(app.status === 'In Progress' || app.status === 'Query Replied')) return false;
        if (selectedStatus === 'Query Raised' && app.status !== 'Query Raised') return false;
        if (selectedStatus === 'Bank Reject' && app.status !== 'Bank Reject' && app.status !== 'Rejected') return false;
      }

      // Date Range Filter
      if (fromDate || toDate) {
        const appDateStr = app.applicationDate || app.date || app.createdAt;
        if (appDateStr) {
          const appDate = new Date(appDateStr);
          if (fromDate && appDate < new Date(fromDate)) return false;
          if (toDate) {
            const end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
            if (appDate > end) return false;
          }
        }
      }

      return true;
    });
  }, [moduleApplications, searchTerm, selectedBlock, selectedAgent, selectedStatus, fromDate, toDate]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  // Checkbox Selection
  const handleToggleSelectAll = () => {
    if (selectedIds.size === paginatedRows.length && paginatedRows.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedRows.map(r => r.id)));
    }
  };

  const handleToggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleCopyTrack = (track) => {
    if (!track) return;
    navigator.clipboard.writeText(track);
    setCopiedTrack(track);
    setTimeout(() => setCopiedTrack(null), 2000);
  };

  const handleDownloadBlockPDF = () => {
    const res = exportBlockWisePDF(filteredList, {
      service: serviceKey,
      block: selectedBlock,
      status: selectedStatus
    });
    showToast('success', `Generated ${res.count} records in Official PDF: ${res.filename}`);
  };

  const handleDownloadBlockExcel = () => {
    const res = exportBlockWiseExcel(filteredList, {
      service: serviceKey,
      block: selectedBlock,
      status: selectedStatus
    });
    showToast('success', `Exported ${res.count} records in Official Excel: ${res.filename}`);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'E-Sign Pending':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'In Progress':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Query Raised':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Query Replied':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Bank Reject':
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Module Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          {Icon && (
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6" />
            </div>
          )}
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">{title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Download Official Block PDF */}
          <button
            onClick={handleDownloadBlockPDF}
            disabled={filteredList.length === 0}
            className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-40 shadow-xs cursor-pointer"
            title={`Download ${selectedBlock !== 'All' ? selectedBlock : 'Official'} PDF Report`}
          >
            <Printer className="w-4 h-4 text-rose-600" />
            <span>Download PDF</span>
          </button>

          {/* Download Official Block Excel */}
          <button
            onClick={handleDownloadBlockExcel}
            disabled={filteredList.length === 0}
            className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-40 shadow-xs cursor-pointer"
            title={`Download ${selectedBlock !== 'All' ? selectedBlock : 'Official'} Excel Report`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Download Excel</span>
          </button>

          {/* Add Application Button */}
          <button
            onClick={() => handleOpenAddModal(serviceKey)}
            className="px-4 py-2 rounded-xl bg-[#1E3A8A] hover:bg-[#172554] active:bg-blue-900 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Application</span>
          </button>
        </div>
      </div>

      {/* Module Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Entries</span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">{moduleStats.total}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">Pending</span>
          <div className="text-2xl font-black text-amber-600 font-mono mt-0.5">{moduleStats.pending}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">In Verification</span>
          <div className="text-2xl font-black text-blue-600 font-mono mt-0.5">{moduleStats.inProgress}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-purple-700 tracking-wider">Queries (Q)</span>
          <div className="text-2xl font-black text-purple-600 font-mono mt-0.5">{moduleStats.queries}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Approved</span>
          <div className="text-2xl font-black text-emerald-600 font-mono mt-0.5">{moduleStats.approved}</div>
        </div>
      </div>

      {/* Main Filter & Action Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3.5 shadow-xs">
        
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Block Filter */}
            <select
              value={selectedBlock}
              onChange={(e) => { setSelectedBlock(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Blocks</option>
              {allBlocksList.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Agent Filter */}
            <select
              value={selectedAgent}
              onChange={(e) => { setSelectedAgent(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Agents</option>
              {allAgentsList.map(ag => (
                <option key={ag} value={ag}>{ag}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending / E-Sign</option>
              <option value="In Progress">In Progress</option>
              <option value="Query Raised">Query Raised (Q)</option>
              <option value="Approved">Approved</option>
              <option value="Bank Reject">Bank Reject</option>
            </select>

            {/* Date Filters */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
              <span className="text-slate-500 text-[10px] font-bold">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-xs text-slate-800 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
              <span className="text-slate-500 text-[10px] font-bold">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-xs text-slate-800 focus:outline-none"
              />
            </div>

          </div>

        </div>

        {/* Selected Rows Action Bar */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 animate-fadeIn text-xs">
            <span className="font-bold text-blue-800">{selectedIds.size} applications selected</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const sel = moduleApplications.filter(a => selectedIds.has(a.id));
                  exportApplications(sel, {
                    filenamePrefix: `Selected_${title.replace(/\s+/g, '_')}`
                  });
                  showToast('success', `Exported ${sel.length} records.`);
                }}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Export Selected
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase text-[10.5px] font-bold tracking-wider">
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === paginatedRows.length}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="py-3.5 px-3 w-12 text-slate-400 font-mono">SL</th>
                <th className="py-3.5 px-3">Block</th>
                <th className="py-3.5 px-4 font-bold text-slate-900">
                  {isRenewal || isDeath ? 'Card Holder Name' : isMaternity ? 'Beneficiary Name' : isNewCard ? 'Applicant Name' : 'Beneficiary Name'}
                </th>
                <th className="py-3.5 px-3">
                  {isNewCard ? 'Aadhaar No' : (isRenewal || isDeath || isMaternity) ? 'Nirman Shramik Card No' : 'Card / Aadhaar No'}
                </th>
                <th className="py-3.5 px-3">Tracking No</th>
                <th className="py-3.5 px-3">Agent Name</th>
                {(isDeath || isMaternity) && (
                  <th className="py-3.5 px-3">Remark / Notes</th>
                )}
                {(!isRenewal && !isNewCard && !isDeath && !isMaternity) && (
                  <th className="py-3.5 px-3">Remarks / Officer</th>
                )}
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={totalCols} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No applications found in this module</p>
                    <p className="text-xs text-slate-400 mt-0.5">Click "Add Application" above to add new records</p>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((app, idx) => {
                  const sl = (currentPage - 1) * pageSize + idx + 1;
                  const isSelected = selectedIds.has(app.id);

                  return (
                    <tr key={app.id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-blue-50/60' : ''}`}>
                      
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(app.id)}
                          className="rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{sl}</td>

                      {/* Block */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                          <MapPin className="w-3 h-3 text-blue-600" />
                          {app.block || 'General'}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{app.applicantName || '-'}</span>
                          {app.phone && (
                            <span title={`Phone: ${app.phone}`} className="text-slate-400">
                              <Phone className="w-3 h-3 text-emerald-600" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Card / Aadhaar */}
                      <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {isNewCard ? (
                          app.aadhaarNo ? (
                            <span className="font-semibold text-slate-800">{app.aadhaarNo}</span>
                          ) : <span className="text-slate-400 italic">-</span>
                        ) : (isRenewal || isDeath || isMaternity) ? (
                          app.cardNo ? (
                            <span className="font-semibold text-slate-800">{app.cardNo}</span>
                          ) : <span className="text-slate-400 italic">-</span>
                        ) : (
                          <>
                            {app.cardNo && <div><span className="text-[10px] text-slate-400">Card:</span> <span className="font-semibold text-slate-800">{app.cardNo}</span></div>}
                            {app.aadhaarNo && <div><span className="text-[10px] text-slate-400">Aadhaar:</span> <span className="font-semibold text-slate-600">{app.aadhaarNo}</span></div>}
                            {!app.cardNo && !app.aadhaarNo && <span className="text-slate-400 italic">-</span>}
                          </>
                        )}
                      </td>

                      {/* Track No */}
                      <td className="py-3 px-3 font-mono whitespace-nowrap">
                        {app.trackNo ? (
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {app.trackNo}
                            </span>
                            <button
                              onClick={() => handleCopyTrack(app.trackNo)}
                              className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer transition-colors"
                              title="Copy Track No"
                            >
                              {copiedTrack === app.trackNo ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* Agent */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {app.agent ? (
                          <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px] border border-indigo-200">
                            {app.agent}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* Remarks / Notes */}
                      {(isDeath || isMaternity) && (
                        <td className="py-3 px-3 max-w-[180px] truncate" title={app.remarks}>
                          {app.remarks ? (
                            <span className="text-[11px] text-slate-600">{app.remarks}</span>
                          ) : (
                            <span className="text-slate-400 italic">-</span>
                          )}
                        </td>
                      )}
                      {(!isRenewal && !isNewCard && !isDeath && !isMaternity) && (
                        <td className="py-3 px-3 max-w-[180px] truncate" title={app.remarks || app.officer}>
                          {app.officer && <div className="font-semibold text-slate-800 text-[11px] truncate">{app.officer}</div>}
                          {app.remarks && <div className="text-[10.5px] text-slate-500 italic truncate">{app.remarks}</div>}
                          {!app.officer && !app.remarks && <span className="text-slate-400 italic">-</span>}
                        </td>
                      )}

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <select
                          value={app.status}
                          onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                          className={`text-[11px] font-bold rounded-lg px-2.5 py-1 border cursor-pointer focus:outline-none ${getStatusBadge(app.status)}`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="E-Sign Pending">E-Sign Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Query Raised">Query Raised (Q)</option>
                          <option value="Query Replied">Query Replied</option>
                          <option value="Approved">Approved</option>
                          <option value="Completed">Completed</option>
                          <option value="Bank Reject">Bank Reject</option>
                        </select>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          
                          {/* View details */}
                          <button
                            onClick={() => handleOpenViewModal(app)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="View Full Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditModal(app)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Complete & Clear */}
                          <button
                            onClick={() => {
                              if (window.confirm(`Mark ${app.applicantName} as Completed? It will be removed from active database.`)) {
                                handleUpdateStatus(app.id, 'Completed');
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Mark Completed"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete application for ${app.applicantName}?`)) {
                                handleDeleteApplication(app.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Showing <span className="font-bold text-slate-800">{filteredList.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
              <span className="font-bold text-slate-800">{Math.min(currentPage * pageSize, filteredList.length)}</span> of{' '}
              <span className="font-bold text-slate-900">{filteredList.length}</span> entries
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-xs">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer shadow-xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
