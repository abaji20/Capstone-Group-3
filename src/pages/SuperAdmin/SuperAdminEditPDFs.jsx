import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, IconButton, CircularProgress, Typography, Dialog, 
  DialogTitle, DialogContent, DialogActions, Button, 
  Chip, Stack, Avatar, useTheme, useMediaQuery, Snackbar, Alert,
  MenuItem, InputAdornment, TextField, Tooltip 
} from '@mui/material';

// Icons
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import VisibilityIcon from '@mui/icons-material/Visibility';

import EditPdfModal from '../../shared/EditPdfModal';
import { supabase } from '../../supabaseClient'; 
import logo from '../../assets/nonamelogo.png'; 

const SuperAdminEditPDFs = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // --- STATE ---
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [status, setStatus] = useState({ open: false, type: 'success', message: '' });

  // --- FILTER STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  // --- STYLING ---
  const pageBg = isDarkMode ? '#0f172a' : '#ffffff';
  const cardBg = isDarkMode ? '#1e293b' : 'rgba(255, 255, 255, 0.9)';
  const inputBg = isDarkMode ? '#28334e' : '#ffffff';
  const borderCol = isDarkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0';
  const headerBg = isDarkMode ? '#1e1e2d' : '#213C51'; 

  useEffect(() => { 
    loadPdfs(); 
  }, []);

  const loadPdfs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pdfs')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setPdfs(data || []);
    } catch (error) {
      console.error("Error loading PDFs:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- VIEW PDF FUNCTION (Strictly no audit logging) ---
  const handleViewPdf = (pdf) => {
    const fileUrl = pdf.file_url || pdf.pdf_url;
    if (!fileUrl) {
      showStatus('error', 'No PDF file linked to this record.');
      return;
    }

    const { data } = supabase.storage.from('pdfs').getPublicUrl(fileUrl);
    if (data?.publicUrl) {
      window.open(data.publicUrl, '_blank');
    }
  };

  const genres = useMemo(() => {
    const allGenres = pdfs.flatMap(p => 
      p.genre ? p.genre.split(',').map(g => g.trim()) : []
    );
    return ["All", ...new Set(allGenres)].sort();
  }, [pdfs]);

  const filteredPdfs = useMemo(() => {
    return pdfs.filter(pdf => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        pdf.title?.toLowerCase().includes(query) ||
        pdf.author?.toLowerCase().includes(query) ||
        pdf.genre?.toLowerCase().includes(query);
      
      const matchesGenre = selectedGenre === "All" || 
        (pdf.genre && pdf.genre.split(',').map(g => g.trim()).includes(selectedGenre));
      
      let matchesDate = true;
      if (dateFilter) {
        const fileDate = new Date(pdf.created_at).toISOString().split('T')[0];
        matchesDate = fileDate === dateFilter;
      }

      return matchesSearch && matchesGenre && matchesDate;
    });
  }, [pdfs, searchQuery, selectedGenre, dateFilter]);

  const getImageUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from('pdfs').getPublicUrl(path);
    return data.publicUrl;
  };

  const showStatus = (type, message) => setStatus({ open: true, type, message });

  const handleArchiveDocument = async () => {
    if (!selectedPdf) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error: archiveError } = await supabase
        .from('pdfs')
        .update({ is_archived: true })
        .eq('id', selectedPdf.id);

      if (archiveError) throw archiveError;

      await supabase
        .from('delete_requests')
        .delete()
        .eq('pdf_id', selectedPdf.id);

      if (user) {
        await supabase.from('audit_logs').insert([{
          user_id: user.id,
          pdf_id: selectedPdf.id,
          action_type: 'Delete',
          description: `Archived PDF: "${selectedPdf.title}" : Permanent archive action`
        }]);
      }

      showStatus('success', "Document moved to Archives and requests cleared.");
      setDeleteOpen(false);
      loadPdfs(); 
    } catch (error) {
      console.error(error);
      showStatus('error', "Failed to archive document.");
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 5 }, background: pageBg, minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>

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
          MANAGE PDFs
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, display: 'block' }}>
          MANAGE AND EDIT YOUR ACADEMIC DOCUMENTS.
        </Typography>
      </Box>

      {/* FILTER BAR */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4, position: 'relative', zIndex: 2 }}>
        <TextField 
          fullWidth 
          placeholder="Search by title, author, or genre..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          sx={{ flexGrow: 1, bgcolor: inputBg, borderRadius: 0.5 }}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment>) }}
        />
        
        <TextField
          type="date"
          size="medium"
          label="Date"  
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
          size="medium" 
          label="Genre" 
          value={selectedGenre} 
          onChange={(e) => setSelectedGenre(e.target.value)} 
          sx={{ minWidth: 200, bgcolor: inputBg, borderRadius: 0.5 }}
        >
          {genres.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
        </TextField>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress color="secondary" /></Box>
      ) : (
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {filteredPdfs.length === 0 ? (
            <Typography align="center" sx={{ py: 10, color: 'text.secondary', fontWeight: 600 }}>No documents found.</Typography>
          ) : !isMobile ? (
            <TableContainer component={Paper} sx={{ borderRadius: 1, bgcolor: cardBg, border: `1px solid ${borderCol}`, boxShadow: 'none' }}>
              <Table>
                <TableHead sx={{ bgcolor: headerBg }}>
                  <TableRow>
                    <TableCell sx={{ color: 'white', fontWeight: 800 }}>DOCUMENT</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 800 }}>AUTHOR</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 800 }} align="center">CATEGORY</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 800 }} align="center">DATE UPLOADED</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 800 }} align="center">ACTIONS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPdfs.map((pdf) => (
                    <TableRow key={pdf.id} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Avatar variant="rounded" src={getImageUrl(pdf.image_url)} sx={{ width: 45, height: 55, border: `1px solid ${borderCol}`, bgcolor: 'transparent' }}>
                            {!pdf.image_url && <Box component="img" src={logo} sx={{ width: '80%', opacity: 0.8 }} />}
                          </Avatar>
                          <Typography sx={{ fontWeight: 700 }}>{pdf.title}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{pdf.author || 'N/A'}</TableCell>
                      <TableCell align="center">
                        <Chip label={pdf.genre || 'Academic'} variant="outlined" sx={{ color: '#3b82f6', borderColor: '#3b82f6', fontWeight: 600, borderRadius: '16px', minWidth: '110px' }} />
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                        {pdf.created_at ? new Date(pdf.created_at).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" justifyContent="center" spacing={1}>
                          <Tooltip title="View PDF">
                            <IconButton onClick={() => handleViewPdf(pdf)} color="primary">
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          <IconButton onClick={() => { setSelectedPdf(pdf); setEditOpen(true); }} color="info"><EditIcon /></IconButton>
                          <IconButton onClick={() => { setSelectedPdf(pdf); setDeleteOpen(true); }} color="error"><DeleteIcon /></IconButton>
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
                <Paper key={pdf.id} sx={{ p: 2, bgcolor: cardBg, borderRadius: 4, border: `1px solid ${borderCol}`, textAlign: 'center' }}>
                  <Avatar variant="rounded" src={getImageUrl(pdf.image_url)} sx={{ width: 90, height: 120, mx: 'auto', mb: 2, bgcolor: 'transparent' }}>
                    {!pdf.image_url && <Box component="img" src={logo} sx={{ width: '70%', opacity: 0.8 }} />}
                  </Avatar> 
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>{pdf.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{pdf.author || 'Unknown Author'}</Typography>
                  <Typography variant="caption" sx={{ display: 'block', mb: 2, color: 'text.secondary' }}>
                    Uploaded: {pdf.created_at ? new Date(pdf.created_at).toLocaleDateString() : 'N/A'}
                  </Typography>
                  <Chip label={pdf.genre || 'Academic'} variant="outlined" sx={{ color: '#3b82f6', borderColor: '#3b82f6', fontWeight: 700, mb: 3 }} />
                  <Stack direction="row" spacing={1}>
                    <Button fullWidth variant="outlined" startIcon={<VisibilityIcon />} onClick={() => handleViewPdf(pdf)} sx={{ fontWeight: 700 }}>View</Button>
                    <Button fullWidth variant="contained" color="info" startIcon={<EditIcon />} onClick={() => { setSelectedPdf(pdf); setEditOpen(true); }}>Edit</Button>
                    <Button fullWidth variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => { setSelectedPdf(pdf); setDeleteOpen(true); }}>Archive</Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {/* FEEDBACK */}
      <Snackbar open={status.open} autoHideDuration={4000} onClose={() => setStatus({ ...status, open: false })}>
        <Alert severity={status.type} variant="filled">{status.message}</Alert>
      </Snackbar>

      {/* EDIT MODAL */}
      {selectedPdf && (
        <EditPdfModal open={editOpen} onClose={() => setEditOpen(false)} pdf={selectedPdf} onUpdate={loadPdfs} />
      )}

      {/* ARCHIVE CONFIRMATION DIALOG */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} PaperProps={{ sx: { borderRadius: 3, bgcolor: cardBg, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="warning" /> Confirm Archive
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 1, fontWeight: 700 }}>
            Archive "{selectedPdf?.title}"?
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, opacity: 0.8 }}>
            Moving to Archives will automatically remove any pending delete requests for this document.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDeleteOpen(false)} sx={{ color: 'text.secondary', fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" onClick={handleArchiveDocument} color="warning" sx={{ borderRadius: '20px', px: 4, fontWeight: 700 }}>
            Confirm Archive
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuperAdminEditPDFs;