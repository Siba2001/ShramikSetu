import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { sanitizeSpreadsheetValue, maskAadhaar, maskPhone } from './cryptoUtils';

/**
 * Get Clean Module Display Name
 */
function getModuleDisplayName(serviceType) {
  const s = String(serviceType || '').toLowerCase();
  if (s.includes('new card')) return 'NEW CARD';
  if (s.includes('renewal') || s.includes('contribution')) return 'CARD RENEWAL';
  if (s.includes('maternity')) return 'MATERNITY BENEFIT';
  if (s.includes('death')) return 'DEATH BENEFIT';
  if (s.includes('marriage')) return 'MARRIAGE BENEFIT';
  if (s.includes('education')) return 'EDUCATION ASSISTANCE';
  return 'APPLICATION';
}

/**
 * Generate Block-wise Official PDF Report
 * Formats clean government letterhead.
 * When a specific block is selected: omits Agent Name and omits repeated Block column.
 * When "All Blocks" is selected: includes Block column for clear cross-block visibility.
 * Heading Example: "[SELECTED_BLOCK] [MODULE] LIST" or "ALL BLOCKS [MODULE] LIST"
 */
export function exportBlockWisePDF(applications, options = {}) {
  const {
    block = 'All',
    service = 'New Card',
    status = 'All',
    maskPII = false
  } = options;

  // Filter records
  let filtered = [...applications];
  if (block && block !== 'All') {
    filtered = filtered.filter(a => (a.block || '').toLowerCase() === block.toLowerCase());
  }
  if (service && service !== 'All') {
    filtered = filtered.filter(a => (a.serviceType || '').toLowerCase() === service.toLowerCase());
  }
  if (status && status !== 'All') {
    filtered = filtered.filter(a => (a.status || '').toLowerCase() === status.toLowerCase());
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const moduleName = getModuleDisplayName(service);
  const isSingleBlock = Boolean(block && block !== 'All');
  const blockHeader = isSingleBlock ? block.toUpperCase() : 'ALL BLOCKS';
  const mainTitle = `${blockHeader} ${moduleName} LIST`;

  // 1. Top Decorative Blue Bar
  doc.setFillColor(30, 64, 175); // Deep Indigo/Navy (#1E40AF)
  doc.rect(0, 0, pageWidth, 6, 'F');

  // 2. Official Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(mainTitle, pageWidth / 2, 16, { align: 'center' });

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(
    "Odisha Building & Other Construction Workers' Welfare Board (OB&OCWWB)",
    pageWidth / 2,
    21.5,
    { align: 'center' }
  );

  // Meta Info Strip (Date, Total Records, Status)
  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  const metaText = `Block: ${blockHeader}   |   Status: ${status === 'All' ? 'All Active' : status}   |   Total Beneficiaries: ${filtered.length}   |   Generated: ${todayStr}`;
  doc.text(metaText, pageWidth / 2, 26.5, { align: 'center' });

  // Thin separator rule
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.line(14, 29, pageWidth - 14, 29);

  // 3. Prepare Columns & Rows tailored to the module (Omits Agent Name)
  const s = String(service || '').toLowerCase();
  const isRenewal = s.includes('renewal') || s.includes('contribution');
  const isDeath = s.includes('death');
  const isMaternity = s.includes('maternity');
  const isNewCard = s.includes('new card');

  let tableHeaders = [];
  if (isSingleBlock) {
    if (isNewCard) {
      tableHeaders = ['SL', 'APPLICANT NAME', 'AADHAAR NO', 'TRACKING NO', 'STATUS', 'REMARKS'];
    } else if (isRenewal) {
      tableHeaders = ['SL', 'CARD HOLDER NAME', 'SHRAMIK CARD NO', 'TRACKING NO', 'STATUS', 'REMARKS'];
    } else if (isMaternity) {
      tableHeaders = ['SL', 'BENEFICIARY NAME', 'SHRAMIK CARD NO', 'TRACKING NO', 'REMARK / NOTES', 'STATUS'];
    } else if (isDeath) {
      tableHeaders = ['SL', 'CARD HOLDER NAME', 'SHRAMIK CARD NO', 'TRACKING NO', 'REMARK / NOTES', 'STATUS'];
    } else {
      tableHeaders = ['SL', 'BENEFICIARY NAME', 'CARD / AADHAAR NO', 'TRACKING NO', 'STATUS', 'REMARKS'];
    }
  } else {
    if (isNewCard) {
      tableHeaders = ['SL', 'BLOCK', 'APPLICANT NAME', 'AADHAAR NO', 'TRACKING NO', 'STATUS', 'REMARKS'];
    } else if (isRenewal) {
      tableHeaders = ['SL', 'BLOCK', 'CARD HOLDER NAME', 'SHRAMIK CARD NO', 'TRACKING NO', 'STATUS', 'REMARKS'];
    } else if (isMaternity) {
      tableHeaders = ['SL', 'BLOCK', 'BENEFICIARY NAME', 'SHRAMIK CARD NO', 'TRACKING NO', 'REMARK / NOTES', 'STATUS'];
    } else if (isDeath) {
      tableHeaders = ['SL', 'BLOCK', 'CARD HOLDER NAME', 'SHRAMIK CARD NO', 'TRACKING NO', 'REMARK / NOTES', 'STATUS'];
    } else {
      tableHeaders = ['SL', 'BLOCK', 'BENEFICIARY NAME', 'CARD / AADHAAR NO', 'TRACKING NO', 'STATUS', 'REMARKS'];
    }
  }

  const tableRows = filtered.map((app, index) => {
    const bName = (app.block || '—').toUpperCase();
    const name = (app.applicantName || '—').toUpperCase();
    const track = app.trackNo || '—';
    const st = app.status || 'Pending';
    const rem = app.remarks || app.officer || '—';

    if (isSingleBlock) {
      if (isNewCard) {
        const aadh = maskPII ? maskAadhaar(app.aadhaarNo) : (app.aadhaarNo || '—');
        return [index + 1, name, aadh, track, st, rem];
      } else if (isRenewal || isDeath || isMaternity) {
        const card = app.cardNo || '—';
        return [index + 1, name, card, track, rem, st];
      } else {
        const cardOrAadh = app.cardNo || (maskPII ? maskAadhaar(app.aadhaarNo) : app.aadhaarNo) || '—';
        return [index + 1, name, cardOrAadh, track, st, rem];
      }
    } else {
      if (isNewCard) {
        const aadh = maskPII ? maskAadhaar(app.aadhaarNo) : (app.aadhaarNo || '—');
        return [index + 1, bName, name, aadh, track, st, rem];
      } else if (isRenewal || isDeath || isMaternity) {
        const card = app.cardNo || '—';
        return [index + 1, bName, name, card, track, rem, st];
      } else {
        const cardOrAadh = app.cardNo || (maskPII ? maskAadhaar(app.aadhaarNo) : app.aadhaarNo) || '—';
        return [index + 1, bName, name, cardOrAadh, track, st, rem];
      }
    }
  });

  // 4. Render Table with AutoTable
  doc.autoTable({
    head: [tableHeaders],
    body: tableRows.length > 0 ? tableRows : [['—', 'No records found matching criteria', '—', '—', '—', '—']],
    startY: 32,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15
    },
    headStyles: {
      fillColor: [30, 58, 138], // Deep Government Blue (#1E3A8A)
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // light slate
    },
    columnStyles: isSingleBlock ? {
      0: { halign: 'center', cellWidth: 10 }, // SL
      1: { fontStyle: 'bold', cellWidth: 50 }, // Name
      2: { cellWidth: 35 },                   // Card / Aadhaar
      3: { cellWidth: 32 },                   // Tracking
      4: { cellWidth: 26 },                   // Status
      5: { cellWidth: 'auto' }                // Remarks
    } : {
      0: { halign: 'center', cellWidth: 8 },  // SL
      1: { cellWidth: 26 },                   // Block
      2: { fontStyle: 'bold', cellWidth: 46 }, // Name
      3: { cellWidth: 30 },                   // Card / Aadhaar
      4: { cellWidth: 28 },                   // Tracking
      5: { cellWidth: 22 },                   // Status
      6: { cellWidth: 'auto' }                // Remarks
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer on every page
      const pageStr = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        'ShramikSetu Beneficiary Information System • Confidential / Official Use Only',
        14,
        doc.internal.pageSize.getHeight() - 7
      );
      doc.text(
        pageStr,
        pageWidth - 14,
        doc.internal.pageSize.getHeight() - 7,
        { align: 'right' }
      );
    }
  });

  const cleanBlockName = isSingleBlock ? block.replace(/\s+/g, '_') : 'All_Blocks';
  const cleanServiceName = moduleName.replace(/\s+/g, '_');
  const filename = `${cleanBlockName}_${cleanServiceName}_LIST_${new Date().toISOString().slice(0, 10)}.pdf`;

  doc.save(filename);
  return { count: filtered.length, filename };
}

