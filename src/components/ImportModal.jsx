import React, { useState } from 'react';
import { X, FileUp, CheckCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ImportModal({ isOpen, onClose, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [defaultBlock, setDefaultBlock] = useState('');
  const [defaultService, setDefaultService] = useState('Card Renewal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const uploaded = e.target.files[0];
    if (!uploaded) return;
    setFile(uploaded);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (rawJson.length <= 1) {
          setErrorMsg('The selected spreadsheet contains no data rows.');
          return;
        }

        // Parse rows
        const parsed = [];
        let headerRow = rawJson[0].map(h => String(h || '').trim().toUpperCase());

        for (let i = 1; i < rawJson.length; i++) {
          const row = rawJson[i];
          if (!row || row.length === 0) continue;

          let name = '';
          let cardNo = '';
          let aadhaarNo = '';
          let trackNo = '';
          let agent = '';
          let officer = '';
          let status = 'Pending';
          let phone = '';
          let remarks = '';
          let block = defaultBlock;

          // If standard headers exist
          const nameCol = headerRow.findIndex(h => h.includes('NAME'));
          const cardCol = headerRow.findIndex(h => h.includes('CARD'));
          const aadharCol = headerRow.findIndex(h => h.includes('AADHAAR') || h.includes('ADHAR'));
          const trackCol = headerRow.findIndex(h => h.includes('TRACK'));
          const blockCol = headerRow.findIndex(h => h.includes('BLOCK'));
          const agentCol = headerRow.findIndex(h => h.includes('AGENT') || h.includes('WORKER'));
          const statusCol = headerRow.findIndex(h => h.includes('STATUS'));

          if (nameCol !== -1 && row[nameCol]) {
            name = String(row[nameCol]).trim();
            if (cardCol !== -1 && row[cardCol]) cardNo = String(row[cardCol]).trim();
            if (aadharCol !== -1 && row[aadharCol]) aadhaarNo = String(row[aadharCol]).trim();
            if (trackCol !== -1 && row[trackCol]) trackNo = String(row[trackCol]).trim();
            if (blockCol !== -1 && row[blockCol]) block = String(row[blockCol]).trim();
            if (agentCol !== -1 && row[agentCol]) agent = String(row[agentCol]).trim();
            if (statusCol !== -1 && row[statusCol]) status = String(row[statusCol]).trim();
          } else {
            // Positional fallback: [SL, Name, Card/Aadhaar, Track, Agent...]
            let startIdx = isNaN(parseInt(row[0])) ? 0 : 1;
            name = String(row[startIdx] || '').trim();
            const col2 = String(row[startIdx + 1] || '').trim();
            if (/^\d{12}$/.test(col2)) aadhaarNo = col2;
            else cardNo = col2;
            trackNo = String(row[startIdx + 2] || '').trim();
            agent = String(row[startIdx + 3] || '').trim();
          }

          if (name && name.length > 1 && name.toUpperCase() !== 'NAME') {
            parsed.push({
              applicantName: name.toUpperCase(),
              cardNo,
              aadhaarNo,
              trackNo,
              block: block || defaultBlock,
              serviceType: defaultService,
              agent,
              officer,
              status,
              phone,
              remarks
            });
          }
        }

        setTotalRows(parsed.length);
        setPreviewRows(parsed);
      } catch (err) {
        setErrorMsg('Error reading file: ' + err.message);
      }
    };
    reader.readAsBinaryString(uploaded);
  };

  const handleConfirmImport = async () => {
    if (previewRows.length === 0) return;
    setIsProcessing(true);
    try {
      await onImportSuccess(previewRows);
      setIsProcessing(false);
      onClose();
    } catch (e) {
      setIsProcessing(false);
      setErrorMsg('Import failed: ' + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-[#0c1429] rounded-2xl max-w-xl w-full border border-slate-700 shadow-2xl my-8 overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#080D1A]">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Import Excel / CSV Applications</h2>
              <p className="text-xs text-slate-400">Upload existing government or field worker spreadsheets</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          
          {/* File input */}
          <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-6 text-center transition-colors bg-[#080D1A]">
            <FileSpreadsheet className="w-10 h-10 text-slate-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-200 mb-1">
              {file ? file.name : 'Click to select or drag and drop Excel (.xlsx, .xls) or CSV file'}
            </p>
            <p className="text-[11px] text-slate-400 mb-3">Supports multi-block and raw government application tables</p>
            
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md shadow-blue-500/25 transition-all"
            >
              Browse File
            </label>
          </div>

          {/* Fallback Defaults */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#080D1A] p-3.5 rounded-xl border border-slate-700/80">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Default Block (if column missing)
              </label>
              <input
                type="text"
                value={defaultBlock}
                onChange={(e) => setDefaultBlock(e.target.value)}
                placeholder="Enter block name"
                className="w-full px-3 py-1.5 text-xs bg-[#0c1429] border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-normal text-white placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Default Service Type
              </label>
              <select
                value={defaultService}
                onChange={(e) => setDefaultService(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-[#0c1429] border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-200"
              >
                <option value="Card Renewal">Card Renewal</option>
                <option value="New Card">New Card</option>
                <option value="Maternity Benefit Apply">Maternity Benefit Apply</option>
                <option value="Marriage Benefit Apply">Marriage Benefit Apply</option>
                <option value="Death Benefit Apply">Death Benefit Apply</option>
                <option value="Education Assistance Apply">Education Assistance</option>
              </select>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-700/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview */}
          {totalRows > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">
                  Detected {totalRows} applications ready to import
                </span>
                <span className="text-slate-400">Showing first 4 rows</span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-[#080D1A] text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Card / Aadhaar</th>
                      <th className="py-2 px-3">Track No</th>
                      <th className="py-2 px-3">Block</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {previewRows.slice(0, 4).map((r, i) => (
                      <tr key={i} className="hover:bg-[#111c38]">
                        <td className="py-1.5 px-3 font-semibold text-white">{r.applicantName}</td>
                        <td className="py-1.5 px-3 font-mono text-slate-300">{r.cardNo || r.aadhaarNo || '-'}</td>
                        <td className="py-1.5 px-3 font-mono text-blue-400">{r.trackNo || '-'}</td>
                        <td className="py-1.5 px-3 text-slate-400">{r.block}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#080D1A] flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={totalRows === 0 || isProcessing}
            onClick={handleConfirmImport}
            className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-blue-500/25 flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{isProcessing ? 'Importing...' : `Import ${totalRows} Applications`}</span>
          </button>
        </div>

      </div>
    </div>
  );
}

