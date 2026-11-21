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
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.warn(`[Backend GET ${action} Warning]:`, err.message);
    return null;
  }
}

/**
 * Perform POST request to Google Apps Script Web App
 * Uses text/plain to avoid CORS preflight issues with Google Apps Script
 */
export async function apiPost(action, payload = {}) {
  if (!isBackendConfigured) return null;

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
