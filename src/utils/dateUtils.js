/**
 * Date Utility Helpers for ShramikSetu Portal
 * Ensures consistent Indian Standard Government Date formatting (DD-MM-YYYY)
 * without raw timestamps, time offsets, or timezone noise.
 */

/**
 * Format any date string (ISO, timestamp, JS Date string, etc.) into DD-MM-YYYY
 * e.g. "Tue Mar 10 2026 00:00:00 GMT+0530 (India Standard Time)" -> "10-03-2026"
 */
export function formatDateOnly(dateVal) {
  if (!dateVal) return '—';
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (!trimmed) return '—';
    // If already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-');
      return `${d}-${m}-${y}`;
    }
    // If DD-MM-YYYY or DD/MM/YYYY
    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(trimmed)) {
      return trimmed.replace(/\//g, '-');
    }
  }

  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Format any date into HTML5 <input type="date"> format (YYYY-MM-DD)
 */
export function toDateInputValue(dateVal) {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (!trimmed) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const dmyMatch = trimmed.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      return `${y}-${m}-${d}`;
    }
  }

  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
