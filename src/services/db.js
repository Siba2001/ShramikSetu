import { INITIAL_DISTRICTS } from '../data/locationData';
import { GOOGLE_SCRIPT_WEB_APP_URL } from '../config/backendConfig';
import {
  apiGet,
  apiPost,
  fetchDashboardSummaryApi,
  fetchApplicationsPagedApi,
  updateApplicationStatusApi
} from './api';

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
 * Load all active applications from LocalStorage
 * Automatically filters out any legacy dummy/test records
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

    // Automatically purge old phantom/dummy records left over from earlier tests
    const cleaned = list.filter(app => {
      if (!app) return false;
      const agentLower = (app.agent || '').trim().toLowerCase();
      const trackLower = (app.trackNo || '').trim().toLowerCase();
      if (trackLower === 'asdf' || trackLower === 'test' || trackLower === 'test1234') return false;
      if (LEGACY_DUMMY_NAMES.includes(agentLower)) return false;
      return true;
    });

    if (cleaned.length !== list.length) {
      saveApplications(cleaned);
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
    const list = Array.isArray(apps) ? apps : [];
    // Protect localStorage quota (~5MB). If list is massive (e.g. 5,000+), cache the most recent 1,500 records
    const toStore = list.length > 1500 ? list.slice(0, 1500) : list;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(toStore));
  } catch (e) {
    console.warn('LocalStorage quota warning - storing compact cache:', e.message);
    try {
      if (Array.isArray(apps)) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(apps.slice(0, 500)));
      }
    } catch (inner) { }
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
    });

    if (cleaned.length !== list.length) {
      localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(cleaned));
    }
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
      saveAgents(res.agents);
      return res.agents;
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
 * Fast Local-First Delete with Asynchronous Background Cloud Sync (DIVY-IMPEX Architecture)
 */
export async function deleteApplication(id, extra = {}) {
  // 1. Instant local storage purge
  const apps = loadApplications();
  const index = apps.findIndex(a => (id && a.id === id) || (extra.trackNo && a.trackNo === extra.trackNo));
  let targetApp = null;
  if (index !== -1) {
    targetApp = apps[index];
    apps.splice(index, 1);
    saveApplications(apps);
  }

  // 2. Clear paged memory and session caches immediately
  clearPagedApplicationsCache();

  const payload = {
    id: id || targetApp?.id,
    trackNo: extra.trackNo || targetApp?.trackNo,
    cardNo: extra.cardNo || targetApp?.cardNo,
    serviceType: extra.serviceType || targetApp?.serviceType
  };

  // 3. Fire-and-forget background push to Google Apps Script (non-blocking)
  apiPost('delete', payload).catch(err => {
    console.warn('Google Sheet background delete notice:', err);
  });

  return true;
}

/**
 * TARGETED STATUS UPDATE (Fast, column-targeted, zero full database refresh required)
 */
