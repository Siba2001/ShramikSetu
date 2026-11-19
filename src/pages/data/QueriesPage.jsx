import React, { useState, useMemo } from 'react';
import { HelpCircle, Search, CheckCircle, MessageSquare, AlertCircle, Eye, Phone, MapPin } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function QueriesPage() {
  const { applications, handleUpdateStatus, handleOpenViewModal, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [replyText, setReplyText] = useState('');
  const [activeQueryApp, setActiveQueryApp] = useState(null);

  // Filter applications with queries
  const queryApplications = useMemo(() => {
    return applications.filter(a => 
      a.status === 'Query Raised' ||
      (a.remarks && (a.remarks.includes('Q') || a.remarks.toLowerCase().includes('query')))
    );
  }, [applications]);

  const filteredQueries = useMemo(() => {
    if (!searchTerm.trim()) return queryApplications;
    const q = searchTerm.toLowerCase();
    return queryApplications.filter(a =>
      a.applicantName.toLowerCase().includes(q) ||
      (a.cardNo && a.cardNo.toLowerCase().includes(q)) ||
      (a.trackNo && a.trackNo.toLowerCase().includes(q)) ||
      (a.remarks && a.remarks.toLowerCase().includes(q)) ||
      (a.agent && a.agent.toLowerCase().includes(q))
    );
  }, [queryApplications, searchTerm]);

  const handleResolveQuery = (appId, resolutionStatus = 'Query Replied') => {
    const note = replyText.trim() ? `Query Replied: ${replyText.trim()}` : undefined;
    handleUpdateStatus(appId, resolutionStatus, note);
    setActiveQueryApp(null);
    setReplyText('');
    showToast('success', `Query resolved for application.`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-purple-600" />
            <span>Queries Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor and reply to official departmental objections, missing documents and photo/sign queries
          </p>
        </div>

        <div className="text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
          {queryApplications.length} Outstanding Queries
        </div>
      </div>

      {/* Reply Modal */}
      {activeQueryApp && (
        <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-purple-900 uppercase">
              Respond to Query for: {activeQueryApp.applicantName} (Track: {activeQueryApp.trackNo || 'N/A'})
            </h3>
            <button onClick={() => setActiveQueryApp(null)} className="text-xs text-slate-400 hover:text-slate-600">
              Close
            </button>
          </div>

          <div className="text-xs text-purple-800 bg-white p-3 rounded-xl border border-purple-100">
            <strong>Current Query Remark:</strong> {activeQueryApp.remarks || 'General inquiry raised'}
          </div>

          <textarea
            rows={2}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Enter reply or correction notes..."
            className="w-full px-3 py-2 text-xs bg-white border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-normal placeholder:text-slate-400 placeholder:font-normal"
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => handleResolveQuery(activeQueryApp.id, 'Query Replied')}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold"
            >
              Mark Query Replied
            </button>
            <button
              onClick={() => handleResolveQuery(activeQueryApp.id, 'Approved')}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
            >
              Approve Directly
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
            placeholder="Search queries by name, card, track..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">
          Showing {filteredQueries.length} query records
        </span>
      </div>

      {/* Queries Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10.5px] font-bold tracking-wider">
                <th className="py-3 px-4">Beneficiary</th>
                <th className="py-3 px-3">Scheme</th>
                <th className="py-3 px-3">Track No</th>
                <th className="py-3 px-3">Block</th>
                <th className="py-3 px-3">Officer / Agent</th>
                <th className="py-3 px-4">Query Remarks</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredQueries.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-600">No active queries found</p>
                    <p className="text-xs text-slate-400 mt-0.5">All applications are clean or in normal processing</p>
                  </td>
                </tr>
              ) : (
                filteredQueries.map(app => (
                  <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {app.applicantName}
                    </td>

                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {app.serviceType}
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-blue-600">
                      {app.trackNo || '-'}
                    </td>

                    <td className="py-3 px-3 text-slate-600">
                      {app.block}
                    </td>

                    <td className="py-3 px-3 text-slate-700">
                      <div>Agent: <span className="font-semibold">{app.agent || 'None'}</span></div>
                      {app.officer && <div className="text-[10px] text-slate-400">{app.officer}</div>}
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="p-2 bg-purple-50 text-purple-900 rounded-lg border border-purple-100 font-medium text-[11px] leading-tight">
                        {app.remarks || 'Query Raised'}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleOpenViewModal(app)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setActiveQueryApp(app)}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Reply</span>
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

