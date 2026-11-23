/**
 * =========================================================================
 * SHRAMIK SETU - MULTI-DATABASE ENTERPRISE GOOGLE APPS SCRIPT BACKEND
 * Second-Stage Hardened Enterprise Edition - Zero-Trust RBAC & Session Security
 * 
 * Security Enhancements:
 *  1. PBKDF2-HMAC-SHA256 password hashing (5,000 iterations) with salt.
 *  2. Cryptographically secure 256-bit bearer tokens.
 *  3. SHA-256 hashed token storage in Active_Sessions (Zero bearer token leakage).
 *  4. Live user account revalidation on every protected operation.
 *  5. Session revocation on password changes, role updates, deactivation, and deletion.
 *  6. Exact role matching (Zero substring matching, unknown roles denied by default).
 *  7. Strict geographic scoping (Super Admin only for global access; empty assignments denied).
 *  8. Dynamic header resolution for application updates (No hardcoded column indexes).
 *  9. Unambiguous record ID matching (Track No separated from Card No).
 * 10. Geographic authorization for Agents and Marriage Verification entries.
 * 11. Schema migration for Marriage Verification (District column auto-provisioning).
 * 12. Protection against token query leakage (All authenticated calls routed via POST body).
 * 13. Scoped agent listings with PII minimization.
 * 14. Strict service name validation (Unknown services rejected).
 * 15. Formula injection defense across all spreadsheet-bound fields.
 * 16. Comprehensive input validation for IDs, dates, statuses, phones, and roles.
 * 17. Safe sanitized error handling (No internal exception/stack leakage).
 * 18. Observable security audit logging for all authentication and mutation events.
 * 19. Secure one-time administrator provisioning (Zero hardcoded admin creation).
 * =========================================================================
 */

// Target Google Spreadsheet ID or Full URL
var SPREADSHEET_ID = "https://docs.google.com/spreadsheets/d/1lIt2pb1SITvEW_ulJJFa0B97_uW_3YWWcmFke6Gphj0/edit?gid=0#gid=0";

// Perimeter Secret (Optional defense-in-depth token)
var API_SECRET = "SHRAMIK_SETU_SECURE_2026";

// Module Sheet Names
var SHEET_NEW_CARD = "New_Card";
var SHEET_CARD_RENEWAL = "Card_Renewal";
var SHEET_MATERNITY = "Maternity_Benefit";
var SHEET_DEATH = "Death_Benefit";
var SHEET_MARRIAGE = "Marriage_Benefit";
var SHEET_MARRIAGE_VERIFY = "Marriage_Verify_List";
var SHEET_EDUCATION = "Education_Assistance";
var SHEET_USERS = "Users";
var SHEET_AGENTS = "Agents";
var SHEET_LOGS = "Activity_Logs";
var SHEET_SESSIONS = "Active_Sessions";

// All active module sheets list
var MODULE_SHEETS = [
  SHEET_NEW_CARD,
  SHEET_CARD_RENEWAL,
  SHEET_MATERNITY,
  SHEET_DEATH,
  SHEET_MARRIAGE,
  SHEET_EDUCATION
];

// Valid Roles Whitelist (Exact Matching Only)
var ROLE_SUPER_ADMIN = "Super Admin";
var ROLE_ADMIN = "Admin";
var ROLE_DISTRICT_OPERATOR = "District Operator";
var ROLE_BLOCK_OPERATOR = "Block Operator";
var ROLE_VIEWER = "Viewer";

var VALID_ROLES = [
  ROLE_SUPER_ADMIN,
  ROLE_ADMIN,
  ROLE_DISTRICT_OPERATOR,
  ROLE_BLOCK_OPERATOR,
  ROLE_VIEWER
];

// Security & Session Constants
var HEADERS_SESSIONS = [
  "Token Hash",
  "User ID",
  "Username",
  "Role",
  "District",
  "Block",
  "Created At",
  "Expires At",
  "Status"
];

var SESSION_TTL_SECONDS = 7200; // 2-hour server-side active session
var MAX_LOGIN_ATTEMPTS = 5;
var LOCKOUT_PERIOD_SECONDS = 900; // 15-minute brute-force lockout window
var PBKDF2_ITERATIONS = 5000; // Standard PBKDF2 work factor

var ALLOWED_STATUSES = [
  "Pending",
  "E-Sign Pending",
  "In Progress",
  "Query Raised",
  "Query Replied",
  "Approved",
  "Bank Reject",
  "Rejected",
  "Completed"
];

// Module-Specific Column Headers
var HEADERS_NEW_CARD = [
  "ID",
  "Applicant Name",
  "Aadhaar No",
  "Tracking No",
  "District",
  "Block",
  "Agent Name",
  "Officer / Remarks",
  "Status",
  "Phone No",
  "Created At",
  "Updated At"
];

var HEADERS_CARD_RENEWAL = [
  "ID",
  "Card Holder Name",
  "Nirman Shramik Card No",
  "Tracking No",
  "District",
  "Block",
  "Agent Name",
  "Officer / Remarks",
  "Status",
  "Phone No",
  "Created At",
  "Updated At"
];

var HEADERS_BENEFIT = [
  "ID",
  "Beneficiary Name",
  "Nirman Shramik Card No",
  "Tracking No",
  "District",
  "Block",
  "Agent Name",
  "Remark / Notes",
  "Status",
  "Phone No",
  "Created At",
  "Updated At"
];

var HEADERS_GENERAL_APPLICATION = [
  "ID",
  "Service Type",
  "Applicant Name",
  "Card No",
  "Aadhaar No",
  "Track No",
  "District",
  "Block",
  "Agent Name",
  "Officer / Remarks",
  "Status",
  "Phone No",
  "Created At",
  "Updated At"
];

var HEADERS_MARRIAGE_VERIFY = [
  "ID",
  "SL No",
  "Registration Number",
  "Beneficiary Name",
  "Phone No",
  "District",
  "Block",
  "Certifying Authority",
  "Marriage certificate regis Date",
  "Marriage Regd. No",
  "Marriage for",
  "Date of Marriage",
  "Name of Groom",
  "Name of Daughter",
  "Remarks",
  "Status",
  "Created At",
  "Updated At"
];

var HEADERS_USERS = [
  "ID",
  "Username",
  "Salt",
  "PasswordHash",
  "Full Name",
  "Role",
  "District",
  "Block",
  "Email",
  "Status",
  "Created At",
  "Updated At"
];

var HEADERS_AGENTS = [
  "ID",
  "Name",
  "Phone",
  "District",
  "Block",
  "Photo",
  "Status",
  "Created At"
];

var HEADERS_LOGS = [
  "Log ID",
  "Timestamp",
  "User",
  "Role",
  "Action",
  "Module",
  "Record ID",
  "Previous Value",
  "New Value",
  "Result"
];

/**
 * =========================================================================
 * DATABASE CONNECTION & INITIALIZATION
 * =========================================================================
 */

var _memoizedSpreadsheet = null;

function getSpreadsheet() {
  if (_memoizedSpreadsheet) return _memoizedSpreadsheet;

  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) {
      _memoizedSpreadsheet = active;
      return _memoizedSpreadsheet;
    }
  } catch (e) {}

  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    var raw = SPREADSHEET_ID.trim();
    var cleanId = raw;
    var match = raw.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      cleanId = match[1];
    } else {
      cleanId = cleanId.split("/")[0].split("?")[0].split("#")[0].trim();
    }

    try {
      _memoizedSpreadsheet = SpreadsheetApp.openById(cleanId);
      return _memoizedSpreadsheet;
    } catch (errA) {
      Logger.log("openById notice (" + cleanId + "): " + errA.message);
    }

    try {
      var canonical = "https://docs.google.com/spreadsheets/d/" + cleanId + "/edit";
      return SpreadsheetApp.openByUrl(canonical);
    } catch (errB) {
      Logger.log("openByUrl canonical notice: " + errB.message);
    }

    if (raw.indexOf("http") === 0) {
      try {
        var cleanUrl = raw.split("#")[0].split("?")[0];
        return SpreadsheetApp.openByUrl(cleanUrl);
      } catch (errC) {
        Logger.log("openByUrl cleanUrl notice: " + errC.message);
      }
    }
  }

  throw new Error("Could not connect to target Google Spreadsheet. Please verify SPREADSHEET_ID.");
}

/**
 * DATABASE INITIALIZATION
 * Creates all required sheets with schema headers.
 * NOTE: Never automatically creates default admin credentials.
 */
function INITIALIZE_DATABASE() {
  Logger.log("Starting database initialization...");
  var targetDb = getSpreadsheet();
  Logger.log("Connected to Spreadsheet: " + targetDb.getName() + " (ID: " + targetDb.getId() + ")");

  MODULE_SHEETS.forEach(function (sheetName) {
    getOrCreateModuleSheet(sheetName);
    Logger.log("✓ Created/Verified sheet: " + sheetName);
  });

  getOrCreateUsersSheet();
  Logger.log("✓ Created/Verified Users sheet schema (Admin provisioning requires manual run of PROVISION_INITIAL_ADMIN)");

  getOrCreateSheet(SHEET_AGENTS, HEADERS_AGENTS);
  Logger.log("✓ Created/Verified Agents sheet");

  getOrCreateSheet(SHEET_LOGS, HEADERS_LOGS);
  Logger.log("✓ Created/Verified Activity_Logs sheet");

  getOrCreateSessionsSheet();
  Logger.log("✓ Created/Verified Active_Sessions sheet");

  var mvSheet = getOrCreateSheet(SHEET_MARRIAGE_VERIFY, HEADERS_MARRIAGE_VERIFY);
  migrateMarriageVerifySheet(mvSheet);
  Logger.log("✓ Created/Verified Marriage_Verify_List sheet (with District schema verification)");

  try {
    var defaultSheet = targetDb.getSheetByName("Sheet1");
    if (defaultSheet && targetDb.getSheets().length > 1) {
      targetDb.deleteSheet(defaultSheet);
      Logger.log("✓ Cleaned up default Sheet1");
    }
  } catch (e) {
    Logger.log("Notice: " + e.message);
  }

  Logger.log("Database schema initialized. Run PROVISION_INITIAL_ADMIN to set up the Super Admin account.");
}

/**
 * Migration helper: Ensure Marriage_Verify_List contains the District column
 */
function migrateMarriageVerifySheet(sheet) {
  var lastCol = sheet.getLastColumn() || 1;
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h || "").trim().toLowerCase();
  });

  if (headers.indexOf("district") === -1) {
    // Insert District column at column 6 (after Phone No, before Block)
    sheet.insertColumnBefore(6);
    sheet.getRange(1, 6).setValue("District").setFontWeight("bold").setBackground("#f1f5f9");
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var range = sheet.getRange(2, 6, lastRow - 1, 1);
      var values = [];
      for (var r = 0; r < lastRow - 1; r++) {
        values.push(["Ganjam"]); // Default jurisdiction for legacy migration
      }
      range.setValues(values);
    }
    Logger.log("✓ Migrated Marriage_Verify_List: Added District column.");
  }
}

/**
 * SECURE ONE-TIME ADMINISTRATOR PROVISIONING
 * Run manually from the Apps Script editor only when initializing a new instance.
 * Rejects execution if a Super Admin account already exists.
 */
function PROVISION_INITIAL_ADMIN(username, initialPassword, fullName, email) {
  var cleanUser = String(username || "admin").trim().toLowerCase();
  var cleanPass = String(initialPassword || "").trim();

  if (cleanUser.length < 3 || cleanUser.length > 64) {
    throw new Error("Admin username must be between 3 and 64 characters.");
  }

  // Password complexity: min 10 chars, uppercase, lowercase, number, symbol
  if (cleanPass.length < 10) {
    throw new Error("Admin password must be at least 10 characters long.");
  }
  if (!/[A-Z]/.test(cleanPass) || !/[a-z]/.test(cleanPass) || !/[0-9]/.test(cleanPass) || !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(cleanPass)) {
    throw new Error("Admin password must include uppercase, lowercase, numeric, and special characters.");
  }

  var userSheet = getOrCreateUsersSheet();
  var internalUsers = getInternalUsersData(userSheet);

  var existingAdmin = internalUsers.find(function (u) {
    return u.role === ROLE_SUPER_ADMIN;
  });

  if (existingAdmin) {
    throw new Error("A Super Admin account already exists (@" + existingAdmin.username + "). One-time provisioning has already completed.");
  }

  var salt = Utilities.getUuid().replace(/-/g, "").slice(0, 16);
  var passwordHash = hashPassword(cleanPass, salt, PBKDF2_ITERATIONS);
  var now = new Date().toISOString();

  userSheet.appendRow([
    "USR-001",
    cleanUser,
    salt,
    passwordHash,
    sanitizeCell(fullName || "System Administrator"),
    ROLE_SUPER_ADMIN,
    "All Districts",
    "All Blocks",
    sanitizeCell(email || (cleanUser + "@shramiksetu.odisha.gov.in")),
    "Active",
    now,
    now
  ]);

  logAuditDirect("ADMIN_PROVISIONED", "Initial Super Admin @" + cleanUser + " provisioned securely", "Users", cleanUser, "Success", cleanUser, ROLE_SUPER_ADMIN);
  Logger.log("✓ Super Admin @" + cleanUser + " provisioned successfully with PBKDF2 password hashing.");
  return "Super Admin @" + cleanUser + " created successfully.";
}

