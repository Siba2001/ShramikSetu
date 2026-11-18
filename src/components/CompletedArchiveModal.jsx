import React, { useState } from 'react';
import { X, Archive, RotateCcw, FileSpreadsheet, Search, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function CompletedArchiveModal({ 
  isOpen, 
  onClose, 
  archivedApplications, 
  onRestore 
}) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filtered = archivedApplications.filter(a => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (a.applicantName && a.applicantName.toLowerCase().includes(q)) ||
      (a.cardNo && a.cardNo.toLowerCase().includes(q)) ||
      (a.trackNo && a.trackNo.toLowerCase().includes(q)) ||
      (a.block && a.block.toLowerCase().includes(q))
    );
  });

  const handleExportArchived = () => {
    if (archivedApplications.length === 0) return;
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
      'COMPLETED DATE': app.updatedAt ? app.updatedAt.slice(0, 10) : ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Completed Archive');
    XLSX.writeFile(wb, `Completed_Applications_Archive_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl my-8 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-100 to-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-sm">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Completed Applications Archive</h2>
              <p className="text-xs text-slate-500">
                Records removed from active database upon completion ({archivedApplications.length} total)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Export Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search completed records..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleExportArchived}
            disabled={archivedApplications.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Archive</span>
          </button>
        </div>

        {/* Table Body */}
        <div className="max-h-96 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Archive className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-medium text-slate-600">No completed applications in archive</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                When you mark any active application as "Completed", it is safely archived here and deleted from active lists.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Beneficiary Name</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Card / Track</th>
                  <th className="py-2.5 px-3">Block</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(app => (
                  <tr key={app.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-800">
                      {app.applicantName}
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {app.serviceType}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600">
                      {app.cardNo || app.aadhaarNo || '-'}
                      {app.trackNo && <span className="ml-1 text-blue-600">({app.trackNo})</span>}
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {app.block}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => onRestore(app.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 transition-colors"
                        title="Restore back to Active applications"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Rule active: Completed applications are automatically deleted from main database.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

