import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Stack, useTheme, MenuItem, Box, Typography, Avatar 
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
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

  const categories = [
    { value: 'book', label: 'Book' },
    { value: 'academic paper', label: 'Academic Paper' }
  ];

  useEffect(() => {
    if (pdf) {
      setFormData({ ...pdf });
      setImagePreview(getImageUrl(pdf.image_url));
      setNewImageFile(null);
    }
  }, [pdf]);

  const getImageUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from('pdfs').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Validation para sa Genre (Bawal ang numbers)
    if (name === 'genre') {
      const regex = /^[a-zA-Z\s,]*$/; // Tinatanggap lang ang letters, spaces, at commas
      if (!regex.test(value)) return;
    }

    // Validation para sa Year (Limit to 4 characters)
    if (name === 'published_date') {
      if (value.length > 4) return;
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

  const handleSave = async () => {
    setLoading(true);
    try {
      let finalImageUrl = pdf.image_url;

      if (newImageFile) {
        const fileExt = newImageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `covers/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('pdfs')
          .upload(filePath, newImageFile);

        if (uploadError) throw uploadError;
        finalImageUrl = filePath;
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
          image_url: finalImageUrl
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

        if (newImageFile) {
          logEntries.push({
            user_id: user.id,
            pdf_id: pdf.id,
            action_type: 'Edit',
            description: "Updated Cover Image"
          });
        }

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 2, borderRadius: 2, border: `1px dashed ${isDarkMode ? '#475569' : '#cbd5e1'}` }}>
            <Avatar variant="rounded" src={imagePreview} sx={{ width: 80, height: 110, boxShadow: 3 }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Cover Photo</Typography>
              <Button component="label" variant="outlined" size="small" startIcon={<CloudUploadIcon />} sx={{ textTransform: 'none', borderRadius: '10px' }}>
                Upload New
                <input type="file" hidden accept="image/*" onChange={handleFileChange} />
              </Button>
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

          <TextField 
            fullWidth 
            label="Genre" 
            name="genre" 
            value={formData.genre} 
            onChange={handleChange} 
            sx={inputStyle} 
            InputLabelProps={{ shrink: true }} 
          />
          <TextField 
            fullWidth 
            label="Year" 
            name="published_date" 
            value={formData.published_date} 
            onChange={handleChange} 
            sx={inputStyle} 
            InputLabelProps={{ shrink: true }}
            inputProps={{ maxLength: 4 }} // Karagdagang safety para sa max length
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