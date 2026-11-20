import React, { useState, useMemo } from 'react';
import { Users, Search, AlertCircle, Eye, Phone, CreditCard, Hash, MapPin, CheckCircle, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function ApplicantsPage() {
  const { applications, handleOpenViewModal } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkerKey, setSelectedWorkerKey] = useState(null);

  // Group applications by unique worker (using Aadhaar if present, or Card No, or Name)
  const workerRegistry = useMemo(() => {
    const map = new Map();

    const allRecords = applications;

    allRecords.forEach(app => {
      // Identity key
      let key = app.aadhaarNo || app.cardNo || app.applicantName;
      if (!key) return;
      key = key.trim().toUpperCase();

      if (!map.has(key)) {
        map.set(key, {
          key,
          name: app.applicantName,
          cardNo: app.cardNo || '',
          aadhaarNo: app.aadhaarNo || '',
          phone: app.phone || '',
          block: app.block || 'General',
          applications: []
        });
      }

      const existing = map.get(key);
      if (!existing.cardNo && app.cardNo) existing.cardNo = app.cardNo;
      if (!existing.aadhaarNo && app.aadhaarNo) existing.aadhaarNo = app.aadhaarNo;
      if (!existing.phone && app.phone) existing.phone = app.phone;

      existing.applications.push(app);
    });

    return Array.from(map.values()).sort((a, b) => b.applications.length - a.applications.length);
  }, [applications]);

  // Filtered workers
  const filteredWorkers = useMemo(() => {
    if (!searchTerm.trim()) return workerRegistry;
    const q = searchTerm.toLowerCase();
    return workerRegistry.filter(w => 
      w.name.toLowerCase().includes(q) ||
      w.cardNo.toLowerCase().includes(q) ||
      w.aadhaarNo.toLowerCase().includes(q) ||
      w.phone.toLowerCase().includes(q) ||
      w.block.toLowerCase().includes(q)
    );
  }, [workerRegistry, searchTerm]);

  // Selected worker details
  const activeWorker = useMemo(() => {
    if (!selectedWorkerKey) return filteredWorkers[0] || null;
    return workerRegistry.find(w => w.key === selectedWorkerKey) || null;
  }, [selectedWorkerKey, filteredWorkers, workerRegistry]);

  // Duplicate records alert list (more than 1 active application of the same service type)
  const duplicateAlerts = useMemo(() => {
    const alerts = [];
    workerRegistry.forEach(w => {
      const activeApps = w.applications.filter(a => a.status !== 'Completed');
      const serviceCounts = {};
      activeApps.forEach(a => {
        serviceCounts[a.serviceType] = (serviceCounts[a.serviceType] || 0) + 1;
      });
      Object.entries(serviceCounts).forEach(([svc, count]) => {
        if (count > 1) {
          alerts.push({
            workerName: w.name,
            service: svc,
            count,
            cardNo: w.cardNo,
            aadhaarNo: w.aadhaarNo
          });
        }
      });
    });
    return alerts;
  }, [workerRegistry]);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            <span>Applicant Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Worker profile dossiers, multi-application history tracking and duplicate prevention
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
          <span>{workerRegistry.length} Registered Beneficiaries</span>
        </div>
      </div>

      {/* Duplicate Prevention Alert Banner */}
      {duplicateAlerts.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1.5 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-bold text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Duplicate Warning: {duplicateAlerts.length} duplicate submissions detected</span>
          </div>
          <p className="text-[11.5px] text-amber-700">
            The following workers have multiple active applications for the same scheme:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {duplicateAlerts.slice(0, 5).map((d, i) => (
              <span key={i} className="px-2 py-0.5 bg-white border border-amber-300 rounded text-[11px] font-semibold text-amber-900">
                {d.workerName} ({d.count}x {d.service})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Worker Search List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Name, Aadhaar, Card..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div className="max-h-[580px] overflow-y-auto divide-y divide-slate-100">
            {filteredWorkers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No workers found matching your query
              </div>
            ) : (
              filteredWorkers.map(w => {
                const isSelected = activeWorker && activeWorker.key === w.key;
                return (
                  <button
                    key={w.key}
                    type="button"
                    onClick={() => setSelectedWorkerKey(w.key)}
                    className={`w-full p-3 text-left transition-all rounded-xl my-0.5 ${
                      isSelected ? 'bg-purple-50 border border-purple-200 shadow-2xs' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-slate-900 text-xs">{w.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-100 text-slate-600">
                        {w.applications.length} apps
                      </span>
                    </div>
                    <div className="text-[10.5px] text-slate-500 font-mono">
                      {w.cardNo && <span>Card: {w.cardNo}</span>}
                      {w.cardNo && w.aadhaarNo && <span> • </span>}
                      {w.aadhaarNo && <span>Aadhaar: {w.aadhaarNo}</span>}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      <span>{w.block}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

        </div>

        {/* Right Column: Worker Dossier & Application History */}
        <div className="lg:col-span-2 space-y-5">
          {activeWorker ? (
            <>
              {/* Profile Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center font-bold text-lg">
                      {activeWorker.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">{activeWorker.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{activeWorker.block} Block</span>
                        {activeWorker.phone && (
                          <>
                            <span>•</span>
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span className="font-mono">{activeWorker.phone}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-bold">
                    {activeWorker.applications.length} Total Submissions
                  </span>
                </div>

                {/* Identity Cards */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Nirman Shramik Card No</span>
                    <span className="font-bold text-slate-800">{activeWorker.cardNo || 'Not Registered'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Aadhaar Card No</span>
                    <span className="font-bold text-slate-800">{activeWorker.aadhaarNo || 'Not Provided'}</span>
                  </div>
                </div>
              </div>

              {/* Applications History Table */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Associated Benefit Applications History ({activeWorker.applications.length})
                </h4>

                <div className="divide-y divide-slate-100">
                  {activeWorker.applications.map((app, i) => (
                    <div key={app.id || i} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{app.serviceType}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {app.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Track: {app.trackNo || 'None'} • Agent: {app.agent || 'Direct'} • Date: {(app.createdAt || '').slice(0, 10)}
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenViewModal(app)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Select a worker on the left to inspect their profile and application history.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

