import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Paper, TextField, Button, Typography, Stack, 
  Container, MenuItem, Alert, useTheme, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, 
  LinearProgress, useMediaQuery, Card, CardContent, Divider,
  Snackbar, Avatar
} from '@mui/material';
import { 
  PictureAsPdf, Image as ImageIcon, Add as AddIcon, 
  Close as CloseIcon, ErrorOutline, Send as SendIcon, 
  CalendarMonth, Description, Comment,
  Info, Title, Person, Class, Category, InsertDriveFile, WarningAmber,
  Bookmark, School, Business, ConfirmationNumber, Layers, Language
} from '@mui/icons-material';
import { supabase } from '../../supabaseClient';
import { docKey } from '../../services/pdfService'; 
// NEW: shared publication-date helpers (year / month / day)
import { 
  formatPublishedDate, MONTH_NAMES, getDaysInMonth, isFutureDate, normalizePubDate 
} from '../../utils/formatPublishedDate';
// NEW: tidy sectioned layout + autofill colour fix
import FormSection, { span } from '../../shared/FormLayout';

// Preset options for the Section dropdown. Kept as a plain array (not an
// enum in the DB) so admins/users aren't blocked by values not on this list —
// "Other" falls back to free text.
const SECTION_OPTIONS = [
  'Fiction', 'Nonfiction', 'High School', 'Bibliography', 'Reference',
  'Thesis', 'Capstone Project', 'Research Paper', 'Other'
];

const EMPTY_FORM = { 
  title: '', author: '', description: '', genre: '', 
  category: 'book', published_date: '', upload_reason: '',
  // NEW: optional month / day (published_date stays the required YEAR)
  published_month: '', published_day: '',
  // NEW: digital-library metadata fields
  section: '', program_course: '', publisher: '', isbn: '', edition: '', language: 'English'
};

// ── Browser autofill (dark mode fix) ───────────────────────────────────────
// MUI's dark theme paints autofilled inputs with a blue inset shadow (#266798)
// and Chrome adds its own tinted background on top. This cancels both so the
// field keeps its normal, transparent look, and keeps the text readable.
const autofillReset = (textColor) => {
  const rule = {
    WebkitBoxShadow: 'none !important',   // removes MUI's blue fill
    boxShadow: 'none !important',
    WebkitTextFillColor: `${textColor} !important`,
    caretColor: textColor,
    // pushes Chrome's own autofill background out ~forever, so it never shows
    transition: 'background-color 600000s 0s, color 600000s 0s',
  };
  return {
    '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & input:-webkit-autofill:active, & textarea:-webkit-autofill, & textarea:-webkit-autofill:hover, & textarea:-webkit-autofill:focus': rule,
  };
};

// ── Draft saving (survives a page reload) ───────────────────────────────────
// The text fields are kept in localStorage while the form is open. Files
// (PDF / cover) can't be stored there, so they must be picked again.
const DRAFT_KEY = 'glc_request_upload_draft';
const readDraft = () => {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch { return null; }
};
const writeDraft = (draft) => {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* storage full/blocked */ }
};
const clearDraft = () => {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
};

// ── Duplicate detection ────────────────────────────────────────────────────
// Trim, collapse repeated spaces, ignore upper/lower case.
const norm = (v) => (v ?? '').toString().trim().replace(/\s+/g, ' ').toLowerCase();

// Escape % and _ so they're matched literally by ilike.
const escapeLike = (v) => v.replace(/[\\%_]/g, '\\$&');

// Same title + same author = duplicate. Edition is optional: it only tells two
// documents apart when BOTH have one and they differ (e.g. "2nd" vs "3rd").
// If either side has no edition (most books), title + author is enough.
const isSameDocument = (a, b) =>
  norm(a.title) === norm(b.title) &&
  norm(a.author) === norm(b.author) &&
  !(norm(a.edition) && norm(b.edition) && norm(a.edition) !== norm(b.edition));

// Is this already in the library? (archived documents don't count)
const findLibraryDuplicate = async (form) => {
  const { data, error } = await supabase
    .from('pdfs')
    .select('*')
    .eq('is_archived', false)
    .ilike('title', escapeLike(form.title.trim()))
    .ilike('author', escapeLike(form.author.trim()));
  if (error) throw error;
  return (data || []).find((row) => isSameDocument(row, form)) || null;
};

// Is there already a PENDING upload request for it? When editing, the request
// being edited is left out so it doesn't clash with itself.
const findRequestDuplicate = async (form, excludeId = null) => {
  let query = supabase
    .from('upload_requests')
    .select('*')
    .eq('status', 'pending')
    .ilike('title', escapeLike(form.title.trim()))
    .ilike('author', escapeLike(form.author.trim()));
  if (excludeId) query = query.neq('id', excludeId);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).find((row) => isSameDocument(row, form)) || null;
};

