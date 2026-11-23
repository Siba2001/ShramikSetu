import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  Printer,
  Heart,
  HeartHandshake,
  FileText,
  ShieldCheck,
  Loader2,
  RotateCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportApplications, exportBlockWisePDF, exportBlockWiseExcel } from '../utils/exportUtils';
import MarriageVerificationSection from '../components/marriage/MarriageVerificationSection';
import { getCachedPagedApplications } from '../services/db';

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
    marriageVerifications,
    fetchApplicationsPaged,
    showToast
  } = useApp();

  // Special Tab state for Marriage Benefit module
  const [activeMarriageTab, setActiveMarriageTab] = useState('applications'); // 'applications' | 'verification'

  // Debounced Search state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filters state
  const [selectedBlock, setSelectedBlock] = useState('All');
  const [selectedAgent, setSelectedAgent] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Selection & Server-Side Pagination
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [copiedTrack, setCopiedTrack] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50); // Default 50 records as required

  // Server-side query state (Instant Cache Hydration for 0ms tab switching)
  const [serverData, setServerData] = useState(() => {
    return getCachedPagedApplications({
      service: serviceKey,
      page: 1,
      pageSize: 50,
      search: '',
      block: 'All',
      agent: 'All',
      status: 'All'
    });
  });
  const [isLoadingPage, setIsLoadingPage] = useState(false);

  // Instantly populate from memory cache on parameter or module changes
  useEffect(() => {
    const cached = getCachedPagedApplications({
      service: serviceKey,
      page: currentPage,
      pageSize: pageSize,
      search: debouncedSearch,
      block: selectedBlock,
      agent: selectedAgent,
      status: selectedStatus,
      fromDate: fromDate,
      toDate: toDate
    });
    if (cached) {
      setServerData(cached);
    }
  }, [serviceKey, currentPage, pageSize, debouncedSearch, selectedBlock, selectedAgent, selectedStatus, fromDate, toDate]);

  // Debounce search input (350ms) to eliminate per-keystroke stuttering
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const hasDataRef = useRef(false);
  hasDataRef.current = !!(serverData && Array.isArray(serverData.data) && serverData.data.length > 0);

  // Instant 0ms Optimistic & Background SWR live synchronization listeners
  useEffect(() => {
    const handleRemoteSync = (e) => {
      if (e.detail && e.detail.data && e.detail.params?.service === serviceKey) {
        setServerData(e.detail.data);
      }
    };

    const handleCreated = (e) => {
      const record = e.detail?.record;
      if (!record) return;

      const isRenewal = (serviceKey === 'Card Renewal' || serviceKey === 'Annual Contribution');
      const matchesService = isRenewal
        ? (record.serviceType === 'Card Renewal' || record.serviceType === 'Annual Contribution')
        : (record.serviceType === serviceKey || !serviceKey || serviceKey === 'All');

      if (matchesService) {
        setServerData(prev => {
          const prevData = (prev && Array.isArray(prev.data)) ? prev.data : [];
          const nextData = [record, ...prevData.filter(item => item.id !== record.id)];
          const prevSummary = prev?.summary || { total: 0, pending: 0, inProgress: 0, queries: 0, approved: 0 };
          const isPending = record.status === 'Pending' || record.status === 'E-Sign Pending';
          return {
            ...(prev || {}),
            success: true,
            totalRecords: (prev?.totalRecords || prevData.length) + 1,
            data: nextData,
            summary: {
              ...prevSummary,
              total: (prevSummary.total || 0) + 1,
              pending: isPending ? (prevSummary.pending || 0) + 1 : prevSummary.pending
            }
          };
        });
      }
    };

    const handleUpdated = (e) => {
      const record = e.detail?.record;
      if (!record) return;
      setServerData(prev => {
        if (!prev || !Array.isArray(prev.data)) return prev;
        return {
          ...prev,
          data: prev.data.map(item => item.id === record.id ? { ...item, ...record } : item)
        };
      });
    };

    const handleDeleted = (e) => {
      const id = e.detail?.id;
      const trackNo = e.detail?.trackNo;
      if (!id && !trackNo) return;
      setServerData(prev => {
        if (!prev || !Array.isArray(prev.data)) return prev;
        const filtered = prev.data.filter(item => (id && item.id !== id) && (!trackNo || item.trackNo !== trackNo));
        const prevSummary = prev?.summary;
        return {
          ...prev,
          data: filtered,
          totalRecords: Math.max(0, (prev.totalRecords || 1) - 1),
          summary: prevSummary ? {
            ...prevSummary,
            total: Math.max(0, (prevSummary.total || 1) - 1)
          } : prevSummary
        };
      });
    };

    window.addEventListener('shramiksetu:application_created', handleCreated);
    window.addEventListener('shramiksetu:application_updated', handleUpdated);
    window.addEventListener('shramiksetu:application_deleted', handleDeleted);
    window.addEventListener('shramiksetu:paged_sync', handleRemoteSync);

    return () => {
      window.removeEventListener('shramiksetu:application_created', handleCreated);
      window.removeEventListener('shramiksetu:application_updated', handleUpdated);
      window.removeEventListener('shramiksetu:application_deleted', handleDeleted);
      window.removeEventListener('shramiksetu:paged_sync', handleRemoteSync);
    };
  }, [serviceKey]);

  // Load Paged Data directly from Google Apps Script Backend (Stale-While-Revalidate)
  const loadPagedRecords = useCallback((bypassCache = false) => {
    let isMounted = true;
    if (!hasDataRef.current && !bypassCache) {
      setIsLoadingPage(true);
    }

    fetchApplicationsPaged({
      service: serviceKey,
      page: currentPage,
      pageSize: pageSize,
      search: debouncedSearch,
      block: selectedBlock,
      agent: selectedAgent,
      status: selectedStatus,
      fromDate: fromDate,
      toDate: toDate,
      bypassCache
    }).then(res => {
      if (isMounted && res && res.success) {
        setServerData(res);
      }
    }).catch(err => {
      console.warn('Paged records sync notice:', err);
    }).finally(() => {
      if (isMounted) setIsLoadingPage(false);
    });

    return () => { isMounted = false; };
  }, [serviceKey, currentPage, pageSize, debouncedSearch, selectedBlock, selectedAgent, selectedStatus, fromDate, toDate, fetchApplicationsPaged]);

  useEffect(() => {
    const cleanup = loadPagedRecords();
    return cleanup;
  }, [loadPagedRecords]);

  // Local In-Memory Fallback for Offline / Cache
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

  // Compute Module-specific stats (from server summary or local fallback)
  const localModuleStats = useMemo(() => {
    const total = moduleApplications.length;
    const pending = moduleApplications.filter(a => a.status === 'Pending' || a.status === 'E-Sign Pending').length;
    const inProgress = moduleApplications.filter(a => a.status === 'In Progress' || a.status === 'Query Replied').length;
    const queries = moduleApplications.filter(a => a.status === 'Query Raised').length;
    const approved = moduleApplications.filter(a => a.status === 'Approved').length;
    return { total, pending, inProgress, queries, approved };
  }, [moduleApplications]);

  const moduleStats = useMemo(() => {
    if (serverData?.summary && serverData.summary.total > 0) {
      return serverData.summary;
    }
    return localModuleStats;
  }, [serverData, localModuleStats]);

  // Local filtering (fallback when server data is not yet loaded)
  const localFilteredList = useMemo(() => {
    return moduleApplications.filter(app => {
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase();
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
      if (selectedBlock !== 'All' && app.block !== selectedBlock) return false;
      if (selectedAgent !== 'All' && app.agent !== selectedAgent) return false;
      if (selectedStatus !== 'All') {
        if (selectedStatus === 'Pending' && !(app.status === 'Pending' || app.status === 'E-Sign Pending')) return false;
        if (selectedStatus === 'Approved' && app.status !== 'Approved') return false;
        if (selectedStatus === 'In Progress' && !(app.status === 'In Progress' || app.status === 'Query Replied')) return false;
        if (selectedStatus === 'Query Raised' && app.status !== 'Query Raised') return false;
        if (selectedStatus === 'Bank Reject' && app.status !== 'Bank Reject' && app.status !== 'Rejected') return false;
      }
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
  }, [moduleApplications, debouncedSearch, selectedBlock, selectedAgent, selectedStatus, fromDate, toDate]);

  // Active Display Rows: Server-Side vs Fallback
  const displayRows = useMemo(() => {
    if (serverData && Array.isArray(serverData.data)) {
      return serverData.data;
    }
    const start = (currentPage - 1) * pageSize;
    return localFilteredList.slice(start, start + pageSize);
  }, [serverData, currentPage, pageSize, localFilteredList]);

  const totalRecords = useMemo(() => {
    if (serverData && serverData.totalRecords !== undefined) {
      return serverData.totalRecords;
    }
    return localFilteredList.length;
  }, [serverData, localFilteredList.length]);

  const totalPages = useMemo(() => {
    if (serverData && serverData.totalPages !== undefined) {
      return Math.max(1, serverData.totalPages);
    }
    return Math.max(1, Math.ceil(localFilteredList.length / pageSize));
  }, [serverData, localFilteredList.length, pageSize]);

  // Checkbox Selection
  const handleToggleSelectAll = () => {
    if (selectedIds.size === displayRows.length && displayRows.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayRows.map(r => r.id)));
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

  // Optimistic In-Place Status Update
  const onStatusChange = async (appId, newStatus) => {
    // Immediate in-place UI update on active page
    setServerData(prev => {
      if (!prev || !Array.isArray(prev.data)) return prev;
      return {
        ...prev,
        data: prev.data.map(item => item.id === appId ? { ...item, status: newStatus } : item)
      };
    });

    await handleUpdateStatus(appId, newStatus, undefined, serviceKey);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In Progress':
      case 'Query Replied':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Query Raised':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Pending':
      case 'E-Sign Pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Bank Reject':
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">

      {/* Marriage Benefit Sub-Tabs Navigation */}
      {serviceKey === 'Marriage Benefit Apply' && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveMarriageTab('applications')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeMarriageTab === 'applications'
                ? 'bg-[#0B1325] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Benefit Applications</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${activeMarriageTab === 'applications' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                }`}>
                {totalRecords}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMarriageTab('verification')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeMarriageTab === 'verification'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/60'
                }`}
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Marriage Verification List</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${activeMarriageTab === 'verification' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                {(marriageVerifications || []).length}
              </span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:block pr-2">
            {activeMarriageTab === 'verification'
              ? 'Official Marriage Verification Register (All Blocks)'
              : 'Official Construction Worker Marriage Financial Assistance'}
          </div>
        </div>
      )}

      {serviceKey === 'Marriage Benefit Apply' && activeMarriageTab === 'verification' ? (
        <MarriageVerificationSection />
      ) : (
        <>
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
              {/* Marriage Verification Quick Toggle Button (if inside Marriage Benefit) */}
              {serviceKey === 'Marriage Benefit Apply' && (
                <button
                  type="button"
                  onClick={() => setActiveMarriageTab('verification')}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100/80 text-blue-700 border border-blue-200 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  title="Open Official Marriage Verification Register"
                >
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Verify Register</span>
                </button>
              )}

              {/* Refresh Paged Data Button */}
              <button
                type="button"
                onClick={() => loadPagedRecords(true)}
                disabled={isLoadingPage}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs flex items-center transition-all cursor-pointer disabled:opacity-50"
                title="Reload current page from server"
              >
                <RotateCw className={`w-4 h-4 ${isLoadingPage ? 'animate-spin text-blue-600' : ''}`} />
              </button>

              {/* Download PDF Button */}
              <button
                type="button"
                onClick={() => {
                  exportBlockWisePDF(displayRows, {
                    block: selectedBlock,
                    service: serviceKey,
                    status: selectedStatus,
                    maskPII: false
                  });
                  showToast('success', `Generated ${title} Block-wise PDF Report.`);
                }}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                title={`Download ${title} PDF report formatted by block`}
              >
                <Printer className="w-4 h-4 text-rose-600" />
                <span>Download PDF</span>
              </button>

              {/* Download Excel Button */}
              <button
                type="button"
                onClick={() => {
                  exportBlockWiseExcel(displayRows, {
                    block: selectedBlock,
                    service: serviceKey,
                    status: selectedStatus,
                    maskPII: false
                  });
                  showToast('success', `Exported ${title} Block-wise Excel.`);
                }}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border border-emerald-200 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                title={`Download official Excel sheet for ${title}`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Download Excel</span>
              </button>

              {/* Add Application Button */}
              <button
                type="button"
                onClick={() => handleOpenAddModal(serviceKey)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Entry</span>
              </button>
            </div>
          </div>

          {/* Module KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Active</span>
              <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">{moduleStats.total}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">Pending</span>
              <div className="text-2xl font-black text-amber-600 font-mono mt-0.5">{moduleStats.pending}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">In Progress</span>
              <div className="text-2xl font-black text-blue-600 font-mono mt-0.5">{moduleStats.inProgress}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Approved</span>
              <div className="text-2xl font-black text-emerald-600 font-mono mt-0.5">{moduleStats.approved}</div>
            </div>
          </div>

          {/* Main Filter & Action Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3.5 shadow-xs">

            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">

              {/* Debounced Search Box */}
              <div className="relative flex-1 max-w-md">
                {isLoadingPage ? (
                  <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 animate-spin" />
                ) : (
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                )}
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                />
                {searchInput && (
                  <button
                    onClick={() => { setSearchInput(''); setDebouncedSearch(''); }}
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

                {/* Page Size Selector */}
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setCurrentPage(1); }}
                  className="px-2.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-500"
                  title="Rows per page"
                >
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page (Default)</option>
                  <option value={100}>100 / page</option>
                </select>

              </div>

            </div>

            {/* Selected Rows Action Bar */}
            {selectedIds.size > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 animate-fadeIn text-xs">
                <span className="font-bold text-blue-800">{selectedIds.size} applications selected</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const sel = displayRows.filter(a => selectedIds.has(a.id));
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
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden relative">
            {isLoadingPage && serverData === null && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-md border border-slate-200 text-xs font-bold text-slate-700">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <span>Loading records...</span>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase text-[10.5px] font-bold tracking-wider">
                    <th className="py-3.5 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.size > 0 && selectedIds.size === displayRows.length}
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
                  {displayRows.length === 0 ? (
                    <tr>
                      <td colSpan={totalCols} className="py-12 text-center text-slate-400">
                        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-700">No applications found in this module</p>
                        <p className="text-xs text-slate-400 mt-0.5">Click "New Entry" above to add new records</p>
                      </td>
                    </tr>
                  ) : (
                    displayRows.map((app, idx) => {
                      const isSelected = selectedIds.has(app.id);
                      const displaySl = (currentPage - 1) * pageSize + idx + 1;

                      return (
                        <tr
                          key={app.id || idx}
                          className={`hover:bg-blue-50/30 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}
                        >
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(app.id)}
                              className="rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500"
                            />
                          </td>

                          <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                            {displaySl}
                          </td>

                          <td className="py-3 px-3 font-semibold text-slate-800">
                            {app.block || '—'}
                          </td>

                          <td className="py-3 px-4 font-bold text-slate-900 tracking-tight">
                            {app.applicantName || '—'}
                          </td>

                          <td className="py-3 px-3 font-mono text-slate-600">
                            {isNewCard ? (app.aadhaarNo || '—') : (app.cardNo || app.aadhaarNo || '—')}
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 font-mono text-blue-600 font-semibold">
                              <span>{app.trackNo || '—'}</span>
                              {app.trackNo && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyTrack(app.trackNo)}
                                  className="text-slate-400 hover:text-blue-600 p-0.5 rounded cursor-pointer"
                                  title="Copy Tracking Number"
                                >
                                  {copiedTrack === app.trackNo ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-slate-700">
                            {app.agent || '—'}
                          </td>

                          {(isDeath || isMaternity || (!isRenewal && !isNewCard)) && (
                            <td className="py-3 px-3 text-slate-500 max-w-[180px] truncate" title={app.remarks || app.officer}>
                              {app.remarks || app.officer || '—'}
                            </td>
                          )}

                          <td className="py-3 px-3">
                            <select
                              value={app.status || 'Pending'}
                              onChange={(e) => onStatusChange(app.id, e.target.value)}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${getStatusBadgeClass(app.status)}`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="E-Sign Pending">E-Sign Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Query Raised">Query Raised</option>
                              <option value="Query Replied">Query Replied</option>
                              <option value="Approved">Approved</option>
                              <option value="Bank Reject">Bank Reject</option>
                            </select>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">

                              <button
                                onClick={() => handleOpenViewModal(app)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleOpenEditModal(app)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Edit Record"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  if (window.confirm(`Mark ${app.applicantName} as Completed? It will be removed from active database.`)) {
                                    onStatusChange(app.id, 'Completed');
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Mark Completed"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={async () => {
                                  if (window.confirm(`Delete application for ${app.applicantName}?`)) {
                                    const ok = await handleDeleteApplication(app.id, {
                                      trackNo: app.trackNo,
                                      cardNo: app.cardNo,
                                      serviceType: app.serviceType || serviceKey
                                    });
                                    if (ok) {
                                      setServerData(prev => {
                                        if (!prev || !Array.isArray(prev.data)) return prev;
                                        const filtered = prev.data.filter(item => (app.id && item.id !== app.id) && (!app.trackNo || item.trackNo !== app.trackNo));
                                        return {
                                          ...prev,
                                          data: filtered,
                                          totalRecords: Math.max(0, (prev.totalRecords || 1) - 1),
                                          summary: prev.summary ? {
                                            ...prev.summary,
                                            total: Math.max(0, (prev.summary.total || 1) - 1),
                                            pending: (app.status === 'Pending' || app.status === 'E-Sign Pending') ? Math.max(0, (prev.summary.pending || 1) - 1) : prev.summary.pending
                                          } : prev.summary
                                        };
                                      });
                                      loadPagedRecords(true);
                                    }
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
                  Showing <span className="font-bold text-slate-800">{totalRecords > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
                  <span className="font-bold text-slate-800">{Math.min(currentPage * pageSize, totalRecords)}</span> of{' '}
                  <span className="font-bold text-slate-900">{totalRecords}</span> entries
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  • Server-Side Paged (50/page)
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
        </>
      )}

    </div>
  );
}
