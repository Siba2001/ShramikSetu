import React from 'react';
import { 
  FileText, 
  Clock, 
  HelpCircle, 
  CheckCircle, 
  AlertTriangle, 
  Layers, 
  HeartHandshake, 
  Baby, 
  Cross, 
  GraduationCap, 
  CreditCard,
  MapPin
} from 'lucide-react';

export default function StatsDashboard({ 
  applications, 
  selectedBlock, 
  onSelectBlock, 
  selectedService, 
  onSelectService,
  selectedStatus,
  onSelectStatus 
}) {
  // Compute Stats
  const total = applications.length;
  const pending = applications.filter(a => a.status === 'Pending' || a.status === 'E-Sign Pending').length;
  const inProgress = applications.filter(a => a.status === 'In Progress' || a.status === 'Query Replied').length;
  const queries = applications.filter(a => a.status === 'Query Raised').length;
  const approved = applications.filter(a => a.status === 'Approved').length;
  const bankRejects = applications.filter(a => a.status === 'Bank Reject' || a.status === 'Rejected').length;

  // Blocks with counts
  const blockCounts = applications.reduce((acc, curr) => {
    const b = curr.block || 'General';
    acc[b] = (acc[b] || 0) + 1;
    return acc;
  }, {});

  const sortedBlocks = Object.entries(blockCounts).sort((a, b) => b[1] - a[1]);

  // Services
  const services = [
    { name: 'All Services', key: 'All', icon: Layers },
    { name: 'Card Renewal', key: 'Card Renewal', icon: CreditCard },
    { name: 'New Card', key: 'New Card', icon: FileText },
    { name: 'Maternity Benefit', key: 'Maternity Benefit Apply', icon: Baby },
    { name: 'Marriage Benefit', key: 'Marriage Benefit Apply', icon: HeartHandshake },
    { name: 'Death Benefit', key: 'Death Benefit Apply', icon: Cross },
    { name: 'Education Assistance', key: 'Education Assistance Apply', icon: GraduationCap }
  ];

  return (
    <div className="space-y-4 mb-6">
      
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Total Active */}
        <button
          onClick={() => onSelectStatus('All')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedStatus === 'All'
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Active</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{total}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Under management</p>
        </button>

        {/* Pending & E-Sign */}
        <button
          onClick={() => onSelectStatus(selectedStatus === 'Pending' ? 'All' : 'Pending')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedStatus === 'Pending'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-700">{pending}</div>
          <p className="text-[11px] text-amber-600 mt-0.5">Need processing</p>
        </button>

        {/* In Progress */}
        <button
          onClick={() => onSelectStatus(selectedStatus === 'In Progress' ? 'All' : 'In Progress')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedStatus === 'In Progress'
              ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">In Progress</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-700">{inProgress}</div>
          <p className="text-[11px] text-indigo-600 mt-0.5">Under verification</p>
        </button>

        {/* Queries Raised (Q) */}
        <button
          onClick={() => onSelectStatus(selectedStatus === 'Query Raised' ? 'All' : 'Query Raised')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedStatus === 'Query Raised'
              ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">Queries (Q)</span>
            <HelpCircle className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-700">{queries}</div>
          <p className="text-[11px] text-purple-600 mt-0.5">Query raised</p>
        </button>

        {/* Approved */}
        <button
          onClick={() => onSelectStatus(selectedStatus === 'Approved' ? 'All' : 'Approved')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedStatus === 'Approved'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Approved</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{approved}</div>
          <p className="text-[11px] text-emerald-600 mt-0.5">Ready for completion</p>
        </button>

        {/* Bank Rejects */}
        <button
          onClick={() => onSelectStatus(selectedStatus === 'Bank Reject' ? 'All' : 'Bank Reject')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedStatus === 'Bank Reject'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">Bank Rejects</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-700">{bankRejects}</div>
          <p className="text-[11px] text-rose-600 mt-0.5">Action needed</p>
        </button>

      </div>

      {/* Quick Service Type Pills */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider shrink-0 pl-1">
            Services:
          </span>
          {services.map(svc => {
            const Icon = svc.icon;
            const isSelected = selectedService === svc.key;
            const count = svc.key === 'All' 
              ? applications.length 
              : applications.filter(a => a.serviceType === svc.key).length;

            return (
              <button
                key={svc.key}
                onClick={() => onSelectService(svc.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                <span>{svc.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-blue-700 text-blue-100' : 'bg-white text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Block Filter Quick Pills */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider shrink-0 pl-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-400" /> Blocks:
          </span>
          
          <button
            onClick={() => onSelectBlock('All')}
            className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap text-xs transition-all ${
              selectedBlock === 'All'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Blocks ({total})
          </button>

          {sortedBlocks.map(([blockName, count]) => {
            const isSelected = selectedBlock.toLowerCase() === blockName.toLowerCase();
            return (
              <button
                key={blockName}
                onClick={() => onSelectBlock(isSelected ? 'All' : blockName)}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap text-xs flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{blockName}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-blue-700 text-blue-100' : 'bg-white text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}

