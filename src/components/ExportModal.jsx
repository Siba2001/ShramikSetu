import React, { useState, useMemo } from 'react';
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
        // Block-wise Official PDF Report (Omits Agent Name, omits redundant Block column, has Block Header)
        result = exportBlockWisePDF(applications, {
          block: selectedBlock,
          service: selectedService !== 'All' ? selectedService : 'New Card',
          status: selectedStatus
        });
      } else if (exportFormat === 'xlsx') {
        // Block-wise Official Excel Report (Row 1 Header: e.g. "DIGAPAHANDI NEW CARD LIST", omits Agent)
        result = exportBlockWiseExcel(applications, {
          block: selectedBlock,
          service: selectedService !== 'All' ? selectedService : 'New Card',
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Block-Wise Report Download</h2>
              <p className="text-xs text-slate-500">Official Block-Wise PDF & Excel reports with custom heading</p>
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
              1. Select Block
            </label>
            <select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800"
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
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              2. Select Application Scheme
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800"
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
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              3. Filter by Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800"
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
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              4. Download Format
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              
              {/* PDF Report */}
              <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer text-center transition-all ${
                exportFormat === 'pdf' 
                  ? 'bg-rose-50 border-rose-300 text-rose-900 ring-2 ring-rose-500/20 font-bold' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={exportFormat === 'pdf'}
                  onChange={() => setExportFormat('pdf')}
                  className="sr-only"
                />
                <Printer className="w-5 h-5 text-rose-600 mb-1" />
                <span className="text-xs font-bold">Official PDF</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Print ready with header</span>
              </label>

              {/* Excel Report */}
              <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer text-center transition-all ${
                exportFormat === 'xlsx' 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-2 ring-emerald-500/20 font-bold' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="format"
                  value="xlsx"
                  checked={exportFormat === 'xlsx'}
                  onChange={() => setExportFormat('xlsx')}
                  className="sr-only"
                />
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 mb-1" />
                <span className="text-xs font-bold">Excel (.xlsx)</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Block-titled sheet</span>
              </label>

              {/* CSV */}
              <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer text-center transition-all ${
                exportFormat === 'csv' 
                  ? 'bg-blue-50 border-blue-300 text-blue-900 ring-2 ring-blue-500/20 font-bold' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={exportFormat === 'csv'}
                  onChange={() => setExportFormat('csv')}
                  className="sr-only"
                />
                <FileText className="w-5 h-5 text-blue-600 mb-1" />
                <span className="text-xs font-bold">CSV Raw</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Raw data table</span>
              </label>

            </div>

            {/* Note on Agent & Block columns */}
            <p className="text-[11px] text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
              💡 <strong>Official Report Rules</strong>: For single block downloads, the <strong>Agent Name is hidden</strong>, and the <strong>Block column is omitted</strong> in favor of a prominent official heading (e.g. <code>DIGAPAHANDI NEW CARD LIST</code>).
            </p>
          </div>

          {/* Dynamic Records Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 block">Records to download:</span>
              <span className="text-lg font-black text-slate-900">{matchingCount} Beneficiaries</span>
            </div>
            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold border border-blue-200">
              {selectedBlock === 'All' ? 'All Blocks' : `${selectedBlock} Block`}
            </span>
          </div>

          {lastExportInfo && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Generated <strong>{lastExportInfo.count}</strong> records: <code>{lastExportInfo.filename}</code></span>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleExecuteExport}
            disabled={isExporting || matchingCount === 0}
            className={`px-5 py-2.5 text-xs font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-md flex items-center gap-2 ${
              exportFormat === 'pdf' 
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25' 
                : exportFormat === 'xlsx'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
            }`}
          >
            {exportFormat === 'pdf' ? <Printer className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
            <span>{isExporting ? 'Generating Report...' : `Download ${matchingCount} Records (${exportFormat.toUpperCase()})`}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
