import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sanitizeSpreadsheetValue, maskAadhaar, maskPhone } from './cryptoUtils.js';
import { formatDateOnly } from './dateUtils.js';

/**
 * Universal jsPDF instance constructor that works across all bundler environments (Vite/Rollup/ESM/CJS)
 */
function getJsPdfInstance(options) {
  const Constructor = (typeof jsPDF === 'function') 
    ? jsPDF 
    : (jsPDF?.default || (typeof window !== 'undefined' && (window.jspdf?.jsPDF || window.jsPDF)));
  return new Constructor(options);
}

/**
 * Universal autoTable runner that safely executes under Vite ESM and chunk splitting
 */
function runAutoTable(doc, tableOptions) {
  if (typeof autoTable === 'function') {
    autoTable(doc, tableOptions);
  } else if (autoTable?.default && typeof autoTable.default === 'function') {
    autoTable.default(doc, tableOptions);
  } else if (typeof doc.autoTable === 'function') {
    doc.autoTable(tableOptions);
  } else {
    throw new Error('PDF AutoTable engine is unavailable in the current runtime environment');
  }
}

/**
 * Smart module & scheme matcher across common database and UI aliases
 */
function matchesService(recordService, targetService) {
  if (!targetService || targetService === 'All') return true;
  const s1 = String(recordService || '').toLowerCase().trim();
  const s2 = String(targetService || '').toLowerCase().trim();
  if (!s1 || !s2) return true;
  if (s1 === s2) return true;
  
  if ((s2.includes('renewal') || s2.includes('contribution')) && (s1.includes('renewal') || s1.includes('contribution'))) return true;
  if (s2.includes('marriage') && s1.includes('marriage')) return true;
  if (s2.includes('death') && s1.includes('death')) return true;
  if (s2.includes('maternity') && s1.includes('maternity')) return true;
  if ((s2.includes('education') || s2.includes('grant') || s2.includes('assistance')) && (s1.includes('education') || s1.includes('grant') || s1.includes('assistance'))) return true;
  if (s2.includes('new card') && s1.includes('new card')) return true;

  return false;
}

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
 * Landscape orientation provides spacious, unclipped columns for beneficiary records.
 * Filters strictly according to user-selected UI parameters (Block, Scheme, Status, Agent, Search, Date Range).
 */
