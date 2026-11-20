import React, { useMemo } from 'react';
import { 
  FileText, 
  Clock, 
  Layers, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  TrendingUp, 
  Building, 
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
  GraduationCap
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { 
    applications, 
    stats, 
    handleOpenAddModal, 
    handleOpenExportModal, 
    handleOpenViewModal 
  } = useApp();

  // Category statistics with icons and routes
  const categories = [
    { name: 'New Card', count: stats.categoryCounts['New Card'] || 0, route: '/applications/new-card', color: 'sky', icon: FileText },
    { 
      name: 'Card Renewal / Annual Contribution', 
      count: (stats.categoryCounts['Card Renewal'] || 0) + (stats.categoryCounts['Annual Contribution'] || 0), 
      route: '/applications/card-renewal', 
      color: 'blue', 
      icon: CreditCard 
    },
    { name: 'Marriage Benefit', count: stats.categoryCounts['Marriage Benefit Apply'] || 0, route: '/applications/marriage-benefit', color: 'rose', icon: HeartHandshake },
    { name: 'Maternity Benefit', count: stats.categoryCounts['Maternity Benefit Apply'] || 0, route: '/applications/maternity-benefit', color: 'pink', icon: Baby },
    { name: 'Death Benefit', count: stats.categoryCounts['Death Benefit Apply'] || 0, route: '/applications/death-benefit', color: 'slate', icon: Cross },
    { name: 'Education Grant', count: stats.categoryCounts['Education Assistance Apply'] || 0, route: '/applications/education-assistance', color: 'emerald', icon: GraduationCap }
  ];

  // Top blocks
  const topBlocks = useMemo(() => {
    return Object.entries(stats.blockCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7);
  }, [stats.blockCounts]);

  // Recent 6 applications
  const recentApplications = useMemo(() => {
    return [...applications].slice(0, 6);
  }, [applications]);

  // Date-wise summary (last 7 days grouped by application date)
  const dateWiseSummary = useMemo(() => {
    const map = {};
    applications.forEach(a => {
      const d = (a.createdAt || '').slice(0, 10) || 'Recent';
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map).slice(0, 5);
  }, [applications]);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Welcome & Quick Actions Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-2xl p-5 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/20 text-blue-100">
              OB&OCWW Operations
            </span>
            <span className="text-xs text-blue-200">Ganjam & Gajapati Districts</span>
          </div>
          <h2 className="text-lg font-black tracking-tight">
            Nirman Shramik Application Management Dashboard
          </h2>
          <p className="text-xs text-blue-100/90 max-w-2xl mt-0.5">
            Real-time status overview, block downloads, query handling and beneficiary processing.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0">
          <button
            onClick={() => handleOpenAddModal('New Card')}
            className="flex-1 md:flex-initial px-4 py-2 rounded-xl bg-white text-blue-800 hover:bg-blue-50 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Application</span>
          </button>
          
          <button
            onClick={() => handleOpenExportModal()}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <FileDown className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        
        {/* Total Active */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalActive}</div>
          <p className="text-[10.5px] text-slate-400 mt-0.5">Under process</p>
        </div>

        {/* Pending */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-700">{stats.pending}</div>
          <p className="text-[10.5px] text-amber-600/80 mt-0.5">Need processing</p>
        </div>

        {/* In Progress */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">In Progress</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-700">{stats.inProgress}</div>
          <p className="text-[10.5px] text-indigo-600/80 mt-0.5">Verification</p>
        </div>

        {/* Queries */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Queries (Q)</span>
            <HelpCircle className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-700">{stats.queries}</div>
          <p className="text-[10.5px] text-purple-600/80 mt-0.5">Response needed</p>
        </div>

        {/* Approved */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{stats.approved}</div>
          <p className="text-[10.5px] text-emerald-600/80 mt-0.5">Verified</p>
        </div>

        {/* Bank Rejections */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Bank Reject</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-700">{stats.bankRejections}</div>
          <p className="text-[10.5px] text-rose-600/80 mt-0.5">RTGS/Account</p>
        </div>

        {/* Completed */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-800">{stats.completed}</div>
          <p className="text-[10.5px] text-slate-400 mt-0.5">Cleared & Saved</p>
        </div>

      </div>

      {/* Middle Row: Category Modules & Block Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Application Category Breakdown (2 Columns wide) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Application Category Statistics</h3>
              <p className="text-xs text-slate-500">Live counts across all benefit schemes and cards</p>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Total {stats.totalActive} active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map(cat => {
              const Icon = cat.icon;
              const percent = stats.totalActive > 0 
                ? Math.round((cat.count / stats.totalActive) * 100) 
                : 0;

              return (
                <Link
                  key={cat.name}
                  to={cat.route}
                  className="p-3.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/20 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center text-slate-600 group-hover:text-blue-600 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {cat.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {percent}% of active workload
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-black text-slate-900 group-hover:text-blue-600">
                      {cat.count}
                    </div>
                    <span className="text-[10px] text-blue-600 font-bold group-hover:underline inline-flex items-center gap-0.5">
                      <span>View</span>
                      <ArrowUpRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Block & District Overview (1 Column) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Block-Wise Applications</h3>
              <p className="text-xs text-slate-500">Distribution across active blocks</p>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {topBlocks.length} Blocks
            </span>
          </div>

          <div className="space-y-2.5">
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
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" 
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

      {/* Bottom Row: Recent Applications & Date-Wise Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Applications Feed (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Applications</h3>
              <p className="text-xs text-slate-500">Latest submissions across all categories</p>
            </div>
            <Link to="/applications/new-card" className="text-xs font-semibold text-blue-600 hover:underline">
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            {recentApplications.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                No active applications. Click <strong>+ New Application</strong> or <strong>Import Excel</strong> to add records.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 uppercase text-[10px] font-bold border-b border-slate-100">
                    <th className="pb-2">Beneficiary Name</th>
                    <th className="pb-2">Scheme</th>
                    <th className="pb-2">Block</th>
                    <th className="pb-2">Track No</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentApplications.map(app => (
                    <tr key={app.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 font-bold text-slate-900">
                        {app.applicantName}
                      </td>
                      <td className="py-2.5 text-slate-600 font-medium">
                        {app.serviceType}
                      </td>
                      <td className="py-2.5 text-slate-600">
                        {app.block}
                      </td>
                      <td className="py-2.5 font-mono text-blue-600 font-bold">
                        {app.trackNo || '-'}
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {app.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => handleOpenViewModal(app)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
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

        {/* Date-Wise Application Summary (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Activity & Timeline</h3>
              <p className="text-xs text-slate-500">Date-wise application entries</p>
            </div>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3">
            {dateWiseSummary.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No activity recorded yet.
              </div>
            ) : (
              dateWiseSummary.map(([date, count]) => (
                <div key={date} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-semibold text-slate-700 font-mono">{date}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                    {count} records
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

