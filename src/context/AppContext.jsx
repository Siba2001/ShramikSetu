import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  loadApplications,
  saveApplications,
  loadDistricts,
  saveDistricts,
  loadAgents,
  fetchAgentsFromBackend,
  fetchFromGoogleSheet,
  fetchDashboardSummary,
  fetchApplicationsPaged,
  updateApplicationStatusTargeted,
  addAgent as dbAddAgent,
  updateAgent as dbUpdateAgent,
  deleteAgent as dbDeleteAgent,
  addApplication as dbAddApplication,
  updateApplication as dbUpdateApplication,
  deleteApplication as dbDeleteApplication,
  batchImportApplications as dbBatchImportApplications,
  getGoogleScriptUrl,
  clearAllData as dbClearAllData,
  clearPagedApplicationsCache,
  loadMarriageVerifications,
  saveMarriageVerifications,
  addMarriageVerification as dbAddMarriageVerification,
  updateMarriageVerification as dbUpdateMarriageVerification,
  deleteMarriageVerification as dbDeleteMarriageVerification,
  fetchMarriageVerificationsFromBackend,
  isDeletedTombstone
} from '../services/db';
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  getAuditLogs,
  recordAuditEvent,
  clearAuditLogs,
  lockSessionTerminal,
  unlockSessionTerminal,
  isTerminalLocked as checkIsTerminalLocked,
  updateSessionLastActive,
  SESSION_TIMEOUT_MS,
  isSessionExpired
} from '../services/auth';
import { syncQueue } from '../services/syncQueue';
import { ALL_BLOCKS } from '../data/locationData';

const AppContext = createContext();

