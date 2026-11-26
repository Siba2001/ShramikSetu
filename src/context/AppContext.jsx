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
    }, 4000);
  };

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

      // Total duration calculation
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

  // Refresh from storage & sync live data from Google Sheets database
  const refreshData = () => {
    const apps = loadApplications();
    const dists = loadDistricts();
    const ags = loadAgents();
    const mvs = loadMarriageVerifications();
    setApplications(apps);
    setDistricts(dists);
    setAgents(ags);
    setMarriageVerifications(mvs);

    // Sync live applications directly from Google Sheets backend
    fetchFromGoogleSheet().then(liveApps => {
      if (liveApps && Array.isArray(liveApps)) {
        setApplications(liveApps);
      }
    }).catch(err => console.warn('Background applications sync notice:', err));

    // Sync live agents directly from database
    fetchAgentsFromBackend().then(liveAgents => {
      if (liveAgents && Array.isArray(liveAgents)) {
        setAgents(liveAgents);
      }
    }).catch(err => console.warn('Background agent sync notice:', err));

    // Sync marriage verifications directly from database
    fetchMarriageVerificationsFromBackend().then(liveMvs => {
      if (liveMvs && Array.isArray(liveMvs)) {
        setMarriageVerifications(liveMvs);
      }
    }).catch(err => console.warn('Background marriage verifications sync notice:', err));
  };

  useEffect(() => {
    refreshData();

    // Background live sync interval: keeps data fresh in real-time from Google Sheet
    const liveSyncTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchFromGoogleSheet().then(liveApps => {
          if (liveApps && Array.isArray(liveApps)) {
            setApplications(liveApps);
          }
        }).catch(() => {});

        fetchAgentsFromBackend().then(liveAgents => {
          if (liveAgents && Array.isArray(liveAgents)) {
            setAgents(liveAgents);
          }
        }).catch(() => {});

        fetchMarriageVerificationsFromBackend().then(liveMvs => {
          if (liveMvs && Array.isArray(liveMvs)) {
            setMarriageVerifications(liveMvs);
          }
        }).catch(() => {});
      }
    }, 60000);

    return () => clearInterval(liveSyncTimer);
  }, []);

  // Computed Global Stats
  const stats = useMemo(() => {
    const totalActive = applications.length;
    const pending = applications.filter(a => a.status === 'Pending' || a.status === 'E-Sign Pending').length;
    const inProgress = applications.filter(a => a.status === 'In Progress' || a.status === 'Query Replied').length;
    const queries = applications.filter(a => a.status === 'Query Raised').length;
    const approved = applications.filter(a => a.status === 'Approved').length;
    const bankRejections = applications.filter(a => a.status === 'Bank Reject' || a.status === 'Rejected').length;
    const completed = applications.filter(a => a.status === 'Completed').length;

    // Service category breakdown
    const categoryCounts = {
      'New Card': 0,
      'Card Renewal': 0,
      'Annual Contribution': 0,
      'Marriage Benefit Apply': 0,
      'Maternity Benefit Apply': 0,
      'Death Benefit Apply': 0,
      'Education Assistance Apply': 0
    };

    // Block counts
    const blockCounts = {};
    // District counts
    const districtCounts = {};

    applications.forEach(a => {
      const s = a.serviceType || 'New Card';
      categoryCounts[s] = (categoryCounts[s] || 0) + 1;

      const b = a.block || 'General';
      blockCounts[b] = (blockCounts[b] || 0) + 1;

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
      totalActive,
      pending,
      inProgress,
      queries,
      approved,
      bankRejections,
      completed,
      categoryCounts,
      blockCounts,
      districtCounts
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
      await dbDeleteApplication(id, true);
      refreshData();
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
      const updates = { status: newStatus };
      if (remarks) updates.remarks = remarks;
      await dbUpdateApplication(id, updates);
      refreshData();
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
    const created = dbAddMarriageVerification(data);
    setMarriageVerifications(loadMarriageVerifications());
    showToast('success', `Verification entry for "${created.beneficiaryName}" saved.`);
    return created;
  };

  const handleUpdateMarriageVerification = (id, updates) => {
    const updated = dbUpdateMarriageVerification(id, updates);
    setMarriageVerifications(loadMarriageVerifications());
    if (updated) {
      showToast('success', `Verification entry for "${updated.beneficiaryName}" updated.`);
    }
    return updated;
  };

  const handleDeleteMarriageVerification = (id) => {
    dbDeleteMarriageVerification(id);
    setMarriageVerifications(loadMarriageVerifications());
    showToast('info', 'Verification entry deleted.');
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
