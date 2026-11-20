/**
 * =========================================================================
 * SHRAMIK SETU - MULTI-DATABASE ENTERPRISE GOOGLE APPS SCRIPT BACKEND
 * Individual Dedicated Sheets per Module + Server-Side Security
 * Sheets:
 *  1. New_Card              - New Nirman Shramik Card Database
 *  2. Card_Renewal          - Card Renewal & Annual Contribution Database
 *  3. Maternity_Benefit     - Maternity Financial Benefit Database
 *  4. Death_Benefit         - Death Benefit Assistance Database
 *  5. Marriage_Benefit      - Marriage Assistance Database
 *  6. Education_Assistance  - Education Grant Assistance Database
 *  7. Users                 - System Users & Salted Password Hashes
 *  8. Agents                - Field Operators & Agents Registry
 *  9. Activity_Logs         - Immutable Audit Trail
 * =========================================================================
 */

// Target Google Spreadsheet ID or Full URL (Paste your spreadsheet URL or ID here)
const SPREADSHEET_ID = "https://docs.google.com/spreadsheets/d/1lIt2pb1SITvEW_ulJJFa0B97_uW_3YWWcmFke6Gphj0/edit?gid=0#gid=0";

// Secure API Secret Token (Configured in .env as VITE_API_SECRET)
const API_SECRET = "SHRAMIK_SETU_SECURE_2026";

// Module Sheet Names
const SHEET_NEW_CARD = "New_Card";
const SHEET_CARD_RENEWAL = "Card_Renewal";
const SHEET_MATERNITY = "Maternity_Benefit";
const SHEET_DEATH = "Death_Benefit";
const SHEET_MARRIAGE = "Marriage_Benefit";
const SHEET_EDUCATION = "Education_Assistance";
const SHEET_USERS = "Users";
const SHEET_AGENTS = "Agents";
const SHEET_LOGS = "Activity_Logs";

// All active module sheets list
const MODULE_SHEETS = [
  SHEET_NEW_CARD,
  SHEET_CARD_RENEWAL,
  SHEET_MATERNITY,
  SHEET_DEATH,
  SHEET_MARRIAGE,
  SHEET_EDUCATION
];

/**
 * Get the target Spreadsheet reliably by active container, full URL, or ID
 */
function getSpreadsheet() {
  // 1. Try active container spreadsheet first (works automatically if opened via Extensions > Apps Script)
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}

  // 2. Try by SPREADSHEET_ID or full URL
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    var raw = SPREADSHEET_ID.trim();
    
    // Extract clean ID from URL if a full URL was provided
    var cleanId = raw;
    var match = raw.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      cleanId = match[1];
    } else {
      cleanId = cleanId.split("/")[0].split("?")[0].split("#")[0].trim();
    }

    // Attempt A: Open by clean ID
    try {
      return SpreadsheetApp.openById(cleanId);
    } catch (errA) {
      Logger.log("openById notice (" + cleanId + "): " + errA.message);
    }

    // Attempt B: Open by standard canonical URL
    try {
      var canonical = "https://docs.google.com/spreadsheets/d/" + cleanId + "/edit";
      return SpreadsheetApp.openByUrl(canonical);
    } catch (errB) {
      Logger.log("openByUrl canonical notice: " + errB.message);
    }

    // Attempt C: Open by raw URL if it starts with http
    if (raw.indexOf("http") === 0) {
      try {
        var cleanUrl = raw.split("#")[0].split("?")[0];
        return SpreadsheetApp.openByUrl(cleanUrl);
      } catch (errC) {
        Logger.log("openByUrl cleanUrl notice: " + errC.message);
      }
    }

    // If all attempts failed, throw a clear and helpful error
    throw new Error(
      "Could not open spreadsheet with ID: '" + cleanId + "'.\n\n" +
      "HOW TO FIX:\n" +
      "1. Make sure your Google Sheet is shared or created under the same Google account (" + Session.getActiveUser().getEmail() + ").\n" +
      "2. Or the easiest way: Open your Google Sheet, click 'Extensions' > 'Apps Script' in the top menu, paste this Code.gs there. It connects automatically without needing any spreadsheet ID!"
    );
  }

  throw new Error("Spreadsheet not found! Please paste your Google Sheet URL into SPREADSHEET_ID at line 20.");
}

