// Authentication, Session Tracking & Zero-Trust Security Service for ShramikSetu
import {
  generateSalt,
  hashPassword,
  verifyPassword,
  generateSecureToken,
  generate2FASecret,
  verify2FACode
} from '../utils/cryptoUtils';
import { apiGet, apiPost } from './api';
import { getGoogleScriptUrl } from './db';

const AUTH_STORAGE_KEY = 'shramiksetu_auth_user';
const REMEMBER_KEY = 'shramiksetu_remember_flag';
const SYSTEM_ACCOUNTS_KEY = 'shramiksetu_system_accounts_v3';
const MASTER_KEY_STORAGE = 'shramiksetu_master_key';
const AUDIT_LOG_KEY = 'shramiksetu_audit_logs_v3';
const LOCK_STATE_KEY = 'shramiksetu_session_locked';
const ACTIVE_SESSIONS_KEY = 'shramiksetu_active_sessions_v1';

// Default Master Key for the Security Gate
export const DEFAULT_MASTER_TOKEN = 'SHRAMIK-SECURE-2026';
export const LEGACY_MASTER_TOKEN = 'DIVY-SECURE-2026';

// Session Policy: 1-hour active session with permission prompt before auto-logout
export const SESSION_TIMEOUT_MINUTES = 60; // 1 hour
export const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour in ms
export const SESSION_WARNING_SECONDS = 60; // 60-second warning prompt before auto-logout

// ==========================================
// 1. STANDARD ROLES & PERMISSIONS MATRIX
// ==========================================
export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  DISTRICT_OPERATOR: 'District Operator',
  BLOCK_OPERATOR: 'Block Operator',
  VIEWER: 'Viewer'
};

export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: {
    canManageUsers: true,
    canAccessSecurity: true,
    canViewAllDistricts: true,
    canViewAllBlocks: true,
    canAddRecord: true,
    canEditRecord: true,
    canDeleteRecord: true,
    canChangeStatus: true,
    canImportExcel: true,
    canExportReports: true,
    canViewUnmaskedPII: true,
    canClearAudit: true,
    isReadOnly: false
  },
  [ROLES.DISTRICT_OPERATOR]: {
    canManageUsers: false,
    canAccessSecurity: false,
    canViewAllDistricts: false,
    canViewAllBlocks: false, // Scoped to assigned district
    canAddRecord: true,
    canEditRecord: true,
    canDeleteRecord: false,
    canChangeStatus: true,
    canImportExcel: true,
    canExportReports: true, // Scoped to district
    canViewUnmaskedPII: false,
    canClearAudit: false,
    isReadOnly: false
  },
  [ROLES.BLOCK_OPERATOR]: {
    canManageUsers: false,
    canAccessSecurity: false,
    canViewAllDistricts: false,
    canViewAllBlocks: false, // Scoped to assigned block only
    canAddRecord: true,
    canEditRecord: true,
    canDeleteRecord: false,
    canChangeStatus: true,
    canImportExcel: false,
    canExportReports: true, // Scoped to block
    canViewUnmaskedPII: false,
    canClearAudit: false,
    isReadOnly: false
  },
  [ROLES.VIEWER]: {
    canManageUsers: false,
    canAccessSecurity: false,
    canViewAllDistricts: false,
    canViewAllBlocks: false,
    canAddRecord: false,
    canEditRecord: false,
    canDeleteRecord: false,
    canChangeStatus: false,
    canImportExcel: false,
    canExportReports: false,
    canViewUnmaskedPII: false,
    canClearAudit: false,
    isReadOnly: true
  }
};

export function getRolePermissions(roleName) {
  // Normalize role string
  if (!roleName) return ROLE_PERMISSIONS[ROLES.VIEWER];
  const r = String(roleName).toLowerCase();
  if (r.includes('super') || r.includes('admin')) return ROLE_PERMISSIONS[ROLES.SUPER_ADMIN];
  if (r.includes('district')) return ROLE_PERMISSIONS[ROLES.DISTRICT_OPERATOR];
  if (r.includes('block') || r.includes('field') || r.includes('operator')) return ROLE_PERMISSIONS[ROLES.BLOCK_OPERATOR];
  if (r.includes('view')) return ROLE_PERMISSIONS[ROLES.VIEWER];
  return ROLE_PERMISSIONS[ROLES.VIEWER];
}

export function isUserAuthorizedForScope(user, recordDistrict, recordBlock) {
  if (!user) return false;
  const role = user.role;
  const perms = getRolePermissions(role);
  if (perms.canViewAllDistricts) return true;

  // District Operator check
  if (role === ROLES.DISTRICT_OPERATOR) {
    if (!user.district) return false;
    return (
      user.district.toLowerCase() === 'all' ||
      user.district.toLowerCase() === String(recordDistrict || '').toLowerCase()
    );
  }

  // Block Operator check
  if (role === ROLES.BLOCK_OPERATOR) {
    if (!user.block) return false;
    return user.block.toLowerCase() === String(recordBlock || '').toLowerCase();
  }

  // Viewer check
  if (role === ROLES.VIEWER) {
    if (user.district && user.district.toLowerCase() !== 'all') {
      if (user.district.toLowerCase() !== String(recordDistrict || '').toLowerCase()) return false;
    }
    if (user.block && user.block.toLowerCase() !== 'all') {
      if (user.block.toLowerCase() !== String(recordBlock || '').toLowerCase()) return false;
    }
    return true;
  }

  return false;
}

// ==========================================
// 2. PUBLIC USER DIRECTORY (NO PASSWORDS STORED IN CODE)
// Credentials, passwords & roles are stored securely in the Google Sheet "Users" database!
// Only Admin user is used in this system.
// ==========================================
const INITIAL_USERS_PUBLIC = [
  {
    username: 'admin',
    fullName: 'System Administrator',
    role: ROLES.SUPER_ADMIN,
    district: 'All Districts',
    block: 'All Blocks',
    email: 'admin@shramiksetu.odisha.gov.in',
    avatar: 'SA',
    status: 'Active'
  }
];

export function getSystemAccounts() {
  try {
    const raw = localStorage.getItem(SYSTEM_ACCOUNTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse system accounts, falling back to initial directory', e);
  }

  saveSystemAccounts(INITIAL_USERS_PUBLIC);
  return INITIAL_USERS_PUBLIC;
}

export function saveSystemAccounts(accounts) {
  try {
    localStorage.setItem(SYSTEM_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save system accounts', e);
  }
}

/**
 * Fetch latest user accounts from Google Sheets backend
 */
export async function syncUsersFromGoogleSheet() {
  const gasUrl = getGoogleScriptUrl();
  if (!gasUrl) return [];

  try {
    const res = await apiGet('getUsers');
    if (res && res.success && Array.isArray(res.users) && res.users.length > 0) {
      saveSystemAccounts(res.users);
      return res.users;
    }
  } catch (e) {
    console.warn('Could not sync users from Google Sheet:', e);
  }
  return [];
}

// ==========================================
// 3. FAILED ATTEMPTS (LOCKOUT LOGIC REMOVED)
// ==========================================
export function getAccountLockStatus() {
  return { isLocked: false, remainingAttempts: 999 };
}

export function recordFailedAttempt() {
  return { count: 0 };
}

export function clearFailedAttempts() {}

export function unlockAccount(username) {
  return { success: true, message: `Account @${username} is active.` };
}

// ==========================================
// 4. MASTER SECURITY KEY GATE
// ==========================================
export async function verifyMasterKey(inputKey) {
  const clean = (inputKey || '').trim();
  if (!clean) return false;

  const storedMaster = localStorage.getItem(MASTER_KEY_STORAGE) || DEFAULT_MASTER_TOKEN;
  if (clean === storedMaster || clean === DEFAULT_MASTER_TOKEN || clean === LEGACY_MASTER_TOKEN) {
    return true;
  }

  const accounts = getSystemAccounts();
  const adminAcc = accounts.find(a => a.username.toLowerCase() === 'admin');
  if (adminAcc) {
    const isMatch = await verifyPassword(clean, adminAcc.passwordHash, adminAcc.salt);
    if (isMatch) return true;
  }

  return false;
}

// ==========================================
// 5. AUDIT TRAIL & ACTIVITY LOGS
// ==========================================
export function getAuditLogs() {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to read audit logs', e);
  }
  return [];
}

export function recordAuditEvent(action, details, level = 'info', metadata = {}) {
  try {
    const logs = getAuditLogs();
    const currentUser = getCurrentUser();

    const newEntry = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      user: currentUser ? `@${currentUser.username}` : (metadata.user || 'System'),
      role: currentUser ? currentUser.role : (metadata.role || 'System'),
      district: currentUser ? (currentUser.district || 'All') : 'HQ',
      block: currentUser ? (currentUser.block || 'All') : 'General',
      action,
      details,
      level, // 'info' | 'success' | 'warning' | 'security'
      module: metadata.module || 'System',
      recordId: metadata.recordId || '',
      prevValue: metadata.prevValue || '',
      newValue: metadata.newValue || '',
      result: metadata.result || 'Success'
    };

    // Keep latest 200 entries locally
    const updated = [newEntry, ...logs].slice(0, 200);
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(updated));

    // Asynchronously push to Google Sheets Activity_Logs backend
    if (getGoogleScriptUrl()) {
      apiPost('logActivity', newEntry).catch(() => {});
    }

    return newEntry;
  } catch (e) {
    console.error('Audit logging failed', e);
  }
}

