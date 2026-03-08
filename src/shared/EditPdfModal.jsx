import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, TextField, 
  DialogActions, Button, CircularProgress, Stack, MenuItem 
} from '@mui/material';
import { supabase } from '../supabaseClient'; 

const EditPdfModal = ({ open, onClose, pdf, onUpdate }) => {
  const [formData, setFormData] = useState({
    title: '', 
    author: '', 
    genre: '', 
    category: '', // Added category
    published_date: '', 
    description: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pdf) {
      setFormData({
        title: pdf.title || '',
        author: pdf.author || '',
        genre: pdf.genre || '',
        category: pdf.category || 'book', // Default to 'book' if null
        published_date: pdf.published_date || '',
        description: pdf.description || ''
      });
    }
  }, [pdf]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const changes = [];
      const fields = [
        { key: 'title', label: 'title' },
        { key: 'author', label: 'author' },
        { key: 'genre', label: 'genre' },
        { key: 'category', label: 'category' }, // Added to change tracker
        { key: 'published_date', label: 'date' },
        { key: 'description', label: 'description' }
      ];

      fields.forEach(({ key, label }) => {
        if (String(formData[key]) !== String(pdf[key])) {
          changes.push(`Updated ${label}`);
        }
      });

      if (changes.length === 0) {
        alert("No changes detected.");
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('pdfs')
        .update(formData)
        .eq('id', pdf.id);

      if (updateError) throw updateError;

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase.from('audit_logs').insert([{
          user_id: user.id,
          pdf_id: pdf.id,
          action_type: 'Edit',
          description: changes.join(', ')
        }]);
      }
      
      alert("Document updated successfully!");
      onUpdate();
      onClose();
    } catch (error) {
      alert("Error saving: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Document Details</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Title" fullWidth value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
          <TextField label="Author" fullWidth value={formData.author} onChange={(e) => setFormData({...formData, author: e.target.value})} />
          <TextField label="Genre" fullWidth value={formData.genre} onChange={(e) => setFormData({...formData, genre: e.target.value})} />
          
          {/* New Category Dropdown */}
          <TextField
            select
            fullWidth
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
          >
            <MenuItem value="book">Book</MenuItem>
            <MenuItem value="academic paper">Academic Paper</MenuItem>
          </TextField>

          <TextField label="Published Year" type="number" fullWidth value={formData.published_date} onChange={(e) => setFormData({...formData, published_date: e.target.value})} />
          <TextField label="Description" fullWidth multiline rows={3} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditPdfModal;