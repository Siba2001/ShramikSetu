/**
 * Test Suite: 1-Hour Session Lifetime & Auto-Clear Verification
 */

import assert from 'assert';

console.log('====================================================');
console.log(' TESTING 1-HOUR SESSION CLEARING & EXPIRATION LOGIC ');
console.log('====================================================\n');

const SESSION_TIMEOUT_MINUTES = 60;
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 3,600,000 ms

function isSessionExpired(sessionOrUser) {
  if (!sessionOrUser) return true;
  const now = Date.now();

  // 1. Check explicit expiresAt timestamp
  if (sessionOrUser.expiresAt) {
    const expMs = new Date(sessionOrUser.expiresAt).getTime();
    if (!isNaN(expMs) && now >= expMs) {
      return true;
    }
  }

  // 2. Check loginAt timestamp (maximum 1-hour lifetime)
  if (sessionOrUser.loginAt) {
    const loginMs = new Date(sessionOrUser.loginAt).getTime();
    if (!isNaN(loginMs) && now - loginMs >= SESSION_TIMEOUT_MS) {
      return true;
    }
  }

  return false;
}

// 1. Fresh session (0 minutes old)
const freshSession = {
  username: 'admin',
  loginAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + SESSION_TIMEOUT_MS).toISOString()
};
assert.strictEqual(isSessionExpired(freshSession), false, 'Fresh session should NOT be expired');
console.log('  ✓ PASS: Fresh session (< 1 min) is active');

// 2. Session at 30 minutes (not expired)
const thirtyMinSession = {
  username: 'admin',
  loginAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
};
assert.strictEqual(isSessionExpired(thirtyMinSession), false, '30-minute session should NOT be expired');
console.log('  ✓ PASS: 30-minute session is active');

// 3. Session at 59 minutes (not expired)
const fiftyNineMinSession = {
  username: 'admin',
  loginAt: new Date(Date.now() - 59 * 60 * 1000).toISOString(),
  expiresAt: new Date(Date.now() + 1 * 60 * 1000).toISOString()
};
assert.strictEqual(isSessionExpired(fiftyNineMinSession), false, '59-minute session should NOT be expired');
console.log('  ✓ PASS: 59-minute session is active');

// 4. Session at exactly 60 minutes (EXPIRED)
const sixtyMinSession = {
  username: 'admin',
  loginAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  expiresAt: new Date(Date.now()).toISOString()
};
assert.strictEqual(isSessionExpired(sixtyMinSession), true, '60-minute session MUST be expired');
console.log('  ✓ PASS: Exactly 60-minute session is EXPIRED and cleared');

// 5. Session at 61 minutes (EXPIRED)
const sixtyOneMinSession = {
  username: 'admin',
  loginAt: new Date(Date.now() - 61 * 60 * 1000).toISOString(),
  expiresAt: new Date(Date.now() - 1 * 60 * 1000).toISOString()
};
assert.strictEqual(isSessionExpired(sixtyOneMinSession), true, '61-minute session MUST be expired');
console.log('  ✓ PASS: 61-minute session is EXPIRED and cleared');

// 6. Session with expired expiresAt timestamp
const pastExpiresSession = {
  username: 'admin',
  loginAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() - 5000).toISOString()
};
assert.strictEqual(isSessionExpired(pastExpiresSession), true, 'Session with past expiresAt MUST be expired');
console.log('  ✓ PASS: Past expiresAt is recognized as EXPIRED');

// 7. Active sessions registry pruning
const registry = [freshSession, thirtyMinSession, sixtyMinSession, sixtyOneMinSession];
const pruned = registry.filter(s => !isSessionExpired(s));
assert.strictEqual(pruned.length, 2, 'Pruned registry should only contain sessions < 1 hour old');
console.log('  ✓ PASS: Active sessions registry prunes sessions older than 1 hour');

console.log('\n====================================================');
console.log(' ALL 7 / 7 SESSION EXPIRATION CHECKS PASSED!        ');
console.log('====================================================\n');