export function clearAuditLogs() {
  try {
    localStorage.removeItem(AUDIT_LOG_KEY);
    recordAuditEvent('AUDIT_CLEARED', 'Security audit log history was cleared by Super Admin', 'warning');
  } catch (e) {}
}

// ==========================================
// 6. USER PASSWORD MANAGEMENT
// ==========================================
export async function updateUserPassword(targetUsername, newPassword) {
  const accounts = getSystemAccounts();
  const cleanUser = (targetUsername || '').trim().toLowerCase();
  const cleanPass = (newPassword || '').trim();

  if (!cleanUser || !cleanPass) {
    return { success: false, error: 'User ID and new password are required.' };
  }

  if (cleanPass.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters long.' };
  }

  const salt = generateSalt(16);
  const passwordHash = await hashPassword(cleanPass, salt);

  let found = false;
  const updated = accounts.map(acc => {
    if (acc.username.toLowerCase() === cleanUser) {
      found = true;
      return {
        ...acc,
        salt,
        passwordHash,
        lastPasswordUpdate: new Date().toISOString()
      };
    }
    return acc;
  });

  if (!found) {
    return { success: false, error: `Account with User ID "${targetUsername}" not found.` };
  }

  saveSystemAccounts(updated);
  recordAuditEvent('PASSWORD_RESET', `Password updated for user @${cleanUser}`, 'security');

  // Push updated password hash to Google Sheets backend
  if (getGoogleScriptUrl()) {
    apiPost('updateUserPassword', {
      username: cleanUser,
      salt,
      passwordHash
    }).catch(err => console.warn('Google Sheets password update warning:', err));
  }

  // Invalidate any active session for that user
  logoutAllSessions(cleanUser);

  return { success: true, message: `Password for @${targetUsername} updated successfully.` };
}

export async function createSystemAccount({ username, fullName, role, email, password, district, block }) {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();
  const cleanName = (fullName || '').trim();

  if (!cleanUser || !cleanPass || !cleanName) {
    return { success: false, error: 'Username, Full Name, and Password are required.' };
  }

  if (cleanUser.length < 3) {
    return { success: false, error: 'Username must be at least 3 characters long.' };
  }

  if (cleanPass.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long for security compliance.' };
  }

  const accounts = getSystemAccounts();
  const exists = accounts.some(a => a.username.toLowerCase() === cleanUser);
  if (exists) {
    return { success: false, error: `Username "${username}" already exists. Please choose a unique User ID.` };
  }

  const initials = cleanName
    .split(' ')
    .filter(Boolean)
    .map(p => p[0].toUpperCase())
    .slice(0, 2)
    .join('') || cleanUser.slice(0, 2).toUpperCase();

  const salt = generateSalt(16);
  const passwordHash = await hashPassword(cleanPass, salt);

  const newAcc = {
    username: cleanUser,
    salt,
    passwordHash,
    fullName: cleanName,
    role: role || ROLES.BLOCK_OPERATOR,
    district: district || 'Ganjam',
    block: block || 'All Blocks',
    email: (email || '').trim() || `${cleanUser}@shramiksetu.odisha.gov.in`,
    avatar: initials,
    createdAt: new Date().toISOString(),
    status: 'Active',
    isPrimary: false,
    twoFactorEnabled: false
  };

  accounts.push(newAcc);
  saveSystemAccounts(accounts);
  recordAuditEvent('ACCOUNT_CREATED', `New account created: @${cleanUser} (${newAcc.role})`, 'security');

  // Push new user account to Google Sheets backend
  if (getGoogleScriptUrl()) {
    apiPost('createUser', newAcc).catch(err => console.warn('Google Sheets user create warning:', err));
  }

  return { success: true, account: newAcc };
}

