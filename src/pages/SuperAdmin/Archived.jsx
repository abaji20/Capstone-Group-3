import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Typography, CircularProgress, Stack, IconButton, Avatar,
  useTheme, useMediaQuery, Card, CardContent, Button, TextField, 
  MenuItem, InputAdornment, Modal, Fade, Backdrop, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider
} from '@mui/material';
import { supabase } from '../../supabaseClient';
import glclogo from '../../assets/glclogo.png';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PdfIcon from '@mui/icons-material/PictureAsPdf';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InfoIcon from '@mui/icons-material/Info';
import TitleIcon from '@mui/icons-material/Title';
import PersonIcon from '@mui/icons-material/Person';
import CategoryIcon from '@mui/icons-material/Category';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import StorageIcon from '@mui/icons-material/Storage';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import EventIcon from '@mui/icons-material/Event';

const Archived = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); 

  // --- STATE FOR FILTERS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [dayFilter, setDayFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('All Genres');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [archivedFiles, setArchivedFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- MODAL STATES ---
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [selectedPdfInfo, setSelectedPdfInfo] = useState(null);
  const [selectedPdfFileSize, setSelectedPdfFileSize] = useState('Fetching size...');
  const [confirmModal, setConfirmModal] = useState({ open: false, type: '', file: null });

  // Dynamic Theme Colors
  const pageBg = isDarkMode ? '#0f172a' : '#ffffff';
  const cardBg = isDarkMode ? '#1e293b' : 'rgba(255, 255, 255, 0.9)';
  const inputBg = isDarkMode ? '#28334e' : '#ffffff'; 
  const borderCol = isDarkMode ? 'rgba(218, 6, 6, 0.05)' : '#e2e8f0';
  const headerColor = isDarkMode ? '#1e1e2d' : '#213C51';
  
  useEffect(() => { fetchArchived(); }, []);

  const fetchArchived = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pdfs')
      .select('*')
      .eq('is_archived', true); 

    if (error) console.error("Error fetching archives:", error);
    else setArchivedFiles(data || []);
    setLoading(false);
  };

  const handleViewPdf = (file) => {
    const filePath = file?.file_url || file?.pdf_url;
    if (!filePath) return;
    const { data } = supabase.storage.from('pdfs').getPublicUrl(filePath);
    if (data?.publicUrl) {
      window.open(data.publicUrl, '_blank');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, unitIndex)).toFixed(2))} ${units[unitIndex]}`;
  };

  const handleOpenInfo = async (file) => {
    setSelectedPdfInfo(file);
    setInfoModalOpen(true);
    setSelectedPdfFileSize(file?.file_size || 'Fetching size...');

    if (!file?.file_url || file.file_size) return;

    try {
      const { data } = supabase.storage.from('pdfs').getPublicUrl(file.file_url);
      const response = await fetch(data.publicUrl, { method: 'HEAD' });
      const size = response.headers.get('content-length');
      setSelectedPdfFileSize(size ? formatFileSize(parseInt(size, 10)) : 'Unknown size');
    } catch (error) {
      console.error('Error fetching file size:', error);
      setSelectedPdfFileSize('Unknown size');
    }
  };

  const handleRestoreAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('pdfs')
      .update({ is_archived: false })
      .eq('is_archived', true);
    
    if (error) {
      alert("Error restoring all: " + error.message);
    } else {
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action_type: 'RESTORE ALL',
          description: `Restored all ${archivedFiles.length} archived files`
        });
      }
      fetchArchived();
    }
    handleCloseConfirm();
  };

  const handlePurgeAll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ids = archivedFiles.map(f => f.id);
      const filePaths = archivedFiles.map(f => f.file_url).filter(Boolean);
      const count = archivedFiles.length;

      if (ids.length > 0) {
        await supabase.from('audit_logs').delete().in('pdf_id', ids.map(String));
        await supabase.from('delete_requests').delete().in('pdf_id', ids);
        
        if (filePaths.length > 0) {
          await supabase.storage.from('pdfs').remove(filePaths);
        }

        const { error } = await supabase.from('pdfs').delete().in('id', ids);
        if (error) throw error;

        if (user) {
          await supabase.from('audit_logs').insert({
            user_id: user.id,
            action_type: 'PERMANENTLY DELETED ALL',
            description: `Permanently deleted all ${count} archived files from the system`
          });
        }
      }
      fetchArchived();
    } catch (error) {
      console.error("Purge All error:", error.message);
      alert("Failed to delete all.");
    }
    handleCloseConfirm();
  };

  const filteredFiles = archivedFiles.filter(file => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      file.title?.toLowerCase().includes(searchLower) ||
      file.author?.toLowerCase().includes(searchLower) ||
      file.genre?.toLowerCase().includes(searchLower);

    const archiveDate = file.created_at ? new Date(file.created_at) : null;
    const matchesMonth = !monthFilter || archiveDate?.getMonth() + 1 === Number(monthFilter);
    const matchesDay = !dayFilter || archiveDate?.getDate() === Number(dayFilter);
    const matchesYear = !yearFilter || archiveDate?.getFullYear() === Number(yearFilter);
    const matchesDate = matchesMonth && matchesDay && matchesYear;
    const matchesGenre = genreFilter === 'All Genres' || file.genre === genreFilter;
    const matchesCategory = categoryFilter === 'All Categories' || file.category === categoryFilter;
    return matchesSearch && matchesDate && matchesGenre && matchesCategory;
  });

  const uniqueGenres = ['All Genres', ...new Set(archivedFiles.map(f => f.genre).filter(Boolean))];
  const categories = ['All Categories', ...new Set(archivedFiles.map(file => file.category).filter(Boolean))];
  const monthOptions = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];
  const dayOptions = Array.from({ length: 31 }, (_, index) => index + 1);
  const archiveYears = [...new Set(archivedFiles
    .filter(file => file.created_at)
    .map(file => new Date(file.created_at).getFullYear()))].sort((a, b) => b - a);

  const handleOpenConfirm = (type, file = null, e) => {
    if (e) e.stopPropagation();
    setConfirmModal({ open: true, type, file });
  };

  const handleCloseConfirm = () => {
    setConfirmModal({ open: false, type: '', file: null });
  };

  const handleRestore = async (id) => {
    const { data: { user } } = await supabase.auth.getUser();
    const fileToRestore = archivedFiles.find(f => f.id === id);

    const { error } = await supabase.from('pdfs').update({ is_archived: false }).eq('id', id);
    if (error) {
      alert("Error restoring file: " + error.message);
    } else {
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action_type: 'RESTORED FILE',
          pdf_id: id,
          description: `Restored file: ${fileToRestore?.title || 'Unknown Title'}`
        });
      }
      fetchArchived();
    }
    handleCloseConfirm();
  };

  const handlePurge = async (file) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('audit_logs').delete().eq('pdf_id', String(file.id));
      await supabase.from('delete_requests').delete().eq('pdf_id', file.id);
      
      if (file.file_url) {
        await supabase.storage.from('pdfs').remove([file.file_url]);
      }
      
      const { error: dbError } = await supabase.from('pdfs').delete().eq('id', file.id);
      if (dbError) throw dbError;

      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action_type: 'PERMANENTLY DELETED',
          description: `Permanently deleted file: ${file.title}`
        });
      }
      fetchArchived();
    } catch (error) {
      console.error("Purge error:", error.message);
      alert("Failed to delete.");
    }
    handleCloseConfirm();
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('pdfs').getPublicUrl(path);
    return data.publicUrl;
  };

  // --- MOBILE CARD COMPONENT ---
  const ArchivedMobileCard = ({ file }) => (
    <Card 
      onClick={() => handleOpenInfo(file)}
      sx={{ mb: 2, bgcolor: cardBg, border: `1px solid ${borderCol}`, borderRadius: 2, cursor: 'pointer', boxShadow: 'none' }}
    >
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Avatar 
            variant="rounded" 
            src={file.image_url ? getImageUrl(file.image_url) : glclogo} 
            sx={{ width: 60, height: 80, border: `1px solid ${borderCol}`, bgcolor: 'transparent' }}
          >
            {!file.image_url && <PdfIcon sx={{ color: 'red', fontSize: '2rem' }} />}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{file.title}</Typography>
            <Typography variant="body2" color="text.secondary">By: {file.author || 'Unknown'} • {file.genre || 'N/A'}</Typography>
            
            <Typography sx={{ mt: 1, fontWeight: 900, color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
              {file.category?.toUpperCase() || 'N/A'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Archived: {file.created_at ? new Date(file.created_at).toLocaleDateString() : 'N/A'}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="column" spacing={1} sx={{ mt: 2 }} onClick={(e) => e.stopPropagation()}>
          <Button 
            variant="outlined" 
            startIcon={<VisibilityIcon />} 
            onClick={() => handleViewPdf(file)}
            sx={{ color: '#0ea5e9', borderColor: '#0ea5e9', textTransform: 'none', fontWeight: 700 }}
          >
            View PDF
          </Button>
          <Stack direction="row" spacing={1}>
            <Button 
              fullWidth
              variant="contained" 
              color="info"
              startIcon={<RestoreFromTrashIcon />} 
              onClick={(e) => handleOpenConfirm('restore', file, e)}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Restore
            </Button>
            <Button 
              fullWidth
              variant="outlined" 
              color="error"
              startIcon={<DeleteForeverIcon />} 
              onClick={(e) => handleOpenConfirm('purge', file, e)}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Purge
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: pageBg, minHeight: '100vh', width: '100%', boxSizing: 'border-box' }}>
      
      {/* HEADER WITH BULK ACTIONS */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 4 }} spacing={2}>
        <Box>
          <Typography 
            variant="h3" 
            sx={{ 
              fontStyle: 'italic', fontWeight: 900, 
              color: isDarkMode ? '#ffffff' : '#213C51', 
              fontFamily: "'Montserrat', sans-serif",
              fontSize: { xs: '1.75rem', sm: '2.2rem', md: '3rem' },
              letterSpacing: '1px'
            }}
          >
            ARCHIVED PDFs
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, display: 'block' }}>
            RESTORE OR PERMANENTLY DELETE ARCHIVED FILES.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <Button 
            variant="contained" 
            color="info" 
            startIcon={<RestoreFromTrashIcon />} 
            onClick={(e) => handleOpenConfirm('restoreAll', null, e)}
            disabled={archivedFiles.length === 0}
            sx={{ fontWeight: 800, borderRadius: 1, flex: 1, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '1rem' }, whiteSpace: 'nowrap', px: { xs: 1, sm: 2 } }}
          >
            Restore All
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            startIcon={<DeleteForeverIcon />} 
            onClick={(e) => handleOpenConfirm('purgeAll', null, e)}
            disabled={archivedFiles.length === 0}
            sx={{ fontWeight: 800, borderRadius: 1, flex: 1, fontSize: { xs: '0.7rem', sm: '0.8rem', md: '1rem' }, whiteSpace: 'nowrap', px: { xs: 1, sm: 2 } }}
          >
            Purge All
          </Button>
        </Stack>
      </Stack>

      {/* STANDARDIZED FILTER BAR */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4 }}>
        <TextField 
          fullWidth 
          placeholder="Search by title, author, or genre..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          sx={{ bgcolor: inputBg, borderRadius: 0.5 }}
          InputProps={{ 
            startAdornment: <InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment> 
          }} 
        />
        <TextField select label="Month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} sx={{ minWidth: 145, bgcolor: inputBg, borderRadius: 0.5 }}>
          <MenuItem value="">All Months</MenuItem>
          {monthOptions.map((month) => <MenuItem key={month.value} value={month.value}>{month.label}</MenuItem>)}
        </TextField>
        <TextField select label="Date" value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} sx={{ minWidth: 125, bgcolor: inputBg, borderRadius: 0.5 }}>
          <MenuItem value="">All Dates</MenuItem>
          {dayOptions.map((day) => <MenuItem key={day} value={day}>{day}</MenuItem>)}
        </TextField>
        <TextField select label="Year" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} sx={{ minWidth: 125, bgcolor: inputBg, borderRadius: 0.5 }}>
          <MenuItem value="">All Years</MenuItem>
          {archiveYears.map((year) => <MenuItem key={year} value={year}>{year}</MenuItem>)}
        </TextField>
        <TextField 
          select 
          label="Genre" 
          value={genreFilter} 
          onChange={(e) => setGenreFilter(e.target.value)}
          sx={{ minWidth: { md: 200 }, bgcolor: inputBg, borderRadius: 0.5 }}
        >
          {uniqueGenres.map((genre) => (
            <MenuItem key={genre} value={genre}>{genre}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          sx={{ minWidth: 200, bgcolor: inputBg, borderRadius: 0.5 }}
        >
          {categories.map((category) => (
            <MenuItem key={category} value={category}>
              {category === 'academic paper' ? 'Academic Materials' : category === 'book' ? 'Book' : category}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress color="secondary" /></Box>
      ) : filteredFiles.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 10 }}>
          <HourglassEmptyIcon sx={{ fontSize: 50, color: 'text.disabled', opacity: 0.4, mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 800 }}>NO ARCHIVED FILES FOUND</Typography>
        </Box>
      ) : (
        <>
          {!isMobile ? (
            <TableContainer component={Paper} sx={{ borderRadius: 1, bgcolor: cardBg, border: `1px solid ${borderCol}`, boxShadow: 'none' }}>
              <Table>
                <TableHead sx={{ bgcolor: headerColor }}>
                  <TableRow>
                    <TableCell sx={{ color: 'white', fontWeight: 800 }}>DOCUMENT</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 800 }}>GENRE</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 800 }}>CATEGORY</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 800 }}>DATE ARCHIVED</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 800 }} align="center">ACTIONS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredFiles.map((file) => (
                    <TableRow 
                      key={file.id}
                      hover 
                      onClick={() => handleOpenInfo(file)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Avatar 
                            variant="rounded" 
                            src={file.image_url ? getImageUrl(file.image_url) : glclogo} 
                            sx={{ width: 45, height: 50, border: `1px solid ${borderCol}`, bgcolor: 'transparent' }}
                          >
                            {!file.image_url && <PdfIcon sx={{ color: 'red' }} />}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>{file.title}</Typography>
                            <Typography variant="caption" color="text.secondary">By: {file.author || 'Unknown'}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell><Typography variant="body2">{file.genre || 'N/A'}</Typography></TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 800, color: isDarkMode ? '#cbd5e1' : '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {file.category || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {file.created_at ? new Date(file.created_at).toLocaleDateString() : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Stack direction="row" justifyContent="center" spacing={1}>
                          <Tooltip title="View PDF">
                            <IconButton onClick={() => handleViewPdf(file)} sx={{ color: '#0ea5e9' }}>
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Restore">
                            <IconButton onClick={(e) => handleOpenConfirm('restore', file, e)} color="info"><RestoreFromTrashIcon /></IconButton>
                          </Tooltip>
                          <Tooltip title="Purge">
                            <IconButton onClick={(e) => handleOpenConfirm('purge', file, e)} color="error"><DeleteForeverIcon /></IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box>{filteredFiles.map((file) => <ArchivedMobileCard key={file.id} file={file} />)}</Box>
          )}
        </>
      )}

      {/* --- DOCUMENT INFO MODAL --- */}
      <Dialog 
        open={infoModalOpen} 
        onClose={() => setInfoModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { bgcolor: cardBg, borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon color="primary" /> Document Info
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: borderCol }}>
          {selectedPdfInfo && (
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, alignItems: { xs: 'center', md: 'flex-start' } }}>
              
              <Avatar
                variant="rounded"
                src={selectedPdfInfo.image_url ? getImageUrl(selectedPdfInfo.image_url) : glclogo}
                sx={{ 
                  width: { xs: 160, md: 210 }, 
                  height: { xs: 200, md: 200 }, 
                  boxShadow: 3,
                  border: `1px solid ${borderCol}`,
                  bgcolor: 'transparent',
                  objectFit: 'cover'
                }}
              >
                {!selectedPdfInfo.image_url && <PdfIcon sx={{ fontSize: 60, color: '#ef4444' }} />}
              </Avatar>

              <Box sx={{ flexGrow: 1, width: '100%' }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <TitleIcon color="primary" fontSize="small" />
                    <Typography variant="body2"><strong>Title:</strong> {selectedPdfInfo.title || 'N/A'}</Typography>
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <PersonIcon color="primary" fontSize="small" />
                    <Typography variant="body2"><strong>Author:</strong> {selectedPdfInfo.author || 'N/A'}</Typography>
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <MenuBookIcon color="primary" fontSize="small" />
                    <Typography variant="body2"><strong>Type:</strong> {selectedPdfInfo.category || selectedPdfInfo.type || 'book'}</Typography>
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <CategoryIcon color="primary" fontSize="small" />
                    <Typography variant="body2"><strong>Genre:</strong> {selectedPdfInfo.genre || 'N/A'}</Typography>
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <EventIcon color="primary" fontSize="small" />
                    <Typography variant="body2">
                      <strong>Published:</strong> {selectedPdfInfo.published_date || selectedPdfInfo.published_year || selectedPdfInfo.year || 'N/A'}
                    </Typography>
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <StorageIcon color="primary" fontSize="small" />
                    <Typography variant="body2"><strong>Size:</strong> {selectedPdfFileSize}</Typography>
                  </Stack>
                </Stack>

                <Divider sx={{ my: 2, opacity: 0.2 }} />

                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Description</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  {selectedPdfInfo.description || "No description provided for this document."}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button 
            variant="contained" 
            startIcon={<VisibilityIcon />}
            onClick={() => handleViewPdf(selectedPdfInfo)}
            sx={{ color: '#ffffff', bgcolor: '#1e1b4b', '&:hover': { bgcolor: '#312e81' }, textTransform: 'none', fontWeight: 700 }}
          >
            Read PDF
          </Button>
          <Button onClick={() => setInfoModalOpen(false)} sx={{ fontWeight: 700, color: 'text.secondary' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- REUSABLE CONFIRMATION MODAL --- */}
      <Modal
        open={confirmModal.open}
        onClose={handleCloseConfirm}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{ timeout: 500 }}
      >
        <Fade in={confirmModal.open}>
          <Box sx={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: 400 }, bgcolor: cardBg, border: `1px solid ${borderCol}`,
            borderRadius: 3, p: 4, textAlign: 'center', boxShadow: 24, outline: 'none'
          }}>
            <WarningAmberIcon sx={{ fontSize: 60, color: (confirmModal.type === 'purge' || confirmModal.type === 'purgeAll') ? '#ef4444' : '#0ea5e9', mb: 2 }} />
            
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: isDarkMode ? '#fff' : '#213C51' }}>
              {(confirmModal.type === 'purge' || confirmModal.type === 'purgeAll') ? 'Permanent Delete?' : 'Restore File?'}
            </Typography>
            
            <Typography variant="body2" sx={{ opacity: 0.7, mb: 4, color: isDarkMode ? '#fff' : '#213C51' }}>
              {confirmModal.type === 'purge' && `Are you sure you want to permanently delete "${confirmModal.file?.title}"? This cannot be undone.`}
              {confirmModal.type === 'restore' && `Do you want to restore "${confirmModal.file?.title}"?`}
              {confirmModal.type === 'restoreAll' && `Are you sure you want to restore ALL archived documents?`}
              {confirmModal.type === 'purgeAll' && `WARNING: You are about to permanently delete ALL archived documents. This cannot be undone!`}
            </Typography>

            <Stack direction="row" spacing={2}>
              <Button fullWidth onClick={handleCloseConfirm} sx={{ color: 'text.secondary', fontWeight: 700 }}>
                Cancel
              </Button>
              <Button 
                fullWidth 
                variant="contained" 
                color={(confirmModal.type === 'purge' || confirmModal.type === 'purgeAll') ? 'error' : 'info'}
                onClick={() => {
                  if (confirmModal.type === 'purge') handlePurge(confirmModal.file);
                  else if (confirmModal.type === 'restore') handleRestore(confirmModal.file.id);
                  else if (confirmModal.type === 'restoreAll') handleRestoreAll();
                  else if (confirmModal.type === 'purgeAll') handlePurgeAll();
                }}
                sx={{ fontWeight: 700 }}
              >
                Confirm
              </Button>
            </Stack>
          </Box>
        </Fade>
      </Modal>
    </Box>
  );
};

export default Archived;