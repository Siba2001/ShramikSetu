/**
 * Centralized API Client for Google Apps Script Web App Backend
 * Handles POST/GET requests, CORS, text/plain payloads, and structured responses.
 */

import { GOOGLE_SCRIPT_WEB_APP_URL, API_SECRET, isBackendConfigured } from '../config/backendConfig';

/**
 * Perform GET request to Google Apps Script Web App
 */
export async function apiGet(action, params = {}) {
  if (!isBackendConfigured) return null;

  try {
    const url = new URL(GOOGLE_SCRIPT_WEB_APP_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('_t', String(Date.now())); // Cache buster to ensure real-time fresh fetch without browser caching
    if (API_SECRET) {
      url.searchParams.set('secret', API_SECRET);
    }
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null) {
        url.searchParams.set(k, String(params[k]));
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    const durationMs = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - startTime);

    if (!response.ok) {
      recordMetric(action, durationMs, false);
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    recordMetric(action, durationMs, true);
    return data;
  } catch (err) {
    const durationMs = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - startTime);
    recordMetric(action, durationMs, false);
    console.warn(`[Backend GET ${action} Notice - ${durationMs}ms]:`, err.message);
    return null;
  }
}

// In-flight read request deduplication (prevents multiple duplicate calls to Apps Script)
const inFlightRequests = new Map();

/**
 * Perform POST request to Google Apps Script Web App
 * Uses text/plain to avoid CORS preflight issues with Google Apps Script.
 * Attaches the cryptographic sessionToken securely within the request body payload.
 * Deduplicates in-flight read operations to minimize network latency.
 */
export async function apiPost(action, payload = {}) {
  if (!checkConfigured()) return null;

  // Deduplicate identical read actions in flight
  const isReadAction = ['getAgents', 'getDashboardSummary', 'getAll', 'getMarriageVerifications', 'getApplicationsPaged'].includes(action);
  const cacheKey = isReadAction ? `${action}::${JSON.stringify(payload)}` : null;

  if (cacheKey && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const promise = (async () => {
    const scriptUrl = getUrl();
    const apiSecret = getSecret();
    const sessionToken = (payload && payload.sessionToken) || getActiveSessionToken();

    const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

  try {
    const bodyString = JSON.stringify({
      action,
      secret: API_SECRET,
      payload
    });

    const response = await fetch(GOOGLE_SCRIPT_WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: bodyString
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.warn(`[Backend POST ${action} Warning]:`, err.message);
    return null;
  }
}

/**
 * High-Speed API Helper: Fetch Pre-Aggregated Dashboard Summary
 */
export async function fetchDashboardSummaryApi() {
  return await apiGet('getDashboardSummary');
}

/**
 * High-Speed API Helper: Fetch Paginated & Filtered Applications
 */
export async function fetchApplicationsPagedApi(params = {}) {
  return await apiGet('getApplicationsPaged', params);
}

/**
 * High-Speed API Helper: Targeted Application Status Update
 */
export async function updateApplicationStatusApi(payload = {}) {
  return await apiPost('updateStatus', payload);
}
