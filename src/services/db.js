import { INITIAL_DISTRICTS } from '../data/locationData';
import { getActiveGoogleScriptUrl, saveCustomGoogleScriptUrl } from '../config/backendConfig';
import { apiGet, apiPost } from './api';
import { syncDirect } from './syncQueue';

const LOCAL_STORAGE_KEY = 'shramik_setu_applications_v2';
const DISTRICTS_STORAGE_KEY = 'shramik_setu_districts_v1';
const AGENTS_STORAGE_KEY = 'shramik_setu_agents_v1';

/**
 * Get configured Google Apps Script Web App URL
 */
export function getGoogleScriptUrl() {
  return getActiveGoogleScriptUrl();
}

/**
 * Save custom Google Apps Script Web App URL to localStorage
 */
export function setGoogleScriptUrl(url) {
  saveCustomGoogleScriptUrl(url);
}

/**
 * Load all active applications from LocalStorage
 * With automatic migration from legacy storage keys
 */
export function loadApplications() {
  try {
    let raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      // Migrate from any legacy storage keys if present
      const legacyRaw = localStorage.getItem('shramik_setu_applications_v1') || 
                        localStorage.getItem('shramik_setu_applications') ||
                        localStorage.getItem('shramiksetu_applications');
      if (legacyRaw) {
        raw = legacyRaw;
        localStorage.setItem(LOCAL_STORAGE_KEY, legacyRaw);
      }
    }

    if (!raw) {
      return [];
    }

    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    // Filter out only completely blank items or obvious placeholder tracks
    const cleaned = list.filter(app => {
      if (!app) return false;
      const trackLower = (app.trackNo || '').trim().toLowerCase();
      if (trackLower === 'asdf' || trackLower === 'test' || trackLower === 'test1234') return false;
      return true;
    });

    return cleaned;
  } catch (e) {
    console.error('Failed to load applications from localStorage:', e);
    return [];
  }
}

/**
 * Save all applications to LocalStorage
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
 * Load Agents from storage - 100% database driven
 */
export function loadAgents() {
  try {
    const raw = localStorage.getItem(AGENTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter(a => a && a.name);
  } catch (e) {
    return [];
  }
}

/**
 * Save Agents
 */
export function saveAgents(agents) {
  try {
    const list = Array.isArray(agents) ? agents : [];
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
      // Merge remote agents with any local in-flight agents not yet on remote
      const remoteIds = new Set(res.agents.map(a => String(a.id || a.name || '').toLowerCase()));
      const localAgents = loadAgents();
      const inFlight = localAgents.filter(a => !remoteIds.has(String(a.id || a.name || '').toLowerCase()));
      const merged = [...inFlight, ...res.agents];
      saveAgents(merged);
      return merged;
    }
  } catch (e) {
    console.warn('Notice: Backend fetch for agents:', e);
  }
  return loadAgents();
}

/**
 * Add a new Agent - commits locally for instant UI update and syncs directly to Google Sheets database
 */
export async function addAgent(agentData) {
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

  // 1. Instantly save to local storage so UI updates immediately without freezing
  agents.unshift(newAgent);
  saveAgents(agents);

  // 2. Direct synchronization with Google Sheets database (with automatic resilient sync queue)
  syncDirect('addAgent', newAgent, id, 'agent').catch(err => {
    console.warn('Google Sheet agent sync notice:', err);
  });

  return newAgent;
}

/**
 * Update an existing Agent - commits locally and updates Google Sheets database directly
 */
