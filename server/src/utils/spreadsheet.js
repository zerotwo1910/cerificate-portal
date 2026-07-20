const { parse: parseCsv } = require('csv-parse/sync');
const XLSX = require('xlsx');

/**
 * Reads a CSV or XLSX/XLS upload (from multer's memoryStorage) into an array
 * of plain row objects, keyed by whatever headers the file used.
 */
function readRows(file) {
  const isCsv = file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv');

  if (isCsv) {
    return parseCsv(file.buffer, { columns: true, skip_empty_lines: true, trim: true });
  }
  const workbook = XLSX.read(file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

/**
 * Normalizes a row's keys so header variations like "Register Number",
 * "register_number", and "registerNumber" all map to the same key.
 */
function normalizeKeys(row) {
  const normalized = {};
  for (const key of Object.keys(row)) {
    normalized[key.trim().toLowerCase().replace(/[\s_]/g, '')] = row[key];
  }
  return normalized;
}

function field(normalizedRow, ...aliases) {
  for (const alias of aliases) {
    const value = normalizedRow[alias];
    if (value !== undefined && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

module.exports = { readRows, normalizeKeys, field };
