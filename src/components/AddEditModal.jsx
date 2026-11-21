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
  FileText,
  Cross,
  Baby
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
    block: '',
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
        block: applicationToEdit.block || '',
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
        block: '',
        agent: '',
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
  const isRenewal = formData.serviceType === 'Card Renewal';
  const isDeath = formData.serviceType === 'Death Benefit Apply';
  const isMaternity = formData.serviceType === 'Maternity Benefit Apply';

  const validate = () => {
    const err = {};

    // 1. Block Validation (All Modules)
    if (!formData.block || !formData.block.trim()) {
      err.block = 'Block / Municipality is required';
    }

    // 2. Name Validation (All Modules)
    const nameTrimmed = (formData.applicantName || '').trim();
    if (!nameTrimmed) {
      err.applicantName = isMaternity
        ? 'Beneficiary name is required'
        : (isRenewal || isDeath)
          ? 'Card holder name is required'
          : 'Name is required';
    } else if (nameTrimmed.length < 2) {
      err.applicantName = 'Name must be at least 2 characters';
    }

    // 3. Scheme specific ID Validation
    if (isNewCard) {
      const aadhaarTrimmed = (formData.aadhaarNo || '').trim();
      if (!aadhaarTrimmed) {
        err.aadhaarNo = 'Aadhaar number is required';
      } else if (!/^\d{12}$/.test(aadhaarTrimmed)) {
        err.aadhaarNo = 'Aadhaar must be exactly 12 numeric digits';
      }
    } else if (isRenewal || isDeath || isMaternity) {
      const cardTrimmed = (formData.cardNo || '').trim();
      if (!cardTrimmed) {
        err.cardNo = 'Nirman Shramik Card number is required';
      } else if (cardTrimmed.length < 3) {
        err.cardNo = 'Card number must be at least 3 characters';
      }
    } else {
      if (!formData.cardNo?.trim() && !formData.aadhaarNo?.trim()) {
        err.cardNo = 'Provide either Card No or Aadhaar No';
      } else if (formData.aadhaarNo?.trim() && !/^\d{12}$/.test(formData.aadhaarNo.trim())) {
        err.aadhaarNo = 'Aadhaar must be exactly 12 numeric digits';
      }
    }

    // 4. Tracking Number Validation (All Modules)
    const trackTrimmed = (formData.trackNo || '').trim();
    if (!trackTrimmed) {
      err.trackNo = 'Tracking number is required';
    } else if (trackTrimmed.length < 2) {
      err.trackNo = 'Tracking number must be at least 2 characters';
    }

    // 5. Agent Name Validation (All Modules)
    if (!formData.agent || !formData.agent.trim()) {
      err.agent = 'Please select a field agent';
    }

    // 6. Remarks Validation (Death Benefit & Maternity Benefit)
    if (isDeath) {
      if (!formData.remarks || !formData.remarks.trim()) {
        err.remarks = 'Remark / cause of death is required';
      }
    } else if (isMaternity) {
      if (!formData.remarks || !formData.remarks.trim()) {
        err.remarks = 'Remark / delivery details are required';
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
        <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200/90 shadow-2xl my-6 overflow-hidden text-slate-800">

          {/* Header */}
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                {isNewCard ? <FileText className="w-4 h-4" /> : isRenewal ? <CreditCard className="w-4 h-4" /> : isDeath ? <Cross className="w-4 h-4" /> : isMaternity ? <Baby className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {applicationToEdit
                    ? `Edit Application: ${formData.applicantName || ''}`
                    : isNewCard
                      ? 'New Card Application Form'
                      : isRenewal
                        ? 'Card Renewal Application Form'
                        : isDeath
                          ? 'Death Benefit Application Form'
                          : isMaternity
                            ? 'Maternity Benefit Application Form'
                            : 'New Application Entry'
                  }
                </h2>
                <p className="text-[11px] text-slate-500">
                  {applicationToEdit
                    ? 'Update beneficiary details and records'
                    : isNewCard
                      ? 'New worker card registration'
                      : isRenewal
                        ? 'Card renewal and annual contribution'
                        : isDeath
                          ? 'Death benefit assistance application'
                          : isMaternity
                            ? 'Maternity financial assistance application'
                            : 'Enter beneficiary and application details'
                  }
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3">

            {/* If NOT editing, Scheme Selector */}
            {!applicationToEdit && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                <label className="text-xs font-semibold text-slate-700">
                  Scheme / Application Type:
                </label>
                <select
                  value={formData.serviceType}
                  onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                  className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
              <div className="space-y-3">

                {/* 1. APPLICANT NAME */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    1. Applicant Name *
                  </label>
                  <input
                    type="text"
                    value={formData.applicantName}
                    onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                    placeholder="Enter applicant name"
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl focus:ring-2 focus:ring-blue-500/20 font-normal text-slate-900 placeholder:text-slate-400 placeholder:font-normal placeholder:normal-case ${errors.applicantName ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                      }`}
                  />
                  {errors.applicantName && (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.applicantName}</span>
                  )}
                </div>

                {/* 2. AADHAAR NO */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    2. Aadhaar No (12 Digits) *
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    value={formData.aadhaarNo}
                    onChange={(e) => setFormData({ ...formData, aadhaarNo: e.target.value.replace(/\D/g, '') })}
                    placeholder="Enter 12-digit Aadhaar number"
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl font-normal text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:ring-2 focus:ring-blue-500/20 ${errors.aadhaarNo ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                      }`}
                  />
                  {errors.aadhaarNo && (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.aadhaarNo}</span>
                  )}
                </div>

                {/* 3. TRACKING NO */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    3. Tracking No *
                  </label>
                  <input
                    type="text"
                    value={formData.trackNo}
                    onChange={(e) => setFormData({ ...formData, trackNo: e.target.value })}
                    placeholder="Enter tracking number"
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl font-normal text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:ring-2 focus:ring-blue-500/20 ${errors.trackNo ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'}`}
                  />
                  {errors.trackNo && (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.trackNo}</span>
                  )}
                </div>

                {/* 4. AGENT NAME (Dropdown + Add Agent Button) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      4. Agent Name (Select from Dropdown) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickAddAgentOpen(true)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Add Agent</span>
                    </button>
                  </div>

                  <select
                    value={formData.agent}
                    onChange={(e) => setFormData({ ...formData, agent: e.target.value })}
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl focus:ring-2 focus:ring-blue-500/20 font-normal text-slate-800 ${errors.agent ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'}`}
                  >
                    <option value="">-- Select Field Agent --</option>
                    {allAgentsList.map(ag => (
                      <option key={ag} value={ag}>{ag}</option>
                    ))}
                  </select>
                  {errors.agent ? (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.agent}</span>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Agent not listed? Click <strong>+ Add Agent</strong> to register a new field operator.
                    </p>
                  )}
                </div>

                {/* Block Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    5. Target Block / Municipality *
                  </label>
                  <input
                    type="text"
                    list="new-card-blocks"
                    value={formData.block}
                    onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                    placeholder="Enter or select block"
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border rounded-xl font-normal text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 ${errors.block ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'}`}
                  />
                  <datalist id="new-card-blocks">
                    {allBlocksList.map(b => <option key={b} value={b} />)}
                  </datalist>
                  {errors.block && (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.block}</span>
                  )}
                </div>

              </div>
            ) : isRenewal ? (
              /* CARD RENEWAL SIMPLIFIED FORM (Block, Name, Card No, Track No, Agent) */
              <div className="space-y-3">

                {/* 1. BLOCK */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    1. Block / Municipality *
                  </label>
                  <input
                    type="text"
                    list="renewal-blocks"
                    value={formData.block}
                    onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                    placeholder="Enter or select block"
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border rounded-xl font-normal text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 ${errors.block ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'}`}
                  />
                  <datalist id="renewal-blocks">
                    {allBlocksList.map(b => <option key={b} value={b} />)}
                  </datalist>
                  {errors.block && (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.block}</span>
                  )}
                </div>

                {/* 2. NAME */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    2. Card Holder Name *
                  </label>
                  <input
                    type="text"
                    value={formData.applicantName}
                    onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                    placeholder="Enter card holder name"
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl focus:ring-2 focus:ring-blue-500/20 font-normal text-slate-900 placeholder:text-slate-400 placeholder:font-normal placeholder:normal-case ${errors.applicantName ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                      }`}
                  />
                  {errors.applicantName && (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.applicantName}</span>
                  )}
                </div>

                {/* 3. CARD NO */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    3. Nirman Shramik Card No *
                  </label>
                  <input
                    type="text"
                    value={formData.cardNo}
                    onChange={(e) => setFormData({ ...formData, cardNo: e.target.value })}
                    placeholder="Enter card number"
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl focus:ring-2 focus:ring-blue-500/20 font-normal text-slate-900 placeholder:text-slate-400 placeholder:font-normal ${errors.cardNo ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                      }`}
                  />
                  {errors.cardNo && (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.cardNo}</span>
                  )}
                </div>

                {/* 4. TRACKING NUMBER */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    4. Tracking Number *
                  </label>
                  <input
                    type="text"
                    value={formData.trackNo}
                    onChange={(e) => setFormData({ ...formData, trackNo: e.target.value })}
                    placeholder="Enter tracking number"
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl font-normal text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:ring-2 focus:ring-blue-500/20 ${errors.trackNo ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'}`}
                  />
                  {errors.trackNo && (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.trackNo}</span>
                  )}
                </div>

                {/* 5. AGENT NAME */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      5. Agent Name *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickAddAgentOpen(true)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Add Agent</span>
                    </button>
                  </div>

                  <select
                    value={formData.agent}
                    onChange={(e) => setFormData({ ...formData, agent: e.target.value })}
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl focus:ring-2 focus:ring-blue-500/20 font-normal text-slate-800 ${errors.agent ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'}`}
                  >
                    <option value="">-- Select Field Agent --</option>
                    {allAgentsList.map(ag => (
                      <option key={ag} value={ag}>{ag}</option>
                    ))}
                  </select>
                  {errors.agent ? (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.agent}</span>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Agent not listed? Click <strong>+ Add Agent</strong> to register a new field operator.
                    </p>
                  )}
                </div>

              </div>
            ) : isDeath ? (
              /* DEATH BENEFIT SIMPLIFIED FORM (Block, Name, Card No, Track No, Agent, Remark) */
              <div className="space-y-3">

                {/* 1. BLOCK */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    1. Block / Municipality *
                  </label>
                  <input
                    type="text"
                    list="death-blocks"
                    value={formData.block}
                    onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                    placeholder="Enter or select block"
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border rounded-xl font-normal text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 ${errors.block ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'}`}
                  />
                  <datalist id="death-blocks">
                    {allBlocksList.map(b => <option key={b} value={b} />)}
                  </datalist>
                  {errors.block && (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.block}</span>
                  )}
                </div>

                {/* 2. NAME */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    2. Card Holder Name *
                  </label>
                  <input
                    type="text"
                    value={formData.applicantName}
                    onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                    placeholder="Enter card holder name"
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl focus:ring-2 focus:ring-blue-500/20 font-normal text-slate-900 placeholder:text-slate-400 placeholder:font-normal placeholder:normal-case ${errors.applicantName ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                      }`}
                  />
                  {errors.applicantName && (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.applicantName}</span>
                  )}
                </div>

                {/* 3. CARD NO */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    3. Nirman Shramik Card No *
                  </label>
                  <input
                    type="text"
                    value={formData.cardNo}
                    onChange={(e) => setFormData({ ...formData, cardNo: e.target.value })}
                    placeholder="Enter card number"
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl focus:ring-2 focus:ring-blue-500/20 font-normal text-slate-900 placeholder:text-slate-400 placeholder:font-normal ${errors.cardNo ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                      }`}
                  />
                  {errors.cardNo && (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.cardNo}</span>
                  )}
                </div>

                {/* 4. TRACKING NUMBER */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    4. Tracking Number *
                  </label>
                  <input
                    type="text"
                    value={formData.trackNo}
                    onChange={(e) => setFormData({ ...formData, trackNo: e.target.value })}
                    placeholder="Enter tracking number"
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl font-normal text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:ring-2 focus:ring-blue-500/20 ${errors.trackNo ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'}`}
                  />
                  {errors.trackNo && (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.trackNo}</span>
                  )}
                </div>

                {/* 5. AGENT NAME */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      5. Agent Name (Select from Dropdown) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickAddAgentOpen(true)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Add Agent</span>
                    </button>
                  </div>

                  <select
                    value={formData.agent}
                    onChange={(e) => setFormData({ ...formData, agent: e.target.value })}
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl focus:ring-2 focus:ring-blue-500/20 font-normal text-slate-800 ${errors.agent ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'}`}
                  >
                    <option value="">-- Select Field Agent --</option>
                    {allAgentsList.map(ag => (
                      <option key={ag} value={ag}>{ag}</option>
                    ))}
                  </select>
                  {errors.agent ? (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.agent}</span>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Agent not listed? Click <strong>+ Add Agent</strong> to register a new field operator.
                    </p>
                  )}
                </div>

                {/* 6. REMARK */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    6. Remark / Notes *
                  </label>
                  <input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Enter remarks or notes"
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl font-normal text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 ${errors.remarks ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'}`}
                  />
                  {errors.remarks && (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.remarks}</span>
                  )}
                </div>

              </div>
            ) : isMaternity ? (
              /* MATERNITY BENEFIT SIMPLIFIED FORM (Block, Beneficiary Name, Card No, Track No, Agent, Remark) */
              <div className="space-y-3">

                {/* 1. BLOCK */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    1. Block / Municipality *
                  </label>
                  <input
                    type="text"
                    list="maternity-blocks"
                    value={formData.block}
                    onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                    placeholder="Enter or select block"
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border rounded-xl font-normal text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 ${errors.block ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'}`}
                  />
                  <datalist id="maternity-blocks">
                    {allBlocksList.map(b => <option key={b} value={b} />)}
                  </datalist>
                  {errors.block && (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.block}</span>
                  )}
                </div>

                {/* 2. BENEFICIARY NAME */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    2. Beneficiary Name *
                  </label>
                  <input
                    type="text"
                    value={formData.applicantName}
                    onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                    placeholder="Enter beneficiary name"
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl focus:ring-2 focus:ring-blue-500/20 font-normal text-slate-900 placeholder:text-slate-400 placeholder:font-normal placeholder:normal-case ${errors.applicantName ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                      }`}
                  />
                  {errors.applicantName && (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.applicantName}</span>
                  )}
                </div>

                {/* 3. CARD NO */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    3. Nirman Shramik Card No *
                  </label>
                  <input
                    type="text"
                    value={formData.cardNo}
                    onChange={(e) => setFormData({ ...formData, cardNo: e.target.value })}
                    placeholder="Enter card number"
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl focus:ring-2 focus:ring-blue-500/20 font-normal text-slate-900 placeholder:text-slate-400 placeholder:font-normal ${errors.cardNo ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                      }`}
                  />
                  {errors.cardNo && (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.cardNo}</span>
                  )}
                </div>

                {/* 4. TRACKING NUMBER */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    4. Tracking Number *
                  </label>
                  <input
                    type="text"
                    value={formData.trackNo}
                    onChange={(e) => setFormData({ ...formData, trackNo: e.target.value })}
                    placeholder="Enter tracking number"
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl font-normal text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:ring-2 focus:ring-blue-500/20 ${errors.trackNo ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'}`}
                  />
                  {errors.trackNo && (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.trackNo}</span>
                  )}
                </div>

                {/* 5. AGENT NAME */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      5. Agent Name (Select from Dropdown) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickAddAgentOpen(true)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Add Agent</span>
                    </button>
                  </div>

                  <select
                    value={formData.agent}
                    onChange={(e) => setFormData({ ...formData, agent: e.target.value })}
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl focus:ring-2 focus:ring-blue-500/20 font-normal text-slate-800 ${errors.agent ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'}`}
                  >
                    <option value="">-- Select Field Agent --</option>
                    {allAgentsList.map(ag => (
                      <option key={ag} value={ag}>{ag}</option>
                    ))}
                  </select>
                  {errors.agent ? (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.agent}</span>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Agent not listed? Click <strong>+ Add Agent</strong> to register a new field operator.
                    </p>
                  )}
                </div>

                {/* 6. REMARK */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    6. Remark / Notes *
                  </label>
                  <input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Enter remarks or notes"
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl font-normal text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 ${errors.remarks ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'}`}
                  />
                  {errors.remarks && (
                    <span className="text-xs text-rose-600 mt-1 block">{errors.remarks}</span>
                  )}
                </div>

              </div>
            ) : (
              /* GENERAL APPLICATION FORM (For Maternity, Marriage, Education, etc.) */
              <div className="space-y-3">

                {/* Block & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Block *
                    </label>
                    <input
                      type="text"
                      list="general-blocks"
                      value={formData.block}
                      onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                      placeholder="Enter or select block"
                      className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl font-normal text-slate-800 placeholder:text-slate-400 ${errors.block ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'}`}
                    />
                    <datalist id="general-blocks">
                      {allBlocksList.map(b => <option key={b} value={b} />)}
                    </datalist>
                    {errors.block && (
                      <span className="text-xs text-rose-600 mt-1 block">{errors.block}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Status *
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl font-normal text-slate-800"
                    >
                      <option value="Pending">Pending</option>
                      <option value="E-Sign Pending">E-Sign Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Query Raised">Query Raised (Q)</option>
                      <option value="Approved">Approved</option>
                      <option value="Completed">Completed</option>
                      <option value="Bank Reject">Bank Reject</option>
                    </select>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Card Holder Name *
                  </label>
                  <input
                    type="text"
                    value={formData.applicantName}
                    onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                    placeholder="Enter card holder name"
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl font-normal text-slate-800 placeholder:text-slate-400 placeholder:font-normal placeholder:normal-case ${errors.applicantName ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'}`}
                  />
                  {errors.applicantName && <span className="text-xs text-rose-600 mt-1 block">{errors.applicantName}</span>}
                </div>

                {/* Card No & Aadhaar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nirman Shramik Card No
                    </label>
                    <input
                      type="text"
                      value={formData.cardNo}
                      onChange={(e) => setFormData({ ...formData, cardNo: e.target.value })}
                      placeholder="Enter card number"
                      className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl font-normal text-slate-800 placeholder:text-slate-400 ${errors.cardNo ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'}`}
                    />
                    {errors.cardNo && <span className="text-xs text-rose-600 mt-1 block">{errors.cardNo}</span>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Aadhaar No
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      value={formData.aadhaarNo}
                      onChange={(e) => setFormData({ ...formData, aadhaarNo: e.target.value.replace(/\D/g, '') })}
                      placeholder="Enter 12-digit Aadhaar number"
                      className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl font-normal text-slate-800 placeholder:text-slate-400 ${errors.aadhaarNo ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'}`}
                    />
                    {errors.aadhaarNo && <span className="text-xs text-rose-600 mt-1 block">{errors.aadhaarNo}</span>}
                  </div>
                </div>

                {/* Track No & Agent Dropdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Track No *
                    </label>
                    <input
                      type="text"
                      value={formData.trackNo}
                      onChange={(e) => setFormData({ ...formData, trackNo: e.target.value })}
                      placeholder="Enter tracking number"
                      className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl font-normal text-slate-800 placeholder:text-slate-400 ${errors.trackNo ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'}`}
                    />
                    {errors.trackNo && <span className="text-xs text-rose-600 mt-1 block">{errors.trackNo}</span>}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Field Agent *
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsQuickAddAgentOpen(true)}
                        className="text-[11px] font-semibold text-blue-600 hover:underline"
                      >
                        + Add Agent
                      </button>
                    </div>
                    <select
                      value={formData.agent}
                      onChange={(e) => setFormData({ ...formData, agent: e.target.value })}
                      className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white border rounded-xl font-normal text-slate-800 ${errors.agent ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'}`}
                    >
                      <option value="">-- Select Agent --</option>
                      {allAgentsList.map(ag => (
                        <option key={ag} value={ag}>{ag}</option>
                      ))}
                    </select>
                    {errors.agent && <span className="text-xs text-rose-600 mt-1 block">{errors.agent}</span>}
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Remarks / Scheme Notes
                  </label>
                  <input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Enter remarks or notes"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl font-normal text-slate-800 placeholder:text-slate-400"
                  />
                </div>

              </div>
            )}

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold text-white bg-[#1E3A8A] hover:bg-[#172554] active:bg-blue-900 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{applicationToEdit ? 'Save Changes' : isNewCard ? 'Register New Card' : isRenewal ? 'Register Card Renewal' : isDeath ? 'Register Death Benefit' : isMaternity ? 'Register Maternity Benefit' : 'Save Application'}</span>
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