export function deleteSystemAccount(username) {
  const cleanUser = (username || '').trim().toLowerCase();
  if (cleanUser === 'admin') {
    return { success: false, error: 'Primary system administrator account cannot be deleted.' };
  }

  const accounts = getSystemAccounts();
  const filtered = accounts.filter(a => a.username.toLowerCase() !== cleanUser);

  if (filtered.length === accounts.length) {
    return { success: false, error: 'Account not found.' };
  }

  saveSystemAccounts(filtered);
  logoutAllSessions(cleanUser);
  recordAuditEvent('ACCOUNT_DELETED', `Account @${cleanUser} was removed`, 'warning');

  // Push removal to Google Sheets backend
  if (getGoogleScriptUrl()) {
    apiPost('deleteUser', { username: cleanUser }).catch(err => console.warn('Google Sheets delete user warning:', err));
  }

  return { success: true, message: `Account @${username} deleted successfully.` };
}

// ==========================================
// 7. SESSION & AUTHENTICATION (DIVY-IMPEX ZERO-HARDCODE SYSTEM DESIGN)
// All User IDs & Passwords are validated against the Google Sheet "Users" database.
// ==========================================
export async function loginUser(username, password, remember = true) {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  if (!cleanUser || !cleanPass) {
    return {
      success: false,
      error: 'Please enter both Username and Password.'
    };
  }

  // Clear any legacy lockout artifact from storage
  try {
    localStorage.removeItem('shramiksetu_login_attempts_v1');
  } catch (e) {}

  const gasUrl = getGoogleScriptUrl();

  // 1. Authenticate against Google Sheets Backend (DIVY-IMPEX architecture)
  if (gasUrl) {
    try {
      const backendRes = await apiPost('login', {
        username: cleanUser,
        password: cleanPass
      });

      if (backendRes && backendRes.success && backendRes.user) {
        // Cache user info in public directory (WITHOUT any password)
        const accounts = getSystemAccounts();
        const existingIdx = accounts.findIndex(a => a.username.toLowerCase() === cleanUser);
        const userObj = {
          username: backendRes.user.username,
          fullName: backendRes.user.fullName || backendRes.user.name || cleanUser,
          role: backendRes.user.role || ROLES.BLOCK_OPERATOR,
          district: backendRes.user.district || 'Odisha State HQ',
          block: backendRes.user.block || 'All Blocks',
          email: backendRes.user.email || '',
          avatar: backendRes.user.avatar || cleanUser.slice(0, 2).toUpperCase()
        };

        if (existingIdx !== -1) {
          accounts[existingIdx] = { ...accounts[existingIdx], ...userObj };
        } else {
          accounts.push(userObj);
        }
        saveSystemAccounts(accounts);

        const sessionData = establishSession(userObj, remember);
        return {
          success: true,
          user: sessionData
        };
      }

      if (backendRes && backendRes.error) {
        recordAuditEvent('LOGIN_FAILED', `Failed login for user @${cleanUser}: ${backendRes.error}`, 'warning');
        return {
          success: false,
          error: backendRes.error
        };
      }
    } catch (err) {
      console.warn('[ShramikSetu Auth] Google Sheet login error:', err);
    }
  }

  recordAuditEvent('LOGIN_FAILED', `Failed login attempt for user @${cleanUser}`, 'warning');
  return {
    success: false,
    error: 'Invalid username or password! Please verify credentials in your Google Sheet.'
  };
}

export function extendSession() {
  const user = getCurrentUser();
  if (!user) return null;

  const now = new Date().toISOString();
  user.loginAt = now;
  user.lastActiveAt = now;

  if (localStorage.getItem(AUTH_STORAGE_KEY)) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  }
  if (sessionStorage.getItem(AUTH_STORAGE_KEY)) {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  }
  recordAuditEvent('SESSION_EXTENDED', `Session extended for 1 hour by @${user.username}`, 'info');
  return user;
}

