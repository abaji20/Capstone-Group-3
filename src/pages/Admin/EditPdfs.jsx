import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, IconButton, CircularProgress, Typography, Dialog, 
  DialogTitle, DialogContent, TextField, DialogActions, Button, 
  Chip, Stack, Avatar, useTheme, useMediaQuery, Snackbar, Alert,
  MenuItem, InputAdornment
} from '@mui/material';

// Icons
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';

import { fetchPdfs, submitDeleteRequest } from '../../services/pdfService';
import EditPdfModal from '../../shared/EditPdfModal';
import { supabase } from '../../supabaseClient'; 

// Import your logo asset
import logo from '../../assets/logo.png'; 

const EditPDFs = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // --- EXISTING STATE ---
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [status, setStatus] = useState({ open: false, type: 'success', message: '' });

  // --- NEW FILTER STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");

  // --- STYLING ---
  const pageBg = isDarkMode ? '#0f172a' : '#ffffff';
  const cardBg = isDarkMode ? '#1e293b' : 'rgba(255, 255, 255, 0.9)';
  const inputBg = isDarkMode ? '#28334e' : '#f1f5f9';
  const borderCol = isDarkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0';
  const headerBg = isDarkMode ? '#1e1e2d' : '#213C51'; 

  // Reusable style for filter inputs to match your theme
  const filterInputStyle = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 1,
      bgcolor: inputBg,
      '& fieldset': { border: 'none' },
    },
    '& .MuiInputLabel-root': { fontWeight: 700 }
  };

  useEffect(() => { 
    loadPdfs(); 
  }, []);

  const loadPdfs = async () => {
    try {
      setLoading(true);
      const data = await fetchPdfs();
      setPdfs(data || []);
    } catch (error) {
      console.error("Error loading PDFs:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- DATA LOGIC: GENRE SPLITTING & YEAR EXTRACTION ---

  const genres = useMemo(() => {
    // Splits "Romance, Action" into ["Romance", "Action"]
    const allGenres = pdfs.flatMap(p => 
      p.genre ? p.genre.split(',').map(g => g.trim()) : []
    );
    return ["All", ...new Set(allGenres)].sort();
  }, [pdfs]);

  const years = useMemo(() => {
    // Pulls from published_date int4 column
    const uniqueYears = [...new Set(pdfs.map(p => p.published_date))].filter(Boolean);
    return ["All", ...uniqueYears.sort((a, b) => b - a)];
  }, [pdfs]);

  const filteredPdfs = useMemo(() => {
    return pdfs.filter(pdf => {
      const matchesSearch = 
        pdf.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pdf.author?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesGenre = selectedGenre === "All" || 
        (pdf.genre && pdf.genre.split(',').map(g => g.trim()).includes(selectedGenre));
      
      const matchesYear = selectedYear === "All" || 
        pdf.published_date?.toString() === selectedYear.toString();

      return matchesSearch && matchesGenre && matchesYear;
    });
  }, [pdfs, searchQuery, selectedGenre, selectedYear]);

  // --- EXISTING FUNCTIONS ---

  const getImageUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from('pdfs').getPublicUrl(path);
    return data.publicUrl;
  };

  const showStatus = (type, message) => setStatus({ open: true, type, message });

  const handleDeleteSubmit = async () => {
    if (selectedPdf) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await submitDeleteRequest(selectedPdf.id, deleteReason, user.id);
        showStatus('success', "Delete request submitted.");
        setDeleteOpen(false);
        setDeleteReason("");
        loadPdfs(); 
      } catch (error) {
        showStatus('error', "Failed to submit request.");
      }
    }
  };

  return (
    <Box sx={{ 
      p: { xs: 2, md: 5 }, 
      background: pageBg, 
      minHeight: '100vh', 
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden' 
    }}>
      
      <Box 
        component="img" 
        src={logo} 
        sx={{ 
          position: 'absolute', 
          bottom: -60, 
          right: -60, 
          width: { xs: '300px', md: '500px' }, 
          opacity: isDarkMode ? 0.03 : 0.06, 
          pointerEvents: 'none',
          filter: isDarkMode ? 'invert(1) grayscale(1)' : 'grayscale(1)',
          zIndex: 0
        }} 
      />

      <Box sx={{ mb: 4, position: 'relative', zIndex: 1 }}>
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
          MANAGE PDFS
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, display: 'block' }}>
          MANAGE AND EDIT YOUR ACADEMIC DOCUMENTS.
        </Typography>
      </Box>

      {/* NEW FILTER BAR */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4, position: 'relative', zIndex: 2 }}>
        <TextField 
          fullWidth 
          placeholder="Search by title or author..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          InputProps={{ 
            startAdornment: <InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment> 
          }} 
          sx={filterInputStyle} 
        />
        <Stack direction="row" spacing={2} sx={{ width: { xs: '100%', md: 'auto' } }}>
          <TextField 
            select 
            label="Genre" 
            value={selectedGenre} 
            onChange={(e) => setSelectedGenre(e.target.value)} 
            sx={{ ...filterInputStyle, minWidth: 140, flex: 1 }}
          >
            {genres.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
          </TextField>
          <TextField 
            select 
            label="Year" 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)} 
            sx={{ ...filterInputStyle, minWidth: 100, flex: 1 }}
          >
            {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </TextField>
        </Stack>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress color="secondary" />
        </Box>
      ) : (
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {filteredPdfs.length === 0 ? (
            <Typography align="center" sx={{ py: 10, color: 'text.secondary', fontWeight: 600 }}>
              No matching documents found.
            </Typography>
          ) : !isMobile ? (
            <TableContainer component={Paper} sx={{ borderRadius: 1, bgcolor: cardBg, border: `1px solid ${borderCol}`, boxShadow: 'none' }}>
              <Table>
                <TableHead sx={{ bgcolor: headerBg }}>
                  <TableRow>
                    <TableCell sx={{ color: 'white', fontWeight: 800 }}>DOCUMENT</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 800 }}>AUTHOR</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 800 }} align="center">GENRE</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 800 }} align="center">ACTIONS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPdfs.map((pdf) => (
                    <TableRow key={pdf.id} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Avatar 
                            variant="rounded" 
                            src={getImageUrl(pdf.image_url)} 
                            sx={{ width: 45, height: 55, border: `1px solid ${borderCol}`, bgcolor: 'transparent' }}
                          >
                            {!pdf.image_url && (
                              <Box component="img" src={logo} sx={{ width: '60%', opacity: 0.8 }} />
                            )}
                          </Avatar>
                          <Typography sx={{ fontWeight: 700 }}>{pdf.title}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{pdf.author || 'N/A'}</TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={pdf.genre || 'N/A'} 
                          variant="outlined"
                          sx={{ 
                            color: '#3b82f6', 
                            borderColor: isDarkMode ? '#3b82f6aa' : '#3b82f6',
                            fontWeight: 600, 
                            borderRadius: '16px',
                            minWidth: '110px', 
                            textTransform: 'uppercase'
                          }} 
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" justifyContent="center" spacing={1}>
                          <IconButton onClick={() => { setSelectedPdf(pdf); setEditOpen(true); }} color="info" sx={{ bgcolor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : '#f0f7ff' }}>
                            <EditIcon />
                          </IconButton>
                          <IconButton onClick={() => { setSelectedPdf(pdf); setDeleteOpen(true); }} color="error" sx={{ bgcolor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2' }}>
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Stack spacing={2}>
              {filteredPdfs.map((pdf) => (
                <Paper key={pdf.id} sx={{ p: 3, bgcolor: cardBg, borderRadius: 4, border: `1px solid ${borderCol}`, textAlign: 'center' }}>
                  <Avatar 
                    variant="rounded" 
                    src={getImageUrl(pdf.image_url)} 
                    sx={{ width: 90, height: 120, mx: 'auto', mb: 2, bgcolor: 'transparent', borderRadius: 2 }}
                  >
                    {!pdf.image_url && (
                      <Box component="img" src={logo} sx={{ width: '70%', opacity: 0.8 }} />
                    )}
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>{pdf.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{pdf.author || 'Unknown Author'}</Typography>
                  
                  <Chip 
                    label={pdf.genre || 'N/A'} 
                    variant="outlined"
                    sx={{ color: '#3b82f6', borderColor: '#3b82f6', fontWeight: 700, mb: 3, textTransform: 'uppercase' }} 
                  />
                  
                  <Stack direction="row" spacing={2}>
                    <Button 
                      fullWidth 
                      variant="contained" 
                      color="info" 
                      startIcon={<EditIcon />} 
                      onClick={() => { setSelectedPdf(pdf); setEditOpen(true); }}
                      sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 700 }}
                    >
                      Edit
                    </Button>
                    <Button 
                      fullWidth 
                      variant="outlined" 
                      color="error" 
                      startIcon={<DeleteIcon />} 
                      onClick={() => { setSelectedPdf(pdf); setDeleteOpen(true); }}
                      sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 700 }}
                    >
                      Delete
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {/* MODALS & FEEDBACK */}
      <Snackbar open={status.open} autoHideDuration={4000} onClose={() => setStatus({ ...status, open: false })}>
        <Alert severity={status.type} variant="filled">{status.message}</Alert>
      </Snackbar>

      {selectedPdf && (
        <EditPdfModal open={editOpen} onClose={() => setEditOpen(false)} pdf={selectedPdf} onUpdate={loadPdfs} />
      )}

      <Dialog 
        open={deleteOpen} 
        onClose={() => setDeleteOpen(false)} 
        PaperProps={{ sx: { borderRadius: 3, bgcolor: cardBg, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Request Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Please provide a reason for removing this document.
          </Typography>
          <TextField 
            fullWidth placeholder="Reason for deletion" multiline rows={3} 
            value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} 
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: inputBg, '& fieldset': { border: 'none' } } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDeleteOpen(false)} sx={{ color: 'text.secondary', fontWeight: 600 }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleDeleteSubmit} 
            disabled={!deleteReason.trim()}
            sx={{ bgcolor: '#ff4d4d', '&:hover': { bgcolor: '#ff3333' }, borderRadius: '20px', px: 4, fontWeight: 700 }}
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EditPDFs;