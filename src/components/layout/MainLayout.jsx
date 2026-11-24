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
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export default function MainLayout() {
  const { 
    sidebarCollapsed,
    toast,
    clearToast,
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
    handleLogout,
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
    return 'ShramikSetu Management';
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col font-sans text-slate-800 selection:bg-blue-600 selection:text-white">

      {/* Toast Alert: Top Middle of Screen for All Message Types */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fade-scale max-w-lg w-auto px-4">
          <div className={`pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-xs font-semibold backdrop-blur-md transition-all ${
            toast.type === 'success' 
              ? 'bg-emerald-600 text-white border-emerald-400/80 shadow-emerald-950/25' 
              : toast.type === 'error'
              ? 'bg-rose-600 text-white border-rose-400/80 shadow-rose-950/25'
              : toast.type === 'warning'
              ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-amber-950/20'
              : 'bg-[#0b1329] text-white border-slate-700 shadow-slate-950/40'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-100 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-100 shrink-0" />}
            {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />}
            {(toast.type === 'info' || !toast.type) && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
            <span className="leading-snug">{toast.message}</span>
            {clearToast && (
              <button
                type="button"
                onClick={clearToast}
                className="ml-2 p-0.5 rounded-lg opacity-70 hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Fixed Left Sidebar */}
      <Sidebar />

      {/* Main Content Area (offset by sidebar width on desktop) */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
      }`}>
        
        {/* Top Navbar */}
        <Navbar pageTitle={getPageTitle()} />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200/80 py-3.5 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="font-medium text-slate-600">
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

