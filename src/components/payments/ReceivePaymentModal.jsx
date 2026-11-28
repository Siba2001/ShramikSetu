import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, IndianRupee, Calendar, CreditCard, FileText, MessageSquare, Loader2, AlertTriangle, CheckCircle2, Banknote, Share2 } from 'lucide-react';

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer'];

export default function ReceivePaymentModal({ isOpen, onClose, agent, agentSummary, onSubmit, onShareWhatsApp }) {
  const [formData, setFormData] = useState({
    receivedAmount: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'Cash',
    transactionReference: '',
    remarks: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  const totalDue = agentSummary?.totalDue || 0;
  const totalPaid = agentSummary?.totalPaid || 0;
  const outstanding = agentSummary?.outstanding || 0;

  useEffect(() => {
    if (isOpen) {
      setFormData({
        receivedAmount: '',
        paymentDate: new Date().toISOString().slice(0, 10),
        paymentMethod: 'Cash',
        transactionReference: '',
        remarks: ''
      });
      setError('');
      setSuccessResult(null);
    }
  }, [isOpen]);

  if (!isOpen || !agent) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handlePayFull = () => {
    setFormData(prev => ({ ...prev, receivedAmount: outstanding.toFixed(2) }));
  };

  const receivedAmount = parseFloat(formData.receivedAmount) || 0;
  const remainingAfter = Math.max(0, outstanding - receivedAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!receivedAmount || receivedAmount <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }
    if (receivedAmount > outstanding) {
      setError(`Payment amount (₹${receivedAmount.toFixed(2)}) cannot exceed outstanding balance (₹${outstanding.toFixed(2)}).`);
      return;
    }
    if (!formData.paymentDate) {
      setError('Payment date is required.');
      return;
    }
    if (formData.paymentMethod !== 'Cash' && !formData.transactionReference.trim()) {
      setError('Transaction reference is required for UPI/Bank Transfer payments.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        agentId: agent.id,
        agentName: agent.name,
        amount: receivedAmount,
        paymentDate: formData.paymentDate,
        paymentMethod: formData.paymentMethod,
        transactionReference: formData.transactionReference.trim(),
        remarks: formData.remarks.trim()
      });
      setSuccessResult({
        receivedAmount,
        paymentDate: formData.paymentDate,
        paymentMethod: formData.paymentMethod,
        transactionReference: formData.transactionReference.trim(),
        remainingAfter,
        agent: {
          ...agent,
          totalDue,
          totalPaid: totalPaid + receivedAmount,
          remaining: remainingAfter,
          lastPaymentDate: formData.paymentDate
        }
      });
    } catch (err) {
      setError(err.message || 'Failed to record payment.');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-green-50 rounded-t-2xl sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {successResult ? 'Payment Acknowledged' : 'Receive Payment'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Agent: <span className="font-semibold text-slate-700">{agent.name}</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors" disabled={loading}>
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {successResult ? (
          <div className="p-6 space-y-5 text-center animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Payment Recorded Successfully!</h4>
              <p className="text-xs text-slate-500 mt-1">
                Amount credited towards <span className="font-semibold text-slate-800">{agent.name}</span>'s outstanding dues.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 text-left">
              <div className="flex justify-between text-slate-600">
                <span>Amount Received:</span>
                <span className="font-bold text-emerald-700">{fmt(successResult.receivedAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Payment Method:</span>
                <span className="font-semibold text-slate-800">{successResult.paymentMethod}</span>
              </div>
              {successResult.transactionReference && (
                <div className="flex justify-between text-slate-600">
                  <span>Reference:</span>
                  <span className="font-mono text-slate-700">{successResult.transactionReference}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-2 font-bold">
                <span>Updated Remaining Balance:</span>
                <span className={successResult.remainingAfter > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                  {fmt(successResult.remainingAfter)}
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (onShareWhatsApp) {
                    onShareWhatsApp(successResult.agent, successResult);
                  }
                  onClose();
                }}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm shadow-emerald-200"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Receipt on WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold text-blue-500 uppercase">Total Due</p>
              <p className="text-sm font-bold text-blue-800 mt-1">{fmt(totalDue)}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold text-green-500 uppercase">Paid</p>
              <p className="text-sm font-bold text-green-800 mt-1">{fmt(totalPaid)}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold text-amber-500 uppercase">Outstanding</p>
              <p className="text-sm font-bold text-amber-800 mt-1">{fmt(outstanding)}</p>
            </div>
          </div>

          {outstanding <= 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              No outstanding balance. All dues have been settled.
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {outstanding > 0 && (
            <>
              {/* Received Amount + Pay Full */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600">Received Amount (₹) *</label>
                  <button
                    type="button"
                    onClick={handlePayFull}
                    className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    Pay Full Amount
                  </button>
                </div>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    name="receivedAmount"
                    value={formData.receivedAmount}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    max={outstanding}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Remaining after payment */}
              {receivedAmount > 0 && (
                <div className={`p-3 rounded-xl border text-sm font-semibold ${remainingAfter === 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
                  Remaining after payment: {fmt(remainingAfter)}
                  {remainingAfter === 0 && ' ✓ Fully Settled'}
                </div>
              )}

              {/* Payment Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Payment Date *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    name="paymentDate"
                    value={formData.paymentDate}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Payment Method *</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none appearance-none bg-white"
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Transaction Reference */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Transaction Reference {formData.paymentMethod !== 'Cash' ? '*' : '(Optional)'}
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    name="transactionReference"
                    value={formData.transactionReference}
                    onChange={handleChange}
                    placeholder="UPI Ref / Bank Txn ID..."
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    required={formData.paymentMethod !== 'Cash'}
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
                    placeholder="Payment notes..."
                    rows={2}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
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
                  disabled={loading || receivedAmount <= 0}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                  {loading ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </>
          )}
        </form>
        )}
      </div>
    </div>,
    document.body
  );
}