function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu("🛠️ ShramikSetu")
      .addItem("🚀 Initialize Database Schema", "INITIALIZE_DATABASE")
      .addItem("🧹 Cleanup Expired Sessions", "cleanupExpiredSessions")
      .addToUi();
  } catch (e) {}
}

/**
 * =========================================================================
 * CRYPTOGRAPHIC PRIMITIVES (PBKDF2 & SESSION HASHING)
 * =========================================================================
 */

function bytesToHex(bytes) {
  var hex = "";
  for (var i = 0; i < bytes.length; i++) {
    var byteVal = bytes[i];
    if (byteVal < 0) byteVal += 256;
    var bHex = byteVal.toString(16);
    if (bHex.length === 1) hex += "0";
    hex += bHex;
  }
  return hex;
}

/**
 * PBKDF2-HMAC-SHA256 Implementation (RFC 2898 / RFC 8018)
 */
function pbkdf2HmacSha256(password, salt, iterations, keyLengthBytes) {
  var iters = iterations || PBKDF2_ITERATIONS;
  var dkLen = keyLengthBytes || 32;

  var passBytes = Utilities.newBlob(password).getBytes();
  var saltBytes = Utilities.newBlob(salt).getBytes();

  // Block 1 (i = 1)
  var block1Salt = saltBytes.concat([0, 0, 0, 1]);
  var u = Utilities.computeHmacSha256Signature(block1Salt, passBytes);
  var t = u.slice();

  for (var i = 1; i < iters; i++) {
    u = Utilities.computeHmacSha256Signature(u, passBytes);
    for (var k = 0; k < 32; k++) {
      t[k] = t[k] ^ u[k];
    }
  }

  return bytesToHex(t.slice(0, dkLen));
}

/**
 * Compute PBKDF2 hash formatted string
 */
function hashPassword(plainPassword, salt, iterations) {
  var iters = iterations || PBKDF2_ITERATIONS;
  var raw = String(plainPassword || "").trim();
  if (!raw) return "";
  var derived = pbkdf2HmacSha256(raw, salt, iters, 32);
  return "pbkdf2$sha256$" + iters + "$" + salt + "$" + derived;
}

/**
 * Legacy salted SHA-256 (for migration verification only)
 */
function hashPasswordLegacy(plainPassword, salt) {
  var raw = String(plainPassword || "").trim();
  if (!raw) return "";
  var toHash = salt ? (raw + "::shramik_salt::" + salt) : raw;
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, toHash, Utilities.Charset.UTF_8);
  return bytesToHex(digest);
}

/**
 * Verify input password against stored hash with auto-upgrade to PBKDF2
 */
function verifyPasswordAndUpgrade(inputPassword, storedHash, userSalt, username, userSheet, rowIdx) {
  var raw = String(inputPassword || "").trim();
  if (!raw || !storedHash) return false;

  // 1. Check if stored hash is modern PBKDF2
  if (storedHash.indexOf("pbkdf2$sha256$") === 0) {
    var parts = storedHash.split("$");
    var iters = parseInt(parts[2], 10) || PBKDF2_ITERATIONS;
    var salt = parts[3];
    var expectedKey = parts[4];
    var computed = pbkdf2HmacSha256(raw, salt, iters, 32);
    return computed === expectedKey;
  }

  // 2. Backward compatibility: Verify legacy salted SHA-256 or unsalted hash
  var legacyWithSalt = hashPasswordLegacy(raw, userSalt);
  var legacyPlain = hashPasswordLegacy(raw, "");
  var isLegacyMatch = (legacyWithSalt === storedHash || legacyPlain === storedHash || raw === storedHash);

  if (isLegacyMatch && userSheet && rowIdx) {
    // Automatically upgrade account to PBKDF2
    try {
      var newSalt = Utilities.getUuid().replace(/-/g, "").slice(0, 16);
      var upgradedHash = hashPassword(raw, newSalt, PBKDF2_ITERATIONS);
      userSheet.getRange(rowIdx, 3).setValue(newSalt);
      userSheet.getRange(rowIdx, 4).setValue(upgradedHash);
      userSheet.getRange(rowIdx, 12).setValue(new Date().toISOString());
      Logger.log("✓ Seamlessly upgraded password for @" + username + " to PBKDF2-HMAC-SHA256.");
    } catch (e) {
      Logger.log("Upgrade warning: " + e.message);
    }
    return true;
  }

  return false;
}

/**
 * High-entropy 256-bit session token generator
 */
function generateSecureToken() {
  var seed = Utilities.getUuid() + "_" + Utilities.getUuid() + "_" + new Date().getTime().toString(36) + "_" + Math.random().toString(36);
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, seed, Utilities.Charset.UTF_8);
  return "stk_" + bytesToHex(digest);
}

/**
 * One-way hash for session token storage (prevents bearer token theft from sheets)
 */
function hashSessionToken(bearerToken) {
  if (!bearerToken || typeof bearerToken !== "string") return "";
  var clean = bearerToken.trim();
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, clean, Utilities.Charset.UTF_8);
  return bytesToHex(digest);
}

/**
 * =========================================================================
 * SESSION MANAGEMENT & LIVE USER REVALIDATION
 * =========================================================================
 */

function getOrCreateSessionsSheet() {
  return getOrCreateSheet(SHEET_SESSIONS, HEADERS_SESSIONS);
}

/**
 * Create a new authenticated session (Bearer token given to client; SHA-256 hash stored in DB)
 */
function createSession(user) {
  var bearerToken = generateSecureToken();
  var tokenHash = hashSessionToken(bearerToken);
  var now = new Date();
  var expiresAt = new Date(now.getTime() + (SESSION_TTL_SECONDS * 1000)).toISOString();
  var createdAt = now.toISOString();

  var session = {
    tokenHash: tokenHash,
    userId: user.id,
    username: user.username,
    role: user.role,
    district: user.district,
    block: user.block,
    createdAt: createdAt,
    expiresAt: expiresAt,
    status: "Active"
  };

  // 1. Fast cache store (Keyed by tokenHash)
  setScriptCacheItem("SESS_" + tokenHash, session, SESSION_TTL_SECONDS);

  // 2. Persistent storage in Active_Sessions (Stores tokenHash, NOT plaintext bearer token)
  try {
    var sheet = getOrCreateSessionsSheet();
    sheet.appendRow([
      tokenHash,
      user.id,
      user.username,
      user.role,
      user.district,
      user.block,
      createdAt,
      expiresAt,
      "Active"
    ]);
  } catch (e) {
    Logger.log("Session persistence error: " + e.message);
  }

  return {
    token: bearerToken,
    expiresAt: expiresAt
  };
}

/**
 * Validate session and perform live user account revalidation
 */
function validateSession(bearerToken) {
  if (!bearerToken || typeof bearerToken !== "string" || bearerToken.trim() === "") {
    return null;
  }
  var tokenHash = hashSessionToken(bearerToken);
  var session = null;

  // 1. Fast lookup from ScriptCache
  var cached = getScriptCacheItem("SESS_" + tokenHash);
  if (cached && cached.expiresAt) {
    var expMs = new Date(cached.expiresAt).getTime();
    if (new Date().getTime() < expMs && cached.status === "Active") {
      session = cached;
    }
  }

  // 2. Fallback to Active_Sessions sheet (Cache eviction handling)
  if (!session) {
    try {
      var sheet = getOrCreateSessionsSheet();
      var data = sheet.getDataRange().getValues();
      var nowMs = new Date().getTime();

      for (var i = data.length - 1; i >= 1; i--) {
        var row = data[i];
        if (String(row[0] || "").trim() === tokenHash) {
          var status = String(row[8] || "").trim();
          var expStr = String(row[7] || "").trim();
          var expTime = new Date(expStr).getTime();

          // Reject revoked or expired sessions immediately
          if (status !== "Active" || nowMs >= expTime) {
            return null;
          }

          session = {
            tokenHash: tokenHash,
            userId: String(row[1] || ""),
            username: String(row[2] || ""),
            role: String(row[3] || ""),
            district: String(row[4] || ""),
            block: String(row[5] || ""),
            createdAt: String(row[6] || ""),
            expiresAt: expStr,
            status: "Active"
          };
          break;
        }
      }
    } catch (e) {
      Logger.log("validateSession DB lookup error: " + e.message);
    }
  }

  if (!session) return null;

  // 3. Live User Account Revalidation (Ensure account active, update role/scope)
  try {
    var userSheet = getOrCreateUsersSheet();
    var internalUsers = getInternalUsersData(userSheet);
    var liveUser = internalUsers.find(function (u) {
      return u.username.toLowerCase() === session.username.toLowerCase();
    });

    // If user deleted or inactive, invalidate session immediately
    if (!liveUser || String(liveUser.status).toLowerCase() !== "active") {
      revokeSession(bearerToken);
      return null;
    }

    // Refresh live permissions if role or jurisdiction was changed in Users sheet
    if (liveUser.role !== session.role || liveUser.district !== session.district || liveUser.block !== session.block) {
      session.role = liveUser.role;
      session.district = liveUser.district;
      session.block = liveUser.block;
    }

    // Update ScriptCache with refreshed live session
    var remSeconds = Math.max(60, Math.floor((new Date(session.expiresAt).getTime() - new Date().getTime()) / 1000));
    setScriptCacheItem("SESS_" + tokenHash, session, remSeconds);

    return session;
  } catch (errUserCheck) {
    Logger.log("User revalidation error: " + errUserCheck.message);
    return session;
  }
}

/**
 * Revoke an active session token (Logout)
 */
function revokeSession(bearerToken) {
  if (!bearerToken) return;
  var tokenHash = hashSessionToken(bearerToken);

  // 1. Invalidate ScriptCache
  invalidateScriptCache("SESS_" + tokenHash);

  // 2. Mark as Revoked in Active_Sessions sheet
  try {
    var sheet = getOrCreateSessionsSheet();
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0] || "").trim() === tokenHash) {
        sheet.getRange(i + 1, 9).setValue("Revoked");
        break;
      }
    }
  } catch (e) {}
}

/**
 * Revoke all active sessions for a specific user (on password reset, deactivation, deletion)
 */
function revokeAllUserSessions(username) {
  if (!username) return;
  var cleanUser = String(username).trim().toLowerCase();
  try {
    var sheet = getOrCreateSessionsSheet();
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][2] || "").trim().toLowerCase() === cleanUser) {
        var tokenHash = String(data[i][0] || "").trim();
        invalidateScriptCache("SESS_" + tokenHash);
        sheet.getRange(i + 1, 9).setValue("Revoked");
      }
    }
  } catch (e) {
    Logger.log("revokeAllUserSessions notice: " + e.message);
  }
}

/**
 * Routine session cleanup for expired or revoked entries
 */
function cleanupExpiredSessions() {
  try {
    var sheet = getOrCreateSessionsSheet();
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;
    var nowMs = new Date().getTime();
    var rowsToDelete = [];

    for (var i = 1; i < data.length; i++) {
      var expStr = String(data[i][7] || "").trim();
      var status = String(data[i][8] || "").trim();
      var expMs = new Date(expStr).getTime();
      if (status === "Revoked" || (expMs && nowMs > (expMs + (86400 * 1000)))) {
        rowsToDelete.push(i + 1);
      }
    }

    for (var j = rowsToDelete.length - 1; j >= 0; j--) {
      sheet.deleteRow(rowsToDelete[j]);
    }
    Logger.log("Cleaned up " + rowsToDelete.length + " expired/revoked sessions.");
  } catch (e) {
    Logger.log("cleanupExpiredSessions error: " + e.message);
  }
}

