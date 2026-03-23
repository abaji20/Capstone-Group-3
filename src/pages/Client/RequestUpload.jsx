import React, { useState } from 'react';
import { 
  Box, Paper, TextField, Button, Typography, Stack, 
  Container, Divider, MenuItem, InputAdornment, LinearProgress, Alert 
} from '@mui/material';
import { 
  CloudUpload, Title, Person, Book, PictureAsPdf, 
  Image as ImageIcon, Send, DateRange 
} from '@mui/icons-material';
import { supabase } from '../../supabaseClient';

const RequestUpload = () => {
  const [formData, setFormData] = useState({ 
    title: '', author: '', description: '', genre: '', category: 'book', published_date: '' 
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', severity: 'success' });

  const inputStyle = { 
    '& .MuiOutlinedInput-root': { 
      borderRadius: '12px',
      backgroundColor: '#f8fafc',
      '&:hover fieldset': { borderColor: '#4f46e5' }
    } 
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
      background: '#f1f5f9', 
      display: 'flex', 
      justifyContent: 'center', 
      py: 4 
    }}>
      <Container maxWidth="sm">
        <Paper elevation={0} sx={{ p: 5,maxWidth: '100', Height: '100', borderRadius: 6, border: '2px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
          <Typography variant="h4" sx={{ mb: 1, fontWeight: 800, color: '#0f172a' }}>Request Upload</Typography>
          <Typography variant="body2" sx={{ mb: 4, color: '#64748b' }}>Fill in the details to submit your new book or paper.</Typography>
          
          {message.text && <Alert severity={message.severity} sx={{ mb: 3 }}>{message.text}</Alert>}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <TextField fullWidth label="Book Title" name="title" value={formData.title} onChange={handleInputChange} sx={inputStyle} InputProps={{ startAdornment: (<InputAdornment position="start"><Title color="action" /></InputAdornment>) }} />
              <TextField fullWidth label="Author" name="author" value={formData.author} onChange={handleInputChange} sx={inputStyle} InputProps={{ startAdornment: (<InputAdornment position="start"><Person color="action" /></InputAdornment>) }} />
              
              <Stack direction="row" spacing={2}>
                <TextField fullWidth label="Genre" name="genre" value={formData.genre} onChange={handleInputChange} sx={inputStyle} />
                <TextField select fullWidth label="Category" name="category" value={formData.category} onChange={handleInputChange} sx={inputStyle}>
                  <MenuItem value="book">Book</MenuItem>
                  <MenuItem value="academic paper">Academic Paper</MenuItem>
                </TextField>
              </Stack>

              {/* Text-based date input */}
              <TextField 
                fullWidth 
                label="Published Date (YYYY-MM-DD)" 
                name="published_date" 
                placeholder="2026-03-13"
                value={formData.published_date} 
                onChange={handleInputChange} 
                sx={inputStyle} 
                InputProps={{ startAdornment: (<InputAdornment position="start"><DateRange color="action" /></InputAdornment>) }}
              />

              <TextField fullWidth label="Description" name="description" multiline rows={3} value={formData.description} onChange={handleInputChange} sx={inputStyle} />

              <Divider sx={{ my: 2 }}><Typography variant="caption" sx={{ fontWeight: 700, color: '#94a3b8' }}>ATTACHMENTS</Typography></Divider>

              <Stack direction="row" spacing={2}>
                <Button variant="outlined" component="label" fullWidth startIcon={<PictureAsPdf />} sx={{ borderRadius: 3, py: 1.5, borderColor: '#cbd5e1' }}>
                  {pdfFile ? pdfFile.name.substring(0, 15) + "..." : "Select PDF"}
                  <input type="file" hidden accept=".pdf" onChange={(e) => setPdfFile(e.target.files[0])} />
                </Button>
                <Button variant="outlined" component="label" fullWidth startIcon={<ImageIcon />} sx={{ borderRadius: 3, py: 1.5, borderColor: '#cbd5e1' }}>
                  {coverFile ? coverFile.name.substring(0, 15) + "..." : "Select Cover"}
                  <input type="file" hidden accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} />
                </Button>
              </Stack>
              
              {uploading && <LinearProgress sx={{ mt: 2 }} />}

              <Button type="submit" disabled={uploading} variant="contained" size="large" startIcon={<CloudUpload />} sx={{ mt: 2, bgcolor: '#213C51', py: 1.8, borderRadius: 3, fontWeight: 700, '&:hover': { bgcolor: '#1a2e3d' } }}>
                Submit Request
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default RequestUpload;