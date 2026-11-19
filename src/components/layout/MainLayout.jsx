import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import AddEditModal from '../AddEditModal';
import ExportModal from '../ExportModal';
import ImportModal from '../ImportModal';
import GoogleSheetModal from '../GoogleSheetModal';
import ViewDetailsModal from '../ViewDetailsModal';
import AddAgentModal from '../AddAgentModal';
import SessionLockModal from '../auth/SessionLockModal';
import SessionTrackerModal from '../auth/SessionTrackerModal';
import LogoutConfirmModal from '../auth/LogoutConfirmModal';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function MainLayout() {
  const { 
    sidebarCollapsed,
    toast,
    isAddEditOpen,
    setIsAddEditOpen,
    applicationToEdit,
    defaultServiceForAdd,
    handleSaveApplication,
    isExportOpen,
    setIsExportOpen,
    exportPreselected,
    applications,
    isImportOpen,
    setIsImportOpen,
    handleImportSuccess,
    isGoogleOpen,
    setIsGoogleOpen,
    isAddAgentOpen,
    setIsAddAgentOpen,
    isSessionTrackerOpen,
    setIsSessionTrackerOpen,
    refreshData
  } = useApp();

  const location = useLocation();

  // Determine current page title from pathname
  const getPageTitle = () => {
    const p = location.pathname;
    if (p === '/' || p === '/dashboard') return 'Dashboard & Analytics';
    if (p === '/applications/new-card') return 'New Shramik Card Applications';
    if (p === '/applications/card-renewal') return 'Card Renewal / Annual Contribution';
    if (p === '/applications/marriage-benefit') return 'Marriage Benefit Applications';
    if (p === '/applications/maternity-benefit') return 'Maternity Benefit Applications';
    if (p === '/applications/death-benefit') return 'Death Benefit Assistance';
    if (p === '/applications/education-assistance') return 'Education Assistance Grants';
    if (p === '/data/agents') return 'Agent / Worker Management';
    if (p === '/archive') return 'Completed Applications Archive';
    return 'ShramikSetu Management';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-bounce-subtle">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold ${
            toast.type === 'success' 
              ? 'bg-emerald-600 text-white border-emerald-500' 
              : toast.type === 'error'
              ? 'bg-rose-600 text-white border-rose-500'
              : 'bg-slate-800 text-white border-slate-700'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4" />}
            {toast.type === 'info' && <Info className="w-4 h-4" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Fixed Left Sidebar */}
      <Sidebar />

      {/* Main Content Area (offset by sidebar width on desktop) */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
      }`}>
        
        {/* Top Navbar */}
        <Navbar pageTitle={getPageTitle()} />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-3.5 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            ShramikSetu Management System • Beneficiary Operations Portal
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span>Odisha Building &amp; Other Construction Workers' Welfare Board</span>
          </div>
        </footer>

      </div>

      {/* Global Modals */}
      <AddEditModal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        onSave={handleSaveApplication}
        applicationToEdit={applicationToEdit}
        defaultService={defaultServiceForAdd}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        applications={applications}
        preselected={exportPreselected}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      <GoogleSheetModal
        isOpen={isGoogleOpen}
        onClose={() => setIsGoogleOpen(false)}
        onSyncComplete={refreshData}
      />

      <ViewDetailsModal />

      <AddAgentModal
        isOpen={isAddAgentOpen}
        onClose={() => setIsAddAgentOpen(false)}
      />

      {/* Logout Confirmation Permission Modal */}
      <LogoutConfirmModal />

      {/* Session Security Modals */}
      <SessionLockModal />
      <SessionTrackerModal
        isOpen={isSessionTrackerOpen}
        onClose={() => setIsSessionTrackerOpen(false)}
      />

    </div>
  );
}

