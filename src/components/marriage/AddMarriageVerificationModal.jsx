import React, { useState, useEffect } from 'react';
import { X, Save, Heart, Calendar, FileText, User, MapPin, Phone, ShieldCheck, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function AddMarriageVerificationModal({
  isOpen,
  onClose,
  recordToEdit = null,
  defaultBlock = ''
}) {
  const { 
    allBlocksList, 
    handleAddMarriageVerification, 
    handleUpdateMarriageVerification, 
    marriageVerifications 
  } = useApp();

  const [formData, setFormData] = useState({
    slNo: '',
    regNo: '',
    beneficiaryName: '',
    mobile: '',
    block: (defaultBlock && defaultBlock !== 'All') ? defaultBlock : (allBlocksList?.[0] || ''),
    certifyingAuthority: 'Sub-Registrar',
    marriageCertDate: '',
    marriageRegdNo: '',
    marriageFor: 'Daughter',
    dateOfMarriage: '',
    groomName: '',
    daughterName: '',
    remarks: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (recordToEdit) {
      setFormData({
        slNo: recordToEdit.slNo || '',
        regNo: recordToEdit.regNo || '',
        beneficiaryName: recordToEdit.beneficiaryName || '',
        mobile: recordToEdit.mobile || recordToEdit.phone || '',
        block: recordToEdit.block || ((defaultBlock && defaultBlock !== 'All') ? defaultBlock : (allBlocksList?.[0] || '')),
        certifyingAuthority: recordToEdit.certifyingAuthority || 'Sub-Registrar',
        marriageCertDate: recordToEdit.marriageCertDate || '',
        marriageRegdNo: recordToEdit.marriageRegdNo || '',
        marriageFor: recordToEdit.marriageFor || 'Daughter',
        dateOfMarriage: recordToEdit.dateOfMarriage || '',
        groomName: recordToEdit.groomName || '',
        daughterName: recordToEdit.daughterName || '',
        remarks: recordToEdit.remarks || ''
      });
    } else {
      // Auto-assign next SL No based on existing list
      const nextSl = (marriageVerifications?.length || 0) + 1;
      setFormData({
        slNo: nextSl,
        regNo: '',
        beneficiaryName: '',
        mobile: '',
        block: (defaultBlock && defaultBlock !== 'All') ? defaultBlock : (allBlocksList?.[0] || ''),
        certifyingAuthority: 'Sub-Registrar',
        marriageCertDate: '',
        marriageRegdNo: '',
        marriageFor: 'Daughter',
        dateOfMarriage: '',
        groomName: '',
        daughterName: '',
        remarks: ''
      });
    }
    setErrors({});
  }, [recordToEdit, isOpen, defaultBlock, marriageVerifications]);

  if (!isOpen) return null;

  const validate = () => {
    const err = {};
    if (!formData.regNo.trim()) err.regNo = 'Registration number is required';
    if (!formData.beneficiaryName.trim()) err.beneficiaryName = 'Beneficiary name is required';
    if (!formData.block.trim()) err.block = 'Block selection is required';
    if (!formData.certifyingAuthority.trim()) err.certifyingAuthority = 'Certifying Authority is required';
    if (!formData.marriageCertDate) err.marriageCertDate = 'Certificate regd date is required';
    if (!formData.marriageRegdNo.trim()) err.marriageRegdNo = 'Marriage regd no is required';
    if (!formData.marriageFor.trim()) err.marriageFor = 'Marriage for is required';
    if (!formData.dateOfMarriage) err.dateOfMarriage = 'Date of marriage is required';
    if (!formData.groomName.trim()) err.groomName = 'Name of groom is required';
    if (!formData.daughterName.trim()) err.daughterName = 'Name of daughter / bride is required';

    // Mobile Validation (if entered or required)
    if (formData.mobile && formData.mobile.trim()) {
      if (!/^[6-9]\d{9}$/.test(formData.mobile.trim())) {
        err.mobile = 'Enter valid 10-digit mobile number starting with 6, 7, 8, or 9';
      }
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      ...formData,
      slNo: formData.slNo || (marriageVerifications.length + 1),
      regNo: formData.regNo.trim().toUpperCase(),
      beneficiaryName: formData.beneficiaryName.trim().toUpperCase(),
      groomName: formData.groomName.trim().toUpperCase(),
      daughterName: formData.daughterName.trim().toUpperCase(),
      marriageRegdNo: formData.marriageRegdNo.trim().toUpperCase(),
      mobile: formData.mobile.trim()
    };

    if (recordToEdit) {
      handleUpdateMarriageVerification(recordToEdit.id, payload);
    } else {
      handleAddMarriageVerification(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div 
        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-3xl overflow-hidden my-auto animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#0B1325] px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>{recordToEdit ? 'Edit Marriage Verification Entry' : 'New Marriage Verification Entry'}</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Verify List
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Government register verification details for marriage benefit approval
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Section 1: SL No & Registration & Beneficiary */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            {/* SL NO */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                SL No <span className="text-slate-400">(Auto/Manual)</span>
              </label>
              <input
                type="number"
                value={formData.slNo}
                onChange={(e) => setFormData({ ...formData, slNo: e.target.value })}
                placeholder="1"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 text-slate-800"
              />
            </div>

            {/* Registration Number */}
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Registration Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={formData.regNo}
                  onChange={(e) => setFormData({ ...formData, regNo: e.target.value })}
                  placeholder="e.g. GM123456 / REG-987"
                  className={`w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border ${
                    errors.regNo ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-blue-500'
                  } focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 uppercase`}
                />
              </div>
              {errors.regNo && <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.regNo}</p>}
            </div>

            {/* Block */}
            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Block <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <select
                  value={formData.block}
                  onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                >
                  {allBlocksList.map(blk => (
                    <option key={blk} value={blk}>{blk}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Beneficiary Name & Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-7">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Beneficiary Name (Card Holder) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={formData.beneficiaryName}
                  onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })}
                  placeholder="Enter full name of card holder"
                  className={`w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border ${
                    errors.beneficiaryName ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-blue-500'
                  } focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 uppercase`}
                />
              </div>
              {errors.beneficiaryName && <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.beneficiaryName}</p>}
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mobile Number <span className="text-slate-400 text-[10px]">(10 Digits)</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  maxLength={10}
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '') })}
                  placeholder="e.g. 9876543210"
                  className={`w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border ${
                    errors.mobile ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-blue-500'
                  } focus:outline-hidden focus:ring-2 focus:ring-blue-500/20`}
                />
              </div>
              {errors.mobile && <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.mobile}</p>}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Marriage Registration Authority & Certificate Details</span>
            </h4>
          </div>

          {/* Section 3: Certifying Authority, Marriage Certificate Regd Date & Marriage Regd No */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            {/* Certifying Authority */}
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Certifying Authority <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                list="authorityList"
                value={formData.certifyingAuthority}
                onChange={(e) => setFormData({ ...formData, certifyingAuthority: e.target.value })}
                placeholder="e.g. Sub-Registrar / Tahasildar"
                className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border ${
                  errors.certifyingAuthority ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-blue-500'
                } focus:outline-hidden focus:ring-2 focus:ring-blue-500/20`}
              />
              <datalist id="authorityList">
                <option value="Sub-Registrar" />
                <option value="Tahasildar" />
                <option value="Revenue Inspector" />
                <option value="Block Development Officer (BDO)" />
                <option value="Marriage Officer" />
                <option value="Panchayat Executive Officer" />
              </datalist>
              {errors.certifyingAuthority && <p className="text-[11px] text-rose-500 mt-1">{errors.certifyingAuthority}</p>}
            </div>

            {/* Marriage Certificate Regd Date */}
            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Marriage Cert. Regd Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={formData.marriageCertDate}
                  onChange={(e) => setFormData({ ...formData, marriageCertDate: e.target.value })}
                  className={`w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border ${
                    errors.marriageCertDate ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-blue-500'
                  } focus:outline-hidden focus:ring-2 focus:ring-blue-500/20`}
                />
              </div>
              {errors.marriageCertDate && <p className="text-[11px] text-rose-500 mt-1">{errors.marriageCertDate}</p>}
            </div>

            {/* Marriage Regd No */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Marriage Regd. No <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.marriageRegdNo}
                onChange={(e) => setFormData({ ...formData, marriageRegdNo: e.target.value })}
                placeholder="e.g. 142/2024"
                className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border ${
                  errors.marriageRegdNo ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-blue-500'
                } focus:outline-hidden focus:ring-2 focus:ring-blue-500/20`}
              />
              {errors.marriageRegdNo && <p className="text-[11px] text-rose-500 mt-1">{errors.marriageRegdNo}</p>}
            </div>
          </div>

          {/* Section 4: Marriage For & Date of Marriage */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Marriage For <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.marriageFor}
                onChange={(e) => setFormData({ ...formData, marriageFor: e.target.value })}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                <option value="Daughter">Daughter</option>
                <option value="Self">Self (Worker Female/Male)</option>
                <option value="Son">Son</option>
                <option value="Dependent Sister">Dependent Sister</option>
              </select>
            </div>

            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Date of Marriage <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={formData.dateOfMarriage}
                  onChange={(e) => setFormData({ ...formData, dateOfMarriage: e.target.value })}
                  className={`w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border ${
                    errors.dateOfMarriage ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-blue-500'
                  } focus:outline-hidden focus:ring-2 focus:ring-blue-500/20`}
                />
              </div>
              {errors.dateOfMarriage && <p className="text-[11px] text-rose-500 mt-1">{errors.dateOfMarriage}</p>}
            </div>
          </div>

          {/* Section 5: Name of Groom & Name of Daughter */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Name of Groom <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.groomName}
                onChange={(e) => setFormData({ ...formData, groomName: e.target.value })}
                placeholder="Full name of Groom"
                className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border ${
                  errors.groomName ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-blue-500'
                } focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 uppercase`}
              />
              {errors.groomName && <p className="text-[11px] text-rose-500 mt-1">{errors.groomName}</p>}
            </div>

            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Name of Daughter / Bride <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.daughterName}
                onChange={(e) => setFormData({ ...formData, daughterName: e.target.value })}
                placeholder="Full name of Daughter / Bride"
                className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border ${
                  errors.daughterName ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-blue-500'
                } focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 uppercase`}
              />
              {errors.daughterName && <p className="text-[11px] text-rose-500 mt-1">{errors.daughterName}</p>}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Remarks / Verification Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="e.g. Original certificate verified by Revenue Inspector"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Modal Footer */}
          <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{recordToEdit ? 'Update Verification Entry' : 'Save Verification Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
