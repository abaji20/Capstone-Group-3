import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Stack, useTheme, MenuItem, Box, Typography, Avatar, FormHelperText 
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { supabase } from '../supabaseClient'; 

const EditPdfModal = ({ open, onClose, pdf, onUpdate }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  const inputBg = isDarkMode ? '#28334e' : '#f1f5f9';

  const [formData, setFormData] = useState({ ...pdf });
  const [loading, setLoading] = useState(false);
  const [newImageFile, setNewImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [newPdfFile, setNewPdfFile] = useState(null);
  const [error, setError] = useState(''); // New state for error messages

  const categories = [
    { value: 'book', label: 'Book' },
    { value: 'academic paper', label: 'Academic Paper' }
  ];

  useEffect(() => {
    if (pdf) {
      setFormData({ ...pdf });
      setImagePreview(getImageUrl(pdf.image_url));
      setNewImageFile(null);
      setNewPdfFile(null);
      setError(''); // Clear error on open
    }
  }, [pdf]);

  const getImageUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from('pdfs').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setError(''); // Clear error when typing

    // Validation para sa Genre (Bawal ang numbers)
    if (name === 'genre') {
      const regex = /^[a-zA-Z\s,]*$/; 
      if (!regex.test(value)) return;
    }

    // Validation para sa Year (Limit to 4 characters and cannot exceed current year)
    if (name === 'published_date') {
      if (value.length > 4) return;
      const currentYear = new Date().getFullYear();
      if (value && parseInt(value) > currentYear) {
        setError(`Year cannot exceed ${currentYear}`);
      }
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handlePdfChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // PDF Type validation - using internal error state instead of alert
      if (file.type !== 'application/pdf') {
        setError("Only PDF files are allowed!");
        e.target.value = null; 
        return;
      }
      setNewPdfFile(file);
    }
  };

  const handleSave = async () => {
    const currentYear = new Date().getFullYear();
    if (parseInt(formData.published_date) > currentYear) {
      setError(`Please enter a valid year (up to ${currentYear})`);
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = pdf.image_url;
      let finalFileUrl = pdf.file_url;

      if (newImageFile) {
        const fileExt = newImageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `covers/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('pdfs').upload(filePath, newImageFile);
        if (uploadError) throw uploadError;
        finalImageUrl = filePath;
      }

      if (newPdfFile) {
        const fileExt = newPdfFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `files/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('pdfs').upload(filePath, newPdfFile);
        if (uploadError) throw uploadError;
        finalFileUrl = filePath;
      }

      const { error: updateError } = await supabase
        .from('pdfs')
        .update({
          title: formData.title,
          author: formData.author,
          genre: formData.genre,
          category: formData.category,
          published_date: formData.published_date,
          description: formData.description,
          image_url: finalImageUrl,
          file_url: finalFileUrl
        })
        .eq('id', pdf.id);

      if (updateError) throw updateError;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fields = [
          { key: 'title', label: 'Title' },
          { key: 'author', label: 'Author' },
          { key: 'genre', label: 'Genre' },
          { key: 'category', label: 'Category' },
          { key: 'published_date', label: 'Year' },
          { key: 'description', label: 'Description' }
        ];

        const logEntries = [];
        fields.forEach(({ key, label }) => {
          if (formData[key]?.toString() !== pdf[key]?.toString()) {
            logEntries.push({
              user_id: user.id,
              pdf_id: pdf.id,
              action_type: 'Edit',
              description: `Updated ${label}: "${pdf[key] || 'None'}" → "${formData[key] || 'None'}"`
            });
          }
        });

        if (newImageFile) logEntries.push({ user_id: user.id, pdf_id: pdf.id, action_type: 'Edit', description: "Updated Cover Image" });
        if (newPdfFile) logEntries.push({ user_id: user.id, pdf_id: pdf.id, action_type: 'Edit', description: "Updated PDF File" });

        if (logEntries.length > 0) {
          await supabase.from('audit_logs').insert(logEntries);
        }
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error("Update failed:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '8px',
      backgroundColor: inputBg,
      '& fieldset': { border: 'none' },
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4, bgcolor: cardBg, backgroundImage: 'none' } }}>
      <DialogTitle sx={{ fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#1e3a8a', pt: 3 }}>
        Edit Document Details
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {/* Internal Error Indicator */}
          {error && (
            <Box sx={{ bgcolor: 'error.main', color: 'white', p: 1, borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>{error}</Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 2, borderRadius: 2, border: `1px dashed ${isDarkMode ? '#475569' : '#cbd5e1'}` }}>
            <Avatar variant="rounded" src={imagePreview} sx={{ width: 80, height: 110, boxShadow: 3 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Manage Files</Typography>
              <Stack direction="row" spacing={1}>
                <Button component="label" variant="outlined" size="small" startIcon={<CloudUploadIcon />} sx={{ textTransform: 'none', borderRadius: '10px', fontSize: '0.75rem' }}>
                  New Cover
                  <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                </Button>
                <Button component="label" variant="outlined" size="small" color="secondary" startIcon={<PictureAsPdfIcon />} sx={{ textTransform: 'none', borderRadius: '10px', fontSize: '0.75rem' }}>
                  {newPdfFile ? "PDF Ready" : "Update PDF"}
                  <input type="file" hidden accept="application/pdf" onChange={handlePdfChange} />
                </Button>
              </Stack>
              {newPdfFile && <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'success.main' }}>{newPdfFile.name}</Typography>}
            </Box>
          </Box>

          <TextField fullWidth label="Title" name="title" value={formData.title} onChange={handleChange} sx={inputStyle} InputLabelProps={{ shrink: true }} />
          
          <Stack direction="row" spacing={2}>
            <TextField fullWidth label="Author" name="author" value={formData.author} onChange={handleChange} sx={inputStyle} InputLabelProps={{ shrink: true }} />
            <TextField select fullWidth label="Category" name="category" value={formData.category || ''} onChange={handleChange} sx={inputStyle} InputLabelProps={{ shrink: true }}>
              {categories.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
          </Stack>

          <TextField fullWidth label="Genre" name="genre" value={formData.genre} onChange={handleChange} sx={inputStyle} InputLabelProps={{ shrink: true }} />
          
          <TextField 
            fullWidth 
            label="Year" 
            name="published_date" 
            value={formData.published_date} 
            onChange={handleChange} 
            sx={inputStyle} 
            InputLabelProps={{ shrink: true }} 
            inputProps={{ maxLength: 4 }}
            error={error.includes("Year")} // Visual indicator for year error
          />
          
          <TextField fullWidth label="Description" name="description" multiline rows={3} value={formData.description} onChange={handleChange} sx={inputStyle} InputLabelProps={{ shrink: true }} />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary', fontWeight: 600 }}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading} sx={{ borderRadius: '25px', px: 4, fontWeight: 800, bgcolor: '#3b82f6' }}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditPdfModal;