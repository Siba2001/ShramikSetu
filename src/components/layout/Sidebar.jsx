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

  // NavLink active class helper (Matching Executive Theme from Screenshot)
  const getNavLinkClass = ({ isActive }) => `
    flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all group relative
    ${isActive
      ? 'border border-amber-400/40 bg-amber-400/10 text-amber-300 font-bold shadow-xs'
      : 'text-slate-400 hover:text-white hover:bg-slate-800/40 font-medium'
    }
  `;

  const getSubNavLinkClass = ({ isActive }) => `
    flex items-center justify-between pl-8 pr-3 py-1.5 rounded-lg text-xs transition-all
    ${isActive
      ? 'text-amber-300 font-bold bg-amber-400/10 border-r-2 border-amber-400'
      : 'text-slate-400 hover:text-white hover:bg-slate-800/40 font-medium'
    }
  `;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={closeMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container - Executive Deep Navy Theme */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#0B1325] border-r border-[#152347] transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'w-20' : 'w-64'}
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-[#152347] flex items-center justify-between bg-[#0B1325] shrink-0">
          <div className="flex items-center space-x-3 overflow-hidden">
            {/* Golden Monogram Emblem */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-xs shadow-sm shadow-amber-500/20 shrink-0">
              SS
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <span className="font-extrabold text-amber-400 text-sm tracking-wider uppercase truncate block">
                  SHRAMIK<span className="text-white ml-1">SETU</span>
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Arrow < */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800/60 transition-colors"
            title={sidebarCollapsed ? 'Expand' : 'Collapse'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={closeMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">

          {/* CORE Section */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                CORE
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
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#142348] text-slate-300">
                  {stats.totalActive}
                </span>
              )}
            </NavLink>
          </div>

          {/* OPERATIONS Section */}
          <div className="space-y-1">
            {!sidebarCollapsed ? (
              <button
                type="button"
                onClick={() => setAppsMenuOpen(!appsMenuOpen)}
                className="w-full flex items-center justify-between px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 py-1"
              >
                <span>OPERATIONS</span>
                {appsMenuOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <div className="w-full border-t border-slate-800 my-2" />
            )}

            {/* Submenu Links */}
            {(appsMenuOpen || sidebarCollapsed) && (
              <div className="space-y-1">

                {/* 1. New Card */}
                <NavLink
                  to="/applications/new-card"
                  onClick={closeMobile}
                  className={sidebarCollapsed ? getNavLinkClass : getSubNavLinkClass}
                  title="New Card Application"
                >
                  <div className="flex items-center space-x-2.5">
                    <FilePlus className="w-4 h-4 shrink-0 text-sky-400" />
                    {!sidebarCollapsed && <span>New Card Inward</span>}
                  </div>
                  {!sidebarCollapsed && stats.categoryCounts['New Card'] > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-[#142348] text-slate-300">
                      {stats.categoryCounts['New Card']}
                    </span>
                  )}
                </NavLink>

                {/* 2. Renewal / Contribution */}
                <NavLink
                  to="/applications/card-renewal"
                  onClick={closeMobile}
                  className={sidebarCollapsed ? getNavLinkClass : getSubNavLinkClass}
                  title="Card Renewal / Contribution"
                >
                  <div className="flex items-center space-x-2.5">
                    <CreditCard className="w-4 h-4 shrink-0 text-blue-400" />
                    {!sidebarCollapsed && <span>Card Renewal</span>}
                  </div>
                  {!sidebarCollapsed && (stats.categoryCounts['Card Renewal'] || 0) + (stats.categoryCounts['Annual Contribution'] || 0) > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-[#142348] text-slate-300">
                      {(stats.categoryCounts['Card Renewal'] || 0) + (stats.categoryCounts['Annual Contribution'] || 0)}
                    </span>
                  )}
                </NavLink>

                {/* 3. Marriage */}
                <NavLink
                  to="/applications/marriage-benefit"
                  onClick={closeMobile}
                  className={sidebarCollapsed ? getNavLinkClass : getSubNavLinkClass}
                  title="Marriage Benefit"
                >
                  <div className="flex items-center space-x-2.5">
                    <HeartHandshake className="w-4 h-4 shrink-0 text-rose-400" />
                    {!sidebarCollapsed && <span>Marriage Benefit</span>}
                  </div>
                  {!sidebarCollapsed && stats.categoryCounts['Marriage Benefit Apply'] > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-[#142348] text-slate-300">
                      {stats.categoryCounts['Marriage Benefit Apply']}
                    </span>
                  )}
                </NavLink>

                {/* 4. Maternity */}
                <NavLink
                  to="/applications/maternity-benefit"
                  onClick={closeMobile}
                  className={sidebarCollapsed ? getNavLinkClass : getSubNavLinkClass}
                  title="Maternity Benefit"
                >
                  <div className="flex items-center space-x-2.5">
                    <Baby className="w-4 h-4 shrink-0 text-pink-400" />
                    {!sidebarCollapsed && <span>Maternity Benefit</span>}
                  </div>
                  {!sidebarCollapsed && stats.categoryCounts['Maternity Benefit Apply'] > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-[#142348] text-slate-300">
                      {stats.categoryCounts['Maternity Benefit Apply']}
                    </span>
                  )}
                </NavLink>

                {/* 5. Death */}
                <NavLink
                  to="/applications/death-benefit"
                  onClick={closeMobile}
                  className={sidebarCollapsed ? getNavLinkClass : getSubNavLinkClass}
                  title="Death Benefit"
                >
                  <div className="flex items-center space-x-2.5">
                    <Cross className="w-4 h-4 shrink-0 text-slate-400" />
                    {!sidebarCollapsed && <span>Death Benefit</span>}
                  </div>
                  {!sidebarCollapsed && stats.categoryCounts['Death Benefit Apply'] > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-[#142348] text-slate-300">
                      {stats.categoryCounts['Death Benefit Apply']}
                    </span>
                  )}
                </NavLink>

                {/* 6. Education */}
                <NavLink
                  to="/applications/education-assistance"
                  onClick={closeMobile}
                  className={sidebarCollapsed ? getNavLinkClass : getSubNavLinkClass}
                  title="Education Assistance"
                >
                  <div className="flex items-center space-x-2.5">
                    <GraduationCap className="w-4 h-4 shrink-0 text-emerald-400" />
                    {!sidebarCollapsed && <span>Education Grant</span>}
                  </div>
                  {!sidebarCollapsed && stats.categoryCounts['Education Assistance Apply'] > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-[#142348] text-slate-300">
                      {stats.categoryCounts['Education Assistance Apply']}
                    </span>
                  )}
                </NavLink>

              </div>
            )}
          </div>

          {/* MANAGEMENT Section */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                MANAGEMENT
              </div>
            )}

            {/* Agent Management */}
            <NavLink
              to="/data/agents"
              onClick={closeMobile}
              className={getNavLinkClass}
              title="Agent Management"
            >
              <div className="flex items-center space-x-3">
                <UserCheck className="w-4 h-4 shrink-0 text-amber-400" />
                {!sidebarCollapsed && <span>Agent Management</span>}
              </div>
            </NavLink>
          </div>

        </div>

        {/* User Profile in Sidebar Footer (Matching Screenshot) */}
        <div className="p-3 border-t border-[#152347] bg-[#080F1E] shrink-0">
          <div className={`flex items-center justify-between ${sidebarCollapsed ? 'flex-col gap-2' : ''}`}>
            <div className="flex items-center space-x-2.5 min-w-0">
              {/* Golden circular avatar */}
              <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                {(user?.fullName || user?.username || 'System Administrator').slice(0, 1).toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate max-w-[130px]">
                    {user?.fullName || user?.username || 'System Administrator'}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {user?.role || 'ADMIN'}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                closeMobile();
                handleLogout();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </aside>
    </>
  );
}