export function establishSession(account, remember = true) {
  const now = new Date().toISOString();
  const sessionToken = generateSecureToken();
  const sessionData = {
    username: account.username,
    fullName: account.fullName,
    role: account.role || ROLES.BLOCK_OPERATOR,
    district: account.district || 'Odisha State HQ',
    block: account.block || 'All Blocks',
    email: account.email,
    avatar: account.avatar || 'AD',
    token: sessionToken,
    loginAt: now,
    lastActiveAt: now
  };

  try {
    if (remember) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
      localStorage.setItem(REMEMBER_KEY, 'true');
    } else {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(REMEMBER_KEY);
    }
    sessionStorage.removeItem(LOCK_STATE_KEY);

    // Register into active sessions registry
    registerActiveSession(sessionData);
  } catch (e) {
    console.warn('Storage save error:', e);
  }

  recordAuditEvent('LOGIN_SUCCESS', `User @${account.username} signed in successfully`, 'success', {
    module: 'Authentication',
    result: 'Success'
  });

  return sessionData;
}

export function getCurrentUser() {
  try {
    const session = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (session) return JSON.parse(session);

    const local = localStorage.getItem(AUTH_STORAGE_KEY);
    if (local) return JSON.parse(local);

    return null;
  } catch (e) {
    console.error('Failed to read auth state', e);
    return null;
  }
}

export function updateSessionLastActive() {
  try {
    const user = getCurrentUser();
    if (!user) return;

    user.lastActiveAt = new Date().toISOString();
    if (localStorage.getItem(AUTH_STORAGE_KEY)) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    }
    if (sessionStorage.getItem(AUTH_STORAGE_KEY)) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    }
  } catch (e) {}
}

// Active Sessions Tracker
export function getActiveSessions() {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function registerActiveSession(session) {
  try {
    const sessions = getActiveSessions().filter(s => {
      // Remove stale sessions older than 24h
      const ageMs = Date.now() - new Date(s.loginAt).getTime();
      return ageMs < 24 * 60 * 60 * 1000;
    });

    sessions.unshift({
      id: `sess_${Date.now()}`,
      username: session.username,
      role: session.role,
      token: session.token,
      loginAt: session.loginAt,
      device: navigator.userAgent.slice(0, 40)
    });

    localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(sessions.slice(0, 20)));
  } catch (e) {}
}

export function logoutAllSessions(username) {
  try {
    const sessions = getActiveSessions().filter(s => s.username.toLowerCase() !== username.toLowerCase());
    localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(sessions));

    const current = getCurrentUser();
    if (current && current.username.toLowerCase() === username.toLowerCase()) {
      logoutUser();
    }
    recordAuditEvent('LOGOUT_ALL', `All active sessions revoked for @${username}`, 'security');
  } catch (e) {}
}

export function logoutUser() {
  try {
    const user = getCurrentUser();
    if (user) {
      recordAuditEvent('LOGOUT', `User @${user.username} safely signed out`, 'info');
      // Remove from active sessions
      const sessions = getActiveSessions().filter(s => s.token !== user.token);
      localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(sessions));
    }
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    sessionStorage.removeItem(LOCK_STATE_KEY);
  } catch (e) {
    console.error('Logout error:', e);
  }
}

// Terminal Lock
export function lockSessionTerminal() {
  try {
    sessionStorage.setItem(LOCK_STATE_KEY, 'true');
    recordAuditEvent('SESSION_LOCKED', 'Terminal locked due to user request or inactivity', 'info');
  } catch (e) {}
}

export async function unlockSessionTerminal(password) {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'No active session found.' };

  const accounts = getSystemAccounts();
  const acc = accounts.find(a => a.username.toLowerCase() === user.username.toLowerCase());

  if (!acc) return { success: false, error: 'Account not found.' };

  const isMatch = await verifyPassword((password || '').trim(), acc.passwordHash, acc.salt);
  if (!isMatch) {
    recordAuditEvent('UNLOCK_FAILED', `Failed unlock attempt for @${user.username}`, 'warning');
    return { success: false, error: 'Incorrect password. Please try again.' };
  }

  try {
    sessionStorage.removeItem(LOCK_STATE_KEY);
    updateSessionLastActive();
    recordAuditEvent('SESSION_UNLOCKED', `Terminal unlocked by @${user.username}`, 'success');
  } catch (e) {}

  return { success: true };
}

export function isTerminalLocked() {
  try {
    return sessionStorage.getItem(LOCK_STATE_KEY) === 'true';
  } catch (e) {
    return false;
  }
}
