// pdfExcelUtils.js
//
// Pure, framework-free helpers for the Academic Materials Excel import/export
// feature. No Supabase calls live here — this file only knows about
// spreadsheets and validation rules, so it's easy to unit test.
//
// Requires: npm install xlsx

import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Column contract
// ---------------------------------------------------------------------------
// Mirrors the fields actually present on the `pdfs` table (see PdfUploads.jsx
// EMPTY_FORM) plus two file-linking columns that don't exist in the DB.
export const REQUIRED_COLUMNS = [
  'title', 'author', 'genre', 'category', 'published_date', 'description',
];

export const OPTIONAL_COLUMNS = [
  'id', // leave blank for new records; fill in (from an export) to update an existing one
  'section', 'program_course', 'published_month', 'published_day',
  'publisher', 'edition', 'isbn', 'language',
  'pdf_filename', 'image_filename',
];

export const ALL_COLUMNS = [...REQUIRED_COLUMNS.slice(0, 2), 'genre', 'category',
  'section', 'program_course', 'published_date', 'published_month', 'published_day',
  'publisher', 'edition', 'isbn', 'language', 'description',
  'pdf_filename', 'image_filename', 'id'];

export const VALID_CATEGORIES = ['book', 'academic paper'];

// ---------------------------------------------------------------------------
// Template generation
// ---------------------------------------------------------------------------

const EXAMPLE_ROW = {
  title: 'Introduction to Biology',
  author: 'Jane Dela Cruz',
  genre: 'Biology',
  category: 'book',
  section: 'Reference',
  program_course: 'BS Biology',
  published_date: '2024',
  published_month: '3',
  published_day: '',
  publisher: 'GLC Press',
  edition: '2nd Edition',
  isbn: '978-3-16-148410-0',
  language: 'English',
  description: 'Basic biology material for first-year students.',
  pdf_filename: 'biology_intro.pdf',
  image_filename: 'biology_intro_cover.jpg',
  id: '',
};

const INSTRUCTIONS = [
  ['Column', 'Required?', 'Notes'],
  ['id', 'No', 'Leave blank to create a new record. Fill in an existing ID (from an export) to update that record instead.'],
  ['title', 'Yes', ''],
  ['author', 'Yes', ''],
  ['genre', 'Yes', 'Free text, e.g. "Biology", "Fiction, Drama"'],
  ['category', 'Yes', `Must be exactly one of: ${VALID_CATEGORIES.join(' | ')}`],
  ['section', 'No', 'e.g. Fiction, Nonfiction, Thesis, Capstone Project, Reference, Other'],
  ['program_course', 'No', 'e.g. BS Computer Science'],
  ['published_date', 'Yes', '4-digit year, cannot be in the future'],
  ['published_month', 'No', 'Number 1-12'],
  ['published_day', 'No', 'Number, valid for the given month/year'],
  ['publisher', 'No', ''],
  ['edition', 'No', ''],
  ['isbn', 'No', ''],
  ['language', 'No', 'Defaults to English if left blank'],
  ['description', 'Yes', ''],
  ['pdf_filename', 'Depends', 'Required if you are importing a ZIP with PDFs. Must exactly match a filename inside the pdfs/ folder of the ZIP.'],
  ['image_filename', 'No', 'Same matching rule as pdf_filename, but looked for in an images/ folder.'],
  [],
  ['How to import PDFs', '', ''],
  ['Option A — Excel only', '', 'Upload just this .xlsx file. Use this to bulk-edit metadata on records that already have a PDF, or to create metadata-only placeholder records.'],
  ['Option B — ZIP', '', 'Put this Excel file at the root of a .zip, plus a pdfs/ folder (and optionally an images/ folder) containing the actual files. Set pdf_filename / image_filename to match. Upload the .zip.'],
];

export function generateTemplateWorkbook() {
  const wb = XLSX.utils.book_new();

  const dataSheet = XLSX.utils.json_to_sheet([EXAMPLE_ROW], { header: ALL_COLUMNS });
  XLSX.utils.book_append_sheet(wb, dataSheet, 'Materials');

  const instructionsSheet = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);
  instructionsSheet['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, instructionsSheet, 'Instructions');

  return wb;
}

