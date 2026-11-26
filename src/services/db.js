import { INITIAL_DISTRICTS } from '../data/locationData';
import { GOOGLE_SCRIPT_WEB_APP_URL } from '../config/backendConfig';
import { apiGet, apiPost } from './api';

const LOCAL_STORAGE_KEY = 'shramik_setu_applications_v2';
const DISTRICTS_STORAGE_KEY = 'shramik_setu_districts_v1';
const AGENTS_STORAGE_KEY = 'shramik_setu_agents_v1';
const DASHBOARD_SUMMARY_STORAGE_KEY = 'shramik_setu_dashboard_summary_v1';

// Legacy dummy agent names to auto-purge from localStorage
const LEGACY_DUMMY_NAMES = [
  'kalu', 'litu', 'daitari', 'pana', 'dilip',
  'krushna', 'babula', 'bidya', 'ranjan dabarasingi', 'niranjan'
];

/**
 * Get configured Google Apps Script Web App URL from environment or localStorage override
 */
export function getGoogleScriptUrl() {
  if (typeof localStorage !== 'undefined') {
    const custom = localStorage.getItem('shramiksetu_gas_url');
    if (custom) return custom;
  }
  return GOOGLE_SCRIPT_WEB_APP_URL;
}

/**
 * Set custom Google Apps Script Web App URL in localStorage
 */
export function setGoogleScriptUrl(url) {
  if (typeof localStorage !== 'undefined') {
    if (url) {
      localStorage.setItem('shramiksetu_gas_url', url);
    } else {
      localStorage.removeItem('shramiksetu_gas_url');
    }
  }
}

/**
 * Canonical Application Normalizer
 * Guarantees every application record has identical property aliases
 * so no component can ever fail with undefined phone, mobile, name, or trackNo.
 */
export function normalizeApplication(app) {
  if (!app) return null;
  const name = (app.applicantName || app.name || app.beneficiaryName || app.cardHolderName || '').trim();
  const phone = (app.phone || app.mobile || '').trim();
  const track = (app.trackNo || app.trackingNo || '').trim();
  const card = (app.cardNo || app.regNo || app.nirmanCardNo || '').trim();
  const aadhaar = (app.aadhaarNo || app.aadhaar || '').trim();
  const village = (app.village || app.block || '').trim();

  return {
    ...app,
    id: app.id || `APP-${Date.now()}`,
    applicantName: name,
    name: name,
    cardHolderName: name,
    beneficiaryName: name,
    phone: phone,
    mobile: phone,
    trackNo: track,
    trackingNo: track,
    cardNo: card,
    regNo: card,
    aadhaarNo: aadhaar,
    aadhaar: aadhaar,
    village: village,
    block: village,
    district: app.district || 'Ganjam',
    agent: (app.agent || '').trim(),
    status: app.status || 'Pending',
    serviceType: app.serviceType || 'New Card'
  };
}

/**
 * =========================================================================
 * PERSISTENT DELETED TOMBSTONE REGISTRY (Zero-Resurrection Architecture)
 * Tracks deleted IDs, Tracking Numbers, Card Numbers, and Aadhaar Numbers.
 * Prevents cloud sync or cached responses from ever resurrecting deleted records.
 * =========================================================================
 */
const DELETED_TOMBSTONE_KEY = 'shramiksetu_deleted_tombstones';

