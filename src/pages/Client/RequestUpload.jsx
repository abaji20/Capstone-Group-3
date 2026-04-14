import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, TextField, Button, Typography, Stack, 
  Container, MenuItem, Alert, useTheme, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, 
  LinearProgress, useMediaQuery, Card, CardContent, Divider,
  Snackbar, Avatar, Tooltip
} from '@mui/material';
import { 
  PictureAsPdf, Image as ImageIcon, Add as AddIcon, 
  Close as CloseIcon, ErrorOutline, DeleteForever as DeleteIcon,
  WarningAmber, Send as SendIcon, Edit as EditIcon,
  CalendarMonth, Person, Description, Comment
} from '@mui/icons-material';
import { supabase } from '../../supabaseClient';
import { checkDuplicate } from '../../services/pdfService'; 

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
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ open: false, type: 'success', message: '' });
  const [confirmData, setConfirmData] = useState({ open: false, record: null });

  // Dialog states
  const [cancelDialog, setCancelDialog] = useState({ open: false, record: null, processing: false });
  const [deleteRequestDialog, setDeleteRequestDialog] = useState({ open: false, record: null, reason: '', processing: false });

  const [formData, setFormData] = useState({ 
    title: '', author: '', description: '', genre: '', 
    category: 'book', published_date: '', upload_reason: '' 
  });

  // --- FETCH USER REQUESTS ---
  const fetchRequests = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Kunin ang upload requests
    const { data: uploadData, error: uploadError } = await supabase
      .from('upload_requests')
      .select('*')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false });

    if (uploadError) throw uploadError;

    // 2. Kunin ang lahat ng active PDFs para malaman kung ano na ang nadelete
    const { data: livePdfs } = await supabase
      .from('pdfs')
      .select('title, author');

    // Gumawa ng Set para sa mabilis na pag-check (O(1) lookup)
    const livePdfKeys = new Set(livePdfs?.map(p => `${p.title}-${p.author}`));

    // 3. Kunin ang deletion requests
    const { data: deleteData } = await supabase
      .from('delete_requests')
      .select(`status, pdfs ( title, author )`)
      .eq('requested_by', user.id);

    // I-inject natin ang 'isDeleted' flag sa uploadData
    const processedRequests = uploadData.map(req => ({
      ...req,
      // Kapag approved na pero wala na sa livePdfKeys, ibig sabihin DELETED na
      isMissingInLibrary: req.status === 'approved' && !livePdfKeys.has(`${req.title}-${req.author}`)
    }));

    setRequests(processedRequests);
    
    const statusMap = {};
    deleteData?.forEach(d => {
      if (d.pdfs) {
        const key = `${d.pdfs.title}-${d.pdfs.author}`;
        statusMap[key] = d.status;
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

  // --- HANDLERS ---
  const handleOpen = () => { 
    setIsEditing(false);
    resetForm();
    setOpen(true); 
    setStatus({ open: false, type: 'success', message: '' }); 
  };
  
  const handleClose = () => { if (!uploading) setOpen(false); };

  const handleEditInitiate = (req) => {
    setIsEditing(true);
    setEditingId(req.id);
    setFormData({
      title: req.title, author: req.author, description: req.description,
      genre: req.genre, category: req.category, published_date: req.published_date,
      upload_reason: req.upload_reason
    });
    setOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'published_date') {
      const onlyNums = value.replace(/[^0-9]/g, '');
      if (onlyNums.length <= 4) setFormData({ ...formData, [name]: onlyNums });
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
    setFormData({ title: '', author: '', description: '', genre: '', category: 'book', published_date: '', upload_reason: '' });
    setPdfFile(null); setCoverFile(null);
    setEditingId(null);
  };

  // --- VALIDATION HELPERS ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        showStatus('error', 'PDF files only!');
        setPdfFile(null);
        e.target.value = null; // reset input
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
      const { data: pdfRecord } = await supabase.from('pdfs').select('id')
        .eq('title', deleteRequestDialog.record.title)
        .eq('author', deleteRequestDialog.record.author).single();

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

      if (isEditing) {
        await supabase.from('upload_requests').update({ ...formData, pdf_url: pdfPath, cover_url: coverPath }).eq('id', editingId);
      } else {
        await supabase.from('upload_requests').insert([{
          client_id: user.id, ...formData, pdf_url: pdfPath, cover_url: coverPath, status: 'pending'
        }]);
      // --- ADDED: LOG FOR NEW REQUEST ---
        await supabase.from('audit_logs').insert([{
          user_id: user.id,
          action_type: 'Request ',
          description: `User submitted a new upload request: ${formData.title}`
        }]);
      }

      resetForm(); fetchRequests(); setOpen(false);
      showStatus('success', 'Processed successfully!');
    } catch (error) {
      showStatus('error', error.message);
    } finally { setUploading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Strict PDF Check
    if (!isEditing && !pdfFile) { showStatus('error', 'PDF required.'); return; }
    if (pdfFile && pdfFile.type !== 'application/pdf') { 
        showStatus('error', 'Only PDF files are allowed!'); 
        return; 
    }

    // 2. Year Validation
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

    if (!isEditing) {
      const existing = await checkDuplicate(formData.title.trim(), formData.author.trim());
      if (existing) { setConfirmData({ open: true, record: existing }); return; }
    }
    await performUploadOrUpdate();
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

  const renderActionButtons = (req) => {
    const delStatus = deletionStatuses[`${req.title}-${req.author}`];
    
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
            sx={{ 
              fontWeight: 800, 
              borderRadius: 1.5, 
              fontSize: '0.75rem',
              minWidth: '85px', 
              px: 2 
            }}
          >
            EDIT
          </Button>
          
          <Button 
            variant="outlined" 
            color="error" 
            size="small" 
            onClick={() => setCancelDialog({ open: true, record: req })} 
            sx={{ 
              fontWeight: 800, 
              borderRadius: 1.5, 
              fontSize: '0.75rem',  
              minWidth: '85px', 
              px: 2 
            }}
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

  return (
    <Box sx={{ minHeight: '100vh', p: { xs: 2, md: 4 }, bgcolor: 'background.default' }}>
      <Container maxWidth="lg">
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={isMobile ? "flex-start" : "center"} sx={{ mb: 4 }} spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900, color: isDarkMode ? '#94a3b8' : '#1e3a5f', fontStyle: 'italic', fontSize: { xs: '1.8rem', md: '3rem' } }}>
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
          maxWidth="sm" 
          PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>{isEditing ? 'EDIT REQUEST' : 'NEW UPLOAD REQUEST'}</Typography>
            <IconButton onClick={handleClose}><CloseIcon /></IconButton>
          </DialogTitle>
          <form onSubmit={handleSubmit} style={{ height: isMobile ? 'calc(100% - 64px)' : 'auto', display: 'flex', flexDirection: 'column' }}>
            <DialogContent sx={{ p: 3, flexGrow: 1 }}>
              <Stack spacing={2.5}>
                <Stack direction="row" spacing={2}>
                  <Box sx={{ flex: 1, border: '2px dashed #ccc', borderRadius: 2, p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { borderColor: '#1e3a5f' } }} component="label">
                    <input type="file" hidden accept=".pdf" onChange={handleFileChange} />
                    <PictureAsPdf sx={{ color: pdfFile ? '#0284c7' : 'text.disabled', fontSize: 40 }} />
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mt: 1 }}>{pdfFile ? pdfFile.name.substring(0, 15) : "Select PDF"}</Typography>
                  </Box>
                  <Box sx={{ flex: 1, border: '2px dashed #ccc', borderRadius: 2, p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { borderColor: '#1e3a5f' } }} component="label">
                    <input type="file" hidden accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} />
                    <ImageIcon sx={{ color: coverFile ? '#16a34a' : 'text.disabled', fontSize: 40 }} />
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mt: 1 }}>{coverFile ? coverFile.name.substring(0, 15) : "Select Cover"}</Typography>
                  </Box>
                </Stack>
                <TextField fullWidth label="Title" name="title" value={formData.title} onChange={handleInputChange} required />
                <TextField fullWidth label="Author" name="author" value={formData.author} onChange={handleInputChange} required />
                
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField fullWidth label="Genre" name="genre" value={formData.genre} onChange={handleInputChange} required />
                  <TextField fullWidth label="Year" name="published_date" value={formData.published_date} onChange={handleInputChange} inputProps={{ maxLength: 4 }} required />
                  <TextField select fullWidth label="Category" name="category" value={formData.category} onChange={handleInputChange} required>
                    <MenuItem value="book">Book</MenuItem>
                    <MenuItem value="academic paper">Academic Paper</MenuItem>
                  </TextField>
                </Stack>

                <TextField fullWidth multiline rows={2} label="Description" name="description" value={formData.description} onChange={handleInputChange} required />
                <TextField fullWidth multiline rows={2} label="Reason for Uploading" name="upload_reason" value={formData.upload_reason} onChange={handleInputChange} required />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 3, bgcolor: isMobile ? 'background.paper' : 'transparent' }}>
              <Button fullWidth type="submit" variant="contained" disabled={uploading} sx={{ color: 'white', bgcolor: '#1e3a5f', py: 1.5, fontWeight: 900, borderRadius: 2 }}>
                {uploading ? 'PROCESSING...' : 'SUBMIT REQUEST'}
              </Button>
            </DialogActions>
          </form>
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

        {/* --- DUPLICATE CONFIRMATION DIALOG --- */}
        <Dialog open={confirmData.open} onClose={() => setConfirmData({ open: false, record: null })} PaperProps={{ sx: { borderRadius: 4, maxWidth: '500px' } }}>
          <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
              <ErrorOutline color="warning" /> PDF Already Exists
          </DialogTitle>
          <DialogContent>
              <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary', fontWeight: 500 }}>
                This document already exists in the library. Please review the details below:
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2, mb: 2, alignItems: isMobile ? 'center' : 'flex-start' }}>
                <Avatar 
                  variant="rounded" 
                  src={confirmData.record?.image_url ? `${supabase.storage.from('pdfs').getPublicUrl(confirmData.record.image_url).data.publicUrl}` : ''}
                  sx={{ width: 100, height: 140, border: '1px solid #ddd' }}
                >
                  <ImageIcon />
                </Avatar>
                <Stack spacing={0.5} alignItems={isMobile ? 'center' : 'flex-start'} textAlign={isMobile ? 'center' : 'left'}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
                    {confirmData.record?.title}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    By {confirmData.record?.author}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip size="small" label={confirmData.record?.genre} sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
                    <Chip size="small" label={confirmData.record?.category} color="primary" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
                  </Stack>
                  <Typography variant="caption" sx={{ fontWeight: 700, mt: 1, display: 'block' }}>
                    Published: {confirmData.record?.published_date}
                  </Typography>
                </Stack>
              </Box>

              <Divider sx={{ my: 2 }} />
              
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase' }}>Description</Typography>
              <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.5, fontStyle: 'italic', fontSize: '0.85rem' }}>
                "{confirmData.record?.description}"
              </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
              <Button fullWidth onClick={() => setConfirmData({ open: false, record: null })} variant="contained" sx={{ color: '#ffffff', bgcolor: '#1e3a5f', py: 1.5, fontWeight: 900, borderRadius: 2 }}>
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