export function exportBlockWisePDF(applications, options = {}) {
  const {
    block = 'All',
    service = 'New Card',
    status = 'All',
    agent = 'All',
    searchTerm = '',
    fromDate = '',
    toDate = '',
    alreadyFiltered = false,
    maskPII = false
  } = options;

  // Filter records if not pre-filtered by caller
  let filtered = [...applications];
  if (!alreadyFiltered) {
    if (block && block !== 'All') {
      filtered = filtered.filter(a => (a.block || '').toLowerCase() === block.toLowerCase());
    }
    if (service && service !== 'All') {
      filtered = filtered.filter(a => matchesService(a.serviceType, service));
    }
    if (status && status !== 'All') {
      filtered = filtered.filter(a => {
        const st = (a.status || '').toLowerCase();
        const target = status.toLowerCase();
        if (target === 'pending') return st === 'pending' || st === 'e-sign pending';
        if (target === 'in progress') return st === 'in progress' || st === 'query replied';
        if (target === 'query raised') return st === 'query raised';
        if (target === 'bank reject') return st === 'bank reject' || st === 'rejected';
        return st === target;
      });
    }
    if (agent && agent !== 'All') {
      filtered = filtered.filter(a => (a.agent || '').toLowerCase() === agent.toLowerCase());
    }
    if (searchTerm && searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(a =>
        (a.applicantName && a.applicantName.toLowerCase().includes(q)) ||
        (a.cardNo && a.cardNo.toLowerCase().includes(q)) ||
        (a.aadhaarNo && a.aadhaarNo.toLowerCase().includes(q)) ||
        (a.trackNo && a.trackNo.toLowerCase().includes(q)) ||
        (a.block && a.block.toLowerCase().includes(q)) ||
        (a.agent && a.agent.toLowerCase().includes(q)) ||
        (a.remarks && a.remarks.toLowerCase().includes(q))
      );
    }
    if (fromDate || toDate) {
      filtered = filtered.filter(app => {
        const appDateStr = app.applicationDate || app.date || app.createdAt;
        if (!appDateStr) return true;
        const appDate = new Date(appDateStr);
        if (fromDate && appDate < new Date(fromDate)) return false;
        if (toDate) {
          const end = new Date(toDate);
          end.setHours(23, 59, 59, 999);
          if (appDate > end) return false;
        }
        return true;
      });
    }
  }

  // Use Portrait A4 for crisp, clean 4-5 column layout
  const doc = getJsPdfInstance({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const moduleName = getModuleDisplayName(service);
  const isSingleBlock = Boolean(block && block !== 'All');
  const blockHeader = isSingleBlock ? block.toUpperCase() : 'ALL BLOCKS';
  const mainTitle = `${blockHeader} ${moduleName} LIST`;

  // 1. Top Decorative Blue Bar
  doc.setFillColor(30, 64, 175); // Deep Indigo/Navy (#1E40AF)
  doc.rect(0, 0, pageWidth, 5, 'F');

  // 2. Official Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(mainTitle, pageWidth / 2, 15, { align: 'center' });

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(
    "Odisha Building & Other Construction Workers' Welfare Board (OB&OCWWB)",
    pageWidth / 2,
    20.5,
    { align: 'center' }
  );

  // Meta Info Strip (Date, Total Records, Block)
  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  
  const metaParts = [`Block: ${blockHeader}`];
  if (fromDate || toDate) metaParts.push(`Period: ${fromDate || 'Start'} to ${toDate || 'End'}`);
  metaParts.push(`Total Records: ${filtered.length}`);
  metaParts.push(`Generated: ${todayStr}`);

  doc.text(metaParts.join('   |   '), pageWidth / 2, 25.5, { align: 'center' });

  // Thin separator rule
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.line(12, 28, pageWidth - 12, 28);

  // 3. Prepare Columns & Rows (Agent Name, Status, and Remark removed per official specification)
  const s = String(service || '').toLowerCase();
  const isRenewal = s.includes('renewal') || s.includes('contribution');
  const isDeath = s.includes('death');
  const isMaternity = s.includes('maternity');
  const isNewCard = s.includes('new card');

  const nameColHeader = (isRenewal || isDeath) ? 'CARD HOLDER NAME' : isMaternity ? 'BENEFICIARY NAME' : isNewCard ? 'APPLICANT NAME' : 'BENEFICIARY NAME';
  const idColHeader = isNewCard ? 'AADHAAR NO' : (isRenewal || isDeath || isMaternity) ? 'SHRAMIK CARD NO' : 'CARD / AADHAAR NO';

  let tableHeaders = [];
  if (isSingleBlock) {
    tableHeaders = ['SL', nameColHeader, idColHeader, 'TRACKING NO'];
  } else {
    tableHeaders = ['SL', 'BLOCK', nameColHeader, idColHeader, 'TRACKING NO'];
  }

  const tableRows = filtered.map((app, index) => {
    const sl = index + 1;
    const bName = (app.block || '—').toUpperCase();
    const name = (app.applicantName || '—').toUpperCase();
    const track = app.trackNo || '—';

    let cardOrAadh = '—';
    if (isNewCard) {
      cardOrAadh = maskPII ? maskAadhaar(app.aadhaarNo) : (app.aadhaarNo || '—');
    } else {
      cardOrAadh = app.cardNo || (maskPII ? maskAadhaar(app.aadhaarNo) : app.aadhaarNo) || '—';
    }

    if (isSingleBlock) {
      return [sl, name, cardOrAadh, track];
    } else {
      return [sl, bName, name, cardOrAadh, track];
    }
  });

  // 4. Render Table with AutoTable
  runAutoTable(doc, {
    head: [tableHeaders],
    body: tableRows.length > 0 ? tableRows : [['—', 'No records found matching criteria', '—', '—']],
    startY: 31,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.8,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      valign: 'middle'
    },
    headStyles: {
      fillColor: [30, 58, 138], // Deep Government Blue (#1E3A8A)
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // light slate
    },
    columnStyles: isSingleBlock ? {
      0: { halign: 'center', cellWidth: 14 }, // SL
      1: { fontStyle: 'bold', cellWidth: 84 }, // Name
      2: { cellWidth: 50 },                   // Card / Aadhaar
      3: { cellWidth: 38, halign: 'center', fontStyle: 'bold' } // Tracking No
    } : {
      0: { halign: 'center', cellWidth: 12 }, // SL
      1: { cellWidth: 34 },                   // Block
      2: { fontStyle: 'bold', cellWidth: 68 }, // Name
      3: { cellWidth: 42 },                   // Card / Aadhaar
      4: { cellWidth: 30, halign: 'center', fontStyle: 'bold' } // Tracking No
    },
    margin: { left: 12, right: 12 },
    didDrawPage: (data) => {
      const totalPages = doc.getNumberOfPages ? doc.getNumberOfPages() : doc.internal.getNumberOfPages();
      const pageStr = `Page ${data.pageNumber} of ${totalPages}`;
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        'ShramikSetu Beneficiary Information System • Confidential / Official Use Only',
        12,
        pageHeight - 6
      );
      doc.text(
        pageStr,
        pageWidth - 12,
        pageHeight - 6,
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
 * Formatted with Block Header, Scheme, Agent Name, Tracking No, and status.
 */
export function exportBlockWiseExcel(applications, options = {}) {
  const {
    block = 'All',
    service = 'New Card',
    status = 'All',
    agent = 'All',
    searchTerm = '',
    fromDate = '',
    toDate = '',
    alreadyFiltered = false,
    maskPII = false
  } = options;

  // Filter records if not pre-filtered
  let filtered = [...applications];
  if (!alreadyFiltered) {
    if (block && block !== 'All') {
      filtered = filtered.filter(a => (a.block || '').toLowerCase() === block.toLowerCase());
    }
    if (service && service !== 'All') {
      filtered = filtered.filter(a => matchesService(a.serviceType, service));
    }
    if (status && status !== 'All') {
      filtered = filtered.filter(a => {
        const st = (a.status || '').toLowerCase();
        const target = status.toLowerCase();
        if (target === 'pending') return st === 'pending' || st === 'e-sign pending';
        if (target === 'in progress') return st === 'in progress' || st === 'query replied';
        if (target === 'query raised') return st === 'query raised';
        if (target === 'bank reject') return st === 'bank reject' || st === 'rejected';
        return st === target;
      });
    }
    if (agent && agent !== 'All') {
      filtered = filtered.filter(a => (a.agent || '').toLowerCase() === agent.toLowerCase());
    }
    if (searchTerm && searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(a =>
        (a.applicantName && a.applicantName.toLowerCase().includes(q)) ||
        (a.cardNo && a.cardNo.toLowerCase().includes(q)) ||
        (a.aadhaarNo && a.aadhaarNo.toLowerCase().includes(q)) ||
        (a.trackNo && a.trackNo.toLowerCase().includes(q)) ||
        (a.block && a.block.toLowerCase().includes(q)) ||
        (a.agent && a.agent.toLowerCase().includes(q)) ||
        (a.remarks && a.remarks.toLowerCase().includes(q))
      );
    }
    if (fromDate || toDate) {
      filtered = filtered.filter(app => {
        const appDateStr = app.applicationDate || app.date || app.createdAt;
        if (!appDateStr) return true;
        const appDate = new Date(appDateStr);
        if (fromDate && appDate < new Date(fromDate)) return false;
        if (toDate) {
          const end = new Date(toDate);
          end.setHours(23, 59, 59, 999);
          if (appDate > end) return false;
        }
        return true;
      });
    }
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

  const nameColHeader = (isRenewal || isDeath) ? 'CARD HOLDER NAME' : isMaternity ? 'BENEFICIARY NAME' : isNewCard ? 'APPLICANT NAME' : 'BENEFICIARY NAME';
  const idColHeader = isNewCard ? 'AADHAAR NO' : (isRenewal || isDeath || isMaternity) ? 'NIRMAN SHRAMIK CARD NO' : 'CARD / AADHAAR NO';

  // Build Sheet Rows starting with Header Banner
  const sheetAOA = [
    [mainTitle], // Row 1: Heading
    [
      `Block: ${blockHeader}  |  Scheme: ${service}  |  Total Records: ${filtered.length}  |  Generated on: ${new Date().toISOString().slice(0, 10)}`
    ], // Row 2: Subtitle
    [] // Row 3: Blank separator
  ];

  // Row 4: Column Headers (Agent Name, Status, and Remark removed per official specification)
  if (isSingleBlock) {
    sheetAOA.push(['SL NO', nameColHeader, idColHeader, 'TRACKING NUMBER']);
  } else {
    sheetAOA.push(['SL NO', 'BLOCK', nameColHeader, idColHeader, 'TRACKING NUMBER']);
  }

  // Row 5+: Data Rows
  filtered.forEach((app, idx) => {
    const sl = idx + 1;
    const bName = sanitizeSpreadsheetValue((app.block || '').toUpperCase());
    const name = sanitizeSpreadsheetValue((app.applicantName || '').toUpperCase());
    const track = sanitizeSpreadsheetValue(app.trackNo || '');

    let cardOrAadh = '';
    if (isNewCard) {
      cardOrAadh = sanitizeSpreadsheetValue(maskPII ? maskAadhaar(app.aadhaarNo) : (app.aadhaarNo || ''));
    } else {
      cardOrAadh = sanitizeSpreadsheetValue(app.cardNo || (maskPII ? maskAadhaar(app.aadhaarNo) : app.aadhaarNo) || '');
    }

    if (isSingleBlock) {
      sheetAOA.push([sl, name, cardOrAadh, track]);
    } else {
      sheetAOA.push([sl, bName, name, cardOrAadh, track]);
    }
  });

  const worksheet = XLSX.utils.aoa_to_sheet(sheetAOA);

  // Column Widths
  worksheet['!cols'] = isSingleBlock ? [
    { wch: 8 },  // SL
    { wch: 36 }, // Name
    { wch: 28 }, // Card / Aadhaar
    { wch: 22 }  // Tracking
  ] : [
    { wch: 8 },  // SL
    { wch: 22 }, // Block
    { wch: 34 }, // Name
    { wch: 28 }, // Card / Aadhaar
    { wch: 22 }  // Tracking
  ];

  // Merge header cells across columns
  const lastColIdx = isSingleBlock ? 3 : 4;
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

  // Format data for sheet according to module form fields (Agent Name, Status, and Remarks removed)
  const exportRows = filtered.map((app, index) => {
    const s = (app.serviceType || service || '').toLowerCase();

    // 1. Card Renewal
    if (s.includes('renewal') || s.includes('contribution')) {
      return {
        'SL NO': index + 1,
        'BLOCK': sanitizeSpreadsheetValue(app.block || 'General'),
        'CARD HOLDER NAME': sanitizeSpreadsheetValue(app.applicantName || ''),
        'NIRMAN SHRAMIK CARD NO': sanitizeSpreadsheetValue(app.cardNo || ''),
        'TRACKING NUMBER': sanitizeSpreadsheetValue(app.trackNo || '')
      };
    }

    // 2. Death Benefit
    if (s.includes('death')) {
      return {
        'SL NO': index + 1,
        'BLOCK': sanitizeSpreadsheetValue(app.block || 'General'),
        'CARD HOLDER NAME': sanitizeSpreadsheetValue(app.applicantName || ''),
        'NIRMAN SHRAMIK CARD NO': sanitizeSpreadsheetValue(app.cardNo || ''),
        'TRACKING NUMBER': sanitizeSpreadsheetValue(app.trackNo || '')
      };
    }

    // 3. Maternity Benefit
    if (s.includes('maternity')) {
      return {
        'SL NO': index + 1,
        'BLOCK': sanitizeSpreadsheetValue(app.block || 'General'),
        'BENEFICIARY NAME': sanitizeSpreadsheetValue(app.applicantName || ''),
        'NIRMAN SHRAMIK CARD NO': sanitizeSpreadsheetValue(app.cardNo || ''),
        'TRACKING NUMBER': sanitizeSpreadsheetValue(app.trackNo || '')
      };
    }

    // 4. New Card
    if (s.includes('new card')) {
      return {
        'SL NO': index + 1,
        'BLOCK': sanitizeSpreadsheetValue(app.block || 'General'),
        'APPLICANT NAME': sanitizeSpreadsheetValue(app.applicantName || ''),
        'AADHAAR NO': sanitizeSpreadsheetValue(maskPII ? maskAadhaar(app.aadhaarNo) : (app.aadhaarNo || '')),
        'TRACKING NUMBER': sanitizeSpreadsheetValue(app.trackNo || '')
      };
    }

    // 5. Default / All Modules
    return {
      'SL NO': index + 1,
      'BLOCK': sanitizeSpreadsheetValue(app.block || ''),
      'BENEFICIARY NAME': sanitizeSpreadsheetValue(app.applicantName || ''),
      'SERVICE TYPE': sanitizeSpreadsheetValue(app.serviceType || ''),
      'CARD / AADHAAR NO': sanitizeSpreadsheetValue(app.cardNo || (maskPII ? maskAadhaar(app.aadhaarNo) : app.aadhaarNo) || ''),
      'TRACKING NUMBER': sanitizeSpreadsheetValue(app.trackNo || '')
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);

  worksheet['!cols'] = [
    { wch: 8 },  // SL NO
    { wch: 20 }, // BLOCK
    { wch: 32 }, // APPLICANT / BENEFICIARY NAME
    { wch: 26 }, // CARD / AADHAAR NO
    { wch: 22 }  // TRACKING NUMBER
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

  const doc = getJsPdfInstance({
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
      formatDateOnly(r.marriageCertDate),
      r.marriageRegdNo || '—',
      r.marriageFor || 'Daughter',
      formatDateOnly(r.dateOfMarriage),
      (r.groomName || '—').toUpperCase(),
      (r.daughterName || '—').toUpperCase()
    ];
  });

  runAutoTable(doc, {
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
      const totalPages = doc.getNumberOfPages ? doc.getNumberOfPages() : doc.internal.getNumberOfPages();
      const pageStr = `Page ${data.pageNumber} of ${totalPages}`;
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
    'Marriage certificate regis Date': formatDateOnly(r.marriageCertDate),
    'Marriage Regd. No': sanitizeSpreadsheetValue(r.marriageRegdNo || ''),
    'Marriage for': r.marriageFor || 'Daughter',
    'Date of Marriage': formatDateOnly(r.dateOfMarriage),
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
