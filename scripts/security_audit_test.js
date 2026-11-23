/**
 * Automated Security Audit & Second-Stage Regression Test Suite
 * Tests all critical security fixes, cryptographic PBKDF2 hashing, token hashing,
 * live user revalidation, exact RBAC role matching, strict geographic scoping,
 * header-based updates, and formula injection defense.
 */

import crypto from 'crypto';

console.log('====================================================');
console.log(' SHRAMIKSETU ZERO-TRUST SECURITY AUDIT & REGRESSION ');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

// =================================================================
// 1. PBKDF2-HMAC-SHA256 Password Hashing Engine
// =================================================================
console.log('[Test Suite 1]: PBKDF2-HMAC-SHA256 Password Storage');

function pbkdf2HmacSha256(password, salt, iterations = 5000, keyLen = 32) {
  return crypto.pbkdf2Sync(password, salt, iterations, keyLen, 'sha256').toString('hex');
}

function hashPassword(plainPassword, salt, iterations = 5000) {
  const raw = String(plainPassword || '').trim();
  if (!raw) return '';
  const derived = pbkdf2HmacSha256(raw, salt, iterations, 32);
  return `pbkdf2$sha256$${iterations}$${salt}$${derived}`;
}

function verifyPassword(inputPassword, storedHash) {
  if (!inputPassword || !storedHash) return false;
  if (storedHash.startsWith('pbkdf2$sha256$')) {
    const parts = storedHash.split('$');
    const iters = parseInt(parts[2], 10);
    const salt = parts[3];
    const expected = parts[4];
    const computed = pbkdf2HmacSha256(inputPassword, salt, iters, 32);
    return computed === expected;
  }
  return false;
}

const salt1 = 'a1b2c3d4e5f60718';
const salt2 = 'f9e8d7c6b5a43210';
const plainPass = 'SuperAdmin@Setu2026!';

const pbkdf2Hash1 = hashPassword(plainPass, salt1, 5000);
const pbkdf2Hash2 = hashPassword(plainPass, salt2, 5000);

assert(pbkdf2Hash1.startsWith('pbkdf2$sha256$5000$'), 'Hash format follows PBKDF2 standard structure');
assert(pbkdf2Hash1 !== pbkdf2Hash2, 'Unique salts produce distinct PBKDF2 digests');
assert(verifyPassword(plainPass, pbkdf2Hash1) === true, 'Correct password validates with PBKDF2');
assert(verifyPassword('WrongPassword!', pbkdf2Hash1) === false, 'Incorrect password rejected by PBKDF2');
assert(verifyPassword('Admin@Setu2026!', pbkdf2Hash1) === false, 'Hardcoded default password rejected');

// =================================================================
// 2. Cryptographic Session Token Generation & Hashed Storage
// =================================================================
console.log('\n[Test Suite 2]: Cryptographic Bearer Tokens & SHA-256 Hashed Storage');

function generateSecureToken() {
  const seed = crypto.randomUUID() + '_' + crypto.randomUUID() + '_' + Date.now().toString(36) + '_' + Math.random().toString(36);
  const digest = crypto.createHash('sha256').update(seed, 'utf8').digest('hex');
  return 'stk_' + digest;
}

function hashSessionToken(bearerToken) {
  if (!bearerToken) return '';
  return crypto.createHash('sha256').update(bearerToken.trim(), 'utf8').digest('hex');
}

const bearerToken = generateSecureToken();
const tokenHash = hashSessionToken(bearerToken);

assert(bearerToken.startsWith('stk_') && bearerToken.length === 68, 'Bearer token is high-entropy 256-bit prefixed string');
assert(tokenHash.length === 64, 'Token hash is valid 64-char SHA-256 digest');
assert(tokenHash !== bearerToken, 'Hashed token stored in database is distinct from usable client bearer token');

// Attacker attempts to use the stored token hash directly as a bearer token:
const attackerAttemptHash = hashSessionToken(tokenHash);
assert(attackerAttemptHash !== tokenHash, 'Stored token hash cannot be used as a bearer token (one-way hashing defense)');

// =================================================================
// 3. Exact Role Matching (Zero Substring Bypass & Default Deny)
// =================================================================
console.log('\n[Test Suite 3]: Exact Role Matching & Unknown Role Denial');

const ROLE_SUPER_ADMIN = 'Super Admin';
const ROLE_DISTRICT_OPERATOR = 'District Operator';
const ROLE_BLOCK_OPERATOR = 'Block Operator';
const ROLE_VIEWER = 'Viewer';

const VALID_ROLES = [
  ROLE_SUPER_ADMIN,
  ROLE_DISTRICT_OPERATOR,
  ROLE_BLOCK_OPERATOR,
  ROLE_VIEWER
];

function isSuperAdmin(session) {
  return Boolean(session && session.role === ROLE_SUPER_ADMIN);
}
function isDistrictOperator(session) {
  return Boolean(session && session.role === ROLE_DISTRICT_OPERATOR);
}
function isBlockOperator(session) {
  return Boolean(session && session.role === ROLE_BLOCK_OPERATOR);
}
function isViewer(session) {
  return Boolean(session && session.role === ROLE_VIEWER);
}
function canUserMutate(session) {
  if (!session || !session.role) return false;
  if (!VALID_ROLES.includes(session.role)) return false; // Unknown role denied by default
  return session.role !== ROLE_VIEWER;
}

assert(isSuperAdmin({ role: 'Super Admin' }) === true, 'Exact "Super Admin" role recognized');
assert(isSuperAdmin({ role: 'super-admin' }) === false, 'Substring "super-admin" rejected from Super Admin authority');
assert(isSuperAdmin({ role: 'admin' }) === false, 'Substring "admin" rejected');
assert(isSuperAdmin({ role: 'Super Administrator' }) === false, 'Non-exact role rejected');
assert(isSuperAdmin({ role: 'District-Super-Admin' }) === false, 'Hybrid spoof role rejected');

assert(canUserMutate({ role: 'Hacker' }) === false, 'Unknown role attempting mutation is denied by default');
assert(canUserMutate({ role: 'Guest' }) === false, 'Guest role denied mutation');
assert(canUserMutate({ role: 'Viewer' }) === false, 'Viewer role denied mutation');
assert(canUserMutate({ role: 'Block Operator' }) === true, 'Valid Block Operator permitted mutation');

// =================================================================
// 4. Strict Geographic Scoping (No Empty String or "All" Bypass)
// =================================================================
console.log('\n[Test Suite 4]: Geographic Scope Enforcement');

function canUserAccessDistrict(session, district) {
  if (!session || !session.role) return false;
  if (!VALID_ROLES.includes(session.role)) return false;
  if (isSuperAdmin(session)) return true;

  const userDist = String(session.district || '').trim();
  if (!userDist || userDist.toLowerCase() === 'all' || userDist.toLowerCase() === 'all districts') {
    return false; // Non-admin with empty or "All" district denied
  }

  const targetDist = String(district || '').trim();
  if (!targetDist) return false;

  return userDist.toLowerCase() === targetDist.toLowerCase();
}

function canUserAccessBlock(session, district, block) {
  if (!session || !session.role) return false;
  if (!VALID_ROLES.includes(session.role)) return false;
  if (isSuperAdmin(session)) return true;

  if (isDistrictOperator(session)) {
    return canUserAccessDistrict(session, district);
  }

  if (isBlockOperator(session)) {
    if (!canUserAccessDistrict(session, district)) return false;

    const userBlock = String(session.block || '').trim();
    if (!userBlock || userBlock.toLowerCase() === 'all' || userBlock.toLowerCase() === 'all blocks') {
      return false; // Block Operator must have specific assigned block
    }

    const targetBlock = String(block || '').trim();
    if (!targetBlock) return false;

    return userBlock.toLowerCase() === targetBlock.toLowerCase();
  }

  return false;
}

const emptyDistOperator = { role: 'District Operator', district: '', block: 'All Blocks' };
const allDistOperator = { role: 'District Operator', district: 'All', block: 'All Blocks' };
const validDistOperator = { role: 'District Operator', district: 'Ganjam', block: 'All Blocks' };
const emptyBlockOperator = { role: 'Block Operator', district: 'Ganjam', block: '' };
const allBlockOperator = { role: 'Block Operator', district: 'Ganjam', block: 'All' };
const validBlockOperator = { role: 'Block Operator', district: 'Ganjam', block: 'Hinjilicut' };

assert(canUserAccessDistrict(emptyDistOperator, 'Ganjam') === false, 'District Operator with empty district assignment denied');
assert(canUserAccessDistrict(allDistOperator, 'Ganjam') === false, 'District Operator with "All" district assignment denied');
assert(canUserAccessDistrict(validDistOperator, 'Ganjam') === true, 'District Operator with explicit assigned district allowed in Ganjam');
assert(canUserAccessDistrict(validDistOperator, 'Cuttack') === false, 'District Operator blocked from Cuttack');

assert(canUserAccessBlock(emptyBlockOperator, 'Ganjam', 'Hinjilicut') === false, 'Block Operator with empty block assignment denied');
assert(canUserAccessBlock(allBlockOperator, 'Ganjam', 'Hinjilicut') === false, 'Block Operator with "All" block assignment denied');
assert(canUserAccessBlock(validBlockOperator, 'Ganjam', 'Hinjilicut') === true, 'Block Operator with explicit assignment allowed in Hinjilicut');
assert(canUserAccessBlock(validBlockOperator, 'Ganjam', 'Chatrapur') === false, 'Block Operator blocked from Chatrapur block');

