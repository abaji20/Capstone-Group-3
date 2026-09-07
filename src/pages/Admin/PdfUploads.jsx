import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, Stack, CircularProgress, 
  MenuItem, TextField, useTheme, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert,
  Avatar, Card, CardContent, Grid, Divider
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFilePdf, faImage, faCloudUploadAlt, faCheckCircle, 
  faHistory, faFileAlt, faDownload, faBook, faGraduationCap, faInfoCircle
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
  const inputBg = isDarkMode ? '#28334e' : '#f8fafc';
  const borderCol = isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0';

  // --- STATE WITH LOCALSTORAGE PERSISTENCE ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentUploads, setRecentUploads] = useState([]); 
  
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('pdf_upload_form');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return { title: '', author: '', genre: '', category: 'book', published_date: '', description: '' };
  });

  useEffect(() => {
    localStorage.setItem('pdf_upload_form', JSON.stringify(formData));
  }, [formData]);

  // Analytics State (Totals)
  const [stats, setStats] = useState({
    totalPdfs: 0,
    academicMaterials: 0,
    books: 0,
    totalDownloads: 0
  });

  // Selected item para sa "See Info" Modal
  const [selectedItemInfo, setSelectedItemInfo] = useState(null);

  const [status, setStatus] = useState({ open: false, type: 'success', message: '' });
  const [confirmData, setConfirmData] = useState({ open: false, record: null });
  
  // New state for Review/Pre-Upload Confirmation Modal
  const [reviewOpen, setReviewOpen] = useState(false);

  // --- REAL-TIME SUBSCRIPTION & DATA FETCHING ---
  useEffect(() => {
    fetchData();

    const pdfChannel = supabase
      .channel('realtime-pdf-uploads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pdfs' }, () => { fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'downloads' }, () => { fetchData(); })
      .subscribe();

    return () => {
      supabase.removeChannel(pdfChannel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const data = await fetchPdfs();

      let downloadCount = 0;
      const { data: downloadList, error: downloadError } = await supabase
        .from('downloads')
        .select('id');

      if (!downloadError && downloadList) {
        downloadCount = downloadList.length;
      } else {
        const { data: altList } = await supabase
          .from('download_logs')
          .select('id');
        if (altList) downloadCount = altList.length;
      }

      if (data) {
        setRecentUploads(data.slice(0, 5));

        const pdfCount = data.length;
        const academicCount = data.filter(item => item.category === 'academic paper').length;
        const bookCount = data.filter(item => item.category === 'book').length;

        setStats({
          totalPdfs: pdfCount,
          academicMaterials: academicCount,
          books: bookCount,
          totalDownloads: downloadCount
        });
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'genre') {
      setFormData({ ...formData, [name]: value.replace(/[^a-zA-Z\s,]/g, '') });
      return;
    }

    if (name === 'published_date') {
      const onlyNums = value.replace(/[^0-9]/g, '');
      const currentYear = new Date().getFullYear();
      
      if (onlyNums.length <= 4) {
        if (onlyNums !== '' && parseInt(onlyNums) > currentYear) {
           showStatus('error', `Year cannot exceed ${currentYear}`);
           return;
        }
        setFormData({ ...formData, [name]: onlyNums });
      }
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const showStatus = (type, message) => setStatus({ open: true, type, message });

  const resetForm = () => {
    setSelectedFile(null); 
    setSelectedImage(null);
    const cleared = { title: '', author: '', genre: '', category: 'book', published_date: '', description: '' };
    setFormData(cleared);
    localStorage.removeItem('pdf_upload_form');
  };

  const getImageUrl = (path) => path ? `https://yktwxeyxmzfkxqhlesly.supabase.co/storage/v1/object/public/pdfs/${path}` : null;

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // --- TRIGGER REVIEW MODAL & VALIDATE FIELDS ---
  const handlePreUploadCheck = () => {
    if (!selectedFile) {
      showStatus('error', "Please select a PDF file.");
      return;
    }
    if (selectedFile.size > 100 * 1024 * 1024) {
      showStatus('error', "PDF file size exceeds the 100MB limit.");
      return;
    }
    if (selectedImage && selectedImage.size > 50 * 1024 * 1024) {
      showStatus('error', "Cover image file size exceeds the 50MB limit.");
      return;
    }
    if (!formData.title.trim() || !formData.author.trim() || !formData.genre.trim() || !formData.published_date.trim() || !formData.description.trim()) {
      showStatus('error', "All fields are required to fill up!");
      return;
    }
    // Open review modal if validation passes
    setReviewOpen(true);
  };

  // --- ACTUAL UPLOAD LOGIC EXECUTED AFTER CONFIRMATION ---
  const handleUpload = async () => {
    setReviewOpen(false);
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
      await fetchData(); 
      showStatus('success', "Added as a new record!");
      resetForm();
    } catch (error) {
      showStatus('error', `Upload failed: ${error.message}`);
    } finally { setLoading(false); }
  };

  const handleReplace = async () => {
    const recordId = confirmData.record.id;
    setConfirmData({ open: false, record: null });
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await deletePdf(recordId); 
      await uploadNewPdf(selectedFile, selectedImage, formData, user?.id);
      await fetchData();
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
      await fetchData();
      showStatus('success', "Added as a new record!");
      resetForm();
    } catch (error) {
      showStatus('error', `Upload failed: ${error.message}`);
    } finally { setLoading(false); }
  };

  const inputStyle = { 
    '& .MuiOutlinedInput-root': { 
      borderRadius: '10px',
      backgroundColor: inputBg, 
      '& fieldset': { border: `1px solid ${borderCol}` }, 
      '&.Mui-focused fieldset': { border: `1px solid #3b82f6` },
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 4, md: 5 }, bgcolor: isDarkMode ? '#0f172a' : '#f1f5f9', minHeight: '100vh', width: '100%' }}>
      
      {/* HEADER SECTION */}
      <Box sx={{ mb: 4, px: { xs: 1, sm: 2, md: 3 }, width: '100%', maxWidth: '1400px', margin: '4px' }}>
        <Typography variant="h3" sx={{ fontFamily: "'Montserrat', sans-serif", fontStyle: 'italic', fontWeight: 900, color: isDarkMode ? '#ffffff' : '#213C51', fontSize: { xs: '1.8rem', sm: '2.4rem', md: '3rem' } }}>
          UPLOAD PDFs
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, mt: 0.5 }}>
          ADD NEW ACADEMIC MATERIALS TO THE REPOSITORY SYSTEM
        </Typography>
      </Box>

      {/* MAIN CONTENT GRID */}
      <Grid container spacing={4} justifyContent="flex-start" alignItems="stretch" sx={{ width: '100%', maxWidth: '1600px', margin: '0 auto', mt: 5, mb: 4 }}>
        
        {/* LEFT COLUMN: UPLOAD FORM */}
        <Grid size={{ xs: 12, lg: 8, xl: 7}}>
          <Paper elevation={0} sx={{ p: { xs: 3, sm: 4.5 }, borderRadius: 3, bgcolor: cardBg, border: `1px solid ${borderCol}`, height: '100%' }}>
            <Stack spacing={3}>
              
              {/* FILE DROPZONES */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Box 
                  sx={{ 
                    flex: 1, 
                    p: 3.5, 
                    border: '2px dashed #3b82f6', 
                    borderRadius: 3, 
                    textAlign: 'center', 
                    bgcolor: inputBg, 
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: '0.2s',
                    '&:hover': { bgcolor: isDarkMode ? '#1e293b' : '#e0f2fe' }
                  }} 
                  component="label"
                >
                  <input 
                    type="file" 
                    hidden 
                    accept="application/pdf" 
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file && file.type !== 'application/pdf') {
                        showStatus('error', 'Only PDF files can be uploaded!');
                        e.target.value = null; 
                        setSelectedFile(null);
                        return;
                      }
                      if (file && file.size > 100 * 1024 * 1024) {
                        showStatus('error', 'PDF file size exceeds the 100MB limit!');
                        e.target.value = null;
                        setSelectedFile(null);
                        return;
                      }
                      setSelectedFile(file);
                    }} 
                  />
                  <FontAwesomeIcon icon={selectedFile ? faCheckCircle : faFilePdf} style={{ fontSize: '32px', color: selectedFile ? '#22c55e' : '#3b82f6' }} />
                  <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 800 }}>{selectedFile ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})` : "CHOOSE PDF FILE (Max 100MB)"}</Typography>
                </Box>

                <Box 
                  sx={{ 
                    flex: 1, 
                    p: 3.5, 
                    border: '2px dashed #a855f7', 
                    borderRadius: 3, 
                    textAlign: 'center', 
                    bgcolor: inputBg, 
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: '0.2s',
                    '&:hover': { bgcolor: isDarkMode ? '#1e293b' : '#f3e8ff' }
                  }} 
                  component="label"
                >
                  <input 
                    type="file" 
                    hidden 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file && file.size > 50 * 1024 * 1024) {
                        showStatus('error', 'Cover image file size exceeds the 50MB limit!');
                        e.target.value = null;
                        setSelectedImage(null);
                        return;
                      }
                      setSelectedImage(file);
                    }} 
                  />
                  <FontAwesomeIcon icon={selectedImage ? faCheckCircle : faImage} style={{ fontSize: '32px', color: selectedImage ? '#22c55e' : '#a855f7' }} />
                  <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 800 }}>{selectedImage ? `${selectedImage.name} (${formatFileSize(selectedImage.size)})` : "CHOOSE COVER IMAGE "}</Typography>
                </Box>
              </Stack>

              {/* INPUT FIELDS */}
              <TextField required fullWidth label="Document Title" name="title" value={formData.title} onChange={handleInputChange} sx={inputStyle} />
              <TextField required fullWidth label="Author / Publisher" name="author" value={formData.author} onChange={handleInputChange} sx={inputStyle} />
              
              <Grid container spacing={2} sx={{ width: '100%', m: 0 }}>
                <Grid size={{ xs: 12, sm: 6 }} sx={{ pl: '0 !important', pr: { xs: 0, sm: 1 } }}>
                  <TextField required fullWidth label="Genre / Field" name="genre" value={formData.genre} onChange={handleInputChange} sx={inputStyle} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }} sx={{ pr: '0 !important', pl: { xs: 0, sm: 1 } }}>
                  <TextField select required fullWidth label="Category" name="category" value={formData.category} onChange={handleInputChange} sx={inputStyle}>
                    <MenuItem value="academic paper">Academic Paper / Research</MenuItem>
                    <MenuItem value="book">Book</MenuItem>
                  </TextField>
                </Grid>
              </Grid>

              <TextField 
                required
                fullWidth 
                label="Publication Year (YYYY)" 
                name="published_date" 
                value={formData.published_date} 
                onChange={handleInputChange} 
                sx={inputStyle}
                inputProps={{ maxLength: 4 }}
              />
              <TextField required fullWidth multiline rows={3.5} label="Brief Description" name="description" value={formData.description} onChange={handleInputChange} sx={inputStyle} />
              
              <Button 
                fullWidth variant="contained" onClick={handlePreUploadCheck} disabled={loading}
                sx={{ 
                  py: 2, 
                  borderRadius: '12px', 
                  fontWeight: 800, 
                  fontSize: '1rem',
                  bgcolor: isDarkMode ? '#0085eb' : '#213C51', 
                  color: '#ffffff',
                  '&:hover': { bgcolor: isDarkMode ? '#2c5ea0' : '#365d7a' } 
                }}
                startIcon={loading ? <CircularProgress size={22} color="inherit" /> : <FontAwesomeIcon icon={faCloudUploadAlt} />}
              >
                {loading ? 'SUBMITTING...' : 'CONFIRM UPLOAD'}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* RIGHT COLUMN: RECENT ACTIVITIES & TOTALS DASHBOARD */}
        <Grid size={{ xs: 12, lg: 3, xl: 5 }}>
          <Stack spacing={3} sx={{ height: '100%' }}>
            
            {/* RECENT ACTIVITIES */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: cardBg, border: `1px solid ${borderCol}` }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <FontAwesomeIcon icon={faHistory} style={{ color: '#3b82f6', fontSize: '20px' }} />
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Recent Activities</Typography>
              </Stack>

              <Stack spacing={1.5}>
                {recentUploads.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No recent uploads found.</Typography>
                ) : (
                  recentUploads.map((item) => (
                    <Card 
                      key={item.id} 
                      onClick={() => setSelectedItemInfo(item)}
                      sx={{ 
                        bgcolor: inputBg, 
                        borderRadius: 2, 
                        border: `1px solid ${borderCol}`, 
                        boxShadow: 'none',
                        cursor: 'pointer',
                        transition: '0.2s',
                        '&:hover': { transform: 'translateY(-2px)', borderColor: '#3b82f6' }
                      }}
                    >
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar variant="rounded" src={getImageUrl(item.image_url)} sx={{ width: 42, height: 54, bgcolor: cardBg }}>
                            <FontAwesomeIcon icon={faFileAlt} style={{ color: '#3b82f6' }} />
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.author || 'Unknown'} • {new Date(item.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Button size="small" variant="text" sx={{ minWidth: 'auto', p: 0.5 }}>
                            <FontAwesomeIcon icon={faInfoCircle} style={{ color: '#3b82f6' }} />
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))
                )}
              </Stack>
            </Paper>

            {/* SYSTEM OVERVIEW (TOTALS) */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: cardBg, border: `1px solid ${borderCol}` }}>
              <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>System Overview</Typography>
              
              <Grid container spacing={1}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box sx={{ p: 2, bgcolor: inputBg, borderRadius: 2, border: `1px solid ${borderCol}` }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, color: '#3b82f6' }}>
                      <FontAwesomeIcon icon={faFilePdf} />
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>PDF'S</Typography>
                    </Stack>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>{stats.totalPdfs}</Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box sx={{ p: 2, bgcolor: inputBg, borderRadius: 2, border: `1px solid ${borderCol}` }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, color: '#a855f7' }}>
                      <FontAwesomeIcon icon={faGraduationCap} />
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>ACADEMIC</Typography>
                    </Stack>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>{stats.academicMaterials}</Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box sx={{ p: 2, bgcolor: inputBg, borderRadius: 2, border: `1px solid ${borderCol}` }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, color: '#eab308' }}>
                      <FontAwesomeIcon icon={faBook} />
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>BOOKS</Typography>
                    </Stack>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>{stats.books}</Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box sx={{ p: 2, bgcolor: inputBg, borderRadius: 2, border: `1px solid ${borderCol}` }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, color: '#22c55e' }}>
                      <FontAwesomeIcon icon={faDownload} />
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>DOWNLOADS</Typography>
                    </Stack>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>{stats.totalDownloads}</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

          </Stack>
        </Grid>

      </Grid>

      {/* MODAL: PRE-UPLOAD INFORMATION REVIEW CONFIRMATION */}
      <Dialog 
        open={reviewOpen} 
        onClose={() => setReviewOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, bgcolor: cardBg, maxWidth: '500px', width: '100%' } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Review Document Info</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Please confirm if the details below are correct before submitting:
          </Typography>
          <Box sx={{ p: 2.5, bgcolor: inputBg, borderRadius: 2, border: `1px solid ${borderCol}` }}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar 
                  variant="rounded" 
                  src={selectedImage ? URL.createObjectURL(selectedImage) : null} 
                  sx={{ width: 60, height: 80, borderRadius: 2 }}
                >
                  <FontAwesomeIcon icon={faImage} style={{ fontSize: '24px' }} />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>COVER IMAGE</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#a855f7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedImage ? `${selectedImage.name} (${formatFileSize(selectedImage.size)})` : 'No cover image selected'}
                  </Typography>
                </Box>
              </Stack>
              <Divider />
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>SELECTED PDF</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                  {selectedFile?.name} {selectedFile ? `(${formatFileSize(selectedFile.size)})` : ''}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>DOCUMENT TITLE</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{formData.title}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>AUTHOR / PUBLISHER</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{formData.author}</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>GENRE / FIELD</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{formData.genre}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>CATEGORY</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>{formData.category}</Typography>
                </Grid>
              </Grid>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>PUBLICATION YEAR</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{formData.published_date}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>DESCRIPTION</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.4, maxHeight: '60px', overflowY: 'auto' }}>{formData.description}</Typography>
              </Box>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button fullWidth onClick={() => setReviewOpen(false)} color="inherit" variant="outlined" sx={{ borderRadius: 2, fontWeight: 800 }}>Edit Details</Button>
          <Button fullWidth onClick={handleUpload} variant="contained" color="primary" sx={{ borderRadius: 2, fontWeight: 800 }}>Confirm & Upload</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: SEE RECENT ITEM DETAILS */}
      <Dialog 
        open={Boolean(selectedItemInfo)} 
        onClose={() => setSelectedItemInfo(null)}
        PaperProps={{ sx: { borderRadius: 3, bgcolor: cardBg, maxWidth: '500px', width: '100%' } }}
      >
        {selectedItemInfo && (
          <>
            <DialogTitle sx={{ fontWeight: 900 }}>Document Information</DialogTitle>
            <DialogContent>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Avatar variant="rounded" src={getImageUrl(selectedItemInfo.image_url)} sx={{ width: 80, height: 110, borderRadius: 2 }}>
                  <FontAwesomeIcon icon={faFilePdf} style={{ fontSize: '30px' }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.2 }}>{selectedItemInfo.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, mt: 0.5 }}>{selectedItemInfo.author}</Typography>
                  <Typography variant="caption" sx={{ display: 'inline-block', mt: 1, px: 1, py: 0.3, bgcolor: '#3b82f6', color: '#fff', borderRadius: 1, fontWeight: 800, textTransform: 'uppercase' }}>
                    {selectedItemInfo.category}
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              <Stack spacing={1}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>GENRE / FIELD</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedItemInfo.genre || 'N/A'}</Typography>

                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', mt: 1 }}>PUBLICATION YEAR</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedItemInfo.published_date || 'N/A'}</Typography>

                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', mt: 1 }}>DESCRIPTION</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.5 }}>
                  {selectedItemInfo.description || 'No description available for this document.'}
                </Typography>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button fullWidth onClick={() => setSelectedItemInfo(null)} variant="contained" sx={{ borderRadius: 2, fontWeight: 800 }}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* SUCCESS/ERROR SNACKBAR */}
      <Snackbar open={status.open} autoHideDuration={4000} onClose={() => setStatus({ ...status, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={status.type} variant="filled" sx={{ borderRadius: '10px', fontWeight: 700 }}>
          {status.message}
        </Alert>
      </Snackbar>

      {/* DUPLICATE DIALOG WITH FULL EXISTING RECORD DETAILS */}
      <Dialog 
        open={confirmData.open} 
        onClose={() => setConfirmData({ open: false, record: null })} 
        PaperProps={{ sx: { borderRadius: 3, bgcolor: cardBg, maxWidth: '500px', width: '100%' } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Duplicate Found</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            The following document is already registered in the system. Review its details below:
          </Typography>
          {confirmData.record && (
            <Box sx={{ p: 2.5, bgcolor: inputBg, borderRadius: 2, border: `1px solid ${borderCol}` }}>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Avatar variant="rounded" src={getImageUrl(confirmData.record.image_url)} sx={{ width: 70, height: 95, borderRadius: 2 }}>
                  <FontAwesomeIcon icon={faFilePdf} style={{ fontSize: '26px' }} />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.2 }}>{confirmData.record.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, mt: 0.5 }}>{confirmData.record.author || 'Unknown'}</Typography>
                  <Typography variant="caption" sx={{ display: 'inline-block', mt: 1, px: 1, py: 0.3, bgcolor: '#3b82f6', color: '#fff', borderRadius: 1, fontWeight: 800, textTransform: 'uppercase' }}>
                    {confirmData.record.category}
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              <Stack spacing={1}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>GENRE / FIELD</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{confirmData.record.genre || 'N/A'}</Typography>

                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', mt: 1 }}>PUBLICATION YEAR</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{confirmData.record.published_date || 'N/A'}</Typography>

                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', mt: 1 }}>DESCRIPTION</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.5, maxHeight: '80px', overflowY: 'auto' }}>
                  {confirmData.record.description || 'No description available for this document.'}
                </Typography>
              </Stack>
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