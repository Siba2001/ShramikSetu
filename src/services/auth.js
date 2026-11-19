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
const LOGIN_ATTEMPTS_KEY = 'shramiksetu_login_attempts_v1';
const ACTIVE_SESSIONS_KEY = 'shramiksetu_active_sessions_v1';

// Default Master Key for the Security Gate
export const DEFAULT_MASTER_TOKEN = 'SHRAMIK-SECURE-2026';
export const LEGACY_MASTER_TOKEN = 'DIVY-SECURE-2026';

// Inactivity timeout threshold: Exactly 15 minutes as per security specification
export const INACTIVITY_TIMEOUT_MINUTES = 15;
export const INACTIVITY_WARNING_SECONDS = 120; // 2 minutes warning before logout

// Maximum consecutive failed login attempts before temporary lockout
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

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

// Initial Seed Accounts with Salt & Precomputed SHA-256 Hashes
// (Default admin123 and shramik2026 are securely salted)
const INITIAL_ACCOUNTS = [
  {
    username: 'admin',
    salt: 'a1b2c3d4e5f60718',
    passwordHash: '89a4ffce63cbdd1d46b3341ea22bf3954a2db65c5d012423fe5efdf425339f40', // Salted SHA-256 of "admin123"
    legacyPassword: '', // Never stored plain
    fullName: 'System Administrator',
    role: ROLES.SUPER_ADMIN,
    district: 'Odisha State HQ',
    block: 'All Blocks',
    email: 'admin@shramiksetu.odisha.gov.in',
    avatar: 'SA',
    createdAt: new Date().toISOString(),
    status: 'Active',
    isPrimary: true,
    twoFactorEnabled: false
  },
  {
    username: 'dist_ganjam',
    salt: 'b2c3d4e5f6a10729',
    passwordHash: '8b7d90d81c3e34bca8350b2aa9a0c102be8373b88939c1d1a6e7c7e96b52a10e', // Salted SHA-256 of "district123"
    legacyPassword: '',
    fullName: 'Ganjam District Operator',
    role: ROLES.DISTRICT_OPERATOR,
    district: 'Ganjam',
    block: 'All Blocks (Ganjam)',
    email: 'operator.ganjam@odisha.gov.in',
    avatar: 'DG',
    createdAt: new Date().toISOString(),
    status: 'Active',
    isPrimary: false,
    twoFactorEnabled: false
  },
  {
    username: 'operator',
    salt: 'c3d4e5f6a1b20830',
    passwordHash: '0c6204c382dbfc31f99e38df72e2cf5e14d18721c5dc328a9b7cf395bc58e65e', // Salted SHA-256 of "shramik2026"
    legacyPassword: '',
    fullName: 'Digapahandi Block Operator',
    role: ROLES.BLOCK_OPERATOR,
    district: 'Ganjam',
    block: 'Digapahandi',
    email: 'operator.digapahandi@odisha.gov.in',
    avatar: 'OP',
    createdAt: new Date().toISOString(),
    status: 'Active',
    isPrimary: false,
    twoFactorEnabled: false
  },
  {
    username: 'viewer',
    salt: 'd4e5f6a1b2c30941',
    passwordHash: '1c7b80a4df76ec8c751c1103f5ad634aaec0bc570d8a571f544655519db8b14e', // Salted SHA-256 of "viewer123"
    legacyPassword: '',
    fullName: 'Public Auditing Viewer',
    role: ROLES.VIEWER,
    district: 'Ganjam',
    block: 'All Blocks',
    email: 'auditor@shramiksetu.odisha.gov.in',
    avatar: 'VW',
    createdAt: new Date().toISOString(),
    status: 'Active',
    isPrimary: false,
    twoFactorEnabled: false
  }
];

// ==========================================
// 2. SYSTEM ACCOUNTS REPOSITORY
// ==========================================
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
    console.warn('Failed to parse system accounts, falling back to initial', e);
  }

  saveSystemAccounts(INITIAL_ACCOUNTS);
  return INITIAL_ACCOUNTS;
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
// 3. BRUTE-FORCE DEFENSE & LOCKOUT TRACKER
// ==========================================
export function getFailedLoginAttempts() {
  try {
    const raw = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveFailedLoginAttempts(attempts) {
  try {
    localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(attempts));
  } catch (e) {}
}

export function getAccountLockStatus(username) {
  const clean = (username || '').trim().toLowerCase();
  const attempts = getFailedLoginAttempts();
  const entry = attempts[clean];

  if (!entry) return { isLocked: false, remainingAttempts: MAX_LOGIN_ATTEMPTS };

  if (entry.lockedUntil) {
    const lockTime = new Date(entry.lockedUntil).getTime();
    const now = Date.now();
    if (now < lockTime) {
      const remainingSeconds = Math.ceil((lockTime - now) / 1000);
      return {
        isLocked: true,
        lockedUntil: entry.lockedUntil,
        remainingSeconds,
        remainingMinutes: Math.ceil(remainingSeconds / 60)
      };
    } else {
      // Lock expired, reset
      delete attempts[clean];
      saveFailedLoginAttempts(attempts);
      return { isLocked: false, remainingAttempts: MAX_LOGIN_ATTEMPTS };
    }
  }

  const count = entry.count || 0;
  return {
    isLocked: false,
    count,
    remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - count)
  };
}

export function recordFailedAttempt(username) {
  const clean = (username || '').trim().toLowerCase();
  const attempts = getFailedLoginAttempts();
  const current = attempts[clean] || { count: 0 };
  current.count = (current.count || 0) + 1;
  current.lastAttempt = new Date().toISOString();

  if (current.count >= MAX_LOGIN_ATTEMPTS) {
    current.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
    recordAuditEvent(
      'ACCOUNT_LOCKED',
      `Account @${clean} locked for 15 minutes due to ${current.count} consecutive failed login attempts.`,
      'security'
    );
  }

  attempts[clean] = current;
  saveFailedLoginAttempts(attempts);
  return current;
}

export function clearFailedAttempts(username) {
  const clean = (username || '').trim().toLowerCase();
  const attempts = getFailedLoginAttempts();
  if (attempts[clean]) {
    delete attempts[clean];
    saveFailedLoginAttempts(attempts);
  }
}

export function unlockAccount(username) {
  clearFailedAttempts(username);
  recordAuditEvent('ACCOUNT_UNLOCKED', `Account @${username} was manually unlocked by administrator`, 'security');
  return { success: true, message: `Account @${username} unlocked successfully.` };
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
    block: block || 'Digapahandi',
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
// 7. SESSION & AUTHENTICATION
// ==========================================
export async function loginUser(username, password, remember = true) {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  // 1. Check Account Lockout
  const lockStatus = getAccountLockStatus(cleanUser);
  if (lockStatus.isLocked) {
    return {
      success: false,
      isLocked: true,
      error: `Account is temporarily locked due to repeated failed logins. Please try again in ${lockStatus.remainingMinutes} minute(s) or contact Super Admin.`
    };
  }

  const accounts = getSystemAccounts();
  const found = accounts.find(u => u.username.toLowerCase() === cleanUser);

  if (!found) {
    recordFailedAttempt(cleanUser);
    return {
      success: false,
      error: 'Invalid Username or Password. Please check credentials.'
    };
  }

  // 2. Verify Password (with Salted Hash or Google Apps Script Backend verification)
  let passwordMatches = false;
  const gasUrl = getGoogleScriptUrl();

  if (found.passwordHash && found.salt) {
    const inputHash = await hashPassword(cleanPass, found.salt);

    // If Google Apps Script Backend is configured, authenticate via Google Sheets backend
    if (gasUrl) {
      try {
        const backendRes = await apiPost('login', {
          username: cleanUser,
          passwordHash: inputHash
        });

        if (backendRes && backendRes.success) {
          passwordMatches = true;
          if (backendRes.user) {
            Object.assign(found, backendRes.user);
          }
        } else if (backendRes && backendRes.error) {
          passwordMatches = false;
        } else {
          // Fallback to local verified hash if network warning
          passwordMatches = (inputHash === found.passwordHash);
        }
      } catch (err) {
        passwordMatches = (inputHash === found.passwordHash);
      }
    } else {
      passwordMatches = (inputHash === found.passwordHash);
    }
  } else if (found.password) {
    // Legacy account migration: upgrade to salted hash on first successful login
    if (found.password === cleanPass) {
      passwordMatches = true;
      const salt = generateSalt(16);
      found.salt = salt;
      found.passwordHash = await hashPassword(cleanPass, salt);
      delete found.password;
      saveSystemAccounts(accounts);

      if (gasUrl) {
        apiPost('updateUserPassword', { username: cleanUser, salt, passwordHash: found.passwordHash }).catch(() => {});
      }
    }
  }

  if (!passwordMatches) {
    const attempt = recordFailedAttempt(cleanUser);
    const left = MAX_LOGIN_ATTEMPTS - (attempt.count || 0);
    recordAuditEvent('LOGIN_FAILED', `Failed login attempt for user @${cleanUser}`, 'warning');

    if (left <= 0) {
      return {
        success: false,
        isLocked: true,
        error: 'Too many failed login attempts. Your account has been temporarily locked for 15 minutes.'
      };
    }

    return {
      success: false,
      error: `Invalid password. ${left} attempt(s) remaining before temporary lockout.`
    };
  }

  // 3. Clear failed login count on success
  clearFailedAttempts(cleanUser);

  // 4. Two-Factor Authentication Check
  if (found.twoFactorEnabled) {
    const tempToken = `2fa_temp_${Date.now()}_${generateSecureToken()}`;
    sessionStorage.setItem('shramiksetu_2fa_pending', JSON.stringify({
      username: found.username,
      tempToken,
      remember
    }));
    return {
      success: true,
      requires2FA: true,
      tempToken,
      message: 'Please enter your 6-digit authentication code.'
    };
  }

  // 5. Establish Certified Session
  const sessionData = establishSession(found, remember);
  return {
    success: true,
    user: sessionData
  };
}

export function establishSession(account, remember = true) {
  const now = new Date().toISOString();
  const sessionToken = generateSecureToken();
  const sessionData = {
    username: account.username,
    fullName: account.fullName,
    role: account.role || ROLES.BLOCK_OPERATOR,
    district: account.district || 'Ganjam',
    block: account.block || 'Digapahandi',
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
