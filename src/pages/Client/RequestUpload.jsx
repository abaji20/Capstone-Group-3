import React, { useState } from 'react';
import { 
  Box, Paper, TextField, Button, Typography, Stack, 
  InputAdornment, LinearProgress, Alert, Container, Divider, MenuItem 
} from '@mui/material';
import { 
  PictureAsPdf, Image, Title, Person, Description, 
  Send, Category, Public 
} from '@mui/icons-material';
import { supabase } from '../../supabaseClient';

const RequestUpload = () => {
  // Added genre and category to state
  const [formData, setFormData] = useState({ 
    title: '', author: '', description: '', genre: '', category: 'book' 
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', severity: 'success' });

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (type === 'pdf') setPdfFile(file);
    else setCoverFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pdfFile || !coverFile) {
      setMessage({ text: 'Please select both a PDF and a Cover Image.', severity: 'error' });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to request an upload.");

      const pdfPath = `requests/pdfs/${Date.now()}_${pdfFile.name}`;
      await supabase.storage.from('pdfs').upload(pdfPath, pdfFile);

      const coverPath = `requests/covers/${Date.now()}_${coverFile.name}`;
      await supabase.storage.from('pdfs').upload(coverPath, coverFile);

      // Insert full data into staging table
      const { error: dbError } = await supabase.from('upload_requests').insert([{
        client_id: user.id,
        title: formData.title,
        author: formData.author,
        description: formData.description,
        genre: formData.genre,
        category: formData.category,
        pdf_url: pdfPath,
        cover_url: coverPath,
        status: 'pending'
      }]);

      if (dbError) throw dbError;

      setMessage({ text: 'Request submitted successfully!', severity: 'success' });
      setFormData({ title: '', author: '', description: '', genre: '', category: 'book' });
      setPdfFile(null);
      setCoverFile(null);
    } catch (error) {
      setMessage({ text: error.message, severity: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
      <Container maxWidth="sm">
        <Paper elevation={4} sx={{ p: 4, borderRadius: 4 }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, textAlign: 'center' }}>
            Request New PDF Upload
          </Typography>
          {message.text && <Alert severity={message.severity} sx={{ mb: 3 }}>{message.text}</Alert>}
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField fullWidth label="Book Title" name="title" value={formData.title} onChange={handleInputChange} />
              <TextField fullWidth label="Author" name="author" value={formData.author} onChange={handleInputChange} />
              
              <Stack direction="row" spacing={2}>
                <TextField fullWidth label="Genre" name="genre" value={formData.genre} onChange={handleInputChange} />
                <TextField select fullWidth label="Category" name="category" value={formData.category} onChange={handleInputChange}>
                  <MenuItem value="book">Book</MenuItem>
                  <MenuItem value="academic paper">Academic Paper</MenuItem>
                </TextField>
              </Stack>

              <TextField fullWidth label="Description" name="description" multiline rows={3} value={formData.description} onChange={handleInputChange} />
              
              <Divider>Upload Files</Divider>
              <Stack direction="row" spacing={2}>
                <Button variant="outlined" component="label" startIcon={<PictureAsPdf />}>
                  {pdfFile ? "PDF Selected" : "Select PDF"}
                  <input type="file" hidden accept=".pdf" onChange={(e) => handleFileChange(e, 'pdf')} />
                </Button>
                <Button variant="outlined" component="label" startIcon={<Image />}>
                  {coverFile ? "Cover Selected" : "Select Cover"}
                  <input type="file" hidden accept="image/*" onChange={(e) => handleFileChange(e, 'cover')} />
                </Button>
              </Stack>
              {uploading && <LinearProgress />}
              <Button type="submit" variant="contained" disabled={uploading} endIcon={<Send />}>
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