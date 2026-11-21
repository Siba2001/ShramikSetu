import React, { useState } from 'react';
import { 
  X, 
  User, 
  CreditCard, 
  Hash, 
  MapPin, 
  Phone, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Copy, 
  Check, 
  ExternalLink,
  Building2,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function ViewDetailsModal() {
  const { 
    isViewDetailsOpen, 
    setIsViewDetailsOpen, 
    applicationToView, 
    handleOpenEditModal,
    handleUpdateStatus 
  } = useApp();

  const [copiedTrack, setCopiedTrack] = useState(false);

  if (!isViewDetailsOpen || !applicationToView) return null;

  const app = applicationToView;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedTrack(true);
    setTimeout(() => setCopiedTrack(false), 2000);
  };

  const handleStatusChange = (status) => {
    handleUpdateStatus(app.id, status);
    setIsViewDetailsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200/90 shadow-2xl my-8 overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">{app.applicantName}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {app.serviceType}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">ID: {app.id}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setIsViewDetailsOpen(false);
                handleOpenEditModal(app);
              }}
              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
              title="Edit Application"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-600" />
              <span>Edit</span>
            </button>

            <button 
              onClick={() => setIsViewDetailsOpen(false)} 
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs">
          
          {/* Key Identification Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Card No */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Card Number</div>
              <div className="text-sm font-black font-mono text-slate-900">
                {app.cardNo || <span className="text-slate-400 font-normal italic">Not Registered</span>}
              </div>
            </div>

            {/* Aadhaar No */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Aadhaar Number</div>
              <div className="text-sm font-black font-mono text-slate-900">
                {app.aadhaarNo || <span className="text-slate-400 font-normal italic">Not Provided</span>}
              </div>
            </div>

            {/* Track No */}
            <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200">
              <div className="text-[10px] uppercase font-bold text-blue-700 mb-0.5 flex items-center justify-between">
                <span>Govt Track No</span>
                {app.trackNo && (
                  <button
                    onClick={() => handleCopy(app.trackNo)}
                    className="text-blue-700 hover:text-blue-800 cursor-pointer"
                    title="Copy Track No"
                  >
                    {copiedTrack ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
              <div className="text-sm font-black font-mono text-blue-800">
                {app.trackNo || <span className="text-slate-400 font-normal italic">None</span>}
              </div>
            </div>

          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
            
            {/* District & Block */}
            <div className="space-y-1">
              <span className="text-[10.5px] font-bold text-slate-500 uppercase">Administrative Location</span>
              <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>{app.block || 'General Block'}, {app.district || 'Ganjam'}</span>
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <span className="text-[10.5px] font-bold text-slate-500 uppercase">Phone Number</span>
              <div className="flex items-center gap-1.5 text-slate-800 font-semibold font-mono">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>{app.phone || 'No phone recorded'}</span>
              </div>
            </div>

            {/* Agent / Worker */}
            <div className="space-y-1">
              <span className="text-[10.5px] font-bold text-slate-500 uppercase">Assigned Field Agent</span>
              <div className="font-semibold text-slate-800">
                {app.agent ? (
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                    {app.agent}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">Unassigned</span>
                )}
              </div>
            </div>

            {/* Officer */}
            <div className="space-y-1">
              <span className="text-[10.5px] font-bold text-slate-500 uppercase">Govt Officer / Staff</span>
              <div className="font-semibold text-slate-800">
                {app.officer || <span className="text-slate-400 italic">Not Assigned</span>}
              </div>
            </div>

            {/* Date Applied */}
            <div className="space-y-1">
              <span className="text-[10.5px] font-bold text-slate-500 uppercase">Application Date</span>
              <div className="flex items-center gap-1.5 text-slate-700 font-medium font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{app.createdAt ? app.createdAt.slice(0, 10) : 'N/A'}</span>
              </div>
            </div>

            {/* Current Status */}
            <div className="space-y-1">
              <span className="text-[10.5px] font-bold text-slate-500 uppercase">Current Status</span>
              <div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {app.status}
                </span>
              </div>
            </div>

          </div>

          {/* Remarks & Bank Info */}
          {(app.remarks || app.status === 'Bank Reject' || app.status === 'Query Raised') && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
              <span className="text-[10.5px] font-bold text-amber-800 uppercase flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Remarks / Query / Bank Note:
              </span>
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                {app.remarks || 'No specific remarks recorded for this application.'}
              </p>
            </div>
          )}

          {/* Quick Status Update Bar */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-700">Quick Change Status:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => handleStatusChange('In Progress')}
                className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold border border-indigo-200 cursor-pointer"
              >
                In Progress
              </button>
              <button
                onClick={() => handleStatusChange('Query Raised')}
                className="px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-semibold border border-purple-200 cursor-pointer"
              >
                Raise Query (Q)
              </button>
              <button
                onClick={() => handleStatusChange('Approved')}
                className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold border border-emerald-200 cursor-pointer"
              >
                Approve
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Mark this application as Completed?')) {
                    handleStatusChange('Completed');
                  }
                }}
                className="px-3 py-1 bg-[#1E3A8A] hover:bg-[#172554] active:bg-blue-900 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                Mark Completed
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium font-mono">
            Record ID: {app.id}
          </span>

          <button
            onClick={() => setIsViewDetailsOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
