/**
 * Centralized High-Performance API Client for Google Apps Script Web App Backend
 * Handles POST/GET requests, latency benchmarking, CORS, text/plain payloads, and structured responses.
 * Implements server-side cryptographic session token attachment in POST request bodies.
 * 
 * Security Rule: Bearer session tokens are NEVER transmitted in GET URL query parameters.
 * All authenticated operations use POST body payloads to eliminate URL/log credential leakage.
 */

import { getActiveGoogleScriptUrl, getActiveApiSecret } from '../config/backendConfig';

// Dynamic per-request resolution — never frozen at module load time
function getUrl() { return getActiveGoogleScriptUrl(); }
function getSecret() { return getActiveApiSecret(); }
function checkConfigured() {
  const url = getUrl();
  return Boolean(url && url.startsWith('http'));
}

/**
 * Retrieve active server session token from authenticated user state
 */
export function getActiveSessionToken() {
  try {
    const raw = sessionStorage.getItem('shramiksetu_auth_user') || localStorage.getItem('shramiksetu_auth_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.sessionToken || parsed.token || '';
    }
  } catch (e) {}
  return '';
}

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

  if (apiMetrics.history.length > 25) {
    apiMetrics.history.shift();
  }
}

/**
 * Perform GET request to Google Apps Script Web App
 * NOTE: Only used for public, unauthenticated health checks (e.g. 'ping').
 * All authenticated read operations are dispatched via POST to avoid URL token exposure.
 */
export async function apiGet(action, params = {}) {
  if (!checkConfigured()) return null;

  // All authenticated actions route via POST body to prevent URL token leakage
  if (action !== 'ping') {
    return await apiPost(action, params);
  }

  const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const scriptUrl = getUrl();
  try {
    const url = new URL(scriptUrl);
    url.searchParams.set('action', 'ping');
    url.searchParams.set('_t', String(Date.now()));

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
        secret: apiSecret,
        sessionToken: sessionToken || undefined,
        payload
      });

      const controller = new AbortController();
      // Single solid 25-second window for Apps Script execution / cold-start
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: bodyString,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

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
    } finally {
      if (cacheKey) {
        inFlightRequests.delete(cacheKey);
      }
    }
  })();

  if (cacheKey) {
    inFlightRequests.set(cacheKey, promise);
  }

  return promise;
}

/**
 * High-Speed API Helper: Fetch Pre-Aggregated Dashboard Summary
 */
export async function fetchDashboardSummaryApi(bypassCache = false) {
  return await apiPost('getDashboardSummary', { bypassCache: !!bypassCache });
}

/**
 * High-Speed API Helper: Fetch Paginated & Filtered Applications
 */
export async function fetchApplicationsPagedApi(params = {}) {
  return await apiPost('getApplicationsPaged', params);
}

/**
 * High-Speed API Helper: Targeted Application Status Update
 */
export async function updateApplicationStatusApi(payload = {}) {
  return await apiPost('updateStatus', payload);
}
