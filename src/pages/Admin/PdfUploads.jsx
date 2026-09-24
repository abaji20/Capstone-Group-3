import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, Stack, CircularProgress, 
  MenuItem, TextField, useTheme, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert,
  Avatar, Card, CardContent, Grid, Divider
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import TitleIcon from '@mui/icons-material/Title';
import PersonIcon from '@mui/icons-material/Person';
import CategoryIcon from '@mui/icons-material/Category';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import EventIcon from '@mui/icons-material/Event';
import StorageIcon from '@mui/icons-material/Storage';
import VisibilityIcon from '@mui/icons-material/Visibility';
// NEW: icons for the added metadata fields
import BookmarkIcon from '@mui/icons-material/Bookmark';
import SchoolIcon from '@mui/icons-material/School';
import BusinessIcon from '@mui/icons-material/Business';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import LayersIcon from '@mui/icons-material/Layers';
import LanguageIcon from '@mui/icons-material/Language';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFilePdf, faImage, faCloudUploadAlt, faCheckCircle, 
  faFileAlt, faDownload, faBook, faGraduationCap, faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import { 
  uploadPdfWithFiles, 
  checkDuplicate, 
  deletePdf, 
  uploadNewPdf, 
  fetchPdfs 
} from '../../services/pdfService'; 
import { supabase } from '../../supabaseClient';
import glclogo from '../../assets/glclogo.png';
// NEW: shared date formatter (year / month / day -> "March 15, 2020")
import { 
  formatPublishedDate, MONTH_NAMES, getDaysInMonth, isFutureDate, normalizePubDate 
} from '../../utils/formatPublishedDate';
// NEW: tidy sectioned layout + autofill colour fix
import FormSection, { span, autofillFix } from '../../shared/FormLayout';

// Preset options for the Section dropdown — same list used on the user-side
// request form, kept free-text-friendly via "Other" since it isn't a DB enum.
const SECTION_OPTIONS = [
  'Fiction', 'Nonfiction', 'High School', 'Bibliography', 'Reference',
  'Thesis', 'Capstone Project', 'Research Paper', 'Other'
];

const EMPTY_FORM = { 
  title: '', author: '', genre: '', category: 'book', published_date: '', description: '',
  // NEW: optional month / day (published_date stays the required YEAR)
  published_month: '', published_day: '',
  // NEW: digital-library metadata fields
  section: '', program_course: '', publisher: '', isbn: '', edition: '', language: 'English'
};

