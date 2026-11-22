/**
 * Centralized API Client for Google Apps Script Web App Backend
 * Handles POST/GET requests, CORS, text/plain payloads, AbortController timeouts, and structured responses.
 */

import { getActiveGoogleScriptUrl, getActiveApiSecret } from '../config/backendConfig';

/**
 * Perform GET request to Google Apps Script Web App
 */
export async function apiGet(action, params = {}, timeoutMs = 12000) {
  const scriptUrl = getActiveGoogleScriptUrl();
  const secret = getActiveApiSecret();

  if (!scriptUrl || !scriptUrl.startsWith('http')) {
    console.warn('[Backend GET Warning]: Google Script URL is not configured.');
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = new URL(scriptUrl);
    url.searchParams.set('action', action);
    url.searchParams.set('_t', String(Date.now())); // Cache buster to ensure real-time fresh fetch without browser caching
    if (secret) {
      url.searchParams.set('secret', secret);
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
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.warn(`[Backend GET ${action} JSON parse error]:`, text.slice(0, 200));
      return null;
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn(`[Backend GET ${action}] Request timed out after ${timeoutMs}ms`);
    } else {
      console.warn(`[Backend GET ${action} Warning]:`, err.message);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Perform POST request to Google Apps Script Web App
 * Uses text/plain to avoid CORS preflight issues with Google Apps Script
 */
export async function apiPost(action, payload = {}, timeoutMs = 15000) {
  const scriptUrl = getActiveGoogleScriptUrl();
  const secret = getActiveApiSecret();

  if (!scriptUrl || !scriptUrl.startsWith('http')) {
    console.warn('[Backend POST Warning]: Google Script URL is not configured.');
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const bodyString = JSON.stringify({
      action,
      secret,
      payload
    });

    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: bodyString,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.warn(`[Backend POST ${action} JSON parse error]:`, text.slice(0, 200));
      return null;
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn(`[Backend POST ${action}] Request timed out after ${timeoutMs}ms`);
    } else {
      console.warn(`[Backend POST ${action} Warning]:`, err.message);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}
