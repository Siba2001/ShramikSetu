import React, { useState } from 'react';
import { 
  X, 
  Database, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw,
  FileCode
} from 'lucide-react';
import { 
  getGoogleScriptUrl, 
  setGoogleScriptUrl, 
  fetchFromGoogleSheet, 
  pushAllToGoogleSheet 
} from '../services/db';

export default function GoogleSheetModal({ 
  isOpen, 
  onClose, 
  onSyncComplete 
}) {
  const [url, setUrl] = useState(getGoogleScriptUrl());
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const handleSaveAndTest = async () => {
    if (!url.trim()) {
      setGoogleScriptUrl('');
      setStatusMsg({ type: 'info', text: 'Google Sheet link cleared. Operating in Local Storage mode.' });
      onSyncComplete();
      return;
    }

    setTesting(true);
    setStatusMsg(null);
    try {
      setGoogleScriptUrl(url.trim());
      const apps = await fetchFromGoogleSheet();
      setTesting(false);
      setStatusMsg({ 
        type: 'success', 
        text: `Connected successfully! Synced ${apps.length} applications from your Google Sheet.` 
      });
      onSyncComplete();
    } catch (e) {
      setTesting(false);
      setStatusMsg({ 
        type: 'error', 
        text: `Connection test failed: ${e.message}. Ensure your Google Apps Script is deployed as Web App with access set to "Anyone".` 
      });
    }
  };

  const handlePushAll = async () => {
    if (!url.trim()) {
      setStatusMsg({ type: 'error', text: 'Enter Google Script URL first.' });
      return;
    }
    setTesting(true);
    try {
      await pushAllToGoogleSheet();
      setTesting(false);
      setStatusMsg({ type: 'success', text: 'All local applications uploaded to Google Sheet successfully!' });
      onSyncComplete();
    } catch (e) {
      setTesting(false);
      setStatusMsg({ type: 'error', text: `Upload failed: ${e.message}` });
    }
  };

  const copyAppsScriptCode = () => {
    const code = `/**
 * SHRAMIK SETU - GOOGLE APPS SCRIPT BACKEND
 * Deploy this code in Extensions -> Apps Script
 */
const SHEET_NAME = "Applications";
const ARCHIVE_SHEET_NAME = "Completed_Archive";
const HEADERS = ["ID","Service Type","Applicant Name","Card No","Aadhaar No","Track No","Block","Agent / Worker","Officer / Staff","Status","Phone No","Bank / Query Remarks","Created At","Updated At"];

function doGet(e) {
  const sheet = getOrCreateSheet(SHEET_NAME);
  const data = getSheetData(sheet);
  return ContentService.createTextOutput(JSON.stringify({ success: true, count: data.length, data: data })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const payload = postData.payload;
    const sheet = getOrCreateSheet(SHEET_NAME);
    const now = new Date().toISOString();

    if (action === "add") {
      const id = "SS-" + new Date().getTime();
      sheet.appendRow([id, payload.serviceType||"", payload.applicantName||"", payload.cardNo||"", payload.aadhaarNo||"", payload.trackNo||"", payload.block||"", payload.agent||"", payload.officer||"", payload.status||"Pending", payload.phone||"", payload.remarks||"", now, now]);
      return ContentService.createTextOutput(JSON.stringify({ success: true, id: id })).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === "delete") {
      const id = payload.id;
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(id)) {
          const archiveSheet = getOrCreateSheet(ARCHIVE_SHEET_NAME);
          archiveSheet.appendRow(data[i]);
          sheet.deleteRow(i + 1);
          return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }
    if (action === "batchImport") {
      const items = payload.items || [];
      const rows = items.map((it, idx) => [it.id||("SS-"+(Date.now()+idx)), it.serviceType||"", it.applicantName||"", it.cardNo||"", it.aadhaarNo||"", it.trackNo||"", it.block||"", it.agent||"", it.officer||"", it.status||"Pending", it.phone||"", it.remarks||"", now, now]);
      if (rows.length > 0) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
      return ContentService.createTextOutput(JSON.stringify({ success: true, count: rows.length })).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(name);
  if (!s) { s = ss.insertSheet(name); s.appendRow(HEADERS); }
  return s;
}

function getSheetData(s) {
  const d = s.getDataRange().getValues();
  if (d.length <= 1) return [];
  const res = [];
  for (let i = 1; i < d.length; i++) {
    res.push({ id: String(d[i][0]), serviceType: String(d[i][1]), applicantName: String(d[i][2]), cardNo: String(d[i][3]), aadhaarNo: String(d[i][4]), trackNo: String(d[i][5]), block: String(d[i][6]), agent: String(d[i][7]), officer: String(d[i][8]), status: String(d[i][9]), phone: String(d[i][10]), remarks: String(d[i][11]) });
  }
  return res;
}`;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl my-8 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Google Sheet & Apps Script Database</h2>
              <p className="text-xs text-slate-500">Live 2-way synchronization with your Google Spreadsheet</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Google Apps Script Web App URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Leave blank to continue using fast, offline-capable LocalStorage database.
            </p>
          </div>

          {statusMsg && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              statusMsg.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : statusMsg.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleSaveAndTest}
              disabled={testing}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Connecting...' : 'Test & Save URL'}</span>
            </button>

            <button
              onClick={handlePushAll}
              disabled={testing || !url}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
              <span>Push All Local to Sheet</span>
            </button>
          </div>

          {/* Setup Instructions Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs text-slate-700">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-emerald-600" />
                Quick 2-Minute Google Setup:
              </span>
              <button
                onClick={copyAppsScriptCode}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-white px-2 py-1 rounded border border-slate-200 hover:border-blue-300 transition-colors"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? 'Copied Script!' : 'Copy Code.gs'}</span>
              </button>
            </div>

            <ol className="list-decimal pl-4 space-y-1 text-slate-600 text-[11.5px] leading-relaxed">
              <li>Open a blank Google Sheet at <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-blue-600 underline">sheets.new</a></li>
              <li>Go to <strong>Extensions &gt; Apps Script</strong></li>
              <li>Paste the copied script code (or file from <code>google-apps-script/Code.gs</code>)</li>
              <li>Click <strong>Deploy &gt; New deployment</strong></li>
              <li>Select <strong>Web app</strong>, set <em>Who has access</em> to <strong>Anyone</strong></li>
              <li>Deploy and paste the Web App URL into the box above!</li>
            </ol>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