export function AppProvider({ children }) {
  // Authentication & Security state
  const [user, setUser] = useState(() => getCurrentUser());
  const isAuthenticated = Boolean(user && user.token);
  const [isTerminalLocked, setIsTerminalLocked] = useState(() => checkIsTerminalLocked());
  const [auditLogs, setAuditLogs] = useState(() => getAuditLogs());
  const [isSessionTrackerOpen, setIsSessionTrackerOpen] = useState(false);
  const [sessionDuration, setSessionDuration] = useState('0m 00s');

  const [applications, setApplications] = useState(() => loadApplications());
  const [districts, setDistricts] = useState(() => loadDistricts());
  const [agents, setAgents] = useState(() => loadAgents());
  const [marriageVerifications, setMarriageVerifications] = useState(() => loadMarriageVerifications());
  const [dashboardSummary, setDashboardSummary] = useState(() => {
    try {
      const cached = localStorage.getItem('shramik_setu_dashboard_summary_v1');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(() => syncQueue.getPendingCount());

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Modals
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [applicationToEdit, setApplicationToEdit] = useState(null);
  const [defaultServiceForAdd, setDefaultServiceForAdd] = useState('New Card');

  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [applicationToView, setApplicationToView] = useState(null);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportPreselected, setExportPreselected] = useState({});

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isGoogleOpen, setIsGoogleOpen] = useState(false);
  const [isAddAgentOpen, setIsAddAgentOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  // Listen to background sync queue events
  useEffect(() => {
    const unsubscribe = syncQueue.subscribe((event) => {
      setPendingSyncCount(syncQueue.getPendingCount());
      if (event === 'processing_end' && syncQueue.getPendingCount() === 0) {
        // Sync completed
      }
    });
    return unsubscribe;
  }, []);

  // Auth actions
  const handleLogin = async (username, password, remember) => {
    const res = await loginUser(username, password, remember);
    if (res.success && res.user) {
      setUser(res.user);
      refreshData();
      showToast('success', `Welcome back, ${res.user.fullName}!`);
    }
    return res;
  };

  const handleLogout = useCallback((force = false) => {
    if (!force) {
      setIsLogoutConfirmOpen(true);
      return;
    }
    const hadUser = Boolean(getCurrentUser());
    logoutUser();
    setUser(null);
    setIsTerminalLocked(false);
    setIsLogoutConfirmOpen(false);
    if (hadUser) {
      showToast('info', 'You have been safely logged out.');
    }
  }, [showToast]);

  const cancelLogout = () => {
    setIsLogoutConfirmOpen(false);
  };

  const lockTerminal = () => {
    lockSessionTerminal();
    setIsTerminalLocked(true);
    setAuditLogs(getAuditLogs());
    showToast('info', 'Terminal locked.');
  };

  const unlockTerminal = (password) => {
    const res = unlockSessionTerminal(password);
    if (res.success) {
      setIsTerminalLocked(false);
      setAuditLogs(getAuditLogs());
      showToast('success', 'Terminal unlocked. Welcome back.');
    }
    return res;
  };

  const recordAudit = (action, details, level = 'info') => {
    recordAuditEvent(action, details, level);
    setAuditLogs(getAuditLogs());
  };

  const clearAudit = () => {
    clearAuditLogs();
    setAuditLogs(getAuditLogs());
    showToast('info', 'Audit logs cleared.');
  };

  // Inactivity & Session Duration Tracker
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleUserActivity = () => {
      updateSessionLastActive();
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);

    // Cross-tab sync
    const handleStorageChange = (e) => {
      if (e.key === 'shramiksetu_auth_user' && !e.newValue) {
        setUser(null);
      }
      if (e.key === 'shramiksetu_audit_logs') {
        setAuditLogs(getAuditLogs());
      }
      if (e.key === 'shramiksetu_session_locked') {
        setIsTerminalLocked(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Auto-logout on backend session expiration or revocation
    const handleSessionExpired = () => {
      handleLogout(true);
    };
    window.addEventListener('shramiksetu:session_expired', handleSessionExpired);

    // Live Clock Interval for internal duration display & 1-hour session auto-clear
    const interval = setInterval(() => {
      if (!user?.loginAt) return;

      const now = Date.now();
      const loginTime = new Date(user.loginAt).getTime();
      const diffMs = Math.max(0, now - loginTime);

      // Strict 1-hour session timeout rule (60 minutes = 3,600,000 ms)
      if (diffMs >= SESSION_TIMEOUT_MS || isSessionExpired(user)) {
        showToast('error', 'Your session has expired after 1 hour. Please sign in again.');
        handleLogout(true);
        return;
      }

      const totalSec = Math.floor(diffMs / 1000);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      setSessionDuration(`${mins}m ${secs < 10 ? '0' : ''}${secs}s`);
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('shramiksetu:session_expired', handleSessionExpired);
      clearInterval(interval);
    };
  }, [isAuthenticated, user?.loginAt]);

  // High-Speed Dashboard Summary Fetcher (Zero full-database download)
  const refreshDashboardSummary = useCallback(async (bypassCache = false) => {
    setIsSummaryLoading(true);
    try {
      const summary = await fetchDashboardSummary(bypassCache);
      if (summary && summary.success) {
        setDashboardSummary(summary);
      }
    } catch (err) {
      console.warn('Dashboard summary sync notice:', err);
    } finally {
      setIsSummaryLoading(false);
    }
  }, []);

  // Refresh from storage & sync live data from Google Sheets database
  const refreshData = useCallback(() => {
    // Step 1: Show local data INSTANTLY (zero network delay)
    setApplications(loadApplications());
    setDistricts(loadDistricts());
    setAgents(loadAgents());
    setMarriageVerifications(loadMarriageVerifications());

    // Step 2: Fire ALL backend syncs in PARALLEL — do not await each other
    Promise.allSettled([
      fetchDashboardSummary(false).then(summary => {
        if (summary && summary.success) setDashboardSummary(summary);
      }),
      fetchAgentsFromBackend().then(liveAgents => {
        if (liveAgents && Array.isArray(liveAgents)) setAgents(liveAgents);
      }),
      fetchFromGoogleSheet().then(liveApps => {
        if (liveApps && Array.isArray(liveApps) && liveApps.length > 0) setApplications(liveApps);
      }),
      fetchMarriageVerificationsFromBackend().then(liveMvs => {
        if (liveMvs && Array.isArray(liveMvs)) setMarriageVerifications(liveMvs);
      })
    ]).catch(() => {});
  }, []);

  // Intelligent Polling: Runs all syncs in parallel every 60s when tab is visible
  useEffect(() => {
    refreshData();

    const liveSyncTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        Promise.allSettled([
          fetchDashboardSummary(false).then(summary => {
            if (summary && summary.success) setDashboardSummary(summary);
          }),
          fetchAgentsFromBackend().then(liveAgents => {
            if (liveAgents && Array.isArray(liveAgents)) setAgents(liveAgents);
          }),
          fetchFromGoogleSheet().then(liveApps => {
            if (liveApps && Array.isArray(liveApps) && liveApps.length > 0) setApplications(liveApps);
          }),
          fetchMarriageVerificationsFromBackend().then(liveMvs => {
            if (liveMvs && Array.isArray(liveMvs)) setMarriageVerifications(liveMvs);
          })
        ]).catch(() => {});
      }
    }, 60000);

    return () => clearInterval(liveSyncTimer);
  }, [refreshData]);

  // Real-time synchronization across modules and tabs
  useEffect(() => {
    const handleCreated = (e) => {
      const record = e.detail?.record;
      if (!record) return;
      setApplications(prev => {
        const next = [record, ...prev.filter(a => a.id !== record.id)];
        saveApplications(next);
        return next;
      });
    };

    const handleUpdated = (e) => {
      const record = e.detail?.record;
      if (!record || !record.id) return;
      setApplications(prev => {
        const next = prev.map(a => a.id === record.id ? { ...a, ...record } : a);
        saveApplications(next);
        return next;
      });
    };

    const handleDeleted = (e) => {
      const { id, trackNo } = e.detail || {};
      setApplications(prev => {
        const next = prev.filter(a => {
          if (id && a.id === id) return false;
          if (trackNo && a.trackNo === trackNo) return false;
          return true;
        });
        saveApplications(next);
        return next;
      });
    };

    const handlePagedSync = (e) => {
      const fetchedRecords = e.detail?.data?.data || e.detail?.records;
      if (Array.isArray(fetchedRecords) && fetchedRecords.length > 0) {
        setApplications(prev => {
          let updated = [...prev];
          let changed = false;
          fetchedRecords.forEach(remoteApp => {
            if (isDeletedTombstone(remoteApp)) return;
            const idx = updated.findIndex(a => (remoteApp.id && a.id === remoteApp.id) || (remoteApp.trackNo && a.trackNo === remoteApp.trackNo));
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], ...remoteApp };
              changed = true;
            } else {
              updated.unshift(remoteApp);
              changed = true;
            }
          });
          if (changed) {
            saveApplications(updated);
            return updated;
          }
          return prev;
        });
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === 'shramik_setu_applications_v2') {
        setApplications(loadApplications());
      }
    };

    window.addEventListener('shramiksetu:application_created', handleCreated);
    window.addEventListener('shramiksetu:application_updated', handleUpdated);
    window.addEventListener('shramiksetu:application_deleted', handleDeleted);
    window.addEventListener('shramiksetu:paged_sync', handlePagedSync);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('shramiksetu:application_created', handleCreated);
      window.removeEventListener('shramiksetu:application_updated', handleUpdated);
      window.removeEventListener('shramiksetu:application_deleted', handleDeleted);
      window.removeEventListener('shramiksetu:paged_sync', handlePagedSync);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Computed Global Stats (Prioritizes server-side pre-aggregated summary; falls back to local memory with universal merge)
  const stats = useMemo(() => {
    const localApps = Array.isArray(applications) && applications.length > 0 ? applications : loadApplications();
    const localCounts = {
      'New Card': 0,
      'Card Renewal': 0,
      'Annual Contribution': 0,
      'Marriage Benefit Apply': 0,
      'Maternity Benefit Apply': 0,
      'Death Benefit Apply': 0,
      'Education Assistance Apply': 0
    };
    let localPending = 0;
    let localInProgress = 0;
    let localQueries = 0;
    let localApproved = 0;
    let localBankRejections = 0;
    let localCompleted = 0;
    const localBlockCounts = {};
    const localDistrictCounts = {};
    const localRecentDaysMap = {};
    const todayDateStr = new Date().toISOString().slice(0, 10);
    let localTodayCount = 0;

    localApps.forEach(a => {
      if (!a) return;
      const s = (a.serviceType || '').toLowerCase();
      if (s.includes('renewal') || s.includes('contribution')) {
        localCounts['Card Renewal']++;
        localCounts['Annual Contribution']++;
      } else if (s.includes('marriage')) {
        localCounts['Marriage Benefit Apply']++;
      } else if (s.includes('maternity')) {
        localCounts['Maternity Benefit Apply']++;
      } else if (s.includes('death')) {
        localCounts['Death Benefit Apply']++;
      } else if (s.includes('education')) {
        localCounts['Education Assistance Apply']++;
      } else {
        localCounts['New Card']++;
      }

      const st = String(a.status || 'Pending').toLowerCase();
      if (st === 'pending' || st === 'e-sign pending') localPending++;
      else if (st === 'in progress' || st === 'query replied') localInProgress++;
      else if (st === 'query raised') localQueries++;
      else if (st === 'approved') localApproved++;
      else if (st === 'bank reject' || st === 'bank rejection' || st === 'rejected') localBankRejections++;
      else if (st === 'completed') localCompleted++;

      if (a.block) {
        localBlockCounts[a.block] = (localBlockCounts[a.block] || 0) + 1;
      }
      if (a.district) {
        localDistrictCounts[a.district] = (localDistrictCounts[a.district] || 0) + 1;
      }

      const rawDate = String(a.createdAt || a.applicationDate || '').trim();
      const dateStr = rawDate.slice(0, 10);
      if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        localRecentDaysMap[dateStr] = (localRecentDaysMap[dateStr] || 0) + 1;
        if (dateStr === todayDateStr) {
          localTodayCount++;
        }
      }
    });

    if (dashboardSummary && dashboardSummary.success) {
      const rawCategoryCounts = dashboardSummary.categoryCounts || dashboardSummary.serviceStats || dashboardSummary.serviceCounts || {};
      const rawBlockCounts = dashboardSummary.blockCounts || dashboardSummary.blockStats || dashboardSummary.blockDistribution || {};
      const rawDistrictCounts = dashboardSummary.districtCounts || dashboardSummary.districtStats || dashboardSummary.districtDistribution || {};

      const renewalServerCount = (rawCategoryCounts['Card Renewal'] || 0) + 
                                 (rawCategoryCounts['card renewal'] || 0) + 
                                 (rawCategoryCounts['Card_Renewal'] || 0) +
                                 (rawCategoryCounts['renewal'] || 0);
      const contributionServerCount = (rawCategoryCounts['Annual Contribution'] || 0) +
                                      (rawCategoryCounts['annual contribution'] || 0) +
                                      (rawCategoryCounts['Annual_Contribution'] || 0);
      const effectiveRenewalServer = Math.max(renewalServerCount, contributionServerCount);

      const effectiveNewCard = Math.max(
        rawCategoryCounts['New Card'] || rawCategoryCounts['new card'] || rawCategoryCounts['New_Card'] || 0,
        localCounts['New Card']
      );
      const effectiveRenewal = Math.max(effectiveRenewalServer, localCounts['Card Renewal']);
      const effectiveMarriage = Math.max(
        rawCategoryCounts['Marriage Benefit Apply'] || rawCategoryCounts['Marriage Benefit'] || rawCategoryCounts['Marriage_Benefit'] || 0,
        localCounts['Marriage Benefit Apply']
      );
      const effectiveMaternity = Math.max(
        rawCategoryCounts['Maternity Benefit Apply'] || rawCategoryCounts['Maternity Benefit'] || rawCategoryCounts['Maternity_Benefit'] || 0,
        localCounts['Maternity Benefit Apply']
      );
      const effectiveDeath = Math.max(
        rawCategoryCounts['Death Benefit Apply'] || rawCategoryCounts['Death Benefit'] || rawCategoryCounts['Death_Benefit'] || 0,
        localCounts['Death Benefit Apply']
      );
      const effectiveEducation = Math.max(
        rawCategoryCounts['Education Assistance Apply'] || rawCategoryCounts['Education Grant'] || rawCategoryCounts['Education_Assistance'] || 0,
        localCounts['Education Assistance Apply']
      );

      const categoryCounts = {
        'New Card': effectiveNewCard,
        'Card Renewal': effectiveRenewal,
        'Annual Contribution': effectiveRenewal,
        'Marriage Benefit Apply': effectiveMarriage,
        'Maternity Benefit Apply': effectiveMaternity,
        'Death Benefit Apply': effectiveDeath,
        'Education Assistance Apply': effectiveEducation
      };

      const computedTotal = Math.max(
        dashboardSummary.totalActive || 0,
        localApps.length,
        effectiveNewCard + effectiveRenewal + effectiveMarriage + effectiveMaternity + effectiveDeath + effectiveEducation
      );

      const mergedBlockCounts = { ...rawBlockCounts };
      Object.entries(localBlockCounts).forEach(([b, count]) => {
        mergedBlockCounts[b] = Math.max(mergedBlockCounts[b] || 0, count);
      });

      const mergedDistrictCounts = { ...rawDistrictCounts };
      Object.entries(localDistrictCounts).forEach(([d, count]) => {
        mergedDistrictCounts[d] = Math.max(mergedDistrictCounts[d] || 0, count);
      });

      const mergedRecentDays = { ...(dashboardSummary.recentDaysMap || {}) };
      Object.entries(localRecentDaysMap).forEach(([dt, count]) => {
        mergedRecentDays[dt] = Math.max(mergedRecentDays[dt] || 0, count);
      });

      return {
        totalActive: computedTotal,
        pending: Math.max(dashboardSummary.pending || 0, localPending),
        inProgress: Math.max(dashboardSummary.inProgress || 0, localInProgress),
        queries: Math.max(dashboardSummary.queries || 0, localQueries),
        approved: Math.max(dashboardSummary.approved || 0, localApproved),
        bankRejections: Math.max(dashboardSummary.bankRejections || 0, localBankRejections),
        completed: Math.max(dashboardSummary.completed || 0, localCompleted),
        categoryCounts,
        blockCounts: mergedBlockCounts,
        districtCounts: mergedDistrictCounts,
        todayCount: Math.max(dashboardSummary.todayCount || 0, localTodayCount),
        recentDaysMap: mergedRecentDays
      };
    }

    // Fallback: in-memory computation
    return {
      totalActive: localApps.length,
      pending: localPending,
      inProgress: localInProgress,
      queries: localQueries,
      approved: localApproved,
      bankRejections: localBankRejections,
      completed: localCompleted,
      categoryCounts: localCounts,
      blockCounts: localBlockCounts,
      districtCounts: localDistrictCounts,
      todayCount: localTodayCount,
      recentDaysMap: localRecentDaysMap
    };
  }, [dashboardSummary, applications]);

  // Derived lists
  const allBlocksList = useMemo(() => {
    const set = new Set(ALL_BLOCKS);
    applications.forEach(a => { if (a.block) set.add(a.block.trim()); });
    districts.forEach(d => {
      if (Array.isArray(d.blocks)) {
        d.blocks.forEach(b => set.add(b.trim()));
      }
    });
    return Array.from(set).sort();
  }, [applications, districts]);

  const allAgentsList = useMemo(() => {
    const set = new Set();
    agents.forEach(a => { if (a.name) set.add(a.name.trim()); });
    applications.forEach(a => { if (a.agent) set.add(a.agent.trim()); });
    return Array.from(set).sort();
  }, [agents, applications]);

  // Actions
  const handleOpenAddModal = (defaultService = 'New Card') => {
    setApplicationToEdit(null);
    setDefaultServiceForAdd(defaultService);
    setIsAddEditOpen(true);
  };

  const handleOpenEditModal = (app) => {
    setApplicationToEdit(app);
    setIsAddEditOpen(true);
  };

  const handleOpenViewModal = (app) => {
    setApplicationToView(app);
    setIsViewDetailsOpen(true);
  };

  const handleOpenExportModal = (options = {}) => {
    setExportPreselected(options);
    setIsExportOpen(true);
  };

  const handleSaveApplication = async (formData) => {
    try {
      if (applicationToEdit) {
        const result = await dbUpdateApplication(applicationToEdit.id, formData);
        const updatedRecord = result.record || {
          ...applicationToEdit,
          ...formData,
          updatedAt: new Date().toISOString()
        };

        // 1. Instant 0ms optimistic local state update
        setApplications(prev => prev.map(a => a.id === applicationToEdit.id ? updatedRecord : a));

        // 2. Broadcast to active tables immediately
        try {
          window.dispatchEvent(new CustomEvent('shramiksetu:application_updated', {
            detail: { record: updatedRecord, previous: applicationToEdit }
          }));
        } catch (e) { }

        if (result.completedAndDeleted) {
          showToast('success', `Application for "${formData.applicantName}" marked Completed and removed from active database.`);
        } else {
          showToast('success', `Application for "${formData.applicantName}" updated successfully.`);
        }
      } else {
        const newRecord = await dbAddApplication(formData);

        // 1. Instant 0ms optimistic local state update
        setApplications(prev => [newRecord, ...prev.filter(a => a.id !== newRecord.id)]);

        // 2. Optimistic dashboard stats update (0ms instant)
        setDashboardSummary(prev => {
          if (!prev) return prev;
          const sType = newRecord.serviceType || 'New Card';
          const newCategoryCounts = { ...(prev.categoryCounts || {}) };
          newCategoryCounts[sType] = (newCategoryCounts[sType] || 0) + 1;
          if (sType === 'Card Renewal' || sType === 'Annual Contribution') {
            newCategoryCounts['Card Renewal'] = (newCategoryCounts['Card Renewal'] || 0) + 1;
            newCategoryCounts['Annual Contribution'] = newCategoryCounts['Card Renewal'];
          }
          return {
            ...prev,
            totalActive: (prev.totalActive || 0) + 1,
            pending: (prev.pending || 0) + 1,
            categoryCounts: newCategoryCounts
          };
        });

        // 3. Broadcast to all active module tables so the new row displays immediately (0ms)
        try {
          window.dispatchEvent(new CustomEvent('shramiksetu:application_created', {
            detail: { record: newRecord }
          }));
        } catch (e) { }

        showToast('success', `New application for "${formData.applicantName}" created successfully.`);
      }

      refreshDashboardSummary(true);
      return true;
    } catch (e) {
      showToast('error', `Failed to save: ${e.message}`);
      return false;
    }
  };

  const handleDeleteApplication = async (id, extra = {}) => {
    try {
      // 1. Instant 0ms optimistic local state purge
      const filterOut = (list) => list.filter(a => {
        if (id && a.id === id) return false;
        if (extra.trackNo && a.trackNo === extra.trackNo) return false;
        if (extra.cardNo && a.cardNo && a.cardNo === extra.cardNo) return false;
        if (extra.aadhaarNo && a.aadhaarNo && a.aadhaarNo === extra.aadhaarNo) return false;
        return true;
      });

      setApplications(prev => {
        const next = filterOut(prev);
        saveApplications(next);
        return next;
      });
      clearPagedApplicationsCache();

      // Decrement dashboard stats optimistically (0ms)
      setDashboardSummary(prev => {
        if (!prev) return prev;
        const sType = extra.serviceType || 'New Card';
        const newCatCounts = { ...(prev.categoryCounts || {}) };
        if (newCatCounts[sType]) {
          newCatCounts[sType] = Math.max(0, newCatCounts[sType] - 1);
        }
        if (sType === 'Card Renewal' || sType === 'Annual Contribution') {
          newCatCounts['Card Renewal'] = Math.max(0, (newCatCounts['Card Renewal'] || 1) - 1);
          newCatCounts['Annual Contribution'] = newCatCounts['Card Renewal'];
        }
        return {
          ...prev,
          totalActive: Math.max(0, (prev.totalActive || 1) - 1),
          pending: Math.max(0, (prev.pending || 1) - 1),
          categoryCounts: newCatCounts
        };
      });

      // 2. Broadcast delete to active module tables immediately (0ms)
      try {
        window.dispatchEvent(new CustomEvent('shramiksetu:application_deleted', {
          detail: { id, trackNo: extra.trackNo }
        }));
      } catch (e) { }

      showToast('success', 'Application deleted successfully.');

      // 3. Non-blocking asynchronous cloud deletion
      dbDeleteApplication(id, extra);
      refreshDashboardSummary(true);
      return true;
    } catch (e) {
      showToast('error', `Failed to delete: ${e.message}`);
      return false;
    }
  };

  /**
   * HIGH-SPEED TARGETED STATUS UPDATE
   * Mutates local state in place and invokes lightweight targeted backend API. Zero whole-database reloading.
   */
  const handleUpdateStatus = async (id, newStatus, remarks, serviceType) => {
    try {
      // Optimistic in-place update
      setApplications(prev => prev.map(a => {
        if (a.id === id) {
          return {
            ...a,
            status: newStatus,
            remarks: remarks !== undefined ? remarks : a.remarks,
            officer: remarks !== undefined ? remarks : a.officer
          };
        }
        return a;
      }));

      // Broadcast update to table immediately
      try {
        window.dispatchEvent(new CustomEvent('shramiksetu:application_updated', {
          detail: { record: { id, status: newStatus, remarks } }
        }));
      } catch (e) { }

      await updateApplicationStatusTargeted(
        id,
        newStatus,
        remarks,
        serviceType,
        user?.fullName || 'Operator',
        user?.role || 'Staff'
      );

      // Asynchronously refresh summary metrics
      refreshDashboardSummary();
      showToast('success', `Status updated to "${newStatus}".`);
    } catch (e) {
      showToast('error', `Failed to update status: ${e.message}`);
    }
  };

  const handleBulkComplete = async (ids) => {
    try {
      let count = 0;
      for (const id of ids) {
        await updateApplicationStatusTargeted(id, 'Completed');
        count++;
      }
      refreshData();
      showToast('success', `${count} applications marked Completed.`);
    } catch (e) {
      showToast('error', `Bulk update failed: ${e.message}`);
    }
  };

  const handleImportSuccess = async (items) => {
    try {
      const count = await dbBatchImportApplications(items);
      refreshData();
      showToast('success', `Successfully imported ${count} applications!`);
    } catch (e) {
      showToast('error', `Import failed: ${e.message}`);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all application data?')) {
      dbClearAllData();
      refreshData();
      showToast('info', 'All application data has been wiped.');
    }
  };

  // Districts management
  const handleAddDistrict = (districtData) => {
    const current = [...districts];
    const newDist = {
      id: `dist-${Date.now()}`,
      name: districtData.name,
      code: districtData.code || '',
      headquarter: districtData.headquarter || '',
      blocks: districtData.blocks || []
    };
    current.push(newDist);
    saveDistricts(current);
    setDistricts(current);
    showToast('success', `District "${districtData.name}" added successfully.`);
  };

  const handleAddBlockToDistrict = (districtId, blockName) => {
    const current = districts.map(d => {
      if (d.id === districtId || d.name === districtId) {
        const blocks = Array.from(new Set([...(d.blocks || []), blockName.trim()]));
        return { ...d, blocks };
      }
      return d;
    });
    saveDistricts(current);
    setDistricts(current);
    showToast('success', `Block "${blockName}" added.`);
  };

  // Agent Management
  const handleAddAgent = (agentData) => {
    try {
      const newAgent = dbAddAgent(agentData);
      setAgents(prev => [newAgent, ...prev]);
      showToast('success', `Field agent "${agentData.name}" registered successfully.`);
      return newAgent;
    } catch (e) {
      showToast('error', `Failed to add agent: ${e.message}`);
      return null;
    }
  };

  const handleUpdateAgent = (id, updates) => {
    try {
      const updated = dbUpdateAgent(id, updates);
      if (updated) {
        setAgents(prev => prev.map(a => a.id === id ? updated : a));
        showToast('success', `Agent "${updated.name}" updated successfully.`);
      }
      return updated;
    } catch (e) {
      showToast('error', `Failed to update agent: ${e.message}`);
      return null;
    }
  };

  const handleDeleteAgent = (id) => {
    try {
      const filtered = dbDeleteAgent(id);
      setAgents(filtered);
      showToast('info', 'Agent removed successfully.');
    } catch (e) {
      showToast('error', `Failed to delete agent: ${e.message}`);
    }
  };

  // Marriage Verifications Management
  const handleAddMarriageVerification = (data) => {
    try {
      const newRecord = dbAddMarriageVerification(data);
      setMarriageVerifications(prev => [newRecord, ...prev.filter(m => m.id !== newRecord.id)]);
      try {
        window.dispatchEvent(new CustomEvent('shramiksetu:marriage_verify_added', { detail: { record: newRecord } }));
      } catch (e) { }
      showToast('success', `Marriage verification record added for "${newRecord.beneficiaryName}".`);
      return newRecord;
    } catch (e) {
      showToast('error', `Failed to add marriage verification: ${e.message}`);
      return null;
    }
  };

  const handleUpdateMarriageVerification = (id, updates) => {
    try {
      const updated = dbUpdateMarriageVerification(id, updates);
      if (updated) {
        setMarriageVerifications(prev => prev.map(r => r.id === id ? updated : r));
        try {
          window.dispatchEvent(new CustomEvent('shramiksetu:marriage_verify_updated', { detail: { record: updated } }));
        } catch (e) { }
        showToast('success', `Marriage verification record updated.`);
      }
      return updated;
    } catch (e) {
      showToast('error', `Failed to update marriage verification: ${e.message}`);
      return null;
    }
  };

  const handleDeleteMarriageVerification = (id) => {
    try {
      const filtered = dbDeleteMarriageVerification(id);
      setMarriageVerifications(filtered);
      try {
        window.dispatchEvent(new CustomEvent('shramiksetu:marriage_verify_deleted', { detail: { id } }));
      } catch (e) { }
      showToast('info', 'Marriage verification entry deleted.');
    } catch (e) {
      showToast('error', `Failed to delete: ${e.message}`);
    }
  };

  const gasUrl = getGoogleScriptUrl();

  return (
    <AppContext.Provider
      value={{
        // Authentication & Security
        user,
        isAuthenticated,
        handleLogin,
        handleLogout,
        isLogoutConfirmOpen,
        setIsLogoutConfirmOpen,
        cancelLogout,
        isTerminalLocked,
        lockTerminal,
        unlockTerminal,
        auditLogs,
        recordAudit,
        clearAudit,
        isSessionTrackerOpen,
        setIsSessionTrackerOpen,
        sessionDuration,

        // Data & Caching
        applications,
        districts,
        agents,
        allBlocksList,
        allAgentsList,
        stats,
        dashboardSummary,
        isSummaryLoading,
        refreshDashboardSummary,
        fetchApplicationsPaged,
        pendingSyncCount,
        gasUrl,

        // Layout
        sidebarCollapsed,
        setSidebarCollapsed,
        mobileSidebarOpen,
        setMobileSidebarOpen,
        toast,
        showToast,
        clearToast,

        // Modals
        isAddEditOpen,
        setIsAddEditOpen,
        applicationToEdit,
        defaultServiceForAdd,
        handleOpenAddModal,
        handleOpenEditModal,
        isViewDetailsOpen,
        setIsViewDetailsOpen,
        applicationToView,
        handleOpenViewModal,
        isExportOpen,
        setIsExportOpen,
        exportPreselected,
        handleOpenExportModal,
        isImportOpen,
        setIsImportOpen,
        isGoogleOpen,
        setIsGoogleOpen,
        isAddAgentOpen,
        setIsAddAgentOpen,

        // CRUD Operations
        handleSaveApplication,
        handleDeleteApplication,
        handleUpdateStatus,
        handleBulkComplete,
        handleImportSuccess,
        handleClearAll,
        handleAddDistrict,
        handleAddBlockToDistrict,
        handleAddAgent,
        handleUpdateAgent,
        handleDeleteAgent,
        marriageVerifications,
        handleAddMarriageVerification,
        handleUpdateMarriageVerification,
        handleDeleteMarriageVerification,
        refreshData
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
