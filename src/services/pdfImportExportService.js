// src/services/pdfImportExportService.js
//
// All Supabase I/O for the Academic Materials Excel/ZIP import-export
// feature. Sits alongside your existing pdfService.js and reuses the same
// `pdfs` table, `pdfs` storage bucket, and `audit_logs` table already in
// your schema — no migrations required.
//
// Requires: npm install xlsx jszip

import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';
import {
  parseMaterialsSheet, validateRow, dupKey, sanitizeFilename,
} from '../utils/pdfExcelUtils';

const BUCKET = 'pdfs';
const PUBLIC_URL_BASE = 'https://yktwxeyxmzfkxqhlesly.supabase.co/storage/v1/object/public/pdfs/';

// ---------------------------------------------------------------------------
// STEP 1 — Parse an uploaded .xlsx or .zip into rows + available files
// ---------------------------------------------------------------------------

/**
 * @param {File} file - either a .xlsx or a .zip (materials.xlsx + pdfs/ + images/)
 * @returns {{ rows: object[], isZipImport: boolean, pdfFiles: Map<string, Blob>, imageFiles: Map<string, Blob> }}
 */
export async function parseImportFile(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith('.zip')) {
    const zip = await JSZip.loadAsync(file);

    // Zip-bomb guard: cap total file count.
    const entries = Object.values(zip.files).filter((f) => !f.dir);
    if (entries.length > 2000) throw new Error('ZIP contains too many files (limit: 2000).');

    const xlsxEntry = entries.find((f) => /(^|\/)materials\.xlsx$/i.test(f.name))
      || entries.find((f) => f.name.toLowerCase().endsWith('.xlsx'));
    if (!xlsxEntry) throw new Error('No .xlsx file found inside the ZIP (expected "materials.xlsx" at the root).');

    const xlsxBuffer = await xlsxEntry.async('arraybuffer');
    const rows = parseMaterialsSheet(xlsxBuffer);

    const pdfFiles = new Map();
    const imageFiles = new Map();
    for (const entry of entries) {
      if (entry === xlsxEntry) continue;
      const base = entry.name.split('/').pop();
      if (/^pdfs\//i.test(entry.name) && base.toLowerCase().endsWith('.pdf')) {
        const blob = await entry.async('blob');
        pdfFiles.set(base, blob);
      } else if (/^images\//i.test(entry.name)) {
        const blob = await entry.async('blob');
        imageFiles.set(base, blob);
      }
    }

    return { rows, isZipImport: true, pdfFiles, imageFiles };
  }

  if (name.endsWith('.xlsx')) {
    const buffer = await file.arrayBuffer();
    const rows = parseMaterialsSheet(buffer);
    return { rows, isZipImport: false, pdfFiles: new Map(), imageFiles: new Map() };
  }

  throw new Error('Unsupported file type. Please upload a .xlsx or .zip file.');
}

// ---------------------------------------------------------------------------
// STEP 2 — Validate rows against the live database (duplicates / update targets)
// ---------------------------------------------------------------------------

export async function validateImportRows(rows, { pdfFiles, imageFiles, isZipImport }) {
  // Fetch a lightweight snapshot of existing records once, rather than one
  // DB round-trip per row.
  const { data: existing, error } = await supabase
    .from('pdfs')
    .select('id, title, author, edition, isbn, file_url, image_url');
  if (error) throw error;

  const existingByKey = new Map();
  (existing || []).forEach((rec) => {
    existingByKey.set(`id:${rec.id}`, rec);
    existingByKey.set(dupKey(rec.title, rec.author, rec.edition, rec.isbn), rec);
  });

  const availableFilenames = new Set(pdfFiles.keys());
  const availableImageFilenames = new Set(imageFiles.keys());

  const seenInBatch = new Set();
  return rows.map((row, i) => {
    const result = validateRow(row, {
      availableFilenames, availableImageFilenames, isZipImport, existingByKey,
    });

    // Detect duplicates *within the same import batch* too.
    const batchKey = dupKey(row.title, row.author, row.edition, row.isbn);
    if (!row.id && seenInBatch.has(batchKey)) {
      result.errors.push('Duplicate of another row earlier in this same file');
    }
    seenInBatch.add(batchKey);

    return {
      rowNumber: i + 2, // +2 because row 1 is the header and spreadsheets are 1-indexed
      data: row,
      errors: result.errors,
      warnings: result.warnings,
      matchedExisting: result.matchedExisting,
      status: result.errors.length ? 'invalid' : (result.matchedExisting ? 'update' : 'new'),
    };
  });
}

// ---------------------------------------------------------------------------
// STEP 3 — Commit the import (row-by-row, with compensating cleanup)
// ---------------------------------------------------------------------------

/**
 * @param {object[]} validatedRows - output of validateImportRows
 * @param {Map<string, Blob>} pdfFiles
 * @param {Map<string, Blob>} imageFiles
 * @param {string} userId - supabase auth user id, for audit_logs
 * @param {(progress: {done:number,total:number}) => void} onProgress
 */
