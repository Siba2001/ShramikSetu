import React, { useState, useMemo } from 'react';
import { AlertTriangle, Search, CheckCircle, RefreshCw, Eye, Phone } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function BankRejectionsPage() {
  const { applications, handleUpdateStatus, handleOpenViewModal, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [updatedRemarks, setUpdatedRemarks] = useState('');

  // Filter bank rejection cases
  const bankRejections = useMemo(() => {
    return applications.filter(a => 
      a.status === 'Bank Reject' || 
      a.status === 'Rejected' ||
      (a.remarks && (a.remarks.toLowerCase().includes('bank') || a.remarks.toLowerCase().includes('rtgs')))
    );
  }, [applications]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return bankRejections;
    const q = searchTerm.toLowerCase();
    return bankRejections.filter(a =>
      a.applicantName.toLowerCase().includes(q) ||
      (a.cardNo && a.cardNo.toLowerCase().includes(q)) ||
      (a.trackNo && a.trackNo.toLowerCase().includes(q)) ||
      (a.remarks && a.remarks.toLowerCase().includes(q))
    );
  }, [bankRejections, searchTerm]);

  const handleResolveBankIssue = (appId) => {
    const note = updatedRemarks.trim() ? `Bank Details Updated: ${updatedRemarks.trim()}` : undefined;
    handleUpdateStatus(appId, 'In Progress', note);
    setSelectedApp(null);
    setUpdatedRemarks('');
    showToast('success', 'Bank correction submitted. Status moved to In Progress.');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>Bank Rejections</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Resolve rejected DBT transfers, IFSC mismatches, and bank account validation failures
          </p>
        </div>

        <div className="text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
          {bankRejections.length} Actionable Bank Rejections
        </div>
      </div>

      {/* Resolution Panel */}
      {selectedApp && (
        <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-rose-900 uppercase">
              Correct Bank Information: {selectedApp.applicantName} (Card: {selectedApp.cardNo || 'N/A'})
            </h3>
            <button onClick={() => setSelectedApp(null)} className="text-xs text-slate-400 hover:text-slate-600">
              Close
            </button>
          </div>

          <div className="text-xs text-rose-800 bg-white p-3 rounded-xl border border-rose-100">
            <strong>Rejection Reason:</strong> {selectedApp.remarks || 'Bank transfer failed / RTGS rejection'}
          </div>

          <input
            type="text"
            value={updatedRemarks}
            onChange={(e) => setUpdatedRemarks(e.target.value)}
            placeholder="Enter new Bank Name, IFSC code & Account verification notes..."
            className="w-full px-3 py-2 text-xs bg-white border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => handleResolveBankIssue(selectedApp.id)}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Resubmit to Verification</span>
            </button>
          </div>
        </div>
      )}

      {/* Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search bank rejections..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">
          Showing {filtered.length} rejections
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10.5px] font-bold tracking-wider">
                <th className="py-3 px-4">Beneficiary</th>
                <th className="py-3 px-3">Scheme</th>
                <th className="py-3 px-3">Card / Aadhaar</th>
                <th className="py-3 px-3">Block</th>
                <th className="py-3 px-4">Rejection Note</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-600">No bank rejection cases</p>
                    <p className="text-xs text-slate-400 mt-0.5">All banking details are verified</p>
                  </td>
                </tr>
              ) : (
                filtered.map(app => (
                  <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {app.applicantName}
                    </td>

                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {app.serviceType}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-700">
                      {app.cardNo || app.aadhaarNo || '-'}
                    </td>

                    <td className="py-3 px-3 text-slate-600">
                      {app.block}
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="p-2 bg-rose-50 text-rose-900 rounded-lg border border-rose-100 font-medium text-[11px] leading-tight">
                        {app.remarks || 'Bank reject (RTGS)'}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleOpenViewModal(app)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setSelectedApp(app)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          Correct & Resubmit
                        </button>
                      </div>
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