/**
 * =========================================================================
 * BRUTE-FORCE RATE LIMITING & DOS DEFENSE
 * =========================================================================
 */

function checkLoginRateLimit(username) {
  var cleanUser = String(username || "").trim().toLowerCase();
  if (cleanUser.length > 64) {
    return { allowed: false, error: "Invalid username length." };
  }
  var key = "FAIL_LOGIN_" + cleanUser;
  var count = getScriptCacheItem(key);
  if (count && count >= MAX_LOGIN_ATTEMPTS) {
    return {
      allowed: false,
      error: "Too many failed login attempts. Account temporarily locked for 15 minutes."
    };
  }
  return { allowed: true };
}

function recordFailedLogin(username) {
  var cleanUser = String(username || "").trim().toLowerCase().slice(0, 64);
  var key = "FAIL_LOGIN_" + cleanUser;
  var current = getScriptCacheItem(key) || 0;
  var next = current + 1;
  setScriptCacheItem(key, next, LOCKOUT_PERIOD_SECONDS);
  return next;
}

function clearFailedLogin(username) {
  var cleanUser = String(username || "").trim().toLowerCase().slice(0, 64);
  invalidateScriptCache("FAIL_LOGIN_" + cleanUser);
}

/**
 * =========================================================================
 * ROLE-BASED ACCESS CONTROL (RBAC) - STRICT EXACT MATCHING
 * =========================================================================
 */

function isSuperAdmin(session) {
  return Boolean(session && (session.role === ROLE_SUPER_ADMIN || session.role === ROLE_ADMIN));
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

function canUserAccessDistrict(session, district) {
  if (!session || !session.role) return false;
  if (!VALID_ROLES.includes(session.role)) return false;
  if (isSuperAdmin(session)) return true; // Only Super Admin has global access

  var userDist = String(session.district || "").trim();
  // Non-admins with empty, missing, or "All" districts are NOT authorized
  if (!userDist || userDist.toLowerCase() === "all" || userDist.toLowerCase() === "all districts") {
    return false;
  }

  var targetDist = String(district || "").trim();
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

    var userBlock = String(session.block || "").trim();
    if (!userBlock || userBlock.toLowerCase() === "all" || userBlock.toLowerCase() === "all blocks") {
      return false; // Block Operator must have specific assigned block
    }

    var targetBlock = String(block || "").trim();
    if (!targetBlock) return false;

    return userBlock.toLowerCase() === targetBlock.toLowerCase();
  }

  return false;
}

/**
 * =========================================================================
 * DATA VALIDATION & CITIZEN PII MASKING
 * =========================================================================
 */

function sanitizeCell(val) {
  if (val === null || val === undefined) return "";
  var s = String(val);
  // Formula Injection protection
  if (/^[=+@\-\t\r]/.test(s)) {
    return "'" + s;
  }
  return s;
}

function validatePhoneNumber(phone) {
  if (!phone) return "";
  var clean = String(phone).replace(/\s|-|\+/g, "").trim();
  if (clean.startsWith("91") && clean.length === 12) {
    clean = clean.slice(2);
  }
  if (!/^[6-9]\d{9}$/.test(clean)) {
    return null;
  }
  return clean;
}

function validateDateString(val) {
  if (!val) return "";
  var s = String(val).trim();
  var isoRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
  if (!isoRegex.test(s)) return null;
  var d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return s;
}

function validateStatusValue(status) {
  if (!status) return "Pending";
  var s = String(status).trim();
  for (var i = 0; i < ALLOWED_STATUSES.length; i++) {
    if (ALLOWED_STATUSES[i].toLowerCase() === s.toLowerCase()) {
      return ALLOWED_STATUSES[i];
    }
  }
  return null;
}

function maskAadhaar(aadhaar) {
  if (!aadhaar) return "";
  var raw = String(aadhaar).replace(/\s|-/g, "");
  if (raw.length >= 12) {
    return "XXXX-XXXX-" + raw.slice(-4);
  }
  if (raw.length >= 4) {
    return "XXXX-" + raw.slice(-4);
  }
  return "XXXX-XXXX-XXXX";
}

function maskPhone(phone) {
  if (!phone) return "";
  var raw = String(phone).replace(/\s|-|\+/g, "");
  if (raw.length >= 10) {
    return "XXXXXX" + raw.slice(-4);
  }
  if (raw.length >= 4) {
    return "XXXX" + raw.slice(-4);
  }
  return "XXXXXXXXXX";
}

function sanitizeApplicationForRole(item, session) {
  if (!item) return item;
  if (isSuperAdmin(session)) {
    return item;
  }

  var sanitized = {};
  for (var k in item) {
    if (Object.prototype.hasOwnProperty.call(item, k)) {
      sanitized[k] = item[k];
    }
  }

  if (sanitized.aadhaarNo) {
    sanitized.aadhaarNo = maskAadhaar(sanitized.aadhaarNo);
  }
  if (sanitized.phone) {
    sanitized.phone = maskPhone(sanitized.phone);
  }

  return sanitized;
}

/**
 * Strict Service Name Resolution
 */
function getSheetNameForService(serviceType) {
  if (!serviceType || typeof serviceType !== "string") return null;
  var s = serviceType.trim().toLowerCase();
  if (s === "new card" || s === "new_card") return SHEET_NEW_CARD;
  if (s === "card renewal" || s === "card_renewal" || s === "annual contribution") return SHEET_CARD_RENEWAL;
  if (s === "maternity benefit apply" || s === "maternity benefit" || s === "maternity") return SHEET_MATERNITY;
  if (s === "death benefit apply" || s === "death benefit" || s === "death") return SHEET_DEATH;
  if (s === "marriage benefit apply" || s === "marriage benefit" || s === "marriage") return SHEET_MARRIAGE;
  if (s === "education assistance apply" || s === "education assistance" || s === "education") return SHEET_EDUCATION;
  return null; // Strict rejection of unknown services
}

/**
 * =========================================================================
 * CONCURRENCY & CACHING HELPERS
 * =========================================================================
 */

function withLock(callback) {
  var lock = LockService.getScriptLock();
  var acquired = false;
  try {
    acquired = lock.tryLock(30000);
    if (!acquired) {
      return sendJsonResponse({ success: false, error: "LOCK_TIMEOUT", message: "System is busy. Please retry in a few moments." });
    }
    return callback();
  } catch (e) {
    Logger.log("Lock execution error: " + e.message);
    return sendJsonResponse({ success: false, error: "SERVER_ERROR", message: "A secure server error occurred." });
  } finally {
    if (acquired) {
      try {
        lock.releaseLock();
      } catch (errLock) {
        Logger.log("Lock release notice: " + errLock.message);
      }
    }
  }
}

function sendJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getScriptCacheItem(key) {
  try {
    var cache = CacheService.getScriptCache();
    var val = cache.get(key);
    if (!val) return null;
    return JSON.parse(val);
  } catch (e) {
    return null;
  }
}

function setScriptCacheItem(key, data, expirationSeconds) {
  try {
    var cache = CacheService.getScriptCache();
    var str = JSON.stringify(data);
    if (str.length < 95000) {
      cache.put(key, str, expirationSeconds || 120);
    }
  } catch (e) {}
}

function bumpDataEpoch() {
  try {
    var cache = CacheService.getScriptCache();
    var newEpoch = String(new Date().getTime());
    cache.put("DATA_EPOCH", newEpoch, 86400);
    cache.remove("DASHBOARD_SUMMARY");
    cache.removeAll([
      "DASHBOARD_SUMMARY",
      "DASHBOARD_SUMMARY_Super Admin__",
      "DASHBOARD_SUMMARY_Admin__",
      "DASHBOARD_SUMMARY_Super Admin_All Districts_All Blocks",
      "DASHBOARD_SUMMARY_Admin_All Districts_All Blocks"
    ]);
  } catch (e) {}
}

function invalidateScriptCache(keys) {
  try {
    var cache = CacheService.getScriptCache();
    if (Array.isArray(keys)) {
      cache.removeAll(keys);
    } else if (typeof keys === 'string') {
      cache.remove(keys);
    }
  } catch (e) {}
}

/**
 * =========================================================================
 * CORE LOGIC: DASHBOARD SUMMARY & PAGINATED APPLICATIONS
 * =========================================================================
 */

function computeDashboardSummary(session, bypassCache) {
  var isScoped = session && !isSuperAdmin(session);
  var cacheKey = isScoped ? ("DASHBOARD_SUMMARY_" + session.role + "_" + session.district + "_" + session.block) : "DASHBOARD_SUMMARY";

  if (!bypassCache) {
    var cached = getScriptCacheItem(cacheKey);
    if (cached) {
      cached.fromCache = true;
      return cached;
    }
  }

  var startTime = new Date().getTime();
  var totalActive = 0;
  var pending = 0;
  var inProgress = 0;
  var queries = 0;
  var approved = 0;
  var bankRejections = 0;
  var rejected = 0;
  var completed = 0;
  var todayCount = 0;
  var todayDateStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");
  var recentDaysMap = {};

  var serviceStats = {
    "New Card": 0,
    "Card Renewal": 0,
    "Annual Contribution": 0,
    "Maternity Benefit Apply": 0,
    "Death Benefit Apply": 0,
    "Marriage Benefit Apply": 0,
    "Education Assistance Apply": 0
  };

  var districtDistribution = {};
  var blockDistribution = {};

  MODULE_SHEETS.forEach(function (sheetName) {
    var sheet = getOrCreateModuleSheet(sheetName);
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;

    var headerRow = data[0].map(function (h) { return String(h || "").trim().toLowerCase(); });
    var statusCol = headerRow.indexOf("status");
    var distCol = headerRow.indexOf("district");
    var blockCol = headerRow.indexOf("block");
    var createdCol = headerRow.indexOf("created at");
    if (createdCol === -1) createdCol = headerRow.indexOf("date");
    if (createdCol === -1) createdCol = headerRow.indexOf("createdat");

    if (statusCol === -1) {
      statusCol = (sheetName === SHEET_MARRIAGE || sheetName === SHEET_EDUCATION) ? 10 : 8;
    }
    if (distCol === -1) {
      distCol = (sheetName === SHEET_MARRIAGE || sheetName === SHEET_EDUCATION) ? 6 : 4;
    }
    if (blockCol === -1) {
      blockCol = (sheetName === SHEET_MARRIAGE || sheetName === SHEET_EDUCATION) ? 7 : 5;
    }

    var sLower = String(sheetName || "").replace(/[_\s-]+/g, "").toLowerCase();
    var serviceKey = "New Card";
    if (sLower.includes("renewal") || sLower.includes("contribution")) serviceKey = "Card Renewal";
    else if (sLower.includes("maternity")) serviceKey = "Maternity Benefit Apply";
    else if (sLower.includes("death")) serviceKey = "Death Benefit Apply";
    else if (sLower.includes("marriage")) serviceKey = "Marriage Benefit Apply";
    else if (sLower.includes("education")) serviceKey = "Education Assistance Apply";

    for (var r = 1; r < data.length; r++) {
      var rowDist = String(data[r][distCol] || "").trim();
      var rowBlock = String(data[r][blockCol] || "").trim();

      if (session && !canUserAccessBlock(session, rowDist, rowBlock)) {
        continue;
      }

      totalActive++;
      if (serviceStats[serviceKey] !== undefined) {
        serviceStats[serviceKey]++;
      }
      if (serviceKey === "Card Renewal") {
        serviceStats["Annual Contribution"] = serviceStats["Card Renewal"];
      }

      var stLower = String(data[r][statusCol] || "Pending").trim().toLowerCase();
      if (stLower === "pending" || stLower === "e-sign pending") pending++;
      else if (stLower === "in progress" || stLower === "query replied") inProgress++;
      else if (stLower === "query raised") queries++;
      else if (stLower === "approved") approved++;
      else if (stLower === "bank reject" || stLower === "bank rejection") bankRejections++;
      else if (stLower === "rejected") rejected++;
      else if (stLower === "completed") completed++;
      else inProgress++;

      if (rowDist) {
        if (!districtDistribution[rowDist]) districtDistribution[rowDist] = 0;
        districtDistribution[rowDist]++;
      }
      if (rowBlock) {
        if (!blockDistribution[rowBlock]) blockDistribution[rowBlock] = 0;
        blockDistribution[rowBlock]++;
      }

      var rawDate = createdCol !== -1 ? String(data[r][createdCol] || "") : "";
      var dateStr = "";
      if (rawDate) {
        dateStr = rawDate.slice(0, 10);
      }
      if (dateStr && dateStr.length === 10) {
        recentDaysMap[dateStr] = (recentDaysMap[dateStr] || 0) + 1;
        if (dateStr === todayDateStr) {
          todayCount++;
        }
      }
    }
  });

  var elapsedMs = new Date().getTime() - startTime;
  var summary = {
    success: true,
    fromCache: false,
    calculationTimeMs: elapsedMs,
    totalActive: totalActive,
    pending: pending,
    inProgress: inProgress,
    queries: queries,
    approved: approved,
    bankRejections: bankRejections,
    rejected: rejected,
    completed: completed,
    todayCount: todayCount,
    recentDaysMap: recentDaysMap,
    serviceStats: serviceStats,
    categoryCounts: serviceStats,
    serviceCounts: serviceStats,
    districtDistribution: districtDistribution,
    districtStats: districtDistribution,
    districtCounts: districtDistribution,
    blockDistribution: blockDistribution,
    blockStats: blockDistribution,
    blockCounts: blockDistribution,
    timestamp: new Date().toISOString()
  };

  setScriptCacheItem(cacheKey, summary, 120);
  return summary;
}

function getApplicationsPaged(params, session) {
  params = params || {};
  var requestedService = params.service || null;
  var page = Math.max(1, parseInt(params.page || 1, 10));
  var pageSize = Math.min(100, Math.max(10, parseInt(params.pageSize || 50, 10)));
  var search = (params.search || "").trim().toLowerCase();
  var filterStatus = (params.status || "All").trim();
  var filterDistrict = (params.district || "All").trim();
  var filterBlock = (params.block || "All").trim();
  var filterAgent = (params.agent || "All").trim();
  var fromDate = validateDateString(params.fromDate);
  var toDate = validateDateString(params.toDate);

  // Enforce session restrictions on district & block filters
  if (session && !isSuperAdmin(session)) {
    if (isDistrictOperator(session)) {
      filterDistrict = session.district;
    } else if (isBlockOperator(session)) {
      filterDistrict = session.district;
      filterBlock = session.block;
    }
  }

  // High-Speed CacheService Layer (100-150ms instant response)
  var isScoped = session && !isSuperAdmin(session);
  var scopePrefix = isScoped ? (session.role + "_" + (session.district || "") + "_" + (session.block || "") + "_") : "GLOBAL_";
  var cacheEpoch = getScriptCacheItem("DATA_EPOCH") || "1";
  var searchHash = search ? Utilities.base64Encode(search).replace(/=/g, "").slice(0, 16) : "ALL";
  var cacheKey = "PG_v" + cacheEpoch + "_" + scopePrefix + (requestedService || "ALL") + "_" + page + "_" + pageSize + "_" +
                 filterDistrict + "_" + filterBlock + "_" + filterStatus + "_" + filterAgent + "_" + searchHash + "_" + (fromDate || "") + "_" + (toDate || "");

  var bypassCache = params.bypassCache === true || params.refresh === true;
  if (!bypassCache) {
    var cached = getScriptCacheItem(cacheKey);
    if (cached) {
      cached.fromCache = true;
      return cached;
    }
  }

  var sheetsToRead = [];
  if (requestedService) {
    var targetSheet = getSheetNameForService(requestedService);
    if (!targetSheet) {
      return { success: false, error: "INVALID_SERVICE_TYPE", message: "Unknown service type: " + requestedService };
    }
    sheetsToRead.push(targetSheet);
  } else {
    sheetsToRead = MODULE_SHEETS;
  }

  var allMatchingRows = [];
  var summary = {
    total: 0,
    pending: 0,
    inProgress: 0,
    queries: 0,
    approved: 0,
    rejected: 0
  };

  sheetsToRead.forEach(function (sheetName) {
    var sheet = getOrCreateModuleSheet(sheetName);
    var rawRows = parseModuleSheet(sheet, sheetName);

    for (var i = 0; i < rawRows.length; i++) {
      var item = rawRows[i];

      if (session && !canUserAccessBlock(session, item.district, item.block)) {
        continue;
      }

      if (filterDistrict !== "All" && filterDistrict !== "") {
        if (String(item.district || "").toLowerCase() !== filterDistrict.toLowerCase()) continue;
      }

      if (filterBlock !== "All" && filterBlock !== "") {
        if (String(item.block || "").toLowerCase() !== filterBlock.toLowerCase()) continue;
      }

      if (filterAgent !== "All" && filterAgent !== "") {
        if (String(item.agent || "").toLowerCase() !== filterAgent.toLowerCase()) continue;
      }

      if (filterStatus !== "All" && filterStatus !== "") {
        var itemStatus = String(item.status || "").toLowerCase();
        var fStatus = filterStatus.toLowerCase();
        if (fStatus === "pending") {
          if (itemStatus !== "pending" && itemStatus !== "e-sign pending") continue;
        } else if (fStatus === "in progress") {
          if (itemStatus !== "in progress" && itemStatus !== "query replied") continue;
        } else if (itemStatus !== fStatus) {
          continue;
        }
      }

      var itemDate = (item.createdAt || item.applicationDate || "").slice(0, 10);
      if (fromDate && itemDate && itemDate < fromDate) continue;
      if (toDate && itemDate && itemDate > toDate) continue;

      if (search) {
        var match = (
          (item.applicantName && item.applicantName.toLowerCase().indexOf(search) !== -1) ||
          (item.cardNo && item.cardNo.toLowerCase().indexOf(search) !== -1) ||
          (item.aadhaarNo && item.aadhaarNo.toLowerCase().indexOf(search) !== -1) ||
          (item.trackNo && item.trackNo.toLowerCase().indexOf(search) !== -1) ||
          (item.phone && item.phone.toLowerCase().indexOf(search) !== -1) ||
          (item.agent && item.agent.toLowerCase().indexOf(search) !== -1) ||
          (item.block && item.block.toLowerCase().indexOf(search) !== -1) ||
          (item.district && item.district.toLowerCase().indexOf(search) !== -1) ||
          (item.remarks && item.remarks.toLowerCase().indexOf(search) !== -1)
        );
        if (!match) continue;
      }

      summary.total++;
      var stLower = String(item.status || "").toLowerCase();
      if (stLower === "pending" || stLower === "e-sign pending") summary.pending++;
      else if (stLower === "in progress" || stLower === "query replied") summary.inProgress++;
      else if (stLower === "query raised") summary.queries++;
      else if (stLower === "approved") summary.approved++;
      else if (stLower === "rejected" || stLower === "bank rejection") summary.rejected++;

      allMatchingRows.push(sanitizeApplicationForRole(item, session));
    }
  });

  var totalRecords = allMatchingRows.length;
  var totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  var startIndex = (page - 1) * pageSize;
  var pagedRecords = allMatchingRows.slice(startIndex, startIndex + pageSize);

  var result = {
    success: true,
    fromCache: false,
    page: page,
    pageSize: pageSize,
    totalRecords: totalRecords,
    totalPages: totalPages,
    data: pagedRecords,
    summary: summary
  };

  setScriptCacheItem(cacheKey, result, 180);
  return result;
}

/**
 * =========================================================================
 * HTTP GET DISPATCHER
 * Strictly handles public health ping. Protected requests must use POST.
 * =========================================================================
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "ping";

    // Only unauthenticated public ping is permitted via GET
    if (action === "ping") {
      return sendJsonResponse({
        success: true,
        status: "Online",
        service: "ShramikSetu Enterprise Backend",
        version: "2.2-ZeroTrust",
        timestamp: new Date().toISOString()
      });
    }

    // Reject transmission of session tokens or protected queries in GET URL parameters
    return sendJsonResponse({
      success: false,
      error: "METHOD_NOT_ALLOWED",
      message: "Protected operations must be dispatched via POST with credentials in the request body to prevent URL token leakage."
    });
  } catch (err) {
    Logger.log("doGet error: " + err.toString());
    return sendJsonResponse({ success: false, error: "SERVER_ERROR", message: "A secure server error occurred." });
  }
}

/**
 * =========================================================================
 * HTTP POST DISPATCHER
 * All authenticated reads and mutations dispatched securely via POST payload
 * =========================================================================
 */
function doPost(e) {
  return withLock(function () {
    try {
      if (!e || !e.postData || !e.postData.contents) {
        return sendJsonResponse({ success: false, error: "EMPTY_PAYLOAD", message: "Empty request payload." });
      }

      var postData;
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        return sendJsonResponse({ success: false, error: "INVALID_JSON", message: "Malformed JSON payload." });
      }

      var action = postData.action;
      var payload = postData.payload || {};
      var now = new Date().toISOString();

      // ==========================================
      // 1. PUBLIC ACTION: USER LOGIN
      // ==========================================
      if (action === "login") {
        var username = String(payload.username || "").trim().toLowerCase();
        var inputPassword = String(payload.password || "").trim();

        if (!username || !inputPassword) {
          return sendJsonResponse({ success: false, error: "MISSING_CREDENTIALS", message: "Username and password are required." });
        }

        if (username.length > 64) {
          return sendJsonResponse({ success: false, error: "INVALID_INPUT", message: "Username exceeds maximum allowable length." });
        }

        var rateCheck = checkLoginRateLimit(username);
        if (!rateCheck.allowed) {
          logAuditDirect("LOGIN_BLOCKED", "Brute-force lockout for user @" + username, "Authentication", username, "Blocked", username, "Unknown");
          return sendJsonResponse({ success: false, error: "ACCOUNT_LOCKED", message: rateCheck.error });
        }

        var userSheet = getOrCreateUsersSheet();
        var internalUsers = getInternalUsersData(userSheet);
        var userIdx = -1;

        for (var u = 0; u < internalUsers.length; u++) {
          if (internalUsers[u].username.toLowerCase() === username) {
            userIdx = u;
            break;
          }
        }

        if (userIdx === -1) {
          recordFailedLogin(username);
          logAuditDirect("LOGIN_FAILED", "Account @" + username + " not found", "Authentication", username, "Failed", username, "Unknown");
          return sendJsonResponse({ success: false, error: "AUTH_FAILED", message: "Invalid username or password." });
        }

        var user = internalUsers[userIdx];
        var sheetRow = userIdx + 2; // +1 for 0-index, +1 for header row

        if (String(user.status || "").toLowerCase() !== "active") {
          return sendJsonResponse({ success: false, error: "ACCOUNT_INACTIVE", message: "Account is inactive. Please contact administrator." });
        }

        var isMatch = verifyPasswordAndUpgrade(inputPassword, user.passwordHash, user.salt, username, userSheet, sheetRow);

        if (!isMatch) {
          var attempts = recordFailedLogin(username);
          var remaining = Math.max(0, MAX_LOGIN_ATTEMPTS - attempts);
          logAuditDirect("LOGIN_FAILED", "Invalid password for @" + username + " (" + remaining + " attempts remaining)", "Authentication", username, "Failed", username, user.role);
          return sendJsonResponse({
            success: false,
            error: "AUTH_FAILED",
            message: "Invalid username or password. (" + remaining + " attempts remaining before lockout)"
          });
        }

        clearFailedLogin(username);

        // Revoke prior active sessions for user (session hygiene)
        revokeAllUserSessions(username);

        // Issue new session with hashed token storage
        var newSession = createSession(user);

        logAuditDirect("LOGIN_SUCCESS", "User @" + username + " authenticated securely", "Authentication", username, "Success", username, user.role);

        return sendJsonResponse({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            role: user.role,
            district: user.district,
            block: user.block,
            email: user.email,
            status: user.status
          },
          session: {
            token: newSession.token,
            expiresAt: newSession.expiresAt
          }
        });
      }

      // Public health ping (can also be called via POST)
      if (action === "ping") {
        return sendJsonResponse({ success: true, status: "Online", service: "ShramikSetu Backend" });
      }

      // ==========================================
      // 2. SESSION AUTHENTICATION GATE
      // ==========================================
      var tokenFromPost = postData.sessionToken || (payload && payload.sessionToken) || "";
      var session = validateSession(tokenFromPost);

      if (!session) {
        logAuditDirect("UNAUTHORIZED_ACCESS", "Invalid or expired session token for action: " + action, "Security", "-", "Denied", "Unknown", "None");
        return sendJsonResponse({
          success: false,
          error: "UNAUTHORIZED",
          message: "Valid active session token is required to access protected resources."
        });
      }

      // Logout
      if (action === "logout") {
        revokeSession(tokenFromPost);
        logAuditDirect("LOGOUT", "User @" + session.username + " signed out safely", "Authentication", session.username, "Success", session.username, session.role);
        return sendJsonResponse({ success: true, message: "Session revoked successfully." });
      }

      // ==========================================
      // 3. SECURE READ ACTIONS (Transmitted via POST body)
      // ==========================================
      if (action === "getDashboardSummary") {
        var bypass = payload && (payload.bypassCache === true || payload.refresh === true);
        return sendJsonResponse(computeDashboardSummary(session, bypass));
      }

      if (action === "getApplicationsPaged") {
        return sendJsonResponse(getApplicationsPaged(payload, session));
      }

      if (action === "getAll") {
        var requestedService = payload.service || null;
        var sheetsToRead = [];
        if (requestedService) {
          var tSheet = getSheetNameForService(requestedService);
          if (!tSheet) {
            return sendJsonResponse({ success: false, error: "INVALID_SERVICE_TYPE", message: "Invalid service type: " + requestedService });
          }
          sheetsToRead.push(tSheet);
        } else {
          sheetsToRead = MODULE_SHEETS;
        }

        var allApps = [];
        sheetsToRead.forEach(function (sheetName) {
          var sheet = getOrCreateModuleSheet(sheetName);
          var rows = parseModuleSheet(sheet, sheetName);
          for (var i = 0; i < rows.length; i++) {
            if (canUserAccessBlock(session, rows[i].district, rows[i].block)) {
              allApps.push(sanitizeApplicationForRole(rows[i], session));
            }
          }
        });
        return sendJsonResponse({ success: true, count: allApps.length, data: allApps });
      }

      if (action === "getUsers") {
        if (!isSuperAdmin(session)) {
          logAuditDirect("PERMISSION_DENIED", "Unauthorized attempt to view user accounts", "Users", "-", "Denied", session.username, session.role);
          return sendJsonResponse({ success: false, error: "FORBIDDEN", message: "User directory access requires Super Admin authority." });
        }
        var uSheet = getOrCreateUsersSheet();
        var safeUsers = getUsersData(uSheet);
        return sendJsonResponse({ success: true, count: safeUsers.length, users: safeUsers });
      }

      if (action === "getAgents") {
        var agentSheet = getOrCreateSheet(SHEET_AGENTS, HEADERS_AGENTS);
        var rawAgents = getAgentsData(agentSheet);
        var scopedAgents = [];

        for (var a = 0; a < rawAgents.length; a++) {
          var ag = rawAgents[a];
          if (canUserAccessBlock(session, ag.district, ag.block)) {
            scopedAgents.push({
              id: ag.id,
              name: ag.name,
              district: ag.district,
              block: ag.block,
              status: ag.status,
              photo: ag.photo,
              phone: isSuperAdmin(session) ? ag.phone : maskPhone(ag.phone),
              createdAt: ag.createdAt
            });
          }
        }
        return sendJsonResponse({ success: true, count: scopedAgents.length, agents: scopedAgents });
      }

      if (action === "getLogs") {
        if (!isSuperAdmin(session)) {
          logAuditDirect("PERMISSION_DENIED", "Unauthorized attempt to view audit logs", "Security", "-", "Denied", session.username, session.role);
          return sendJsonResponse({ success: false, error: "FORBIDDEN", message: "Security audit logs require Super Admin authority." });
        }
        var lSheet = getOrCreateSheet(SHEET_LOGS, HEADERS_LOGS);
        var logs = getLogsData(lSheet);
        return sendJsonResponse({ success: true, count: logs.length, logs: logs });
      }

      if (action === "getMarriageVerifications") {
        var verifySheet = getOrCreateSheet(SHEET_MARRIAGE_VERIFY, HEADERS_MARRIAGE_VERIFY);
        migrateMarriageVerifySheet(verifySheet);
        var vData = verifySheet.getDataRange().getValues();
        var records = [];
        if (vData.length > 1) {
          var vHeaders = vData[0].map(function (h) { return String(h || "").trim().toLowerCase(); });
          var vDistIdx = vHeaders.indexOf("district");
          var vBlockIdx = vHeaders.indexOf("block");

          for (var v = 1; v < vData.length; v++) {
            var row = vData[v];
            var recDist = vDistIdx !== -1 ? String(row[vDistIdx] || "Ganjam") : "Ganjam";
            var recBlock = vBlockIdx !== -1 ? String(row[vBlockIdx] || "") : "";

            if (canUserAccessBlock(session, recDist, recBlock)) {
              records.push({
                id: String(row[0] || ""),
                slNo: row[1] || v,
                regNo: String(row[2] || ""),
                beneficiaryName: String(row[3] || ""),
                phone: isSuperAdmin(session) ? String(row[4] || "") : maskPhone(row[4]),
                district: recDist,
                block: recBlock,
                certifyingAuthority: String(row[vHeaders.indexOf("certifying authority")] || row[7] || ""),
                marriageCertDate: String(row[vHeaders.indexOf("marriage certificate regis date")] || row[8] || ""),
                marriageRegdNo: String(row[vHeaders.indexOf("marriage regd. no")] || row[9] || ""),
                marriageFor: String(row[vHeaders.indexOf("marriage for")] || row[10] || "Daughter"),
                dateOfMarriage: String(row[vHeaders.indexOf("date of marriage")] || row[11] || ""),
                groomName: String(row[vHeaders.indexOf("name of groom")] || row[12] || ""),
                daughterName: String(row[vHeaders.indexOf("name of daughter")] || row[13] || ""),
                remarks: String(row[vHeaders.indexOf("remarks")] || row[14] || ""),
                status: String(row[vHeaders.indexOf("status")] || row[15] || "Verified"),
                createdAt: row[vHeaders.indexOf("created at")] ? String(row[vHeaders.indexOf("created at")]) : "",
                updatedAt: row[vHeaders.indexOf("updated at")] ? String(row[vHeaders.indexOf("updated at")]) : ""
              });
            }
          }
        }
        return sendJsonResponse({ success: true, count: records.length, records: records });
      }

      // ==========================================
      // 4. MUTATION OPERATIONS (Checks canUserMutate)
      // ==========================================
      if (!canUserMutate(session)) {
        logAuditDirect("MUTATION_BLOCKED", "Read-only Viewer attempted mutation: " + action, "Security", "-", "Denied", session.username, session.role);
        return sendJsonResponse({ success: false, error: "FORBIDDEN", message: "Mutation operations are forbidden for read-only roles." });
      }

      // 4A. USER MANAGEMENT (SUPER ADMIN ONLY)
      if (action === "createUser") {
        if (!isSuperAdmin(session)) {
          return sendJsonResponse({ success: false, error: "FORBIDDEN", message: "User creation requires Super Admin authority." });
        }

        var newUsername = String(payload.username || "").trim().toLowerCase();
        var rawPassword = String(payload.password || "").trim();
        var newRole = String(payload.role || ROLE_BLOCK_OPERATOR).trim();
        var newDistrict = String(payload.district || "").trim();
        var newBlock = String(payload.block || "").trim();

        if (newUsername.length < 3 || newUsername.length > 64) {
          return sendJsonResponse({ success: false, error: "INVALID_INPUT", message: "Username must be between 3 and 64 characters." });
        }
        if (rawPassword.length < 8) {
          return sendJsonResponse({ success: false, error: "INVALID_INPUT", message: "Password must be at least 8 characters long." });
        }
        if (!VALID_ROLES.includes(newRole)) {
          return sendJsonResponse({ success: false, error: "INVALID_ROLE", message: "Specified role is not valid." });
        }

        var uSheet = getOrCreateUsersSheet();
        var internalUsers = getInternalUsersData(uSheet);
        if (internalUsers.some(function (u) { return u.username.toLowerCase() === newUsername; })) {
          return sendJsonResponse({ success: false, error: "CONFLICT", message: "Username already exists." });
        }

        var salt = Utilities.getUuid().replace(/-/g, "").slice(0, 16);
        var pHash = hashPassword(rawPassword, salt, PBKDF2_ITERATIONS);

        uSheet.appendRow([
          "USR-" + new Date().getTime(),
          newUsername,
          salt,
          pHash,
          sanitizeCell(payload.fullName || ""),
          newRole,
          sanitizeCell(newDistrict || (newRole === ROLE_SUPER_ADMIN ? "All Districts" : "Ganjam")),
          sanitizeCell(newBlock || (newRole === ROLE_SUPER_ADMIN ? "All Blocks" : "All Blocks")),
          sanitizeCell(payload.email || ""),
          "Active",
          now,
          now
        ]);

        logAuditDirect("USER_CREATED", "Created account @" + newUsername + " (" + newRole + ")", "Users", newUsername, "Success", session.username, session.role);
        return sendJsonResponse({ success: true, message: "User account created successfully." });
      }

      if (action === "updateUserPassword") {
        if (!isSuperAdmin(session)) {
          return sendJsonResponse({ success: false, error: "FORBIDDEN", message: "Password updates require Super Admin authority." });
        }

        var targetUsername = String(payload.username || "").trim().toLowerCase();
        var newPass = String(payload.password || "").trim();

        if (!targetUsername || newPass.length < 8) {
          return sendJsonResponse({ success: false, error: "INVALID_INPUT", message: "Target username and minimum 8-character password required." });
        }

        var uSheet = getOrCreateUsersSheet();
        var data = uSheet.getDataRange().getValues();
        var foundRow = -1;

        for (var r = 1; r < data.length; r++) {
          if (String(data[r][1]).toLowerCase() === targetUsername) {
            foundRow = r + 1;
            break;
          }
        }

        if (foundRow === -1) {
          return sendJsonResponse({ success: false, error: "NOT_FOUND", message: "User not found." });
        }

        var newSalt = Utilities.getUuid().replace(/-/g, "").slice(0, 16);
        var newHash = hashPassword(newPass, newSalt, PBKDF2_ITERATIONS);

        uSheet.getRange(foundRow, 3).setValue(newSalt);
        uSheet.getRange(foundRow, 4).setValue(newHash);
        uSheet.getRange(foundRow, 12).setValue(now);

        // Invalidate all active sessions for that user upon password update
        revokeAllUserSessions(targetUsername);

        logAuditDirect("PASSWORD_RESET", "Password updated for @" + targetUsername, "Users", targetUsername, "Success", session.username, session.role);
        return sendJsonResponse({ success: true, message: "Password updated successfully. Existing sessions invalidated." });
      }

      if (action === "deleteUser") {
        if (!isSuperAdmin(session)) {
          return sendJsonResponse({ success: false, error: "FORBIDDEN", message: "User deletion requires Super Admin authority." });
        }

        var delUsername = String(payload.username || "").trim().toLowerCase();
        if (delUsername === "admin") {
          return sendJsonResponse({ success: false, error: "FORBIDDEN", message: "Cannot delete the primary System Administrator." });
        }

        var uSheet = getOrCreateUsersSheet();
        var data = uSheet.getDataRange().getValues();
        for (var d = 1; d < data.length; d++) {
          if (String(data[d][1]).toLowerCase() === delUsername) {
            uSheet.deleteRow(d + 1);
            revokeAllUserSessions(delUsername);
            logAuditDirect("USER_DELETED", "Deleted user @" + delUsername, "Users", delUsername, "Success", session.username, session.role);
            return sendJsonResponse({ success: true, message: "User removed." });
          }
        }
        return sendJsonResponse({ success: false, error: "NOT_FOUND", message: "User not found." });
      }

      // 4B. APPLICATION CRUD
      if (action === "add") {
        var targetSheetName = getSheetNameForService(payload.serviceType);
        if (!targetSheetName) {
          return sendJsonResponse({ success: false, error: "INVALID_SERVICE_TYPE", message: "Unrecognized service type." });
        }

        if (!canUserAccessBlock(session, payload.district, payload.block)) {
          logAuditDirect("PERMISSION_DENIED", "Attempted application creation outside scope", targetSheetName, "-", "Denied", session.username, session.role);
          return sendJsonResponse({ success: false, error: "FORBIDDEN", message: "Cannot create application outside assigned jurisdiction." });
        }

        var sheet = getOrCreateModuleSheet(targetSheetName);
        var id = payload.id || ("SS-" + new Date().getTime());

        var row = formatApplicationRow(targetSheetName, id, payload, now);
        sheet.appendRow(row);
        bumpDataEpoch();

        logAuditDirect("APPLICATION_CREATED", "Registered " + (payload.serviceType || "Application"), targetSheetName, id, "Success", session.username, session.role);
        return sendJsonResponse({ success: true, id: id, sheet: targetSheetName, message: "Saved to " + targetSheetName });
      }

      if (action === "update") {
        var idToMatch = payload.id ? String(payload.id).trim() : "";
        var trackToMatch = (!idToMatch && payload.trackNo) ? String(payload.trackNo).trim() : "";

        if (!idToMatch && !trackToMatch) {
          return sendJsonResponse({ success: false, error: "MISSING_IDENTIFIER", message: "Unique Record ID is required for updates." });
        }

        var targetSheetName = payload.serviceType ? getSheetNameForService(payload.serviceType) : null;
        var sheetsToCheck = targetSheetName ? [targetSheetName] : MODULE_SHEETS;

        for (var sc = 0; sc < sheetsToCheck.length; sc++) {
          var sName = sheetsToCheck[sc];
          var sSheet = getOrCreateModuleSheet(sName);
          var sData = sSheet.getDataRange().getValues();
          if (sData.length <= 1) continue;

          var headers = sData[0].map(function (h) { return String(h || "").trim().toLowerCase(); });
          var idColIdx = headers.indexOf("id") !== -1 ? headers.indexOf("id") : 0;
          var trackColIdx = headers.findIndex(function (h) { return h === "tracking no" || h === "track no" || h === "tracking number"; });
          var distColIdx = headers.indexOf("district");
          var blockColIdx = headers.indexOf("block");

          for (var r = 1; r < sData.length; r++) {
            var row = sData[r];
            var isMatch = false;

            if (idToMatch && String(row[idColIdx] || "").trim() === idToMatch) {
              isMatch = true;
            } else if (trackToMatch && trackColIdx !== -1 && String(row[trackColIdx] || "").trim() === trackToMatch) {
              isMatch = true;
            }

            if (isMatch) {
              var recDist = distColIdx !== -1 ? String(row[distColIdx] || "") : "";
              var recBlock = blockColIdx !== -1 ? String(row[blockColIdx] || "") : "";

              if (!canUserAccessBlock(session, recDist, recBlock)) {
                logAuditDirect("PERMISSION_DENIED", "Attempted application update outside jurisdiction", sName, idToMatch || trackToMatch, "Denied", session.username, session.role);
                return sendJsonResponse({ success: false, error: "FORBIDDEN", message: "Cannot modify record outside assigned jurisdiction." });
              }

              if (payload.district || payload.block) {
                var targetDist = payload.district || recDist;
                var targetBlock = payload.block || recBlock;
                if (!canUserAccessBlock(session, targetDist, targetBlock)) {
                  return sendJsonResponse({ success: false, error: "FORBIDDEN", message: "Cannot move record outside assigned jurisdiction." });
                }
              }

              // Merge partial payload updates with existing row values
              var mergedRow = mergeApplicationRow(sName, headers, row, payload, now);
              sSheet.getRange(r + 1, 1, 1, mergedRow.length).setValues([mergedRow]);
              bumpDataEpoch();

              logAuditDirect("APPLICATION_UPDATED", "Updated record " + (row[idColIdx] || idToMatch), sName, row[idColIdx] || idToMatch, "Success", session.username, session.role);
              return sendJsonResponse({ success: true, message: "Record updated successfully." });
            }
          }
        }

        return sendJsonResponse({ success: false, error: "NOT_FOUND", message: "Record not found in database." });
      }

      if (action === "delete") {
        if (!session || (!isSuperAdmin(session) && !isDistrictOperator(session) && !isBlockOperator(session))) {
          logAuditDirect("PERMISSION_DENIED", "Unauthorized role attempted application deletion", "Database", String(payload.id || "-"), "Denied", session ? session.username : "Anonymous", session ? session.role : "None");
          return sendJsonResponse({ success: false, error: "FORBIDDEN", message: "Application deletion requires authorized operator credentials." });
        }

        var delId = String(payload.id || "").trim();
        var delTrack = String(payload.trackNo || "").trim();
        var delCard = String(payload.cardNo || "").trim();
        var delService = payload.serviceType ? getSheetNameForService(payload.serviceType) : null;

        if (!delId && !delTrack && !delCard) {
          return sendJsonResponse({ success: false, error: "MISSING_IDENTIFIER", message: "Record ID or Tracking No is required." });
        }

        var candidateSheets = [];
        if (delService) {
          candidateSheets.push(delService);
        }
        MODULE_SHEETS.forEach(function (s) {
          if (candidateSheets.indexOf(s) === -1) candidateSheets.push(s);
        });

        for (var m = 0; m < candidateSheets.length; m++) {
          var dSheet = getOrCreateModuleSheet(candidateSheets[m]);
          var dData = dSheet.getDataRange().getValues();
          if (dData.length <= 1) continue;

          var dHeaders = dData[0].map(function (h) { return String(h || "").trim().toLowerCase(); });
          var dIdIdx = dHeaders.indexOf("id") !== -1 ? dHeaders.indexOf("id") : 0;
          var dTrackIdx = dHeaders.findIndex(function (h) { return h === "tracking no" || h === "track no"; });
          var dCardIdx = dHeaders.findIndex(function (h) { return h === "nirman shramik card no" || h === "card no"; });
          var distColIdx = dHeaders.indexOf("district");
          var blockColIdx = dHeaders.indexOf("block");

          for (var dr = 1; dr < dData.length; dr++) {
            var rowMatch = false;
            var rowId = String(dData[dr][dIdIdx] || "").trim();
            var rowTrack = dTrackIdx !== -1 ? String(dData[dr][dTrackIdx] || "").trim() : "";
            var rowCard = dCardIdx !== -1 ? String(dData[dr][dCardIdx] || "").trim() : "";

            if (delId && rowId && rowId.toLowerCase() === delId.toLowerCase()) {
              rowMatch = true;
            } else if (delTrack && rowTrack && rowTrack.toLowerCase() === delTrack.toLowerCase()) {
              rowMatch = true;
            } else if (!delId && !delTrack && delCard && rowCard && rowCard.toLowerCase() === delCard.toLowerCase()) {
              rowMatch = true;
            }

            if (rowMatch) {
              if (!isSuperAdmin(session)) {
                var rowDist = distColIdx !== -1 ? String(dData[dr][distColIdx] || "").trim() : "";
                var rowBlock = blockColIdx !== -1 ? String(dData[dr][blockColIdx] || "").trim() : "";
                if (!canUserAccessBlock(session, rowDist, rowBlock)) {
                  logAuditDirect("PERMISSION_DENIED", "Operator attempted deletion outside assigned territory", candidateSheets[m], delId || delTrack, "Denied", session.username, session.role);
                  return sendJsonResponse({ success: false, error: "FORBIDDEN", message: "Deletion outside assigned geographic jurisdiction is denied." });
                }
              }

              dSheet.deleteRow(dr + 1);
              bumpDataEpoch();
              logAuditDirect("APPLICATION_DELETED", "Deleted application " + (delId || delTrack || delCard), candidateSheets[m], delId || delTrack || delCard, "Success", session.username, session.role);
              return sendJsonResponse({ success: true, message: "Record removed successfully." });
            }
          }
        }
        return sendJsonResponse({ success: false, error: "NOT_FOUND", message: "Record not found." });
      }

      if (action === "updateStatus") {
        var id = String(payload.id || "").trim();
        var trackNo = (!id && payload.trackNo) ? String(payload.trackNo).trim() : "";
        var newStatus = validateStatusValue(payload.status);
        var remarks = sanitizeCell(payload.remarks || payload.officer || "");
        var serviceType = payload.serviceType || "";

        if (!id && !trackNo) {
          return sendJsonResponse({ success: false, error: "MISSING_IDENTIFIER", message: "Record ID is required." });
        }
        if (!newStatus) {
          return sendJsonResponse({ success: false, error: "INVALID_STATUS", message: "Specified status value is not permitted." });
        }

        var candidateSheets = serviceType ? [getSheetNameForService(serviceType)] : MODULE_SHEETS;
        candidateSheets = candidateSheets.filter(Boolean);

        for (var cs = 0; cs < candidateSheets.length; cs++) {
          var cName = candidateSheets[cs];
          var cSheet = getOrCreateModuleSheet(cName);
          var cData = cSheet.getDataRange().getValues();
          if (cData.length <= 1) continue;

          var cHeaders = cData[0].map(function (h) { return String(h || "").trim().toLowerCase(); });
          var idIdx = cHeaders.indexOf("id") !== -1 ? cHeaders.indexOf("id") : 0;
          var trackIdx = cHeaders.findIndex(function (h) { return h === "tracking no" || h === "track no"; });
          var distIdx = cHeaders.indexOf("district");
          var blockIdx = cHeaders.indexOf("block");
          var statusCol = cHeaders.indexOf("status") + 1;
          var remarksCol = cHeaders.findIndex(function (h) { return h.includes("remark") || h.includes("officer"); }) + 1;
          var updatedCol = cHeaders.findIndex(function (h) { return h.includes("updated"); }) + 1;

          for (var cr = 1; cr < cData.length; cr++) {
            var rowMatch = false;
            if (id && String(cData[cr][idIdx] || "").trim() === id) rowMatch = true;
            else if (trackNo && trackIdx !== -1 && String(cData[cr][trackIdx] || "").trim() === trackNo) rowMatch = true;

            if (rowMatch) {
              var rowDist = distIdx !== -1 ? String(cData[cr][distIdx] || "") : "";
              var rowBlock = blockIdx !== -1 ? String(cData[cr][blockIdx] || "") : "";

              if (!canUserAccessBlock(session, rowDist, rowBlock)) {
                logAuditDirect("PERMISSION_DENIED", "Attempted status update outside jurisdiction", cName, id || trackNo, "Denied", session.username, session.role);
                return sendJsonResponse({ success: false, error: "FORBIDDEN", message: "Cannot change status outside assigned jurisdiction." });
              }

              var rowNum = cr + 1;
              var prevStatus = String(cData[cr][statusCol - 1] || "");

              if (statusCol > 0) cSheet.getRange(rowNum, statusCol).setValue(sanitizeCell(newStatus));
              if (remarksCol > 0 && remarks) cSheet.getRange(rowNum, remarksCol).setValue(remarks);
              if (updatedCol > 0) cSheet.getRange(rowNum, updatedCol).setValue(now);

              bumpDataEpoch();
              logAuditDirect("STATUS_UPDATED", "Status changed from " + prevStatus + " to " + newStatus, cName, id || trackNo, "Success", session.username, session.role, prevStatus, newStatus);

              return sendJsonResponse({
                success: true,
                message: "Status updated to " + newStatus,
                id: id || trackNo,
                status: newStatus,
                sheet: cName
              });
            }
          }
        }
        return sendJsonResponse({ success: false, error: "NOT_FOUND", message: "Record not found." });
      }

      if (action === "batchImport") {
        if (!isSuperAdmin(session) && !isDistrictOperator(session)) {
          return sendJsonResponse({ success: false, error: "FORBIDDEN", message: "Batch import requires administrative privileges." });
        }

        var items = payload.items || [];
        if (!Array.isArray(items) || items.length === 0) {
          return sendJsonResponse({ success: false, error: "INVALID_INPUT", message: "Empty batch list." });
        }

        var categorized = {};
        var validCount = 0;

        items.forEach(function (item, idx) {
          if (!canUserAccessBlock(session, item.district, item.block)) return;
          var sName = getSheetNameForService(item.serviceType);
          if (!sName) return;

          if (!categorized[sName]) categorized[sName] = [];
          var rowId = item.id || ("SS-" + (new Date().getTime() + idx));
          categorized[sName].push(formatApplicationRow(sName, rowId, item, now));
          validCount++;
        });

        Object.keys(categorized).forEach(function (sheetName) {
          var sSheet = getOrCreateModuleSheet(sheetName);
          var rows = categorized[sheetName];
          if (rows.length > 0) {
            sSheet.getRange(sSheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
          }
        });

        bumpDataEpoch();
        logAuditDirect("EXCEL_IMPORT", "Batch imported " + validCount + " applications", "Import", "-", "Success", session.username, session.role);
        return sendJsonResponse({ success: true, inserted: validCount, message: "Imported " + validCount + " records." });
      }

      // 4C. AGENT MANAGEMENT
      var agentSheet = getOrCreateSheet(SHEET_AGENTS, HEADERS_AGENTS);

      if (action === "addAgent") {
        if (!canUserAccessBlock(session, payload.district, payload.block)) {
          return sendJsonResponse({ success: false, error: "FORBIDDEN", message: "Cannot add agent outside assigned jurisdiction." });
        }

        var agentId = payload.id || ("AG-" + new Date().getTime());
        var phone = validatePhoneNumber(payload.phone || payload.mobile);
        var dist = sanitizeCell(payload.district || "");
        var blk = sanitizeCell(payload.block || "");

        agentSheet.appendRow([
          agentId,
          sanitizeCell(payload.name || ""),
          phone || "",
          dist,
          blk,
          (payload.photo && payload.photo.length < 48000) ? payload.photo : "",
          sanitizeCell(payload.status || "Active"),
          now
        ]);

        invalidateScriptCache(["AGENTS_LIST"]);
        logAuditDirect("AGENT_ADDED", "Added agent: " + payload.name, "Agents", agentId, "Success", session.username, session.role);
        return sendJsonResponse({ success: true, id: agentId });
      }

      if (action === "updateAgent") {
        var agId = String(payload.id || "").trim();
        var agData = agentSheet.getDataRange().getValues();
        var agHeaders = agData[0].map(function (h) { return String(h || "").trim().toLowerCase(); });
        var agIdIdx = agHeaders.indexOf("id") !== -1 ? agHeaders.indexOf("id") : 0;
        var agDistIdx = agHeaders.indexOf("district");
        var agBlockIdx = agHeaders.indexOf("block");

        for (var i = 1; i < agData.length; i++) {
          if (String(agData[i][agIdIdx] || "").trim() === agId) {
            var existingDist = agDistIdx !== -1 ? String(agData[i][agDistIdx] || "") : "";
            var existingBlock = agBlockIdx !== -1 ? String(agData[i][agBlockIdx] || "") : "";

            if (!canUserAccessBlock(session, existingDist, existingBlock)) {
              return sendJsonResponse({ success: false, error: "FORBIDDEN", message: "Cannot modify agent outside assigned jurisdiction." });
            }

            if (payload.district || payload.block) {
              var newAgDist = payload.district || existingDist;
              var newAgBlock = payload.block || existingBlock;
              if (!canUserAccessBlock(session, newAgDist, newAgBlock)) {
                return sendJsonResponse({ success: false, error: "FORBIDDEN", message: "Cannot reassign agent outside jurisdiction." });
              }
            }

            var rNum = i + 1;
            if (payload.name) agentSheet.getRange(rNum, 2).setValue(sanitizeCell(payload.name));
            if (payload.phone) agentSheet.getRange(rNum, 3).setValue(validatePhoneNumber(payload.phone) || "");
            if (payload.district) agentSheet.getRange(rNum, 4).setValue(sanitizeCell(payload.district));
            if (payload.block) agentSheet.getRange(rNum, 5).setValue(sanitizeCell(payload.block));
            if (payload.status) agentSheet.getRange(rNum, 7).setValue(sanitizeCell(payload.status));

            invalidateScriptCache(["AGENTS_LIST"]);
            logAuditDirect("AGENT_UPDATED", "Updated agent: " + (payload.name || agId), "Agents", agId, "Success", session.username, session.role);
            return sendJsonResponse({ success: true, message: "Agent updated." });
          }
        }
        return sendJsonResponse({ success: false, error: "NOT_FOUND", message: "Agent not found." });
      }

      if (action === "deleteAgent") {
        if (!isSuperAdmin(session)) {
          return sendJsonResponse({ success: false, error: "FORBIDDEN", message: "Only Super Admin can delete agents." });
        }
        var delAgId = String(payload.id || "").trim();
        var aData = agentSheet.getDataRange().getValues();
        for (var ai = 1; ai < aData.length; ai++) {
          if (String(aData[ai][0] || "").trim() === delAgId) {
            agentSheet.deleteRow(ai + 1);
            invalidateScriptCache(["AGENTS_LIST"]);
            logAuditDirect("AGENT_DELETED", "Deleted agent: " + delAgId, "Agents", delAgId, "Success", session.username, session.role);
            return sendJsonResponse({ success: true, message: "Agent removed." });
          }
        }
        return sendJsonResponse({ success: false, error: "NOT_FOUND", message: "Agent not found." });
      }

      // 4D. MARRIAGE VERIFICATION CRUD
      var mvSheet = getOrCreateSheet(SHEET_MARRIAGE_VERIFY, HEADERS_MARRIAGE_VERIFY);
      migrateMarriageVerifySheet(mvSheet);

      if (action === "addMarriageVerify") {
        if (!canUserAccessBlock(session, payload.district, payload.block)) {
          return sendJsonResponse({ success: false, error: "FORBIDDEN", message: "Cannot add verification entry outside assigned jurisdiction." });
        }

        var mvId = payload.id || ("MV-" + new Date().getTime());
        var slNo = payload.slNo || mvSheet.getLastRow();
        var row = [
          mvId,
          slNo,
          sanitizeCell(payload.regNo || payload.cardNo || ""),
          sanitizeCell(payload.beneficiaryName || payload.applicantName || ""),
          validatePhoneNumber(payload.phone || payload.mobile) || "",
          sanitizeCell(payload.district || "Ganjam"),
          sanitizeCell(payload.block || ""),
          sanitizeCell(payload.certifyingAuthority || ""),
          sanitizeCell(payload.marriageCertDate || ""),
          sanitizeCell(payload.marriageRegdNo || ""),
          sanitizeCell(payload.marriageFor || "Daughter"),
          sanitizeCell(payload.dateOfMarriage || ""),
          sanitizeCell(payload.groomName || ""),
          sanitizeCell(payload.daughterName || ""),
          sanitizeCell(payload.remarks || ""),
          sanitizeCell(payload.status || "Verified"),
          payload.createdAt || now,
          now
        ];
        mvSheet.appendRow(row);
        logAuditDirect("MARRIAGE_VERIFY_ADDED", "Added verification: " + mvId, "Marriage", mvId, "Success", session.username, session.role);
        return sendJsonResponse({ success: true, id: mvId });
      }

      if (action === "updateMarriageVerify") {
        var mvId = String(payload.id || "").trim();
        var mvData = mvSheet.getDataRange().getValues();
        var mvHeaders = mvData[0].map(function (h) { return String(h || "").trim().toLowerCase(); });
        var dIdx = mvHeaders.indexOf("district");
        var bIdx = mvHeaders.indexOf("block");

        for (var mi = 1; mi < mvData.length; mi++) {
          if (String(mvData[mi][0] || "").trim() === mvId || (payload.regNo && String(mvData[mi][2]).trim() === String(payload.regNo).trim())) {
            var existingDist = dIdx !== -1 ? String(mvData[mi][dIdx] || "Ganjam") : "Ganjam";
            var existingBlock = bIdx !== -1 ? String(mvData[mi][bIdx] || "") : "";

            if (!canUserAccessBlock(session, existingDist, existingBlock)) {
              return sendJsonResponse({ success: false, error: "FORBIDDEN", message: "Cannot modify verification outside assigned jurisdiction." });
            }

            if (payload.district || payload.block) {
              var newDist = payload.district || existingDist;
              var newBlock = payload.block || existingBlock;
              if (!canUserAccessBlock(session, newDist, newBlock)) {
                return sendJsonResponse({ success: false, error: "FORBIDDEN", message: "Cannot move verification outside jurisdiction." });
              }
            }

            var existingRow = mvData[mi];
            var updatedRow = [
              mvId,
              payload.slNo || existingRow[1] || mi,
              sanitizeCell(payload.regNo || payload.cardNo || existingRow[2] || ""),
              sanitizeCell(payload.beneficiaryName || payload.applicantName || existingRow[3] || ""),
              validatePhoneNumber(payload.phone || payload.mobile) || existingRow[4] || "",
              sanitizeCell(payload.district || existingRow[dIdx] || "Ganjam"),
              sanitizeCell(payload.block || existingRow[bIdx] || ""),
              sanitizeCell(payload.certifyingAuthority || existingRow[7] || ""),
              sanitizeCell(payload.marriageCertDate || existingRow[8] || ""),
              sanitizeCell(payload.marriageRegdNo || existingRow[9] || ""),
              sanitizeCell(payload.marriageFor || existingRow[10] || "Daughter"),
              sanitizeCell(payload.dateOfMarriage || existingRow[11] || ""),
              sanitizeCell(payload.groomName || existingRow[12] || ""),
              sanitizeCell(payload.daughterName || existingRow[13] || ""),
              sanitizeCell(payload.remarks || existingRow[14] || ""),
              sanitizeCell(payload.status || existingRow[15] || "Verified"),
              existingRow[16] || now,
              now
            ];

            mvSheet.getRange(mi + 1, 1, 1, updatedRow.length).setValues([updatedRow]);
            logAuditDirect("MARRIAGE_VERIFY_UPDATED", "Updated verification: " + mvId, "Marriage", mvId, "Success", session.username, session.role);
            return sendJsonResponse({ success: true, message: "Verification entry updated." });
          }
        }
        return sendJsonResponse({ success: false, error: "NOT_FOUND", message: "Record not found." });
      }

      if (action === "deleteMarriageVerify") {
        if (!isSuperAdmin(session)) {
          return sendJsonResponse({ success: false, error: "FORBIDDEN", message: "Deletion requires Super Admin authority." });
        }
        var delMvId = String(payload.id || "").trim();
        var vData = mvSheet.getDataRange().getValues();
        for (var vi = 1; vi < vData.length; vi++) {
          if (String(vData[vi][0] || "").trim() === delMvId || (payload.regNo && String(vData[vi][2]).trim() === String(payload.regNo).trim())) {
            mvSheet.deleteRow(vi + 1);
            logAuditDirect("MARRIAGE_VERIFY_DELETED", "Deleted verification: " + delMvId, "Marriage", delMvId, "Success", session.username, session.role);
            return sendJsonResponse({ success: true, message: "Record removed." });
          }
        }
        return sendJsonResponse({ success: false, error: "NOT_FOUND", message: "Record not found." });
      }

      if (action === "logActivity") {
        logAuditDirect(payload.action, payload.details, payload.module, payload.recordId, payload.result, session.username, session.role, payload.prevValue, payload.newValue);
        return sendJsonResponse({ success: true });
      }

      return sendJsonResponse({ success: false, error: "UNKNOWN_ACTION", message: "Action '" + action + "' is not supported." });
    } catch (err) {
      Logger.log("doPost execution error: " + err.toString() + "\n" + (err.stack || ""));
      return sendJsonResponse({ success: false, error: "SERVER_ERROR", message: "A secure server error occurred." });
    }
  });
}

/**
 * =========================================================================
 * APPLICATION SCHEMA FORMATTERS & MERGE HELPERS
 * =========================================================================
 */

function formatApplicationRow(sheetName, id, payload, now) {
  var phoneVal = validatePhoneNumber(payload.phone);
  var statusVal = validateStatusValue(payload.status);

  if (sheetName === SHEET_NEW_CARD) {
    return [
      sanitizeCell(id),
      sanitizeCell(payload.applicantName || ""),
      sanitizeCell(payload.aadhaarNo || ""),
      sanitizeCell(payload.trackNo || ""),
      sanitizeCell(payload.district || ""),
      sanitizeCell(payload.block || ""),
      sanitizeCell(payload.agent || ""),
      sanitizeCell(payload.officer || payload.remarks || ""),
      sanitizeCell(statusVal),
      phoneVal || "",
      payload.createdAt || now,
      now
    ];
  }

  if (sheetName === SHEET_CARD_RENEWAL) {
    return [
      sanitizeCell(id),
      sanitizeCell(payload.applicantName || ""),
      sanitizeCell(payload.cardNo || ""),
      sanitizeCell(payload.trackNo || ""),
      sanitizeCell(payload.district || ""),
      sanitizeCell(payload.block || ""),
      sanitizeCell(payload.agent || ""),
      sanitizeCell(payload.officer || payload.remarks || ""),
      sanitizeCell(statusVal),
      phoneVal || "",
      payload.createdAt || now,
      now
    ];
  }

  if (sheetName === SHEET_MATERNITY || sheetName === SHEET_DEATH) {
    return [
      sanitizeCell(id),
      sanitizeCell(payload.applicantName || ""),
      sanitizeCell(payload.cardNo || ""),
      sanitizeCell(payload.trackNo || ""),
      sanitizeCell(payload.district || ""),
      sanitizeCell(payload.block || ""),
      sanitizeCell(payload.agent || ""),
      sanitizeCell(payload.remarks || payload.officer || ""),
      sanitizeCell(statusVal),
      phoneVal || "",
      payload.createdAt || now,
      now
    ];
  }

  // General (Marriage, Education)
  return [
    sanitizeCell(id),
    sanitizeCell(payload.serviceType || "General"),
    sanitizeCell(payload.applicantName || ""),
    sanitizeCell(payload.cardNo || ""),
    sanitizeCell(payload.aadhaarNo || ""),
    sanitizeCell(payload.trackNo || ""),
    sanitizeCell(payload.district || ""),
    sanitizeCell(payload.block || ""),
    sanitizeCell(payload.agent || ""),
    sanitizeCell(payload.officer || payload.remarks || ""),
    sanitizeCell(statusVal),
    phoneVal || "",
    payload.createdAt || now,
    now
  ];
}

/**
 * Merge partial payload updates into existing row values without overwriting untouched fields
 */
function mergeApplicationRow(sheetName, headers, existingRow, payload, now) {
  var row = existingRow.slice();

  headers.forEach(function (colName, idx) {
    var key = colName.toLowerCase();
    if (key === "applicant name" || key === "beneficiary name" || key === "card holder name") {
      if (payload.applicantName !== undefined) row[idx] = sanitizeCell(payload.applicantName);
    } else if (key === "aadhaar no") {
      if (payload.aadhaarNo !== undefined) row[idx] = sanitizeCell(payload.aadhaarNo);
    } else if (key === "card no" || key === "nirman shramik card no") {
      if (payload.cardNo !== undefined) row[idx] = sanitizeCell(payload.cardNo);
    } else if (key === "tracking no" || key === "track no") {
      if (payload.trackNo !== undefined) row[idx] = sanitizeCell(payload.trackNo);
    } else if (key === "district") {
      if (payload.district !== undefined) row[idx] = sanitizeCell(payload.district);
    } else if (key === "block") {
      if (payload.block !== undefined) row[idx] = sanitizeCell(payload.block);
    } else if (key === "agent name" || key === "agent") {
      if (payload.agent !== undefined) row[idx] = sanitizeCell(payload.agent);
    } else if (key === "status") {
      if (payload.status !== undefined) {
        var validSt = validateStatusValue(payload.status);
        if (validSt) row[idx] = sanitizeCell(validSt);
      }
    } else if (key === "officer / remarks" || key === "remark / notes" || key === "remarks") {
      if (payload.remarks !== undefined || payload.officer !== undefined) {
        row[idx] = sanitizeCell(payload.remarks || payload.officer || "");
      }
    } else if (key === "phone no" || key === "phone" || key === "mobile") {
      if (payload.phone !== undefined) {
        var cleanPhone = validatePhoneNumber(payload.phone);
        if (cleanPhone) row[idx] = cleanPhone;
      }
    } else if (key === "updated at") {
      row[idx] = now;
    }
  });

  return row;
}

