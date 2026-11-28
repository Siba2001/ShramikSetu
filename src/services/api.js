/**
 * Centralized High-Performance API Client for Google Apps Script Web App Backend
 * Handles POST/GET requests, latency benchmarking, CORS, text/plain payloads, and structured responses.
 */

import { GOOGLE_SCRIPT_WEB_APP_URL, API_SECRET, isBackendConfigured } from '../config/backendConfig';

/**
 * Performance metrics tracker (in-memory for diagnostics)
 */
export const apiMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  lastLatencyMs: 0,
  averageLatencyMs: 0,
  history: []
};

function recordMetric(action, durationMs, success) {
  apiMetrics.totalRequests++;
  if (success) apiMetrics.successfulRequests++;
  else apiMetrics.failedRequests++;
  
  apiMetrics.lastLatencyMs = durationMs;
  const total = (apiMetrics.averageLatencyMs * (apiMetrics.totalRequests - 1)) + durationMs;
  apiMetrics.averageLatencyMs = Math.round(total / apiMetrics.totalRequests);

  apiMetrics.history.push({
    action,
    durationMs,
    success,
    timestamp: new Date().toISOString()
  });

  // Keep last 25 metrics
  if (apiMetrics.history.length > 25) {
    apiMetrics.history.shift();
  }
}

/**
 * Perform GET request to Google Apps Script Web App with telemetry
 */
export async function apiGet(action, params = {}) {
  if (!isBackendConfigured) return null;

  const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  try {
    const url = new URL(GOOGLE_SCRIPT_WEB_APP_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('_t', String(Date.now())); // Cache buster to ensure real-time fresh fetch
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
      headers: {
        'Accept': 'application/json'
      }
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

/**
 * Perform POST request to Google Apps Script Web App
 * Uses text/plain to avoid CORS preflight issues with Google Apps Script
 */
export async function apiPost(action, payload = {}) {
  if (!isBackendConfigured) return null;

  const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  try {
    let sessionToken = '';
    if (typeof window !== 'undefined') {
      try {
        const rawUser = sessionStorage.getItem('shramiksetu_auth_user') || localStorage.getItem('shramiksetu_auth_user');
        if (rawUser) {
          const u = JSON.parse(rawUser);
          if (u && u.token) sessionToken = u.token;
        }
      } catch (e) {}
    }

    const bodyString = JSON.stringify({
      action,
      secret: API_SECRET,
      sessionToken,
      payload
    });

    const response = await fetch(GOOGLE_SCRIPT_WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: bodyString
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
    console.warn(`[Backend POST ${action} Notice - ${durationMs}ms]:`, err.message);
    return null;
  }
}

/**
 * High-Speed API Helper: Fetch Pre-Aggregated Dashboard Summary
 * Tries POST first (avoids browser URL caching), falls back to GET
 */
export async function fetchDashboardSummaryApi() {
  const postRes = await apiPost('getDashboardSummary', {});
  if (postRes && postRes.success) return postRes;
  return await apiGet('getDashboardSummary');
}

/**
 * High-Speed API Helper: Fetch Paginated & Filtered Applications
 * Tries POST first (supports complex filters), falls back to GET
 */
export async function fetchApplicationsPagedApi(params = {}) {
  const postRes = await apiPost('getApplicationsPaged', params);
  if (postRes && postRes.success) return postRes;
  return await apiGet('getApplicationsPaged', params);
}

/**
 * High-Speed API Helper: Targeted Application Status Update
 */
export async function updateApplicationStatusApi(payload = {}) {
  return await apiPost('updateStatus', payload);
}
