import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, Phone, MapPin, Camera, Save, User, Edit3 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function AddAgentModal({ isOpen, onClose, agentToEdit = null, onAgentCreated }) {
  const { handleAddAgent, handleUpdateAgent } = useApp();

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    village: '',
    photo: ''
  });

  const [photoPreview, setPhotoPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (agentToEdit) {
      setFormData({
        name: agentToEdit.name || '',
        mobile: agentToEdit.mobile || agentToEdit.phone || '',
        village: agentToEdit.village || agentToEdit.block || '',
        photo: agentToEdit.photo || ''
      });
      setPhotoPreview(agentToEdit.photo || null);
    } else {
      setFormData({
        name: '',
        mobile: '',
        village: '',
        photo: ''
      });
      setPhotoPreview(null);
    }
    setErrors({});
  }, [isOpen, agentToEdit ? (agentToEdit.id || agentToEdit.name) : null]);

  if (!isOpen) return null;

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        // Compress avatar to small thumbnail (< 3KB) so it saves seamlessly in Google Sheets
        const canvas = document.createElement('canvas');
        const maxDim = 96;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.75);
        setPhotoPreview(compressed);
        setFormData(prev => ({ ...prev, photo: compressed }));
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const err = {};
    if (!formData.name.trim()) err.name = 'Agent name is required';
    if (!formData.mobile.trim()) err.mobile = 'Mobile number is required';
    else if (!/^[6-9]\d{9}$/.test(formData.mobile.trim())) err.mobile = 'Enter valid 10-digit mobile number (starts with 6, 7, 8, or 9)';
    if (!formData.village.trim()) err.village = 'Village / Area is required';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSaving(true);
      if (agentToEdit) {
        await handleUpdateAgent(agentToEdit.id, formData);
      } else {
        const created = await handleAddAgent(formData);
        if (onAgentCreated) {
          onAgentCreated(created);
        }
      }
      onClose();
    } catch (err) {
      console.error('Agent save error:', err);
      setErrors(prev => ({ ...prev, submit: err.message || 'Failed to save agent. Please try again.' }));
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[92vh] flex flex-col border border-slate-200/90 shadow-2xl overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              {agentToEdit ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {agentToEdit ? `Edit Agent: ${agentToEdit.name}` : 'Add Field Agent / Worker'}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                {agentToEdit ? 'Update agent details, mobile, village, and photo' : 'Register new field operator with contact & village info'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
          
          {/* Photo Upload Section */}
          <div className="flex items-center space-x-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="relative w-16 h-16 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
              {photoPreview ? (
                <img src={photoPreview} alt="Agent Preview" className="w-full h-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-slate-400" />
              )}
            </div>

            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-700 mb-1">Agent Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                id="agent-photo-input-modal"
              />
              <div className="flex items-center gap-2">
                <label
                  htmlFor="agent-photo-input-modal"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-blue-700 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{photoPreview ? 'Change Photo' : 'Upload Photo'}</span>
                </label>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreview(null);
                      setFormData(prev => ({ ...prev, photo: '' }));
                    }}
                    className="text-xs text-rose-600 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[10.5px] text-slate-400 mt-1">JPG, PNG or WEBP format</p>
            </div>
          </div>

          {/* 1. Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Agent / Worker Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter agent name"
              className={`w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-normal text-slate-900 placeholder:text-slate-400 transition-all ${
                errors.name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
              }`}
            />
            {errors.name && <span className="text-xs text-rose-600 mt-0.5 block">{errors.name}</span>}
          </div>

          {/* 2. Mobile No */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mobile Number (10 digits) *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                maxLength={10}
                value={formData.mobile}
                onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value.replace(/\D/g, '') }))}
                placeholder="Enter 10-digit mobile number"
                className={`w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border rounded-xl font-normal text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all ${
                  errors.mobile ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                }`}
              />
            </div>
            {errors.mobile && <span className="text-xs text-rose-600 mt-0.5 block">{errors.mobile}</span>}
          </div>

          {/* 3. Village */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Village / Locality *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={formData.village}
                onChange={(e) => setFormData(prev => ({ ...prev, village: e.target.value }))}
                placeholder="Enter village or locality"
                className={`w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border rounded-xl font-normal text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all ${
                  errors.village ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                }`}
              />
            </div>
            {errors.village && <span className="text-xs text-rose-600 mt-0.5 block">{errors.village}</span>}
          </div>

          {/* Submit Error Display */}
          {errors.submit && (
            <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
              {errors.submit}
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2 shrink-0 bg-slate-50/90 -mx-4 -mb-4 px-4 py-3 sm:-mx-6 sm:-mb-6 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#1E3A8A] hover:bg-[#172554] active:bg-blue-900 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : (agentToEdit ? 'Save Changes' : 'Save Agent')}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
