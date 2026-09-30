import React, { useState } from 'react';
import {
  Box, Typography, Stack, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Chip, Alert, LinearProgress, Table, TableHead, TableRow,
  TableCell, TableBody, useTheme
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloudUploadAlt, faDownload } from '@fortawesome/free-solid-svg-icons';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';

/**
 * Bulk Create Account wizard (select -> preview -> committing -> summary).
 * Visual language is intentionally identical to the former Bulk PDF Upload
 * import wizard. Used by BOTH the Super Admin and Admin account pages:
 *
 *   mode="superadmin" -> can create client / admin / superadmin (same as the
 *                        Super Admin "New Account" modal)
 *   mode="admin"      -> can only create client accounts, all fields required
 *                        (same as the Admin "New Account" modal)
 *
 * Accounts are created through the exact same calls the single-account modals
 * use (supabase.auth.signUp + profiles write), so nothing about your Supabase
 * setup changes. Rows are processed one at a time.
 */

const MAX_ROWS = 200;
const EMAIL_DOMAIN = '@goldenlink.ph';
// Same redirect used by the single-account "New Account" modals.
const REDIRECT_URL = 'https://capstone-group-3-swart.vercel.app/login';

const ROLE_MAP = {
  client: 'client', user: 'client',
  admin: 'admin',
  superadmin: 'superadmin', 'super admin': 'superadmin',
};

const HEADER_MAP = {
  fullname: 'fullName', name: 'fullName',
  idnumber: 'idNumber', id: 'idNumber', studentid: 'idNumber',
  department: 'department',
  yearlevel: 'yearLevel', year: 'yearLevel',
  email: 'email',
  defaultpassword: 'password', password: 'password',
  role: 'role',
};

const FIELD_LABELS = {
  fullName: 'Full Name', idNumber: 'ID Number', department: 'Department',
  yearLevel: 'Year Level', email: 'Email', password: 'Default Password', role: 'Role',
};

const normalizeKey = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
const clean = (v) => String(v ?? '').trim();
const matchOption = (value, list) => list.find((o) => o.toLowerCase() === value.toLowerCase());

const mapRow = (raw) => {
  const out = { fullName: '', idNumber: '', department: '', yearLevel: '', email: '', password: '', role: '' };
  Object.entries(raw).forEach(([k, v]) => {
    const field = HEADER_MAP[normalizeKey(k)];
    if (field) out[field] = clean(v);
  });
  return out;
};

// Same password rules as the single-account modals.
const passwordProblems = (p) => {
  const m = [];
  if (p.length < 8) m.push('at least 8 characters');
  if (!/[A-Z]/.test(p)) m.push('an uppercase letter');
  if (!/[a-z]/.test(p)) m.push('a lowercase letter');
  if (!/\d/.test(p)) m.push('a number');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(p)) m.push('a special character (e.g. !@#$%^&*)');
  return m;
};

const isRateLimit = (err) =>
  err?.status === 429 || /rate limit|too many requests|over_email_send_rate_limit/i.test(err?.message || '');

