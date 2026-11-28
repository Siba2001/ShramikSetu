/**
 * Agent Payment Management - Frontend Service Layer
 * Handles all API communication for dues, payments, dashboard stats, and transaction history.
 */

import { apiPost } from './api';

/**
 * Add a due entry for an agent
 */
export async function addAgentDue(payload) {
  const res = await apiPost('addAgentDue', payload);
  if (!res || !res.success) {
    throw new Error((res && res.message) || 'Failed to add due entry.');
  }
  return res;
}

/**
 * Receive a payment against agent outstanding dues (FIFO allocation)
 */
export async function receiveAgentPayment(payload) {
  const res = await apiPost('receiveAgentPayment', payload);
  if (!res || !res.success) {
    throw new Error((res && res.message) || 'Failed to record payment.');
  }
  return res;
}

/**
 * Fetch aggregated agent payment dashboard statistics
 */
export async function getAgentPaymentDashboard() {
  const res = await apiPost('getAgentPaymentDashboard', {});
  if (!res || !res.success) {
    return { success: false, totalAgents: 0, totalDue: 0, totalReceived: 0, totalOutstanding: 0, fullyPaid: 0, pendingPayment: 0, agentSummaries: [] };
  }
  return res;
}

/**
 * Get payment summary for a single agent
 */
export async function getAgentPaymentSummary(agentId) {
  const res = await apiPost('getAgentPaymentSummary', { agentId });
  if (!res || !res.success) {
    throw new Error((res && res.message) || 'Failed to fetch agent payment summary.');
  }
  return res;
}

/**
 * Get complete transaction history for an agent (dues + payments)
 */
export async function getAgentPaymentHistory(agentId, filters = {}) {
  const res = await apiPost('getAgentPaymentHistory', { agentId, ...filters });
  if (!res || !res.success) {
    return { success: false, transactions: [] };
  }
  return res;
}

/**
 * Reverse a financial transaction (due or payment) with mandatory reason
 */
export async function reverseAgentTransaction(payload) {
  const res = await apiPost('reverseAgentTransaction', payload);
  if (!res || !res.success) {
    throw new Error((res && res.message) || 'Failed to reverse transaction.');
  }
  return res;
}

/**
 * Log a WhatsApp payment reminder, receipt, or confirmation in Agent_Reminder_History
 */
export async function logAgentReminder(payload) {
  const res = await apiPost('logAgentReminder', payload);
  if (!res || !res.success) {
    throw new Error((res && res.message) || 'Failed to log reminder activity.');
  }
  return res;
}

/**
 * Get WhatsApp reminder and receipt history for an agent (or all agents)
 */
export async function getAgentReminderHistory(agentId) {
  const res = await apiPost('getAgentReminderHistory', { agentId });
  if (!res || !res.success) {
    return { success: false, history: [] };
  }
  return res;
}

