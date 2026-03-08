import React, { useState } from 'react';
import { 
  Box, Paper, Grid, Typography, Stack, CircularProgress, 
  Container, MenuItem, TextField 
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFilePdf, faImage, faCloudUploadAlt, faCheckCircle, faUpload 
} from '@fortawesome/free-solid-svg-icons';
import { FormInput, PrimaryButton } from '../../shared';
import { uploadPdfWithFiles, checkDuplicate, deletePdf, uploadNewPdf } from '../../services/pdfService'; 

const PdfUploads = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', author: '', genre: '', category: 'book', published_date: '', description: '' 
  });

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const uploadBoxStyle = (isSelected, activeColor) => ({
    p: 10,
    border: '2px dashed',
    borderColor: isSelected ? activeColor : '#94a3b8',
    borderRadius: 4,
    textAlign: 'center',
    cursor: 'pointer',
    bgcolor: isSelected ? `${activeColor}10` : 'rgba(255, 255, 255, 0.6)',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      borderColor: activeColor,
      transform: 'translateY(-6px)',
      boxShadow: `0 12px 24px ${activeColor}20`
    }
  });

  const handleUpload = async () => {
    if (!selectedFile) return alert("Please select a PDF file.");
    setLoading(true);
    try {
      const existingRecord = await checkDuplicate(formData.title, formData.author, selectedFile.name);
      if (existingRecord) {
        if (window.confirm("Duplicate found. Replace existing resource?")) {
          await deletePdf(existingRecord.id);
          await uploadNewPdf(selectedFile, selectedImage, formData);
          alert("Resource replaced!");
        } else { setLoading(false); return; }
      } else {
        await uploadPdfWithFiles(selectedFile, selectedImage, formData);
        alert("Upload successful!");
      }
      setSelectedFile(null); setSelectedImage(null);
      setFormData({ title: '', author: '', genre: '', category: 'book', published_date: '', description: '' });
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally { setLoading(false); }
  };

  return (
    <Box sx={{ 
      background: 'linear-gradient(135deg, #e0f7fa 0%, #80deea 100%)',
      py: 10,
      fontFamily: "'Inter', sans-serif"
    }}>
      <Container maxWidth="md">
        <Paper sx={{ 
          p: { xs: 2  , md: 6 },
          ml: { xs: 0, md: 1 }, 
          borderRadius: 6, 
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)', 
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)' 
        }}>
          <Stack spacing={1} sx={{ mb: 5 }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a' }}>
              <FontAwesomeIcon icon={faUpload} style={{ marginRight: '15px', color: '#1e3a8a' }} />
              Upload Document
            </Typography>
            <Typography variant="body1" sx={{ color: '#475569' }}>
              Enhance your repository by adding new academic materials.
            </Typography>
          </Stack>

          <Grid container spacing={5}>
            <Grid item xs={12} md={4}>
              <Stack spacing={3}>
                <Paper sx={uploadBoxStyle(!!selectedFile, '#2563eb')} component="label">
                  <input type="file" hidden accept=".pdf" onChange={(e) => setSelectedFile(e.target.files[0])} />
                  <FontAwesomeIcon icon={selectedFile ? faCheckCircle : faFilePdf} size="3x" style={{ color: selectedFile ? '#16a34a' : '#2563eb', marginBottom: '15px' }} />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedFile ? "File Selected" : "Select PDF"}</Typography>
                </Paper>

                <Paper sx={uploadBoxStyle(!!selectedImage, '#9333ea')} component="label">
                  <input type="file" hidden accept="image/*" onChange={(e) => setSelectedImage(e.target.files[0])} />
                  <FontAwesomeIcon icon={selectedImage ? faCheckCircle : faImage} size="3x" style={{ color: selectedImage ? '#16a34a' : '#9333ea', marginBottom: '15px' }} />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedImage ? "Cover Selected" : "Select Cover"}</Typography>
                </Paper>
              </Stack>
            </Grid>

            <Grid item xs={12} md={8}>
              <Stack spacing={2.5}>
                <FormInput fullWidth name="title" label="Document Title" value={formData.title} onChange={handleInputChange} sx={{ '& .MuiInputBase-root': { height: '56px' } }} />
                <FormInput fullWidth name="author" label="Author / Publisher" value={formData.author} onChange={handleInputChange} sx={{ '& .MuiInputBase-root': { height: '56px' } }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <FormInput fullWidth name="genre" label="Genre" value={formData.genre} onChange={handleInputChange} sx={{ '& .MuiInputBase-root': { height: '56px' } }} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField select fullWidth label="Category" name="category" value={formData.category} onChange={handleInputChange} sx={{ '& .MuiInputBase-root': { height: '56px' } }}>
                      <MenuItem value="book">Book</MenuItem>
                      <MenuItem value="academic paper">Academic Paper</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>

                <FormInput fullWidth name="published_date" label="Year" value={formData.published_date} onChange={handleInputChange} sx={{ '& .MuiInputBase-root': { height: '56px' } }} />
                <FormInput fullWidth name="description" label="Brief Description" multiline rows={3} value={formData.description} onChange={handleInputChange} />
                
                <PrimaryButton onClick={handleUpload} disabled={!selectedFile || loading} sx={{ py: 2.5, borderRadius: 3, fontWeight: 800, fontSize: '1rem', width: '100%' }}>
                  {loading ? <CircularProgress size={24} color="inherit" /> : (
                    <><FontAwesomeIcon icon={faCloudUploadAlt} style={{ marginRight: '10px' }} /> SUBMIT TO REPOSITORY</>
                  )}
                </PrimaryButton>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
};

export default PdfUploads;