export async function updateAgent(id, updates) {
  const agents = loadAgents();
  const index = agents.findIndex(a => a.id === id);
  if (index === -1) return null;

  const oldName = agents[index].name;
  const phone = (updates.mobile || updates.phone || agents[index].mobile || '').trim();
  const village = (updates.village || updates.block || agents[index].village || '').trim();

  const updatedAgent = {
    ...agents[index],
    name: (updates.name || agents[index].name).trim(),
    mobile: phone,
    phone: phone,
    village: village,
    block: village,
    district: updates.district || agents[index].district || 'Ganjam',
    photo: updates.photo !== undefined ? updates.photo : agents[index].photo,
    updatedAt: new Date().toISOString()
  };

  // 1. Instantly update local copy
  agents[index] = updatedAgent;
  saveAgents(agents);

  // If agent name changed, update matching applications
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

  // 2. Direct sync to Google Sheets database
  syncDirect('updateAgent', { ...updatedAgent, oldName }, id, 'agent').catch(err => {
    console.warn('Google Sheet agent update notice:', err);
  });

  return updatedAgent;
}

/**
 * Delete an Agent - removes locally and from Google Sheets database directly
 */
export async function deleteAgent(id) {
  const agents = loadAgents();
  const target = agents.find(a => a.id === id || a.name === id);
  const filtered = agents.filter(a => a.id !== id && a.name !== id);

  saveAgents(filtered);

  // Direct sync delete to Google Sheets database
  syncDirect('deleteAgent', { id, name: target ? target.name : id }, id, 'agent').catch(err => {
    console.warn('Google Sheet agent delete notice:', err);
  });

  return filtered;
}

/**
 * Completely wipe all data from database
 */
export function clearAllData() {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
  localStorage.removeItem('shramik_setu_applications_v1');
  localStorage.removeItem('shramik_setu_completed_archive_v1');
  localStorage.removeItem('shramik_setu_completed_archive_v2');
  return [];
}

/**
 * Add a new application - commits locally for instant UI update and syncs directly to Google Sheets database
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

  // 1. Instantly save to local storage so UI updates smoothly without freezing
  apps.unshift(newApp);
  saveApplications(apps);

  // 2. Direct synchronization with Google Sheet database (with background sync queue guarantee)
  syncDirect('add', newApp, newApp.id, 'application').catch(err => {
    console.warn('Google Sheet application sync notice:', err);
  });

  return newApp;
}

/**
 * Update an existing application - commits locally and directly updates Google Sheets database
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

  // 1. Instantly update local copy
  apps[index] = updated;
  saveApplications(apps);

  // 2. Direct synchronization with Google Sheet database
  syncDirect('update', updated, id, 'application').catch(err => {
    console.warn('Google Sheet application update notice:', err);
  });

  return { completedAndDeleted: false, record: updated };
}

/**
 * Delete application explicitly - removes locally and from Google Sheets database directly
 */
