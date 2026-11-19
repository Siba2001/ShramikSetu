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
 *  9. Completed_Archive     - Permanent Completed Archive
 * 10. Activity_Logs         - Immutable Audit Trail
 * =========================================================================
 */

// Module Sheet Names
const SHEET_NEW_CARD = "New_Card";
const SHEET_CARD_RENEWAL = "Card_Renewal";
const SHEET_MATERNITY = "Maternity_Benefit";
const SHEET_DEATH = "Death_Benefit";
const SHEET_MARRIAGE = "Marriage_Benefit";
const SHEET_EDUCATION = "Education_Assistance";
const SHEET_COMPLETED_ARCHIVE = "Completed_Archive";
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

const HEADERS_ARCHIVE = [
  "ID",
  "Service Type",
  "Beneficiary Name",
  "Card / Aadhaar No",
  "Tracking No",
  "District",
  "Block",
  "Agent Name",
  "Status",
  "Archived At"
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

// Seed Users with Salted SHA-256 Hashes
const SEED_USERS = [
  [
    "USR-001",
    "admin",
    "a1b2c3d4e5f60718",
    "89a4ffce63cbdd1d46b3341ea22bf3954a2db65c5d012423fe5efdf425339f40", // Salted hash of "admin123"
    "System Administrator",
    "Super Admin",
    "Odisha State HQ",
    "All Blocks",
    "admin@shramiksetu.odisha.gov.in",
    "Active",
    new Date().toISOString(),
    new Date().toISOString()
  ],
  [
    "USR-002",
    "dist_ganjam",
    "b2c3d4e5f6a10729",
    "8b7d90d81c3e34bca8350b2aa9a0c102be8373b88939c1d1a6e7c7e96b52a10e", // Salted hash of "district123"
    "Ganjam District Operator",
    "District Operator",
    "Ganjam",
    "All Blocks (Ganjam)",
    "operator.ganjam@odisha.gov.in",
    "Active",
    new Date().toISOString(),
    new Date().toISOString()
  ],
  [
    "USR-003",
    "operator",
    "c3d4e5f6a1b20830",
    "0c6204c382dbfc31f99e38df72e2cf5e14d18721c5dc328a9b7cf395bc58e65e", // Salted hash of "shramik2026"
    "Digapahandi Block Operator",
    "Block Operator",
    "Ganjam",
    "Digapahandi",
    "operator.digapahandi@odisha.gov.in",
    "Active",
    new Date().toISOString(),
    new Date().toISOString()
  ],
  [
    "USR-004",
    "viewer",
    "d4e5f6a1b2c30941",
    "1c7b80a4df76ec8c751c1103f5ad634aaec0bc570d8a571f544655519db8b14e", // Salted hash of "viewer123"
    "Public Auditing Viewer",
    "Viewer",
    "Ganjam",
    "All Blocks",
    "auditor@shramiksetu.odisha.gov.in",
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
 * Supports: getAll, getArchived, getUsers, getAgents, getLogs, ping
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getAll";
    const requestedService = (e && e.parameter && e.parameter.service) ? e.parameter.service : null;

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

    // 2. GET COMPLETED ARCHIVE
    if (action === "getArchived") {
      const sheet = getOrCreateSheet(SHEET_COMPLETED_ARCHIVE, HEADERS_ARCHIVE);
      const data = parseArchiveSheet(sheet);
      return sendJsonResponse({ success: true, count: data.length, data: data });
    }

    // 3. GET USERS
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

      // ==========================================
      // A. USER AUTHENTICATION & MANAGEMENT
      // ==========================================
      if (action === "login") {
        const username = String(payload.username || "").trim().toLowerCase();
        const inputHash = String(payload.passwordHash || "").trim();
        const userSheet = getOrCreateUsersSheet();
        const users = getUsersData(userSheet);
        const user = users.find(function (u) { return u.username.toLowerCase() === username; });

        if (!user || user.passwordHash !== inputHash) {
          logAuditDirect("LOGIN_FAILED", "Failed login for @" + username, "Authentication", username, "Failed");
          return sendJsonResponse({ success: false, error: "Invalid credentials" });
        }

        logAuditDirect("LOGIN_SUCCESS", "User @" + username + " authenticated via Google Sheets", "Authentication", username, "Success");
        return sendJsonResponse({
          success: true,
          user: {
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
          sanitizeCell(payload.district || "Ganjam"),
          sanitizeCell(payload.block || "Digapahandi"),
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
                // Found in altSheet
                if (payload.status === "Completed") {
                  archiveRecord(altData[i], MODULE_SHEETS[m]);
                  altSheet.deleteRow(i + 1);
                  return sendJsonResponse({ success: true, actionTaken: "archived_and_deleted" });
                }
                const updatedRow = formatApplicationRow(MODULE_SHEETS[m], id, payload, now);
                altSheet.getRange(i + 1, 1, 1, updatedRow.length).setValues([updatedRow]);
                return sendJsonResponse({ success: true, message: "Updated in " + MODULE_SHEETS[m] });
              }
            }
          }
          return sendJsonResponse({ success: false, error: "Record not found in any module sheet" });
        }

        // If Completed, move to Completed_Archive
        if (payload.status === "Completed" && postData.deleteOnComplete !== false) {
          archiveRecord(data[foundRow - 1], targetSheetName);
          sheet.deleteRow(foundRow);
          logAuditDirect("APPLICATION_COMPLETED", "Completed & archived: " + id, targetSheetName, id, "Success");
          return sendJsonResponse({ success: true, actionTaken: "archived_and_deleted", message: "Application archived" });
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
              if (postData.archive !== false) {
                archiveRecord(data[i], MODULE_SHEETS[m]);
              }
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
        const id = "AG-" + new Date().getTime();
        agentSheet.appendRow([id, sanitizeCell(payload.name || ""), sanitizeCell(payload.phone || ""), sanitizeCell(payload.district || "Ganjam"), sanitizeCell(payload.block || "Digapahandi"), "Active", now]);
        logAuditDirect("AGENT_ADDED", "Added agent: " + payload.name, "Agents", id, "Success");
        return sendJsonResponse({ success: true, id: id });
      }

      if (action === "deleteAgent") {
        const id = payload.id;
        const data = agentSheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          if (String(data[i][0]) === String(id) || String(data[i][1]).toLowerCase() === String(payload.name || "").toLowerCase()) {
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
      sanitizeCell(payload.district || "Ganjam"),
      sanitizeCell(payload.block || "Digapahandi"),
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
      sanitizeCell(payload.district || "Ganjam"),
      sanitizeCell(payload.block || "Digapahandi"),
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
      sanitizeCell(payload.district || "Ganjam"),
      sanitizeCell(payload.block || "Digapahandi"),
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
    sanitizeCell(payload.district || "Ganjam"),
    sanitizeCell(payload.block || "Digapahandi"),
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f1f5f9");
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f1f5f9");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Get or create Users Sheet
 */
function getOrCreateUsersSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_USERS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_USERS);
    sheet.appendRow(HEADERS_USERS);
    sheet.getRange(1, 1, 1, HEADERS_USERS.length).setFontWeight("bold").setBackground("#dbeafe");
    sheet.setFrozenRows(1);
    SEED_USERS.forEach(function (r) { sheet.appendRow(r); });
  } else if (sheet.getLastRow() <= 1) {
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS_USERS);
      sheet.getRange(1, 1, 1, HEADERS_USERS.length).setFontWeight("bold").setBackground("#dbeafe");
      sheet.setFrozenRows(1);
    }
    SEED_USERS.forEach(function (r) { sheet.appendRow(r); });
  }
  return sheet;
}

/**
 * Move row to Completed_Archive
 */
function archiveRecord(rowData, sourceModule) {
  try {
    const archiveSheet = getOrCreateSheet(SHEET_COMPLETED_ARCHIVE, HEADERS_ARCHIVE);
    archiveSheet.appendRow([
      String(rowData[0] || ""),
      sourceModule.replace(/_/g, " "),
      String(rowData[1] || ""),
      String(rowData[2] || ""),
      String(rowData[3] || ""),
      String(rowData[4] || "Ganjam"),
      String(rowData[5] || "Digapahandi"),
      String(rowData[6] || ""),
      "Completed",
      new Date().toISOString()
    ]);
  } catch (e) {
    console.warn("Archive error: " + e.message);
  }
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
        district: String(row[4] || "Ganjam"),
        block: String(row[5] || "Digapahandi"),
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
        district: String(row[4] || "Ganjam"),
        block: String(row[5] || "Digapahandi"),
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
        district: String(row[4] || "Ganjam"),
        block: String(row[5] || "Digapahandi"),
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
        district: String(row[6] || "Ganjam"),
        block: String(row[7] || "Digapahandi"),
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
      role: String(row[5] || "Block Operator"),
      district: String(row[6] || "Ganjam"),
      block: String(row[7] || "Digapahandi"),
      email: String(row[8] || ""),
      status: String(row[9] || "Active"),
      createdAt: row[10] ? String(row[10]) : "",
      updatedAt: row[11] ? String(row[11]) : ""
    });
  }
  return users;
}

/**
 * Parse Agents
 */
function getAgentsData(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    list.push({
      id: String(row[0] || ""),
      name: String(row[1] || ""),
      phone: String(row[2] || ""),
      district: String(row[3] || "Ganjam"),
      block: String(row[4] || "Digapahandi"),
      status: String(row[5] || "Active"),
      createdAt: row[6] ? String(row[6]) : ""
    });
  }
  return list;
}

/**
 * Parse Archive
 */
function parseArchiveSheet(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    list.push({
      id: String(row[0] || ""),
      serviceType: String(row[1] || ""),
      applicantName: String(row[2] || ""),
      cardNo: String(row[3] || ""),
      aadhaarNo: String(row[3] || ""),
      trackNo: String(row[4] || ""),
      district: String(row[5] || "Ganjam"),
      block: String(row[6] || "Digapahandi"),
      agent: String(row[7] || ""),
      status: String(row[8] || "Completed"),
      archivedAt: row[9] ? String(row[9]) : ""
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