export function downloadTemplate(filename = 'academic_materials_template.xlsx') {
  const wb = generateTemplateWorkbook();
  XLSX.writeFile(wb, filename);
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parses an .xlsx ArrayBuffer/Uint8Array into an array of plain row objects.
 * Unknown/misspelled columns are kept on the row (prefixed so validation can
 * flag them) rather than silently dropped.
 */
export function parseMaterialsSheet(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = wb.SheetNames.includes('Materials') ? 'Materials' : wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

  return rows.map((row) => {
    const clean = {};
    const unexpected = [];
    Object.keys(row).forEach((key) => {
      const trimmedKey = String(key).trim();
      if (ALL_COLUMNS.includes(trimmedKey)) {
        clean[trimmedKey] = typeof row[key] === 'string' ? row[key].trim() : row[key];
      } else {
        unexpected.push(trimmedKey);
      }
    });
    if (unexpected.length) clean.__unexpectedColumns = unexpected;
    return clean;
  });
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates a single parsed row.
 * @param {object} row - parsed row from parseMaterialsSheet
 * @param {Set<string>} availableFilenames - filenames present in the ZIP's pdfs/ folder (empty set for Excel-only import)
 * @param {Set<string>} availableImageFilenames
 * @param {boolean} isZipImport - whether pdf_filename is expected to resolve to a real file
 * @param {Map<string, object>} existingByKey - map of "title|author|edition|isbn" -> existing record, for duplicate detection
 * @returns {{ errors: string[], warnings: string[], matchedExisting: object|null }}
 */
export function validateRow(row, { availableFilenames = new Set(), availableImageFilenames = new Set(), isZipImport = false, existingByKey = new Map() } = {}) {
  const errors = [];
  const warnings = [];
  const currentYear = new Date().getFullYear();

  if (row.__unexpectedColumns?.length) {
    warnings.push(`Unrecognized column(s) ignored: ${row.__unexpectedColumns.join(', ')}`);
  }

  REQUIRED_COLUMNS.forEach((col) => {
    if (!row[col] || String(row[col]).trim() === '') errors.push(`Missing required field: ${col}`);
  });

  if (row.category && !VALID_CATEGORIES.includes(row.category)) {
    errors.push(`Invalid category "${row.category}" — must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  if (row.published_date) {
    const year = String(row.published_date).trim();
    if (!/^\d{4}$/.test(year)) {
      errors.push('published_date must be a 4-digit year');
    } else if (Number(year) > currentYear) {
      errors.push(`published_date cannot be later than ${currentYear}`);
    }
  }

  if (row.published_month) {
    const m = Number(row.published_month);
    if (!Number.isInteger(m) || m < 1 || m > 12) errors.push('published_month must be a number from 1-12');
  }
  if (row.published_day) {
    const d = Number(row.published_day);
    if (!Number.isInteger(d) || d < 1 || d > 31) errors.push('published_day must be a valid day number');
  }
  if (row.published_day && !row.published_month) {
    errors.push('published_day was set without a published_month');
  }

  if (row.isbn && !/^[0-9Xx-]{5,20}$/.test(row.isbn)) {
    warnings.push('ISBN format looks unusual — double-check it');
  }

  // PDF filename checks
  if (isZipImport) {
    if (!row.pdf_filename) {
      errors.push('pdf_filename is required when importing a ZIP');
    } else if (!availableFilenames.has(row.pdf_filename)) {
      errors.push(`PDF file not found in ZIP: "${row.pdf_filename}"`);
    }
    if (row.image_filename && !availableImageFilenames.has(row.image_filename)) {
      warnings.push(`Cover image not found in ZIP: "${row.image_filename}" — will import without a cover`);
    }
  } else if (row.pdf_filename) {
    warnings.push('pdf_filename is ignored for Excel-only imports (no ZIP was provided)');
  }

  // Duplicate / update-target detection
  let matchedExisting = null;
  if (row.id) {
    matchedExisting = existingByKey.get(`id:${row.id}`) || null;
    if (!matchedExisting) errors.push(`id "${row.id}" does not match any existing record`);
  } else {
    const key = dupKey(row.title, row.author, row.edition, row.isbn);
    const existing = existingByKey.get(key);
    if (existing) {
      matchedExisting = existing;
      warnings.push(`Duplicate of existing record "${existing.title}" (id ${existing.id}) — will be treated as an update`);
    }
  }

  return { errors, warnings, matchedExisting };
}

export function dupKey(title, author, edition, isbn) {
  return ['t', title, author, edition, isbn]
    .map((v) => String(v || '').trim().toLowerCase())
    .join('|');
}

/** Sanitizes a user-supplied filename fragment before it's ever used to build a storage key. */
export function sanitizeFilename(name) {
  return String(name || '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 150);
}

// ---------------------------------------------------------------------------
// Error report export (for failed rows after a commit)
// ---------------------------------------------------------------------------

export function downloadErrorReport(failedRows, filename = 'import_errors.xlsx') {
  // failedRows: [{ rowNumber, title, errors: [...] }]
  const sheet = XLSX.utils.json_to_sheet(
    failedRows.map((r) => ({
      row: r.rowNumber,
      title: r.title || '',
      reason: r.errors.join('; '),
    }))
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Errors');
  XLSX.writeFile(wb, filename);
}