/**
 * =========================================================================
 * SHRAMIK SETU - BACKEND ENVIRONMENT & CLOUD DATABASE CONFIGURATION
 * Loads Google Apps Script Web App Endpoint & API Secret with multi-tier fallback:
 * 1. User custom override in localStorage (configured via UI modal)
 * 2. Vite environment variables (.env / .env.production)
 * 3. Default production Google Apps Script endpoint
 * =========================================================================
 */

export const DEFAULT_PRODUCTION_SCRIPT_URL = 
  'https://script.google.com/macros/s/AKfycbxKXlMxwE6DqfOkL8K3nV9mQhPX3xupWxYcyD7gIPLXtiaaQBMulv1k2mUBmhyD2ysN/exec';

export const DEFAULT_API_SECRET = 'SHRAMIK_SETU_SECURE_2026';

const GAS_URL_STORAGE_KEY = 'shramiksetu_gas_url';

/**
 * Get the current active Google Apps Script Web App URL
 */
export function getActiveGoogleScriptUrl() {
  if (typeof window !== 'undefined') {
    const userStoredUrl = localStorage.getItem(GAS_URL_STORAGE_KEY);
    if (userStoredUrl && userStoredUrl.trim().startsWith('http')) {
      return userStoredUrl.trim();
    }
  }

  const envUrl = (import.meta.env.VITE_GOOGLE_SCRIPT_URL || '').trim();
  if (envUrl && envUrl.startsWith('http') && !envUrl.includes('YOUR_APPS_SCRIPT_ID')) {
    return envUrl;
  }

  return DEFAULT_PRODUCTION_SCRIPT_URL;
}

/**
 * Update the Google Apps Script Web App URL in localStorage
 */
export function saveCustomGoogleScriptUrl(url) {
  if (typeof window === 'undefined') return;
  const clean = (url || '').trim();
  if (clean && clean.startsWith('http')) {
    localStorage.setItem(GAS_URL_STORAGE_KEY, clean);
  } else {
    localStorage.removeItem(GAS_URL_STORAGE_KEY);
  }
}

/**
 * Get active API Secret Token
 */
export function getActiveApiSecret() {
  const envSecret = (import.meta.env.VITE_API_SECRET || '').trim();
  return envSecret || DEFAULT_API_SECRET;
}

// Backwards-compatible exports
export const GOOGLE_SCRIPT_WEB_APP_URL = getActiveGoogleScriptUrl();
export const API_SECRET = getActiveApiSecret();
export const isBackendConfigured = Boolean(
  GOOGLE_SCRIPT_WEB_APP_URL && GOOGLE_SCRIPT_WEB_APP_URL.startsWith('http')
);