export async function deleteApplication(id) {
  const apps = loadApplications();
  const index = apps.findIndex(a => a.id === id);
  if (index === -1) return false;

  const targetApp = apps[index];

  // 1. Instantly remove from local copy
  apps.splice(index, 1);
  saveApplications(apps);

  // 2. Direct synchronization with Google Sheet database
  syncDirect('delete', { 
    id, 
    trackNo: targetApp?.trackNo, 
    serviceType: targetApp?.serviceType 
  }, id, 'application').catch(err => {
    console.warn('Google Sheet application delete notice:', err);
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

  apiPost('batchImport', { items: formatted }).catch(err => console.warn('Google Sheet batch import notice:', err));

  return formatted.length;
}

/**
 * Fetch latest data from Google Sheet Web App
 * Real-time synchronization directly from the Google Sheet database
 */
export async function fetchFromGoogleSheet() {
  try {
    const data = await apiGet('getAll');
    if (data && data.success && Array.isArray(data.data)) {
      const remoteApps = data.data;

      // Accept all valid applications from the remote Google Sheet
      const validRemote = remoteApps.filter(app => {
        if (!app) return false;
        const trackLower = (app.trackNo || '').trim().toLowerCase();
        if (trackLower === 'asdf' || trackLower === 'test') return false;
        return Boolean(app.applicantName || app.trackNo || app.cardNo || app.id);
      });

      // Preserve any local application that is not yet reflected in the Google Sheet (never drop user data)
      const remoteIds = new Set();
      validRemote.forEach(r => {
        if (r.id) remoteIds.add(String(r.id));
        if (r.trackNo) remoteIds.add(String(r.trackNo).trim().toLowerCase());
      });

      const inFlightLocal = loadApplications().filter(localApp => {
        if (!localApp) return false;
        const matchesId = localApp.id && remoteIds.has(String(localApp.id));
        const matchesTrack = localApp.trackNo && remoteIds.has(String(localApp.trackNo).trim().toLowerCase());
        return !matchesId && !matchesTrack;
      });

      const synced = [...inFlightLocal, ...validRemote];
      saveApplications(synced);

      // Also sync agents from Google Sheet
      try {
        const agentData = await apiGet('getAgents');
        if (agentData && agentData.success && Array.isArray(agentData.agents)) {
          saveAgents(agentData.agents);
        }
      } catch (e) {
        console.warn('Agent sync notice:', e);
      }

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
 * Add a new Marriage Verification record - commits locally and syncs directly to Google Sheets database
 */
export async function addMarriageVerification(data) {
  const records = loadMarriageVerifications();
  const id = `MV-${Date.now()}`;
  const now = new Date().toISOString();
  const slNo = records.length + 1;

  const newRecord = {
    id,
    slNo,
    regNo: (data.regNo || data.cardNo || '').trim(),
    beneficiaryName: (data.beneficiaryName || data.applicantName || '').toUpperCase().trim(),
    phone: (data.phone || data.mobile || '').trim(),
    block: (data.block || 'Sanakhemundi').trim(),
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

  // 1. Instantly commit locally
  records.unshift(newRecord);
  saveMarriageVerifications(records);

  // 2. Direct sync to Google Sheets database (with resilient sync queue)
  syncDirect('addMarriageVerify', newRecord, id, 'marriage').catch(err => {
    console.warn('Google Sheet marriage verification sync notice:', err);
  });

  return newRecord;
}

/**
 * Update Marriage Verification record - commits locally and updates Google Sheets database directly
 */
export async function updateMarriageVerification(id, updates) {
  const records = loadMarriageVerifications();
  const index = records.findIndex(r => r.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const updated = {
    ...records[index],
    ...updates,
    updatedAt: now
  };

  // 1. Instantly commit locally
  records[index] = updated;
  saveMarriageVerifications(records);

  // 2. Direct sync to Google Sheets database
  syncDirect('updateMarriageVerify', updated, id, 'marriage').catch(err => {
    console.warn('Google Sheet marriage update notice:', err);
  });

  return updated;
}

/**
 * Delete Marriage Verification record - removes locally and from Google Sheets database directly
 */
export async function deleteMarriageVerification(id) {
  const records = loadMarriageVerifications();
  const target = records.find(r => r.id === id);
  const filtered = records.filter(r => r.id !== id);

  saveMarriageVerifications(filtered);

  // Direct sync to Google Sheets database
  syncDirect('deleteMarriageVerify', { id, regNo: target?.regNo }, id, 'marriage').catch(err => {
    console.warn('Google Sheet marriage delete notice:', err);
  });

  return filtered;
}

/**
 * Fetch Marriage Verification records from Google Sheets backend
 */
export async function fetchMarriageVerificationsFromBackend() {
  try {
    const res = await apiGet('getMarriageVerifications');
    if (res && res.success && Array.isArray(res.records)) {
      // Merge remote records with any local records not yet confirmed in the sheet
      const remoteIds = new Set(res.records.map(r => String(r.id || r.regNo || '').toLowerCase()));
      const localRecords = loadMarriageVerifications();
      const inFlight = localRecords.filter(r => !remoteIds.has(String(r.id || r.regNo || '').toLowerCase()));
      const merged = [...inFlight, ...res.records];
      saveMarriageVerifications(merged);
      return merged;
    }
  } catch (e) {
    console.warn('Notice: Backend fetch for marriage verifications:', e);
  }
  return loadMarriageVerifications();
}
