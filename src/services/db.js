import { INITIAL_APPLICATIONS } from '../data/initialData';
import { INITIAL_DISTRICTS } from '../data/locationData';
import { INITIAL_AGENTS } from '../data/agentData';
import { GOOGLE_SCRIPT_WEB_APP_URL } from '../config/backendConfig';

const LOCAL_STORAGE_KEY = 'shramik_setu_applications_v2';
const COMPLETED_ARCHIVE_KEY = 'shramik_setu_completed_archive_v2';
const GOOGLE_SCRIPT_URL_KEY = 'shramik_setu_gas_url_v1';
const DISTRICTS_STORAGE_KEY = 'shramik_setu_districts_v1';
const AGENTS_STORAGE_KEY = 'shramik_setu_agents_v1';

export const PRODUCTION_GOOGLE_SCRIPT_URL = GOOGLE_SCRIPT_WEB_APP_URL;

/**
 * Get configured Google Apps Script Web App URL
 * Maintained securely directly in code to avoid exposing or tampering in the UI
 */
export function getGoogleScriptUrl() {
  return GOOGLE_SCRIPT_WEB_APP_URL;
}

/**
 * Save Google Apps Script Web App URL (Deprecated - Maintained in code)
 */
export function setGoogleScriptUrl(url) {
  // Maintained in code
}

/**
 * Load all active applications from LocalStorage
 */
export function loadApplications() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
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
 * Load completed & archived applications
 */
export function loadArchivedApplications() {
  try {
    const raw = localStorage.getItem(COMPLETED_ARCHIVE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Save completed & archived applications
 */
export function saveArchivedApplications(archive) {
  try {
    localStorage.setItem(COMPLETED_ARCHIVE_KEY, JSON.stringify(archive));
  } catch (e) {
    console.error('Failed to save archive:', e);
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
 * Load Agents with detailed profiles (name, mobile, village, photo)
 */
export function loadAgents() {
  try {
    const raw = localStorage.getItem(AGENTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(INITIAL_AGENTS));
      return INITIAL_AGENTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_AGENTS;
  }
}

/**
 * Save Agents
 */
export function saveAgents(agents) {
  try {
    localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
  } catch (e) {
    console.error('Failed to save agents:', e);
  }
}

/**
 * Add a new Agent
 */
export function addAgent(agentData) {
  const agents = loadAgents();
  const newAgent = {
    id: `ag-${Date.now()}`,
    name: agentData.name.trim(),
    mobile: (agentData.mobile || '').trim(),
    village: (agentData.village || '').trim(),
    photo: agentData.photo || '',
    createdAt: new Date().toISOString()
  };
  agents.unshift(newAgent);
  saveAgents(agents);

  const gasUrl = getGoogleScriptUrl();
  if (gasUrl) {
    try {
      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'addAgent', payload: newAgent })
      }).catch(() => {});
    } catch (e) {}
  }

  return newAgent;
}

/**
 * Update an existing Agent
 */
export function updateAgent(id, updates) {
  const agents = loadAgents();
  const index = agents.findIndex(a => a.id === id);
  if (index === -1) return null;

  const oldName = agents[index].name;
  const updatedAgent = {
    ...agents[index],
    name: updates.name.trim(),
    mobile: (updates.mobile || '').trim(),
    village: (updates.village || '').trim(),
    photo: updates.photo !== undefined ? updates.photo : agents[index].photo,
    updatedAt: new Date().toISOString()
  };

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

  return updatedAgent;
}

/**
 * Delete an Agent
 */
export function deleteAgent(id) {
  const agents = loadAgents();
  const target = agents.find(a => a.id === id || a.name === id);
  const filtered = agents.filter(a => a.id !== id && a.name !== id);
  saveAgents(filtered);

  const gasUrl = getGoogleScriptUrl();
  if (gasUrl) {
    try {
      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'deleteAgent', payload: { id, name: target ? target.name : id } })
      }).catch(() => {});
    } catch (e) {}
  }

  return filtered;
}

/**
 * Completely wipe all data from database
 */
export function clearAllData() {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
  localStorage.setItem(COMPLETED_ARCHIVE_KEY, JSON.stringify([]));
  localStorage.removeItem('shramik_setu_applications_v1');
  localStorage.removeItem('shramik_setu_completed_archive_v1');
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
    district: appData.district || 'Ganjam',
    block: appData.block || 'Digapahandi',
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

  // Sync with Google Sheet if configured
  const gasUrl = getGoogleScriptUrl();
  if (gasUrl) {
    try {
      await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'add', payload: newApp })
      });
    } catch (err) {
      console.warn('Google Sheet sync notice:', err);
    }
  }

  return newApp;
}