export async function updateApplicationStatusTargeted(id, status, remarks, serviceType, user = 'Operator', role = 'Staff') {
  const apps = loadApplications();
  const index = apps.findIndex(a => a.id === id);
  let updatedRecord = null;

  if (index !== -1) {
    apps[index] = {
      ...apps[index],
      status,
      remarks: remarks !== undefined ? remarks : apps[index].remarks,
      officer: remarks !== undefined ? remarks : apps[index].officer,
      updatedAt: new Date().toISOString()
    };
    saveApplications(apps);
    clearPagedApplicationsCache();
    updatedRecord = apps[index];
  }

  // Send lightweight targeted call to backend
  try {
    const res = await updateApplicationStatusApi({
      id,
      status,
      remarks,
      serviceType: serviceType || (updatedRecord?.serviceType),
      user,
      role
    });
    return { success: true, record: updatedRecord, backendRes: res };
  } catch (err) {
    console.warn('Targeted status backend update notice:', err);
    return { success: true, record: updatedRecord };
  }
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
 * HIGH-SPEED PRE-AGGREGATED DASHBOARD SUMMARY
 * Retrieves aggregated KPIs from Google Apps Script CacheService without downloading full row database.
 */
export async function fetchDashboardSummary(bypassCache = false) {
  try {
    const res = await fetchDashboardSummaryApi(bypassCache);
    if (res && res.success) {
      const rawCategoryCounts = res.categoryCounts || res.serviceStats || res.serviceCounts || {};
      const rawBlockCounts = res.blockCounts || res.blockStats || res.blockDistribution || {};
      const rawDistrictCounts = res.districtCounts || res.districtStats || res.districtDistribution || {};

      const renewalCount = (rawCategoryCounts['Card Renewal'] || 0) + (rawCategoryCounts['card renewal'] || 0);
      const contributionCount = rawCategoryCounts['Annual Contribution'] || 0;

      const normalized = {
        ...res,
        categoryCounts: {
          'New Card': rawCategoryCounts['New Card'] || rawCategoryCounts['new card'] || 0,
          'Card Renewal': renewalCount > 0 ? renewalCount : (contributionCount > 0 ? contributionCount : 0),
          'Annual Contribution': renewalCount > 0 ? contributionCount : 0,
          'Marriage Benefit Apply': rawCategoryCounts['Marriage Benefit Apply'] || rawCategoryCounts['Marriage Benefit'] || 0,
          'Maternity Benefit Apply': rawCategoryCounts['Maternity Benefit Apply'] || rawCategoryCounts['Maternity Benefit'] || 0,
          'Death Benefit Apply': rawCategoryCounts['Death Benefit Apply'] || rawCategoryCounts['Death Benefit'] || 0,
          'Education Assistance Apply': rawCategoryCounts['Education Assistance Apply'] || rawCategoryCounts['Education Grant'] || 0
        },
        serviceStats: rawCategoryCounts,
        blockStats: rawBlockCounts,
        blockCounts: rawBlockCounts,
        blockDistribution: rawBlockCounts,
        districtStats: rawDistrictCounts,
        districtCounts: rawDistrictCounts,
        districtDistribution: rawDistrictCounts
      };

      try {
        localStorage.setItem(DASHBOARD_SUMMARY_STORAGE_KEY, JSON.stringify(normalized));
      } catch (e) { }
      return normalized;
    }
  } catch (err) {
    console.warn('Dashboard summary fetch notice:', err?.message || err);
  }

  // Fallback: load cached summary from localStorage if available
  try {
    const cached = localStorage.getItem(DASHBOARD_SUMMARY_STORAGE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (e) { }

  return null;
}

// High-Speed In-Memory & Session Paged Cache for instantaneous (0ms) module switching
const memoryPagedCache = new Map();
const SESSION_CACHE_PREFIX = 'shramiksetu_paged_cache_';

function buildPagedCacheKey(params = {}) {
  return [
    params.service || 'All',
    params.page || 1,
    params.pageSize || 50,
    (params.search || '').trim().toLowerCase(),
    params.block || 'All',
    params.agent || 'All',
    params.status || 'All',
    params.fromDate || '',
    params.toDate || ''
  ].join('::');
}

/**
 * Instantly retrieve cached page (0ms latency)
 */
export function getCachedPagedApplications(params = {}) {
  const key = buildPagedCacheKey(params);
  // 1. Check in-memory map
  const mem = memoryPagedCache.get(key);
  if (mem && (Date.now() - mem.timestamp < 180000)) { // 3 minutes validity
    return mem.data;
  }
  // 2. Check sessionStorage fallback
  try {
    if (typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(SESSION_CACHE_PREFIX + key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (Date.now() - parsed.timestamp < 180000)) {
          memoryPagedCache.set(key, parsed);
          return parsed.data;
        }
      }
    }
  } catch (e) {}
  return null;
}

/**
 * Cache paged applications result in memory and session
 */
export function setCachedPagedApplications(params = {}, data) {
  if (!data || !data.success) return;
  const key = buildPagedCacheKey(params);
  const entry = { data, timestamp: Date.now() };
  memoryPagedCache.set(key, entry);

  // Keep memory cache size bounded
  if (memoryPagedCache.size > 50) {
    const first = memoryPagedCache.keys().next().value;
    memoryPagedCache.delete(first);
  }

  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_CACHE_PREFIX + key, JSON.stringify(entry));
    }
  } catch (e) {}
}

/**
 * Clear paged applications cache on data mutation
 */
export function clearPagedApplicationsCache() {
  memoryPagedCache.clear();
  try {
    if (typeof sessionStorage !== 'undefined') {
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(SESSION_CACHE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => sessionStorage.removeItem(k));
    }
  } catch (e) {}
}

/**
 * SERVER-SIDE PAGINATED & FILTERED APPLICATION FETCHER
 * Implements Stale-While-Revalidate (SWR) for instantaneous response (0ms) and background sync.
 */