const PdfUploads = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // --- STYLING ---
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  const inputBg = isDarkMode ? '#28334e' : '#f8fafc';
  const borderCol = isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0';

  // --- STATE WITH LOCALSTORAGE PERSISTENCE ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentUploads, setRecentUploads] = useState([]); 
  
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('pdf_upload_form');
    if (saved) {
      try { 
        // Merge with EMPTY_FORM so older saved drafts (from before the new
        // fields existed) don't come back missing keys.
        return { ...EMPTY_FORM, ...JSON.parse(saved) }; 
      } catch (e) { /* ignore */ }
    }
    return EMPTY_FORM;
  });

  useEffect(() => {
    localStorage.setItem('pdf_upload_form', JSON.stringify(formData));
  }, [formData]);

  // Analytics State (Totals)
  const [stats, setStats] = useState({
    totalPdfs: 0,
    academicMaterials: 0,
    books: 0,
    totalDownloads: 0
  });

  // Selected item for "See Info" Modal
  const [selectedItemInfo, setSelectedItemInfo] = useState(null);
  const [selectedItemFileSize, setSelectedItemFileSize] = useState('Fetching size...');

  const [status, setStatus] = useState({ open: false, type: 'success', message: '' });
  const [confirmData, setConfirmData] = useState({ open: false, record: null });
  
  // Review/Pre-Upload Confirmation Modal State
  const [reviewOpen, setReviewOpen] = useState(false);

  // --- REAL-TIME SUBSCRIPTION & DATA FETCHING ---
  useEffect(() => {
    fetchData();

    const pdfChannel = supabase
      .channel('realtime-pdf-uploads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pdfs' }, () => { fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'downloads' }, () => { fetchData(); })
      .subscribe();

    return () => {
      supabase.removeChannel(pdfChannel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const data = await fetchPdfs();

      let downloadCount = 0;
      const { data: downloadList, error: downloadError } = await supabase
        .from('downloads')
        .select('id');

      if (!downloadError && downloadList) {
        downloadCount = downloadList.length;
      } else {
        const { data: altList } = await supabase
          .from('download_logs')
          .select('id');
        if (altList) downloadCount = altList.length;
      }

      if (data) {
        setRecentUploads(data.slice(0, 5));

        const pdfCount = data.length;
        const academicCount = data.filter(item => item.category === 'academic paper').length;
        const bookCount = data.filter(item => item.category === 'book').length;

        setStats({
          totalPdfs: pdfCount,
          academicMaterials: academicCount,
          books: bookCount,
          totalDownloads: downloadCount
        });
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'genre') {
      setFormData({ ...formData, [name]: value.replace(/[^a-zA-Z\s,]/g, '') });
      return;
    }

    // YEAR (required)
    if (name === 'published_date') {
      const onlyNums = value.replace(/[^0-9]/g, '');
      const currentYear = new Date().getFullYear();
      
      if (onlyNums.length <= 4) {
        if (onlyNums !== '' && parseInt(onlyNums) > currentYear) {
           showStatus('error', `Year cannot exceed ${currentYear}`);
           return;
        }
        let next = normalizePubDate({ ...formData, [name]: onlyNums });
        // e.g. month was "December", then the year was changed to this year
        // and December hasn't happened yet -> clear the month/day.
        if (isFutureDate(next)) {
          next = { ...next, published_month: '', published_day: '' };
        }
        setFormData(next);
      }
      return;
    }

    // MONTH / DAY (optional)
    if (name === 'published_month' || name === 'published_day') {
      const next = { ...formData, [name]: value };
      if (isFutureDate(next)) {
        showStatus('error', 'Publication date cannot be in the future');
        return;
      }
      setFormData(normalizePubDate(next));
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const showStatus = (type, message) => setStatus({ open: true, type, message });

  const resetForm = () => {
    setSelectedFile(null); 
    setSelectedImage(null);
    setFormData(EMPTY_FORM);
    localStorage.removeItem('pdf_upload_form');
  };

  // The form keeps month/day as '' when empty. The database wants a number
  // or NULL, so convert right before sending to the service.
  const buildPayload = () => ({
    ...formData,
    published_month: formData.published_month ? Number(formData.published_month) : null,
    published_day: formData.published_day ? Number(formData.published_day) : null,
  });

  const getImageUrl = (path) => path ? `https://yktwxeyxmzfkxqhlesly.supabase.co/storage/v1/object/public/pdfs/${path}` : null;

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleOpenItemInfo = async (item) => {
    setSelectedItemInfo(item);
    setSelectedItemFileSize(item?.file_size || 'Fetching size...');

    if (!item?.file_url || item.file_size) return;

    try {
      const { data } = supabase.storage.from('pdfs').getPublicUrl(item.file_url);
      const response = await fetch(data.publicUrl, { method: 'HEAD' });
      const size = response.headers.get('content-length');
      setSelectedItemFileSize(size ? formatFileSize(parseInt(size, 10)) : 'Unknown size');
    } catch (error) {
      console.error('Error fetching file size:', error);
      setSelectedItemFileSize('Unknown size');
    }
  };

  const handleViewPdf = (item) => {
    if (!item?.file_url) return;
    const { data } = supabase.storage.from('pdfs').getPublicUrl(item.file_url);
    if (data?.publicUrl) window.open(data.publicUrl, '_blank');
  };

  // --- TRIGGER REVIEW MODAL & VALIDATE FIELDS ---
  const handlePreUploadCheck = () => {
    if (!selectedFile) {
      showStatus('error', "Please select a PDF file.");
      return;
    }
    if (selectedFile.size > 100 * 1024 * 1024) {
      showStatus('error', "PDF file size exceeds the 100MB limit.");
      return;
    }
    if (selectedImage && selectedImage.size > 50 * 1024 * 1024) {
      showStatus('error', "Cover image file size exceeds the 50MB limit.");
      return;
    }
    // Only the original fields are required — section/program/publisher/isbn/
    // edition/language and the month/day stay optional since not every
    // material has them.
    if (!formData.title.trim() || !formData.author.trim() || !formData.genre.trim() || !formData.published_date.trim() || !formData.description.trim()) {
      showStatus('error', "All fields are required to fill up!");
      return;
    }
    if (formData.published_date.length !== 4) {
      showStatus('error', "Please enter a complete 4-digit publication year.");
      return;
    }
    setReviewOpen(true);
  };

  // --- ACTUAL UPLOAD LOGIC EXECUTED AFTER CONFIRMATION ---
  const handleUpload = async () => {
    setReviewOpen(false);
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Duplicate = same title + author + edition + ISBN
      const existingRecord = await checkDuplicate(
        formData.title.trim(), 
        formData.author.trim(), 
        formData.edition, 
        formData.isbn
      );
      
      if (existingRecord) {
        setConfirmData({ open: true, record: existingRecord });
        setLoading(false);
        return; 
      }

      await uploadPdfWithFiles(selectedFile, selectedImage, buildPayload(), user?.id);
      await fetchData(); 
      showStatus('success', "Added as a new record!");
      resetForm();
    } catch (error) {
      showStatus('error', `Upload failed: ${error.message}`);
    } finally { setLoading(false); }
  };

  const handleReplace = async () => {
    const recordId = confirmData.record.id;
    setConfirmData({ open: false, record: null });
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await deletePdf(recordId); 
      await uploadNewPdf(selectedFile, selectedImage, buildPayload(), user?.id);
      await fetchData();
      showStatus('success', "Existing resource replaced!");
      resetForm();
    } catch (error) {
      showStatus('error', `Replacement failed: ${error.message}`);
    } finally { setLoading(false); }
  };

  const handleAddAnyway = async () => {
    setConfirmData({ open: false, record: null });
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await uploadPdfWithFiles(selectedFile, selectedImage, buildPayload(), user?.id);
      await fetchData();
      showStatus('success', "Added as a new record!");
      resetForm();
    } catch (error) {
      showStatus('error', `Upload failed: ${error.message}`);
    } finally { setLoading(false); }
  };

  const inputStyle = { 
    '& .MuiOutlinedInput-root': { 
      borderRadius: '10px',
      backgroundColor: inputBg, 
      '& fieldset': { border: `1px solid ${borderCol}` }, 
      '&.Mui-focused fieldset': { border: `1px solid #3b82f6` },
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 4, md: 5 }, bgcolor: isDarkMode ? '#0f172a' : '#f1f5f9', minHeight: '100vh', width: '100%' }}>
      
      {/* HEADER SECTION */}
      <Box sx={{ mb: 4, px: { xs: 1, sm: 2, md: 3 }, width: '100%', maxWidth: '1400px', margin: '4px' }}>
        <Typography variant="h3" sx={{ fontFamily: "'Montserrat', sans-serif", fontStyle: 'italic', fontWeight: 900, color: isDarkMode ? '#ffffff' : '#213C51', fontSize: { xs: '1.8rem', sm: '2.4rem', md: '3rem' } }}>
          UPLOAD PDFs
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, mt: 0.5 }}>
          ADD NEW ACADEMIC MATERIALS TO THE REPOSITORY SYSTEM
        </Typography>
      </Box>

      {/* MAIN CONTENT GRID */}
      <Grid container spacing={4} justifyContent="flex-start" alignItems="stretch" sx={{ width: '100%', maxWidth: '1600px', margin: '0 auto', mt: 5, mb: 4 }}>
        
        {/* LEFT COLUMN: UPLOAD FORM */}
        <Grid size={{ xs: 12, lg: 8, xl: 7}}>
          <Paper elevation={0} sx={{ p: { xs: 3, sm: 4.5 }, borderRadius: 3, bgcolor: cardBg, border: `1px solid ${borderCol}`, height: '100%' }}>
            <Stack spacing={3} sx={autofillFix(inputBg, theme.palette.text.primary)}>

              {/* FILES */}
              <FormSection title="Files" hint="100 MB max file size. Cover image is optional">
                <Box 
                  sx={{ 
                    gridColumn: span(3),
                    p: 3.5, 
                    border: '2px dashed #3b82f6', 
                    borderRadius: 3, 
                    textAlign: 'center', 
                    bgcolor: inputBg, 
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: '0.2s',
                    '&:hover': { bgcolor: isDarkMode ? '#1e293b' : '#e0f2fe' }
                  }} 
                  component="label"
                >
                  <input 
                    type="file" 
                    hidden 
                    accept="application/pdf" 
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file && file.type !== 'application/pdf') {
                        showStatus('error', 'Only PDF files can be uploaded!');
                        e.target.value = null; 
                        setSelectedFile(null);
                        return;
                      }
                      if (file && file.size > 100 * 1024 * 1024) {
                        showStatus('error', 'PDF file size exceeds the 100MB limit!');
                        e.target.value = null;
                        setSelectedFile(null);
                        return;
                      }
                      setSelectedFile(file);
                    }} 
                  />
                  <FontAwesomeIcon icon={selectedFile ? faCheckCircle : faFilePdf} style={{ fontSize: '32px', color: selectedFile ? '#22c55e' : '#3b82f6' }} />
                  <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 800, wordBreak: 'break-word' }}>{selectedFile ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})` : "CHOOSE PDF FILE (Max 100MB)"}</Typography>
                </Box>

                <Box 
                  sx={{ 
                    gridColumn: span(3),
                    p: 3.5, 
                    border: '2px dashed #a855f7', 
                    borderRadius: 3, 
                    textAlign: 'center', 
                    bgcolor: inputBg, 
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: '0.2s',
                    '&:hover': { bgcolor: isDarkMode ? '#1e293b' : '#f3e8ff' }
                  }} 
                  component="label"
                >
                  <input 
                    type="file" 
                    hidden 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file && file.size > 50 * 1024 * 1024) {
                        showStatus('error', 'Cover image file size exceeds the 50MB limit!');
                        e.target.value = null;
                        setSelectedImage(null);
                        return;
                      }
                      setSelectedImage(file);
                    }} 
                  />
                  <FontAwesomeIcon icon={selectedImage ? faCheckCircle : faImage} style={{ fontSize: '32px', color: selectedImage ? '#22c55e' : '#a855f7' }} />
                  <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 800, wordBreak: 'break-word' }}>{selectedImage ? `${selectedImage.name} (${formatFileSize(selectedImage.size)})` : "CHOOSE COVER IMAGE "}</Typography>
                </Box>
              </FormSection>

              <Divider />

              {/* DOCUMENT DETAILS */}
              <FormSection title="Document details" hint="Leave fields blank if information is unavailable..">
                <TextField required fullWidth label="Document Title" name="title" value={formData.title} onChange={handleInputChange} sx={{ ...inputStyle, gridColumn: span(6) }} />
                <TextField required fullWidth label="Author / Publisher" name="author" value={formData.author} onChange={handleInputChange} sx={{ ...inputStyle, gridColumn: span(6) }} />

                <TextField required fullWidth label="Genre / Field" name="genre" value={formData.genre} onChange={handleInputChange} sx={{ ...inputStyle, gridColumn: span(3) }} />
                <TextField select required fullWidth label="Category" name="category" value={formData.category} onChange={handleInputChange} sx={{ ...inputStyle, gridColumn: span(3) }}>
                  <MenuItem value="academic paper">Academic Paper / Research</MenuItem>
                  <MenuItem value="book">Book</MenuItem>
                </TextField>

                <TextField select fullWidth label="Section" name="section" value={formData.section} onChange={handleInputChange} sx={{ ...inputStyle, gridColumn: span(3) }}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {SECTION_OPTIONS.map((opt) => (<MenuItem key={opt} value={opt}>{opt}</MenuItem>))}
                </TextField>
                <TextField fullWidth label="Program / Course" name="program_course" value={formData.program_course} onChange={handleInputChange} sx={{ ...inputStyle, gridColumn: span(3) }} placeholder="e.g., BS Computer Science" />
              </FormSection>

              <Divider />

              {/* PUBLICATION DETAILS: Year is required, Month and Day are optional.
                  Day unlocks only after a Month is picked, and only shows the
                  days that month really has. */}
              <FormSection title="Publication details" hint="Year is required. Add the month and day if you know them.">
                <TextField 
                  required
                  fullWidth 
                  label="Publication Year (YYYY)" 
                  name="published_date" 
                  value={formData.published_date} 
                  onChange={handleInputChange} 
                  sx={{ ...inputStyle, gridColumn: span(2) }}
                  inputProps={{ maxLength: 4 }}
                />
                <TextField 
                  select 
                  fullWidth 
                  label="Month (optional)" 
                  name="published_month" 
                  value={formData.published_month} 
                  onChange={handleInputChange} 
                  disabled={formData.published_date.length !== 4}
                  sx={{ ...inputStyle, gridColumn: span(2) }}
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
                  value={formData.published_day} 
                  onChange={handleInputChange} 
                  disabled={!formData.published_month}
                  sx={{ ...inputStyle, gridColumn: span(2) }}
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {formData.published_month && Array.from(
                    { length: getDaysInMonth(formData.published_date, formData.published_month) },
                    (_, i) => (<MenuItem key={i + 1} value={i + 1}>{i + 1}</MenuItem>)
                  )}
                </TextField>

                <TextField fullWidth label="Publisher" name="publisher" value={formData.publisher} onChange={handleInputChange} sx={{ ...inputStyle, gridColumn: span(3) }} />
                <TextField fullWidth label="Edition" name="edition" value={formData.edition} onChange={handleInputChange} sx={{ ...inputStyle, gridColumn: span(3) }} placeholder="e.g., 2nd Edition" />

                <TextField fullWidth label="ISBN" name="isbn" value={formData.isbn} onChange={handleInputChange} sx={{ ...inputStyle, gridColumn: span(3) }} placeholder="e.g., 978-3-16-148410-0" />
                <TextField fullWidth label="Language" name="language" value={formData.language} onChange={handleInputChange} sx={{ ...inputStyle, gridColumn: span(3) }} />
              </FormSection>

              <Divider />

              {/* DESCRIPTION */}
              <FormSection title="Description">
                <TextField required fullWidth multiline rows={3.5} label="Brief Description" name="description" value={formData.description} onChange={handleInputChange} sx={{ ...inputStyle, gridColumn: span(6) }} />
              </FormSection>

              <Button 
                fullWidth variant="contained" onClick={handlePreUploadCheck} disabled={loading}
                sx={{ 
                  py: 2, 
                  borderRadius: '12px', 
                  fontWeight: 800, 
                  fontSize: '1rem',
                  bgcolor: isDarkMode ? '#0085eb' : '#213C51', 
                  color: '#ffffff',
                  '&:hover': { bgcolor: isDarkMode ? '#2c5ea0' : '#365d7a' } 
                }}
                startIcon={loading ? <CircularProgress size={22} color="inherit" /> : <FontAwesomeIcon icon={faCloudUploadAlt} />}
              >
                {loading ? 'SUBMITTING...' : 'CONFIRM UPLOAD'}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* RIGHT COLUMN: RECENT ACTIVITIES & TOTALS DASHBOARD */}
        <Grid size={{ xs: 12, lg: 3, xl: 5 }}>
          {/* useFlexGap makes the Stack use real CSS `gap` instead of
              margin-based spacing. Margin-based spacing is computed from
              DOM order, but the two Papers below use `order` to flip their
              visual order — so plain `spacing` put the gap in the wrong
              place and the cards looked glued together. `gap` respects
              visual order, so the space now shows up correctly. */}
          <Stack spacing={2} useFlexGap sx={{ height: '100%' }}>
            
            {/* RECENT ACTIVITIES */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: cardBg, border: `1px solid ${borderCol}`, order: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>Recent Uploaded</Typography>

              <Stack spacing={1.5}>
                {recentUploads.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No recent uploads found.</Typography>
                ) : (
                  recentUploads.map((item) => (
                    <Card 
                      key={item.id} 
                      onClick={() => handleOpenItemInfo(item)}
                      sx={{ 
                        bgcolor: inputBg, 
                        borderRadius: 2, 
                        border: `1px solid ${borderCol}`, 
                        boxShadow: 'none',
                        cursor: 'pointer',
                        transition: '0.2s',
                        '&:hover': { transform: 'translateY(-2px)', borderColor: '#3b82f6' }
                      }}
                    >
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar 
                            variant="rounded" 
                            src={item.image_url ? getImageUrl(item.image_url) : glclogo} 
                            sx={{ width: 50, height: 50, bgcolor: cardBg }}
                          >
                            {!item.image_url && <FontAwesomeIcon icon={faFileAlt} style={{ color: '#3b82f6' }} />}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.author || 'Unknown'} • {new Date(item.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Button size="small" variant="text" sx={{ minWidth: 'auto', p: 0.5 }}>
                            <FontAwesomeIcon icon={faInfoCircle} style={{ color: '#3b82f6' }} />
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))
                )}
              </Stack>
            </Paper>

            {/* SYSTEM OVERVIEW (TOTALS) */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: cardBg, border: `1px solid ${borderCol}`, order: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>System Overview</Typography>
              
              <Grid container spacing={1}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box sx={{ p: 2, bgcolor: inputBg, borderRadius: 2, border: `1px solid ${borderCol}` }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, color: '#3b82f6' }}>
                      <FontAwesomeIcon icon={faFilePdf} />
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>PDF'S</Typography>
                    </Stack>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>{stats.totalPdfs}</Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box sx={{ p: 2, bgcolor: inputBg, borderRadius: 2, border: `1px solid ${borderCol}` }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, color: '#a855f7' }}>
                      <FontAwesomeIcon icon={faGraduationCap} />
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>ACADEMIC</Typography>
                    </Stack>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>{stats.academicMaterials}</Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box sx={{ p: 2, bgcolor: inputBg, borderRadius: 2, border: `1px solid ${borderCol}` }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, color: '#eab308' }}>
                      <FontAwesomeIcon icon={faBook} />
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>BOOKS</Typography>
                    </Stack>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>{stats.books}</Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box sx={{ p: 2, bgcolor: inputBg, borderRadius: 2, border: `1px solid ${borderCol}` }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, color: '#22c55e' }}>
                      <FontAwesomeIcon icon={faDownload} />
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>DOWNLOADS</Typography>
                    </Stack>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>{stats.totalDownloads}</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

          </Stack>
        </Grid>

      </Grid>

      {/* MODAL: PRE-UPLOAD INFORMATION REVIEW CONFIRMATION */}
      <Dialog 
        open={reviewOpen} 
        onClose={() => setReviewOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, bgcolor: cardBg, maxWidth: '500px', width: '100%' } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Review Document Info</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Please confirm if the details below are correct before submitting:
          </Typography>
          <Box sx={{ p: 2.5, bgcolor: inputBg, borderRadius: 2, border: `1px solid ${borderCol}` }}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar 
                  variant="rounded" 
                  src={selectedImage ? URL.createObjectURL(selectedImage) : glclogo} 
                  sx={{ width: 60, height: 60, borderRadius: 2 }}
                >
                  {!selectedImage && <FontAwesomeIcon icon={faImage} style={{ fontSize: '24px' }} />}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>COVER IMAGE</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#a855f7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedImage ? `${selectedImage.name} (${formatFileSize(selectedImage.size)})` : 'No cover image selected (Using default)'}
                  </Typography>
                </Box>
              </Stack>
              <Divider />
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>SELECTED PDF</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                  {selectedFile?.name} {selectedFile ? `(${formatFileSize(selectedFile.size)})` : ''}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>DOCUMENT TITLE</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{formData.title}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>AUTHOR / PUBLISHER</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{formData.author}</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>GENRE / FIELD</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{formData.genre}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>CATEGORY</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>{formData.category}</Typography>
                </Grid>
              </Grid>

              {/* NEW: Section, Program, Publisher, ISBN, Edition, Language —
                  each only renders when actually filled in. */}
              {(formData.section || formData.program_course) && (
                <Grid container spacing={2}>
                  {formData.section && (
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>SECTION</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{formData.section}</Typography>
                    </Grid>
                  )}
                  {formData.program_course && (
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>PROGRAM / COURSE</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{formData.program_course}</Typography>
                    </Grid>
                  )}
                </Grid>
              )}
              {(formData.publisher || formData.edition) && (
                <Grid container spacing={2}>
                  {formData.publisher && (
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>PUBLISHER</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{formData.publisher}</Typography>
                    </Grid>
                  )}
                  {formData.edition && (
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>EDITION</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{formData.edition}</Typography>
                    </Grid>
                  )}
                </Grid>
              )}
              {(formData.isbn || formData.language) && (
                <Grid container spacing={2}>
                  {formData.isbn && (
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>ISBN</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{formData.isbn}</Typography>
                    </Grid>
                  )}
                  {formData.language && (
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>LANGUAGE</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{formData.language}</Typography>
                    </Grid>
                  )}
                </Grid>
              )}

              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>PUBLICATION DATE</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatPublishedDate(formData)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>DESCRIPTION</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.4, maxHeight: '60px', overflowY: 'auto' }}>{formData.description}</Typography>
              </Box>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button fullWidth onClick={() => setReviewOpen(false)} color="inherit" variant="outlined" sx={{ borderRadius: 2, fontWeight: 800 }}>Edit Details</Button>
          <Button fullWidth onClick={handleUpload} variant="contained" color="primary" sx={{ borderRadius: 2, fontWeight: 800 }}>Confirm & Upload</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: SEE RECENT ITEM DETAILS */}
      <Dialog 
        open={Boolean(selectedItemInfo)} 
        onClose={() => setSelectedItemInfo(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { bgcolor: cardBg, borderRadius: 3, p: 1 } }}
      >
        {selectedItemInfo && (
          <>
            <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon color="primary" /> Document Info
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: borderCol }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, alignItems: { xs: 'center', md: 'flex-start' } }}>
                <Avatar
                  variant="rounded"
                  src={selectedItemInfo.image_url ? getImageUrl(selectedItemInfo.image_url) : glclogo}
                  sx={{
                    width: { xs: 160, md: 210 },
                    height: { xs: 200, md: 200 },
                    boxShadow: 3,
                    border: `1px solid ${borderCol}`,
                    bgcolor: 'transparent',
                    objectFit: 'cover'
                  }}
                >
                  {!selectedItemInfo.image_url && <FontAwesomeIcon icon={faFilePdf} style={{ fontSize: '60px', color: '#ef4444' }} />}
                </Avatar>

                <Box sx={{ flexGrow: 1, width: '100%' }}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <TitleIcon color="primary" fontSize="small" />
                      <Typography variant="body2"><strong>Title:</strong> {selectedItemInfo.title || 'N/A'}</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <PersonIcon color="primary" fontSize="small" />
                      <Typography variant="body2"><strong>Author:</strong> {selectedItemInfo.author || 'N/A'}</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <MenuBookIcon color="primary" fontSize="small" />
                      <Typography variant="body2"><strong>Type:</strong> {selectedItemInfo.category || 'book'}</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <CategoryIcon color="primary" fontSize="small" />
                      <Typography variant="body2"><strong>Genre:</strong> {selectedItemInfo.genre || 'N/A'}</Typography>
                    </Stack>

                    {/* NEW: digital-library metadata — only shown when present */}
                    {selectedItemInfo.section && (
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <BookmarkIcon color="primary" fontSize="small" />
                        <Typography variant="body2"><strong>Section:</strong> {selectedItemInfo.section}</Typography>
                      </Stack>
                    )}
                    {selectedItemInfo.program_course && (
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <SchoolIcon color="primary" fontSize="small" />
                        <Typography variant="body2"><strong>Program:</strong> {selectedItemInfo.program_course}</Typography>
                      </Stack>
                    )}

                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <EventIcon color="primary" fontSize="small" />
                      <Typography variant="body2"><strong>Published:</strong> {formatPublishedDate(selectedItemInfo)}</Typography>
                    </Stack>

                    {selectedItemInfo.publisher && (
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <BusinessIcon color="primary" fontSize="small" />
                        <Typography variant="body2"><strong>Publisher:</strong> {selectedItemInfo.publisher}</Typography>
                      </Stack>
                    )}
                    {selectedItemInfo.isbn && (
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <ConfirmationNumberIcon color="primary" fontSize="small" />
                        <Typography variant="body2"><strong>ISBN:</strong> {selectedItemInfo.isbn}</Typography>
                      </Stack>
                    )}
                    {selectedItemInfo.edition && (
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <LayersIcon color="primary" fontSize="small" />
                        <Typography variant="body2"><strong>Edition:</strong> {selectedItemInfo.edition}</Typography>
                      </Stack>
                    )}
                    {selectedItemInfo.language && (
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <LanguageIcon color="primary" fontSize="small" />
                        <Typography variant="body2"><strong>Language:</strong> {selectedItemInfo.language}</Typography>
                      </Stack>
                    )}

                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <StorageIcon color="primary" fontSize="small" />
                      <Typography variant="body2"><strong>Size:</strong> {selectedItemFileSize}</Typography>
                    </Stack>
                  </Stack>

                  <Divider sx={{ my: 2, opacity: 0.2 }} />

                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Description</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, maxHeight: '180px', overflowY: 'auto' }}>
                    {selectedItemInfo.description || 'No description available for this document.'}
                  </Typography>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
              <Button
                variant="contained"
                startIcon={<VisibilityIcon />}
                onClick={() => handleViewPdf(selectedItemInfo)}
                sx={{color: isDarkMode ? '#ffffff' : '#ffffff', bgcolor: '#1e1b4b', '&:hover': { bgcolor: '#312e81' }, textTransform: 'none', fontWeight: 700 }}
              >
                Read PDF
              </Button>
              <Button onClick={() => setSelectedItemInfo(null)} sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* SUCCESS/ERROR SNACKBAR */}
      <Snackbar open={status.open} autoHideDuration={4000} onClose={() => setStatus({ ...status, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={status.type} variant="filled" sx={{ borderRadius: '10px', fontWeight: 700 }}>
          {status.message}
        </Alert>
      </Snackbar>

      {/* DUPLICATE DIALOG WITH FULL EXISTING RECORD DETAILS */}
      <Dialog 
        open={confirmData.open} 
        onClose={() => setConfirmData({ open: false, record: null })} 
        PaperProps={{ sx: { borderRadius: 3, bgcolor: cardBg, maxWidth: '500px', width: '100%' } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Duplicate Found</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            A document with the same title, author, edition and ISBN is already registered in the system. Review its details below:
          </Typography>
          {confirmData.record && (
            <Box sx={{ p: 2.5, bgcolor: inputBg, borderRadius: 2, border: `1px solid ${borderCol}` }}>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Avatar 
                  variant="rounded" 
                  src={confirmData.record.image_url ? getImageUrl(confirmData.record.image_url) : glclogo} 
                  sx={{ width: 70, height: 95, borderRadius: 2 }}
                >
                  {!confirmData.record.image_url && <FontAwesomeIcon icon={faFilePdf} style={{ fontSize: '26px' }} />}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.2 }}>{confirmData.record.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, mt: 0.5 }}>{confirmData.record.author || 'Unknown'}</Typography>
                  <Typography variant="caption" sx={{ display: 'inline-block', mt: 1, px: 1, py: 0.3, bgcolor: '#3b82f6', color: '#fff', borderRadius: 1, fontWeight: 800, textTransform: 'uppercase' }}>
                    {confirmData.record.category}
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              <Stack spacing={1}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>GENRE / FIELD</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{confirmData.record.genre || 'N/A'}</Typography>

                {confirmData.record.section && (
                  <>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', mt: 1 }}>SECTION</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{confirmData.record.section}</Typography>
                  </>
                )}
                {confirmData.record.program_course && (
                  <>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', mt: 1 }}>PROGRAM / COURSE</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{confirmData.record.program_course}</Typography>
                  </>
                )}
                {confirmData.record.publisher && (
                  <>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', mt: 1 }}>PUBLISHER</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{confirmData.record.publisher}</Typography>
                  </>
                )}
                {confirmData.record.isbn && (
                  <>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', mt: 1 }}>ISBN</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{confirmData.record.isbn}</Typography>
                  </>
                )}
                {confirmData.record.edition && (
                  <>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', mt: 1 }}>EDITION</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{confirmData.record.edition}</Typography>
                  </>
                )}
                {confirmData.record.language && (
                  <>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', mt: 1 }}>LANGUAGE</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{confirmData.record.language}</Typography>
                  </>
                )}

                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', mt: 1 }}>PUBLICATION DATE</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatPublishedDate(confirmData.record)}</Typography>

                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', mt: 1 }}>DESCRIPTION</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.5, maxHeight: '80px', overflowY: 'auto' }}>
                  {confirmData.record.description || 'No description available for this document.'}
                </Typography>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, flexDirection: 'column', gap: 1 }}>
          <Button fullWidth onClick={handleReplace} variant="contained" color="warning" sx={{ borderRadius: 2, fontWeight: 800 }}>Replace Existing</Button>
          <Button fullWidth onClick={handleAddAnyway} variant="outlined" sx={{ borderRadius: 2, fontWeight: 800 }}>Keep Both</Button>
          <Button fullWidth onClick={() => setConfirmData({ open: false, record: null })} color="inherit">Cancel</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default PdfUploads;