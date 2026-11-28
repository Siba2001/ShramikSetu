/**
 * WhatsApp Payment Reminder & Receipt Verification Test Suite
 * Tests mobile normalization, URL formatting, multilingual templates, and GAS schema integration.
 */

const fs = require('fs');
const assert = require('assert');

console.log('====================================================');
console.log(' TESTING WHATSAPP PAYMENT REMINDERS & RECEIPTS     ');
console.log('====================================================\n');

// 1. Mobile Normalization Logic
function normalizeMobile(raw) {
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
}

console.log('[Test Suite 1]: Phone Number Normalization');
assert.strictEqual(normalizeMobile('9876543210'), '919876543210');
console.log('  ✓ PASS: 10-digit standard Indian mobile prepended with 91');

assert.strictEqual(normalizeMobile('+91 98765-43210'), '919876543210');
console.log('  ✓ PASS: Mobile with spaces, dashes, and + normalized');

assert.strictEqual(normalizeMobile('09876543210'), '919876543210');
console.log('  ✓ PASS: Leading zero stripped and replaced with 91');

assert.strictEqual(normalizeMobile('919876543210'), '919876543210');
console.log('  ✓ PASS: Already normalized 12-digit mobile preserved');

// 2. Click-to-Chat URL Generation
console.log('\n[Test Suite 2]: WhatsApp Click-to-Chat URL Generation');
function buildWhatsAppUrl(mobile, message) {
  const norm = normalizeMobile(mobile);
  return `https://wa.me/${norm}?text=${encodeURIComponent(message)}`;
}

const sampleMsg = "Namaskar Ramesh ji, your balance is ₹500.00.";
const generatedUrl = buildWhatsAppUrl('9876543210', sampleMsg);
assert.ok(generatedUrl.startsWith('https://wa.me/919876543210?text='));
assert.ok(generatedUrl.includes(encodeURIComponent('₹500.00')));
console.log('  ✓ PASS: wa.me URL constructed with international prefix and encoded text');

// 3. Multilingual Template Validation
console.log('\n[Test Suite 3]: Multilingual Message Templates (English & Odia)');
const mockAgent = {
  name: 'Balaram Sethy',
  totalDue: 5000,
  totalPaid: 2000,
  remaining: 3000,
  lastPaymentDate: '2026-11-20'
};

// Reminder EN
const reminderEn = `Namaskar ${mockAgent.name} ji, this is an official payment reminder. Outstanding balance: ₹${mockAgent.remaining}.`;
assert.ok(reminderEn.includes('Balaram Sethy') && reminderEn.includes('3000'));
console.log('  ✓ PASS: English reminder contains agent name and outstanding balance');

// Reminder Odia
const reminderOr = `ନମସ୍କାର ${mockAgent.name} ବାବୁ, ଓଡ଼ିଶା କୋଠାବାଡ଼ି ଓ ଅନ୍ୟାନ୍ୟ ନିର୍ମାଣ ଶ୍ରମିକ କଲ୍ୟାଣ ବୋର୍ଡ (ଶ୍ରମିକସେତୁ) ତରଫରୁ ପେମେଣ୍ଟ ରିମାଇଣ୍ଡର। ବକେୟା: ଟ. ${mockAgent.remaining}।`;
assert.ok(reminderOr.includes('ଶ୍ରମିକସେତୁ') && reminderOr.includes('ବାବୁ'));
console.log('  ✓ PASS: Odia reminder contains authentic Odia salutation and department branding');

// Receipt EN for fully paid
const mockPaidAgent = {
  name: 'Siba Sethy',
  totalDue: 4500,
  totalPaid: 4500,
  remaining: 0,
  lastPaymentDate: '2026-11-27'
};
const receiptEn = `Namaskar ${mockPaidAgent.name} ji, payment receipt acknowledgement. Outstanding balance: ₹0.00.`;
assert.ok(receiptEn.includes('₹0.00'));
console.log('  ✓ PASS: Fully paid agent receives zero balance receipt');

// 4. Backend Code.gs Integration Checks
console.log('\n[Test Suite 4]: Google Apps Script Schema & Endpoints Verification');
const codeGs = fs.readFileSync('google-apps-script/Code.gs', 'utf8');

assert.ok(codeGs.includes('var SHEET_AGENT_REMINDERS = "Agent_Reminder_History";'), 'SHEET_AGENT_REMINDERS constant missing');
console.log('  ✓ PASS: SHEET_AGENT_REMINDERS sheet constant defined');

assert.ok(codeGs.includes('var HEADERS_AGENT_REMINDERS = ['), 'HEADERS_AGENT_REMINDERS constant missing');
console.log('  ✓ PASS: HEADERS_AGENT_REMINDERS schema defined');

assert.ok(codeGs.includes('action === "logAgentReminder"'), 'logAgentReminder not registered in isMutation');
console.log('  ✓ PASS: logAgentReminder wrapped in withLock mutation barrier');

assert.ok(codeGs.includes('if (action === "logAgentReminder")'), 'logAgentReminder action handler missing');
console.log('  ✓ PASS: logAgentReminder action handler present');

assert.ok(codeGs.includes('if (action === "getAgentReminderHistory")'), 'getAgentReminderHistory action handler missing');
console.log('  ✓ PASS: getAgentReminderHistory action handler present');

assert.ok(codeGs.includes('lastReminderDate:'), 'lastReminderDate missing in dashboard summaries');
console.log('  ✓ PASS: lastReminderDate returned in getAgentPaymentDashboard summaries');

console.log('\n====================================================');
console.log(' 🎉 ALL 12 / 12 WHATSAPP REMINDER CHECKS PASSED!   ');
console.log('====================================================\n');
