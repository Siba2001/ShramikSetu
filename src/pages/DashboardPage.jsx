import React, { useMemo, useState, useEffect } from 'react';
import { 
  FileText, 
  Clock, 
  Layers, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  TrendingUp, 
  Building2, 
  MapPin, 
  Calendar, 
  Phone, 
  PlusCircle, 
  FileDown,
  Eye,
  CreditCard,
  HeartHandshake,
  Baby,
  Cross,
  GraduationCap,
  Activity,
  ShieldCheck,
  Check,
  Users,
  RotateCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { 
    applications = [], 
    stats = {}, 
    isSummaryLoading,
    refreshDashboardSummary,
    handleOpenAddModal, 
    handleOpenExportModal, 
    handleOpenViewModal 
  } = useApp();

  const [trendView, setTrendView] = useState('Daily Trend');

  useEffect(() => {
    if (typeof refreshDashboardSummary === 'function') {
      refreshDashboardSummary();
    }
  }, [refreshDashboardSummary]);

  // Safe category counts
  const categoryCounts = stats?.categoryCounts || {};
  const renewalsCount = (categoryCounts['Card Renewal'] || 0) + (categoryCounts['Annual Contribution'] || 0);
  const newCardsCount = categoryCounts['New Card'] || 0;
  const marriageCount = categoryCounts['Marriage Benefit Apply'] || 0;
  const maternityCount = categoryCounts['Maternity Benefit Apply'] || 0;
  const deathCount = categoryCounts['Death Benefit Apply'] || 0;
  const educationCount = categoryCounts['Education Assistance Apply'] || 0;
  const welfareClaimsCount = marriageCount + maternityCount + deathCount + educationCount;

  // Safe applications array
  const safeApplications = Array.isArray(applications) ? applications : [];

  // Today's applications (Prioritizes server summary)
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const todayCount = useMemo(() => {
    if (stats?.todayCount !== undefined && stats.todayCount > 0) return stats.todayCount;
    return safeApplications.filter(a => (a.createdAt || a.applicationDate || '').slice(0, 10) === todayDateStr).length;
  }, [stats?.todayCount, safeApplications, todayDateStr]);

  // Category statistics with routes & colors for ShramikSetu
  const categories = useMemo(() => [
    { name: 'New Card', count: newCardsCount, route: '/applications/new-card', color: '#1E3A8A', label: 'New Card' },
    { name: 'Card Renewal', count: renewalsCount, route: '/applications/card-renewal', color: '#F59E0B', label: 'Card Renewal' },
    { name: 'Marriage Benefit', count: marriageCount, route: '/applications/marriage-benefit', color: '#EC4899', label: 'Marriage' },
    { name: 'Maternity Benefit', count: maternityCount, route: '/applications/maternity-benefit', color: '#8B5CF6', label: 'Maternity' },
    { name: 'Death Benefit', count: deathCount, route: '/applications/death-benefit', color: '#64748B', label: 'Death' },
    { name: 'Education Grant', count: educationCount, route: '/applications/education-assistance', color: '#10B981', label: 'Education' }
  ], [newCardsCount, renewalsCount, marriageCount, maternityCount, deathCount, educationCount]);

  // Scheme share breakdown for donut chart (100% Dynamic - 0 when empty)
  const schemeDonutData = useMemo(() => {
    const total = stats?.totalActive || safeApplications.length;

    const items = [
      { label: 'New Card', count: newCardsCount, color: '#1E3A8A' },
      { label: 'Card Renewal', count: renewalsCount, color: '#F59E0B' },
      { label: 'Welfare Claims', count: welfareClaimsCount, color: '#10B981' }
    ];

    if (total === 0) {
      return items.map(i => ({
        ...i,
        percent: 0
      }));
    }

    return items.map(i => ({
      ...i,
      percent: Math.round((i.count / total) * 100)
    }));
  }, [stats?.totalActive, safeApplications.length, newCardsCount, renewalsCount, welfareClaimsCount]);

  // Daily Trend Data (Prioritizes server-side pre-aggregated daily data)
  const trendData = useMemo(() => {
    if (stats?.recentDaysMap && Object.keys(stats.recentDaysMap).length > 0) {
      const entries = Object.entries(stats.recentDaysMap).sort((a, b) => a[0].localeCompare(b[0]));
      return entries.slice(-10).map(([date, cnt]) => ({ date: date.slice(5), count: cnt }));
    }

    if (safeApplications.length === 0) {
      return [];
    }

    const map = {};
    safeApplications.forEach(a => {
      const d = (a.applicationDate || a.createdAt || '').slice(0, 10);
      if (d) {
        map[d] = (map[d] || 0) + 1;
      }
    });

    const entries = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
    if (entries.length === 0) {
      return [{ date: todayDateStr.slice(5), count: safeApplications.length }];
    }
    return entries.slice(-10).map(([date, cnt]) => ({ date: date.slice(5), count: cnt }));
  }, [stats?.recentDaysMap, safeApplications, todayDateStr]);

  const maxTrendCount = useMemo(() => {
    if (trendData.length === 0) return 10;
    return Math.max(...trendData.map(t => t.count), 5);
  }, [trendData]);

  // Top blocks
  const topBlocks = useMemo(() => {
    return Object.entries(stats?.blockCounts || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [stats?.blockCounts]);

  // Recent applications
  const recentApplications = useMemo(() => {
    return safeApplications.slice(0, 6);
  }, [safeApplications]);

  // SVG Donut calculation (circumference for r=36 is 2 * PI * 36 ≈ 226)
  const circumference = 226;
  const strokeSegments = useMemo(() => {
    const total = stats?.totalActive || safeApplications.length;
    if (total === 0) {
      return [];
    }
    let accumulatedPercent = 0;
    return schemeDonutData
      .filter(item => item.percent > 0)
      .map(item => {
        const segLength = (item.percent / 100) * circumference;
        const offset = -(accumulatedPercent / 100) * circumference;
        accumulatedPercent += item.percent;
        return {
          ...item,
          dashArray: `${Math.max(0, segLength)} ${circumference}`,
          dashOffset: offset
        };
      });
  }, [schemeDonutData, stats?.totalActive, safeApplications.length]);

  return (
    <div className="space-y-5 animate-fadeIn">
      

      {/* ======================================================== */}
      {/* 8 KPI STAT CARDS (2 ROWS OF 4 CARDS) - SHRAMIKSETU DATA   */}
      {/* ======================================================== */}

      {/* ROW 1: 4 Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* 1. TOTAL BENEFICIARIES */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/70 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                TOTAL BENEFICIARIES
              </span>
            </div>
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-blue-50 text-blue-600 shrink-0">
              {stats?.totalActive || 0}
            </span>
          </div>

          <div className="my-1.5 sm:my-2.5">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-mono">
              {stats?.totalActive || 0}
            </div>
          </div>

          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
              Registered Master Beneficiaries
            </span>
            <svg className="w-10 sm:w-16 h-3.5 sm:h-4 opacity-40 shrink-0" viewBox="0 0 60 16" fill="none">
              <path d="M0 12 Q 15 4, 30 10 T 60 6" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* 2. NEW CARD APPLICATIONS */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/70 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                NEW CARD INWARD
              </span>
            </div>
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-50 text-amber-600 shrink-0">
              {newCardsCount}
            </span>
          </div>

          <div className="my-1.5 sm:my-2.5">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-mono">
              {newCardsCount}
            </div>
          </div>

          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
              New Worker Registrations
            </span>
            <svg className="w-10 sm:w-16 h-3.5 sm:h-4 opacity-40 shrink-0" viewBox="0 0 60 16" fill="none">
              <path d="M0 14 Q 20 6, 40 12 T 60 8" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* 3. CARD RENEWAL / CONTRIBUTION */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/70 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                CARD RENEWALS
              </span>
            </div>
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-emerald-50 text-emerald-600 shrink-0">
              {renewalsCount}
            </span>
          </div>

          <div className="my-1.5 sm:my-2.5">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-mono">
              {renewalsCount}
            </div>
          </div>

          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
              Annual Contribution Cases
            </span>
            <svg className="w-10 sm:w-16 h-3.5 sm:h-4 opacity-40 shrink-0" viewBox="0 0 60 16" fill="none">
              <path d="M0 10 Q 15 14, 35 6 T 60 8" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* 4. APPROVED APPLICATIONS */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/70 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                APPROVED CASES
              </span>
            </div>
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-purple-50 text-purple-600 shrink-0">
              {stats?.approved || 0}
            </span>
          </div>

          <div className="my-1.5 sm:my-2.5">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-mono">
              {stats?.approved || 0}
            </div>
          </div>

          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
              Govt Verified & Sanctioned
            </span>
            <svg className="w-10 sm:w-16 h-3.5 sm:h-4 opacity-40 shrink-0" viewBox="0 0 60 16" fill="none">
              <path d="M0 12 Q 25 4, 45 10 T 60 6" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

      </div>

      {/* ROW 2: 4 Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* 5. PENDING / E-SIGN */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/70 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                PENDING & E-SIGN
              </span>
            </div>
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-sky-50 text-sky-600 shrink-0">
              {stats?.pending || 0}
            </span>
          </div>

          <div className="my-1.5 sm:my-2.5">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-mono">
              {stats?.pending || 0}
            </div>
          </div>

          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
              Awaiting Verification / E-Sign
            </span>
            <svg className="w-10 sm:w-16 h-3.5 sm:h-4 opacity-40 shrink-0" viewBox="0 0 60 16" fill="none">
              <path d="M0 14 Q 20 6, 40 12 T 60 8" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* 6. IN VERIFICATION */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/70 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center shrink-0">
                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                IN VERIFICATION
              </span>
            </div>
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-fuchsia-50 text-fuchsia-600 shrink-0">
              {stats?.inProgress || 0}
            </span>
          </div>

          <div className="my-1.5 sm:my-2.5">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-mono">
              {stats?.inProgress || 0}
            </div>
          </div>

          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
              Under Processing by Officers
            </span>
            <svg className="w-10 sm:w-16 h-3.5 sm:h-4 opacity-40 shrink-0" viewBox="0 0 60 16" fill="none">
              <path d="M0 8 Q 20 16, 40 6 T 60 12" stroke="#D946EF" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* 7. QUERIES RAISED (Q) */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/70 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                QUERIES RAISED (Q)
              </span>
            </div>
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-indigo-50 text-indigo-600 shrink-0">
              {stats?.queries || 0}
            </span>
          </div>

          <div className="my-1.5 sm:my-2.5">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-mono">
              {stats?.queries || 0}
            </div>
          </div>

          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
              Action Required from Field Agent
            </span>
            <svg className="w-10 sm:w-16 h-3.5 sm:h-4 opacity-40 shrink-0" viewBox="0 0 60 16" fill="none">
              <path d="M0 12 Q 15 4, 35 14 T 60 8" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* 8. WELFARE BENEFIT CLAIMS */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/70 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <HeartHandshake className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                WELFARE CLAIMS
              </span>
            </div>
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-teal-50 text-teal-600 shrink-0">
              {welfareClaimsCount}
            </span>
          </div>

          <div className="my-1.5 sm:my-2.5">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-mono">
              {welfareClaimsCount}
            </div>
          </div>

          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
              Marriage, Maternity, Death, Education
            </span>
            <svg className="w-10 sm:w-16 h-3.5 sm:h-4 opacity-40 shrink-0" viewBox="0 0 60 16" fill="none">
              <path d="M0 10 Q 25 14, 45 4 T 60 10" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* CHARTS ROW: BAR CHART (LEFT) + DONUT CHART (RIGHT)       */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        
        {/* Left Card: Application Intake Trends (~65% width) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Date-Wise Application Intake Trends
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Daily volume of applications received across blocks
              </p>
            </div>

            <button 
              onClick={() => setTrendView(v => v === 'Daily Trend' ? 'All Time' : 'Daily Trend')}
              className="px-2.5 sm:px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            >
              {trendView}
            </button>
          </div>

          {/* Dynamic Bar Chart Content */}
          {trendData.length === 0 ? (
            <div className="h-56 w-full flex flex-col items-center justify-center text-center p-4 sm:p-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Calendar className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-700">No application intake recorded yet</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                Daily intake trends and charts will populate dynamically as applications are entered into the database.
              </p>
            </div>
          ) : (
            <div className="h-56 w-full flex flex-col justify-end">
              
              {/* Grid & Bars Container */}
              <div className="relative flex-1 flex items-end justify-between gap-1.5 sm:gap-4 border-b border-slate-200 pb-1">
                
                {/* Horizontal Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-300">
                  <div className="border-b border-dashed border-slate-100 w-full flex items-center justify-between pr-2">
                    <span>{maxTrendCount}</span>
                  </div>
                  <div className="border-b border-dashed border-slate-100 w-full flex items-center justify-between pr-2">
                    <span>{Math.round(maxTrendCount * 0.75)}</span>
                  </div>
                  <div className="border-b border-dashed border-slate-100 w-full flex items-center justify-between pr-2">
                    <span>{Math.round(maxTrendCount * 0.50)}</span>
                  </div>
                  <div className="border-b border-dashed border-slate-100 w-full flex items-center justify-between pr-2">
                    <span>{Math.round(maxTrendCount * 0.25)}</span>
                  </div>
                  <div className="flex items-center justify-between pr-2 text-slate-400">
                    <span>0</span>
                  </div>
                </div>

                {/* Bars */}
                {trendData.map((item, idx) => {
                  const heightPercent = maxTrendCount > 0 
                    ? Math.max(8, Math.min(100, Math.round((item.count / maxTrendCount) * 100))) 
                    : 0;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full z-10 group relative">
                      {/* Tooltip on Hover */}
                      <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                        {item.count} applications
                      </div>

                      {/* Bar */}
                      <div 
                        className="w-full max-w-[14px] sm:max-w-[22px] bg-[#1E3A8A] hover:bg-[#172554] rounded-t-sm transition-all duration-300"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* X-Axis Date Labels */}
              <div className="flex items-center justify-between pt-2 text-[9px] sm:text-[10px] text-slate-400 font-mono overflow-hidden">
                {trendData.map((item, idx) => (
                  <div key={idx} className="flex-1 text-center truncate">
                    {item.date}
                  </div>
                ))}
              </div>

            </div>
          )}
        </div>

        {/* Right Card: Scheme Share Distribution (Donut Breakdown) (~35% width) */}
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Scheme Share Distribution
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live breakdown by welfare assistance scheme
            </p>
          </div>

          {/* Donut Chart SVG */}
          <div className="py-4 flex items-center justify-center relative">
            <svg className="w-36 h-36 sm:w-40 sm:h-40 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background ring */}
              <circle
                cx="50"
                cy="50"
                r="36"
                fill="transparent"
                stroke="#F1F5F9"
                strokeWidth="14"
              />
              
              {/* Dynamic Segments (only when data > 0) */}
              {strokeSegments.map((seg, idx) => (
                <circle
                  key={idx}
                  cx="50"
                  cy="50"
                  r="36"
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth="14"
                  strokeDasharray={seg.dashArray}
                  strokeDashoffset={seg.dashOffset}
                  strokeLinecap="round"
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[11px] font-bold text-slate-400">Total</span>
              <span className="text-lg sm:text-xl font-black text-slate-900 font-mono">{safeApplications.length}</span>
            </div>
          </div>

          {/* Donut Legend below */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-bold pt-2 border-t border-slate-100">
            {schemeDonutData.map((seg, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="text-slate-800 font-semibold">{seg.label}</span>
                <span className="text-slate-500 font-mono text-[11px]">({seg.percent}%)</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* RECENT APPLICATIONS & BLOCK SUMMARY                      */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        
        {/* Recent Applications Feed (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Applications</h3>
              <p className="text-xs text-slate-400">Latest submissions across active schemes</p>
            </div>
            <Link to="/applications/new-card" className="text-xs font-semibold text-blue-600 hover:underline">
              View All
            </Link>
          </div>

          <div className="overflow-x-auto -mx-1 sm:mx-0">
            {recentApplications.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                No active records. Click <strong>New Entry</strong> above to register applications.
              </div>
            ) : (
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Beneficiary Name</th>
                    <th className="py-2.5 px-3">Scheme</th>
                    <th className="py-2.5 px-3">Block</th>
                    <th className="py-2.5 px-3">Track No</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentApplications.map(app => (
                    <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {app.applicantName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {app.serviceType}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {app.block || 'General'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-blue-600 font-bold">
                        {app.trackNo || '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {app.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleOpenViewModal(app)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Block-Wise Applications (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Block-Wise Allocation</h3>
              <p className="text-xs text-slate-400">Distribution across active blocks</p>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {topBlocks.length} Blocks
            </span>
          </div>

          <div className="space-y-3">
            {topBlocks.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No block applications recorded yet.
              </div>
            ) : (
              topBlocks.map(([blockName, count]) => {
                const percent = stats.totalActive > 0 
                  ? Math.round((count / stats.totalActive) * 100) 
                  : 0;

                return (
                  <div key={blockName} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold">{blockName}</span>
                      </span>
                      <span className="font-bold text-slate-900">{count}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-[#1E3A8A] h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
