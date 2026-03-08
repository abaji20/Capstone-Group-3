import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import TitleIcon from '@mui/icons-material/Title';
import PersonIcon from '@mui/icons-material/Person';
import CategoryIcon from '@mui/icons-material/Category';
import DateRangeIcon from '@mui/icons-material/DateRange';
import DescriptionIcon from '@mui/icons-material/Description';

const EditPdfModal = ({ open, onClose, pdf, onUpdate }) => {
  const [formData, setFormData] = useState({ ...pdf });
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#e0f7fa', color: '#1e3a8a' }}>
        <EditIcon /> <Typography variant="h6" sx={{ fontWeight: 800 }}>Edit Document</Typography>
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Stack spacing={3}>
          <TextField fullWidth label="Title" name="title" value={formData.title} onChange={handleChange} InputProps={{ startAdornment: <TitleIcon sx={{ mr: 1, color: '#64748b' }} /> }} />
          <TextField fullWidth label="Author" name="author" value={formData.author} onChange={handleChange} InputProps={{ startAdornment: <PersonIcon sx={{ mr: 1, color: '#64748b' }} /> }} />
          <Stack direction="row" spacing={2}>
            <TextField fullWidth label="Genre" name="genre" value={formData.genre} onChange={handleChange} InputProps={{ startAdornment: <CategoryIcon sx={{ mr: 1, color: '#64748b' }} /> }} />
            <TextField fullWidth label="Year" name="published_date" value={formData.published_date} onChange={handleChange} InputProps={{ startAdornment: <DateRangeIcon sx={{ mr: 1, color: '#64748b' }} /> }} />
          </Stack>
          <TextField fullWidth label="Description" name="description" multiline rows={3} value={formData.description} onChange={handleChange} InputProps={{ startAdornment: <DescriptionIcon sx={{ mr: 1, color: '#64748b', alignSelf: 'flex-start', mt: 1 }} /> }} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ color: '#64748b' }}>Cancel</Button>
        <Button onClick={onUpdate} variant="contained" sx={{ bgcolor: '#1e3a8a', fontWeight: 800, px: 4 }}>Save Changes</Button>
      </DialogActions>
    </Dialog>
  );
};
export default EditPdfModal;