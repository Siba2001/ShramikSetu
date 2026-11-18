// Authentication & Divy-Impex Security System Service for ShramikSetu

const AUTH_STORAGE_KEY = 'shramiksetu_auth_user';
const REMEMBER_KEY = 'shramiksetu_remember_flag';
const SYSTEM_ACCOUNTS_KEY = 'shramiksetu_system_accounts';
const MASTER_KEY_STORAGE = 'shramiksetu_master_key';

// Default Master Key for the Security Gate
export const DEFAULT_MASTER_TOKEN = 'SHRAMIK-SECURE-2026';
export const LEGACY_MASTER_TOKEN = 'DIVY-SECURE-2026';

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

// Load all managed system accounts
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

  // Seed default
  saveSystemAccounts(INITIAL_ACCOUNTS);
  return INITIAL_ACCOUNTS;
}

// Save system accounts
export function saveSystemAccounts(accounts) {
  try {
    localStorage.setItem(SYSTEM_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save system accounts', e);
  }
}

// Verify Master Security Key / Token
export function verifyMasterKey(inputKey) {
  const clean = (inputKey || '').trim();
  if (!clean) return false;

  // Check stored custom master key or default
  const storedMaster = localStorage.getItem(MASTER_KEY_STORAGE) || DEFAULT_MASTER_TOKEN;
  if (clean === storedMaster || clean === DEFAULT_MASTER_TOKEN || clean === LEGACY_MASTER_TOKEN) {
    return true;
  }

  // Also allow the current Admin's password to unlock the security gate
  const accounts = getSystemAccounts();
  const adminAcc = accounts.find(a => a.username.toLowerCase() === 'admin');
  if (adminAcc && adminAcc.password === clean) {
    return true;
  }

  return false;
}

// Update User Password (Direct Recovery)
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

  // If current logged-in user had their password changed, update session
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

// Create New User ID & Password
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

  return { success: true, account: newAcc };
}

// Delete System Account
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
  return { success: true, message: `Account @${username} deleted successfully.` };
}

// Authenticate user on Login page
export function loginUser(username, password, remember = true) {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  const accounts = getSystemAccounts();
  const found = accounts.find(
    u => u.username.toLowerCase() === cleanUser && u.password === cleanPass
  );

  if (!found) {
    return {
      success: false,
      error: 'Invalid Username or Security Password. Please check credentials or use the Security Portal.'
    };
  }

  const sessionData = {
    username: found.username,
    fullName: found.fullName,
    role: found.role,
    district: found.district || 'Odisha State',
    email: found.email,
    avatar: found.avatar || 'AD',
    token: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    loginAt: new Date().toISOString()
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
  } catch (e) {
    console.warn('Storage save error:', e);
  }

  return {
    success: true,
    user: sessionData
  };
}

// Read active session
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

// Logout
export function logoutUser() {
  try {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(REMEMBER_KEY);
  } catch (e) {
    console.error('Logout error:', e);
  }
}