/**
 * Update an existing application
 * If status is changed to "Completed", it removes it from the active database!
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

  // If status is "Completed", delete from active database and store in Completed Archive!
  if (updated.status === 'Completed') {
    apps.splice(index, 1);
    saveApplications(apps);

    const archive = loadArchivedApplications();
    archive.unshift(updated);
    saveArchivedApplications(archive);

    const gasUrl = getGoogleScriptUrl();
    if (gasUrl) {
      try {
        await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'delete', payload: { id } })
        });
      } catch (err) {
        console.warn('Google Sheet delete notice:', err);
      }
    }

    return { completedAndDeleted: true, record: updated };
  }

  apps[index] = updated;
  saveApplications(apps);

  const gasUrl = getGoogleScriptUrl();
  if (gasUrl) {
    try {
      await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'update', payload: updated })
      });
    } catch (err) {
      console.warn('Google Sheet update notice:', err);
    }
  }

  return { completedAndDeleted: false, record: updated };
}

/**
 * Delete application explicitly
 */
export async function deleteApplication(id, archiveFirst = true) {
  const apps = loadApplications();
  const index = apps.findIndex(a => a.id === id);
  if (index === -1) return false;

  const [removed] = apps.splice(index, 1);
  saveApplications(apps);

  if (archiveFirst && removed) {
    const archive = loadArchivedApplications();
    archive.unshift(removed);
    saveArchivedApplications(archive);
  }

  const gasUrl = getGoogleScriptUrl();
  if (gasUrl) {
    try {
      await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'delete', payload: { id } })
      });
    } catch (err) {
      console.warn('Google Sheet delete notice:', err);
    }
  }

  return true;
}

/**
 * Restore an application from Completed Archive back into active database
 */
export async function restoreArchivedApplication(id) {
  const archive = loadArchivedApplications();
  const index = archive.findIndex(a => a.id === id);
  if (index === -1) return false;

  const [restored] = archive.splice(index, 1);
  saveArchivedApplications(archive);

  restored.status = 'In Progress';
  restored.updatedAt = new Date().toISOString();

  const apps = loadApplications();
  apps.unshift(restored);
  saveApplications(apps);

  const gasUrl = getGoogleScriptUrl();
  if (gasUrl) {
    try {
      await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'add', payload: restored })
      });
    } catch (err) {
      console.warn('Google Sheet restore notice:', err);
    }
  }

  return restored;
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
    district: item.district || 'Ganjam',
    block: item.block || 'Digapahandi',
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

  const gasUrl = getGoogleScriptUrl();
  if (gasUrl) {
    try {
      await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'batchImport', payload: { items: formatted } })
      });
    } catch (err) {
      console.warn('Google Sheet batch import notice:', err);
    }
  }

  return formatted.length;
}

/**
 * Fetch latest data from Google Sheet Web App
 */
export async function fetchFromGoogleSheet() {
  const gasUrl = getGoogleScriptUrl();
  if (!gasUrl) throw new Error('Google Apps Script URL is not configured.');

  // 1. Fetch Active Applications
  const res = await fetch(`${gasUrl}?action=getAll`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch from Google Sheet');

  if (Array.isArray(data.data)) {
    saveApplications(data.data);
  }

  // 2. Fetch Archived Applications
  try {
    const archRes = await fetch(`${gasUrl}?action=getArchived`);
    const archData = await archRes.json();
    if (archData.success && Array.isArray(archData.data)) {
      saveArchivedApplications(archData.data);
    }
  } catch (e) {
    console.warn('Archive sync notice:', e);
  }

  // 3. Fetch Agents
  try {
    const agentRes = await fetch(`${gasUrl}?action=getAgents`);
    const agentData = await agentRes.json();
    if (agentData.success && Array.isArray(agentData.agents) && agentData.agents.length > 0) {
      saveAgents(agentData.agents);
    }
  } catch (e) {
    console.warn('Agent sync notice:', e);
  }

  return data.data || [];
}

/**
 * Push all local applications to Google Sheet
 */
export async function pushAllToGoogleSheet() {
  const gasUrl = getGoogleScriptUrl();
  if (!gasUrl) throw new Error('Google Apps Script URL is not configured.');

  const apps = loadApplications();
  const res = await fetch(gasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'batchImport', payload: { items: apps } })
  });
  const result = await res.json();
  if (!result.success) throw new Error(result.error || 'Failed to upload to Google Sheet');
  return result;
}