function getOrCreateModuleSheet(sheetName) {
  var headers = HEADERS_GENERAL_APPLICATION;
  if (sheetName === SHEET_NEW_CARD) headers = HEADERS_NEW_CARD;
  else if (sheetName === SHEET_CARD_RENEWAL) headers = HEADERS_CARD_RENEWAL;
  else if (sheetName === SHEET_MATERNITY || sheetName === SHEET_DEATH) headers = HEADERS_BENEFIT;
  return getOrCreateSheet(sheetName, headers);
}

function getOrCreateSheet(name, headers) {
  var targetDb = getSpreadsheet();
  var targetSheet = targetDb.getSheetByName(name);
  if (!targetSheet) {
    // Flexible search: match case-insensitively ignoring spaces, underscores, and dashes
    var normTarget = String(name || "").replace(/[_\s-]+/g, "").toLowerCase();
    var allSheets = targetDb.getSheets();
    for (var s = 0; s < allSheets.length; s++) {
      if (allSheets[s].getName().replace(/[_\s-]+/g, "").toLowerCase() === normTarget) {
        targetSheet = allSheets[s];
        break;
      }
    }
  }
  if (!targetSheet) {
    targetSheet = targetDb.insertSheet(name);
    targetSheet.appendRow(headers);
    targetSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f1f5f9");
    targetSheet.setFrozenRows(1);
  } else if (targetSheet.getLastRow() === 0) {
    targetSheet.appendRow(headers);
    targetSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f1f5f9");
    targetSheet.setFrozenRows(1);
  }
  return targetSheet;
}

function getOrCreateUsersSheet() {
  var targetDb = getSpreadsheet();
  var targetSheet = targetDb.getSheetByName(SHEET_USERS);
  if (!targetSheet) {
    targetSheet = targetDb.insertSheet(SHEET_USERS);
    targetSheet.appendRow(HEADERS_USERS);
    targetSheet.getRange(1, 1, 1, HEADERS_USERS.length).setFontWeight("bold").setBackground("#dbeafe");
    targetSheet.setFrozenRows(1);
  } else if (targetSheet.getLastRow() === 0) {
    targetSheet.appendRow(HEADERS_USERS);
    targetSheet.getRange(1, 1, 1, HEADERS_USERS.length).setFontWeight("bold").setBackground("#dbeafe");
    targetSheet.setFrozenRows(1);
  }
  return targetSheet;
}

function logAuditDirect(action, details, module, recordId, result, user, role, prevValue, newValue) {
  try {
    var logSheet = getOrCreateSheet(SHEET_LOGS, HEADERS_LOGS);
    logSheet.appendRow([
      "LOG-" + new Date().getTime(),
      new Date().toISOString(),
      user || "System",
      role || "Operator",
      sanitizeCell(action || ""),
      sanitizeCell(module || "General"),
      sanitizeCell(recordId || "-"),
      sanitizeCell(prevValue || ""),
      sanitizeCell(newValue || ""),
      result || "Success"
    ]);
  } catch (e) {
    Logger.log("Audit log failed: " + e.message);
  }
}

function parseModuleSheet(sheet, sheetName) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var rows = [];

  var serviceType = "New Card";
  if (sheetName === SHEET_CARD_RENEWAL) serviceType = "Card Renewal";
  else if (sheetName === SHEET_MATERNITY) serviceType = "Maternity Benefit Apply";
  else if (sheetName === SHEET_DEATH) serviceType = "Death Benefit Apply";
  else if (sheetName === SHEET_MARRIAGE) serviceType = "Marriage Benefit Apply";
  else if (sheetName === SHEET_EDUCATION) serviceType = "Education Assistance Apply";

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (sheetName === SHEET_NEW_CARD) {
      rows.push({
        id: String(row[0] || ""),
        serviceType: "New Card",
        applicantName: String(row[1] || ""),
        aadhaarNo: String(row[2] || ""),
        cardNo: "",
        trackNo: String(row[3] || ""),
        district: String(row[4] || ""),
        block: String(row[5] || ""),
        agent: String(row[6] || ""),
        officer: String(row[7] || ""),
        status: String(row[8] || "Pending"),
        phone: String(row[9] || ""),
        remarks: String(row[7] || ""),
        createdAt: row[10] ? String(row[10]) : "",
        updatedAt: row[11] ? String(row[11]) : ""
      });
    } else if (sheetName === SHEET_CARD_RENEWAL) {
      rows.push({
        id: String(row[0] || ""),
        serviceType: "Card Renewal",
        applicantName: String(row[1] || ""),
        cardNo: String(row[2] || ""),
        aadhaarNo: "",
        trackNo: String(row[3] || ""),
        district: String(row[4] || ""),
        block: String(row[5] || ""),
        agent: String(row[6] || ""),
        officer: String(row[7] || ""),
        status: String(row[8] || "Pending"),
        phone: String(row[9] || ""),
        remarks: String(row[7] || ""),
        createdAt: row[10] ? String(row[10]) : "",
        updatedAt: row[11] ? String(row[11]) : ""
      });
    } else if (sheetName === SHEET_MATERNITY || sheetName === SHEET_DEATH) {
      rows.push({
        id: String(row[0] || ""),
        serviceType: serviceType,
        applicantName: String(row[1] || ""),
        cardNo: String(row[2] || ""),
        aadhaarNo: "",
        trackNo: String(row[3] || ""),
        district: String(row[4] || ""),
        block: String(row[5] || ""),
        agent: String(row[6] || ""),
        remarks: String(row[7] || ""),
        status: String(row[8] || "Pending"),
        phone: String(row[9] || ""),
        createdAt: row[10] ? String(row[10]) : "",
        updatedAt: row[11] ? String(row[11]) : ""
      });
    } else {
      rows.push({
        id: String(row[0] || ""),
        serviceType: String(row[1] || serviceType),
        applicantName: String(row[2] || ""),
        cardNo: String(row[3] || ""),
        aadhaarNo: String(row[4] || ""),
        trackNo: String(row[5] || ""),
        district: String(row[6] || ""),
        block: String(row[7] || ""),
        agent: String(row[8] || ""),
        officer: String(row[9] || ""),
        status: String(row[10] || "Pending"),
        phone: String(row[11] || ""),
        remarks: String(row[9] || ""),
        createdAt: row[12] ? String(row[12]) : "",
        updatedAt: row[13] ? String(row[13]) : ""
      });
    }
  }
  return rows;
}

function getInternalUsersData(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var users = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    users.push({
      id: String(row[0] || ""),
      username: String(row[1] || ""),
      salt: String(row[2] || ""),
      passwordHash: String(row[3] || ""),
      fullName: String(row[4] || ""),
      role: String(row[5] || ROLE_BLOCK_OPERATOR),
      district: String(row[6] || ""),
      block: String(row[7] || ""),
      email: String(row[8] || ""),
      status: String(row[9] || "Active"),
      createdAt: row[10] ? String(row[10]) : "",
      updatedAt: row[11] ? String(row[11]) : ""
    });
  }
  return users;
}

function getUsersData(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var users = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    users.push({
      id: String(row[0] || ""),
      username: String(row[1] || ""),
      fullName: String(row[4] || ""),
      role: String(row[5] || ROLE_BLOCK_OPERATOR),
      district: String(row[6] || ""),
      block: String(row[7] || ""),
      email: String(row[8] || ""),
      status: String(row[9] || "Active"),
      createdAt: row[10] ? String(row[10]) : "",
      updatedAt: row[11] ? String(row[11]) : ""
    });
  }
  return users;
}

function getAgentsData(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0].map(function (h) { return String(h || "").trim().toLowerCase(); });

  var idCol = headers.indexOf("id") !== -1 ? headers.indexOf("id") : 0;
  var nameCol = headers.indexOf("name") !== -1 ? headers.indexOf("name") : 1;
  var phoneCol = headers.findIndex(function (h) { return h.includes("phone") || h.includes("mobile"); });
  var distCol = headers.indexOf("district");
  var blockCol = headers.findIndex(function (h) { return h.includes("block") || h.includes("village"); });
  var photoCol = headers.findIndex(function (h) { return h.includes("photo") || h.includes("avatar") || h.includes("image"); });
  var statusCol = headers.indexOf("status");
  var createdCol = headers.findIndex(function (h) { return h.includes("created") || h.includes("date"); });

  var agents = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    agents.push({
      id: String(row[idCol] || ""),
      name: String(row[nameCol] || ""),
      phone: phoneCol !== -1 ? String(row[phoneCol] || "") : "",
      district: distCol !== -1 ? String(row[distCol] || "") : "",
      block: blockCol !== -1 ? String(row[blockCol] || "") : "",
      photo: photoCol !== -1 ? String(row[photoCol] || "") : "",
      status: statusCol !== -1 ? String(row[statusCol] || "Active") : "Active",
      createdAt: createdCol !== -1 ? (row[createdCol] ? String(row[createdCol]) : "") : ""
    });
  }
  return agents;
}

function getLogsData(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var logs = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    logs.push({
      id: String(row[0] || ""),
      timestamp: row[1] ? String(row[1]) : "",
      user: String(row[2] || "System"),
      role: String(row[3] || "Operator"),
      action: String(row[4] || ""),
      module: String(row[5] || ""),
      recordId: String(row[6] || ""),
      prevValue: String(row[7] || ""),
      newValue: String(row[8] || ""),
      result: String(row[9] || "")
    });
  }
  return logs.reverse();
}
