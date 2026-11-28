import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Phone, 
  AlertTriangle, 
  Globe2, 
  ExternalLink, 
  Loader2,
  FileCheck,
  Receipt,
  Clock
} from 'lucide-react';
import { logAgentReminder } from '../../services/agentPaymentService';

export default function WhatsAppReminderModal({ 
  isOpen, 
  onClose, 
  agent, 
  mode = 'reminder', // 'reminder' | 'receipt' | 'confirmation'
  paymentDetails = null,
  onSuccess 
}) {
  const [language, setLanguage] = useState('en'); // 'en' | 'or'
  const [mobileNumber, setMobileNumber] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [hasOpenedWhatsApp, setHasOpenedWhatsApp] = useState(false);
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState('');

  // Normalize mobile number helper (ensures standard 91XXXXXXXXXX format)
  const normalizeMobile = (raw) => {
    if (!raw) return '';
    const digits = String(raw).replace(/\D/g, '');
    if (digits.length === 10 && /^[6-9]/.test(digits)) {
      return `91${digits}`;
    }
    if (digits.length === 11 && digits.startsWith('0') && /^[6-9]/.test(digits.slice(1))) {
      return `91${digits.slice(1)}`;
    }
    if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) {
      return digits;
    }
    return digits;
  };

  // Generate template message based on current parameters
  const generateTemplate = (lang, currentMode, ag, pDetails) => {
    if (!ag) return '';
    const name = ag.name || 'Agent';
    const due = Number(ag.totalDue || 0).toFixed(2);
    const paid = Number(ag.totalPaid || 0).toFixed(2);
    const remaining = Number(ag.remaining || 0).toFixed(2);
    const lastDate = ag.lastPaymentDate || 'N/A';

    if (currentMode === 'receipt') {
      if (lang === 'or') {
        return `ନମସ୍କାର ${name} ବାବୁ,\nଶ୍ରମିକସେତୁ (ଓଡ଼ିଶା କୋଠାବାଡ଼ି ଓ ଅନ୍ୟାନ୍ୟ ନିର୍ମାଣ ଶ୍ରମିକ କଲ୍ୟାଣ ବୋର୍ଡ) ତରଫରୁ ପେମେଣ୍ଟ ରସିଦ ସ୍ୱୀକୃତି।\n\nଆପଣଙ୍କର ସମସ୍ତ ବକେୟା ଟ. ${due} ତାରିଖ ${lastDate} ସୁଦ୍ଧା ସମ୍ପୂର୍ଣ୍ଣ ରୂପେ ପୈଠ ହୋଇସାରିଛି।\nବଳକା ଦେୟ: ଟ. ୦.୦୦।\n\nଆପଣଙ୍କ ସହଯୋଗ ପାଇଁ ଧନ୍ୟବାଦ।\n- ଶ୍ରମିକସେତୁ ପ୍ରଶାସନ`;
      }
      return `Namaskar ${name} ji,\nThis is a payment receipt acknowledgement from ShramikSetu (Odisha Building & Other Construction Workers' Welfare Board).\n\nAll dues amounting to ₹${due} have been fully settled as of ${lastDate}.\nOutstanding balance: ₹0.00.\n\nThank you for your valued partnership.\n- ShramikSetu Administration`;
    }

    if (currentMode === 'confirmation') {
      const recAmt = Number(pDetails?.receivedAmount || 0).toFixed(2);
      const remAfter = Number(pDetails?.remainingAfter || 0).toFixed(2);
      const pMethod = pDetails?.paymentMethod || 'Cash';
      const pRef = pDetails?.transactionReference ? ` (Ref: ${pDetails.transactionReference})` : '';
      const pDate = pDetails?.paymentDate || new Date().toISOString().slice(0, 10);

      if (lang === 'or') {
        return `ନମସ୍କାର ${name} ବାବୁ,\nଶ୍ରମିକସେତୁ ଦେୟ ବାବଦକୁ ଆପଣଙ୍କର ଟ. ${recAmt} ପେମେଣ୍ଟ ତାରିଖ ${pDate} ରେ ଗ୍ରହଣ କରାଗଲା [ମାଧ୍ୟମ: ${pMethod}${pRef}]।\n\nଆପଣଙ୍କର ଅଦ୍ୟାବଧି ବଳକା ଦେୟ: ଟ. ${remAfter}।\n\nଧନ୍ୟବାଦ।\n- ଶ୍ରମିକସେତୁ ପ୍ରଶାସନ`;
      }
      return `Namaskar ${name} ji,\nWe have received your payment of ₹${recAmt} on ${pDate} via ${pMethod}${pRef} towards your dues at ShramikSetu.\n\nUpdated remaining balance: ₹${remAfter}.\n\nThank you.\n- ShramikSetu Administration`;
    }

    // Default: 'reminder'
    if (lang === 'or') {
      return `ନମସ୍କାର ${name} ବାବୁ,\nଓଡ଼ିଶା କୋଠାବାଡ଼ି ଓ ଅନ୍ୟାନ୍ୟ ନିର୍ମାଣ ଶ୍ରମିକ କଲ୍ୟାଣ ବୋର୍ଡ (ଶ୍ରମିକସେତୁ) ତରଫରୁ ଏହା ଏକ ପେମେଣ୍ଟ ରିମାଇଣ୍ଡର।\n\nଆପଣଙ୍କର ବକେୟା ଦେୟ: ଟ. ${remaining}\n(ମୋଟ ଦେୟ: ଟ. ${due}, ପୈଠ: ଟ. ${paid})\n\nଦୟାକରି ଏହାକୁ ଶୀଘ୍ର ପୈଠ କରିବାକୁ ଅନୁରୋଧ।\n\nଧନ୍ୟବାଦ।\n- ଶ୍ରମିକସେତୁ ପ୍ରଶାସନ`;
    }
    return `Namaskar ${name} ji,\nThis is an official payment reminder from Odisha Building & Other Construction Workers' Welfare Board (ShramikSetu).\n\nYour current outstanding balance is ₹${remaining} (Total Due: ₹${due}, Total Received: ₹${paid}).\n\nPlease arrange to clear the outstanding balance at the earliest.\n\nThank you.\n- ShramikSetu Administration`;
  };

  // Sync state on open
  useEffect(() => {
    if (isOpen && agent) {
      const norm = normalizeMobile(agent.mobile || agent.phone || '');
      setMobileNumber(norm);
      setLanguage('en');
      setHasOpenedWhatsApp(false);
      setError('');
      setCustomMessage(generateTemplate('en', mode, agent, paymentDetails));
    }
  }, [isOpen, agent, mode, paymentDetails]);

  // Handle language switch
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setCustomMessage(generateTemplate(newLang, mode, agent, paymentDetails));
  };

  if (!isOpen || !agent) return null;

  const isReceipt = mode === 'receipt';
  const isConfirmation = mode === 'confirmation';

  // Action: Launch WhatsApp via Click-to-Chat wa.me
  const handleOpenWhatsApp = () => {
    setError('');
    const cleaned = mobileNumber.replace(/\D/g, '');
    if (!cleaned || cleaned.length < 10) {
      setError('Please provide a valid 10-digit mobile number.');
      return;
    }
    if (!customMessage.trim()) {
      setError('Message content cannot be empty.');
      return;
    }

    const targetNumber = cleaned.startsWith('91') && cleaned.length === 12 ? cleaned : (cleaned.length === 10 ? `91${cleaned}` : cleaned);
    const encodedText = encodeURIComponent(customMessage.trim());
    const waUrl = `https://wa.me/${targetNumber}?text=${encodedText}`;

    // Open WhatsApp Web or app in a new tab
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setHasOpenedWhatsApp(true);
  };

  // Action: Confirm Sent and Log to Backend Sheet
  const handleConfirmSentAndLog = async () => {
    setError('');
    const cleaned = mobileNumber.replace(/\D/g, '');
    if (!cleaned) {
      setError('Mobile number is required to log reminder.');
      return;
    }

    setLogging(true);
    try {
      const messageType = isReceipt ? 'Receipt' : (isConfirmation ? 'Payment Confirmation' : 'Reminder');
      await logAgentReminder({
        agentId: agent.id,
        agentName: agent.name,
        mobileNumber: cleaned,
        dueAmount: Number(agent.totalDue || 0),
        receivedAmount: Number(agent.totalPaid || 0),
        outstandingAmount: Number(agent.remaining || 0),
        messageContent: customMessage.trim(),
        messageType: messageType,
        language: language === 'or' ? 'Odia' : 'English',
        status: 'Sent'
      });

      if (onSuccess) {
        onSuccess(agent, messageType);
      }
      onClose();
    } catch (err) {
      console.error('Failed to log reminder:', err);
      setError(err.message || 'Failed to record reminder history.');
    } finally {
      setLogging(false);
    }
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b border-slate-200 rounded-t-2xl sticky top-0 z-10 ${
          isReceipt 
            ? 'bg-gradient-to-r from-emerald-50 to-teal-50' 
            : isConfirmation 
              ? 'bg-gradient-to-r from-blue-50 to-cyan-50' 
              : 'bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
              {isReceipt ? <Receipt className="w-5 h-5" /> : isConfirmation ? <FileCheck className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
                {isReceipt ? 'Send Payment Receipt' : isConfirmation ? 'Share Payment Confirmation' : 'Send WhatsApp Reminder'}
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Click-to-Chat
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Agent: <span className="font-semibold text-slate-800">{agent.name}</span>
                {agent.block && <span className="text-slate-400"> ({agent.block})</span>}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors"
            disabled={logging}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          
          {/* Status & Summary Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Due</span>
              <span className="text-xs font-bold text-slate-800 mt-0.5 block">{fmt(agent.totalDue)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-center">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total Paid</span>
              <span className="text-xs font-bold text-emerald-800 mt-0.5 block">{fmt(agent.totalPaid)}</span>
            </div>
            <div className={`p-2.5 rounded-xl text-center border ${
              agent.remaining > 0 ? 'bg-rose-50/80 border-rose-200 text-rose-700' : 'bg-green-50 border-green-200 text-green-700'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider block">Outstanding</span>
              <span className="text-xs font-black mt-0.5 block">{fmt(agent.remaining)}</span>
            </div>
          </div>

          {/* Target Mobile Number */}
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                Target WhatsApp Mobile (Country Code + 10 Digits) *
              </span>
              <span className="text-[10px] font-normal text-slate-400">Standard Indian prefix: 91</span>
            </label>
            <input 
              type="text"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="e.g. 919876543210"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Language Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-blue-600" />
                Template Language
              </label>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                    language === 'en'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('or')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                    language === 'or'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ଓଡ଼ିଆ (Odia)
                </button>
              </div>
            </div>
          </div>

          {/* Message Preview & Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                Message Content (Preview & Edit Before Sending)
              </label>
              <span className="text-[10px] text-slate-400">
                {customMessage.length} chars
              </span>
            </div>
            <textarea
              rows={7}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Type or customize your WhatsApp message..."
              className="w-full p-3.5 border border-slate-300 rounded-xl text-xs font-normal text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans"
            />
          </div>

          {/* Privacy & Compliance Notice */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-800 leading-relaxed">
            <span className="font-bold">Zero-Trust Notice:</span> No citizen Aadhaar details, passwords, or system secrets are included in WhatsApp messages. Only official ledger totals and agent references are formatted.
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Post-WhatsApp guidance banner */}
          {hasOpenedWhatsApp && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">WhatsApp opened in a new tab!</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  After you send the message in WhatsApp Web/App, click <strong>"Confirm Sent & Log"</strong> below to record this reminder in the official <code>Agent_Reminder_History</code> sheet.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={logging}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* 1. Open WhatsApp Button */}
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              disabled={logging}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-colors shadow-sm shadow-emerald-200"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{hasOpenedWhatsApp ? 'Re-open WhatsApp' : 'Open WhatsApp'}</span>
            </button>

            {/* 2. Optional Manual Confirmation and Sheet Logging */}
            <button
              type="button"
              onClick={handleConfirmSentAndLog}
              disabled={logging}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-sm ${
                hasOpenedWhatsApp
                  ? 'text-white bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                  : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
              }`}
            >
              {logging ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Logging...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Confirm Sent & Log</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
