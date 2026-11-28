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
  Clock,
  Search
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Navbar({ pageTitle = 'Executive Operations Dashboard' }) {
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
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-2.5 sm:px-4 lg:px-8 shadow-xs">
      
      {/* Left: Mobile Menu Toggle & Title */}
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
        
        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="lg:hidden p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <img
            src="/logo.png"
            alt="ShramikSetu Odisha Nirman Shramik"
            className="h-8 sm:h-10 md:h-11 w-auto object-contain block shrink-0"
          />
          <div className="h-7 w-[1px] bg-slate-200 hidden lg:block shrink-0" />
          <div className="flex flex-col min-w-0">
            <h1 className="text-xs sm:text-sm md:text-base font-bold text-slate-900 tracking-tight leading-tight truncate max-w-[140px] xs:max-w-[220px] sm:max-w-xs md:max-w-md lg:max-w-none">
              {pageTitle === 'Dashboard & Analytics' ? 'Executive Operations Dashboard' : pageTitle}
            </h1>
            <span className="text-[10px] text-slate-400 font-medium hidden lg:block truncate">
              Odisha Building & Other Construction Workers' Welfare Board
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
        
        {/* New Entry Button */}
        <button
          onClick={() => handleOpenAddModal('New Card')}
          className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all shadow-md shadow-blue-500/25 cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          <span className="hidden xs:inline">New Entry</span>
        </button>

        {/* User Profile Block */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 pl-1.5 sm:pl-3 border-l border-slate-200">
          <div className="flex items-center space-x-2">
            {/* Dark Circle Avatar with User Icon */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0B1325] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              <User className="w-4 h-4 text-slate-200" />
            </div>
            <div className="text-left leading-tight hidden md:block">
              <div className="text-xs font-bold text-slate-900 truncate max-w-[120px] lg:max-w-[160px]">
                {user?.fullName || user?.username || 'System Administrator'}
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {user?.role?.toUpperCase().includes('ADMIN') ? 'ADMIN' : (user?.role || 'ADMIN')}
              </div>
            </div>
          </div>

          {/* Red Sign Out Icon Button */}
          <button
            onClick={() => handleLogout()}
            className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>

    </header>
  );
}

