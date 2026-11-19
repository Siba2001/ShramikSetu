import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  ExternalLink, 
  PlusCircle, 
  FileDown, 
  FileUp, 
  Database, 
  User, 
  Building2,
  Bell,
  LogOut,
  ShieldCheck,
  ChevronDown,
  Clock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Navbar({ pageTitle = 'Dashboard' }) {
  const { 
    sidebarCollapsed, 
    setSidebarCollapsed, 
    setMobileSidebarOpen,
    handleOpenAddModal, 
    handleOpenExportModal, 
    setIsImportOpen, 
    setIsGoogleOpen,
    gasUrl,
    stats,
    user,
    handleLogout,
    setIsSessionTrackerOpen,
    sessionDuration,
    lockTerminal
  } = useApp();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      
      {/* Left: Mobile Menu Toggle & Title / Breadcrumbs */}
      <div className="flex items-center space-x-3">
        
        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span>ShramikSetu</span>
            <span>/</span>
            <span className="font-semibold text-slate-600">{pageTitle}</span>
          </div>
          <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight leading-tight">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        
        {/* Import Excel Button */}
        <button
          onClick={() => setIsImportOpen(true)}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-2xs"
          title="Import Excel or CSV"
        >
          <FileUp className="w-4 h-4 text-slate-500" />
          <span>Import</span>
        </button>

        {/* Download Block Data Button */}
        <button
          onClick={() => handleOpenExportModal()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs"
          title="Export Block Data in Excel or CSV"
        >
          <FileDown className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Add Application Button */}
        <button
          onClick={() => handleOpenAddModal('New Card')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all shadow-sm shadow-blue-500/20"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Entry</span>
        </button>

        {/* Authenticated User Menu */}
        <div className="relative pl-2 border-l border-slate-200" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2.5 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-left focus:outline-none"
            title="Account & Security"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 border border-blue-400 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {user?.avatar || 'AD'}
            </div>
            <div className="hidden xl:block text-left leading-tight">
              <div className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
                {user?.fullName || 'Administrator'}
              </div>
              <div className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">
                {user?.role?.split(' ')[0] || 'Admin'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden xl:block" />
          </button>

          {/* User Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-scale-in">
              <div className="px-3.5 py-2.5 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {user?.fullName || 'System Administrator'}
                </div>
              </div>

              <div className="p-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

    </header>
  );
}

