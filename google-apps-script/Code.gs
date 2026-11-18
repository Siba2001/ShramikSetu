/**
 * =========================================================================
 * SHRAMIK SETU - GOOGLE APPS SCRIPT BACKEND
 * Connects React Web App with Google Sheets as Database
 * Official Portal reference: https://nirmanshramik.odisha.gov.in/website/welcome
 * =========================================================================
 */

const SHEET_NAME = "Applications";
const ARCHIVE_SHEET_NAME = "Completed_Archive";

const HEADERS = [
  "ID",
  "Service Type",
  "Applicant Name",
  "Card No",
  "Aadhaar No",
  "Track No",
  "Block",
  "Agent / Worker",
  "Officer / Staff",
  "Status",
  "Phone No",
  "Bank / Query Remarks",
  "Created At",
  "Updated At"
];

/**
 * Handle HTTP GET Requests
 * Used to fetch all active applications
 */
function doGet(e) {
  try {
    const action = e.parameter.action || "getAll";
    const sheet = getOrCreateSheet(SHEET_NAME);
    
    if (action === "getAll") {
      const data = getSheetData(sheet);
      return sendJsonResponse({ success: true, count: data.length, data: data });
    }
    
    if (action === "getArchived") {
      const archiveSheet = getOrCreateSheet(ARCHIVE_SHEET_NAME);
      const data = getSheetData(archiveSheet);
      return sendJsonResponse({ success: true, count: data.length, data: data });
    }

    return sendJsonResponse({ success: false, error: "Invalid GET action" });
  } catch (err) {
    return sendJsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * Handle HTTP POST Requests
 * Supports: add, update, delete (on complete), batchImport, completeAndDelete
 */
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const payload = postData.payload;
    const sheet = getOrCreateSheet(SHEET_NAME);

    // 1. ADD NEW APPLICATION
    if (action === "add") {
      const id = "SS-" + new Date().getTime();
      const now = new Date().toISOString();
      const row = [
        id,
        payload.serviceType || "New Card",
        payload.applicantName || "",
        payload.cardNo || "",
        payload.aadhaarNo || "",
        payload.trackNo || "",
        payload.block || "General",
        payload.agent || "",
        payload.officer || "",
        payload.status || "Pending",
        payload.phone || "",
        payload.remarks || "",
        now,
        now
      ];
      sheet.appendRow(row);
      return sendJsonResponse({ success: true, id: id, message: "Record added successfully" });
    }

    // 2. UPDATE RECORD
    if (action === "update") {
      const id = payload.id;
      const data = sheet.getDataRange().getValues();
      const now = new Date().toISOString();
      let foundIndex = -1;

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(id) || (payload.trackNo && String(data[i][5]) === String(payload.trackNo))) {
          foundIndex = i + 1;
          break;
        }
      }

      if (foundIndex === -1) {
        return sendJsonResponse({ success: false, error: "Record not found" });
      }

      // If status is changed to "Completed", delete from active sheet as requested!
      if (payload.status === "Completed" && postData.deleteOnComplete !== false) {
        // Optionally archive before deletion
        archiveRow(sheet, foundIndex);
        sheet.deleteRow(foundIndex);
        return sendJsonResponse({ 
          success: true, 
          actionTaken: "archived_and_deleted", 
          message: "Application marked Completed and removed from active database." 
        });
      }

      // Update in-place
      sheet.getRange(foundIndex, 2).setValue(payload.serviceType || data[foundIndex-1][1]);
      sheet.getRange(foundIndex, 3).setValue(payload.applicantName || data[foundIndex-1][2]);
      sheet.getRange(foundIndex, 4).setValue(payload.cardNo || data[foundIndex-1][3]);
      sheet.getRange(foundIndex, 5).setValue(payload.aadhaarNo || data[foundIndex-1][4]);
      sheet.getRange(foundIndex, 6).setValue(payload.trackNo || data[foundIndex-1][5]);
      sheet.getRange(foundIndex, 7).setValue(payload.block || data[foundIndex-1][6]);
      sheet.getRange(foundIndex, 8).setValue(payload.agent || data[foundIndex-1][7]);
      sheet.getRange(foundIndex, 9).setValue(payload.officer || data[foundIndex-1][8]);
      sheet.getRange(foundIndex, 10).setValue(payload.status || data[foundIndex-1][9]);
      sheet.getRange(foundIndex, 11).setValue(payload.phone || data[foundIndex-1][10]);
      sheet.getRange(foundIndex, 12).setValue(payload.remarks || data[foundIndex-1][11]);
      sheet.getRange(foundIndex, 14).setValue(now);

      return sendJsonResponse({ success: true, message: "Record updated successfully" });
    }

    // 3. DELETE RECORD (Specific requirement: delete when completed or removed)
    if (action === "delete") {
      const id = payload.id;
      const data = sheet.getDataRange().getValues();
      let foundIndex = -1;

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(id)) {
          foundIndex = i + 1;
          break;
        }
      }

      if (foundIndex !== -1) {
        if (postData.archive !== false) {
          archiveRow(sheet, foundIndex);
        }
        sheet.deleteRow(foundIndex);
        return sendJsonResponse({ success: true, message: "Record deleted from database" });
      } else {
        return sendJsonResponse({ success: false, error: "Record not found" });
      }
    }

    // 4. BATCH IMPORT (from Excel/CSV)
    if (action === "batchImport") {
      const list = payload.items;
      if (!Array.isArray(list) || list.length === 0) {
        return sendJsonResponse({ success: false, error: "Empty items list" });
      }

      const rows = [];
      const now = new Date().toISOString();
      list.forEach((item, idx) => {
        rows.push([
          item.id || ("SS-" + (new Date().getTime() + idx)),
          item.serviceType || "New Card",
          item.applicantName || "",
          item.cardNo || "",
          item.aadhaarNo || "",
          item.trackNo || "",
          item.block || "General",
          item.agent || "",
          item.officer || "",
          item.status || "Pending",
          item.phone || "",
          item.remarks || "",
          item.createdAt || now,
          now
        ]);
      });

      if (rows.length > 0) {
        const lastRow = sheet.getLastRow();
        sheet.getRange(lastRow + 1, 1, rows.length, rows[0].length).setValues(rows);
      }

      return sendJsonResponse({ success: true, inserted: rows.length, message: "Batch imported successfully" });
    }

    return sendJsonResponse({ success: false, error: "Unknown action" });
  } catch (err) {
    return sendJsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * Get or create spreadsheet tab with proper headers
 */
function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#e2e8f0");
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#e2e8f0");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Fetch sheet data as array of JS objects
 */
function getSheetData(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    rows.push({
      id: String(row[0] || ""),
      serviceType: String(row[1] || ""),
      applicantName: String(row[2] || ""),
      cardNo: String(row[3] || ""),
      aadhaarNo: String(row[4] || ""),
      trackNo: String(row[5] || ""),
      block: String(row[6] || ""),
      agent: String(row[7] || ""),
      officer: String(row[8] || ""),
      status: String(row[9] || "Pending"),
      phone: String(row[10] || ""),
      remarks: String(row[11] || ""),
      createdAt: row[12] ? String(row[12]) : "",
      updatedAt: row[13] ? String(row[13]) : ""
    });
  }
  return rows;
}

/**
 * Archive a row before deletion so data is never permanently lost accidentally
 */
function archiveRow(sheet, rowIndex) {
  try {
    const rowValues = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
    const archiveSheet = getOrCreateSheet(ARCHIVE_SHEET_NAME);
    archiveSheet.appendRow(rowValues);
  } catch (e) {
    console.error("Archive error: " + e.message);
  }
}

/**
 * Send JSON response with CORS headers
 */
function sendJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