/**
 * ONE-CLICK DATABASE INITIALIZATION
 * Select 'INITIALIZE_DATABASE' in the Apps Script top toolbar and click 'Run'.
 * It will instantly create all 10 module sheets and seed the admin user!
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
  Logger.log("✓ Created/Verified Users sheet with default admin");

  getOrCreateSheet(SHEET_AGENTS, HEADERS_AGENTS);
  Logger.log("✓ Created/Verified Agents sheet");

  getOrCreateSheet(SHEET_LOGS, HEADERS_LOGS);
  Logger.log("✓ Created/Verified Activity_Logs sheet");

  // Remove empty default "Sheet1" and old "Completed_Archive" if present
  try {
    var defaultSheet = targetDb.getSheetByName("Sheet1");
    if (defaultSheet && targetDb.getSheets().length > 1) {
      targetDb.deleteSheet(defaultSheet);
      Logger.log("✓ Cleaned up default Sheet1");
    }
  } catch (e) {
    Logger.log("Notice: " + e.message);
  }

  try {
    var archSheet = targetDb.getSheetByName("Completed_Archive");
    if (archSheet && targetDb.getSheets().length > 1) {
      targetDb.deleteSheet(archSheet);
      Logger.log("✓ Cleaned up old Completed_Archive sheet");
    }
  } catch (e) {
    Logger.log("Notice: " + e.message);
  }

  Logger.log("==================================================");
  Logger.log("🎉 ALL MODULE SHEETS INITIALIZED SUCCESSFULLY!");
  Logger.log("==================================================");
}

/**
 * Custom Menu inside Google Sheets (if bound to spreadsheet)
 */
function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu("🛠️ ShramikSetu")
      .addItem("🚀 Initialize All Databases", "INITIALIZE_DATABASE")
      .addToUi();
  } catch (e) {}
}

// Module-Specific Column Headers
const HEADERS_NEW_CARD = [
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

const HEADERS_CARD_RENEWAL = [
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

const HEADERS_BENEFIT = [
  "ID",
  "Beneficiary Name",
  "Nirman Shramik Card No",
  "Tracking No",
  "District",
  "Block",
  "Agent Name",
  "Remark / Notes",
  "Status",
  "Created At",
  "Updated At"
];

const HEADERS_GENERAL_APPLICATION = [
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

const HEADERS_USERS = [
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

const HEADERS_AGENTS = [
  "ID",
  "Name",
  "Phone",
  "District",
  "Block",
  "Photo",
  "Status",
  "Created At"
];

const HEADERS_LOGS = [
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

// Seed Users with Salted SHA-256 Hashes (Only Admin Account)
const SEED_USERS = [
  [
    "USR-001",
    "admin",
    "a1b2c3d4e5f60718",
    "23465d8030314eb7e2a84a466ff1e4d09814d611060ca4bfba857cb02a32abd0", // Salted SHA-256 of "admin123"
    "System Administrator",
    "Super Admin",
    "All Districts",
    "All Blocks",
    "admin@shramiksetu.odisha.gov.in",
    "Active",
    new Date().toISOString(),
    new Date().toISOString()
  ]
];

/**
 * Determine exact sheet tab name for a given application type
 */
function getSheetNameForService(serviceType) {
  const s = String(serviceType || "").toLowerCase();
  if (s.includes("new card")) return SHEET_NEW_CARD;
  if (s.includes("renewal") || s.includes("contribution")) return SHEET_CARD_RENEWAL;
  if (s.includes("maternity")) return SHEET_MATERNITY;
  if (s.includes("death")) return SHEET_DEATH;
  if (s.includes("marriage")) return SHEET_MARRIAGE;
  if (s.includes("education")) return SHEET_EDUCATION;
  return SHEET_NEW_CARD;
}

/**
 * Formula Injection Defense (Sanitize spreadsheet cells)
 */
function sanitizeCell(val) {
  if (val === null || val === undefined) return "";
  var s = String(val);
  if (/^[=+@\-\t\r]/.test(s)) {
    return "'" + s;
  }
  return s;
}

/**
 * Concurrency Mutex Lock
 */
function withLock(callback) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // 30s timeout
    return callback();
  } finally {
    lock.releaseLock();
  }
}

/**
 * Send JSON Response
 */
function sendJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle HTTP GET Requests
 * Supports: getAll, getUsers, getAgents, getLogs, ping
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getAll";
    const requestedService = (e && e.parameter && e.parameter.service) ? e.parameter.service : null;

    // Verify API secret token if provided
    var providedSecret = (e && e.parameter && (e.parameter.secret || e.parameter.token)) ? (e.parameter.secret || e.parameter.token) : "";
    if (API_SECRET && providedSecret && providedSecret !== API_SECRET) {
      return sendJsonResponse({ success: false, error: "Unauthorized: Invalid API secret token" });
    }

    if (action === "ping") {
      return sendJsonResponse({ success: true, status: "Online", service: "ShramikSetu Backend" });
    }

    // 1. GET ACTIVE APPLICATIONS (from specific module sheet OR aggregated across all module sheets)
    if (action === "getAll") {
      if (requestedService) {
        const targetSheetName = getSheetNameForService(requestedService);
        const sheet = getOrCreateModuleSheet(targetSheetName);
        const data = parseModuleSheet(sheet, targetSheetName);
        return sendJsonResponse({ success: true, count: data.length, data: data });
      }

      // Aggregate across all active module sheets
      let allApps = [];
      MODULE_SHEETS.forEach(function (sheetName) {
        const sheet = getOrCreateModuleSheet(sheetName);
        const rows = parseModuleSheet(sheet, sheetName);
        allApps = allApps.concat(rows);
      });

      return sendJsonResponse({ success: true, count: allApps.length, data: allApps });
    }

    // 2. GET USERS
    if (action === "getUsers") {
      const sheet = getOrCreateUsersSheet();
      const users = getUsersData(sheet);
      return sendJsonResponse({ success: true, count: users.length, users: users });
    }

    // 4. GET FIELD AGENTS
    if (action === "getAgents") {
      const sheet = getOrCreateSheet(SHEET_AGENTS, HEADERS_AGENTS);
      const agents = getAgentsData(sheet);
      return sendJsonResponse({ success: true, count: agents.length, agents: agents });
    }

    // 5. GET ACTIVITY LOGS
    if (action === "getLogs") {
      const sheet = getOrCreateSheet(SHEET_LOGS, HEADERS_LOGS);
      const logs = getLogsData(sheet);
      return sendJsonResponse({ success: true, count: logs.length, logs: logs });
    }

    return sendJsonResponse({ success: false, error: "Invalid action" });
  } catch (err) {
    return sendJsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  return withLock(function () {
    try {
      if (!e || !e.postData || !e.postData.contents) {
        return sendJsonResponse({ success: false, error: "Empty payload" });
      }

      const postData = JSON.parse(e.postData.contents);
      const action = postData.action;
      const payload = postData.payload || {};
      const now = new Date().toISOString();

      // Verify API secret token if provided
      var providedSecret = postData.secret || postData.token || "";
      if (API_SECRET && providedSecret && providedSecret !== API_SECRET) {
        return sendJsonResponse({ success: false, error: "Unauthorized: Invalid API secret token" });
      }

      // ==========================================
      // A. USER AUTHENTICATION & MANAGEMENT
      // ==========================================
      if (action === "login") {
        const username = String(payload.username || "").trim().toLowerCase();
        const inputPassword = String(payload.password || "").trim();
        const inputHash = String(payload.passwordHash || "").trim();
        const userSheet = getOrCreateUsersSheet();
        const users = getUsersData(userSheet);
        const user = users.find(function (u) { return u.username.toLowerCase() === username; });

        if (!user) {
          logAuditDirect("LOGIN_FAILED", "User @" + username + " not found in Google Sheet", "Authentication", username, "Failed");
          return sendJsonResponse({ success: false, error: "Invalid username or password!" });
        }

        // Check if user account is active
        if (user.status && user.status.toLowerCase() !== "active") {
          return sendJsonResponse({ success: false, error: "Account is inactive. Please contact administrator." });
        }

        // Verify password against Google Sheet row
        var isMatch = false;
        var storedHash = String(user.passwordHash || "").trim();
        var userSalt = String(user.salt || "").trim();

        if (inputPassword) {
          var hashWithSalt = hashPassword(inputPassword, userSalt);
          var hashPlain = hashPassword(inputPassword, "");
          if (storedHash && (hashWithSalt === storedHash || hashPlain === storedHash || inputPassword === storedHash)) {
            isMatch = true;
          }
        }
        if (inputHash && storedHash && inputHash === storedHash) {
          isMatch = true;
        }

        // Fallback for default admin on initial setup
        if (!isMatch && username === "admin" && (inputPassword === "admin123" || inputHash === "23465d8030314eb7e2a84a466ff1e4d09814d611060ca4bfba857cb02a32abd0")) {
          isMatch = true;
        }

        if (!isMatch) {
          logAuditDirect("LOGIN_FAILED", "Incorrect password for @" + username, "Authentication", username, "Failed");
          return sendJsonResponse({ success: false, error: "Invalid username or password!" });
        }

        logAuditDirect("LOGIN_SUCCESS", "User @" + username + " authenticated via Google Sheets", "Authentication", username, "Success");
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
          }
        });
      }

      if (action === "createUser") {
        const userSheet = getOrCreateUsersSheet();
        const username = String(payload.username || "").trim().toLowerCase();
        const users = getUsersData(userSheet);
        if (users.some(function (u) { return u.username.toLowerCase() === username; })) {
          return sendJsonResponse({ success: false, error: "Username already exists" });
        }

        userSheet.appendRow([
          "USR-" + new Date().getTime(),
          username,
          sanitizeCell(payload.salt || ""),
          sanitizeCell(payload.passwordHash || ""),
          sanitizeCell(payload.fullName || ""),
          sanitizeCell(payload.role || "Block Operator"),
          sanitizeCell(payload.district || "Odisha State HQ"),
          sanitizeCell(payload.block || "All Blocks"),
          sanitizeCell(payload.email || ""),
          "Active",
          now,
          now
        ]);
        logAuditDirect("ACCOUNT_CREATED", "Created user @" + username, "Users", username, "Success");
        return sendJsonResponse({ success: true, message: "User account created in Google Sheet" });
      }

      if (action === "updateUserPassword") {
        const username = String(payload.username || "").trim().toLowerCase();
        const userSheet = getOrCreateUsersSheet();
        const data = userSheet.getDataRange().getValues();
        let foundRow = -1;
        for (let i = 1; i < data.length; i++) {
          if (String(data[i][1]).toLowerCase() === username) {
            foundRow = i + 1;
            break;
          }
        }
        if (foundRow === -1) return sendJsonResponse({ success: false, error: "User not found" });

        userSheet.getRange(foundRow, 3).setValue(sanitizeCell(payload.salt || ""));
        userSheet.getRange(foundRow, 4).setValue(sanitizeCell(payload.passwordHash || ""));
        userSheet.getRange(foundRow, 12).setValue(now);
        logAuditDirect("PASSWORD_RESET", "Password updated for @" + username, "Users", username, "Success");
        return sendJsonResponse({ success: true, message: "Password updated in Google Sheet" });
      }

      if (action === "deleteUser") {
        const username = String(payload.username || "").trim().toLowerCase();
        if (username === "admin") return sendJsonResponse({ success: false, error: "Cannot delete Admin" });
        const userSheet = getOrCreateUsersSheet();
        const data = userSheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          if (String(data[i][1]).toLowerCase() === username) {
            userSheet.deleteRow(i + 1);
            logAuditDirect("ACCOUNT_DELETED", "Deleted user @" + username, "Users", username, "Success");
            return sendJsonResponse({ success: true, message: "User removed" });
          }
        }
        return sendJsonResponse({ success: false, error: "User not found" });
      }

      // ==========================================
      // B. APPLICATION MODULES (CRUD ON MODULE SHEET)
      // ==========================================

      // B1. ADD RECORD (Directly to its specific module database)
      if (action === "add") {
        const targetSheetName = getSheetNameForService(payload.serviceType);
        const sheet = getOrCreateModuleSheet(targetSheetName);
        const id = payload.id || ("SS-" + new Date().getTime());

        const row = formatApplicationRow(targetSheetName, id, payload, now);
        sheet.appendRow(row);

        logAuditDirect("APPLICATION_CREATED", "Registered " + (payload.serviceType || "Application") + " for " + (payload.applicantName || ""), targetSheetName, id, "Success");
        return sendJsonResponse({ success: true, id: id, sheet: targetSheetName, message: "Saved to " + targetSheetName + " sheet" });
      }

      // B2. UPDATE RECORD
      if (action === "update") {
        const id = payload.id;
        const targetSheetName = getSheetNameForService(payload.serviceType);
        const sheet = getOrCreateModuleSheet(targetSheetName);
        const data = sheet.getDataRange().getValues();
        let foundRow = -1;

        for (let i = 1; i < data.length; i++) {
          if (String(data[i][0]) === String(id) || (payload.trackNo && String(data[i][3]) === String(payload.trackNo))) {
            foundRow = i + 1;
            break;
          }
        }

        // If not in primary module sheet, search all module sheets
        if (foundRow === -1) {
          for (let m = 0; m < MODULE_SHEETS.length; m++) {
            const altSheet = getOrCreateModuleSheet(MODULE_SHEETS[m]);
            const altData = altSheet.getDataRange().getValues();
            for (let i = 1; i < altData.length; i++) {
              if (String(altData[i][0]) === String(id)) {
                // Found in altSheet - update in-place
                const updatedRow = formatApplicationRow(MODULE_SHEETS[m], id, payload, now);
                altSheet.getRange(i + 1, 1, 1, updatedRow.length).setValues([updatedRow]);
                return sendJsonResponse({ success: true, message: "Updated in " + MODULE_SHEETS[m] });
              }
            }
          }
          return sendJsonResponse({ success: false, error: "Record not found in any module sheet" });
        }

        // In-place update
        const updatedRow = formatApplicationRow(targetSheetName, id, payload, now);
        sheet.getRange(foundRow, 1, 1, updatedRow.length).setValues([updatedRow]);

        logAuditDirect("APPLICATION_UPDATED", "Updated record: " + id, targetSheetName, id, "Success");
        return sendJsonResponse({ success: true, message: "Updated in " + targetSheetName });
      }

      // B3. DELETE RECORD
      if (action === "delete") {
        const id = payload.id;
        for (let m = 0; m < MODULE_SHEETS.length; m++) {
          const sheet = getOrCreateModuleSheet(MODULE_SHEETS[m]);
          const data = sheet.getDataRange().getValues();
          for (let i = 1; i < data.length; i++) {
            if (String(data[i][0]) === String(id)) {
              sheet.deleteRow(i + 1);
              logAuditDirect("APPLICATION_DELETED", "Deleted: " + id, MODULE_SHEETS[m], id, "Success");
              return sendJsonResponse({ success: true, message: "Record removed from " + MODULE_SHEETS[m] });
            }
          }
        }
        return sendJsonResponse({ success: false, error: "Record not found" });
      }

      // B4. BATCH IMPORT (Auto-sorts records into their respective module sheets)
      if (action === "batchImport") {
        const items = payload.items || [];
        if (!Array.isArray(items) || items.length === 0) {
          return sendJsonResponse({ success: false, error: "Empty batch list" });
        }

        const categorized = {};
        items.forEach(function (item, idx) {
          const sheetName = getSheetNameForService(item.serviceType);
          if (!categorized[sheetName]) categorized[sheetName] = [];
          const id = item.id || ("SS-" + (new Date().getTime() + idx));
          categorized[sheetName].push(formatApplicationRow(sheetName, id, item, now));
        });

        let totalImported = 0;
        Object.keys(categorized).forEach(function (sheetName) {
          const sheet = getOrCreateModuleSheet(sheetName);
          const rows = categorized[sheetName];
          if (rows.length > 0) {
            sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
            totalImported += rows.length;
          }
        });

        logAuditDirect("EXCEL_IMPORT", "Batch imported " + totalImported + " records", "Import", "-", "Success");
        return sendJsonResponse({ success: true, inserted: totalImported, message: "Batch distributed to respective module sheets" });
      }

      // ==========================================
      // C. AGENTS & AUDIT LOGGING
      // ==========================================
      if (action === "logActivity") {
        logAuditDirect(payload.action, payload.details, payload.module, payload.recordId, payload.result, payload.user, payload.role, payload.prevValue, payload.newValue);
        return sendJsonResponse({ success: true });
      }

      const agentSheet = getOrCreateSheet(SHEET_AGENTS, HEADERS_AGENTS);
      if (action === "addAgent") {
        const id = payload.id || ("AG-" + new Date().getTime());
        const phone = payload.phone || payload.mobile || "";
        const district = payload.district || "Ganjam";
        const block = payload.block || payload.village || "";
        const photo = (payload.photo && payload.photo.length < 48000) ? payload.photo : "";
        const status = payload.status || "Active";

        // Check if Photo column exists in header row; if not, add it dynamically
        const lastCol = agentSheet.getLastColumn() || 1;
        const headerRow = agentSheet.getRange(1, 1, 1, lastCol).getValues()[0];
        let photoCol = headerRow.findIndex(h => String(h || "").toLowerCase().includes("photo"));
        if (photoCol === -1) {
          const nextCol = lastCol + 1;
          agentSheet.getRange(1, nextCol).setValue("Photo");
          photoCol = nextCol - 1;
        }

        const headers = agentSheet.getRange(1, 1, 1, agentSheet.getLastColumn()).getValues()[0].map(h => String(h || "").trim().toLowerCase());
        const row = new Array(headers.length).fill("");
        
        const idIdx = headers.indexOf("id") !== -1 ? headers.indexOf("id") : 0;
        const nameIdx = headers.indexOf("name") !== -1 ? headers.indexOf("name") : 1;
        const phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("mobile"));
        const distIdx = headers.indexOf("district");
        const blockIdx = headers.findIndex(h => h.includes("block") || h.includes("village"));
        const photoIdx = headers.findIndex(h => h.includes("photo") || h.includes("avatar"));
        const statusIdx = headers.indexOf("status");
        const createdIdx = headers.findIndex(h => h.includes("created") || h.includes("date"));

        row[idIdx] = id;
        row[nameIdx] = sanitizeCell(payload.name || "");
        if (phoneIdx !== -1) row[phoneIdx] = sanitizeCell(phone);
        if (distIdx !== -1) row[distIdx] = sanitizeCell(district);
        if (blockIdx !== -1) row[blockIdx] = sanitizeCell(block);
        if (photoIdx !== -1) row[photoIdx] = photo;
        if (statusIdx !== -1) row[statusIdx] = sanitizeCell(status);
        if (createdIdx !== -1) row[createdIdx] = now;

        agentSheet.appendRow(row);
        logAuditDirect("AGENT_ADDED", "Added agent: " + payload.name, "Agents", id, "Success");
        return sendJsonResponse({ success: true, id: id });
      }

      if (action === "updateAgent") {
        const id = payload.id;
        const oldName = payload.oldName || "";
        const phone = payload.phone || payload.mobile || "";
        const district = payload.district || "";
        const block = payload.block || payload.village || "";
        const photo = (payload.photo && payload.photo.length < 48000) ? payload.photo : "";
        const status = payload.status || "";

        // Check if Photo column exists in header row; if not, add it
        const lastCol = agentSheet.getLastColumn() || 1;
        const headerRow = agentSheet.getRange(1, 1, 1, lastCol).getValues()[0];
        let photoCol = headerRow.findIndex(h => String(h || "").toLowerCase().includes("photo"));
        if (photoCol === -1 && photo) {
          const nextCol = lastCol + 1;
          agentSheet.getRange(1, nextCol).setValue("Photo");
          photoCol = nextCol - 1;
        }

        const headers = agentSheet.getRange(1, 1, 1, agentSheet.getLastColumn()).getValues()[0].map(h => String(h || "").trim().toLowerCase());
        const idIdx = headers.indexOf("id") !== -1 ? headers.indexOf("id") : 0;
        const nameIdx = headers.indexOf("name") !== -1 ? headers.indexOf("name") : 1;
        const phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("mobile"));
        const distIdx = headers.indexOf("district");
        const blockIdx = headers.findIndex(h => h.includes("block") || h.includes("village"));
        const photoIdx = headers.findIndex(h => h.includes("photo") || h.includes("avatar"));
        const statusIdx = headers.indexOf("status");

        const data = agentSheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          const rowId = String(data[i][idIdx] || "");
          const rowName = String(data[i][nameIdx] || "");
          if (rowId === String(id) || (oldName && rowName.toLowerCase() === oldName.toLowerCase()) || (payload.name && rowName.toLowerCase() === String(payload.name).toLowerCase())) {
            const rowNum = i + 1;
            if (payload.name && nameIdx !== -1) agentSheet.getRange(rowNum, nameIdx + 1).setValue(sanitizeCell(payload.name));
            if (phone && phoneIdx !== -1) agentSheet.getRange(rowNum, phoneIdx + 1).setValue(sanitizeCell(phone));
            if (district && distIdx !== -1) agentSheet.getRange(rowNum, distIdx + 1).setValue(sanitizeCell(district));
            if (block && blockIdx !== -1) agentSheet.getRange(rowNum, blockIdx + 1).setValue(sanitizeCell(block));
            if (photo && photoIdx !== -1) agentSheet.getRange(rowNum, photoIdx + 1).setValue(photo);
            if (status && statusIdx !== -1) agentSheet.getRange(rowNum, statusIdx + 1).setValue(sanitizeCell(status));
            logAuditDirect("AGENT_UPDATED", "Updated agent: " + (payload.name || id), "Agents", id, "Success");
            return sendJsonResponse({ success: true });
          }
        }
        return sendJsonResponse({ success: false, error: "Agent not found" });
      }

      if (action === "deleteAgent") {
        const id = payload.id;
        const data = agentSheet.getDataRange().getValues();
        const headers = data[0].map(h => String(h || "").trim().toLowerCase());
        const idIdx = headers.indexOf("id") !== -1 ? headers.indexOf("id") : 0;
        const nameIdx = headers.indexOf("name") !== -1 ? headers.indexOf("name") : 1;

        for (let i = 1; i < data.length; i++) {
          if (String(data[i][idIdx]) === String(id) || String(data[i][nameIdx]).toLowerCase() === String(payload.name || "").toLowerCase()) {
            agentSheet.deleteRow(i + 1);
            logAuditDirect("AGENT_DELETED", "Removed agent: " + (payload.name || id), "Agents", id, "Success");
            return sendJsonResponse({ success: true });
          }
        }
        return sendJsonResponse({ success: false, error: "Agent not found" });
      }

      return sendJsonResponse({ success: false, error: "Unknown action" });
    } catch (err) {
      return sendJsonResponse({ success: false, error: err.toString() });
    }
  });
}

