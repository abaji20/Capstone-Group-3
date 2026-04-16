import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Typography, CircularProgress, Stack, IconButton, Avatar,
  useTheme, useMediaQuery, Card, CardContent, Button, Divider, TextField, MenuItem, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions 
} from '@mui/material';
import { supabase } from '../../supabaseClient';

// Icons
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'; 
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SearchIcon from '@mui/icons-material/Search';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

const DeleteRequests = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); 

  // --- STYLING CONSTANTS ---
  const pageBg = isDarkMode ? '#0f172a' : '#ffffff'; 
  const cardBg = isDarkMode ? '#1e293b' : 'rgba(255, 255, 255, 0.9)';
  const inputBg = isDarkMode ? '#28334e' : '#ffffff'; 
  const borderCol = isDarkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0';
  const headerColor = isDarkMode ? '#1e1e2d' : '#213C51';

  // --- STATE ---
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [genreFilter, setGenreFilter] = useState('All Genres'); 
  const [dateFilter, setDateFilter] = useState('');

  const [remarkModal, setRemarkModal] = useState({ open: false, requestId: null });
  const [remarks, setRemarks] = useState('');

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('delete_requests')
      .select(`
        id, pdf_id, reason, created_at, 
        pdfs(id, title, image_url, author, genre), 
        profiles(full_name, role)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching:", error);
    else setRequests(data || []);
    setLoading(false);
  };

  const genres = useMemo(() => {
    const allGenres = requests.flatMap(r => 
      r.pdfs?.genre ? r.pdfs.genre.split(',').map(g => g.trim()) : []
    );
    return ["All Genres", ...new Set(allGenres)].sort();
  }, [requests]);

  const handleApprove = async (requestId, pdfId) => {
    const requestData = requests.find(r => r.id === requestId);
    const pdfTitle = requestData?.pdfs?.title || 'Unknown File';

    // 1. Archive the PDF
    await supabase.from('pdfs').update({ is_archived: true }).eq('id', pdfId);
    
    // 2. Approve the delete request
    await supabase.from('delete_requests').update({ status: 'approved' }).eq('id', requestId);
    
    // 3. Update the original upload request remarks to show it was deleted
    if (pdfTitle) {
        await supabase
          .from('upload_requests')
          .update({ remarks: 'Document successfully removed from library.' })
          .eq('title', pdfTitle);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action_type: 'APPROVED DELETE REQUEST',
        pdf_id: pdfId,
        description: `Approved delete request for: ${pdfTitle}`
      });
    }

    fetchRequests();
  };

  const handleReject = async () => {
    const requestId = remarkModal.requestId;
    const requestData = requests.find(r => r.id === requestId);
    const pdfTitle = requestData?.pdfs?.title || 'Unknown File';
    const pdfAuthor = requestData?.pdfs?.author;
    const pdfId = requestData?.pdf_id;

    // 1. Update status in delete_requests
    await supabase
      .from('delete_requests')
      .update({ 
        status: 'rejected',
        remarks: remarks 
      })
      .eq('id', requestId);

    // 2. Update remarks in upload_requests so client sees it
    if (pdfTitle && pdfAuthor) {
      await supabase
        .from('upload_requests')
        .update({ 
          remarks: `${remarks}` 
        })
        .eq('title', pdfTitle)
        .eq('author', pdfAuthor);
    }
    
    // 3. Audit log
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action_type: 'REJECTED DELETE REQUEST',
        pdf_id: pdfId,
        description: `Rejected delete request for: ${pdfTitle}. Remarks: ${remarks}`
      });
    }

    setRemarkModal({ open: false, requestId: null });
    setRemarks('');
    fetchRequests();
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from('pdfs').getPublicUrl(path);
    return data.publicUrl;
  };

  const filteredRequests = requests.filter(req => {
    const createdAt = new Date(req.created_at).toISOString().split('T')[0];
    const query = searchTerm.toLowerCase();
    
    const matchesSearch = 
      (req.pdfs?.title?.toLowerCase() || '').includes(query) || 
      (req.pdfs?.author?.toLowerCase() || '').includes(query) ||
      (req.pdfs?.genre?.toLowerCase() || '').includes(query) ||
      (req.profiles?.full_name?.toLowerCase() || '').includes(query);

    const itemGenres = req.pdfs?.genre ? req.pdfs.genre.split(',').map(g => g.trim()) : [];
    const matchesGenre = genreFilter === 'All Genres' || itemGenres.includes(genreFilter);
    const matchesDate = !dateFilter || createdAt === dateFilter;
    
    return matchesSearch && matchesGenre && matchesDate;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 5 }, background: pageBg, minHeight: '100vh', transition: 'all 0.3s ease' }}>
      
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h3" 
          sx={{ 
            fontStyle: 'italic', fontWeight: 900, color: isDarkMode ? '#ffffff' : '#213C51', 
            fontFamily: "'Montserrat', sans-serif", fontSize: { xs: '1.75rem', sm: '2.2rem', md: '3rem' }, letterSpacing: '1px'
          }}
        >
          DELETE REQUESTS
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, display: 'block' }}>
          AUTHORIZING PERMANENT REMOVAL OF DOCUMENTS
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4 }}>
        <TextField 
          fullWidth 
          placeholder="Search by title, author, requester..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          sx={{ flexGrow: 1, bgcolor: inputBg }}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment>) }}
        />
        
        <TextField
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          sx={{ minWidth: 180, bgcolor: inputBg }}
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
          sx={{ minWidth: 200, bgcolor: inputBg }}
        >
          {genres.map((g) => (
            <MenuItem key={g} value={g}>{g}</MenuItem>
          ))}
        </TextField>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress color="secondary" /></Box>
      ) : filteredRequests.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 12 }}>
          <HourglassEmptyIcon sx={{ fontSize: 50, color: 'text.disabled', mb: 2, opacity: 0.4 }} />
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.secondary' }}>NO REQUESTS FOUND</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 1, backgroundColor: cardBg, border: `1px solid ${borderCol}`, boxShadow: 'none' }}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: headerColor }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 800 }}>DOCUMENT</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 800 }}>REQUESTED BY</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 800 }}>REASON</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 800 }}>DATE</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 800 }} align="center">ACTION</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests.map((req) => (
                <TableRow key={req.id} hover>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Avatar variant="rounded" src={getImageUrl(req.pdfs?.image_url)} sx={{ width: 45, height: 55, border: `1px solid ${borderCol}` }}>
                        <PictureAsPdfIcon fontSize="small" sx={{ color: '#ef4444' }} />
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontWeight: 700 }}>{req.pdfs?.title || 'Unknown File'}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>{req.pdfs?.author}</Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{req.profiles?.full_name}</Typography></TableCell>
                  <TableCell sx={{ maxWidth: '250px' }}><Typography variant="body2" noWrap>{req.reason}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{new Date(req.created_at).toLocaleDateString()}</Typography></TableCell>
                  <TableCell align="center">
                    <Stack direction="row" justifyContent="center" spacing={1}>
                      <IconButton onClick={() => handleApprove(req.id, req.pdfs.id)} sx={{ color: '#16a34a' }}><CheckCircleOutlineIcon sx={{ fontSize: 32 }} /></IconButton>
                      <IconButton onClick={() => setRemarkModal({ open: true, requestId: req.id })} sx={{ color: '#dc2626' }}><HighlightOffIcon sx={{ fontSize: 32 }} /></IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* REMARKS MODAL */}
      <Dialog 
        open={remarkModal.open} 
        onClose={() => setRemarkModal({ open: false, requestId: null })}
        PaperProps={{ sx: { bgcolor: cardBg, borderRadius: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>REJECTION REMARKS</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Explain to the user why their deletion request was rejected.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            placeholder="Enter reason here..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            sx={{ bgcolor: inputBg }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setRemarkModal({ open: false, requestId: null })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleReject} disabled={!remarks.trim()} sx={{ fontWeight: 700 }}>
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeleteRequests;