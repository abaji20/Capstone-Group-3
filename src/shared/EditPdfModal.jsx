import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, Typography } from '@mui/material';
import { supabase } from '../supabaseClient'; // Adjust path as needed

const EditPdfModal = ({ open, onClose, pdf, onUpdate }) => {
  const [formData, setFormData] = useState({ ...pdf });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Identify which fields actually changed
      const changes = [];
      if (formData.title !== pdf.title) changes.push("Title");
      if (formData.author !== pdf.author) changes.push("Author");
      if (formData.genre !== pdf.genre) changes.push("Genre");
      if (formData.published_date !== pdf.published_date) changes.push("Year");
      if (formData.description !== pdf.description) changes.push("Description");

      // Generate the description string
      const description = changes.length > 0 
        ? `Edited: ${changes.join(", ")}` 
        : "Edited document details";

      // 2. Update the PDF record
      const { error: updateError } = await supabase
        .from('pdfs')
        .update({
          title: formData.title,
          author: formData.author,
          genre: formData.genre,
          published_date: formData.published_date,
          description: formData.description
        })
        .eq('id', pdf.id);

      if (updateError) throw updateError;

      // 3. Insert the Log Entry with the specific changes
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('audit_logs').insert([{
          user_id: user.id,
          pdf_id: pdf.id,
          action_type: 'Edit',
          description: description // e.g., "Edited: Title, Genre"
        }]);
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error:", error.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ bgcolor: '#e0f7fa', color: '#1e3a8a' }}>Edit Document</DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Stack spacing={3}>
          <TextField fullWidth label="Title" name="title" value={formData.title} onChange={handleChange} />
          <TextField fullWidth label="Author" name="author" value={formData.author} onChange={handleChange} />
          <Stack direction="row" spacing={2}>
            <TextField fullWidth label="Genre" name="genre" value={formData.genre} onChange={handleChange} />
            <TextField fullWidth label="Year" name="published_date" value={formData.published_date} onChange={handleChange} />
          </Stack>
          <TextField fullWidth label="Description" name="description" multiline rows={3} value={formData.description} onChange={handleChange} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default EditPdfModal;