const BulkCreateAccountDialog = ({
  open,
  onClose,
  mode = 'superadmin',
  departments = [],
  yearLevels = [],
  formatIdNumber,
  createAuditLog,
  onNotify,
  onCompleted,
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  const borderCol = isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const isAdminMode = mode === 'admin';

  const [step, setStep] = useState('select'); // select | preview | committing | summary
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState(null);

  const notify = (message, severity = 'error') => onNotify && onNotify(message, severity);

  const requiredFields = isAdminMode
    ? ['fullName', 'idNumber', 'department', 'yearLevel', 'email', 'password']
    : ['fullName', 'email', 'password'];

  const expectedColumns = (isAdminMode
    ? ['Full Name', 'ID Number', 'Department', 'Year Level', 'Email', 'Default Password']
    : ['Full Name', 'ID Number', 'Department', 'Year Level', 'Email', 'Default Password', 'Role']
  ).join(', ');

  const handleClose = () => {
    setStep('select');
    setBusy(false);
    setRows([]);
    setProgress({ done: 0, total: 0 });
    setSummary(null);
    onClose();
  };

  // ---------- VALIDATION ----------
  const validateRows = async (rawRows) => {
    const seenEmails = new Map();
    const result = [];

    rawRows.forEach((raw, idx) => {
      const data = mapRow(raw);
      if (!Object.values(data).some(Boolean)) return; // skip blank lines
      const errors = [];

      const missing = requiredFields.filter((f) => !data[f]);
      if (missing.length) errors.push(`Missing: ${missing.map((f) => FIELD_LABELS[f]).join(', ')}`);

      if (data.email) {
        data.email = data.email.toLowerCase();
        if (!data.email.endsWith(EMAIL_DOMAIN) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          errors.push(`Email must use ${EMAIL_DOMAIN}`);
        } else if (seenEmails.has(data.email)) {
          errors.push(`Duplicate email in file (row ${seenEmails.get(data.email)})`);
        } else {
          seenEmails.set(data.email, idx + 2);
        }
      }

      if (data.idNumber) {
        if (data.idNumber.replace(/\D/g, '').length !== 10) {
          errors.push('ID Number must be exactly 10 digits (XX-XX-XXXXXX)');
        } else {
          data.idNumber = formatIdNumber(data.idNumber);
        }
      }

      if (data.department) {
        const m = matchOption(data.department, departments);
        if (m) data.department = m; else errors.push(`Unknown department "${data.department}"`);
      }
      if (data.yearLevel) {
        const m = matchOption(data.yearLevel, yearLevels);
        if (m) data.yearLevel = m; else errors.push(`Unknown year level "${data.yearLevel}"`);
      }

      const rawRole = data.role;
      if (isAdminMode) {
        data.role = 'client';
        if (rawRole && ROLE_MAP[rawRole.toLowerCase()] !== 'client') {
          errors.push('Admins can only create client (User) accounts');
        }
      } else {
        const mapped = rawRole ? ROLE_MAP[rawRole.toLowerCase()] : 'client';
        if (mapped) data.role = mapped; else errors.push(`Unknown role "${rawRole}"`);
      }

      if (data.password) {
        const problems = passwordProblems(data.password);
        if (problems.length) errors.push(`Password needs: ${problems.join(', ')}`);
      }

      result.push({
        rowNumber: idx + 2, // row 1 is the header
        data,
        errors,
        warnings: [],
        status: errors.length ? 'invalid' : 'new',
      });
    });

    // Duplicate check against existing profiles (active AND archived).
    const candidates = result.filter((r) => r.status === 'new').map((r) => r.data.email);
    const existing = new Set();
    for (let i = 0; i < candidates.length; i += 100) {
      const chunk = candidates.slice(i, i + 100);
      const { data, error } = await supabase.from('profiles').select('email').in('email', chunk);
      if (error) throw error;
      (data || []).forEach((d) => existing.add((d.email || '').toLowerCase()));
    }
    result.forEach((r) => {
      if (r.status === 'new' && existing.has(r.data.email)) {
        r.status = 'duplicate';
        r.warnings.push('Email already registered — will be skipped');
      }
    });

    return result;
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = null;
    if (!file) return;
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) throw new Error('The file is empty.');
      const raw = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
      if (!raw.length) { notify('The file has no data rows.'); return; }
      if (raw.length > MAX_ROWS) { notify(`Too many rows. Maximum is ${MAX_ROWS} per file.`); return; }
      const validated = await validateRows(raw);
      if (!validated.length) { notify('The file has no data rows.'); return; }
      setRows(validated);
      setStep('preview');
    } catch (err) {
      notify(err.message || 'Failed to read the file.');
    } finally {
      setBusy(false);
    }
  };

  // ---------- CREATION (same calls as the single-account modals) ----------
  const createOne = async (d, originalSession) => {
    const meta = isAdminMode
      ? { full_name: d.fullName, role: 'client' }
      : { full_name: d.fullName, role: d.role, department: d.department, id_number: d.idNumber, year_level: d.yearLevel };

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: d.email,
      password: d.password,
      options: { data: meta, emailRedirectTo: REDIRECT_URL },
    });
    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed.');
    if (authData.user.identities && authData.user.identities.length === 0) {
      throw new Error('This email is already registered!');
    }
    // If email confirmation is off, signUp may switch the session to the new
    // user. Put the admin's own session back so the rest of the batch (and the
    // page) keep running as the admin.
    if (authData.session && originalSession) {
      await supabase.auth.setSession({
        access_token: originalSession.access_token,
        refresh_token: originalSession.refresh_token,
      });
    }

    if (isAdminMode) {
      const { error } = await supabase.from('profiles').insert([{
        id: authData.user.id, email: d.email, full_name: d.fullName,
        id_number: d.idNumber, department: d.department, year_level: d.yearLevel, role: 'client',
      }]);
      if (error) throw error;
      return 'ok';
    }
    const { error } = await supabase.from('profiles').upsert([{
      id: authData.user.id, email: d.email, full_name: d.fullName, role: d.role,
      department: d.department, id_number: d.idNumber, year_level: d.yearLevel,
      is_archived: false, is_active: true,
    }]);
    // Mirrors the single flow: the auth account exists, only the profile sync lagged.
    return error ? 'partial' : 'ok';
  };

  const handleConfirm = async () => {
    const toCreate = rows.filter((r) => r.status === 'new');
    setStep('committing');
    setProgress({ done: 0, total: toCreate.length });

    let created = 0;
    let partial = 0;
    let aborted = false;
    const failedRows = [];

    try {
      const { data: { session: originalSession } } = await supabase.auth.getSession();

      for (let i = 0; i < toCreate.length; i += 1) {
        const r = toCreate[i];
        if (aborted) {
          failedRows.push({ ...r, reason: 'Not processed — email rate limit reached. Try again later.' });
          setProgress({ done: i + 1, total: toCreate.length });
          continue;
        }
        try {
          const outcome = await createOne(r.data, originalSession);
          created += 1;
          if (outcome === 'partial') partial += 1;
        } catch (err) {
          if (isRateLimit(err)) aborted = true;
          const msg = err.message?.toLowerCase().includes('already registered')
            ? 'This email is already registered!'
            : err.message || 'Unknown error';
          failedRows.push({ ...r, reason: msg });
        }
        setProgress({ done: i + 1, total: toCreate.length });
      }

      const skippedInvalid = rows.filter((r) => r.status === 'invalid').length;
      const skippedDuplicate = rows.filter((r) => r.status === 'duplicate').length;

      if (createAuditLog) {
        await createAuditLog(
          'Bulk Create Account',
          `Bulk created ${created} ${isAdminMode ? 'client ' : ''}account(s) (${failedRows.length} failed, ${skippedDuplicate} duplicate and ${skippedInvalid} invalid skipped)`
        );
      }

      setSummary({
        created, partial, failed: failedRows.length, skippedInvalid, skippedDuplicate,
        reportRows: [
          ...rows.filter((r) => r.status === 'invalid').map((r) => ({ ...r, reason: r.errors.join(' · ') })),
          ...rows.filter((r) => r.status === 'duplicate').map((r) => ({ ...r, reason: r.warnings.join(' · ') })),
          ...failedRows,
        ],
      });
      setStep('summary');
      if (onCompleted) await onCompleted();
    } catch (err) {
      notify(`Bulk creation failed: ${err.message}`);
      setStep('preview');
    }
  };

  const downloadErrorReport = () => {
    if (!summary) return;
    const data = summary.reportRows
      .sort((a, b) => a.rowNumber - b.rowNumber)
      .map((r) => ({
        Row: r.rowNumber,
        'Full Name': r.data.fullName,
        Email: r.data.email,
        Reason: r.reason,
      }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 32 }, { wch: 80 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Skipped or failed');
    XLSX.writeFile(wb, 'bulk-create-accounts-report.xlsx');
  };

  const invalidCount = rows.filter((r) => r.status === 'invalid').length;
  const duplicateCount = rows.filter((r) => r.status === 'duplicate').length;
  const newCount = rows.filter((r) => r.status === 'new').length;
  const locked = step === 'committing' || busy;

  return (
    <Dialog
      open={open}
      onClose={locked ? undefined : handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, bgcolor: cardBg } }}
    >
      <DialogTitle sx={{ fontWeight: 900 }}>Bulk Create Accounts</DialogTitle>
      <DialogContent dividers sx={{ borderColor: borderCol }}>

        {step === 'select' && !busy && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Upload an Excel (.xlsx) or CSV file with one account per row. Up to {MAX_ROWS} accounts per file.
            </Typography>
            <Button component="label" variant="contained" startIcon={<FontAwesomeIcon icon={faCloudUploadAlt} />}>
              Select File
              <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleFileSelected} />
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
              Expected columns: {expectedColumns}
            </Typography>
            {isAdminMode && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontWeight: 700 }}>
                Admins can only create client (User) accounts.
              </Typography>
            )}
          </Box>
        )}

        {step === 'select' && busy && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 2 }}>Validating records…</Typography>
            <LinearProgress sx={{ borderRadius: 5 }} />
          </Box>
        )}

        {step === 'preview' && (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
              <Chip label={`${newCount} new`} color="success" size="small" />
              <Chip label={`${duplicateCount} duplicate`} color="warning" size="small" />
              <Chip label={`${invalidCount} invalid`} color="error" size="small" />
            </Stack>
            <Box sx={{ maxHeight: 400, overflow: 'auto', border: `1px solid ${borderCol}`, borderRadius: 2 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Row</TableCell>
                    <TableCell>Full Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.rowNumber}>
                      <TableCell>{r.rowNumber}</TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.data.fullName || '—'}</TableCell>
                      <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.data.email || '—'}</TableCell>
                      <TableCell>
                        {r.status === 'invalid' && <Chip label="Invalid" color="error" size="small" />}
                        {r.status === 'duplicate' && <Chip label="Duplicate" color="warning" size="small" />}
                        {r.status === 'new' && <Chip label="New" color="success" size="small" />}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>
                        {[...r.errors, ...r.warnings].join(' · ') || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            {(invalidCount > 0 || duplicateCount > 0) && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {invalidCount + duplicateCount} row(s) are invalid or already registered and will be skipped. Fix them in your file and re-upload, or continue to create the valid accounts only.
              </Alert>
            )}
          </>
        )}

        {step === 'committing' && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Creating accounts… Processing {Math.min(progress.done + 1, progress.total)} of {progress.total} accounts…
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progress.total ? (progress.done / progress.total) * 100 : 0}
              sx={{ borderRadius: 5 }}
            />
          </Box>
        )}

        {step === 'summary' && summary && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>Bulk Creation Complete</Typography>
            <Stack spacing={1}>
              <Typography variant="body2">✅ Successfully created: <strong>{summary.created}</strong></Typography>
              {summary.partial > 0 && (
                <Typography variant="body2">⚠️ Created, profile sync delayed: <strong>{summary.partial}</strong></Typography>
              )}
              <Typography variant="body2">⏭️ Skipped (already registered): <strong>{summary.skippedDuplicate}</strong></Typography>
              <Typography variant="body2">⏭️ Skipped (invalid): <strong>{summary.skippedInvalid}</strong></Typography>
              <Typography variant="body2">❌ Failed records: <strong>{summary.failed}</strong></Typography>
            </Stack>
            {summary.reportRows.length > 0 && (
              <Button
                sx={{ mt: 2 }}
                variant="outlined"
                color="error"
                startIcon={<FontAwesomeIcon icon={faDownload} />}
                onClick={downloadErrorReport}
              >
                Download Error Report
              </Button>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        {step === 'select' && <Button onClick={handleClose} disabled={busy}>Cancel</Button>}
        {step === 'preview' && (
          <>
            <Button onClick={handleClose} color="inherit">Cancel</Button>
            <Button variant="contained" disabled={newCount === 0} onClick={handleConfirm}>
              Create Accounts ({newCount} account{newCount === 1 ? '' : 's'})
            </Button>
          </>
        )}
        {step === 'summary' && <Button variant="contained" onClick={handleClose}>Done</Button>}
      </DialogActions>
    </Dialog>
  );
};

export default BulkCreateAccountDialog;