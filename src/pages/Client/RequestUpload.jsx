import React, { useState } from 'react';
import { 
  Box, Paper, TextField, Button, Typography, Stack, 
  Container, MenuItem, InputAdornment, LinearProgress, Alert, useTheme 
} from '@mui/material';
import { 
  CloudUpload, Title, Person, PictureAsPdf, 
  Image as ImageIcon, Send, DateRange 
} from '@mui/icons-material';
import { supabase } from '../../supabaseClient';

const RequestUpload = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  const [formData, setFormData] = useState({ 
    title: '', author: '', description: '', genre: '', category: 'book', published_date: '' 
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', severity: 'success' });

  const inputStyle = { 
    '& .MuiOutlinedInput-root': { 
      borderRadius: '8px', // Slightly smaller radius for a tighter look
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
      '&:hover fieldset': { borderColor: theme.palette.primary.main }
    },
    '& .MuiInputBase-input': { py: 1.2 } // Reduced vertical padding in text fields
  };

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pdfFile || !coverFile) {
      setMessage({ text: 'Please select both a PDF and a Cover Image.', severity: 'error' });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in.");

      const pdfPath = `requests/pdfs/${Date.now()}_${pdfFile.name}`;
      const coverPath = `requests/covers/${Date.now()}_${coverFile.name}`;

      await supabase.storage.from('pdfs').upload(pdfPath, pdfFile);
      await supabase.storage.from('pdfs').upload(coverPath, coverFile);

      const { error: dbError } = await supabase.from('upload_requests').insert([{
        client_id: user.id, 
        ...formData, 
        pdf_url: pdfPath, 
        cover_url: coverPath, 
        status: 'pending'
      }]);

      if (dbError) throw dbError;

      setMessage({ text: 'Request submitted successfully!', severity: 'success' });
      setFormData({ title: '', author: '', description: '', genre: '', category: 'book', published_date: '' });
      setPdfFile(null); setCoverFile(null);
    } catch (error) {
      setMessage({ text: error.message, severity: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      width: '100%', 
      bgcolor: 'background.default', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', // Centers vertically to reduce "largeness"
      py: 3,
      transition: 'background 0.3s ease'
    }}>
      <Container maxWidth="sm"> {/* Reduced from md to sm for a narrower profile */}
        <Paper elevation={0} sx={{ 
          p: { xs: 2, md: 4 }, // Reduced padding
          borderRadius: 3 , 
          bgcolor: 'background.paper',
          border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
          boxShadow: isDarkMode ? '0 10px 15px -3px rgba(0,0,0,0.5)' : '0 10px 15px -3px rgba(0,0,0,0.1)'
        }}>
          
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
             <CloudUpload sx={{ fontSize: 32, color: 'primary.main' }} />
             <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>Upload Document</Typography>
          </Stack>
          <Typography variant="caption" sx={{ mb: 3, display: 'block', color: 'text.secondary' }}>
            Enhance your repository by adding new academic materials.
          </Typography>
          
          {message.text && <Alert severity={message.severity} sx={{ mb: 2, py: 0, borderRadius: 2 }}>{message.text}</Alert>}

          <form onSubmit={handleSubmit}>
            <Stack direction="column" spacing={2.5}>
              
              {/* COMPACT SIDE-BY-SIDE UPLOAD ZONES */}
              <Stack direction="row" spacing={2}>
                <Box sx={{
                  flex: 1,
                  border: '1.5px dashed',
                  borderColor: pdfFile ? 'primary.main' : (isDarkMode ? 'rgba(255,255,255,0.2)' : '#cbd5e1'),
                  borderRadius: 2,
                  p: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  bgcolor: pdfFile ? (isDarkMode ? 'rgba(144,202,249,0.05)' : 'rgba(30,58,138,0.02)') : 'transparent',
                  '&:hover': { borderColor: 'primary.main' }
                }} component="label">
                  <input type="file" hidden accept=".pdf" onChange={(e) => setPdfFile(e.target.files[0])} />
                  <PictureAsPdf sx={{ fontSize: 32, color: pdfFile ? 'primary.main' : 'text.secondary', mb: 0.5 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                    {pdfFile ? pdfFile.name.substring(0, 10) + "..." : "Select PDF"}
                  </Typography>
                </Box>

                <Box sx={{
                  flex: 1,
                  border: '1.5px dashed',
                  borderColor: coverFile ? 'primary.main' : (isDarkMode ? 'rgba(255,255,255,0.2)' : '#cbd5e1'),
                  borderRadius: 2,
                  p: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  bgcolor: coverFile ? (isDarkMode ? 'rgba(144,202,249,0.05)' : 'rgba(30,58,138,0.02)') : 'transparent',
                  '&:hover': { borderColor: 'primary.main' }
                }} component="label">
                  <input type="file" hidden accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} />
                  <ImageIcon sx={{ fontSize: 32, color: coverFile ? 'primary.main' : 'text.secondary', mb: 0.5 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                    {coverFile ? coverFile.name.substring(0, 10) + "..." : "Select Cover"}
                  </Typography>
                </Box>
              </Stack>

              {/* FORM FIELDS */}
              <Stack spacing={1.5}>
                <TextField fullWidth label="Document Title" name="title" value={formData.title} onChange={handleInputChange} sx={inputStyle} size="small" />
                <TextField fullWidth label="Author / Publisher" name="author" value={formData.author} onChange={handleInputChange} sx={inputStyle} size="small" />
                
                <Stack direction="row" spacing={1.5}>
                  <TextField fullWidth label="Genre" name="genre" value={formData.genre} onChange={handleInputChange} sx={inputStyle} size="small" />
                  <TextField select fullWidth label="Category" name="category" value={formData.category} onChange={handleInputChange} sx={inputStyle} size="small">
                    <MenuItem value="book">Book</MenuItem>
                    <MenuItem value="academic paper">Academic Paper</MenuItem>
                  </TextField>
                </Stack>

                <TextField 
                  fullWidth 
                  label="Year" 
                  name="published_date" 
                  placeholder="YYYY-MM-DD"
                  value={formData.published_date} 
                  onChange={handleInputChange} 
                  sx={inputStyle} 
                  size="small"
                />

                <TextField fullWidth label="Brief Description" name="description" multiline rows={2} value={formData.description} onChange={handleInputChange} sx={inputStyle} size="small" />
                
                {uploading && <LinearProgress sx={{ borderRadius: 2, height: 4 }} />}

                <Button 
                  type="submit" 
                  disabled={uploading} 
                  variant="contained" 
                  startIcon={<Send />} 
                  sx={{ 
                    mt: 1, 
                    py: 1.2, 
                    borderRadius: 3, 
                    fontWeight: 800, 
                    fontSize: '0.85rem'
                  }}
                >
                  {uploading ? 'Submitting...' : 'Submit Request'}
                </Button>
              </Stack>
            </Stack>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default RequestUpload;