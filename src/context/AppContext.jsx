import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  loadApplications,
  saveApplications,
  loadArchivedApplications,
  saveArchivedApplications,
  loadDistricts,
  saveDistricts,
  loadAgents,
  addAgent as dbAddAgent,
  updateAgent as dbUpdateAgent,
  deleteAgent as dbDeleteAgent,
  addApplication as dbAddApplication,
  updateApplication as dbUpdateApplication,
  deleteApplication as dbDeleteApplication,
  restoreArchivedApplication as dbRestoreArchivedApplication,
  batchImportApplications as dbBatchImportApplications,
  getGoogleScriptUrl,
  clearAllData as dbClearAllData
} from '../services/db';
import { getCurrentUser, loginUser, logoutUser } from '../services/auth';
import { exportApplications } from '../utils/exportUtils';
import { ALL_BLOCKS } from '../data/locationData';

const AppContext = createContext();

export function AppProvider({ children }) {
  // Authentication & Security state
  const [user, setUser] = useState(() => getCurrentUser());
  const isAuthenticated = Boolean(user && user.token);

  const [applications, setApplications] = useState([]);
  const [archivedApplications, setArchivedApplications] = useState([]);
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

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Auth actions
  const handleLogin = (username, password, remember) => {
    const res = loginUser(username, password, remember);
    if (res.success) {
      setUser(res.user);
      showToast('success', `Welcome back, ${res.user.fullName}!`);
    }
    return res;
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    showToast('info', 'You have been safely logged out.');
  };

  // Refresh from storage
  const refreshData = () => {
    const apps = loadApplications();
    const arch = loadArchivedApplications();
    const dists = loadDistricts();
    const ags = loadAgents();
    setApplications(apps);
    setArchivedApplications(arch);
    setDistricts(dists);
    setAgents(ags);
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
    const completed = archivedApplications.length;

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
  }, [applications, archivedApplications]);

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
      showToast('info', 'Application moved to archive.');
    } catch (e) {
      showToast('error', `Failed to delete: ${e.message}`);
    }
  };

  const handleUpdateStatus = async (id, newStatus, remarks) => {
    try {
      const updates = { status: newStatus };
      if (remarks) updates.remarks = remarks;
      const result = await dbUpdateApplication(id, updates);
      refreshData();
      if (result.completedAndDeleted) {
        showToast('success', `Status set to Completed: Record removed from active database.`);
      } else {
        showToast('success', `Status updated to "${newStatus}".`);
      }
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
      showToast('success', `${count} applications marked Completed and removed.`);
    } catch (e) {
      showToast('error', `Bulk update failed: ${e.message}`);
    }
  };

  const handleRestoreArchived = async (id) => {
    try {
      await dbRestoreArchivedApplication(id);
      refreshData();
      showToast('success', 'Application restored to active database.');
    } catch (e) {
      showToast('error', `Restore failed: ${e.message}`);
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
    const created = dbAddAgent(agentData);
    refreshData();
    showToast('success', `Agent "${created.name}" added successfully.`);
    return created;
  };

  const handleUpdateAgent = (id, updates) => {
    const updated = dbUpdateAgent(id, updates);
    refreshData();
    showToast('success', `Agent "${updated.name}" updated successfully.`);
    return updated;
  };

  const handleDeleteAgent = (id) => {
    dbDeleteAgent(id);
    refreshData();
    showToast('info', 'Agent removed successfully.');
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
        applications,
        archivedApplications,
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
        handleRestoreArchived,
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

