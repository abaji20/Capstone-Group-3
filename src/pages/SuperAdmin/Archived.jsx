import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Typography, CircularProgress, Stack, IconButton, Avatar,
  useTheme, useMediaQuery, Card, CardContent, Button, Divider, TextField, 
  MenuItem, InputAdornment, Modal, Fade, Backdrop, Container
} from '@mui/material';
import { supabase } from '../../supabaseClient';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PdfIcon from '@mui/icons-material/PictureAsPdf';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

const Archived = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); 

  // --- STATE FOR FILTERS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(''); 
  const [genreFilter, setGenreFilter] = useState('All Genres');
  const [archivedFiles, setArchivedFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- NEW STATE FOR CONFIRMATION ---
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

  // --- UPDATED FILTER LOGIC (Title, Author, Genre) ---
  const filteredFiles = archivedFiles.filter(file => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      file.title?.toLowerCase().includes(searchLower) ||
      file.author?.toLowerCase().includes(searchLower) ||
      file.genre?.toLowerCase().includes(searchLower);

    const matchesDate = !dateFilter || file.created_at?.includes(dateFilter);
    const matchesGenre = genreFilter === 'All Genres' || file.genre === genreFilter;
    return matchesSearch && matchesDate && matchesGenre;
  });

  const uniqueGenres = ['All Genres', ...new Set(archivedFiles.map(f => f.genre).filter(Boolean))];

  // --- MODAL HANDLERS ---
  const handleOpenConfirm = (type, file) => {
    setConfirmModal({ open: true, type, file });
  };

  const handleCloseConfirm = () => {
    setConfirmModal({ open: false, type: '', file: null });
  };

  // --- ORIGINAL FUNCTIONS (UNCHANGED) ---
  const handleRestore = async (id) => {
    const { error } = await supabase.from('pdfs').update({ is_archived: false }).eq('id', id);
    if (error) alert("Error restoring file: " + error.message);
    else fetchArchived();
    handleCloseConfirm();
  };

  const handlePurge = async (file) => {
    try {
      await supabase.from('audit_logs').delete().eq('pdf_id', String(file.id));
      await supabase.from('delete_requests').delete().eq('pdf_id', file.id);
      if (file.file_url) {
        await supabase.storage.from('pdfs').remove([file.file_url]);
      }
      const { error: dbError } = await supabase.from('pdfs').delete().eq('id', file.id);
      if (dbError) throw dbError;
      fetchArchived();
    } catch (error) {
      console.error("Purge error:", error.message);
      alert("Failed to delete.");
    }
    handleCloseConfirm();
  };

  const getImageUrl = (path) => path ? `https://yktwxeyxmzfkxqhlesly.supabase.co/storage/v1/object/public/pdfs/${path}` : null;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: pageBg, minHeight: '100vh' }}>
      <Container maxWidth="xl">
        
        {/* HEADER */}
        <Box sx={{ mb: 4 }}>
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
           <TextField
          type="date"
          label="Date"
          size="medium"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          sx={{ 
            minWidth: 180, 
            bgcolor: inputBg, 
            borderRadius: 0.5,
            '& input::-webkit-calendar-picker-indicator': { filter: isDarkMode ? 'invert(1)' : 'none' },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <CalendarTodayIcon fontSize="small" sx={{ color: isDarkMode ? '#ffffff' : 'primary.main' }} />
              </InputAdornment>
            )
          }}
        />
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
              /* --- DESKTOP TABLE VIEW --- */
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
                      <TableRow key={file.id} hover>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar variant="rounded" src={getImageUrl(file.image_url)} sx={{ width: 45, height: 55, border: `1px solid ${borderCol}`, bgcolor: 'transparent' }}>
                              <PdfIcon sx={{ color: 'red' }} />
                            </Avatar>
                            <Box>
                              <Typography sx={{ fontWeight: 700 }}>{file.title}</Typography>
                              <Typography variant="caption" color="text.secondary">By: {file.author || 'Unknown'}</Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell><Typography variant="body2">{file.genre || 'N/A'}</Typography></TableCell>
                        <TableCell>
                          <Typography 
                            sx={{ 
                              fontWeight: 800, 
                              color: isDarkMode ? '#cbd5e1' : '#475569', 
                              fontSize: '0.75rem', 
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}
                          >
                            {file.category || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {file.created_at ? new Date(file.created_at).toLocaleDateString() : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" justifyContent="center" spacing={1}>
                            <IconButton onClick={() => handleOpenConfirm('restore', file)} color="info"><RestoreFromTrashIcon /></IconButton>
                            <IconButton onClick={() => handleOpenConfirm('purge', file)} color="error"><DeleteForeverIcon /></IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              /* --- MOBILE CARD VIEW --- */
              <Stack spacing={2}>
                {filteredFiles.map((file) => (
                  <Card key={file.id} sx={{ bgcolor: cardBg, borderRadius: 2, border: `1px solid ${borderCol}`, boxShadow: 'none' }}>
                    <CardContent sx={{ p: 2 }}>
                      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                        <Avatar variant="rounded" src={getImageUrl(file.image_url)} sx={{ width: 55, height: 75, border: `1px solid ${borderCol}`, bgcolor: 'transparent' }}>
                           <PdfIcon sx={{ color: 'red', fontSize: '1.8rem' }} />
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography sx={{ fontWeight: 800, fontSize: '1rem' }}>{file.title}</Typography>
                          <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>By: {file.author || 'Unknown'}</Typography>
                          <Typography 
                            sx={{ 
                              fontWeight: 800, 
                              color: isDarkMode ? '#94a3b8' : '#64748b', 
                              fontSize: '0.75rem', 
                              textTransform: 'uppercase'
                            }}
                          >
                            {file.category || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            Archived: {file.created_at ? new Date(file.created_at).toLocaleDateString() : 'N/A'}
                          </Typography>
                        </Box>
                      </Stack>
                      <Divider sx={{ mb: 2 }} />
                      <Stack direction="row" spacing={2}>
                        <Button fullWidth variant="contained" color="info" startIcon={<RestoreFromTrashIcon />} onClick={() => handleOpenConfirm('restore', file)}>Restore</Button>
                        <Button fullWidth variant="outlined" color="error" startIcon={<DeleteForeverIcon />} onClick={() => handleOpenConfirm('purge', file)}>Purge</Button>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </>
        )}

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
              <WarningAmberIcon sx={{ fontSize: 60, color: confirmModal.type === 'purge' ? '#ef4444' : '#0ea5e9', mb: 2 }} />
              
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: isDarkMode ? '#fff' : '#213C51' }}>
                {confirmModal.type === 'purge' ? 'Permanent Delete?' : 'Restore File?'}
              </Typography>
              
              <Typography variant="body2" sx={{ opacity: 0.7, mb: 4, color: isDarkMode ? '#fff' : '#213C51' }}>
                {confirmModal.type === 'purge' 
                  ? `Are you sure you want to permanently delete "${confirmModal.file?.title}"? This action cannot be undone.`
                  : `Do you want to restore "${confirmModal.file?.title}" to the active collection?`}
              </Typography>

              <Stack direction="row" spacing={2}>
                <Button fullWidth onClick={handleCloseConfirm} sx={{ color: 'text.secondary', fontWeight: 700 }}>
                  Cancel
                </Button>
                <Button 
                  fullWidth 
                  variant="contained" 
                  color={confirmModal.type === 'purge' ? 'error' : 'info'}
                  onClick={() => confirmModal.type === 'purge' ? handlePurge(confirmModal.file) : handleRestore(confirmModal.file.id)}
                  sx={{ fontWeight: 700 }}
                >
                  Confirm
                </Button>
              </Stack>
            </Box>
          </Fade>
        </Modal>
      </Container>
    </Box>
  );
};

export default Archived;