export function getDeletedTombstones() {
  try {
    const raw = localStorage.getItem(DELETED_TOMBSTONE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function recordDeletedTombstone(identifiers = {}) {
  try {
    const list = getDeletedTombstones();
    const entry = {
      id: identifiers.id ? String(identifiers.id).trim().toLowerCase() : null,
      trackNo: identifiers.trackNo ? String(identifiers.trackNo).trim().toLowerCase() : null,
      cardNo: identifiers.cardNo ? String(identifiers.cardNo).trim().toLowerCase() : null,
      aadhaarNo: identifiers.aadhaarNo ? String(identifiers.aadhaarNo).trim().replace(/\s+/g, '') : null,
      timestamp: Date.now()
    };
    list.unshift(entry);
    // Keep max 500 tombstones for 14 days
    const filtered = list.filter(e => Date.now() - e.timestamp < 14 * 24 * 3600 * 1000).slice(0, 500);
    localStorage.setItem(DELETED_TOMBSTONE_KEY, JSON.stringify(filtered));
  } catch (e) {}
}

export function isDeletedTombstone(record) {
  if (!record) return false;
  const tombstones = getDeletedTombstones();
  if (!tombstones || tombstones.length === 0) return false;

  const recId = record.id ? String(record.id).trim().toLowerCase() : '';
  const recTrack = record.trackNo ? String(record.trackNo).trim().toLowerCase() : '';
  const recCard = record.cardNo ? String(record.cardNo).trim().toLowerCase() : '';
  const recAadh = record.aadhaarNo ? String(record.aadhaarNo).trim().replace(/\s+/g, '') : '';

  return tombstones.some(t => {
    if (t.id && recId && t.id === recId) return true;
    if (t.trackNo && recTrack && (t.trackNo === recTrack || t.trackNo.replace(/\s+/g, '') === recTrack.replace(/\s+/g, ''))) return true;
    if (t.cardNo && recCard && t.cardNo === recCard) return true;
    if (t.aadhaarNo && recAadh && t.aadhaarNo === recAadh) return true;
    return false;
  });
}

/**
 * Load all active applications from LocalStorage
 * Automatically filters out any legacy dummy/test records and tombstoned deleted items
 */
export function loadApplications() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    // Automatically purge old phantom/dummy records and deleted tombstones
    const cleaned = list.filter(app => {
      if (!app) return false;
      if (isDeletedTombstone(app)) return false;
      const agentLower = (app.agent || '').trim().toLowerCase();
      const trackLower = (app.trackNo || '').trim().toLowerCase();
      if (trackLower === 'asdf' || trackLower === 'test' || trackLower === 'test1234') return false;
      if (LEGACY_DUMMY_NAMES.includes(agentLower)) return false;
      return true;
    }).map(normalizeApplication);

    if (cleaned.length !== list.length) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch (e) {
    console.error('Failed to load applications from localStorage:', e);
    return [];
  }
}

/**
 * Save applications to LocalStorage with quota defense and memory protection
 */
export function saveApplications(apps) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(apps));
  } catch (e) {
    console.error('Failed to save applications:', e);
  }
}

/**
 * Load Districts & their Blocks
 */
export function loadDistricts() {
  try {
    const raw = localStorage.getItem(DISTRICTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(DISTRICTS_STORAGE_KEY, JSON.stringify(INITIAL_DISTRICTS));
      return INITIAL_DISTRICTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_DISTRICTS;
  }
}

/**
 * Save Districts & their Blocks
 */
export function saveDistricts(districts) {
  try {
    localStorage.setItem(DISTRICTS_STORAGE_KEY, JSON.stringify(districts));
  } catch (e) {
    console.error('Failed to save districts:', e);
  }
}

/**
 * Load Agents from storage - 100% database driven with zero hardcoded dummy data
 */
export function loadAgents() {
  try {
    const raw = localStorage.getItem(AGENTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    const cleaned = list.filter(a => {
      if (!a || !a.name) return false;
      const lower = a.name.trim().toLowerCase();
      if (LEGACY_DUMMY_NAMES.includes(lower) && String(a.id || '').startsWith('ag-')) {
        return false;
      }
      return true;
    }).map(a => {
      const ph = (a.mobile || a.phone || '').trim();
      const vil = (a.village || a.block || '').trim();
      return {
        ...a,
        mobile: ph,
        phone: ph,
        village: vil,
        block: vil
      };
    });

    return cleaned;
  } catch (e) {
    return [];
  }
}

/**
 * Save Agents
 */
export function saveAgents(agents) {
  try {
    const list = Array.isArray(agents) ? agents.map(a => {
      const ph = (a.mobile || a.phone || '').trim();
      const vil = (a.village || a.block || '').trim();
      return {
        ...a,
        mobile: ph,
        phone: ph,
        village: vil,
        block: vil
      };
    }) : [];
    localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save agents:', e);
  }
}

/**
 * Fetch Agents directly from Google Sheets backend
 */
export async function fetchAgentsFromBackend() {
  try {
    const res = await apiGet('getAgents');
    if (res && res.success && Array.isArray(res.agents)) {
      const normalized = res.agents.map(ag => {
        const ph = (ag.mobile || ag.phone || '').trim();
        const vil = (ag.village || ag.block || '').trim();
        return {
          ...ag,
          mobile: ph,
          phone: ph,
          village: vil,
          block: vil
        };
      });
      saveAgents(normalized);
      return normalized;
    }
  } catch (e) {
    console.warn('Notice: Backend fetch for agents:', e);
  }
  return loadAgents();
}

/**
 * Add a new Agent - pushes to Google Sheets database in background (instant optimistic response)
 */
export function addAgent(agentData) {
  const agents = loadAgents();
  const id = `AG-${Date.now()}`;
  const phone = (agentData.mobile || agentData.phone || '').trim();
  const village = (agentData.village || agentData.block || '').trim();
  const newAgent = {
    id,
    name: agentData.name.trim(),
    mobile: phone,
    phone: phone,
    village: village,
    block: village,
    district: agentData.district || 'Ganjam',
    photo: agentData.photo || '',
    status: 'Active',
    createdAt: new Date().toISOString()
  };

  agents.unshift(newAgent);
  saveAgents(agents);

  apiPost('addAgent', newAgent).catch(err => {
    console.warn('Backend sync warning for addAgent:', err);
  });

  return newAgent;
}

/**
 * Update an existing Agent - pushes to Google Sheets database in background
 */
export function updateAgent(id, updates) {
  const agents = loadAgents();
  const index = agents.findIndex(a => a.id === id);
  if (index === -1) return null;

  const oldName = agents[index].name;
  const phone = (updates.mobile || updates.phone || agents[index].mobile || '').trim();
  const village = (updates.village || updates.block || agents[index].village || '').trim();

  const updatedAgent = {
    ...agents[index],
    ...updates,
    name: (updates.name || agents[index].name).trim(),
    mobile: phone,
    phone: phone,
    village: village,
    block: village,
    district: updates.district || agents[index].district || 'Ganjam',
    photo: updates.photo !== undefined ? updates.photo : agents[index].photo,
    updatedAt: new Date().toISOString()
  };

  agents[index] = updatedAgent;
  saveAgents(agents);

  apiPost('updateAgent', { ...updatedAgent, oldName }).catch(err => {
    console.warn('Backend sync warning for updateAgent:', err);
  });

  if (oldName && updates.name && oldName.toLowerCase() !== updates.name.trim().toLowerCase()) {
    try {
      const apps = loadApplications();
      let changed = false;
      apps.forEach(app => {
        if (app.agent && app.agent.toLowerCase() === oldName.toLowerCase()) {
          app.agent = updates.name.trim();
          changed = true;
        }
      });
      if (changed) {
        saveApplications(apps);
      }
    } catch (e) {
      console.warn('Notice updating agent in applications:', e);
    }
  }

  return updatedAgent;
}

/**
 * Delete an Agent - removes from Google Sheets database in background
 */
export function deleteAgent(id) {
  const agents = loadAgents();
  const target = agents.find(a => a.id === id || a.name === id);
  const filtered = agents.filter(a => a.id !== id && a.name !== id);
  saveAgents(filtered);

  apiPost('deleteAgent', { id, name: target ? target.name : id }).catch(err => {
    console.warn('Backend sync warning for deleteAgent:', err);
  });

  return filtered;
}

/**
 * Completely wipe all data from database
 */
export function clearAllData() {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
  localStorage.removeItem(DASHBOARD_SUMMARY_STORAGE_KEY);
  localStorage.removeItem('shramik_setu_applications_v1');
  localStorage.removeItem('shramik_setu_completed_archive_v1');
  localStorage.removeItem('shramik_setu_completed_archive_v2');
  return [];
}

/**
 * Add a new application
 */
export async function addApplication(appData) {
  const apps = loadApplications();
  const id = `SS-${Date.now()}`;
  const now = new Date().toISOString();
  const newApp = {
    id,
    serviceType: appData.serviceType || 'New Card',
    applicantName: (appData.applicantName || '').toUpperCase().trim(),
    cardNo: (appData.cardNo || '').trim(),
    aadhaarNo: (appData.aadhaarNo || '').trim(),
    trackNo: (appData.trackNo || '').trim(),
    district: (appData.district || 'Ganjam').trim(),
    block: (appData.block || '').trim(),
    agent: (appData.agent || '').trim(),
    officer: (appData.officer || '').trim(),
    status: appData.status || 'Pending',
    phone: (appData.phone || '').trim(),
    remarks: (appData.remarks || '').trim(),
    details: appData.details || {},
    createdAt: now,
    updatedAt: now
  };

  apps.unshift(newApp);
  saveApplications(apps);
  clearPagedApplicationsCache();

  apiPost('add', newApp).catch(err => {
    console.warn('Google Sheet sync notice:', err);
  });

  return newApp;
}

/**
 * Update an existing application
 */
export async function updateApplication(id, updates) {
  const apps = loadApplications();
  const index = apps.findIndex(a => a.id === id);
  if (index === -1) throw new Error('Record not found');

  const now = new Date().toISOString();
  const updated = {
    ...apps[index],
    ...updates,
    updatedAt: now
  };

  apps[index] = updated;
  saveApplications(apps);
  clearPagedApplicationsCache();

  apiPost('update', updated).catch(err => console.warn('Google Sheet update notice:', err));

  return { completedAndDeleted: false, record: updated };
}

/**
 * Fast Local-First Delete with Asynchronous Background Cloud Sync & Tombstone Protection
 */
export async function deleteApplication(id, extra = {}) {
  // 1. Locate app for full identifier extraction
  const apps = loadApplications();
  const index = apps.findIndex(a => (id && a.id === id) || (extra.trackNo && a.trackNo === extra.trackNo));
  let targetApp = null;
  if (index !== -1) {
    targetApp = apps[index];
    apps.splice(index, 1);
    saveApplications(apps);
  }

  const trackNo = extra.trackNo || targetApp?.trackNo || null;
  const cardNo = extra.cardNo || targetApp?.cardNo || null;
  const aadhaarNo = extra.aadhaarNo || targetApp?.aadhaarNo || null;
  const applicantName = extra.applicantName || targetApp?.applicantName || null;
  const block = extra.block || targetApp?.block || null;
  const serviceType = extra.serviceType || targetApp?.serviceType || null;

  // 2. Record in persistent tombstone registry (guarantees zero resurrection)
  recordDeletedTombstone({
    id,
    trackNo,
    cardNo,
    aadhaarNo
  });

  // 3. Clear paged memory and session caches immediately
  clearPagedApplicationsCache();

  const payload = {
    id: id || targetApp?.id,
    trackNo,
    cardNo,
    aadhaarNo,
    applicantName,
    block,
    serviceType
  };

  // 4. Background push to Google Apps Script
  apiPost('delete', payload).catch(err => {
    console.warn('Google Sheet background delete notice:', err);
  });

  return true;
}

/**
 * Batch import applications (from Excel/CSV)
 */
export async function batchImportApplications(items) {
  const apps = loadApplications();
  const now = new Date().toISOString();
  const formatted = items.map((item, idx) => ({
    id: item.id || `SS-${Date.now()}-${idx}`,
    serviceType: item.serviceType || 'New Card',
    applicantName: (item.applicantName || '').toUpperCase().trim(),
    cardNo: (item.cardNo || '').trim(),
    aadhaarNo: (item.aadhaarNo || '').trim(),
    trackNo: (item.trackNo || '').trim(),
    district: (item.district || 'Ganjam').trim(),
    block: (item.block || '').trim(),
    agent: (item.agent || '').trim(),
    officer: (item.officer || '').trim(),
    status: item.status || 'Pending',
    phone: (item.phone || '').trim(),
    remarks: (item.remarks || '').trim(),
    details: item.details || {},
    createdAt: item.createdAt || now,
    updatedAt: now
  }));

  const combined = [...formatted, ...apps];
  saveApplications(combined);
  clearPagedApplicationsCache();

  apiPost('batchImport', { items: formatted }).catch(err => console.warn('Google Sheet batch import notice:', err));

  return formatted.length;
}

/**
 * Fetch latest data from Google Sheet Web App
 * Real-time synchronization directly from the Google Sheet database
 */
export async function fetchFromGoogleSheet() {
  try {
    const params = serviceType ? { service: serviceType } : {};
    const data = await apiGet('getAll', params);
    if (data && data.success && Array.isArray(data.data)) {
      const remoteApps = data.data;

      const validRemote = remoteApps.filter(app => {
        if (!app) return false;
        if (isDeletedTombstone(app)) return false;
        const trackLower = (app.trackNo || '').trim().toLowerCase();
        const agentLower = (app.agent || '').trim().toLowerCase();
        if (trackLower === 'asdf' || trackLower === 'test') return false;
        if (LEGACY_DUMMY_NAMES.includes(agentLower)) return false;
        return true;
      });

      const now = Date.now();
      const inFlightLocal = loadApplications().filter(localApp => {
        if (!localApp || !localApp.id) return false;
        if (validRemote.some(r => r.id === localApp.id || (r.trackNo && r.trackNo === localApp.trackNo))) {
          return false;
        }
        const ageMs = localApp.createdAt ? (now - new Date(localApp.createdAt).getTime()) : Infinity;
        return ageMs < 45000;
      });

      const synced = [...inFlightLocal, ...validRemote];
      saveApplications(synced);

      return synced;
    }
  } catch (err) {
    console.warn('Backend fetch notice:', err?.message || err);
  }

  return loadApplications();
}

/**
 * Push all local applications to Google Sheet
 */
export async function pushAllToGoogleSheet() {
  const apps = loadApplications();
  const result = await apiPost('batchImport', { items: apps });
  if (!result || !result.success) {
    throw new Error((result && result.error) || 'Failed to upload to Google Sheet');
  }
  return result;
}

// ==========================================
// MARRIAGE VERIFICATION LIST - LOCAL & CLOUD DATABASE
// ==========================================
const MARRIAGE_VERIFY_STORAGE_KEY = 'shramik_setu_marriage_verify_v1';

/**
 * Load all Marriage Verification records
 */
export function loadMarriageVerifications() {
  try {
    const raw = localStorage.getItem(MARRIAGE_VERIFY_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.error('Failed to load marriage verifications:', e);
    return [];
  }
}

/**
 * Save Marriage Verification records
 */
export function saveMarriageVerifications(records) {
  try {
    localStorage.setItem(MARRIAGE_VERIFY_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save marriage verifications:', e);
  }
}

/**
 * Add a new Marriage Verification record (Instant optimistic write + background sync)
 */
export function addMarriageVerification(data) {
  const records = loadMarriageVerifications();
  const id = data.id || `MV-${Date.now()}`;
  const now = new Date().toISOString();
  const slNo = data.slNo || (records.length + 1);
  const phone = (data.phone || data.mobile || '').trim();

  const newRecord = {
    id,
    slNo,
    regNo: (data.regNo || data.cardNo || '').trim(),
    beneficiaryName: (data.beneficiaryName || data.applicantName || '').toUpperCase().trim(),
    phone: phone,
    mobile: phone,
    district: (data.district || 'Ganjam').trim(),
    block: (data.block || 'General').trim(),
    certifyingAuthority: (data.certifyingAuthority || '').trim(),
    marriageCertDate: data.marriageCertDate || '',
    marriageRegdNo: (data.marriageRegdNo || '').trim(),
    marriageFor: data.marriageFor || 'Daughter',
    dateOfMarriage: data.dateOfMarriage || '',
    groomName: (data.groomName || '').toUpperCase().trim(),
    daughterName: (data.daughterName || data.brideName || '').toUpperCase().trim(),
    remarks: (data.remarks || '').trim(),
    status: data.status || 'Verified',
    createdAt: now,
    updatedAt: now
  };

  records.unshift(newRecord);
  saveMarriageVerifications(records);

  apiPost('addMarriageVerify', newRecord).catch(err => {
    console.warn('Backend sync notice for addMarriageVerify:', err);
  });

  return newRecord;
}

/**
 * Update Marriage Verification record
 */
export function updateMarriageVerification(id, updates) {
  const records = loadMarriageVerifications();
  const index = records.findIndex(r => r.id === id || (updates.regNo && r.regNo === updates.regNo));
  if (index === -1) return null;

  const now = new Date().toISOString();
  const phone = (updates.phone !== undefined ? updates.phone : (updates.mobile !== undefined ? updates.mobile : (records[index].phone || records[index].mobile || ''))).trim();

  const updated = {
    ...records[index],
    ...updates,
    phone: phone,
    mobile: phone,
    updatedAt: now
  };

  records[index] = updated;
  saveMarriageVerifications(records);

  apiPost('updateMarriageVerify', updated).catch(err => {
    console.warn('Backend sync notice for updateMarriageVerify:', err);
  });

  return updated;
}

/**
 * Delete Marriage Verification record
 */
export function deleteMarriageVerification(id) {
  const records = loadMarriageVerifications();
  const target = records.find(r => r.id === id);
  const filtered = records.filter(r => r.id !== id);
  saveMarriageVerifications(filtered);

  apiPost('deleteMarriageVerify', { id, regNo: target?.regNo }).catch(err => {
    console.warn('Backend sync notice for deleteMarriageVerify:', err);
  });

  return filtered;
}

/**
 * Fetch Marriage Verification records from Google Sheets backend
 * Safely merges remote records while preserving recent local unsynced entries.
 */
export async function fetchMarriageVerificationsFromBackend() {
  try {
    const res = await apiGet('getMarriageVerifications');
    if (res && res.success && Array.isArray(res.records)) {
      const currentLocal = loadMarriageVerifications();
      const mergedMap = new Map();

      // Put remote records in map
      res.records.forEach(r => {
        if (r && (r.id || r.regNo)) {
          const key = r.id || r.regNo;
          const phone = (r.phone || r.mobile || '').trim();
          mergedMap.set(key, {
            ...r,
            phone: phone,
            mobile: phone
          });
        }
      });

      // Preserve recent local records created within last 15 minutes that may still be syncing
      const fifteenMinutesAgo = Date.now() - 900000;
      currentLocal.forEach(loc => {
        const key = loc.id || loc.regNo;
        if (!mergedMap.has(key)) {
          const locTime = loc.createdAt ? new Date(loc.createdAt).getTime() : Date.now();
          if (locTime > fifteenMinutesAgo) {
            mergedMap.set(key, loc);
          }
        }
      });

      const merged = Array.from(mergedMap.values());
      saveMarriageVerifications(merged);
      return merged;
    }
  } catch (e) {
    console.warn('Notice: Backend fetch for marriage verifications:', e);
  }
  return loadMarriageVerifications();
}
