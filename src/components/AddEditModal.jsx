import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  PlusCircle, 
  User, 
  CreditCard, 
  Hash, 
  MapPin, 
  Phone, 
  UserPlus,
  FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import AddAgentModal from './AddAgentModal';

export default function AddEditModal({ isOpen, onClose, onSave, applicationToEdit, defaultService = 'New Card' }) {
  const { allBlocksList, agents, allAgentsList, districts } = useApp();

  const [formData, setFormData] = useState({
    serviceType: defaultService,
    applicantName: '',
    cardNo: '',
    aadhaarNo: '',
    trackNo: '',
    district: 'Ganjam',
    block: 'Digapahandi',
    agent: '',
    officer: '',
    status: 'Pending',
    phone: '',
    remarks: '',
    details: {}
  });

  const [errors, setErrors] = useState({});
  const [isQuickAddAgentOpen, setIsQuickAddAgentOpen] = useState(false);

  useEffect(() => {
    if (applicationToEdit) {
      setFormData({
        serviceType: applicationToEdit.serviceType || defaultService,
        applicantName: applicationToEdit.applicantName || '',
        cardNo: applicationToEdit.cardNo || '',
        aadhaarNo: applicationToEdit.aadhaarNo || '',
        trackNo: applicationToEdit.trackNo || '',
        district: applicationToEdit.district || 'Ganjam',
        block: applicationToEdit.block || 'Digapahandi',
        agent: applicationToEdit.agent || '',
        officer: applicationToEdit.officer || '',
        status: applicationToEdit.status || 'Pending',
        phone: applicationToEdit.phone || '',
        remarks: applicationToEdit.remarks || '',
        details: applicationToEdit.details || {}
      });
    } else {
      setFormData({
        serviceType: defaultService || 'New Card',
        applicantName: '',
        cardNo: '',
        aadhaarNo: '',
        trackNo: '',
        district: 'Ganjam',
        block: 'Digapahandi',
        agent: allAgentsList[0] || '',
        officer: '',
        status: 'Pending',
        phone: '',
        remarks: '',
        details: {}
      });
    }
    setErrors({});
  }, [applicationToEdit, defaultService, isOpen, allAgentsList]);

  if (!isOpen) return null;

  const isNewCard = formData.serviceType === 'New Card';

  const validate = () => {
    const err = {};
    if (!formData.applicantName.trim()) {
      err.applicantName = 'Applicant name is required';
    }
    if (isNewCard) {
      if (!formData.aadhaarNo.trim()) {
        err.aadhaarNo = 'Aadhaar number is required for New Card';
      } else if (!/^\d{12}$/.test(formData.aadhaarNo.trim())) {
        err.aadhaarNo = 'Aadhaar must be exactly 12 digits';
      }
    } else {
      if (!formData.cardNo.trim() && !formData.aadhaarNo.trim()) {
        err.identity = 'Provide either Card No or Aadhaar No';
      }
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(formData);
    onClose();
  };

  const handleAgentCreated = (newAgent) => {
    setFormData(prev => ({ ...prev, agent: newAgent.name }));
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl my-8 overflow-hidden">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                {isNewCard ? <FileText className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {applicationToEdit 
                    ? `Edit Application: ${formData.applicantName || ''}`
                    : isNewCard 
                    ? 'New Card Application Form' 
                    : 'New Application Entry'
                  }
                </h2>
                <p className="text-xs text-slate-500">
                  {isNewCard 
                    ? 'Simplified entry form: Name, Aadhaar No, Track No, Agent' 
                    : 'Record beneficiary and scheme information'
                  }
                </p>
              </div>
            </div>
            <button 
              type="button"
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* If NOT editing, Scheme Selector */}
            {!applicationToEdit && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Scheme / Application Type:
                </label>
                <select
                  value={formData.serviceType}
                  onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                  className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="New Card">New Nirman Shramik Card</option>
                  <option value="Card Renewal">Card Renewal / Annual Contribution</option>
                  <option value="Marriage Benefit Apply">Marriage Benefit Apply</option>
                  <option value="Maternity Benefit Apply">Maternity Benefit Apply</option>
                  <option value="Death Benefit Apply">Death Benefit Apply</option>
                  <option value="Education Assistance Apply">Education Assistance Apply</option>
                </select>
              </div>
            )}

            {/* NEW CARD SIMPLIFIED FORM (Exactly matching user prompt & Excel image) */}
            {isNewCard ? (
              <div className="space-y-4">
                
                {/* 1. APPLICANT NAME */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    1. Applicant Name *
                  </label>
                  <input
                    type="text"
                    value={formData.applicantName}
                    onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                    placeholder="Enter full name of worker (e.g. KAMALAKANTA BEHERA)"
                    className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-xl focus:ring-2 focus:ring-blue-500/20 font-bold uppercase text-slate-900 ${
                      errors.applicantName ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                    }`}
                  />
                  {errors.applicantName && (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.applicantName}</span>
                  )}
                </div>

                {/* 2. AADHAAR NO */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    2. Aadhaar No (12 Digits) *
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    value={formData.aadhaarNo}
                    onChange={(e) => setFormData({ ...formData, aadhaarNo: e.target.value.replace(/\D/g, '') })}
                    placeholder="e.g. 298095275891"
                    className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-xl font-mono font-bold tracking-wider text-slate-900 focus:ring-2 focus:ring-blue-500/20 ${
                      errors.aadhaarNo ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                    }`}
                  />
                  {errors.aadhaarNo && (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.aadhaarNo}</span>
                  )}
                </div>

                {/* 3. TRACKING NO */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    3. Tracking No
                  </label>
                  <input
                    type="text"
                    value={formData.trackNo}
                    onChange={(e) => setFormData({ ...formData, trackNo: e.target.value })}
                    placeholder="e.g. 037434 or 000274 (Govt tracking id)"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl font-mono font-bold text-blue-700 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* 4. AGENT NAME (Dropdown + Add Agent Button) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      4. Agent Name (Select from Dropdown) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickAddAgentOpen(true)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Add Agent</span>
                    </button>
                  </div>

                  <select
                    value={formData.agent}
                    onChange={(e) => setFormData({ ...formData, agent: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 font-semibold text-slate-800"
                  >
                    <option value="">-- Select Field Agent --</option>
                    {allAgentsList.map(ag => (
                      <option key={ag} value={ag}>{ag}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Agent not listed? Click <strong>+ Add Agent</strong> to register a new field operator with mobile, village, and photo.
                  </p>
                </div>

                {/* Block Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Target Block / Municipality
                  </label>
                  <input
                    type="text"
                    list="new-card-blocks"
                    value={formData.block}
                    onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                    placeholder="e.g. Digapahandi, Sanakhemundi..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  />
                  <datalist id="new-card-blocks">
                    {allBlocksList.map(b => <option key={b} value={b} />)}
                  </datalist>
                </div>

              </div>
            ) : (
              /* GENERAL APPLICATION FORM (For Card Renewal, Maternity, Marriage, Death, etc.) */
              <div className="space-y-4">
                
                {/* Block & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Block *
                    </label>
                    <input
                      type="text"
                      list="general-blocks"
                      value={formData.block}
                      onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                      placeholder="e.g. Digapahandi"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                    <datalist id="general-blocks">
                      {allBlocksList.map(b => <option key={b} value={b} />)}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Status *
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                    >
                      <option value="Pending">Pending</option>
                      <option value="E-Sign Pending">E-Sign Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Query Raised">Query Raised (Q)</option>
                      <option value="Approved">Approved</option>
                      <option value="Completed">Completed (Auto-archive & Delete)</option>
                      <option value="Bank Reject">Bank Reject</option>
                    </select>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Beneficiary Name *
                  </label>
                  <input
                    type="text"
                    value={formData.applicantName}
                    onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                    placeholder="e.g. SANTOSH KUMAR SAHU"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl uppercase font-semibold"
                  />
                  {errors.applicantName && <span className="text-xs text-rose-600 mt-1 block">{errors.applicantName}</span>}
                </div>

                {/* Card No & Aadhaar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Nirman Shramik Card No
                    </label>
                    <input
                      type="text"
                      value={formData.cardNo}
                      onChange={(e) => setFormData({ ...formData, cardNo: e.target.value })}
                      placeholder="e.g. 137246"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Aadhaar No
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      value={formData.aadhaarNo}
                      onChange={(e) => setFormData({ ...formData, aadhaarNo: e.target.value.replace(/\D/g, '') })}
                      placeholder="e.g. 767833210175"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                {/* Track No & Agent Dropdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Track No
                    </label>
                    <input
                      type="text"
                      value={formData.trackNo}
                      onChange={(e) => setFormData({ ...formData, trackNo: e.target.value })}
                      placeholder="e.g. 097313"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono font-bold text-blue-700"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Field Agent
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsQuickAddAgentOpen(true)}
                        className="text-[11px] font-bold text-blue-600 hover:underline"
                      >
                        + Add Agent
                      </button>
                    </div>
                    <select
                      value={formData.agent}
                      onChange={(e) => setFormData({ ...formData, agent: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-semibold text-slate-800"
                    >
                      <option value="">-- Select Agent --</option>
                      {allAgentsList.map(ag => (
                        <option key={ag} value={ag}>{ag}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Remarks / Scheme Notes
                  </label>
                  <input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Notes or query description..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                  />
                </div>

              </div>
            )}

            {/* Footer */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-all shadow-md shadow-blue-600/25 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{applicationToEdit ? 'Save Changes' : isNewCard ? 'Register New Card' : 'Save Application'}</span>
              </button>
            </div>

          </form>

        </div>
      </div>

      {/* Quick Add Agent Modal */}
      <AddAgentModal
        isOpen={isQuickAddAgentOpen}
        onClose={() => setIsQuickAddAgentOpen(false)}
        onAgentCreated={handleAgentCreated}
      />
    </>
  );
}
