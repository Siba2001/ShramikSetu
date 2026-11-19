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
 * Formats clean government letterhead, omits Agent Name, omits repeated Block column.
 * Heading Example: "DIGAPAHANDI NEW CARD LIST"
 */
export function exportBlockWisePDF(applications, options = {}) {
  const {
    block = 'Digapahandi',
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
  const blockHeader = (block && block !== 'All') ? block.toUpperCase() : 'ALL BLOCKS';
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

  // 3. Prepare Columns & Rows tailored to the module (AGENT NAME OMITTED, BLOCK COLUMN OMITTED)
  const s = String(service || '').toLowerCase();
  const isRenewal = s.includes('renewal') || s.includes('contribution');
  const isDeath = s.includes('death');
  const isMaternity = s.includes('maternity');
  const isNewCard = s.includes('new card');

  let tableHeaders = [];
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

  const tableRows = filtered.map((app, index) => {
    const name = (app.applicantName || '—').toUpperCase();
    const track = app.trackNo || '—';
    const st = app.status || 'Pending';
    const rem = app.remarks || app.officer || '—';

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
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 }, // SL
      1: { fontStyle: 'bold', cellWidth: 50 }, // Name
      2: { cellWidth: 35 },                   // Card / Aadhaar
      3: { cellWidth: 32 },                   // Tracking
      4: { cellWidth: 26 },                   // Status
      5: { cellWidth: 'auto' }                // Remarks
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

  const cleanBlockName = (block && block !== 'All') ? block.replace(/\s+/g, '_') : 'All_Blocks';
  const cleanServiceName = moduleName.replace(/\s+/g, '_');
  const filename = `${cleanBlockName}_${cleanServiceName}_LIST_${new Date().toISOString().slice(0, 10)}.pdf`;

  doc.save(filename);
  return { count: filtered.length, filename };
}

/**
 * Generate Block-wise Official Excel Report (.xlsx)
 * Heading Example: Row 1 = "DIGAPAHANDI NEW CARD LIST"
 * Omits Agent Name and omits repeated Block column.
 */
export function exportBlockWiseExcel(applications, options = {}) {
  const {
    block = 'Digapahandi',
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

  const moduleName = getModuleDisplayName(service);
  const blockHeader = (block && block !== 'All') ? block.toUpperCase() : 'ALL BLOCKS';
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

  // Row 4: Column Headers (NO AGENT, NO BLOCK)
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

  // Row 5+: Data Rows
  filtered.forEach((app, idx) => {
    const sl = idx + 1;
    const name = sanitizeSpreadsheetValue((app.applicantName || '').toUpperCase());
    const track = sanitizeSpreadsheetValue(app.trackNo || '');
    const st = sanitizeSpreadsheetValue(app.status || 'Pending');
    const rem = sanitizeSpreadsheetValue(app.remarks || app.officer || '');

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
  });

  const worksheet = XLSX.utils.aoa_to_sheet(sheetAOA);

  // Column Widths
  worksheet['!cols'] = [
    { wch: 8 },  // SL
    { wch: 30 }, // Name
    { wch: 24 }, // Card / Aadhaar
    { wch: 22 }, // Tracking
    { wch: 20 }, // Status / Remark
    { wch: 35 }  // Remarks
  ];

  // Merge header cells across columns
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Row 1 Title
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }  // Row 2 Subtitle
  ];

  const workbook = XLSX.utils.book_new();
  const sheetTabName = `${blockHeader.slice(0, 15)} ${moduleName.slice(0, 10)}`;
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetTabName);

  const cleanBlockName = (block && block !== 'All') ? block.replace(/\s+/g, '_') : 'All_Blocks';
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
