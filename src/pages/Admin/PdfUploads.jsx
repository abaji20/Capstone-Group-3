import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, Stack, CircularProgress, 
  MenuItem, TextField, useTheme, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert,
  Avatar, Card, CardContent, Grid
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFilePdf, faImage, faCloudUploadAlt, faCheckCircle, 
  faHistory, faFileAlt
} from '@fortawesome/free-solid-svg-icons';
import { 
  uploadPdfWithFiles, 
  checkDuplicate, 
  deletePdf, 
  uploadNewPdf, 
  fetchPdfs 
} from '../../services/pdfService'; 
import { supabase } from '../../supabaseClient';

const PdfUploads = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // --- STYLING ---
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  const inputBg = isDarkMode ? '#28334e' : '#f1f5f9';
  const borderCol = isDarkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0';

  // --- STATE ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentUploads, setRecentUploads] = useState([]); 
  const [formData, setFormData] = useState({ 
    title: '', author: '', genre: '', category: 'book', published_date: '', description: '' 
  });

  const [status, setStatus] = useState({ open: false, type: 'success', message: '' });
  const [confirmData, setConfirmData] = useState({ open: false, record: null });

  // --- REAL-TIME SUBSCRIPTION ---
  useEffect(() => {
    fetchRecent();

    const channel = supabase
      .channel('realtime-uploads')
      .on(
        'postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'pdfs' 
        }, 
        (payload) => {
          console.log('New upload detected:', payload.new);
          fetchRecent(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRecent = async () => {
    try {
      const data = await fetchPdfs();
      setRecentUploads(data ? data.slice(0, 6) : []);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Robust Year Validation: Only allow digits and limit to 4
    if (name === 'published_date') {
      const onlyNums = value.replace(/[^0-9]/g, '');
      if (onlyNums.length <= 4) {
        setFormData({ ...formData, [name]: onlyNums });
      }
      return;
    }

    // Genre and other fields accept any characters (including numbers)
    setFormData({ ...formData, [name]: value });
  };

  const showStatus = (type, message) => setStatus({ open: true, type, message });

  const resetForm = () => {
    setSelectedFile(null); 
    setSelectedImage(null);
    setFormData({ title: '', author: '', genre: '', category: 'book', published_date: '', description: '' });
  };

  const getImageUrl = (path) => path ? `https://yktwxeyxmzfkxqhlesly.supabase.co/storage/v1/object/public/pdfs/${path}` : null;

  // --- UPLOAD LOGIC ---
  const handleUpload = async () => {
    if (!selectedFile) return showStatus('error', "Please select a PDF file.");
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const existingRecord = await checkDuplicate(formData.title.trim(), formData.author.trim());
      
      if (existingRecord) {
        setConfirmData({ open: true, record: existingRecord });
        setLoading(false);
        return; 
      }

      await uploadPdfWithFiles(selectedFile, selectedImage, formData, user?.id);
      await fetchRecent(); 
      showStatus('success', "Added as a new record!");
      resetForm();
    } catch (error) {
      showStatus('error', `Upload failed: ${error.message}`);
    } finally { setLoading(false); }
  };

  // --- DUPLICATE HANDLING ---
  const handleReplace = async () => {
    const recordId = confirmData.record.id;
    setConfirmData({ open: false, record: null });
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await deletePdf(recordId); 
      await uploadNewPdf(selectedFile, selectedImage, formData, user?.id);
      await fetchRecent();
      showStatus('success', "Existing resource replaced!");
      resetForm();
    } catch (error) {
      showStatus('error', `Replacement failed: ${error.message}`);
    } finally { setLoading(false); }
  };

  const handleAddAnyway = async () => {
    setConfirmData({ open: false, record: null });
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await uploadPdfWithFiles(selectedFile, selectedImage, formData, user?.id);
      await fetchRecent();
      showStatus('success', "Added as a new record!");
      resetForm();
    } catch (error) {
      showStatus('error', `Upload failed: ${error.message}`);
    } finally { setLoading(false); }
  };

  const inputStyle = { 
    '& .MuiOutlinedInput-root': { 
      borderRadius: '8px',
      backgroundColor: inputBg, 
      '& fieldset': { border: 'none' }, 
      '&.Mui-focused fieldset': { border: `1px solid #3b82f6` },
    }
  };

  return (
    <Box sx={{ p: 4, bgcolor: isDarkMode ? '#0f172a' : '#ffffff', minHeight: '100vh'  }}>
      
      {/* HEADER SECTION */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontFamily: "'Montserrat', sans-serif", fontStyle: 'italic', fontWeight: 900, color: isDarkMode ? '#ffffff' : '#213C51', fontSize: { xs: '1.75rem', sm: '2.2rem', md: '3rem' }, }}>
          UPLOAD PDFs
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
          ADD NEW ACADEMIC MATERIALS TO THE REPOSITORY SYSTEM.
        </Typography>
      </Box>

      <Grid container spacing={7}>
        {/* LEFT SIDE: UPLOAD FORM */}
        <Grid item xs={12} md={7} lg={7} width={{ xs: '100%', md: '50%', lg: '60%' }}>
          <Paper elevation={0} sx={{ p: 4.5, borderRadius: 1.5, bgcolor: cardBg, border: `1px solid ${borderCol}` }}>
            <Stack spacing={3}>
              <Stack direction="row" spacing={2}>
                <Box sx={{ flex: 1, p: 3, border: '1.5px dashed #cbd5e1', borderRadius: 2, textAlign: 'center', bgcolor: inputBg, cursor: 'pointer' }} component="label">
                  <input 
                    type="file" 
                    hidden 
                    accept="application/pdf" 
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file && file.type !== 'application/pdf') {
                        showStatus('error', 'Only PDF files are allowed!');
                        e.target.value = null; 
                        setSelectedFile(null);
                        return;
                      }
                      setSelectedFile(file);
                    }} 
                  />
                  <FontAwesomeIcon icon={selectedFile ? faCheckCircle : faFilePdf} style={{ fontSize: '24px', color: selectedFile ? '#22c55e' : '#3b82f6' }} />
                  <Typography variant="body2" sx={{ mt: 1, fontWeight: 800 }}>{selectedFile ? selectedFile.name : "CHOOSE PDF"}</Typography>
                </Box>
                <Box sx={{ flex: 1, p: 3, border: '1.5px dashed #cbd5e1', borderRadius: 2, textAlign: 'center', bgcolor: inputBg, cursor: 'pointer' }} component="label">
                  <input type="file" hidden accept="image/*" onChange={(e) => setSelectedImage(e.target.files[0])} />
                  <FontAwesomeIcon icon={selectedImage ? faCheckCircle : faImage} style={{ fontSize: '24px', color: selectedImage ? '#22c55e' : '#a855f7' }} />
                  <Typography variant="body2" sx={{ mt: 1, fontWeight: 800 }}>{selectedImage ? selectedImage.name : "CHOOSE COVER"}</Typography>
                </Box>
              </Stack>

              <TextField fullWidth label="Document Title" name="title" value={formData.title} onChange={handleInputChange} sx={inputStyle} />
              <TextField fullWidth label="Author / Publisher" name="author" value={formData.author} onChange={handleInputChange} sx={inputStyle} />
              
              <Stack direction="row" spacing={2}>
                <TextField fullWidth label="Genre" name="genre" value={formData.genre} onChange={handleInputChange} sx={inputStyle} />
                <TextField select fullWidth label="Category" name="category" value={formData.category} onChange={handleInputChange} sx={inputStyle}>
                  <MenuItem value="book">Book</MenuItem>
                  <MenuItem value="academic paper">Academic Paper</MenuItem>
                </TextField>
              </Stack>

              <TextField 
                fullWidth 
                label="Publication Year (YYYY)" 
                name="published_date" 
                value={formData.published_date} 
                onChange={handleInputChange} 
                sx={inputStyle}
                inputProps={{ maxLength: 4 }}
              />
              <TextField fullWidth multiline rows={3} label="Brief Description" name="description" value={formData.description} onChange={handleInputChange} sx={inputStyle} />
              
              <Button 
                fullWidth variant="contained" onClick={handleUpload} disabled={loading}
                sx={{ 
                  py: 2, 
                  borderRadius: '12px', 
                  fontWeight: 700, 
                  bgcolor: isDarkMode ? '#0085eb' : '#213C51', 
                  color: '#ffffff',
                  '&:hover': { 
                    bgcolor: isDarkMode ? '#2c5ea0' : '#365d7a' 
                  } 
                }}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <FontAwesomeIcon icon={faCloudUploadAlt} />}
              >
                {loading ? 'SUBMITTING...' : 'CONFIRM UPLOAD'}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* RIGHT SIDE: RECENT ACTIVITY */}
        <Grid item xs={12} lg={5}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, ml: 1 }}>
            <FontAwesomeIcon icon={faHistory} style={{ color: '#3b82f6' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>Latest Activity</Typography>
          </Stack>

          <Stack spacing={2}>
            {recentUploads.map((item) => (
              <Card key={item.id} sx={{ bgcolor: cardBg, borderRadius: 2, border: `1px solid ${borderCol}`, boxShadow: 'none' }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar variant="rounded" src={getImageUrl(item.image_url)} sx={{ width: 40, height: 55, bgcolor: inputBg }}>
                      <FontAwesomeIcon icon={faFileAlt} style={{ color: '#3b82f6' }} />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{item.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.author} • {new Date(item.created_at).toLocaleDateString()}</Typography>
                    </Box>
                    <Box sx={{ bgcolor: '#f0fdf4', px: 1.5, py: 0.5, borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: '#00bb09', fontWeight: 800 }}>Recent</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Grid>
      </Grid>

      {/* Success/Error Snackbar */}
      <Snackbar 
        open={status.open} 
        autoHideDuration={4000} 
        onClose={() => setStatus({ ...status, open: false })} 
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={status.type} variant="filled" sx={{ borderRadius: '10px', fontWeight: 700 }}>
          {status.message}
        </Alert>
      </Snackbar>

      {/* Duplicate Check Dialog */}
      <Dialog 
        open={confirmData.open} 
        onClose={() => setConfirmData({ open: false, record: null })} 
        PaperProps={{ sx: { borderRadius: 3, bgcolor: cardBg, maxWidth: '400px' } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Duplicate Found</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>This document already exists in the system.</Typography>
          {confirmData.record && (
            <Box sx={{ p: 2, bgcolor: inputBg, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar variant="rounded" src={getImageUrl(confirmData.record.image_url)} sx={{ width: 50, height: 70 }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{confirmData.record.title}</Typography>
                <Typography variant="caption" color="text.secondary">{confirmData.record.author}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, flexDirection: 'column', gap: 1 }}>
          <Button fullWidth onClick={handleReplace} variant="contained" color="warning" sx={{ borderRadius: 2, fontWeight: 800 }}>Replace Existing</Button>
          <Button fullWidth onClick={handleAddAnyway} variant="outlined" sx={{ borderRadius: 2, fontWeight: 800 }}>Keep Both</Button>
          <Button fullWidth onClick={() => setConfirmData({ open: false, record: null })} color="inherit">Cancel</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default PdfUploads;