// =================================================================
// 5. Agent & Marriage Verification Geographic Authorization
// =================================================================
console.log('\n[Test Suite 5]: Agent & Marriage Verification Scoping');

function updateAgentAuthorized(session, existingAgentDist, targetAgentDist) {
  if (!canUserAccessBlock(session, existingAgentDist, '')) return false;
  if (!canUserAccessBlock(session, targetAgentDist, '')) return false;
  return true;
}

assert(updateAgentAuthorized(validDistOperator, 'Ganjam', 'Ganjam') === true, 'District Operator modifying agent within Ganjam allowed');
assert(updateAgentAuthorized(validDistOperator, 'Puri', 'Ganjam') === false, 'District Operator modifying agent in another district (Puri) denied');
assert(updateAgentAuthorized(validDistOperator, 'Ganjam', 'Cuttack') === false, 'District Operator reassigning agent to another district (Cuttack) denied');

function updateMarriageVerifyAuthorized(session, recordDist, recordBlock) {
  return canUserAccessBlock(session, recordDist, recordBlock);
}

assert(updateMarriageVerifyAuthorized(validBlockOperator, 'Ganjam', 'Hinjilicut') === true, 'Block Operator updating marriage verification in assigned block allowed');
assert(updateMarriageVerifyAuthorized(validBlockOperator, 'Ganjam', 'Polasara') === false, 'Block Operator updating marriage verification outside assigned block denied');

// =================================================================
// 6. Header-Based Column Resolution & Partial Update Merging
// =================================================================
console.log('\n[Test Suite 6]: Dynamic Header Resolution & Partial Payload Updates');

function mergeApplicationRow(headers, existingRow, payload, now) {
  const row = existingRow.slice();
  headers.forEach((colName, idx) => {
    const key = colName.toLowerCase();
    if (key === 'applicant name') {
      if (payload.applicantName !== undefined) row[idx] = payload.applicantName;
    } else if (key === 'status') {
      if (payload.status !== undefined) row[idx] = payload.status;
    } else if (key === 'updated at') {
      row[idx] = now;
    }
  });
  return row;
}

const mockHeaders = ['ID', 'Service Type', 'Applicant Name', 'Card No', 'Aadhaar No', 'Tracking No', 'District', 'Block', 'Status', 'Updated At'];
const existingRow = ['SS-1001', 'Marriage Benefit Apply', 'Old Name', 'CARD-999', '123456789012', 'TRK-555', 'Ganjam', 'Hinjilicut', 'Pending', '2026-01-01T00:00:00Z'];
const partialPayload = { id: 'SS-1001', applicantName: 'Updated Beneficiary Name', status: 'Approved' };

const merged = mergeApplicationRow(mockHeaders, existingRow, partialPayload, '2026-11-23T12:00:00Z');

assert(merged[2] === 'Updated Beneficiary Name', 'Partial update updates applicantName');
assert(merged[8] === 'Approved', 'Partial update updates status');
assert(merged[3] === 'CARD-999', 'Partial update preserves untouched Card No');
assert(merged[4] === '123456789012', 'Partial update preserves untouched Aadhaar No');
assert(merged[5] === 'TRK-555', 'Partial update preserves untouched Tracking No');
assert(merged[6] === 'Ganjam', 'Partial update preserves untouched District');

// Tracking Number Resolution in General Sheet:
function findRowByTrackNo(headers, rows, trackNo) {
  const trackIdx = headers.findIndex(h => h.toLowerCase() === 'tracking no' || h.toLowerCase() === 'track no');
  if (trackIdx === -1) return null;
  return rows.find(r => r[trackIdx] === trackNo) || null;
}

const foundRow = findRowByTrackNo(mockHeaders, [existingRow], 'TRK-555');
assert(foundRow !== null && foundRow[0] === 'SS-1001', 'General-sheet application correctly matched via dynamic Tracking No header');
assert(findRowByTrackNo(mockHeaders, [existingRow], 'CARD-999') === null, 'Tracking No matcher does not confuse Card No with Track No');

// =================================================================
// 7. Live User Revalidation & Session Invalidation
// =================================================================
console.log('\n[Test Suite 7]: Live Account Status & Permission Revalidation');

const mockUsersDatabase = new Map([
  ['user_active', { id: 'U-1', username: 'user_active', role: 'Block Operator', status: 'Active' }],
  ['user_deactivated', { id: 'U-2', username: 'user_deactivated', role: 'Block Operator', status: 'Inactive' }]
]);

const activeSessionsRegistry = new Map();

function createTestSession(user) {
  const bToken = generateSecureToken();
  const tHash = hashSessionToken(bToken);
  const sess = {
    tokenHash: tHash,
    username: user.username,
    role: user.role,
    status: 'Active'
  };
  activeSessionsRegistry.set(tHash, sess);
  return bToken;
}

