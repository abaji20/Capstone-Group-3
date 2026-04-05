import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Stack, useTheme, MenuItem 
} from '@mui/material';
import { supabase } from '../supabaseClient'; 

const EditPdfModal = ({ open, onClose, pdf, onUpdate }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  // Dynamic styles based on theme
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  const inputBg = isDarkMode ? '#28334e' : '#f1f5f9';

  const [formData, setFormData] = useState({ ...pdf });
  const [loading, setLoading] = useState(false);

  // Categories match the lowercase strings in your Supabase 'category' column
  const categories = [
    { value: 'book', label: 'Book' },
    { value: 'academic paper', label: 'Academic Paper' }
  ];

  // Sync internal state when the selected PDF prop changes
  useEffect(() => {
    if (pdf) setFormData({ ...pdf });
  }, [pdf]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Logic to track changes for audit logs
      const changeLogs = [];
      const fields = [
        { key: 'title', label: 'Title' },
        { key: 'author', label: 'Author' },
        { key: 'genre', label: 'Genre' },
        { key: 'category', label: 'Category' },
        { key: 'published_date', label: 'Year' },
        { key: 'description', label: 'Description' }
      ];

      fields.forEach(({ key, label }) => {
        if (formData[key] !== pdf[key]) {
          const oldVal = pdf[key] || "Empty";
          const newVal = formData[key] || "Empty";
          changeLogs.push(`${label}: "${oldVal}" → "${newVal}"`);
        }
      });

      const finalAuditDescription = changeLogs.length > 0 
        ? `Edited: ${changeLogs.join(" | ")}` 
        : "Updated document metadata";

      // 2. Update the 'pdfs' table in Supabase
      const { error: updateError } = await supabase
        .from('pdfs')
        .update({
          title: formData.title,
          author: formData.author,
          genre: formData.genre,
          category: formData.category, // Connects to your database category column
          published_date: formData.published_date,
          description: formData.description
        })
        .eq('id', pdf.id);

      if (updateError) throw updateError;

      // 3. Insert the action into audit_logs
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('audit_logs').insert([{
          user_id: user.id,
          pdf_id: pdf.id,
          action_type: 'Edit',
          description: finalAuditDescription 
        }]);
      }

      onUpdate(); // Refresh the parent table data
      onClose();  // Close the modal
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
      '&.Mui-focused fieldset': { border: `1px solid ${isDarkMode ? '#3b82f6' : '#94a3b8'}` },
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="sm"
      PaperProps={{
        sx: { 
          borderRadius: 4, 
          bgcolor: cardBg,
          backgroundImage: 'none'
        }
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#1e3a8a', pt: 3 }}>
        Edit Document Details
      </DialogTitle>

      <DialogContent sx={{ mt: 1 }}>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField 
            fullWidth label="Title" name="title" 
            value={formData.title} onChange={handleChange} 
            sx={inputStyle} InputLabelProps={{ shrink: true }}
          />
          <TextField 
            fullWidth label="Author" name="author" 
            value={formData.author} onChange={handleChange} 
            sx={inputStyle} InputLabelProps={{ shrink: true }}
          />
          
          <Stack direction="row" spacing={2}>
            <TextField 
              fullWidth label="Genre" name="genre" 
              value={formData.genre} onChange={handleChange} 
              sx={inputStyle} InputLabelProps={{ shrink: true }}
            />
            {/* Category Select Dropdown */}
            <TextField
              select
              fullWidth
              label="Category"
              name="category"
              value={formData.category || ''}
              onChange={handleChange}
              sx={inputStyle}
              InputLabelProps={{ shrink: true }}
            >
              {categories.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <TextField 
            fullWidth label="Year" name="published_date" 
            value={formData.published_date} onChange={handleChange} 
            sx={inputStyle} InputLabelProps={{ shrink: true }}
          />

          <TextField 
            fullWidth label="Description" name="description" 
            multiline rows={3} value={formData.description} 
            onChange={handleChange} sx={inputStyle} 
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary', fontWeight: 600 }}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={loading}
          sx={{ 
            borderRadius: '25px', 
            px: 4, 
            fontWeight: 800,
            bgcolor: '#3b82f6',
            '&:hover': { bgcolor: '#2563eb' }
          }}
        >
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditPdfModal;