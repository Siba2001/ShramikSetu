/**
 * =========================================================================
 * SHRAMIK SETU - BACKEND ENVIRONMENT CONFIGURATION
 * Loads Google Apps Script Web App Endpoint & API Secret exclusively from .env
 * Zero hardcoded credentials or duplicate data.
 * =========================================================================
 */

export const GOOGLE_SCRIPT_WEB_APP_URL = (import.meta.env.VITE_GOOGLE_SCRIPT_URL || '').trim();

export const API_SECRET = (import.meta.env.VITE_API_SECRET || '').trim();

export const isBackendConfigured = Boolean(
  GOOGLE_SCRIPT_WEB_APP_URL && GOOGLE_SCRIPT_WEB_APP_URL.startsWith('http')
);
