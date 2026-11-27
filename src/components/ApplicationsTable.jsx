import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Copy, 
  Check, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  FileSpreadsheet, 
  Phone, 
  User, 
  MapPin, 
  Layers,
  AlertCircle
} from 'lucide-react';

export default function ApplicationsTable({
  applications,
  selectedBlock,
  onChangeBlock,
  selectedService,
  onChangeService,
  selectedStatus,
  onChangeStatus,
  onEditApplication,
  onDeleteApplication,
  onUpdateStatus,
  onExportSelected,
  onBulkComplete
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('All');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [copiedTrack, setCopiedTrack] = useState(null);
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Extract unique agents for filter dropdown
  const uniqueAgents = useMemo(() => {
    const set = new Set();
    applications.forEach(a => {
      if (a.agent) set.add(a.agent.trim());
    });
    return Array.from(set).sort();
  }, [applications]);

  // Extract unique blocks
  const uniqueBlocks = useMemo(() => {
    const set = new Set();
    applications.forEach(a => {
      if (a.block) set.add(a.block.trim());
    });
    return Array.from(set).sort();
  }, [applications]);

  // Filtered List
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches = 
          (app.applicantName && app.applicantName.toLowerCase().includes(q)) ||
          (app.cardNo && app.cardNo.toLowerCase().includes(q)) ||
          (app.aadhaarNo && app.aadhaarNo.toLowerCase().includes(q)) ||
          (app.trackNo && app.trackNo.toLowerCase().includes(q)) ||
          (app.agent && app.agent.toLowerCase().includes(q)) ||
          (app.officer && app.officer.toLowerCase().includes(q)) ||
          (app.phone && app.phone.toLowerCase().includes(q)) ||
          (app.remarks && app.remarks.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Block filter
      if (selectedBlock && selectedBlock !== 'All') {
        if (!app.block || app.block.toLowerCase() !== selectedBlock.toLowerCase()) {
          return false;
        }
      }

      // Service filter
      if (selectedService && selectedService !== 'All') {
        if (!app.serviceType || app.serviceType.toLowerCase() !== selectedService.toLowerCase()) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus && selectedStatus !== 'All') {
        if (selectedStatus === 'Pending') {
          if (app.status !== 'Pending' && app.status !== 'E-Sign Pending') return false;
        } else if (selectedStatus === 'In Progress') {
          if (app.status !== 'In Progress' && app.status !== 'Query Replied') return false;
        } else if (selectedStatus === 'Bank Reject') {
          if (app.status !== 'Bank Reject' && app.status !== 'Rejected') return false;
        } else {
          if (app.status !== selectedStatus) return false;
        }
      }

      // Agent filter
      if (selectedAgent && selectedAgent !== 'All') {
        if (!app.agent || app.agent.toLowerCase() !== selectedAgent.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [applications, searchTerm, selectedBlock, selectedService, selectedStatus, selectedAgent]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredApplications.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredApplications.slice(start, start + pageSize);
  }, [filteredApplications, currentPage, pageSize]);

  // Handle select all in current page
  const handleSelectAllToggle = () => {
    if (selectedIds.size === paginatedList.length && paginatedList.length > 0) {
      setSelectedIds(new Set());
    } else {
      const next = new Set();
      paginatedList.forEach(a => next.add(a.id));
      setSelectedIds(next);
    }
  };

  // Toggle single row select
  const handleToggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // 1-Click Track Number copy
  const handleCopyTrack = (track) => {
    if (!track) return;
    navigator.clipboard.writeText(track);
    setCopiedTrack(track);
    setTimeout(() => setCopiedTrack(null), 2000);
  };

  // Status badge styling helper
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
      case 'Completed':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getServiceBadge = (type) => {
    switch (type) {
      case 'New Card':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Card Renewal':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Maternity Benefit Apply':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'Marriage Benefit Apply':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Death Benefit Apply':
        return 'bg-slate-700 text-white border-slate-700';
      case 'Education Assistance Apply':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Search & Filters Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 space-y-3.5">
        
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          
          {/* Global Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search by Name, Card No, Aadhaar, Track No, Agent, Phone..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 placeholder:text-slate-400 transition-all shadow-xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Block Filter */}
            <select
              value={selectedBlock}
              onChange={(e) => { onChangeBlock(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
            >
              <option value="All">All Blocks</option>
              {uniqueBlocks.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Service Filter */}
            <select
              value={selectedService}
              onChange={(e) => { onChangeService(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
            >
              <option value="All">All Services</option>
              <option value="Card Renewal">Card Renewal</option>
              <option value="New Card">New Card</option>
              <option value="Maternity Benefit Apply">Maternity Benefit</option>
              <option value="Marriage Benefit Apply">Marriage Benefit</option>
              <option value="Death Benefit Apply">Death Benefit</option>
              <option value="Education Assistance Apply">Education Assistance</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => { onChangeStatus(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending / E-Sign</option>
              <option value="In Progress">In Progress</option>
              <option value="Query Raised">Query Raised (Q)</option>
              <option value="Query Replied">Query Replied</option>
              <option value="Approved">Approved</option>
              <option value="Bank Reject">Bank Reject</option>
            </select>

            {/* Agent / Worker Filter */}
            <select
              value={selectedAgent}
              onChange={(e) => { setSelectedAgent(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
            >
              <option value="All">All Agents</option>
              {uniqueAgents.map(ag => (
                <option key={ag} value={ag}>{ag}</option>
              ))}
            </select>

          </div>

        </div>

        {/* Selected Rows Batch Action Bar */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center space-x-2 text-xs text-blue-800 font-semibold">
              <span>{selectedIds.size} applications selected</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const selectedApps = applications.filter(a => selectedIds.has(a.id));
                  onExportSelected(selectedApps);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-700 hover:bg-blue-100 text-xs font-semibold rounded-lg border border-blue-300 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Selected</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-semibold tracking-wider uppercase text-[10.5px]">
              
              <th className="py-3.5 px-4 w-10 text-center">
                <input
                  type="checkbox"
                  checked={selectedIds.size > 0 && selectedIds.size === paginatedList.length}
                  onChange={handleSelectAllToggle}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>
              
              <th className="py-3.5 px-3 w-12 text-slate-400">SL</th>
              <th className="py-3.5 px-4 font-bold text-slate-700">Applicant Name</th>
              <th className="py-3.5 px-3">Service Type</th>
              <th className="py-3.5 px-3">Card / Aadhaar No</th>
              <th className="py-3.5 px-3">Track No</th>
              <th className="py-3.5 px-3">Block</th>
              <th className="py-3.5 px-3">Agent / Worker</th>
              <th className="py-3.5 px-3">Officer / Remarks</th>
              <th className="py-3.5 px-3">Application Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>

            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {paginatedList.length === 0 ? (
              <tr>
                <td colSpan="11" className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Search className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">No applications found matching your criteria</p>
                    <p className="text-xs text-slate-400">Try adjusting your search terms or filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedList.map((app, index) => {
                const slNo = (currentPage - 1) * pageSize + index + 1;
                const isSelected = selectedIds.has(app.id);

                return (
                  <tr 
                    key={app.id} 
                    className={`hover:bg-blue-50/40 transition-colors ${
                      isSelected ? 'bg-blue-50/60' : ''
                    }`}
                  >
                    
                    {/* Checkbox */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(app.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    {/* SL */}
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {slNo}
                    </td>

                    {/* Applicant Name */}
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{app.applicantName}</span>
                        {app.phone && (
                          <span 
                            title={`Phone: ${app.phone}`}
                            className="inline-flex items-center text-slate-400 hover:text-blue-600 cursor-pointer"
                          >
                            <Phone className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Service Type */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold border ${getServiceBadge(app.serviceType)}`}>
                        {app.serviceType}
                      </span>
                    </td>

                    {/* Card / Aadhaar */}
                    <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                      {app.cardNo && (
                        <div>
                          <span className="text-slate-400 text-[10px]">Card: </span>
                          <span className="font-semibold">{app.cardNo}</span>
                        </div>
                      )}
                      {app.aadhaarNo && (
                        <div>
                          <span className="text-slate-400 text-[10px]">Aadhaar: </span>
                          <span className="font-semibold text-slate-600">{app.aadhaarNo}</span>
                        </div>
                      )}
                      {!app.cardNo && !app.aadhaarNo && (
                        <span className="text-slate-300 italic">N/A</span>
                      )}
                    </td>

                    {/* Track No */}
                    <td className="py-3 px-3 font-mono whitespace-nowrap">
                      {app.trackNo ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200">
                            {app.trackNo}
                          </span>
                          <button
                            onClick={() => handleCopyTrack(app.trackNo)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors"
                            title="Copy Track No"
                          >
                            {copiedTrack === app.trackNo ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic">-</span>
                      )}
                    </td>

                    {/* Block */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {app.block || 'General'}
                      </span>
                    </td>

                    {/* Agent / Worker */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {app.agent ? (
                        <span className="font-medium text-slate-700 bg-indigo-50/60 text-indigo-700 px-2 py-0.5 rounded text-[11px] border border-indigo-100">
                          {app.agent}
                        </span>
                      ) : (
                        <span className="text-slate-300 italic">-</span>
                      )}
                    </td>

                    {/* Officer / Remarks */}
                    <td className="py-3 px-3 max-w-[180px] truncate" title={app.remarks || app.officer}>
                      {app.officer && (
                        <div className="font-medium text-slate-700 text-[11px] truncate">
                          {app.officer}
                        </div>
                      )}
                      {app.remarks && (
                        <div className="text-[10px] text-slate-500 italic truncate">
                          {app.remarks}
                        </div>
                      )}
                      {!app.officer && !app.remarks && (
                        <span className="text-slate-300 italic">-</span>
                      )}
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <select
                        value={app.status}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          onUpdateStatus(app.id, newStatus);
                        }}
                        className={`text-[11px] font-bold rounded-lg px-2.5 py-1 border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${getStatusBadge(app.status)}`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="E-Sign Pending">E-Sign Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Query Raised">Query Raised (Q)</option>
                        <option value="Query Replied">Query Replied</option>
                        <option value="Approved">Approved</option>
                        <option value="Completed">Completed</option>
                        <option value="Bank Reject">Bank Reject</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1">
                        
                        {/* Edit */}
                        <button
                          onClick={() => onEditApplication(app)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Application"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete application for ${app.applicantName}?`)) {
                              onDeleteApplication(app.id, {
                                trackNo: app.trackNo,
                                cardNo: app.cardNo,
                                aadhaarNo: app.aadhaarNo,
                                applicantName: app.applicantName,
                                block: app.block,
                                serviceType: app.serviceType
                              });
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Record"
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
      <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        
        <div className="flex items-center gap-2">
          <span>
            Showing <span className="font-bold">{filteredApplications.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
            <span className="font-bold">{Math.min(currentPage * pageSize, filteredApplications.length)}</span> of{' '}
            <span className="font-bold text-slate-900">{filteredApplications.length}</span> entries
          </span>
          
          <span className="text-slate-300">|</span>
          
          <label className="flex items-center gap-1.5 text-slate-500">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-medium focus:outline-none"
            >
              <option value="15">15</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="250">250</option>
            </select>
          </label>
        </div>

        {/* Page Nav */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 py-1 font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
}

