import React, { useState, useMemo } from 'react';
import {
  Search,
  PlusCircle,
  FileSpreadsheet,
  Printer,
  Edit3,
  Trash2,
  Calendar,
  MapPin,
  Heart,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  Copy,
  Sparkles,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  exportMarriageVerificationPDF, 
  exportMarriageVerificationExcel 
} from '../../utils/exportUtils';
import AddMarriageVerificationModal from './AddMarriageVerificationModal';

export default function MarriageVerificationSection() {
  const {
    marriageVerifications,
    allBlocksList,
    handleDeleteMarriageVerification,
    showToast,
    refreshData
  } = useApp();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('All');
  const [selectedMarriageFor, setSelectedMarriageFor] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Pagination & selection
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [copiedText, setCopiedText] = useState(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);

  // Jump to first page immediately when a new verification record is added
  React.useEffect(() => {
    const handleAdded = () => {
      setCurrentPage(1);
    };
    window.addEventListener('shramiksetu:marriage_verify_added', handleAdded);
    return () => window.removeEventListener('shramiksetu:marriage_verify_added', handleAdded);
  }, []);

  // Filter records
  const filteredRecords = useMemo(() => {
    return (marriageVerifications || []).filter(item => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          (item.beneficiaryName && item.beneficiaryName.toLowerCase().includes(q)) ||
          (item.regNo && item.regNo.toLowerCase().includes(q)) ||
          (item.groomName && item.groomName.toLowerCase().includes(q)) ||
          (item.daughterName && item.daughterName.toLowerCase().includes(q)) ||
          (item.marriageRegdNo && item.marriageRegdNo.toLowerCase().includes(q)) ||
          (item.certifyingAuthority && item.certifyingAuthority.toLowerCase().includes(q)) ||
          (item.block && item.block.toLowerCase().includes(q)) ||
          (item.mobile && item.mobile.includes(q));
        if (!matches) return false;
      }

      // Block
      if (selectedBlock !== 'All') {
        if ((item.block || '').toLowerCase() !== selectedBlock.toLowerCase()) {
          return false;
        }
      }

      // Marriage For
      if (selectedMarriageFor !== 'All') {
        if ((item.marriageFor || '').toLowerCase() !== selectedMarriageFor.toLowerCase()) {
          return false;
        }
      }

      // Date Range (Date of Marriage or Regd Date)
      if (fromDate || toDate) {
        const targetDateStr = item.dateOfMarriage || item.marriageCertDate;
        if (targetDateStr) {
          const targetDate = new Date(targetDateStr);
          if (fromDate && targetDate < new Date(fromDate)) return false;
          if (toDate) {
            const end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
            if (targetDate > end) return false;
          }
        }
      }

      return true;
    });
  }, [marriageVerifications, searchTerm, selectedBlock, selectedMarriageFor, fromDate, toDate]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Universal Register Title (no specific block hardcoded on page)
  const registerTitle = 'MARRIAGE VERIFY LIST';

  // Handlers
  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1800);
  };

  const handleOpenAdd = () => {
    setRecordToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec) => {
    setRecordToEdit(rec);
    setIsModalOpen(true);
  };

  const confirmDelete = () => {
    if (!recordToDelete) return;
    handleDeleteMarriageVerification(recordToDelete.id);
    setRecordToDelete(null);
  };

  const handleDownloadPDF = () => {
    const res = exportMarriageVerificationPDF(filteredRecords, {
      block: selectedBlock,
      search: searchTerm
    });
    showToast('success', `Exported ${res.count} verification records to official PDF: ${res.filename}`);
  };

  const handleDownloadExcel = () => {
    const res = exportMarriageVerificationExcel(filteredRecords, {
      block: selectedBlock,
      search: searchTerm
    });
    showToast('success', `Exported ${res.count} verification records to Excel: ${res.filename}`);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Official Register Banner (styled matching reference layout) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Decorative Top Accent Bar */}
        <div className="h-1 bg-[#1E3A8A]" />

        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                <ShieldCheck className="w-3 h-3 text-blue-600" />
                Verification Section
              </span>
              <span className="text-xs text-slate-400 font-medium">
                • {filteredRecords.length} Verified Entries
              </span>
            </div>

            {/* Title matching exact heading style */}
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 font-mono">
              <span>{registerTitle}</span>
            </h2>
            <p className="text-xs text-slate-500">
              Odisha Building & Other Construction Workers' Welfare Board • Marriage Verification Register
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Download Official PDF */}
            <button
              onClick={handleDownloadPDF}
              className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              title="Download Official Landscaped Verification Register PDF"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Download PDF</span>
            </button>

            {/* Download Official Excel */}
            <button
              onClick={handleDownloadExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              title="Download Formatted Verification Excel Spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Download Excel</span>
            </button>

            {/* Add Marriage Verification Entry Button */}
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Verification Entry</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="sm:col-span-2 lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search Reg No, Beneficiary, Groom, Daughter..."
              className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white shadow-2xs"
            />
          </div>

          {/* Block Filter */}
          <div className="sm:col-span-1 lg:col-span-3">
            <select
              value={selectedBlock}
              onChange={(e) => {
                setSelectedBlock(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white shadow-2xs"
            >
              <option value="All">All Blocks</option>
              {allBlocksList.map(b => (
                <option key={b} value={b}>{b} Block</option>
              ))}
            </select>
          </div>

          {/* Marriage For Filter */}
          <div className="sm:col-span-1 lg:col-span-2">
            <select
              value={selectedMarriageFor}
              onChange={(e) => {
                setSelectedMarriageFor(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white shadow-2xs"
            >
              <option value="All">All Relations</option>
              <option value="Daughter">Daughter</option>
              <option value="Self">Self</option>
              <option value="Son">Son</option>
              <option value="Dependent Sister">Dependent Sister</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-1.5">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-1/2 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 bg-white shadow-2xs"
              title="From Marriage Date"
            />
            <span className="text-xs text-slate-400 font-bold">-</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-1/2 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 bg-white shadow-2xs"
              title="To Marriage Date"
            />
          </div>
        </div>
      </div>

      {/* 11-Column Table Container matching government register exactly */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Table Title Strip */}
        <div className="bg-[#0B1325] text-white px-5 py-3 text-center border-b border-slate-800">
          <h3 className="text-sm font-black tracking-widest uppercase font-mono">
            {registerTitle}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-300 divide-x divide-slate-200">
                <th className="py-3 px-3 text-center w-12">SL NO</th>
                <th className="py-3 px-3 min-w-[130px]">Registration Number</th>
                <th className="py-3 px-3 min-w-[150px]">Beneficiary Name</th>
                <th className="py-3 px-3 min-w-[110px]">Block</th>
                <th className="py-3 px-3 min-w-[140px]">Certifying Authority</th>
                <th className="py-3 px-3 min-w-[120px] text-center">Marriage certificate regis Date</th>
                <th className="py-3 px-3 min-w-[120px] text-center">Marriage Regd. No</th>
                <th className="py-3 px-3 min-w-[100px] text-center">Marriage for</th>
                <th className="py-3 px-3 min-w-[110px] text-center">Date of Marriage</th>
                <th className="py-3 px-3 min-w-[140px]">Name of Groom</th>
                <th className="py-3 px-3 min-w-[140px]">Name of Daughter</th>
                <th className="py-3 px-3 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center">
                        <ShieldCheck className="w-7 h-7 stroke-1" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-700">No verification entries found</p>
                        <p className="text-xs text-slate-400 max-w-sm">
                          {searchTerm || selectedBlock !== 'All' 
                            ? 'No records match your selected filters. Try resetting the filters.'
                            : 'Start by clicking "+ Add Verification Entry" to enter new marriage verification register records.'}
                        </p>
                      </div>
                      <button
                        onClick={handleOpenAdd}
                        className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Add First Entry</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item, idx) => {
                  const sl = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr 
                      key={item.id || idx} 
                      className="hover:bg-blue-50/40 transition-colors divide-x divide-slate-100 group"
                    >
                      {/* 1. SL NO */}
                      <td className="py-3 px-3 text-center font-bold text-slate-600 bg-slate-50/50">
                        {item.slNo || sl}
                      </td>

                      {/* 2. Registration Number */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">{item.regNo}</span>
                          <button
                            onClick={() => handleCopy(item.regNo)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 rounded transition-opacity cursor-pointer"
                            title="Copy Reg No"
                          >
                            {copiedText === item.regNo ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        {(item.mobile || item.phone) && (
                          <span className="text-[10px] text-slate-400 font-sans block">
                            Ph: {item.mobile || item.phone}
                          </span>
                        )}
                      </td>

                      {/* 3. Beneficiary Name */}
                      <td className="py-3 px-3 font-semibold text-slate-800 uppercase">
                        {item.beneficiaryName}
                      </td>

                      {/* 4. Block */}
                      <td className="py-3 px-3 text-slate-700 font-medium">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-100">
                          <MapPin className="w-2.5 h-2.5" />
                          {item.block}
                        </span>
                      </td>

                      {/* 5. Certifying Authority */}
                      <td className="py-3 px-3 text-slate-700 font-medium">
                        {item.certifyingAuthority || 'Sub-Registrar'}
                      </td>

                      {/* 6. Marriage certificate regis Date */}
                      <td className="py-3 px-3 text-center font-mono text-slate-700">
                        {item.marriageCertDate || '—'}
                      </td>

                      {/* 7. Marriage Regd. No */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-indigo-700">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100">
                          {item.marriageRegdNo || '—'}
                        </span>
                      </td>

                      {/* 8. Marriage for */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.marriageFor || 'Daughter'}
                        </span>
                      </td>

                      {/* 9. Date of Marriage */}
                      <td className="py-3 px-3 text-center font-mono text-slate-700 font-semibold">
                        {item.dateOfMarriage || '—'}
                      </td>

                      {/* 10. Name of Groom */}
                      <td className="py-3 px-3 font-semibold text-slate-900 uppercase">
                        {item.groomName}
                      </td>

                      {/* 11. Name of Daughter */}
                      <td className="py-3 px-3 font-semibold text-slate-900 uppercase">
                        {item.daughterName}
                      </td>

                      {/* 12. Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit verification entry"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setRecordToDelete(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        {filteredRecords.length > 0 && (
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-bold text-slate-700">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-bold text-slate-700">
                {Math.min(currentPage * pageSize, filteredRecords.length)}
              </span> of <span className="font-bold text-slate-700">{filteredRecords.length}</span> verified entries
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <span className="px-3 py-1 font-semibold text-slate-700 bg-white rounded-lg border border-slate-200">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <AddMarriageVerificationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setRecordToEdit(null);
        }}
        recordToEdit={recordToEdit}
        defaultBlock={selectedBlock !== 'All' ? selectedBlock : 'Sanakhemundi'}
      />

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl animate-scaleUp">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete Verification Record?</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Are you sure you want to delete verification entry for <strong className="text-slate-700">{recordToDelete.beneficiaryName}</strong> (Reg No: {recordToDelete.regNo})? This action cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
              >
                Yes, Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
