import * as XLSX from 'xlsx';

/**
 * Export applications to Excel or CSV
 * @param {Array} applications - List of applications
 * @param {Object} options - { block, service, status, format: 'xlsx' | 'csv', filename }
 */
export function exportApplications(applications, options = {}) {
  const {
    block = 'All',
    service = 'All',
    status = 'All',
    format = 'xlsx',
    filenamePrefix = 'ShramikSetu'
  } = options;

  let filtered = [...applications];

  if (block && block !== 'All') {
    filtered = filtered.filter(a => a.block.toLowerCase() === block.toLowerCase());
  }

  if (service && service !== 'All') {
    filtered = filtered.filter(a => a.serviceType.toLowerCase() === service.toLowerCase());
  }

  if (status && status !== 'All') {
    filtered = filtered.filter(a => a.status.toLowerCase() === status.toLowerCase());
  }

  // Format data for sheet according to module form fields
  const exportRows = filtered.map((app, index) => {
    const s = (app.serviceType || service || '').toLowerCase();

    // 1. Card Renewal
    if (s.includes('renewal') || s.includes('contribution')) {
      return {
        'SL NO': index + 1,
        'BLOCK': app.block || 'General',
        'CARD HOLDER NAME': app.applicantName || '',
        'NIRMAN SHRAMIK CARD NO': app.cardNo || '',
        'TRACKING NUMBER': app.trackNo || '',
        'AGENT NAME': app.agent || '',
        'STATUS': app.status || 'Pending',
        'LAST UPDATED': app.updatedAt ? app.updatedAt.slice(0, 10) : ''
      };
    }

    // 2. Death Benefit
    if (s.includes('death')) {
      return {
        'SL NO': index + 1,
        'BLOCK': app.block || 'General',
        'CARD HOLDER NAME': app.applicantName || '',
        'NIRMAN SHRAMIK CARD NO': app.cardNo || '',
        'TRACKING NUMBER': app.trackNo || '',
        'AGENT NAME': app.agent || '',
        'REMARK / NOTES': app.remarks || '',
        'STATUS': app.status || 'Pending',
        'LAST UPDATED': app.updatedAt ? app.updatedAt.slice(0, 10) : ''
      };
    }

    // 3. Maternity Benefit
    if (s.includes('maternity')) {
      return {
        'SL NO': index + 1,
        'BLOCK': app.block || 'General',
        'BENEFICIARY NAME': app.applicantName || '',
        'NIRMAN SHRAMIK CARD NO': app.cardNo || '',
        'TRACKING NUMBER': app.trackNo || '',
        'AGENT NAME': app.agent || '',
        'REMARK / NOTES': app.remarks || '',
        'STATUS': app.status || 'Pending',
        'LAST UPDATED': app.updatedAt ? app.updatedAt.slice(0, 10) : ''
      };
    }

    // 4. New Card
    if (s.includes('new card')) {
      return {
        'SL NO': index + 1,
        'BLOCK': app.block || 'General',
        'APPLICANT NAME': app.applicantName || '',
        'AADHAAR NO': app.aadhaarNo || '',
        'TRACKING NUMBER': app.trackNo || '',
        'AGENT NAME': app.agent || '',
        'STATUS': app.status || 'Pending',
        'LAST UPDATED': app.updatedAt ? app.updatedAt.slice(0, 10) : ''
      };
    }

    // 5. Default / All Modules
    return {
      'SL NO': index + 1,
      'BLOCK': app.block || '',
      'BENEFICIARY NAME': app.applicantName || '',
      'SERVICE TYPE': app.serviceType || '',
      'CARD NO': app.cardNo || '',
      'AADHAAR NO': app.aadhaarNo || '',
      'TRACK NO': app.trackNo || '',
      'AGENT': app.agent || '',
      'OFFICER': app.officer || '',
      'STATUS': app.status || '',
      'PHONE NO': app.phone || '',
      'REMARKS': app.remarks || '',
      'LAST UPDATED': app.updatedAt ? app.updatedAt.slice(0, 10) : ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 8 },  // SL NO
    { wch: 26 }, // APPLICANT NAME
    { wch: 22 }, // SERVICE TYPE
    { wch: 18 }, // CARD NO
    { wch: 18 }, // AADHAAR NO
    { wch: 16 }, // TRACK NO
    { wch: 16 }, // BLOCK
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