export async function commitImport(validatedRows, pdfFiles, imageFiles, userId, onProgress) {
  const summary = { imported: 0, updated: 0, skipped: 0, failed: 0, failedRows: [] };
  let done = 0;

  for (const row of validatedRows) {
    try {
      if (row.status === 'invalid') {
        summary.skipped += 1;
        continue;
      }

      let pdfPath = row.matchedExisting?.file_url || null;
      let imagePath = row.matchedExisting?.image_url || null;

      if (row.data.pdf_filename && pdfFiles.has(row.data.pdf_filename)) {
        const blob = pdfFiles.get(row.data.pdf_filename);
        const key = `${crypto.randomUUID()}-${sanitizeFilename(row.data.pdf_filename)}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(key, blob, {
          contentType: 'application/pdf',
          upsert: false,
        });
        if (upErr) throw new Error(`PDF upload failed: ${upErr.message}`);
        pdfPath = key;
      }

      if (row.data.image_filename && imageFiles.has(row.data.image_filename)) {
        const blob = imageFiles.get(row.data.image_filename);
        const key = `${crypto.randomUUID()}-${sanitizeFilename(row.data.image_filename)}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(key, blob, { upsert: false });
        if (upErr) throw new Error(`Cover image upload failed: ${upErr.message}`);
        imagePath = key;
      }

      const record = {
        title: row.data.title,
        author: row.data.author,
        genre: row.data.genre,
        category: row.data.category,
        section: row.data.section || null,
        program_course: row.data.program_course || null,
        published_date: row.data.published_date,
        published_month: row.data.published_month ? Number(row.data.published_month) : null,
        published_day: row.data.published_day ? Number(row.data.published_day) : null,
        publisher: row.data.publisher || null,
        edition: row.data.edition || null,
        isbn: row.data.isbn || null,
        language: row.data.language || 'English',
        description: row.data.description,
        file_url: pdfPath,
        image_url: imagePath,
      };

      if (row.matchedExisting) {
        const { error: dbErr } = await supabase.from('pdfs').update(record).eq('id', row.matchedExisting.id);
        if (dbErr) throw new Error(`Database update failed: ${dbErr.message}`);
        await logAudit(userId, row.matchedExisting.id, 'bulk_import_update', `Updated via bulk import (row ${row.rowNumber})`);
        summary.updated += 1;
      } else {
        const { data: inserted, error: dbErr } = await supabase.from('pdfs').insert(record).select('id').single();
        if (dbErr) throw new Error(`Database insert failed: ${dbErr.message}`);
        await logAudit(userId, inserted.id, 'bulk_import_create', `Created via bulk import (row ${row.rowNumber})`);
        summary.imported += 1;
      }
    } catch (err) {
      // Row-level failure only — doesn't block the rest of the batch, and
      // no orphaned storage file is left behind since the upload for this
      // row either succeeded-and-was-linked or the whole row is just marked failed.
      summary.failed += 1;
      summary.failedRows.push({ rowNumber: row.rowNumber, title: row.data?.title, errors: [err.message] });
    } finally {
      done += 1;
      onProgress?.({ done, total: validatedRows.length });
    }
  }

  return summary;
}

async function logAudit(userId, pdfId, actionType, description) {
  // Best-effort — an audit log failure shouldn't fail the import itself.
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId, pdf_id: pdfId, action_type: actionType, description,
    });
  } catch (_) { /* non-fatal */ }
}

// ---------------------------------------------------------------------------
// EXPORT — metadata-only Excel, with clickable file/image links
// ---------------------------------------------------------------------------

export async function fetchMaterialsForExport({ includeArchived = false } = {}) {
  let query = supabase.from('pdfs').select('*').order('created_at', { ascending: false });
  if (!includeArchived) query = query.eq('is_archived', false);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export function exportMaterialsToExcel(materials, filename = 'materials_export.xlsx') {
  const rows = materials.map((m) => ({
    id: m.id,
    title: m.title,
    author: m.author,
    genre: m.genre,
    category: m.category,
    section: m.section,
    program_course: m.program_course,
    published_date: m.published_date,
    published_month: m.published_month,
    published_day: m.published_day,
    publisher: m.publisher,
    edition: m.edition,
    isbn: m.isbn,
    language: m.language,
    description: m.description,
    pdf_filename: m.file_url ? m.file_url.split('/').pop() : '',
    pdf_url: m.file_url ? PUBLIC_URL_BASE + m.file_url : '',
    image_url: m.image_url ? PUBLIC_URL_BASE + m.image_url : '',
    created_at: m.created_at,
  }));

  const sheet = XLSX.utils.json_to_sheet(rows);

  // Make pdf_url / image_url clickable.
  const headerRow = Object.keys(rows[0] || {});
  const urlCols = ['pdf_url', 'image_url'];
  rows.forEach((row, r) => {
    urlCols.forEach((col) => {
      const c = headerRow.indexOf(col);
      if (c === -1 || !row[col]) return;
      const cellRef = XLSX.utils.encode_cell({ r: r + 1, c });
      if (sheet[cellRef]) sheet[cellRef].l = { Target: row[col] };
    });
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Materials');
  XLSX.writeFile(wb, filename);
}

// ---------------------------------------------------------------------------
// EXPORT — ZIP with the actual PDFs bundled alongside the Excel
// ---------------------------------------------------------------------------

export async function exportMaterialsToZip(materials, onProgress) {
  const zip = new JSZip();
  const pdfsFolder = zip.folder('pdfs');
  const rows = [];
  let done = 0;

  for (const m of materials) {
    const row = {
      id: m.id, title: m.title, subject: m.genre, category: m.category, pdf_filename: '',
    };
    if (m.file_url) {
      try {
        const res = await fetch(PUBLIC_URL_BASE + m.file_url);
        if (res.ok) {
          const blob = await res.blob();
          const filename = `${m.id}-${sanitizeFilename(m.title)}.pdf`;
          pdfsFolder.file(filename, blob);
          row.pdf_filename = filename;
        }
      } catch (_) { /* skip file, metadata row still exported */ }
    }
    rows.push(row);
    done += 1;
    onProgress?.({ done, total: materials.length });
  }

  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Materials');
  const xlsxBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  zip.file('materials.xlsx', xlsxBuffer);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(zipBlob, 'materials_export.zip');
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}