/**
 * Generate Block-wise Official Excel Report (.xlsx)
 * Heading Example: Row 1 = "[SELECTED_BLOCK] [MODULE] LIST" or "ALL BLOCKS [MODULE] LIST"
 * Omits Agent Name. If single block selected, omits repeated Block column.
 */
export function exportBlockWiseExcel(applications, options = {}) {
  const {
    block = 'All',
    service = 'New Card',
    status = 'All',
    maskPII = false
  } = options;

  // Filter records
  let filtered = [...applications];
  if (block && block !== 'All') {
    filtered = filtered.filter(a => (a.block || '').toLowerCase() === block.toLowerCase());
  }
  if (service && service !== 'All') {
    filtered = filtered.filter(a => (a.serviceType || '').toLowerCase() === service.toLowerCase());
  }
  if (status && status !== 'All') {
    filtered = filtered.filter(a => (a.status || '').toLowerCase() === status.toLowerCase());
  }

  const isSingleBlock = Boolean(block && block !== 'All');
  const moduleName = getModuleDisplayName(service);
  const blockHeader = isSingleBlock ? block.toUpperCase() : 'ALL BLOCKS';
  const mainTitle = `${blockHeader} ${moduleName} LIST`;

  const s = String(service || '').toLowerCase();
  const isRenewal = s.includes('renewal') || s.includes('contribution');
  const isDeath = s.includes('death');
  const isMaternity = s.includes('maternity');
  const isNewCard = s.includes('new card');

  // Build Sheet Rows starting with Header Banner
  const sheetAOA = [
    [mainTitle], // Row 1: Heading
    [
      `Block: ${blockHeader}  |  Scheme: ${service}  |  Total Records: ${filtered.length}  |  Generated on: ${new Date().toISOString().slice(0, 10)}`
    ], // Row 2: Subtitle
    [] // Row 3: Blank separator
  ];

  // Row 4: Column Headers
  if (isSingleBlock) {
    if (isNewCard) {
      sheetAOA.push(['SL NO', 'APPLICANT NAME', 'AADHAAR NO', 'TRACKING NUMBER', 'STATUS', 'REMARKS / OFFICER']);
    } else if (isRenewal) {
      sheetAOA.push(['SL NO', 'CARD HOLDER NAME', 'NIRMAN SHRAMIK CARD NO', 'TRACKING NUMBER', 'STATUS', 'REMARKS / OFFICER']);
    } else if (isMaternity) {
      sheetAOA.push(['SL NO', 'BENEFICIARY NAME', 'NIRMAN SHRAMIK CARD NO', 'TRACKING NUMBER', 'REMARK / NOTES', 'STATUS']);
    } else if (isDeath) {
      sheetAOA.push(['SL NO', 'CARD HOLDER NAME', 'NIRMAN SHRAMIK CARD NO', 'TRACKING NUMBER', 'REMARK / NOTES', 'STATUS']);
    } else {
      sheetAOA.push(['SL NO', 'BENEFICIARY NAME', 'CARD / AADHAAR NO', 'TRACKING NUMBER', 'STATUS', 'REMARKS']);
    }
  } else {
    if (isNewCard) {
      sheetAOA.push(['SL NO', 'BLOCK', 'APPLICANT NAME', 'AADHAAR NO', 'TRACKING NUMBER', 'STATUS', 'REMARKS / OFFICER']);
    } else if (isRenewal) {
      sheetAOA.push(['SL NO', 'BLOCK', 'CARD HOLDER NAME', 'NIRMAN SHRAMIK CARD NO', 'TRACKING NUMBER', 'STATUS', 'REMARKS / OFFICER']);
    } else if (isMaternity) {
      sheetAOA.push(['SL NO', 'BLOCK', 'BENEFICIARY NAME', 'NIRMAN SHRAMIK CARD NO', 'TRACKING NUMBER', 'REMARK / NOTES', 'STATUS']);
    } else if (isDeath) {
      sheetAOA.push(['SL NO', 'BLOCK', 'CARD HOLDER NAME', 'NIRMAN SHRAMIK CARD NO', 'TRACKING NUMBER', 'REMARK / NOTES', 'STATUS']);
    } else {
      sheetAOA.push(['SL NO', 'BLOCK', 'BENEFICIARY NAME', 'CARD / AADHAAR NO', 'TRACKING NUMBER', 'STATUS', 'REMARKS']);
    }
  }

  // Row 5+: Data Rows
  filtered.forEach((app, idx) => {
    const sl = idx + 1;
    const bName = sanitizeSpreadsheetValue((app.block || '').toUpperCase());
    const name = sanitizeSpreadsheetValue((app.applicantName || '').toUpperCase());
    const track = sanitizeSpreadsheetValue(app.trackNo || '');
    const st = sanitizeSpreadsheetValue(app.status || 'Pending');
    const rem = sanitizeSpreadsheetValue(app.remarks || app.officer || '');

    if (isSingleBlock) {
      if (isNewCard) {
        const aadh = sanitizeSpreadsheetValue(maskPII ? maskAadhaar(app.aadhaarNo) : (app.aadhaarNo || ''));
        sheetAOA.push([sl, name, aadh, track, st, rem]);
      } else if (isRenewal || isDeath || isMaternity) {
        const card = sanitizeSpreadsheetValue(app.cardNo || '');
        sheetAOA.push([sl, name, card, track, rem, st]);
      } else {
        const cardOrAadh = sanitizeSpreadsheetValue(app.cardNo || (maskPII ? maskAadhaar(app.aadhaarNo) : app.aadhaarNo) || '');
        sheetAOA.push([sl, name, cardOrAadh, track, st, rem]);
      }
    } else {
      if (isNewCard) {
        const aadh = sanitizeSpreadsheetValue(maskPII ? maskAadhaar(app.aadhaarNo) : (app.aadhaarNo || ''));
        sheetAOA.push([sl, bName, name, aadh, track, st, rem]);
      } else if (isRenewal || isDeath || isMaternity) {
        const card = sanitizeSpreadsheetValue(app.cardNo || '');
        sheetAOA.push([sl, bName, name, card, track, rem, st]);
      } else {
        const cardOrAadh = sanitizeSpreadsheetValue(app.cardNo || (maskPII ? maskAadhaar(app.aadhaarNo) : app.aadhaarNo) || '');
        sheetAOA.push([sl, bName, name, cardOrAadh, track, st, rem]);
      }
    }
  });

  const worksheet = XLSX.utils.aoa_to_sheet(sheetAOA);

  // Column Widths
  worksheet['!cols'] = isSingleBlock ? [
    { wch: 8 },  // SL
    { wch: 30 }, // Name
    { wch: 24 }, // Card / Aadhaar
    { wch: 22 }, // Tracking
    { wch: 20 }, // Status / Remark
    { wch: 35 }  // Remarks
  ] : [
    { wch: 8 },  // SL
    { wch: 20 }, // Block
    { wch: 30 }, // Name
    { wch: 24 }, // Card / Aadhaar
    { wch: 22 }, // Tracking
    { wch: 20 }, // Status / Remark
    { wch: 35 }  // Remarks
  ];

  // Merge header cells across columns
  const lastColIdx = isSingleBlock ? 5 : 6;
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } }, // Row 1 Title
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIdx } }  // Row 2 Subtitle
  ];

  const workbook = XLSX.utils.book_new();
  const sheetTabName = `${blockHeader.slice(0, 15)} ${moduleName.slice(0, 10)}`;
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetTabName);

  const cleanBlockName = isSingleBlock ? block.replace(/\s+/g, '_') : 'All_Blocks';
  const cleanServiceName = moduleName.replace(/\s+/g, '_');
  const filename = `${cleanBlockName}_${cleanServiceName}_LIST_${new Date().toISOString().slice(0, 10)}.xlsx`;

  XLSX.writeFile(workbook, filename, { bookType: 'xlsx' });
  return { count: filtered.length, filename };
}

/**
 * Standard Multi-Block Export (Excel / CSV)
 */
export function exportApplications(applications, options = {}) {
  const {
    block = 'All',
    service = 'All',
    status = 'All',
    format = 'xlsx',
    filenamePrefix = 'ShramikSetu',
    maskPII = false
  } = options;

  let filtered = [...applications];

  if (block && block !== 'All') {
    filtered = filtered.filter(a => (a.block || '').toLowerCase() === block.toLowerCase());
  }

  if (service && service !== 'All') {
    filtered = filtered.filter(a => (a.serviceType || '').toLowerCase() === service.toLowerCase());
  }

  if (status && status !== 'All') {
    filtered = filtered.filter(a => (a.status || '').toLowerCase() === status.toLowerCase());
  }

  // Format data for sheet according to module form fields
  const exportRows = filtered.map((app, index) => {
    const s = (app.serviceType || service || '').toLowerCase();

    // 1. Card Renewal
    if (s.includes('renewal') || s.includes('contribution')) {
      return {
        'SL NO': index + 1,
        'BLOCK': sanitizeSpreadsheetValue(app.block || 'General'),
        'CARD HOLDER NAME': sanitizeSpreadsheetValue(app.applicantName || ''),
        'NIRMAN SHRAMIK CARD NO': sanitizeSpreadsheetValue(app.cardNo || ''),
        'TRACKING NUMBER': sanitizeSpreadsheetValue(app.trackNo || ''),
        'AGENT NAME': sanitizeSpreadsheetValue(app.agent || ''),
        'STATUS': sanitizeSpreadsheetValue(app.status || 'Pending'),
        'LAST UPDATED': app.updatedAt ? app.updatedAt.slice(0, 10) : ''
      };
    }

    // 2. Death Benefit
    if (s.includes('death')) {
      return {
        'SL NO': index + 1,
        'BLOCK': sanitizeSpreadsheetValue(app.block || 'General'),
        'CARD HOLDER NAME': sanitizeSpreadsheetValue(app.applicantName || ''),
        'NIRMAN SHRAMIK CARD NO': sanitizeSpreadsheetValue(app.cardNo || ''),
        'TRACKING NUMBER': sanitizeSpreadsheetValue(app.trackNo || ''),
        'AGENT NAME': sanitizeSpreadsheetValue(app.agent || ''),
        'REMARK / NOTES': sanitizeSpreadsheetValue(app.remarks || ''),
        'STATUS': sanitizeSpreadsheetValue(app.status || 'Pending'),
        'LAST UPDATED': app.updatedAt ? app.updatedAt.slice(0, 10) : ''
      };
    }

    // 3. Maternity Benefit
    if (s.includes('maternity')) {
      return {
        'SL NO': index + 1,
        'BLOCK': sanitizeSpreadsheetValue(app.block || 'General'),
        'BENEFICIARY NAME': sanitizeSpreadsheetValue(app.applicantName || ''),
        'NIRMAN SHRAMIK CARD NO': sanitizeSpreadsheetValue(app.cardNo || ''),
        'TRACKING NUMBER': sanitizeSpreadsheetValue(app.trackNo || ''),
        'AGENT NAME': sanitizeSpreadsheetValue(app.agent || ''),
        'REMARK / NOTES': sanitizeSpreadsheetValue(app.remarks || ''),
        'STATUS': sanitizeSpreadsheetValue(app.status || 'Pending'),
        'LAST UPDATED': app.updatedAt ? app.updatedAt.slice(0, 10) : ''
      };
    }

    // 4. New Card
    if (s.includes('new card')) {
      return {
        'SL NO': index + 1,
        'BLOCK': sanitizeSpreadsheetValue(app.block || 'General'),
        'APPLICANT NAME': sanitizeSpreadsheetValue(app.applicantName || ''),
        'AADHAAR NO': sanitizeSpreadsheetValue(maskPII ? maskAadhaar(app.aadhaarNo) : (app.aadhaarNo || '')),
        'TRACKING NUMBER': sanitizeSpreadsheetValue(app.trackNo || ''),
        'AGENT NAME': sanitizeSpreadsheetValue(app.agent || ''),
        'STATUS': sanitizeSpreadsheetValue(app.status || 'Pending'),
        'LAST UPDATED': app.updatedAt ? app.updatedAt.slice(0, 10) : ''
      };
    }

    // 5. Default / All Modules
    return {
      'SL NO': index + 1,
      'BLOCK': sanitizeSpreadsheetValue(app.block || ''),
      'BENEFICIARY NAME': sanitizeSpreadsheetValue(app.applicantName || ''),
      'SERVICE TYPE': sanitizeSpreadsheetValue(app.serviceType || ''),
      'CARD NO': sanitizeSpreadsheetValue(app.cardNo || ''),
      'AADHAAR NO': sanitizeSpreadsheetValue(maskPII ? maskAadhaar(app.aadhaarNo) : (app.aadhaarNo || '')),
      'TRACK NO': sanitizeSpreadsheetValue(app.trackNo || ''),
      'AGENT': sanitizeSpreadsheetValue(app.agent || ''),
      'OFFICER': sanitizeSpreadsheetValue(app.officer || ''),
      'STATUS': sanitizeSpreadsheetValue(app.status || ''),
      'PHONE NO': sanitizeSpreadsheetValue(maskPII ? maskPhone(app.phone) : (app.phone || '')),
      'REMARKS': sanitizeSpreadsheetValue(app.remarks || ''),
      'LAST UPDATED': app.updatedAt ? app.updatedAt.slice(0, 10) : ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);

  worksheet['!cols'] = [
    { wch: 8 },  // SL NO
    { wch: 18 }, // BLOCK
    { wch: 26 }, // APPLICANT NAME
    { wch: 22 }, // SERVICE TYPE
    { wch: 18 }, // CARD NO
    { wch: 18 }, // AADHAAR NO
    { wch: 16 }, // TRACK NO
    { wch: 18 }, // AGENT
    { wch: 18 }, // OFFICER
    { wch: 16 }, // STATUS
    { wch: 14 }, // PHONE
    { wch: 25 }, // REMARKS
    { wch: 14 }  // LAST UPDATED
  ];

  const workbook = XLSX.utils.book_new();
  const sheetName = block !== 'All' ? `${block.slice(0, 20)} Data` : 'All Applications';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const cleanBlock = block !== 'All' ? `_${block.replace(/\s+/g, '_')}` : '_All_Blocks';
  const cleanService = service !== 'All' ? `_${service.replace(/\s+/g, '_')}` : '';
  const dateStr = new Date().toISOString().slice(0, 10);
  const finalFilename = `${filenamePrefix}${cleanBlock}${cleanService}_${dateStr}.${format}`;

  if (format === 'csv') {
    XLSX.writeFile(workbook, finalFilename, { bookType: 'csv' });
  } else {
    XLSX.writeFile(workbook, finalFilename, { bookType: 'xlsx' });
  }

  return { count: filtered.length, filename: finalFilename };
}

/**
 * =========================================================================
 * MARRIAGE VERIFICATION LIST - OFFICIAL PDF & EXCEL EXPORTS
 * Exact layout matching government verification registers
 * Title format: "[BLOCK] MARRIAGE VERIFY LIST" (e.g. SANAKHEMUNDI MARRIAGE VERIFY LIST)
 * =========================================================================
 */

/**
 * Generate Marriage Verification List PDF
 */
export function exportMarriageVerificationPDF(records, options = {}) {
  const {
    block = 'All',
    search = ''
  } = options;

  let filtered = [...records];
  if (block && block !== 'All') {
    filtered = filtered.filter(r => (r.block || '').toLowerCase() === block.toLowerCase());
  }
  if (search && search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(r =>
      (r.beneficiaryName && r.beneficiaryName.toLowerCase().includes(q)) ||
      (r.regNo && r.regNo.toLowerCase().includes(q)) ||
      (r.marriageRegdNo && r.marriageRegdNo.toLowerCase().includes(q)) ||
      (r.groomName && r.groomName.toLowerCase().includes(q)) ||
      (r.daughterName && r.daughterName.toLowerCase().includes(q))
    );
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const isSpecificBlock = Boolean(block && block !== 'All');
  const blockHeader = isSpecificBlock ? block.toUpperCase() : 'ALL BLOCKS';
  const mainTitle = isSpecificBlock ? `${blockHeader} MARRIAGE VERIFY LIST` : 'MARRIAGE VERIFY LIST';

  // Top Decorative Bar
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Official Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(mainTitle, pageWidth / 2, 14, { align: 'center' });

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(
    "Odisha Building & Other Construction Workers' Welfare Board • Marriage Verification Register",
    pageWidth / 2,
    19.5,
    { align: 'center' }
  );

  // Meta Info Strip
  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const metaText = `Block: ${blockHeader}   |   Total Verified Beneficiaries: ${filtered.length}   |   Date Generated: ${todayStr}`;
  doc.text(metaText, pageWidth / 2, 24.5, { align: 'center' });

  // Line separator
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(10, 27, pageWidth - 10, 27);

  // Table Headers matching uploaded image exactly:
  // SL NO | Registration Number | Beneficiary Name | Block | Certifying Authority | Marriage certificate regis Date | Marriage Regd. No | Marriage for | Date of Marriage | Name of Groom | Name of Daughter
  const tableHeaders = [
    'SL\nNO',
    'Registration\nNumber',
    'Beneficiary\nName',
    'Block',
    'Certifying\nAuthority',
    'Marriage certificate\nregis Date',
    'Marriage\nRegd. No',
    'Marriage\nfor',
    'Date of\nMarriage',
    'Name of\nGroom',
    'Name of\nDaughter'
  ];

  const tableRows = filtered.map((r, index) => {
    return [
      r.slNo || index + 1,
      r.regNo || '—',
      (r.beneficiaryName || '—').toUpperCase(),
      (r.block || '—').toUpperCase(),
      r.certifyingAuthority || '—',
      r.marriageCertDate || '—',
      r.marriageRegdNo || '—',
      r.marriageFor || 'Daughter',
      r.dateOfMarriage || '—',
      (r.groomName || '—').toUpperCase(),
      (r.daughterName || '—').toUpperCase()
    ];
  });

  doc.autoTable({
    head: [tableHeaders],
    body: tableRows.length > 0 ? tableRows : [['—', 'No marriage verification records found', '—', '—', '—', '—', '—', '—', '—', '—', '—']],
    startY: 30,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      valign: 'middle'
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      lineColor: [148, 163, 184],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 }, // SL NO
      1: { cellWidth: 28, fontStyle: 'bold' }, // Regd Number
      2: { cellWidth: 34, fontStyle: 'bold' }, // Beneficiary Name
      3: { cellWidth: 24 },                   // Block
      4: { cellWidth: 28 },                   // Certifying Authority
      5: { cellWidth: 26, halign: 'center' }, // Regd Date
      6: { cellWidth: 25, halign: 'center' }, // Regd No
      7: { cellWidth: 20, halign: 'center' }, // Marriage for
      8: { cellWidth: 24, halign: 'center' }, // Date of Marriage
      9: { cellWidth: 28 },                   // Groom Name
      10: { cellWidth: 'auto' }               // Daughter Name
    },
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => {
      const pageStr = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'ShramikSetu Marriage Verification System • Official Confidential Verification Register',
        10,
        pageHeight - 6
      );
      doc.text(pageStr, pageWidth - 10, pageHeight - 6, { align: 'right' });
    }
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanBlock = isSpecificBlock ? block.replace(/\s+/g, '_').toUpperCase() : 'ALL_BLOCKS';
  const filename = `${cleanBlock}_MARRIAGE_VERIFY_LIST_${dateStr}.pdf`;
  doc.save(filename);

  return { count: filtered.length, filename };
}

/**
 * Generate Marriage Verification List Excel
 */
export function exportMarriageVerificationExcel(records, options = {}) {
  const {
    block = 'All',
    search = ''
  } = options;

  let filtered = [...records];
  if (block && block !== 'All') {
    filtered = filtered.filter(r => (r.block || '').toLowerCase() === block.toLowerCase());
  }
  if (search && search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(r =>
      (r.beneficiaryName && r.beneficiaryName.toLowerCase().includes(q)) ||
      (r.regNo && r.regNo.toLowerCase().includes(q)) ||
      (r.marriageRegdNo && r.marriageRegdNo.toLowerCase().includes(q)) ||
      (r.groomName && r.groomName.toLowerCase().includes(q)) ||
      (r.daughterName && r.daughterName.toLowerCase().includes(q))
    );
  }

  const isSpecificBlock = Boolean(block && block !== 'All');
  const blockHeader = isSpecificBlock ? block.toUpperCase() : 'ALL BLOCKS';
  const sheetTitle = isSpecificBlock ? `${blockHeader} Verify` : 'Marriage Verify List';

  // Excel Headers matching uploaded image exactly
  const exportRows = filtered.map((r, index) => ({
    'SL NO': r.slNo || index + 1,
    'Registration Number': sanitizeSpreadsheetValue(r.regNo || ''),
    'Beneficiary Name': sanitizeSpreadsheetValue(r.beneficiaryName || ''),
    'Block': sanitizeSpreadsheetValue(r.block || ''),
    'Certifying Authority': sanitizeSpreadsheetValue(r.certifyingAuthority || ''),
    'Marriage certificate regis Date': r.marriageCertDate || '',
    'Marriage Regd. No': sanitizeSpreadsheetValue(r.marriageRegdNo || ''),
    'Marriage for': r.marriageFor || 'Daughter',
    'Date of Marriage': r.dateOfMarriage || '',
    'Name of Groom': sanitizeSpreadsheetValue(r.groomName || ''),
    'Name of Daughter': sanitizeSpreadsheetValue(r.daughterName || ''),
    'Mobile Number': sanitizeSpreadsheetValue(r.phone || ''),
    'Remarks': sanitizeSpreadsheetValue(r.remarks || '')
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);

  worksheet['!cols'] = [
    { wch: 8 },  // SL NO
    { wch: 22 }, // Registration Number
    { wch: 26 }, // Beneficiary Name
    { wch: 18 }, // Block
    { wch: 22 }, // Certifying Authority
    { wch: 22 }, // Marriage certificate regis Date
    { wch: 20 }, // Marriage Regd. No
    { wch: 15 }, // Marriage for
    { wch: 18 }, // Date of Marriage
    { wch: 24 }, // Name of Groom
    { wch: 24 }, // Name of Daughter
    { wch: 16 }, // Mobile Number
    { wch: 22 }  // Remarks
  ];

  const workbook = XLSX.utils.book_new();
  const sheetName = `${blockHeader.slice(0, 20)} Verify List`;
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const cleanBlock = isSpecificBlock ? block.replace(/\s+/g, '_').toUpperCase() : 'ALL_BLOCKS';
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${cleanBlock}_MARRIAGE_VERIFY_LIST_${dateStr}.xlsx`;

  XLSX.writeFile(workbook, filename, { bookType: 'xlsx' });

  return { count: filtered.length, filename };
}
