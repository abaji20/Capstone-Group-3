import React, { useState } from 'react';
import { 
  Box, Paper, Typography, Stack, CircularProgress, 
  Container, MenuItem, TextField, useTheme, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFilePdf, faImage, faCloudUploadAlt, faCheckCircle, faUpload, 
  faExclamationTriangle 
} from '@fortawesome/free-solid-svg-icons';
import { uploadPdfWithFiles, checkDuplicate, deletePdf, uploadNewPdf } from '../../services/pdfService'; 

const PdfUploads = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // --- DARK MODE COLOR STRATEGY ---
  // Sidebar: #0f172a
  // Page Background: #141b2d
  // Card Background: #1e293b
  // Input Background: #28334e
  const pageBg = isDarkMode ? '#141b2d' : '#f8fafc'; 
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  const inputBg = isDarkMode ? '#28334e' : '#f1f5f9';

  // State Management (Logic remains untouched)
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', author: '', genre: '', category: 'book', published_date: '', description: '' 
  });

  // UI Feedback States
  const [status, setStatus] = useState({ open: false, type: 'success', message: '' });
  const [confirmData, setConfirmData] = useState({ open: false, record: null });

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const showStatus = (type, message) => setStatus({ open: true, type, message });

  const resetForm = () => {
    setSelectedFile(null); 
    setSelectedImage(null);
    setFormData({ title: '', author: '', genre: '', category: 'book', published_date: '', description: '' });
  };

  // --- LOGIC FUNCTIONS (Unchanged) ---
  const handleUpload = async () => {
    if (!selectedFile) return showStatus('error', "Please select a PDF file.");
    setLoading(true);
    try {
      const existingRecord = await checkDuplicate(formData.title, formData.author, selectedFile.name);
      if (existingRecord) {
        setConfirmData({ open: true, record: existingRecord });
        setLoading(false);
        return; 
      }
      await uploadPdfWithFiles(selectedFile, selectedImage, formData);
      showStatus('success', "Upload successful!");
      resetForm();
    } catch (error) {
      showStatus('error', `Upload failed: ${error.message}`);
    } finally { setLoading(false); }
  };

  const handleReplace = async () => {
    setConfirmData({ open: false, record: null });
    setLoading(true);
    try {
      await deletePdf(confirmData.record.id);
      await uploadNewPdf(selectedFile, selectedImage, formData);
      showStatus('success', "Existing resource replaced!");
      resetForm();
    } catch (error) {
      showStatus('error', `Replacement failed: ${error.message}`);
    } finally { setLoading(false); }
  };

  // Styles
  const inputStyle = { 
    '& .MuiOutlinedInput-root': { 
      borderRadius: '8px',
      backgroundColor: inputBg, 
      '& fieldset': { border: 'none' }, 
      '&:hover fieldset': { border: 'none' },
      '&.Mui-focused fieldset': { border: `1px solid ${isDarkMode ? '#3b82f6' : '#94a3b8'}` },
    },
    '& .MuiInputBase-input': { py: 1.2, color: 'text.primary' },
    '& .MuiInputLabel-root': { color: 'text.secondary' }
  };

  const uploadBoxStyle = (isSelected, activeColor) => ({
    flex: 1, p: 2, border: '1.5px dashed',
    borderColor: isSelected ? activeColor : (isDarkMode ? 'rgba(255,255,255,0.1)' : '#cbd5e1'),
    borderRadius: 2, textAlign: 'center', cursor: 'pointer',
    bgcolor: isSelected ? `${activeColor}15` : inputBg, 
    transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', minHeight: '100px',
    '&:hover': { borderColor: activeColor, transform: 'scale(1.02)' }
  });

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      width: '100%', 
      bgcolor: pageBg, 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      py: 4,
      transition: 'background-color 0.3s ease'
    }}>
      <Container maxWidth="sm"> 
        <Paper elevation={0} sx={{ 
          p: { xs: 3, md: 5 }, 
          borderRadius: 2, 
          bgcolor: cardBg, 
          border: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid #e2e8f0',
          boxShadow: isDarkMode ? '0 25px 50px -12px rgba(0,0,0,0.5)' : '0 10px 15px -3px rgba(0,0,0,0.05)'
        }}>
          
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
             <Box sx={{ bgcolor: '#3b82f6', p: 0.8, borderRadius: 1.5, display: 'flex' }}>
                <FontAwesomeIcon icon={faUpload} style={{ fontSize: '18px', color: 'white' }} />
             </Box>
             <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>Upload Document</Typography>
          </Stack>
          <Typography variant="caption" sx={{ mb: 4, display: 'block', color: 'text.secondary', fontWeight: 500 }}>
            Enhance your repository by adding new academic materials.
          </Typography>

          <Stack spacing={2.5}>
            {/* Side-by-side Upload Zones */}
            <Stack direction="row" spacing={2}>
              <Box sx={uploadBoxStyle(!!selectedFile, '#3b82f6')} component="label">
                <input type="file" hidden accept=".pdf" onChange={(e) => setSelectedFile(e.target.files[0])} />
                <FontAwesomeIcon icon={selectedFile ? faCheckCircle : faFilePdf} style={{ fontSize: '28px', color: selectedFile ? '#22c55e' : '#3b82f6', marginBottom: '8px' }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>{selectedFile ? selectedFile.name.substring(0, 10) + "..." : "Select PDF"}</Typography>
              </Box>

              <Box sx={uploadBoxStyle(!!selectedImage, '#a855f7')} component="label">
                <input type="file" hidden accept="image/*" onChange={(e) => setSelectedImage(e.target.files[0])} />
                <FontAwesomeIcon icon={selectedImage ? faCheckCircle : faImage} style={{ fontSize: '28px', color: selectedImage ? '#22c55e' : '#a855f7', marginBottom: '8px' }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>{selectedImage ? selectedImage.name.substring(0, 10) + "..." : "Select Cover"}</Typography>
              </Box>
            </Stack>

            {/* Form Fields */}
            <Stack spacing={1.8}>
              <TextField fullWidth size="small" label="Document Title" name="title" value={formData.title} onChange={handleInputChange} sx={inputStyle} />
              <TextField fullWidth size="small" label="Author / Publisher" name="author" value={formData.author} onChange={handleInputChange} sx={inputStyle} />
              
              <Stack direction="row" spacing={1.5}>
                <TextField fullWidth size="small" label="Genre" name="genre" value={formData.genre} onChange={handleInputChange} sx={inputStyle} />
                <TextField select fullWidth size="small" label="Category" name="category" value={formData.category} onChange={handleInputChange} sx={inputStyle}>
                  <MenuItem value="book">Book</MenuItem>
                  <MenuItem value="academic paper">Academic Paper</MenuItem>
                </TextField>
              </Stack>

              <TextField fullWidth size="small" label="Year" name="published_date" value={formData.published_date} onChange={handleInputChange} sx={inputStyle} />
              <TextField fullWidth size="small" multiline rows={2} label="Brief Description" name="description" value={formData.description} onChange={handleInputChange} sx={inputStyle} />
              
              <Button 
                fullWidth variant="contained" onClick={handleUpload} disabled={loading || !selectedFile}
                sx={{ 
                  mt: 2, py: 1.8, borderRadius: '50px', fontWeight: 900, 
                  bgcolor: '#3b82f6', color: 'white', 
                  boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.39)',
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  '&:hover': { bgcolor: '#2563eb', boxShadow: '0 6px 20px rgba(59, 130, 246, 0.23)' },
                  '&.Mui-disabled': { bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#e2e8f0' }
                }}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <FontAwesomeIcon icon={faCloudUploadAlt} />}
              >
                {loading ? 'SUBMITTING...' : 'SUBMIT TO REPOSITORY'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Container>

      {/* SNACKBAR FEEDBACK */}
      <Snackbar 
        open={status.open} 
        autoHideDuration={4000} 
        onClose={() => setStatus({ ...status, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={status.type} variant="filled" sx={{ width: '100%', borderRadius: '12px', fontWeight: 600 }}>
          {status.message}
        </Alert>
      </Snackbar>

      {/* CONFIRMATION DIALOG */}
      <Dialog 
        open={confirmData.open} 
        onClose={() => setConfirmData({ open: false, record: null })} 
        PaperProps={{ sx: { borderRadius: 4, bgcolor: cardBg, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 800 }}>
          <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#f59e0b' }} />
          Duplicate Found
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            A document with this title already exists. Would you like to replace the existing one?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ pb: 3, px: 3, gap: 1 }}>
          <Button onClick={() => setConfirmData({ open: false, record: null })} sx={{ color: 'text.secondary', fontWeight: 600 }}>Cancel</Button>
          <Button onClick={handleReplace} variant="contained" color="warning" sx={{ borderRadius: '25px', px: 3, fontWeight: 700 }}>
            Replace Existing
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PdfUploads;