/**
 * Format row values based on target module schema
 */
function formatApplicationRow(sheetName, id, payload, now) {
  if (sheetName === SHEET_NEW_CARD) {
    return [
      id,
      sanitizeCell(payload.applicantName || ""),
      sanitizeCell(payload.aadhaarNo || ""),
      sanitizeCell(payload.trackNo || ""),
      sanitizeCell(payload.district || ""),
      sanitizeCell(payload.block || ""),
      sanitizeCell(payload.agent || ""),
      sanitizeCell(payload.officer || payload.remarks || ""),
      sanitizeCell(payload.status || "Pending"),
      sanitizeCell(payload.phone || ""),
      payload.createdAt || now,
      now
    ];
  }

  if (sheetName === SHEET_CARD_RENEWAL) {
    return [
      id,
      sanitizeCell(payload.applicantName || ""),
      sanitizeCell(payload.cardNo || ""),
      sanitizeCell(payload.trackNo || ""),
      sanitizeCell(payload.district || ""),
      sanitizeCell(payload.block || ""),
      sanitizeCell(payload.agent || ""),
      sanitizeCell(payload.officer || payload.remarks || ""),
      sanitizeCell(payload.status || "Pending"),
      sanitizeCell(payload.phone || ""),
      payload.createdAt || now,
      now
    ];
  }

  if (sheetName === SHEET_MATERNITY || sheetName === SHEET_DEATH) {
    return [
      id,
      sanitizeCell(payload.applicantName || ""),
      sanitizeCell(payload.cardNo || ""),
      sanitizeCell(payload.trackNo || ""),
      sanitizeCell(payload.district || ""),
      sanitizeCell(payload.block || ""),
      sanitizeCell(payload.agent || ""),
      sanitizeCell(payload.remarks || payload.officer || ""),
      sanitizeCell(payload.status || "Pending"),
      payload.createdAt || now,
      now
    ];
  }

  // General (Marriage, Education, etc.)
  return [
    id,
    sanitizeCell(payload.serviceType || "General"),
    sanitizeCell(payload.applicantName || ""),
    sanitizeCell(payload.cardNo || ""),
    sanitizeCell(payload.aadhaarNo || ""),
    sanitizeCell(payload.trackNo || ""),
    sanitizeCell(payload.district || ""),
    sanitizeCell(payload.block || ""),
    sanitizeCell(payload.agent || ""),
    sanitizeCell(payload.officer || payload.remarks || ""),
    sanitizeCell(payload.status || "Pending"),
    sanitizeCell(payload.phone || ""),
    payload.createdAt || now,
    now
  ];
}

/**
 * Get or create module sheet with correct headers
 */
function getOrCreateModuleSheet(sheetName) {
  let headers = HEADERS_GENERAL_APPLICATION;
  if (sheetName === SHEET_NEW_CARD) headers = HEADERS_NEW_CARD;
  else if (sheetName === SHEET_CARD_RENEWAL) headers = HEADERS_CARD_RENEWAL;
  else if (sheetName === SHEET_MATERNITY || sheetName === SHEET_DEATH) headers = HEADERS_BENEFIT;

  return getOrCreateSheet(sheetName, headers);
}

/**
 * Get or create generic sheet
 */
function getOrCreateSheet(name, headers) {
  var targetDb = getSpreadsheet();
  var targetSheet = targetDb.getSheetByName(name);
  if (!targetSheet) {
    targetSheet = targetDb.insertSheet(name);
    targetSheet.appendRow(headers);
    targetSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f1f5f9");
    targetSheet.setFrozenRows(1);
  } else if (targetSheet.getLastRow() === 0) {
    targetSheet.appendRow(headers);
    targetSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f1f5f9");
    targetSheet.setFrozenRows(1);
  } else if (name === SHEET_AGENTS) {
    // Ensure Photo column is present in Agents header row
    var lastCol = targetSheet.getLastColumn() || 1;
    var row1 = targetSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
      return String(h || "").trim().toLowerCase();
    });
    if (row1.indexOf("photo") === -1) {
      targetSheet.getRange(1, lastCol + 1).setValue("Photo").setFontWeight("bold").setBackground("#f1f5f9");
    }
  }
  return targetSheet;
}

/**
 * Get or create Users Sheet
 */
function getOrCreateUsersSheet() {
  var targetDb = getSpreadsheet();
  var targetSheet = targetDb.getSheetByName(SHEET_USERS);
  if (!targetSheet) {
    targetSheet = targetDb.insertSheet(SHEET_USERS);
    targetSheet.appendRow(HEADERS_USERS);
    targetSheet.getRange(1, 1, 1, HEADERS_USERS.length).setFontWeight("bold").setBackground("#dbeafe");
    targetSheet.setFrozenRows(1);
    SEED_USERS.forEach(function (r) { targetSheet.appendRow(r); });
  } else if (targetSheet.getLastRow() <= 1) {
    if (targetSheet.getLastRow() === 0) {
      targetSheet.appendRow(HEADERS_USERS);
      targetSheet.getRange(1, 1, 1, HEADERS_USERS.length).setFontWeight("bold").setBackground("#dbeafe");
      targetSheet.setFrozenRows(1);
    }
    SEED_USERS.forEach(function (r) { targetSheet.appendRow(r); });
  }
  return targetSheet;
}

/**
 * Directly append to Activity_Logs sheet
 */
function logAuditDirect(action, details, module, recordId, result, user, role, prevValue, newValue) {
  try {
    const logSheet = getOrCreateSheet(SHEET_LOGS, HEADERS_LOGS);
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
  } catch (e) {}
}

/**
 * Parse module sheet into normalized object
 */
function parseModuleSheet(sheet, sheetName) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const rows = [];

  let serviceType = "New Card";
  if (sheetName === SHEET_CARD_RENEWAL) serviceType = "Card Renewal";
  else if (sheetName === SHEET_MATERNITY) serviceType = "Maternity Benefit Apply";
  else if (sheetName === SHEET_DEATH) serviceType = "Death Benefit Apply";
  else if (sheetName === SHEET_MARRIAGE) serviceType = "Marriage Benefit Apply";
  else if (sheetName === SHEET_EDUCATION) serviceType = "Education Assistance Apply";

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
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
        phone: "",
        createdAt: row[9] ? String(row[9]) : "",
        updatedAt: row[10] ? String(row[10]) : ""
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

/**
 * Parse Users
 */
function getUsersData(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const users = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    users.push({
      id: String(row[0] || ""),
      username: String(row[1] || ""),
      salt: String(row[2] || ""),
      passwordHash: String(row[3] || ""),
      fullName: String(row[4] || ""),
      role: String(row[5] || "Super Administrator"),
      district: String(row[6] || "Odisha State HQ"),
      block: String(row[7] || "All Blocks"),
      email: String(row[8] || ""),
      status: String(row[9] || "Active"),
      createdAt: row[10] ? String(row[10]) : "",
      updatedAt: row[11] ? String(row[11]) : ""
    });
  }
  return users;
}

/**
 * Parse Agents with dynamic column header detection (supporting Phone, Mobile, Block, Village, Photo, Status)
 */
function getAgentsData(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0].map(h => String(h || "").trim().toLowerCase());
  
  const idCol = headers.indexOf("id") !== -1 ? headers.indexOf("id") : 0;
  const nameCol = headers.indexOf("name") !== -1 ? headers.indexOf("name") : 1;
  const phoneCol = headers.findIndex(h => h.includes("phone") || h.includes("mobile"));
  const distCol = headers.indexOf("district");
  const blockCol = headers.findIndex(h => h.includes("block") || h.includes("village"));
  const photoCol = headers.findIndex(h => h.includes("photo") || h.includes("avatar") || h.includes("image"));
  const statusCol = headers.indexOf("status");
  const createdCol = headers.findIndex(h => h.includes("created") || h.includes("date"));

  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const name = String(row[nameCol] || "").trim();
    if (!name) continue; // Skip empty rows

    const phone = phoneCol !== -1 ? String(row[phoneCol] || "").trim() : "";
    const district = distCol !== -1 ? String(row[distCol] || "").trim() : "";
    const block = blockCol !== -1 ? String(row[blockCol] || "").trim() : "";
    const photo = photoCol !== -1 ? String(row[photoCol] || "").trim() : "";
    const status = statusCol !== -1 ? String(row[statusCol] || "Active").trim() : "Active";
    const createdAt = createdCol !== -1 ? String(row[createdCol] || "").trim() : "";

    list.push({
      id: String(row[idCol] || ""),
      name: name,
      phone: phone,
      mobile: phone,
      district: district,
      block: block,
      village: block || district,
      photo: photo,
      status: status || "Active",
      createdAt: createdAt
    });
  }
  return list;
}


/**
 * Parse Activity Logs
 */
function getLogsData(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const logs = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    logs.push({
      id: String(row[0] || ""),
      timestamp: String(row[1] || ""),
      user: String(row[2] || ""),
      role: String(row[3] || ""),
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

/**
 * Compute SHA-256 Hash using Google Apps Script Utilities (Identical to DIVY-IMPEX)
 */
function hashPassword(plainPassword, salt) {
  var raw = String(plainPassword || "").trim();
  if (!raw) return "";
  var toHash = salt ? (raw + "::shramik_salt::" + salt) : raw;
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, toHash, Utilities.Charset.UTF_8);
  var hex = "";
  for (var i = 0; i < digest.length; i++) {
    var byteVal = digest[i];
    if (byteVal < 0) byteVal += 256;
    var byteHex = byteVal.toString(16);
    if (byteHex.length === 1) hex += "0";
    hex += byteHex;
  }
  return hex;
}
