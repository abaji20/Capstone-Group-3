import React, { useState } from 'react';
import { Box, Paper, Grid, Typography, Stack, CircularProgress, Container } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faImage, faCloudUploadAlt, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { FormInput, PrimaryButton } from '../../shared';
import { uploadPdfWithFiles, checkDuplicate, deletePdf, uploadNewPdf } from '../../services/pdfService'; 

const PdfUploads = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', author: '', genre: '', published_date: '', description: '' 
  });

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // Glassbox Style for Dropzones
  const uploadBoxStyle = (isSelected, activeColor) => ({
    p: 4,
    border: '2px dashed',
    borderColor: isSelected ? activeColor : '#bdbdbd',
    borderRadius: 4,
    textAlign: 'center',
    cursor: 'pointer',
    bgcolor: isSelected ? `${activeColor}10` : 'rgba(255, 255, 255, 0.5)',
    backdropFilter: 'blur(5px)',
    transition: 'all 0.3s ease',
    '&:hover': {
      borderColor: activeColor,
      transform: 'translateY(-4px)',
      boxShadow: `0 8px 20px ${activeColor}30`
    }
  });

  const handleUpload = async () => {
    if (!selectedFile) return alert("Please select a PDF file.");
    
    setLoading(true);
    try {
      // 1. Check for Duplicate (Title + Author + File Name)
      const existingRecord = await checkDuplicate(formData.title, formData.author, selectedFile.name);
      
      if (existingRecord) {
        const confirmReplace = window.confirm("A document with this title, author, and file name already exists. Do you want to replace it?");
        if (confirmReplace) {
          // 2. Delete old record + associated files
          await deletePdf(existingRecord.id);
          // 3. Upload new record
          await uploadNewPdf(selectedFile, selectedImage, formData);
          alert("Resource replaced successfully!");
        } else {
          setLoading(false);
          return;
        }
      } else {
        // Normal Upload
        await uploadPdfWithFiles(selectedFile, selectedImage, formData);
        alert("Upload successful!");
      }
      
      // Reset form
      setSelectedFile(null);
      setSelectedImage(null);
      setFormData({ title: '', author: '', genre: '', published_date: '', description: '' });
    } catch (error) {
      console.error("Upload error:", error);
      alert('Upload failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 5, mb: 5 }}>
      <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, boxShadow: '0 8px 30px rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.8)' }}>
        <Typography variant="h4" fontWeight="800" sx={{ color: '#213C51', mb: 1 }}>Upload Document</Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>Add academic resources to your repository.</Typography>

        <Grid container spacing={7} alignItems="flex-start">
          <Grid item xs={12} md={4}>
            <Stack spacing={4}>
              <Paper sx={uploadBoxStyle(!!selectedFile, '#2196f3')} component="label">
                <input type="file" hidden accept=".pdf" onChange={(e) => setSelectedFile(e.target.files[0])} />
                <FontAwesomeIcon icon={selectedFile ? faCheckCircle : faFilePdf} size="3x" style={{ color: selectedFile ? '#2e7d32' : '#2196f3', marginBottom: '10px' }} />
                <Typography variant="body2" fontWeight="bold">{selectedFile ? selectedFile.name : "Select PDF"}</Typography>
              </Paper>

              <Paper sx={uploadBoxStyle(!!selectedImage, '#9c27b0')} component="label">
                <input type="file" hidden accept="image/*" onChange={(e) => setSelectedImage(e.target.files[0])} />
                <FontAwesomeIcon icon={selectedImage ? faCheckCircle : faImage} size="3x" style={{ color: selectedImage ? '#2e7d32' : '#9c27b0', marginBottom: '10px' }} />
                <Typography variant="body2" fontWeight="bold">{selectedImage ? selectedImage.name : "Select Cover"}</Typography>
              </Paper>
            </Stack>
          </Grid>

          <Grid item xs={12} md={7}>
            <Stack spacing={2.5}>
              <FormInput name="title" label="Document Title" value={formData.title} onChange={handleInputChange} />
              <FormInput name="author" label="Author / Publisher" value={formData.author} onChange={handleInputChange} />
              <Grid container spacing={2}>
                <Grid item xs={6}><FormInput name="genre" label="Genre" value={formData.genre} onChange={handleInputChange} /></Grid>
                <Grid item xs={6}><FormInput name="published_date" label="Year" value={formData.published_date} onChange={handleInputChange} /></Grid>
              </Grid>
              <FormInput name="description" label="Brief Description" multiline rows={4} value={formData.description} onChange={handleInputChange} />
              
              <PrimaryButton onClick={handleUpload} disabled={!selectedFile || loading} sx={{ py: 2, borderRadius: 2 }}>
                {loading ? <CircularProgress size={24} color="inherit" /> : (
                  <><FontAwesomeIcon icon={faCloudUploadAlt} style={{ marginRight: '10px' }} /> UPLOAD TO REPOSITORY</>
                )}
              </PrimaryButton>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default PdfUploads;