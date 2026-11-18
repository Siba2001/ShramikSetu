import React, { useState, useMemo } from 'react';
import { X, FileDown, CheckCircle, FileSpreadsheet, MapPin, Layers, Filter } from 'lucide-react';
import { exportApplications } from '../utils/exportUtils';

export default function ExportModal({ isOpen, onClose, applications }) {
  const [selectedBlock, setSelectedBlock] = useState('All');
  const [selectedService, setSelectedService] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportInfo, setLastExportInfo] = useState(null);

  // Extract unique blocks
  const uniqueBlocks = useMemo(() => {
    const set = new Set();
    applications.forEach(a => {
      if (a.block) set.add(a.block.trim());
    });
    return Array.from(set).sort();
  }, [applications]);

  // Count matching records dynamically
  const matchingCount = useMemo(() => {
    return applications.filter(app => {
      if (selectedBlock !== 'All' && app.block.toLowerCase() !== selectedBlock.toLowerCase()) {
        return false;
      }
      if (selectedService !== 'All' && app.serviceType.toLowerCase() !== selectedService.toLowerCase()) {
        return false;
      }
      if (selectedStatus !== 'All') {
        if (selectedStatus === 'Pending') {
          if (app.status !== 'Pending' && app.status !== 'E-Sign Pending') return false;
        } else if (selectedStatus === 'In Progress') {
          if (app.status !== 'In Progress' && app.status !== 'Query Replied') return false;
        } else if (selectedStatus === 'Bank Reject') {
          if (app.status !== 'Bank Reject' && app.status !== 'Rejected') return false;
        } else if (app.status !== selectedStatus) {
          return false;
        }
      }
      return true;
    }).length;
  }, [applications, selectedBlock, selectedService, selectedStatus]);

  if (!isOpen) return null;

  const handleExecuteExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      const result = exportApplications(applications, {
        block: selectedBlock,
        service: selectedService,
        status: selectedStatus,
        format: exportFormat,
        filenamePrefix: 'NirmanShramik_Odisha'
      });
      setIsExporting(false);
      setLastExportInfo(result);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-blue-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Block-Wise Data Export Center</h2>
              <p className="text-xs text-slate-500">Download formatted Excel or CSV reports by block and service</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          
          {/* Target Block Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              Select Target Block
            </label>
            <select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800"
            >
              <option value="All">All Blocks Combined (Full Database)</option>
              {uniqueBlocks.map(b => (
                <option key={b} value={b}>
                  {b} Block
                </option>
              ))}
            </select>
          </div>

          {/* Service Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Filter by Service Type
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800"
            >
              <option value="All">All Services</option>
              <option value="Card Renewal">Card Renewal / Annual Contribution</option>
              <option value="New Card">New Nirman Shramik Card</option>
              <option value="Maternity Benefit Apply">Maternity Benefit Apply</option>
              <option value="Marriage Benefit Apply">Marriage Benefit Apply</option>
              <option value="Death Benefit Apply">Death Benefit Apply</option>
              <option value="Education Assistance Apply">Education Assistance Apply</option>
            </select>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              Filter by Application Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800"
            >
              <option value="All">All Statuses (Pending, Approved, Query, etc.)</option>
              <option value="Pending">Pending / E-Sign Pending Only</option>
              <option value="In Progress">In Progress / Verified Only</option>
              <option value="Query Raised">Query Raised (Q) Only</option>
              <option value="Approved">Approved Only</option>
              <option value="Bank Reject">Bank Reject Only</option>
            </select>
          </div>

          {/* Format Radio Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              File Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center space-x-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                exportFormat === 'xlsx' 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-2 ring-emerald-500/20 font-semibold' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="format"
                  value="xlsx"
                  checked={exportFormat === 'xlsx'}
                  onChange={() => setExportFormat('xlsx')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-xs font-bold">Microsoft Excel (.xlsx)</div>
                  <div className="text-[11px] text-slate-500">Formatted with columns & widths</div>
                </div>
              </label>

              <label className={`flex items-center space-x-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                exportFormat === 'csv' 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-2 ring-emerald-500/20 font-semibold' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={exportFormat === 'csv'}
                  onChange={() => setExportFormat('csv')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-xs font-bold">CSV Document (.csv)</div>
                  <div className="text-[11px] text-slate-500">Universal comma-separated</div>
                </div>
              </label>
            </div>
          </div>

          {/* Dynamic Records Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 block">Matched records for download:</span>
              <span className="text-lg font-black text-slate-900">{matchingCount} Applications</span>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200">
              {selectedBlock === 'All' ? 'All Blocks' : selectedBlock}
            </span>
          </div>

          {lastExportInfo && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Downloaded <strong>{lastExportInfo.count}</strong> records to <code>{lastExportInfo.filename}</code></span>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExecuteExport}
            disabled={isExporting || matchingCount === 0}
            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-emerald-600/25 flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isExporting ? 'Generating Report...' : `Download ${matchingCount} Records`}</span>
          </button>
        </div>

      </div>
    </div>
  );
}

