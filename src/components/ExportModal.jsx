import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  FileDown, 
  CheckCircle, 
  FileSpreadsheet, 
  MapPin, 
  Layers, 
  Filter,
  FileText,
  Printer
} from 'lucide-react';
import { exportApplications, exportBlockWisePDF, exportBlockWiseExcel } from '../utils/exportUtils';

export default function ExportModal({ isOpen, onClose, applications }) {
  const [selectedBlock, setSelectedBlock] = useState('All');
  const [selectedService, setSelectedService] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [exportFormat, setExportFormat] = useState('pdf'); // 'pdf' | 'xlsx' | 'csv'
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
      if (selectedBlock !== 'All' && (app.block || '').toLowerCase() !== selectedBlock.toLowerCase()) {
        return false;
      }
      if (selectedService !== 'All' && (app.serviceType || '').toLowerCase() !== selectedService.toLowerCase()) {
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
      let result = null;

      if (exportFormat === 'pdf') {
        // Block-wise Official PDF Report
        result = exportBlockWisePDF(applications, {
          block: selectedBlock,
          service: selectedService,
          status: selectedStatus
        });
      } else if (exportFormat === 'xlsx') {
        // Block-wise Official Excel Report
        result = exportBlockWiseExcel(applications, {
          block: selectedBlock,
          service: selectedService,
          status: selectedStatus
        });
      } else {
        // Raw CSV Export
        result = exportApplications(applications, {
          block: selectedBlock,
          service: selectedService,
          status: selectedStatus,
          format: 'csv',
          filenamePrefix: 'NirmanShramik_Odisha'
        });
      }

      setIsExporting(false);
      setLastExportInfo(result);
    }, 300);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0c1429] rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col border border-slate-700 shadow-2xl overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 flex items-center justify-between bg-[#080D1A] shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
              <FileDown className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">Block-Wise Report Download</h2>
              <p className="text-xs text-slate-400 truncate">Official Block-Wise PDF & Excel reports with custom heading</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
          
          {/* Target Block Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              1. Select Block
            </label>
            <select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#080D1A] border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-200"
            >
              <option value="All">All Blocks Combined</option>
              {uniqueBlocks.map(b => (
                <option key={b} value={b}>
                  {b} Block
                </option>
              ))}
            </select>
          </div>

          {/* Service Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              2. Select Application Scheme
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#080D1A] border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-200"
            >
              <option value="New Card">New Nirman Shramik Card</option>
              <option value="Card Renewal">Card Renewal / Annual Contribution</option>
              <option value="Maternity Benefit Apply">Maternity Benefit Apply</option>
              <option value="Death Benefit Apply">Death Benefit Apply</option>
              <option value="Marriage Benefit Apply">Marriage Benefit Apply</option>
              <option value="Education Assistance Apply">Education Assistance Apply</option>
              <option value="All">All Schemes Combined</option>
            </select>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-400" />
              3. Filter by Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#080D1A] border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-200"
            >
              <option value="All">All Statuses (Pending, Approved, Queries)</option>
              <option value="Pending">Pending / E-Sign Pending</option>
              <option value="In Progress">In Verification / In Progress</option>
              <option value="Query Raised">Query Raised (Q)</option>
              <option value="Approved">Approved</option>
              <option value="Bank Reject">Bank Reject / Rejected</option>
            </select>
          </div>

          {/* Format Radio Selection (PDF / Excel / CSV) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              4. Download Format
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              
              {/* PDF Report */}
              <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer text-center transition-all ${
                exportFormat === 'pdf' 
                  ? 'bg-rose-950/40 border-rose-500/50 text-rose-300 ring-2 ring-rose-500/20 font-bold' 
                  : 'bg-[#080D1A] border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}>
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={exportFormat === 'pdf'}
                  onChange={() => setExportFormat('pdf')}
                  className="sr-only"
                />
                <Printer className="w-5 h-5 text-rose-400 mb-1" />
                <span className="text-xs font-bold">Official PDF</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Print ready with header</span>
              </label>

              {/* Excel Report */}
              <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer text-center transition-all ${
                exportFormat === 'xlsx' 
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 ring-2 ring-emerald-500/20 font-bold' 
                  : 'bg-[#080D1A] border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}>
                <input
                  type="radio"
                  name="format"
                  value="xlsx"
                  checked={exportFormat === 'xlsx'}
                  onChange={() => setExportFormat('xlsx')}
                  className="sr-only"
                />
                <FileSpreadsheet className="w-5 h-5 text-emerald-400 mb-1" />
                <span className="text-xs font-bold">Excel (.xlsx)</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Block-titled sheet</span>
              </label>

              {/* CSV */}
              <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer text-center transition-all ${
                exportFormat === 'csv' 
                  ? 'bg-blue-950/40 border-blue-500/50 text-blue-300 ring-2 ring-blue-500/20 font-bold' 
                  : 'bg-[#080D1A] border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}>
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={exportFormat === 'csv'}
                  onChange={() => setExportFormat('csv')}
                  className="sr-only"
                />
                <FileText className="w-5 h-5 text-blue-400 mb-1" />
                <span className="text-xs font-bold">CSV Raw</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Raw data table</span>
              </label>

            </div>

            {/* Note on Agent & Block columns */}
            <p className="text-[11px] text-slate-400 mt-2 bg-[#080D1A] p-2 rounded-lg border border-slate-700/80">
              💡 <strong>Official Report Rules</strong>: For single block downloads, the <strong>Agent Name is hidden</strong>, and the <strong>Block column is omitted</strong> in favor of a prominent official heading (e.g. <code>[SELECTED BLOCK] [SCHEME] LIST</code>). For All Blocks, the Block column is automatically included.
            </p>
          </div>

          {/* Dynamic Records Summary Box */}
          <div className="bg-[#080D1A] border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">Records to download:</span>
              <span className="text-lg font-black text-white">{matchingCount} Beneficiaries</span>
            </div>
            <span className="px-2.5 py-1 bg-blue-900/40 text-blue-300 rounded-lg text-xs font-bold border border-blue-700/50">
              {selectedBlock === 'All' ? 'All Blocks' : `${selectedBlock} Block`}
            </span>
          </div>

          {lastExportInfo && (
            <div className="bg-emerald-950/40 border border-emerald-700/50 rounded-xl p-3 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Generated <strong>{lastExportInfo.count}</strong> records: <code>{lastExportInfo.filename}</code></span>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-800 bg-[#080D1A] flex items-center justify-end space-x-2 sm:space-x-3 shrink-0">
          <button
            onClick={onClose}
            className="px-3.5 sm:px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            Close
          </button>
          <button
            onClick={handleExecuteExport}
            disabled={isExporting || matchingCount === 0}
            className={`px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-md flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 ${
              exportFormat === 'pdf' 
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25' 
                : exportFormat === 'xlsx'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
            }`}
          >
            {exportFormat === 'pdf' ? <Printer className="w-4 h-4 shrink-0" /> : <FileSpreadsheet className="w-4 h-4 shrink-0" />}
            <span className="truncate">{isExporting ? 'Generating Report...' : `Download ${matchingCount} Records (${exportFormat.toUpperCase()})`}</span>
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
