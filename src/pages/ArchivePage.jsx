import React, { useState, useMemo } from 'react';
import { Archive, Search, FileDown, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import * as XLSX from 'xlsx';

export default function ArchivePage() {
  const { archivedApplications, handleRestoreArchived, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return archivedApplications;
    const q = searchTerm.toLowerCase();
    return archivedApplications.filter(a =>
      a.applicantName.toLowerCase().includes(q) ||
      (a.cardNo && a.cardNo.toLowerCase().includes(q)) ||
      (a.trackNo && a.trackNo.toLowerCase().includes(q)) ||
      (a.block && a.block.toLowerCase().includes(q))
    );
  }, [archivedApplications, searchTerm]);

  const handleExportArchive = () => {
    if (archivedApplications.length === 0) {
      showToast('info', 'No completed applications to export.');
      return;
    }

    const rows = archivedApplications.map((app, idx) => ({
      'SL NO': idx + 1,
      'APPLICANT NAME': app.applicantName,
      'SERVICE TYPE': app.serviceType,
      'CARD NO': app.cardNo || '',
      'AADHAAR NO': app.aadhaarNo || '',
      'TRACK NO': app.trackNo || '',
      'BLOCK': app.block,
      'AGENT': app.agent || '',
      'STATUS': 'Completed',
      'COMPLETED DATE': (app.updatedAt || '').slice(0, 10)
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Completed Archive');
    XLSX.writeFile(wb, `Completed_Applications_Archive_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('success', `Exported ${archivedApplications.length} completed records.`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Archive className="w-5 h-5 text-slate-700" />
            <span>Completed Applications Archive</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Preserved historical log of completed beneficiary benefits (deleted from active queues per policy)
          </p>
        </div>

        <button
          onClick={handleExportArchive}
          disabled={archivedApplications.length === 0}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
        >
          <FileDown className="w-4 h-4" />
          <span>Export Completed Archive</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search completed applications..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">
          Total {filtered.length} Archived Applications
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10.5px] font-bold tracking-wider">
                <th className="py-3 px-4">Beneficiary Name</th>
                <th className="py-3 px-3">Scheme Type</th>
                <th className="py-3 px-3">Card / Aadhaar</th>
                <th className="py-3 px-3">Track No</th>
                <th className="py-3 px-3">Block</th>
                <th className="py-3 px-3">Completion Date</th>
                <th className="py-3 px-4 text-right">Restore Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <Archive className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-600">No applications in Completed Archive</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      When any active application is marked "Completed", it is automatically preserved here and cleared from active queues.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(app => (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {app.applicantName}
                    </td>

                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {app.serviceType}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-700">
                      {app.cardNo || app.aadhaarNo || '-'}
                    </td>

                    <td className="py-3 px-3 font-mono text-blue-600 font-semibold">
                      {app.trackNo || '-'}
                    </td>

                    <td className="py-3 px-3 text-slate-600">
                      {app.block}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-500">
                      {(app.updatedAt || '').slice(0, 10)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleRestoreArchived(app.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-200 transition-colors"
                        title="Restore back to Active applications"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