export async function fetchApplicationsPaged(params = {}) {
  const isBypass = !!params.bypassCache;
  const cachedData = !isBypass ? getCachedPagedApplications(params) : null;

  // Stale-While-Revalidate: If fresh data exists in cache, return immediately (0ms)
  // and silently revalidate in background if older than 15 seconds
  if (cachedData) {
    const key = buildPagedCacheKey(params);
    const entry = memoryPagedCache.get(key);
    const isStale = !entry || (Date.now() - entry.timestamp > 15000);

    if (isStale) {
      fetchApplicationsPagedApi(params).then(fresh => {
        if (fresh && fresh.success && Array.isArray(fresh.data)) {
          setCachedPagedApplications(params, fresh);
          try {
            window.dispatchEvent(new CustomEvent('shramiksetu:paged_sync', { detail: { params, data: fresh } }));
          } catch (e) {}
        }
      }).catch(() => {});
    }
    return cachedData;
  }

  try {
    const res = await fetchApplicationsPagedApi(params);
    if (res && res.success && Array.isArray(res.data)) {
      setCachedPagedApplications(params, res);
      // Keep local storage synchronized with fetched live records
      try {
        const localApps = loadApplications();
        let changed = false;
        res.data.forEach(remoteApp => {
          const idx = localApps.findIndex(a => (remoteApp.id && a.id === remoteApp.id) || (remoteApp.trackNo && a.trackNo === remoteApp.trackNo));
          if (idx !== -1) {
            localApps[idx] = { ...localApps[idx], ...remoteApp };
            changed = true;
          } else {
            localApps.unshift(remoteApp);
            changed = true;
          }
        });
        if (changed) {
          saveApplications(localApps);
        }
      } catch (e) { }
      return res;
    }
  } catch (err) {
    console.warn('Server-side paged fetch notice:', err?.message || err);
  }

  // Graceful offline fallback: filter & slice local applications in memory
  const apps = loadApplications();
  const service = params.service || null;
  const page = Math.max(1, parseInt(params.page || 1, 10));
  const pageSize = Math.max(1, parseInt(params.pageSize || 50, 10));
  const search = (params.search || '').trim().toLowerCase();
  const filterBlock = (params.block || 'All').trim();
  const filterStatus = (params.status || 'All').trim();

  let filtered = apps.filter(item => {
    if (service && service !== 'All') {
      if (service === 'Card Renewal' || service === 'Annual Contribution') {
        if (item.serviceType !== 'Card Renewal' && item.serviceType !== 'Annual Contribution') return false;
      } else if (item.serviceType !== service) {
        return false;
      }
    }
    if (filterBlock !== 'All' && filterBlock !== '') {
      if ((item.block || '').toLowerCase() !== filterBlock.toLowerCase()) return false;
    }
    if (filterStatus !== 'All' && filterStatus !== '') {
      const itemSt = (item.status || '').toLowerCase();
      const fSt = filterStatus.toLowerCase();
      if (fSt === 'pending') {
        if (itemSt !== 'pending' && itemSt !== 'e-sign pending') return false;
      } else if (itemSt !== fSt) {
        return false;
      }
    }
    if (search) {
      const match = (
        (item.applicantName && item.applicantName.toLowerCase().includes(search)) ||
        (item.cardNo && item.cardNo.toLowerCase().includes(search)) ||
        (item.aadhaarNo && item.aadhaarNo.toLowerCase().includes(search)) ||
        (item.trackNo && item.trackNo.toLowerCase().includes(search)) ||
        (item.agent && item.agent.toLowerCase().includes(search))
      );
      if (!match) return false;
    }
    return true;
  });

  const totalRecords = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pagedRecords = filtered.slice(startIndex, startIndex + pageSize);

  return {
    success: true,
    page,
    pageSize,
    totalRecords,
    totalPages,
    data: pagedRecords,
    isLocalFallback: true
  };
}

/**
 * Fetch latest data from Google Sheet Web App (Legacy / Fallback synchronization)
 */
export async function fetchFromGoogleSheet(serviceType = null) {
  try {
    const params = serviceType ? { service: serviceType } : {};
    const data = await apiGet('getAll', params);
    if (data && data.success && Array.isArray(data.data)) {
      const remoteApps = data.data;

      const validRemote = remoteApps.filter(app => {
        if (!app) return false;
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