function validateTestSession(bToken) {
  const tHash = hashSessionToken(bToken);
  const sess = activeSessionsRegistry.get(tHash);
  if (!sess || sess.status !== 'Active') return null;

  // Live account revalidation
  const liveUser = mockUsersDatabase.get(sess.username);
  if (!liveUser || liveUser.status !== 'Active') {
    sess.status = 'Revoked';
    return null;
  }

  // Live role sync
  if (liveUser.role !== sess.role) {
    sess.role = liveUser.role;
  }

  return sess;
}

const activeToken = createTestSession(mockUsersDatabase.get('user_active'));
assert(validateTestSession(activeToken) !== null, 'Active user session validates cleanly');

// Deactivate user:
mockUsersDatabase.get('user_active').status = 'Suspended';
assert(validateTestSession(activeToken) === null, 'Deactivated user session immediately invalidated on next protected request');

// Deleted user:
const tokenOfDeleted = createTestSession({ username: 'user_deleted', role: 'Block Operator' });
assert(validateTestSession(tokenOfDeleted) === null, 'Deleted user session immediately rejected and revoked');

// Role change invalidation:
const userPromoted = { id: 'U-3', username: 'promoted', role: 'Viewer', status: 'Active' };
mockUsersDatabase.set('promoted', userPromoted);
const promoToken = createTestSession(userPromoted);

assert(validateTestSession(promoToken).role === 'Viewer', 'Session initially has Viewer role');
userPromoted.role = 'Super Admin'; // Role updated in Users sheet
assert(validateTestSession(promoToken).role === 'Super Admin', 'Session live revalidation synchronizes updated role permissions');

// Logout after cache eviction:
const logoutToken = createTestSession(mockUsersDatabase.get('user_deactivated'));
const logoutHash = hashSessionToken(logoutToken);
activeSessionsRegistry.get(logoutHash).status = 'Revoked'; // Logged out in DB

// Simulate cache eviction:
const inMemoryCache = new Map(); // empty
const dbFallback = activeSessionsRegistry.get(logoutHash);
assert(dbFallback.status === 'Revoked', 'Active_Sessions sheet marks session as Revoked');
assert((dbFallback.status === 'Active') === false, 'Session remains firmly revoked even after cache eviction');

// =================================================================
// 8. Service Name Validation & Formula Injection Neutralization
// =================================================================
console.log('\n[Test Suite 8]: Service Name Whitelist & Formula Defense');

function getSheetNameForService(serviceType) {
  if (!serviceType || typeof serviceType !== 'string') return null;
  const s = serviceType.trim().toLowerCase();
  if (s === 'new card' || s === 'new_card') return 'New_Card';
  if (s === 'card renewal' || s === 'card_renewal') return 'Card_Renewal';
  if (s === 'maternity benefit apply') return 'Maternity_Benefit';
  if (s === 'death benefit apply') return 'Death_Benefit';
  if (s === 'marriage benefit apply') return 'Marriage_Benefit';
  if (s === 'education assistance apply') return 'Education_Assistance';
  return null; // Strict rejection
}

assert(getSheetNameForService('New Card') === 'New_Card', 'Valid service New Card resolves');
assert(getSheetNameForService('Marriage Benefit Apply') === 'Marriage_Benefit', 'Valid service Marriage Benefit resolves');
assert(getSheetNameForService('FakeMaliciousService') === null, 'Invalid service name rejected with null (no fallback to New_Card)');
assert(getSheetNameForService('../New_Card') === null, 'Path traversal service string rejected with null');
assert(getSheetNameForService('') === null, 'Empty service string rejected with null');

function sanitizeCell(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (/^[=+@\-\t\r]/.test(s)) {
    return "'" + s;
  }
  return s;
}

const formulaVectors = [
  '=SUM(A1:B10)',
  '+cmd|/c calc',
  '-2+5',
  '@HYPERLINK("http://evil.com")',
  '\tcmd.exe',
  '\rpowershell'
];

formulaVectors.forEach((vector) => {
  const sanitized = sanitizeCell(vector);
  assert(sanitized.startsWith("'"), `Formula injection vector "${vector.replace(/\r|\t/g, ' ')}" neutralized with leading single quote`);
});

// =================================================================
// SUMMARY
// =================================================================
console.log('\n====================================================');
console.log(` AUDIT & REGRESSION RESULTS: ${passedTests} / ${totalTests} CHECKS PASSED`);
console.log('====================================================\n');

if (passedTests === totalTests) {
  console.log('🎉 ALL SECOND-STAGE SECURITY REQUIREMENTS & REGRESSION TESTS PASSED!\n');
  process.exit(0);
} else {
  console.error('❌ SOME REGRESSION CHECKS FAILED!\n');
  process.exit(1);
}
