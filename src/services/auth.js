// Authentication, Session Tracking & Security Service for ShramikSetu

const AUTH_STORAGE_KEY = 'shramiksetu_auth_user';
const REMEMBER_KEY = 'shramiksetu_remember_flag';
const SYSTEM_ACCOUNTS_KEY = 'shramiksetu_system_accounts';
const MASTER_KEY_STORAGE = 'shramiksetu_master_key';
const AUDIT_LOG_KEY = 'shramiksetu_audit_logs';
const LOCK_STATE_KEY = 'shramiksetu_session_locked';

// Default Master Key for the Security Gate
export const DEFAULT_MASTER_TOKEN = 'SHRAMIK-SECURE-2026';
export const LEGACY_MASTER_TOKEN = 'DIVY-SECURE-2026';

// Inactivity timeout threshold in minutes (e.g. 20 minutes)
export const INACTIVITY_TIMEOUT_MINUTES = 20;

// Initial Seed Accounts
const INITIAL_ACCOUNTS = [
  {
    username: 'admin',
    password: 'admin123',
    fullName: 'System Administrator',
    role: 'Administrator (Full Access)',
    district: 'Odisha State HQ',
    email: 'admin@shramiksetu.odisha.gov.in',
    avatar: 'AD',
    createdAt: new Date().toISOString(),
    status: 'Active',
    isPrimary: true
  },
  {
    username: 'operator',
    password: 'shramik2026',
    fullName: 'Field Desk Operator',
    role: 'Field Operations & Registration',
    district: 'Digapahandi Block',
    email: 'operator.digapahandi@odisha.gov.in',
    avatar: 'OP',
    createdAt: new Date().toISOString(),
    status: 'Active',
    isPrimary: false
  }
];

// ==========================================
// 1. SYSTEM ACCOUNTS REPOSITORY
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

// ==========================================
// 2. MASTER SECURITY KEY GATE
// ==========================================
export function verifyMasterKey(inputKey) {
  const clean = (inputKey || '').trim();
  if (!clean) return false;

  const storedMaster = localStorage.getItem(MASTER_KEY_STORAGE) || DEFAULT_MASTER_TOKEN;
  if (clean === storedMaster || clean === DEFAULT_MASTER_TOKEN || clean === LEGACY_MASTER_TOKEN) {
    return true;
  }

  const accounts = getSystemAccounts();
  const adminAcc = accounts.find(a => a.username.toLowerCase() === 'admin');
  if (adminAcc && adminAcc.password === clean) {
    return true;
  }

  return false;
}

// ==========================================
// 3. AUDIT TRAIL & SESSION EVENT LOGGING
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

export function recordAuditEvent(action, details, level = 'info') {
  try {
    const logs = getAuditLogs();
    const currentUser = getCurrentUser();
    
    const newEntry = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      user: currentUser ? `@${currentUser.username}` : 'System',
      role: currentUser ? currentUser.role : 'Guest',
      action,
      details,
      level // 'info' | 'success' | 'warning' | 'security'
    };

    // Keep latest 100 entries to avoid localStorage overflow
    const updated = [newEntry, ...logs].slice(0, 100);
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(updated));
    return newEntry;
  } catch (e) {
    console.error('Audit logging failed', e);
  }
}

export function clearAuditLogs() {
  try {
    localStorage.removeItem(AUDIT_LOG_KEY);
    recordAuditEvent('AUDIT_CLEARED', 'Security audit log history was cleared by administrator', 'warning');
  } catch (e) {}
}

// ==========================================
// 4. USER PASSWORD RECOVERY & PROVISIONING
// ==========================================
export function updateUserPassword(targetUsername, newPassword) {
  const accounts = getSystemAccounts();
  const cleanUser = (targetUsername || '').trim().toLowerCase();
  const cleanPass = (newPassword || '').trim();

  if (!cleanUser || !cleanPass) {
    return { success: false, error: 'User ID and new password are required.' };
  }

  let found = false;
  const updated = accounts.map(acc => {
    if (acc.username.toLowerCase() === cleanUser) {
      found = true;
      return {
        ...acc,
        password: cleanPass,
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

  const currentUser = getCurrentUser();
  if (currentUser && currentUser.username.toLowerCase() === cleanUser) {
    currentUser.lastPasswordUpdate = new Date().toISOString();
    try {
      if (localStorage.getItem(AUTH_STORAGE_KEY)) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
      }
      if (sessionStorage.getItem(AUTH_STORAGE_KEY)) {
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
      }
    } catch (e) {}
  }

  return { success: true, message: `Password for @${targetUsername} updated successfully.` };
}

export function createSystemAccount({ username, fullName, role, email, password }) {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();
  const cleanName = (fullName || '').trim();

  if (!cleanUser || !cleanPass || !cleanName) {
    return { success: false, error: 'Username, Full Name, and Password are required.' };
  }

  if (cleanUser.length < 3) {
    return { success: false, error: 'Username must be at least 3 characters long.' };
  }

  if (cleanPass.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters long.' };
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

  const newAcc = {
    username: cleanUser,
    password: cleanPass,
    fullName: cleanName,
    role: role || 'Field Operations Staff',
    district: 'Odisha Operations',
    email: (email || '').trim() || `${cleanUser}@shramiksetu.odisha.gov.in`,
    avatar: initials,
    createdAt: new Date().toISOString(),
    status: 'Active',
    isPrimary: false
  };

  accounts.push(newAcc);
  saveSystemAccounts(accounts);
  recordAuditEvent('ACCOUNT_CREATED', `New account created: @${cleanUser} (${newAcc.role})`, 'security');

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
  recordAuditEvent('ACCOUNT_DELETED', `Account @${cleanUser} was removed`, 'warning');
  return { success: true, message: `Account @${username} deleted successfully.` };
}

// ==========================================
// 5. SESSION AUTHENTICATION & LOGIN
// ==========================================
export function loginUser(username, password, remember = true) {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  const accounts = getSystemAccounts();
  const found = accounts.find(
    u => u.username.toLowerCase() === cleanUser && u.password === cleanPass
  );

  if (!found) {
    recordAuditEvent('LOGIN_FAILED', `Failed login attempt for username: "${username}"`, 'warning');
    return {
      success: false,
      error: 'Invalid Username or Security Password. Please check credentials or use the Security Portal.'
    };
  }

  const now = new Date().toISOString();
  const sessionData = {
    username: found.username,
    fullName: found.fullName,
    role: found.role,
    district: found.district || 'Odisha State',
    email: found.email,
    avatar: found.avatar || 'AD',
    token: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
    // Remove any leftover lock state
    sessionStorage.removeItem(LOCK_STATE_KEY);
  } catch (e) {
    console.warn('Storage save error:', e);
  }

  recordAuditEvent('LOGIN_SUCCESS', `User @${found.username} signed in successfully`, 'success');

  return {
    success: true,
    user: sessionData
  };
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

// ==========================================
// 6. TERMINAL LOCK & INACTIVITY CONTROL
// ==========================================
export function lockSessionTerminal() {
  try {
    sessionStorage.setItem(LOCK_STATE_KEY, 'true');
    recordAuditEvent('SESSION_LOCKED', 'Terminal locked due to user request or inactivity', 'info');
  } catch (e) {}
}

export function unlockSessionTerminal(password) {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'No active session found.' };

  const accounts = getSystemAccounts();
  const acc = accounts.find(a => a.username.toLowerCase() === user.username.toLowerCase());

  if (!acc || acc.password !== (password || '').trim()) {
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

export function logoutUser() {
  try {
    const user = getCurrentUser();
    if (user) {
      recordAuditEvent('LOGOUT', `User @${user.username} safely signed out`, 'info');
    }
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    sessionStorage.removeItem(LOCK_STATE_KEY);
  } catch (e) {
    console.error('Logout error:', e);
  }
}