const RequestUpload = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDarkMode = theme.palette.mode === 'dark';
  
  // --- STATE MANAGEMENT ---
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [deletionStatuses, setDeletionStatuses] = useState({}); 
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [pdfFile, setPdfFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null); 
  const [coverPreview, setCoverPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  // Draft restore: draftReady = we've finished checking for a saved draft
  // (don't save anything before that), draftRestored = show the notice.
  const [draftReady, setDraftReady] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const draftUserId = useRef(null);
  const [status, setStatus] = useState({ open: false, type: 'success', message: '' });
  // type: 'library' (already a live PDF) or 'request' (already a pending request)
  const [confirmData, setConfirmData] = useState({ open: false, record: null, type: 'library' });

  // Dialog states
  const [cancelDialog, setCancelDialog] = useState({ open: false, record: null, processing: false });
  const [deleteRequestDialog, setDeleteRequestDialog] = useState({ open: false, record: null, reason: '', processing: false });
  const [submitConfirmDialog, setSubmitConfirmDialog] = useState(false);

  const [formData, setFormData] = useState(EMPTY_FORM);

  // --- FETCH USER REQUESTS ---
  const fetchRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: uploadData, error: uploadError } = await supabase
        .from('upload_requests')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (uploadError) throw uploadError;

      const { data: livePdfs } = await supabase
        .from('pdfs')
        .select('title, author, edition, isbn');

      // A document is identified by title + author + edition + ISBN
      const livePdfKeys = new Set(livePdfs?.map(p => docKey(p)));

      const { data: deleteData } = await supabase
        .from('delete_requests')
        .select(`status, pdfs ( title, author, edition, isbn )`)
        .eq('requested_by', user.id);

      const processedRequests = uploadData.map(req => ({
        ...req,
        isMissingInLibrary: req.status === 'approved' && !livePdfKeys.has(docKey(req))
      }));

      setRequests(processedRequests);
      
      const statusMap = {};
      deleteData?.forEach(d => {
        if (d.pdfs) {
          statusMap[docKey(d.pdfs)] = d.status;
        }
      });
      setDeletionStatuses(statusMap);

    } catch (error) {
      console.error('Fetch error:', error.message);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  useEffect(() => {
    if (coverFile) {
      const url = URL.createObjectURL(coverFile);
      setCoverPreview(url);
      return () => URL.revokeObjectURL(url);
    } else if (isEditing && editingId) {
      const currentReq = requests.find(r => r.id === editingId);
      if (currentReq?.cover_url) {
        setCoverPreview(supabase.storage.from('pdfs').getPublicUrl(currentReq.cover_url).data.publicUrl);
      } else {
        setCoverPreview(null);
      }
    } else {
      setCoverPreview(null);
    }
  }, [coverFile, isEditing, editingId, requests]);

  // Restore an unfinished form after a page reload (same logged-in user only).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        draftUserId.current = user?.id || null;

        const draft = readDraft();
        if (user && draft && draft.userId === user.id && draft.open) {
          setFormData({ ...EMPTY_FORM, ...draft.formData });
          setIsEditing(Boolean(draft.isEditing));
          setEditingId(draft.editingId || null);
          setOpen(true);
          setDraftRestored(true);
        } else if (draft) {
          clearDraft(); // belongs to someone else / stale
        }
      } finally {
        if (!cancelled) setDraftReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Keep the draft up to date while the form is open; drop it once it closes
  // (submitted, cancelled, or closed).
  useEffect(() => {
    if (!draftReady || !draftUserId.current) return;
    if (open) {
      writeDraft({ userId: draftUserId.current, open: true, isEditing, editingId, formData });
    } else {
      clearDraft();
    }
  }, [draftReady, open, isEditing, editingId, formData]);

  // A restored "edit" draft points at a request that no longer exists
  // (e.g. cancelled meanwhile) -> just close it.
  useEffect(() => {
    if (loadingRequests || !isEditing || !editingId) return;
    if (!requests.some((r) => r.id === editingId)) {
      setOpen(false);
      setIsEditing(false);
      setEditingId(null);
      setDraftRestored(false);
      setFormData(EMPTY_FORM);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingRequests, requests]);

  // --- HANDLERS ---
  const handleOpen = () => { 
    setIsEditing(false);
    resetForm();
    setDraftRestored(false);
    setOpen(true); 
    setStatus({ open: false, type: 'success', message: '' }); 
  };
  
  const handleClose = () => { if (!uploading) { setOpen(false); setDraftRestored(false); } };

  const handleEditInitiate = (req) => {
    setDraftRestored(false);
    setIsEditing(true);
    setEditingId(req.id);
    setFormData({
      title: req.title, author: req.author, description: req.description,
      genre: req.genre, category: req.category, 
      published_date: req.published_date != null ? String(req.published_date) : '',
      upload_reason: req.upload_reason,
      // NEW: pull the optional month / day back in when editing
      published_month: req.published_month || '',
      published_day: req.published_day || '',
      // NEW: pull the metadata fields back in when editing an existing request
      section: req.section || '', program_course: req.program_course || '',
      publisher: req.publisher || '', isbn: req.isbn || '',
      edition: req.edition || '', language: req.language || 'English'
    });
    setOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // YEAR (required)
    if (name === 'published_date') {
      const onlyNums = value.replace(/[^0-9]/g, '');
      if (onlyNums.length <= 4) {
        let next = normalizePubDate({ ...formData, [name]: onlyNums });
        // e.g. month was "December", then the year was changed to this year
        // and December hasn't happened yet -> clear the month/day.
        if (isFutureDate(next)) {
          next = { ...next, published_month: '', published_day: '' };
        }
        setFormData(next);
      }
      return;
    }

    // MONTH / DAY (optional)
    if (name === 'published_month' || name === 'published_day') {
      const next = { ...formData, [name]: value };
      if (isFutureDate(next)) {
        showStatus('error', 'Publication date cannot be in the future');
        return;
      }
      setFormData(normalizePubDate(next));
      return;
    }

    if (name === 'genre') {
      const noNums = value.replace(/[0-9]/g, '');
      setFormData({ ...formData, [name]: noNums });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const showStatus = (type, message) => setStatus({ open: true, type, message });
  
  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setPdfFile(null); setCoverFile(null); setCoverPreview(null);
    setEditingId(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        showStatus('error', 'PDF files only!');
        setPdfFile(null);
        e.target.value = null;
        return;
      }
      setPdfFile(file);
    }
  };

  const handleCancelConfirm = async () => {
    const req = cancelDialog.record;
    if (!req) return;
    setCancelDialog(prev => ({ ...prev, processing: true }));
    try {
      const filesToDelete = [req.pdf_url];
      if (req.cover_url) filesToDelete.push(req.cover_url);
      await supabase.storage.from('pdfs').remove(filesToDelete);
      await supabase.from('upload_requests').delete().eq('id', req.id);
      showStatus('success', 'Request cancelled.');
      setCancelDialog({ open: false, record: null, processing: false });
      fetchRequests();
    } catch (error) {
      showStatus('error', error.message);
      setCancelDialog(prev => ({ ...prev, processing: false }));
    }
  };

  const handleSubmitDeleteRequest = async () => {
    if (!deleteRequestDialog.reason.trim()) {
      showStatus('error', 'Please provide a reason.');
      return;
    }
    setDeleteRequestDialog(prev => ({ ...prev, processing: true }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Several editions can share the same title + author, so match on
      // edition and ISBN too instead of expecting a single row.
      const rec = deleteRequestDialog.record;
      const { data: candidates } = await supabase.from('pdfs')
        .select('id, title, author, edition, isbn')
        .eq('title', rec.title)
        .eq('author', rec.author);
      const pdfRecord = (candidates || []).find(p => docKey(p) === docKey(rec));

      if (!pdfRecord) throw new Error("PDF not found in the library. It may have already been deleted.");

      const { error } = await supabase.from('delete_requests').insert([{
        pdf_id: pdfRecord.id, requested_by: user.id,
        reason: deleteRequestDialog.reason, status: 'pending'
      }]);

      if (error) throw error;

      showStatus('success', 'Deletion request sent.');
      setDeleteRequestDialog({ open: false, record: null, reason: '', processing: false });
      fetchRequests();
    } catch (error) {
      showStatus('error', error.message);
      setDeleteRequestDialog(prev => ({ ...prev, processing: false }));
    }
  };

  const performUploadOrUpdate = async () => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let pdfPath = isEditing ? requests.find(r => r.id === editingId).pdf_url : null;
      let coverPath = isEditing ? requests.find(r => r.id === editingId).cover_url : null;

      if (pdfFile) {
        pdfPath = `requests/pdfs/${Date.now()}_${pdfFile.name}`;
        await supabase.storage.from('pdfs').upload(pdfPath, pdfFile);
      }
      if (coverFile) {
        coverPath = `requests/covers/${Date.now()}_${coverFile.name}`;
        await supabase.storage.from('pdfs').upload(coverPath, coverFile);
      }

      // The form keeps month/day as '' when empty, but the database wants a
      // number or NULL, so convert right before saving.
      const payload = {
        ...formData,
        published_month: formData.published_month ? Number(formData.published_month) : null,
        published_day: formData.published_day ? Number(formData.published_day) : null,
      };

      // payload already carries the metadata fields (section, program_course,
      // publisher, isbn, edition, language) plus the optional month/day, so
      // the spread below picks them up for both insert and update.
      if (isEditing) {
        await supabase.from('upload_requests').update({ ...payload, pdf_url: pdfPath, cover_url: coverPath }).eq('id', editingId);
      } else {
        await supabase.from('upload_requests').insert([{
          client_id: user.id, ...payload, pdf_url: pdfPath, cover_url: coverPath, status: 'pending'
        }]);

        await supabase.from('audit_logs').insert([{
          user_id: user.id,
          action_type: 'Request',
          description: `User submitted a new upload request: ${formData.title}`
        }]);
      }

      resetForm(); fetchRequests(); setOpen(false); setSubmitConfirmDialog(false);
      showStatus('success', 'Processed successfully!');
    } catch (error) {
      showStatus('error', error.message);
    } finally { setUploading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isEditing && !pdfFile) { showStatus('error', 'PDF required.'); return; }
    if (pdfFile && pdfFile.type !== 'application/pdf') { 
        showStatus('error', 'Only PDF files are allowed!'); 
        return; 
    }

    const currentYear = new Date().getFullYear();
    const inputYear = parseInt(formData.published_date);
    if (inputYear > currentYear) {
        showStatus('error', `Invalid year. Please enter a year up to ${currentYear}.`);
        return;
    }
    if (inputYear < 1000) {
        showStatus('error', 'Please enter a valid year.');
        return;
    }
    if (isFutureDate(formData)) {
        showStatus('error', 'Publication date cannot be in the future.');
        return;
    }

    // Duplicate checks: (1) already in the library? (2) already a pending
    // request? Both use title + author (edition only if both have one).
    setChecking(true);
    try {
      const libraryDup = await findLibraryDuplicate(formData);
      if (libraryDup) {
        setConfirmData({ open: true, type: 'library', record: libraryDup });
        return;
      }

      const requestDup = await findRequestDuplicate(formData, isEditing ? editingId : null);
      if (requestDup) {
        setConfirmData({ open: true, type: 'request', record: requestDup });
        return;
      }
    } catch (error) {
      showStatus('error', `Could not check for duplicates: ${error.message}`);
      return;
    } finally {
      setChecking(false);
    }
    
    setSubmitConfirmDialog(true);
  };

  // --- STYLES ---
  const headerStyle = {
    backgroundColor: isDarkMode ? '#112233' : '#1e3a5f',
    '& .MuiTableCell-head': { color: '#ffffff', fontWeight: 800, textTransform: 'uppercase' }
  };
  const cellStyle = { padding: isMobile ? '12px 16px' : '20px 24px', fontSize: '0.95rem' };
  const chipStyle = (status) => ({
    width: isMobile ? '90px' : '110px', fontWeight: 900, borderRadius: '6px', color: 'white',
    bgcolor: status === 'approved' ? '#2e7d32' : status === 'rejected' ? '#d32f2f' : '#ed6c02'
  });

  // Reusable component para sa metadata list rows gaya ng nasa image
  const DetailRow = ({ icon, label, value }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.4 }}>
      <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
        {icon}
      </Box>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, minWidth: '75px' }}>
        {label}:
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', wordBreak: 'break-word', flex: 1 }}>
        {value || 'N/A'}
      </Typography>
    </Box>
  );

  // Grid-based metadata row — matches PdfCard's "Document Info" dialog.
  // Icon and "Label:" never shrink; only the value wraps, and only once the
  // row genuinely runs out of horizontal room (columns are `auto`-sized so
  // short values stay compact and long ones don't force a global reflow).
  const InfoRow = ({ icon, label, value }) => (
    <Typography
      variant="body2"
      component="div"
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        minWidth: 0,
        '& > svg': { flexShrink: 0, color: 'primary.main' },
        '& > strong': { flexShrink: 0 },
        '& > span': {
          minWidth: 0,
          whiteSpace: 'normal',
          overflowWrap: 'anywhere',
        },
      }}
    >
      {icon} <strong>{label}:</strong> <span>{value || 'N/A'}</span>
    </Typography>
  );

  const renderActionButtons = (req) => {
    const delStatus = deletionStatuses[docKey(req)];
    
    if (req.isMissingInLibrary) {
      return (
        <Typography sx={{ fontWeight: 800, color: '#d32f2f', fontSize: '0.75rem', letterSpacing: 1 }}>
          PDF DELETED
        </Typography>
      );
    }
    if (req.status === 'pending') {
      return (
        <Stack direction="row" spacing={1} justifyContent={isMobile ? "flex-start" : "center"}>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={() => handleEditInitiate(req)} 
            sx={{ fontWeight: 800, borderRadius: 1.5, fontSize: '0.75rem', minWidth: '85px', px: 2 }}
          >
            EDIT
          </Button>
          
          <Button 
            variant="outlined" 
            color="error" 
            size="small" 
            onClick={() => setCancelDialog({ open: true, record: req })} 
            sx={{ fontWeight: 800, borderRadius: 1.5, fontSize: '0.75rem', minWidth: '85px', px: 2 }}
          >
            CANCEL
          </Button>
        </Stack>
      );
    }

    if (req.status === 'approved') {
      if (delStatus === 'pending') return <Typography sx={{ fontWeight: 800, color: '#ed6c02', fontSize: '0.75rem', letterSpacing: 1 }}>PENDING DELETION</Typography>;
      if (delStatus === 'approved') return <Typography sx={{ fontWeight: 800, color: '#2e7d32', fontSize: '0.75rem', letterSpacing: 1 }}>DELETE SUCCESS</Typography>;
      if (delStatus === 'rejected') {
        return (
            <Stack direction="column" alignItems={isMobile ? "flex-start" : "center"}>
                <Typography sx={{ fontWeight: 800, color: '#d32f2f', fontSize: '0.7rem' }}>DELETE REJECTED</Typography>
                <Button size="small" onClick={() => setDeleteRequestDialog({ open: true, record: req, reason: '', processing: false })} sx={{ fontSize: '0.6rem', fontWeight: 900 }}>RETRY?</Button>
            </Stack>
        );
      }
      return (
        <Button 
          variant="outlined" 
          color="warning" 
          size="small" 
          startIcon={<SendIcon />} 
          onClick={() => setDeleteRequestDialog({ open: true, record: req, reason: '', processing: false })} 
          sx={{ fontWeight: 800, borderRadius: 1.5, fontSize: '0.7rem' }}
        >
          REQUEST DELETE
        </Button>
      );
    }
    return null;
  };

  // --- Duplicate dialog helpers ---
  const dupIsRequest = confirmData.type === 'request';
  const dupImagePath = dupIsRequest ? confirmData.record?.cover_url : confirmData.record?.image_url;
  const closeDupDialog = () => setConfirmData((prev) => ({ ...prev, open: false }));

  return (
    <Box sx={{ minHeight: '100vh', p: { xs: 2, md: 4 }, bgcolor: 'background.default' }}>
      <Container maxWidth="lg">
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={isMobile ? "flex-start" : "center"} sx={{ mb: 4 }} spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900, color: isDarkMode ? '#ffffff' : '#1e3a5f', fontStyle: 'italic', fontSize: { xs: '1.8rem', md: '3rem' } }}>
              UPLOAD REQUEST
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>RECORDS OF YOUR SUBMISSIONS</Typography>
          </Box>
          <Button fullWidth={isMobile} variant="contained" startIcon={<AddIcon />} onClick={handleOpen} sx={{ bgcolor: isDarkMode ? '#334155' : '#1e3a5f', color: 'white', borderRadius: 1.5, px: 4, py: 1.5, fontWeight: 800 }}>
            REQUEST UPLOAD
          </Button>
        </Stack>

        {loadingRequests ? <LinearProgress /> : (
          <>
            {!isMobile ? (
              <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                <TableContainer>
                  <Table>
                    <TableHead sx={headerStyle}>
                      <TableRow>
                        <TableCell>Target</TableCell>
                        <TableCell>Reason</TableCell>
                        <TableCell>Remarks</TableCell>
                        <TableCell align="center">Status</TableCell>
                        <TableCell align="center">Date</TableCell>
                        <TableCell align="center">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {requests.map((req) => (
                        <TableRow key={req.id} hover>
                          <TableCell sx={{ ...cellStyle, fontWeight: 700, color: isDarkMode ? '#60a5fa' : '#1e3a5f' }}>
                            {req.title}
                            <Typography variant="caption" display="block" sx={{ color: 'text.secondary', fontWeight: 500 }}>{req.author}</Typography>
                          </TableCell>
                          <TableCell sx={cellStyle}>{req.upload_reason}</TableCell>
                          <TableCell sx={{ ...cellStyle, color: req.remarks ? 'text.primary' : 'text.disabled', fontStyle: req.remarks ? 'normal' : 'italic' }}>
                            {req.remarks || 'No remarks yet'}
                          </TableCell>
                          <TableCell align="center" sx={cellStyle}><Chip label={req.status.toUpperCase()} sx={chipStyle(req.status)} /></TableCell>
                          <TableCell align="center" sx={cellStyle}>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                          <TableCell align="center" sx={cellStyle}>{renderActionButtons(req)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            ) : (
              <Stack spacing={2}>
                {requests.map((req) => (
                  <Card key={req.id} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Box sx={{ maxWidth: '70%' }}>
                          <Typography sx={{ fontWeight: 900, color: isDarkMode ? '#60a5fa' : '#1e3a5f', lineHeight: 1.2 }}>
                            {req.title}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                            By {req.author}
                          </Typography>
                        </Box>
                        <Chip size="small" label={req.status.toUpperCase()} sx={{ ...chipStyle(req.status), width: 'auto', px: 1, height: 24, fontSize: '0.65rem' }} />
                      </Stack>
                      
                      <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />
                      
                      <Stack spacing={1.5}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Description sx={{ fontSize: 16, color: 'text.disabled' }} />
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                            "{req.upload_reason}"
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                          <Comment sx={{ fontSize: 16, color: 'text.disabled', mt: 0.3 }} />
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', color: req.remarks ? 'text.primary' : 'text.disabled', fontStyle: req.remarks ? 'normal' : 'italic' }}>
                            {req.remarks || 'No admin remarks'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <CalendarMonth sx={{ fontSize: 16, color: 'text.disabled' }} />
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            Requested: {new Date(req.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Stack>

                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                        {renderActionButtons(req)}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}

            {requests.length === 0 && (
              <Box sx={{ py: 10, textAlign: 'center' }}>
                <Typography sx={{ color: 'text.secondary', fontWeight: 700 }}>No requests found.</Typography>
              </Box>
            )}
          </>
        )}

        {/* --- FORM DIALOG --- */}
        <Dialog 
          open={open} 
          onClose={handleClose} 
          fullScreen={isMobile} 
          fullWidth 
          maxWidth="md" 
          PaperProps={{ sx: { borderRadius: isMobile ? 0 : 1.5 } }}
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>{isEditing ? 'EDIT REQUEST' : 'NEW UPLOAD REQUEST'}</Typography>
            <IconButton onClick={handleClose}><CloseIcon /></IconButton>
          </DialogTitle>
          <form onSubmit={handleSubmit} style={{ height: isMobile ? 'calc(100% - 64px)' : 'auto', display: 'flex', flexDirection: 'column' }}>
            <DialogContent sx={{ p: 3, flexGrow: 1 }}>
              {draftRestored && (
                <Alert severity="info" onClose={() => setDraftRestored(false)} sx={{ mb: 2.5 }}>
                  Your unfinished form was restored after the page reloaded. Files can't be
                  kept across a reload, so please select the PDF{coverPreview ? '' : ' (and cover, if any)'} again.
                </Alert>
              )}
              <Stack spacing={3.5} sx={autofillReset(theme.palette.text.primary)}>

                {/* FILES */}
                <FormSection title="Files" hint="100 MB max file size. Cover image is optional">
                  <Box sx={{ gridColumn: span(3), border: '2px dashed #ccc', borderRadius: 2, p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { borderColor: '#1e3a5f' } }} component="label">
                    <input type="file" hidden accept=".pdf" onChange={handleFileChange} />
                    <PictureAsPdf sx={{ color: pdfFile ? '#0284c7' : 'text.disabled', fontSize: 40 }} />
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mt: 1, wordBreak: 'break-word' }}>{pdfFile ? pdfFile.name.substring(0, 15) : "Select PDF"}</Typography>
                  </Box>
                  <Box sx={{ gridColumn: span(3), border: '2px dashed #ccc', borderRadius: 2, p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { borderColor: '#1e3a5f' } }} component="label">
                    <input type="file" hidden accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} />
                    <ImageIcon sx={{ color: coverFile ? '#16a34a' : 'text.disabled', fontSize: 40 }} />
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mt: 1, wordBreak: 'break-word' }}>{coverFile ? coverFile.name.substring(0, 15) : "Select Cover"}</Typography>
                  </Box>
                </FormSection>

                <Divider />

                {/* DOCUMENT DETAILS */}
                <FormSection title="Document details" hint="Leave fields blank if information is unavailable..">
                  <TextField fullWidth label="Title" name="title" value={formData.title} onChange={handleInputChange} required sx={{ gridColumn: span(6) }} />
                  <TextField fullWidth label="Author" name="author" value={formData.author} onChange={handleInputChange} required sx={{ gridColumn: span(6) }} />

                  <TextField fullWidth label="Genre / Subject" name="genre" value={formData.genre} onChange={handleInputChange} required sx={{ gridColumn: span(3) }} />
                  <TextField select fullWidth label="Category" name="category" value={formData.category} onChange={handleInputChange} required sx={{ gridColumn: span(3) }}>
                    <MenuItem value="book">Book</MenuItem>
                    <MenuItem value="academic paper">Academic Paper</MenuItem>
                  </TextField>

                  <TextField select fullWidth label="Section" name="section" value={formData.section} onChange={handleInputChange} sx={{ gridColumn: span(3) }}>
                    <MenuItem value=""><em>None</em></MenuItem>
                    {SECTION_OPTIONS.map((opt) => (<MenuItem key={opt} value={opt}>{opt}</MenuItem>))}
                  </TextField>
                  <TextField fullWidth label="Program / Course" name="program_course" value={formData.program_course} onChange={handleInputChange} placeholder="e.g., BS Computer Science" sx={{ gridColumn: span(3) }} />
                </FormSection>

                <Divider />

                {/* PUBLICATION DETAILS: Year is required, Month and Day are optional.
                    Day unlocks only after a Month is picked, and only shows the
                    days that month really has. */}
                <FormSection title="Publication details" hint="Year is required. Add the month and day if you know them.">
                  <TextField 
                    fullWidth 
                    label="Year" 
                    name="published_date" 
                    value={formData.published_date} 
                    onChange={handleInputChange} 
                    inputProps={{ maxLength: 4 }} 
                    required 
                    sx={{ gridColumn: span(2) }}
                  />
                  <TextField 
                    select 
                    fullWidth 
                    label="Month (optional)" 
                    name="published_month" 
                    value={formData.published_month} 
                    onChange={handleInputChange}
                    disabled={formData.published_date.length !== 4}
                    sx={{ gridColumn: span(2) }}
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {MONTH_NAMES.map((name, index) => (
                      <MenuItem key={name} value={index + 1}>{name}</MenuItem>
                    ))}
                  </TextField>
                  <TextField 
                    select 
                    fullWidth 
                    label="Day (optional)" 
                    name="published_day" 
                    value={formData.published_day} 
                    onChange={handleInputChange}
                    disabled={!formData.published_month}
                    sx={{ gridColumn: span(2) }}
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {formData.published_month && Array.from(
                      { length: getDaysInMonth(formData.published_date, formData.published_month) },
                      (_, i) => (<MenuItem key={i + 1} value={i + 1}>{i + 1}</MenuItem>)
                    )}
                  </TextField>

                  <TextField fullWidth label="Publisher" name="publisher" value={formData.publisher} onChange={handleInputChange} sx={{ gridColumn: span(3) }} />
                  <TextField fullWidth label="Edition" name="edition" value={formData.edition} onChange={handleInputChange} placeholder="e.g., 2nd Edition" sx={{ gridColumn: span(3) }} />

                  <TextField fullWidth label="ISBN" name="isbn" value={formData.isbn} onChange={handleInputChange} placeholder="e.g., 978-3-16-148410-0" sx={{ gridColumn: span(3) }} />
                  <TextField fullWidth label="Language" name="language" value={formData.language} onChange={handleInputChange} sx={{ gridColumn: span(3) }} />
                </FormSection>

                <Divider />

                {/* DESCRIPTION + REASON */}
                <FormSection title="Description and Reason" hint="Provide a brief description of the document and your reason for uploading it.">
                  <TextField fullWidth multiline rows={3} label="Description / Abstract" name="description" value={formData.description} onChange={handleInputChange} required sx={{ gridColumn: span(6) }} />
                  <TextField fullWidth multiline rows={2} label="Reason for Uploading" name="upload_reason" value={formData.upload_reason} onChange={handleInputChange} required sx={{ gridColumn: span(6) }} />
                </FormSection>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 3, bgcolor: isMobile ? 'background.paper' : 'transparent' }}>
              <Button fullWidth type="submit" variant="contained" disabled={uploading || checking} sx={{ color: 'white', bgcolor: '#1e3a5f', py: 1.5, fontWeight: 900, borderRadius: 2 }}>
                {uploading ? 'PROCESSING...' : checking ? 'CHECKING...' : 'SUBMIT REQUEST'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* --- SUBMIT CONFIRMATION DIALOG ("Document Info", styled like PdfCard's
            See More dialog: fits its content, wraps into a 2-column grid of
            InfoRow lines instead of a fixed-width vertical list) --- */}
        <Dialog 
          open={submitConfirmDialog} 
          onClose={() => !uploading && setSubmitConfirmDialog(false)} 
          maxWidth={false}
          PaperProps={{ 
            sx: { 
              borderRadius: 3,
              width: 'fit-content',
              minWidth: { xs: 'calc(100% - 64px)', sm: 'min(620px, calc(100% - 64px))' },
              maxWidth: 'calc(100% - 64px)',
            } 
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5, fontSize: '1.25rem', pt: 2.5, px: 3 }}>
            <Info color="primary" fontSize="medium" /> Document Info
          </DialogTitle>
          
          <DialogContent dividers sx={{ px: 3, pt: 2, pb: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'center', sm: 'flex-start' }}>
              {/* Cover Image — same aspect-ratio box + fallback treatment as PdfCard */}
              <Box sx={{
                width: { xs: '50%', sm: 160 },
                flexShrink: 0,
                mb: { xs: 1, sm: 0 },
                aspectRatio: '3/4',
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {coverPreview ? (
                  <img 
                    src={coverPreview} 
                    alt={formData.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  <ImageIcon sx={{ fontSize: 50, color: 'text.disabled' }} />
                )}
              </Box>

              <Stack spacing={1.5} sx={{ flexGrow: 1, width: 'auto', minWidth: 0 }}>
                {/* Metadata rows in a responsive 2-column grid — each column is as
                    wide as its longest value, so a long title/author stays on one
                    line and the dialog grows to fit instead of everything wrapping. */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'auto auto' },
                    justifyContent: 'start',
                    columnGap: 3,
                    rowGap: 1,
                  }}
                >
                  <InfoRow icon={<Title fontSize="small" />} label="Title" value={formData.title} />
                  <InfoRow icon={<Person fontSize="small" />} label="Author" value={formData.author} />
                  <InfoRow icon={<Class fontSize="small" />} label="Type" value={formData.category} />
                  <InfoRow icon={<Category fontSize="small" />} label="Genre" value={formData.genre} />
                  {formData.section && <InfoRow icon={<Bookmark fontSize="small" />} label="Section" value={formData.section} />}
                  {formData.program_course && <InfoRow icon={<School fontSize="small" />} label="Program" value={formData.program_course} />}
                  <InfoRow icon={<CalendarMonth fontSize="small" />} label="Published" value={formatPublishedDate(formData)} />
                  {formData.publisher && <InfoRow icon={<Business fontSize="small" />} label="Publisher" value={formData.publisher} />}
                  {formData.isbn && <InfoRow icon={<ConfirmationNumber fontSize="small" />} label="ISBN" value={formData.isbn} />}
                  {formData.edition && <InfoRow icon={<Layers fontSize="small" />} label="Edition" value={formData.edition} />}
                  {formData.language && <InfoRow icon={<Language fontSize="small" />} label="Language" value={formData.language} />}
                  <InfoRow icon={<InsertDriveFile fontSize="small" />} label="File" value={pdfFile ? pdfFile.name : (isEditing ? 'Attached PDF File' : 'None')} />
                </Box>

                <Divider />

                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Description / Abstract
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    lineHeight: 1.6, 
                    fontSize: '0.875rem',
                    // width: 0 + minWidth: 100% lets this fill the column
                    // without itself forcing the dialog wider — only the
                    // InfoRow grid above decides the dialog's width.
                    width: 0,
                    minWidth: '100%',
                  }}
                >
                  {formData.description || 'No description provided.'}
                </Typography>

                <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 1 }}>
                  Reason for Upload
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ fontStyle: 'italic', fontSize: '0.875rem', width: 0, minWidth: '100%' }}
                >
                  "{formData.upload_reason || 'N/A'}"
                </Typography>
              </Stack>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button 
              onClick={() => setSubmitConfirmDialog(false)} 
              disabled={uploading}
              sx={{ fontWeight: 800, color: 'text.secondary' }}
            >
              CLOSE
            </Button>
            <Button 
              onClick={performUploadOrUpdate} 
              variant="contained" 
              disabled={uploading}
              sx={{ color: '#ffffff', bgcolor: '#1e3a5f', px: 3, py: 1, fontWeight: 800, borderRadius: 2 }}
            >
              {uploading ? 'SUBMITTING...' : 'CONFIRM & SUBMIT'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* --- CANCEL DIALOG --- */}
        <Dialog open={cancelDialog.open} onClose={() => setCancelDialog({ open: false, record: null })} PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ textAlign: 'center', fontWeight: 900 }}>Cancel Request?</DialogTitle>
          <DialogContent>
              <Typography variant="body2" align="center">This will remove your pending submission and uploaded files.</Typography>
          </DialogContent>
          <DialogActions sx={{ p: 3, flexDirection: 'column', gap: 1 }}>
            <Button fullWidth variant="contained" color="error" onClick={handleCancelConfirm} disabled={cancelDialog.processing} sx={{ fontWeight: 800 }}>YES, CANCEL</Button>
            <Button fullWidth onClick={() => setCancelDialog({ open: false, record: null })} sx={{ fontWeight: 800 }}>KEEP IT</Button>
          </DialogActions>
        </Dialog>

        {/* --- DELETE REQUEST DIALOG --- */}
        <Dialog open={deleteRequestDialog.open} onClose={() => setDeleteRequestDialog({ ...deleteRequestDialog, open: false })} PaperProps={{ sx: { borderRadius: 3, maxWidth: '450px' } }}>
          <DialogTitle sx={{ fontWeight: 900, color: '#ed6c02', display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningAmber /> Request Deletion
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
              This document is already live in the library. To remove it, you must send a deletion request for Admin review.
            </Typography>
            <TextField fullWidth multiline rows={3} label="Reason for deletion" value={deleteRequestDialog.reason} onChange={(e) => setDeleteRequestDialog({ ...deleteRequestDialog, reason: e.target.value })} placeholder="e.g., I uploaded the wrong version..." />
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setDeleteRequestDialog({ ...deleteRequestDialog, open: false })} sx={{ fontWeight: 700 }}>Close</Button>
            <Button variant="contained" color="warning" onClick={handleSubmitDeleteRequest} disabled={deleteRequestDialog.processing} sx={{ fontWeight: 900 }}>
              {deleteRequestDialog.processing ? 'SENDING...' : 'SEND REQUEST'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* --- DUPLICATE DIALOG ---
            Shown when the title + author already exists, either as a live PDF
            in the library or as another pending upload request. */}
        <Dialog open={confirmData.open} onClose={closeDupDialog} PaperProps={{ sx: { borderRadius: 4, maxWidth: '550px', width: '100%', p: 1 } }}>
          <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1, pb: 1, color: 'warning.main' }}>
              <ErrorOutline color="warning" /> {dupIsRequest ? 'Request Already Submitted' : 'PDF Already Exists'}
          </DialogTitle>
          <DialogContent sx={{ px: 3, pt: 1 }}>
              <Typography variant="body2" sx={{ mb: 2.5, color: 'text.secondary', fontWeight: 500 }}>
                {dupIsRequest
                  ? 'A pending upload request with the same title and author already exists. Please wait for it to be reviewed instead of submitting it again. Details below:'
                  : 'A document with the same title and author already exists in the library. Please review the details below:'}
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2.5, mb: 2, alignItems: isMobile ? 'center' : 'flex-start' }}>
                <Avatar 
                  variant="rounded" 
                  src={dupImagePath ? `${supabase.storage.from('pdfs').getPublicUrl(dupImagePath).data.publicUrl}` : ''}
                  sx={{ width: 130, height: 165, borderRadius: 2.5, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                >
                  <ImageIcon sx={{ fontSize: 40 }} />
                </Avatar>
                
                <Stack spacing={0.5} sx={{ flex: 1, width: '100%' }}>
                  <DetailRow icon={<Title fontSize="small" />} label="Title" value={confirmData.record?.title} />
                  <DetailRow icon={<Person fontSize="small" />} label="Author" value={confirmData.record?.author} />
                  <DetailRow icon={<Class fontSize="small" />} label="Type" value={confirmData.record?.category} />
                  <DetailRow icon={<Category fontSize="small" />} label="Genre" value={confirmData.record?.genre} />
                  <DetailRow icon={<Bookmark fontSize="small" />} label="Section" value={confirmData.record?.section} />
                  <DetailRow icon={<School fontSize="small" />} label="Program" value={confirmData.record?.program_course} />
                  <DetailRow icon={<CalendarMonth fontSize="small" />} label="Published" value={formatPublishedDate(confirmData.record)} />
                  <DetailRow icon={<Business fontSize="small" />} label="Publisher" value={confirmData.record?.publisher} />
                  <DetailRow icon={<ConfirmationNumber fontSize="small" />} label="ISBN" value={confirmData.record?.isbn} />
                  <DetailRow icon={<Layers fontSize="small" />} label="Edition" value={confirmData.record?.edition} />
                  <DetailRow icon={<Language fontSize="small" />} label="Language" value={confirmData.record?.language} />
                  {dupIsRequest && (
                    <DetailRow
                      icon={<CalendarMonth fontSize="small" />}
                      label="Requested"
                      value={confirmData.record?.created_at ? new Date(confirmData.record.created_at).toLocaleDateString() : ''}
                    />
                  )}
                </Stack>
              </Box>

              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>Description</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5, fontSize: '0.85rem' }}>
                {confirmData.record?.description || 'No description available.'}
              </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button fullWidth onClick={closeDupDialog} variant="contained" sx={{ color: '#ffffff', bgcolor: '#1e3a5f', py: 1.2, fontWeight: 900, borderRadius: 2 }}>
                I UNDERSTAND
              </Button>
          </DialogActions>
        </Dialog>

        <Snackbar 
          open={status.open} 
          autoHideDuration={4000} 
          onClose={() => setStatus({ ...status, open: false })} 
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity={status.type} variant="filled" sx={{ fontWeight: 700 }}>{status.message}</Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default RequestUpload;