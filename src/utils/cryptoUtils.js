/**
 * ShramikSetu Cryptographic & Data Protection Utilities
 * Provides browser-native Web Crypto API operations, PII masking, and CSV/Formula injection shields.
 */

// 1. GENERATE CRYPTOGRAPHIC SALT
export function generateSalt(length = 16) {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// 2. SECURE PASSWORD HASH (SHA-256 with Salt)
export async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '::shramik_salt::' + salt);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 3. SYNCHRONOUS FALLBACK HASH FOR SEED/OFFLINE VERIFICATION
export function fastHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// 4. VERIFY PASSWORD
export async function verifyPassword(inputPassword, storedHash, storedSalt) {
  if (!storedSalt) {
    // Legacy migration: if stored without salt
    return inputPassword === storedHash;
  }
  const computedHash = await hashPassword(inputPassword, storedSalt);
  return computedHash === storedHash;
}

// 5. GENERATE CRYPTO-SECURE SESSION TOKEN
export function generateSecureToken() {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// 6. PII MASKING: AADHAAR NUMBER (XXXX-XXXX-1234)
export function maskAadhaar(aadhaar) {
  if (!aadhaar) return '-';
  const clean = String(aadhaar).replace(/\D/g, '');
  if (clean.length < 4) return 'XXXX-XXXX-XXXX';
  const last4 = clean.slice(-4);
  return `XXXX-XXXX-${last4}`;
}

// 7. PII MASKING: MOBILE NUMBER (XXXXXX7890)
export function maskPhone(phone) {
  if (!phone) return '-';
  const clean = String(phone).replace(/\D/g, '');
  if (clean.length < 4) return 'XXXXXX';
  const last4 = clean.slice(-4);
  return `XXXXXX${last4}`;
}

// 8. SPREADSHEET FORMULA INJECTION SANITIZER
// Neutralizes dangerous formula injection characters (=, +, -, @, \t, \r)
export function sanitizeSpreadsheetValue(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=\+\-\@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

// 9. SIMPLE 2FA TOTP/TOKEN GENERATOR & VALIDATOR (Time-step OTP)
export function generate2FASecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  const randomValues = new Uint8Array(16);
  window.crypto.getRandomValues(randomValues);
  for (let i = 0; i < 16; i++) {
    secret += chars[randomValues[i] % chars.length];
  }
  return secret;
}

export function generate2FACode(secret, timestamp = Date.now()) {
  const timeStep = Math.floor(timestamp / 30000); // 30 second step
  const str = `${secret}::${timeStep}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const code = (Math.abs(hash) % 1000000).toString().padStart(6, '0');
  return code;
}

export function verify2FACode(secret, code) {
  const clean = String(code).trim();
  if (clean.length !== 6) return false;
  const now = Date.now();
  // Allow ±30 seconds clock drift
  return (
    generate2FACode(secret, now) === clean ||
    generate2FACode(secret, now - 30000) === clean ||
    generate2FACode(secret, now + 30000) === clean
  );
}
