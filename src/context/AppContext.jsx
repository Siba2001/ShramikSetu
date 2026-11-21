import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  loadApplications,
  saveApplications,
  loadDistricts,
  saveDistricts,
  loadAgents,
  fetchAgentsFromBackend,
  fetchFromGoogleSheet,
  addAgent as dbAddAgent,
  updateAgent as dbUpdateAgent,
  deleteAgent as dbDeleteAgent,
  addApplication as dbAddApplication,
  updateApplication as dbUpdateApplication,
  deleteApplication as dbDeleteApplication,
  batchImportApplications as dbBatchImportApplications,
  getGoogleScriptUrl,
  clearAllData as dbClearAllData
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
  updateSessionLastActive
} from '../services/auth';
import { exportApplications } from '../utils/exportUtils';
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

  const [applications, setApplications] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [agents, setAgents] = useState([]);
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

  const showToast = (type, message) => {
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

  const handleLogout = (force = false) => {
    if (!force) {
      setIsLogoutConfirmOpen(true);
      return;
    }
    logoutUser();
    setUser(null);
    setIsTerminalLocked(false);
    setIsLogoutConfirmOpen(false);
    showToast('info', 'You have been safely logged out.');
  };

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

    // Live Clock Interval for internal duration display
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
      clearInterval(interval);
    };
  }, [isAuthenticated, user?.loginAt]);

  // Refresh from storage & sync live data from Google Sheets database
  const refreshData = () => {
    const apps = loadApplications();
    const dists = loadDistricts();
    const ags = loadAgents();
    setApplications(apps);
    setDistricts(dists);
    setAgents(ags);

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
  };

  useEffect(() => {
    refreshData();
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

      const d = a.district || 'Ganjam';
      districtCounts[d] = (districtCounts[d] || 0) + 1;
    });

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
  }, [applications]);

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
        if (result.completedAndDeleted) {
          showToast('success', `Application for "${formData.applicantName}" marked Completed and removed from active database.`);
        } else {
          showToast('success', `Application for "${formData.applicantName}" updated successfully.`);
        }
      } else {
        await dbAddApplication(formData);
        showToast('success', `New application for "${formData.applicantName}" created successfully.`);
      }
      refreshData();
      return true;
    } catch (e) {
      showToast('error', `Failed to save: ${e.message}`);
      return false;
    }
  };

  const handleDeleteApplication = async (id) => {
    try {
      await dbDeleteApplication(id, true);
      refreshData();
      showToast('success', 'Application deleted successfully.');
    } catch (e) {
      showToast('error', `Failed to delete: ${e.message}`);
    }
  };

  const handleUpdateStatus = async (id, newStatus, remarks) => {
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
        await dbUpdateApplication(id, { status: 'Completed' });
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

  // Agent Management (100% Database Connected with Instant Optimistic UI)
  const handleAddAgent = (agentData) => {
    const created = dbAddAgent(agentData);
    setAgents(loadAgents());
    showToast('success', `Agent "${created.name}" saved to database.`);
    return created;
  };

  const handleUpdateAgent = (id, updates) => {
    const updated = dbUpdateAgent(id, updates);
    setAgents(loadAgents());
    if (updated) {
      showToast('success', `Agent "${updated.name}" updated in database.`);
    }
    return updated;
  };

  const handleDeleteAgent = (id) => {
    dbDeleteAgent(id);
    setAgents(loadAgents());
    showToast('info', 'Agent removed from database.');
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
        gasUrl,
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
        // CRUD
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

