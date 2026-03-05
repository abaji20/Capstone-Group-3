import React, { useState } from 'react';
import { Box, Paper, Grid, Typography, Stack, Button } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { PageHeader, FormInput, PrimaryButton } from '../../shared';

const PdfUploads = () => {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  return (
    <Box>
      <PageHeader 
        title="Upload New Document" 
        subtitle="Add academic resources to the library repository for student access." 
      />

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Left Side: File Upload Dropzone */}
        <Grid item xs={12} md={5}>
          <Paper 
            sx={{ 
              p: 4, 
              textAlign: 'center', 
              border: '2px dashed #1976d2', 
              bgcolor: '#f8fbff',
              borderRadius: 3,
              cursor: 'pointer',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            component="label"
          >
            <input type="file" hidden accept=".pdf" onChange={handleFileChange} />
            <CloudUploadIcon sx={{ fontSize: 60, color: '#1976d2', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {selectedFile ? "File Selected!" : "Select PDF File"}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {selectedFile ? selectedFile.name : "Drag and drop or click to browse files"}
            </Typography>
            {selectedFile && (
              <Typography variant="caption" sx={{ mt: 1, color: 'green' }}>
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Right Side: Metadata Form */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
              Document Information
            </Typography>
            <Stack spacing={2}>
              <FormInput label="Document Title" placeholder="e.g. Introduction to Algorithms" />
              <FormInput label="Author / Publisher" placeholder="e.g. Thomas H. Cormen" />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormInput label="Category" placeholder="e.g. Computer Science" />
                </Grid>
                <Grid item xs={6}>
                  <FormInput label="Year Published" placeholder="e.g. 2024" />
                </Grid>
              </Grid>

              <FormInput 
                label="Brief Description" 
                placeholder="Describe the content of this PDF..." 
                multiline 
                rows={3} 
              />

              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <PrimaryButton 
                  onClick={() => alert('Uploading to Supabase Storage...')}
                  disabled={!selectedFile}
                >
                  Upload to Repository
                </PrimaryButton>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PdfUploads;