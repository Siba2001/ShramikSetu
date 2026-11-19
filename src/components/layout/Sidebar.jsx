import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Files, 
  ChevronDown, 
  ChevronRight, 
  FilePlus, 
  CreditCard, 
  CalendarClock, 
  HeartHandshake, 
  Baby, 
  Cross, 
  GraduationCap, 
  Database, 
  UserCheck, 
  Archive, 
  Settings, 
  ExternalLink,
  ChevronLeft,
  X,
  LogOut
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Sidebar() {
  const { 
    sidebarCollapsed, 
    setSidebarCollapsed, 
    mobileSidebarOpen, 
    setMobileSidebarOpen,
    stats,
    agents,
    setIsGoogleOpen,
    user,
    handleLogout
  } = useApp();

  const location = useLocation();

  // Submenu expansion states
  const [appsMenuOpen, setAppsMenuOpen] = useState(
    location.pathname.startsWith('/applications') || location.pathname === '/'
  );

  const closeMobile = () => setMobileSidebarOpen(false);

  // NavLink active class helper
  const getNavLinkClass = ({ isActive }) => `
    flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group relative
    ${isActive 
      ? 'bg-blue-600 text-white shadow-sm font-semibold' 
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }
  `;

  const getSubNavLinkClass = ({ isActive }) => `
    flex items-center justify-between pl-9 pr-3 py-1.5 rounded-lg text-xs transition-all
    ${isActive 
      ? 'text-blue-600 font-bold bg-blue-50/80 border-r-2 border-blue-600' 
      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium'
    }
  `;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div 
          onClick={closeMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'w-20' : 'w-64'}
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm shadow-blue-500/30 shrink-0">
              ଶ୍ର
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <span className="font-extrabold text-slate-900 text-base tracking-tight truncate block">
                  Shramik<span className="text-blue-600">Setu</span>
                </span>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={closeMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          
          {/* Main Section */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Overview
              </div>
            )}

            {/* Dashboard */}
            <NavLink
              to="/dashboard"
              onClick={closeMobile}
              className={getNavLinkClass}
              title="Dashboard"
            >
              <div className="flex items-center space-x-3">
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span>Dashboard</span>}
              </div>
              {!sidebarCollapsed && stats.totalActive > 0 && (
                <span className="text-[10.5px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
                  {stats.totalActive}
                </span>
              )}
            </NavLink>
          </div>

          {/* Module-Wise Applications Section */}
          <div className="space-y-1">
            {!sidebarCollapsed ? (
              <button
                type="button"
                onClick={() => setAppsMenuOpen(!appsMenuOpen)}
                className="w-full flex items-center justify-between px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 py-1"
              >
                <span>Application Modules</span>
                {appsMenuOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <div className="h-px bg-slate-200 my-2" />
            )}

            {/* Submenu Items */}
            {(appsMenuOpen || sidebarCollapsed) && (
              <div className="space-y-0.5">
                
                {/* 1. New Shramik Card */}
                <NavLink
                  to="/applications/new-card"
                  onClick={closeMobile}
                  className={sidebarCollapsed ? getNavLinkClass : getSubNavLinkClass}
                  title="New Shramik Card"
                >
                  <div className="flex items-center space-x-2.5">
                    <FilePlus className="w-4 h-4 shrink-0 text-sky-500" />
                    {!sidebarCollapsed && <span>New Card</span>}
                  </div>
                  {!sidebarCollapsed && stats.categoryCounts['New Card'] > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-slate-100 text-slate-600">
                      {stats.categoryCounts['New Card']}
                    </span>
                  )}
                </NavLink>

                {/* 2. Card Renewal / Annual Contribution */}
                <NavLink
                  to="/applications/card-renewal"
                  onClick={closeMobile}
                  className={sidebarCollapsed ? getNavLinkClass : getSubNavLinkClass}
                  title="Card Renewal / Annual Contribution"
                >
                  <div className="flex items-center space-x-2.5">
                    <CreditCard className="w-4 h-4 shrink-0 text-blue-500" />
                    {!sidebarCollapsed && <span>Card Renewal / Contribution</span>}
                  </div>
                  {!sidebarCollapsed && (stats.categoryCounts['Card Renewal'] || 0) + (stats.categoryCounts['Annual Contribution'] || 0) > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-slate-100 text-slate-600">
                      {(stats.categoryCounts['Card Renewal'] || 0) + (stats.categoryCounts['Annual Contribution'] || 0)}
                    </span>
                  )}
                </NavLink>

                {/* 3. Marriage Benefit */}
                <NavLink
                  to="/applications/marriage-benefit"
                  onClick={closeMobile}
                  className={sidebarCollapsed ? getNavLinkClass : getSubNavLinkClass}
                  title="Marriage Benefit"
                >
                  <div className="flex items-center space-x-2.5">
                    <HeartHandshake className="w-4 h-4 shrink-0 text-rose-500" />
                    {!sidebarCollapsed && <span>Marriage Benefit</span>}
                  </div>
                  {!sidebarCollapsed && stats.categoryCounts['Marriage Benefit Apply'] > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-slate-100 text-slate-600">
                      {stats.categoryCounts['Marriage Benefit Apply']}
                    </span>
                  )}
                </NavLink>

                {/* 5. Maternity Benefit */}
                <NavLink
                  to="/applications/maternity-benefit"
                  onClick={closeMobile}
                  className={sidebarCollapsed ? getNavLinkClass : getSubNavLinkClass}
                  title="Maternity Benefit"
                >
                  <div className="flex items-center space-x-2.5">
                    <Baby className="w-4 h-4 shrink-0 text-pink-500" />
                    {!sidebarCollapsed && <span>Maternity Benefit</span>}
                  </div>
                  {!sidebarCollapsed && stats.categoryCounts['Maternity Benefit Apply'] > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-slate-100 text-slate-600">
                      {stats.categoryCounts['Maternity Benefit Apply']}
                    </span>
                  )}
                </NavLink>

                {/* 6. Death Benefit */}
                <NavLink
                  to="/applications/death-benefit"
                  onClick={closeMobile}
                  className={sidebarCollapsed ? getNavLinkClass : getSubNavLinkClass}
                  title="Death Benefit"
                >
                  <div className="flex items-center space-x-2.5">
                    <Cross className="w-4 h-4 shrink-0 text-slate-600" />
                    {!sidebarCollapsed && <span>Death Benefit</span>}
                  </div>
                  {!sidebarCollapsed && stats.categoryCounts['Death Benefit Apply'] > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-slate-100 text-slate-600">
                      {stats.categoryCounts['Death Benefit Apply']}
                    </span>
                  )}
                </NavLink>

                {/* 7. Education Assistance */}
                <NavLink
                  to="/applications/education-assistance"
                  onClick={closeMobile}
                  className={sidebarCollapsed ? getNavLinkClass : getSubNavLinkClass}
                  title="Education Assistance"
                >
                  <div className="flex items-center space-x-2.5">
                    <GraduationCap className="w-4 h-4 shrink-0 text-emerald-500" />
                    {!sidebarCollapsed && <span>Education Grant</span>}
                  </div>
                  {!sidebarCollapsed && stats.categoryCounts['Education Assistance Apply'] > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-slate-100 text-slate-600">
                      {stats.categoryCounts['Education Assistance Apply']}
                    </span>
                  )}
                </NavLink>

              </div>
            )}
          </div>

          {/* Agent Management Section */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Agent Management
              </div>
            )}

            <NavLink
              to="/data/agents"
              onClick={closeMobile}
              className={getNavLinkClass}
              title="Agent Management"
            >
              <div className="flex items-center space-x-3">
                <UserCheck className="w-4 h-4 shrink-0 text-blue-600" />
                {!sidebarCollapsed && <span>Agent Management</span>}
              </div>
            </NavLink>
          </div>

          {/* System Section */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                System & Archive
              </div>
            )}

            {/* Completed Archive */}
            <NavLink
              to="/archive"
              onClick={closeMobile}
              className={getNavLinkClass}
              title="Completed Archive"
            >
              <div className="flex items-center space-x-3">
                <Archive className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span>Completed Archive</span>}
              </div>
              {!sidebarCollapsed && stats.completed > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                  {stats.completed}
                </span>
              )}
            </NavLink>
          </div>

          {/* User Profile & Logout */}
          <div className="pt-2 border-t border-slate-100">
            <div className={`p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between ${
              sidebarCollapsed ? 'flex-col gap-2' : ''
            }`}>
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {user?.avatar || 'AD'}
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {user?.fullName || 'Operator'}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {user?.role?.split(' ')[0] || 'Staff'}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  closeMobile();
                  handleLogout();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Sign Out / Lock Terminal"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* Footer / Collapse Toggle */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between shrink-0">
          {!sidebarCollapsed && (
            <span className="text-[11px] font-medium text-slate-400">
              ShramikSetu System
            </span>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors ml-auto"
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

      </aside>
    </>
  );
}

