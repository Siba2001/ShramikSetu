import React from 'react';
import { 
  Building2, 
  ExternalLink, 
  PlusCircle, 
  FileDown, 
  FileUp, 
  Database, 
  CheckCircle2, 
  WifiOff, 
  RefreshCw 
} from 'lucide-react';

export default function Header({ 
  onOpenAddModal, 
  onOpenExportModal, 
  onOpenImportModal, 
  onOpenGoogleModal,
  isGasConnected,
  gasUrl,
  totalActiveCount,
  onQuickRefresh
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-3">
          
          {/* Logo & Portal Info */}
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 bg-gradient-to-tr from-blue-700 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                  Shramik<span className="text-blue-600">Setu</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    Odisha
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                ନିର୍ମାଣ ଶ୍ରମିକ ଆବେଦନ ପରିଚାଳନା ପୋର୍ଟାଲ • Application & Block Data Manager
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">

            {/* Block Download Button */}
            <button
              onClick={onOpenExportModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-sm"
              title="Download Block-wise Data in Excel / CSV"
            >
              <FileDown className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Download Data</span>
              <span className="sm:hidden">Export</span>
            </button>

            {/* Import Button */}
            <button
              onClick={onOpenImportModal}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-sm"
              title="Import Data from Excel or CSV"
            >
              <FileUp className="w-4 h-4 text-slate-500" />
              <span>Import Excel</span>
            </button>

            {/* Add Application Button */}
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all shadow-sm shadow-blue-500/25"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Entry</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
}

