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
  Close as CloseIcon, ErrorOutline, DeleteForever as DeleteIcon
} from '@mui/icons-material';
import { supabase } from '../../supabaseClient';
import { checkDuplicate } from '../../services/pdfService'; 

const RequestUpload = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDarkMode = theme.palette.mode === 'dark';
  
  // --- STATE MANAGEMENT ---
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [pdfFile, setPdfFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null); 
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ open: false, type: 'success', message: '' });
  const [confirmData, setConfirmData] = useState({ open: false, record: null });

  const [formData, setFormData] = useState({ 
    title: '', author: '', description: '', genre: '', 
    category: 'book', published_date: '', upload_reason: '' 
  });

  // --- FETCH USER REQUESTS ---
  const fetchRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('upload_requests')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Fetch error:', error.message);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  // --- HANDLERS ---
  const handleOpen = () => { setOpen(true); setStatus({ open: false, type: 'success', message: '' }); };
  const handleClose = () => { if (!uploading) setOpen(false); };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'published_date') {
      const onlyNums = value.replace(/[^0-9]/g, '');
      if (onlyNums.length <= 4) {
        setFormData({ ...formData, [name]: onlyNums });
      }
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const showStatus = (type, message) => setStatus({ open: true, type, message });

  const resetForm = () => {
    setFormData({ title: '', author: '', description: '', genre: '', category: 'book', published_date: '', upload_reason: '' });
    setPdfFile(null); setCoverFile(null);
  };

  // --- CANCEL REQUEST LOGIC ---
  const handleCancel = async (req) => {
    if (!window.confirm("Are you sure you want to cancel this request? This will delete the uploaded files.")) return;

    try {
      // 1. Delete files from storage
      const filesToDelete = [req.pdf_url];
      if (req.cover_url) filesToDelete.push(req.cover_url);
      
      await supabase.storage.from('pdfs').remove(filesToDelete);

      // 2. Delete record from DB
      const { error } = await supabase
        .from('upload_requests')
        .delete()
        .eq('id', req.id);

      if (error) throw error;

      showStatus('success', 'Request cancelled and removed.');
      fetchRequests();
    } catch (error) {
      showStatus('error', 'Failed to cancel: ' + error.message);
    }
  };

  const performUpload = async () => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required.");
      
      const timestamp = Date.now();
      
      const pdfPath = `requests/pdfs/${timestamp}_${pdfFile.name}`;
      const { error: pdfError } = await supabase.storage.from('pdfs').upload(pdfPath, pdfFile);
      if (pdfError) throw pdfError;

      let coverPath = null;
      if (coverFile) {
        coverPath = `requests/covers/${timestamp}_${coverFile.name}`;
        const { error: coverError } = await supabase.storage.from('pdfs').upload(coverPath, coverFile);
        if (coverError) throw coverError;
      }
      
      const { error: dbError } = await supabase.from('upload_requests').insert([{
        client_id: user.id, 
        ...formData, 
        pdf_url: pdfPath, 
        cover_url: coverPath, 
        status: 'pending'
      }]);
      
      if (dbError) throw dbError;
      showStatus('success', 'Request submitted!');
      resetForm();
      fetchRequests();
      setOpen(false);
    } catch (error) {
      showStatus('error', error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pdfFile) {
      showStatus('error', 'Please select a PDF file.');
      return;
    }

    setUploading(true);
    const existingRecord = await checkDuplicate(formData.title.trim(), formData.author.trim());
    if (existingRecord) {
      setConfirmData({ open: true, record: existingRecord });
      setUploading(false);
      return; 
    }
    await performUpload();
  };

  // --- STYLING ---
  const headerStyle = {
    backgroundColor: isDarkMode ? '#112233' : '#1e3a5f',
    '& .MuiTableCell-head': {
      color: '#ffffff', fontWeight: 800, fontSize: '0.9rem',
      textTransform: 'uppercase', padding: '16px 24px'
    }
  };

  const cellStyle = {
    padding: '20px 24px', fontSize: '0.95rem',
    color: isDarkMode ? '#e2e8f0' : 'inherit'
  };

  const inputStyle = { 
    '& .MuiOutlinedInput-root': { 
      borderRadius: '8px',
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
    }
  };

  const chipStyle = (status) => ({
    width: isMobile ? '90px' : '110px', height: isMobile ? '26px' : '32px',
    fontWeight: 900, borderRadius: '6px', fontSize: '0.7rem', color: 'white',
    bgcolor: status === 'approved' ? '#2e7d32' : status === 'rejected' ? '#d32f2f' : '#ed6c02',
    '& .MuiChip-label': { padding: 0 }
  });

  return (
    <Box sx={{ minHeight: '100vh', p: { xs: 2, md: 4 }, bgcolor: 'background.default' }}>
      <Container maxWidth="lg">
        
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'flex-end' }} sx={{ mb: 4 }} spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900, color: isDarkMode ? '#94a3b8' : '#1e3a5f', fontStyle: 'italic', letterSpacing: '1px', fontSize: { xs: '1.8rem', md: '3rem' } }}>
              UPLOAD REQUEST 
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              RECORDS OF YOUR PENDING AND PROCESSED SUBMISSIONS
            </Typography>
          </Box>
          <Button 
            variant="contained" startIcon={<AddIcon />} onClick={handleOpen} fullWidth={isMobile}
            sx={{ bgcolor: isDarkMode ? '#334155' : '#1e3a5f', color: 'white' , borderRadius: 1.5, px: 4, py: 1.5, fontWeight: 800, '&:hover': { bgcolor: '#2c5282' } }}
          >
            REQUEST UPLOAD
          </Button>
        </Stack>

        {loadingRequests ? (
          <Box sx={{ py: 4 }}><LinearProgress /></Box>
        ) : requests.length === 0 ? (
          <Paper sx={{ p: 10, textAlign: 'center', borderRadius: 2, border: '1px solid', borderColor: 'divider' }} elevation={0}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.disabled' }}>NO REQUESTS FOUND</Typography>
          </Paper>
        ) : (
          <>
            {!isMobile ? (
              <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <TableContainer>
                  <Table sx={{ minWidth: 800 }}>
                    <TableHead sx={headerStyle}>
                      <TableRow>
                        <TableCell>Target</TableCell>
                        <TableCell>Reason</TableCell>
                        <TableCell align="center">Status</TableCell>
                        <TableCell align="center">Date</TableCell>
                        <TableCell align="center">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {requests.map((req) => (
                        <TableRow key={req.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell sx={{ ...cellStyle, fontWeight: 700, color: isDarkMode ? '#60a5fa' : '#1e3a5f' }}>{req.title}</TableCell>
                          <TableCell sx={cellStyle}>{req.upload_reason}</TableCell>
                          <TableCell align="center" sx={cellStyle}>
                            <Chip label={req.status.toUpperCase()} sx={chipStyle(req.status)} />
                          </TableCell>
                          <TableCell align="center" sx={cellStyle}>
                            {new Date(req.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell align="center" sx={cellStyle}>
                            {req.status === 'pending' && (
                              <Tooltip title="Cancel Request">
                                <IconButton color="error" onClick={() => handleCancel(req)}>
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            ) : (
              <Stack spacing={2}>
                {requests.map((req) => (
                  <Card key={req.id} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 'none' }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                        <Box>
                          <Typography sx={{ fontWeight: 800, color: isDarkMode ? '#60a5fa' : '#1e3a5f', fontSize: '1.1rem' }}>{req.title}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                            {new Date(req.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Chip label={req.status.toUpperCase()} sx={chipStyle(req.status)} />
                      </Stack>
                      <Divider sx={{ mb: 2 }} />
                      <Box sx={{ bgcolor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f1f5f9', p: 1.5, borderRadius: 0.5, mb: 2 }}>
                        <Typography variant="body2" sx={{ color: 'text.primary', fontStyle: 'italic' }}>
                          "{req.upload_reason}"
                        </Typography>
                      </Box>
                      {req.status === 'pending' && (
                        <Button 
                          fullWidth 
                          variant="outlined" 
                          color="error" 
                          startIcon={<DeleteIcon />}
                          onClick={() => handleCancel(req)}
                          sx={{ fontWeight: 800, borderRadius: 1.5 }}
                        >
                          CANCEL REQUEST
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </>
        )}

        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3, bgcolor: 'background.paper' } }}>
          <DialogTitle sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 900, color: isDarkMode ? '#60a5fa' : '#1e3a5f' }}>NEW UPLOAD REQUEST</Typography>
            <IconButton onClick={handleClose}><CloseIcon /></IconButton>
          </DialogTitle>

          <form onSubmit={handleSubmit}>
            <DialogContent sx={{ p: 3, pt: 0 }}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2}>
                  <Box sx={{
                    flex: 1, border: '2px dashed', borderColor: pdfFile ? '#0284c7' : 'divider', borderRadius: 2, p: 2, textAlign: 'center', cursor: 'pointer',
                    bgcolor: pdfFile ? (isDarkMode ? 'rgba(2, 132, 199, 0.1)' : '#e0f2fe') : 'transparent',
                  }} component="label">
                    <input type="file" hidden accept=".pdf" onChange={(e) => setPdfFile(e.target.files[0])} />
                    <PictureAsPdf sx={{ color: pdfFile ? '#0284c7' : 'text.disabled' }} />
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: 'text.primary' }}>
                        {pdfFile ? pdfFile.name.substring(0, 10) + '...' : "PDF (Required)"}
                    </Typography>
                  </Box>

                  <Box sx={{
                    flex: 1, border: '2px dashed', borderColor: coverFile ? '#16a34a' : 'divider', borderRadius: 2, p: 2, textAlign: 'center', cursor: 'pointer',
                    bgcolor: coverFile ? (isDarkMode ? 'rgba(22, 163, 74, 0.1)' : '#f0fdf4') : 'transparent',
                  }} component="label">
                    <input type="file" hidden accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} />
                    <ImageIcon sx={{ color: coverFile ? '#16a34a' : 'text.disabled' }} />
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: 'text.primary' }}>
                        {coverFile ? coverFile.name.substring(0, 10) + '...' : "COVER (Optional)"}
                    </Typography>
                  </Box>
                </Stack>

                <TextField fullWidth label="Document Title" name="title" value={formData.title} onChange={handleInputChange} sx={inputStyle} size="small" required />
                <TextField fullWidth label="Author" name="author" value={formData.author} onChange={handleInputChange} sx={inputStyle} size="small" required />
                
                <Stack direction="row" spacing={2}>
                  <TextField fullWidth label="Genre" name="genre" value={formData.genre} onChange={handleInputChange} sx={inputStyle} size="small" required />
                  <TextField fullWidth label="Year (YYYY)" name="published_date" value={formData.published_date} onChange={handleInputChange} sx={inputStyle} size="small" inputProps={{ maxLength: 4 }} required />
                  <TextField select fullWidth label="Category" name="category" value={formData.category} onChange={handleInputChange} sx={inputStyle} size="small">
                    <MenuItem value="book">Book</MenuItem>
                    <MenuItem value="academic paper">Academic Paper</MenuItem>
                  </TextField>
                </Stack>

                <TextField fullWidth label="Document Description" name="description" multiline rows={3} value={formData.description} onChange={handleInputChange} sx={inputStyle} size="small" required />
                
                <TextField fullWidth label="Reason for Request" name="upload_reason" multiline rows={2} value={formData.upload_reason} onChange={handleInputChange} sx={inputStyle} size="small" required />
              </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 3 }}>
              <Button fullWidth type="submit" disabled={uploading} variant="contained" sx={{ bgcolor: isDarkMode ? '#334155' : '#1e3a5f', color: 'white', py: 1.5, fontWeight: 900 }}>
                {uploading ? 'PROCESSING...' : 'CONFIRM UPLOAD REQUEST'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        <Dialog open={confirmData.open} onClose={() => setConfirmData({ open: false, record: null })} PaperProps={{ sx: { borderRadius: 3, bgcolor: isDarkMode ? '#1e293b' : '#ffffff', maxWidth: '400px' } }}>
          <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ErrorOutline color="warning" /> Duplicate Found
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>This document already exists in the system. Please check your details.</Typography>
            {confirmData.record && (
              <Box sx={{ p: 2, bgcolor: isDarkMode ? '#28334e' : '#f1f5f9', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar variant="rounded" src={`https://yktwxeyxmzfkxqhlesly.supabase.co/storage/v1/object/public/pdfs/${confirmData.record.image_url}`} sx={{ width: 50, height: 70 }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{confirmData.record.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{confirmData.record.author}</Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button 
              fullWidth 
              onClick={() => setConfirmData({ open: false, record: null })} 
              variant="contained" 
              sx={{ bgcolor: isDarkMode ? '#334155' : '#1e3a5f', color: 'white', fontWeight: 800, borderRadius: 2 }}
            >
              CANCEL
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={status.open} autoHideDuration={4000} onClose={() => setStatus({ ...status, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert severity={status.type} variant="filled" sx={{ borderRadius: '10px', fontWeight: 700 }}>{status.message}</Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default RequestUpload;