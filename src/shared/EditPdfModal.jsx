import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Stack, useTheme, MenuItem, Box, Typography, Avatar, Divider 
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { supabase } from '../supabaseClient'; 
// Same helpers PdfUploads.jsx uses to keep month/day valid and in sync with year
import { MONTH_NAMES, getDaysInMonth, isFutureDate, normalizePubDate } from '../utils/formatPublishedDate';
// NEW: same sectioned, responsive grid layout used on the Upload form
// (PdfUploads.jsx) instead of the old ad-hoc Stack rows.
import FormSection, { span, autofillFix } from '../shared/FormLayout';

// Same preset list used on the upload form — kept free-text-friendly via
// "Other" since it isn't a DB enum.
const SECTION_OPTIONS = [
  'Fiction', 'Nonfiction', 'High School', 'Bibliography', 'Reference',
  'Thesis', 'Capstone Project', 'Research Paper', 'Other'
];

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
  const [error, setError] = useState(''); // Error messages

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
      // If the year changes so that the currently-picked month/day is now
      // in the future, clear them instead of leaving a stale value.
      let next = { ...formData, [name]: value };
      if (isFutureDate(next)) {
        next = { ...next, published_month: '', published_day: '' };
      }
      setFormData(normalizePubDate(next));
      return;
    }

    // Optional Month / Day for the publication date
    if (name === 'published_month' || name === 'published_day') {
      const next = { ...formData, [name]: value };
      if (isFutureDate(next)) {
        setError('Publication date cannot be in the future');
        return;
      }
      setFormData(normalizePubDate(next));
      return;
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
          file_url: finalFileUrl,
          // Digital-library metadata fields
          section: formData.section || null,
          program_course: formData.program_course || null,
          publisher: formData.publisher || null,
          isbn: formData.isbn || null,
          edition: formData.edition || null,
          language: formData.language || null,
          published_month: formData.published_month ? Number(formData.published_month) : null,
          published_day: formData.published_day ? Number(formData.published_day) : null
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
          { key: 'description', label: 'Description' },
          { key: 'section', label: 'Section' },
          { key: 'program_course', label: 'Program/Course' },
          { key: 'publisher', label: 'Publisher' },
          { key: 'isbn', label: 'ISBN' },
          { key: 'edition', label: 'Edition' },
          { key: 'language', label: 'Language' },
          { key: 'published_month', label: 'Published Month' },
          { key: 'published_day', label: 'Published Day' }
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
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: 1, bgcolor: cardBg, backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#1e3a8a', pt: 3 }}>
        Edit Document Details
      </DialogTitle>

      <DialogContent>
        {/* Internal Error Indicator */}
        {error && (
          <Box sx={{ bgcolor: 'error.main', color: 'white', p: 1, borderRadius: 1, textAlign: 'center', mb: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>{error}</Typography>
          </Box>
        )}

        <Stack spacing={3} sx={autofillFix(inputBg, theme.palette.text.primary)}>

          {/* FILES */}
          <FormSection title="Files" hint="Leave blank to keep the current cover image or PDF file">
            <Box
              sx={{
                gridColumn: span(6),
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 3,
                p: 2,
                borderRadius: 2,
                border: `1px dashed ${isDarkMode ? '#475569' : '#cbd5e1'}`
              }}
            >
              <Avatar variant="rounded" src={imagePreview} sx={{ width: 80, height: 110, boxShadow: 3, flexShrink: 0 }} />
              <Box sx={{ flexGrow: 1, minWidth: 200 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Manage Files</Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
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
          </FormSection>

          <Divider />

          {/* DOCUMENT DETAILS */}
          <FormSection title="Document details" hint="Leave fields blank if information is unavailable">
            <TextField fullWidth label="Title" name="title" value={formData.title} onChange={handleChange} sx={{ ...inputStyle, gridColumn: span(6) }} InputLabelProps={{ shrink: true }} />
            <TextField fullWidth label="Author" name="author" value={formData.author} onChange={handleChange} sx={{ ...inputStyle, gridColumn: span(6) }} InputLabelProps={{ shrink: true }} />

            <TextField fullWidth label="Genre" name="genre" value={formData.genre} onChange={handleChange} sx={{ ...inputStyle, gridColumn: span(3) }} InputLabelProps={{ shrink: true }} />
            <TextField select fullWidth label="Category" name="category" value={formData.category || ''} onChange={handleChange} sx={{ ...inputStyle, gridColumn: span(3) }} InputLabelProps={{ shrink: true }}>
              {categories.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>

            <TextField select fullWidth label="Section" name="section" value={formData.section || ''} onChange={handleChange} sx={{ ...inputStyle, gridColumn: span(3) }} InputLabelProps={{ shrink: true }}>
              <MenuItem value=""><em>None</em></MenuItem>
              {SECTION_OPTIONS.map((opt) => (<MenuItem key={opt} value={opt}>{opt}</MenuItem>))}
            </TextField>
            <TextField fullWidth label="Program / Course" name="program_course" value={formData.program_course || ''} onChange={handleChange} sx={{ ...inputStyle, gridColumn: span(3) }} InputLabelProps={{ shrink: true }} placeholder="e.g., BS Computer Science" />
          </FormSection>

          <Divider />

          {/* PUBLICATION DETAILS: Year required, Month/Day optional (Day
              unlocks only after a Month is picked, and only shows the days
              that month really has). */}
          <FormSection title="Publication details" hint="Year is required. Add the month and day if you know them">
            <TextField
              fullWidth
              label="Year"
              name="published_date"
              value={formData.published_date}
              onChange={handleChange}
              sx={{ ...inputStyle, gridColumn: span(2) }}
              InputLabelProps={{ shrink: true }}
              inputProps={{ maxLength: 4 }}
              error={error.includes("Year")} // Visual indicator for year error
            />
            <TextField
              select
              fullWidth
              label="Month (optional)"
              name="published_month"
              value={formData.published_month || ''}
              onChange={handleChange}
              disabled={!formData.published_date || formData.published_date.length !== 4}
              sx={{ ...inputStyle, gridColumn: span(2) }}
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {MONTH_NAMES.map((name, index) => (
                <MenuItem key={name} value={index + 1}>{name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label="Day (optional)"
              name="published_day"
              value={formData.published_day || ''}
              onChange={handleChange}
              disabled={!formData.published_month}
              sx={{ ...inputStyle, gridColumn: span(2) }}
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {formData.published_month && Array.from(
                { length: getDaysInMonth(formData.published_date, formData.published_month) },
                (_, i) => (<MenuItem key={i + 1} value={i + 1}>{i + 1}</MenuItem>)
              )}
            </TextField>

            <TextField fullWidth label="Publisher" name="publisher" value={formData.publisher || ''} onChange={handleChange} sx={{ ...inputStyle, gridColumn: span(3) }} InputLabelProps={{ shrink: true }} />
            <TextField fullWidth label="Edition" name="edition" value={formData.edition || ''} onChange={handleChange} sx={{ ...inputStyle, gridColumn: span(3) }} InputLabelProps={{ shrink: true }} placeholder="e.g., 2nd Edition" />

            <TextField fullWidth label="ISBN" name="isbn" value={formData.isbn || ''} onChange={handleChange} sx={{ ...inputStyle, gridColumn: span(3) }} InputLabelProps={{ shrink: true }} placeholder="e.g., 978-3-16-148410-0" />
            <TextField fullWidth label="Language" name="language" value={formData.language || ''} onChange={handleChange} sx={{ ...inputStyle, gridColumn: span(3) }} InputLabelProps={{ shrink: true }} />
          </FormSection>

          <Divider />

          {/* DESCRIPTION */}
          <FormSection title="Description">
            <TextField fullWidth label="Description" name="description" multiline rows={3} value={formData.description} onChange={handleChange} sx={{ ...inputStyle, gridColumn: span(6) }} InputLabelProps={{ shrink: true }} />
          </FormSection>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary', fontWeight: 600 }}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading} sx={{ color: '#ffffff', borderRadius: '25px', px: 4, fontWeight: 700, bgcolor: '#3b82f6' }}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditPdfModal;