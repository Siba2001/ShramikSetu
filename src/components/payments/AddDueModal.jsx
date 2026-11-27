import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, IndianRupee, Calendar, FileText, MessageSquare, Loader2, AlertTriangle } from 'lucide-react';

export default function AddDueModal({ isOpen, onClose, agent, onSubmit }) {
  const [formData, setFormData] = useState({
    dueAmount: '',
    dueDate: new Date().toISOString().slice(0, 10),
    description: '',
    remarks: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !agent) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const amount = parseFloat(formData.dueAmount);
    if (!amount || amount <= 0) {
      setError('Due amount must be greater than zero.');
      return;
    }
    if (amount > 10000000) {
      setError('Due amount exceeds maximum limit.');
      return;
    }
    if (!formData.dueDate) {
      setError('Due date is required.');
      return;
    }
    if (!formData.description.trim()) {
      setError('Description is required.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        agentId: agent.id,
        agentName: agent.name,
        dueAmount: amount,
        dueDate: formData.dueDate,
        description: formData.description.trim(),
        remarks: formData.remarks.trim()
      });
      setFormData({ dueAmount: '', dueDate: new Date().toISOString().slice(0, 10), description: '', remarks: '' });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add due.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Add Due Amount</h3>
            <p className="text-xs text-slate-500 mt-0.5">Agent: <span className="font-semibold text-slate-700">{agent.name}</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors" disabled={loading}>
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Due Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Due Amount (₹) *</label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="number"
                name="dueAmount"
                value={formData.dueAmount}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0.01"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Due Date *</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description *</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Purpose of due amount..."
                rows={2}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                required
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Remarks (Optional)</label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                placeholder="Additional notes..."
                rows={2}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <IndianRupee className="w-4 h-4" />}
              {loading ? 'Adding...' : 'Add Due'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
