import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Typography, CircularProgress, Stack, IconButton, Avatar,
  useTheme, useMediaQuery, Card, CardContent, Button, Divider, TextField, MenuItem, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip 
} from '@mui/material';
import { supabase } from '../../supabaseClient';
import glclogo from '../../assets/glclogo.png';

// Icons
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'; 
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InfoIcon from '@mui/icons-material/Info';
import TitleIcon from '@mui/icons-material/Title';
import PersonIcon from '@mui/icons-material/Person';
import CategoryIcon from '@mui/icons-material/Category';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import EventIcon from '@mui/icons-material/Event';
import StorageIcon from '@mui/icons-material/Storage';

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
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [monthFilter, setMonthFilter] = useState('');
  const [dayFilter, setDayFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  const [remarkModal, setRemarkModal] = useState({ open: false, requestId: null });
  const [remarks, setRemarks] = useState('');

  // --- INFO MODAL STATE ---
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [selectedPdfInfo, setSelectedPdfInfo] = useState(null);
  const [selectedPdfFileSize, setSelectedPdfFileSize] = useState('Fetching size...');

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('delete_requests')
      .select(`
        id, pdf_id, reason, created_at, 
        pdfs(*), 
        profiles(full_name, role)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching:", error);
    else setRequests(data || []);
    setLoading(false);
  };

  const handleViewPdf = (pdf) => {
    const filePath = pdf?.file_url || pdf?.pdf_url;
    if (!filePath) return;
    const { data } = supabase.storage.from('pdfs').getPublicUrl(filePath);
    if (data?.publicUrl) {
      window.open(data.publicUrl, '_blank');
    }
  };

  const genres = useMemo(() => {
    const allGenres = requests.flatMap(r => 
      r.pdfs?.genre ? r.pdfs.genre.split(',').map(g => g.trim()) : []
    );
    return ["All Genres", ...new Set(allGenres)].sort();
  }, [requests]);

  const categories = ['All Categories', ...new Set(
    requests.map(request => request.pdfs?.category).filter(Boolean)
  )];

  const monthOptions = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];
  const dayOptions = Array.from({ length: 31 }, (_, index) => index + 1);
  const requestYears = [...new Set(requests
    .filter(request => request.created_at)
    .map(request => new Date(request.created_at).getFullYear()))].sort((a, b) => b - a);

  const handleApprove = async (requestId, pdfId, e) => {
    if (e) e.stopPropagation();
    const requestData = requests.find(r => r.id === requestId);
    const pdfTitle = requestData?.pdfs?.title || 'Unknown File';

    await supabase.from('pdfs').update({ is_archived: true }).eq('id', pdfId);
    await supabase.from('delete_requests').update({ status: 'approved' }).eq('id', requestId);
    
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

    await supabase
      .from('delete_requests')
      .update({ 
        status: 'rejected',
        remarks: remarks 
      })
      .eq('id', requestId);

    if (pdfTitle && pdfAuthor) {
      await supabase
        .from('upload_requests')
        .update({ 
          remarks: `${remarks}` 
        })
        .eq('title', pdfTitle)
        .eq('author', pdfAuthor);
    }
    
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
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('pdfs').getPublicUrl(path);
    return data.publicUrl;
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, unitIndex)).toFixed(2))} ${units[unitIndex]}`;
  };

  const handleOpenInfo = async (pdf) => {
    setSelectedPdfInfo(pdf);
    setInfoModalOpen(true);
    setSelectedPdfFileSize(pdf?.file_size || 'Fetching size...');

    if (!pdf?.file_url || pdf.file_size) return;

    try {
      const { data } = supabase.storage.from('pdfs').getPublicUrl(pdf.file_url);
      const response = await fetch(data.publicUrl, { method: 'HEAD' });
      const size = response.headers.get('content-length');
      setSelectedPdfFileSize(size ? formatFileSize(parseInt(size, 10)) : 'Unknown size');
    } catch (error) {
      console.error('Error fetching file size:', error);
      setSelectedPdfFileSize('Unknown size');
    }
  };

  const filteredRequests = requests.filter(req => {
    const query = searchTerm.toLowerCase();
    
    const matchesSearch = 
      (req.pdfs?.title?.toLowerCase() || '').includes(query) || 
      (req.pdfs?.author?.toLowerCase() || '').includes(query) ||
      (req.pdfs?.genre?.toLowerCase() || '').includes(query) ||
      (req.profiles?.full_name?.toLowerCase() || '').includes(query);

    const itemGenres = req.pdfs?.genre ? req.pdfs.genre.split(',').map(g => g.trim()) : [];
    const matchesGenre = genreFilter === 'All Genres' || itemGenres.includes(genreFilter);
    const matchesCategory = categoryFilter === 'All Categories' || req.pdfs?.category === categoryFilter;
    const createdAt = req.created_at ? new Date(req.created_at) : null;
    const matchesMonth = !monthFilter || createdAt?.getMonth() + 1 === Number(monthFilter);
    const matchesDay = !dayFilter || createdAt?.getDate() === Number(dayFilter);
    const matchesYear = !yearFilter || createdAt?.getFullYear() === Number(yearFilter);
    const matchesDate = matchesMonth && matchesDay && matchesYear;
    
    return matchesSearch && matchesGenre && matchesCategory && matchesDate;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 5 }, background: pageBg, minHeight: '100vh', transition: 'all 0.3s ease' }}>
      
      {/* Header Section */}
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

      {/* Filters Section */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4 }}>
        <TextField 
          fullWidth 
          placeholder="Search by title, author, requester..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          sx={{ flexGrow: 1, bgcolor: inputBg }}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment>) }}
        />
        
        <TextField select label="Month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} sx={{ minWidth: 145, bgcolor: inputBg }}>
          <MenuItem value="">All Months</MenuItem>
          {monthOptions.map((month) => <MenuItem key={month.value} value={month.value}>{month.label}</MenuItem>)}
        </TextField>

        <TextField select label="Date" value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} sx={{ minWidth: 125, bgcolor: inputBg }}>
          <MenuItem value="">All Dates</MenuItem>
          {dayOptions.map((day) => <MenuItem key={day} value={day}>{day}</MenuItem>)}
        </TextField>

        <TextField select label="Year" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} sx={{ minWidth: 125, bgcolor: inputBg }}>
          <MenuItem value="">All Years</MenuItem>
          {requestYears.map((year) => <MenuItem key={year} value={year}>{year}</MenuItem>)}
        </TextField>

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

        <TextField
          select
          label="Category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          sx={{ minWidth: 200, bgcolor: inputBg }}
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
      ) : filteredRequests.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 12 }}>
          <HourglassEmptyIcon sx={{ fontSize: 50, color: 'text.disabled', mb: 2, opacity: 0.4 }} />
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.secondary' }}>NO REQUESTS FOUND</Typography>
        </Box>
      ) : isMobile ? (
        // --- MOBILE VIEW ---
        <Stack spacing={2}>
          {filteredRequests.map((req) => (
            <Card 
              key={req.id} 
              onClick={() => handleOpenInfo(req.pdfs)}
              sx={{ bgcolor: cardBg, border: `1px solid ${borderCol}`, borderRadius: 2, cursor: 'pointer' }}
            >
              <CardContent>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <Avatar 
                    variant="rounded" 
                    src={req.pdfs?.image_url ? getImageUrl(req.pdfs.image_url) : glclogo} 
                    sx={{ width: 60, height: 60, border: `1px solid ${borderCol}`, bgcolor: cardBg }}
                  >
                    {!req.pdfs?.image_url && <PictureAsPdfIcon fontSize="large" sx={{ color: '#ef4444' }} />}
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>{req.pdfs?.title || 'Unknown File'}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>{req.pdfs?.author}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, fontWeight: 700, color: 'primary.main' }}>
                      BY: {req.profiles?.full_name}
                    </Typography>
                  </Box>
                </Stack>
                
                <Divider sx={{ my: 1.5, opacity: 0.1 }} />
                
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>REASON:</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>{req.reason}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', mb: 2 }}>{new Date(req.created_at).toLocaleDateString()}</Typography>

                <Stack direction="column" spacing={1} onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="outlined" 
                    startIcon={<VisibilityIcon />} 
                    onClick={() => handleViewPdf(req.pdfs)}
                    sx={{ color: '#0ea5e9', borderColor: '#0ea5e9', textTransform: 'none', fontWeight: 700 }}
                  >
                    View PDF
                  </Button>
                  <Stack direction="row" spacing={1}>
                    <Button 
                      fullWidth
                      variant="contained" 
                      startIcon={<CheckIcon />} 
                      onClick={(e) => handleApprove(req.id, req.pdfs?.id, e)}
                      sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, textTransform: 'none', fontWeight: 700 }}
                    >
                      Accept
                    </Button>
                    <Button 
                      fullWidth
                      variant="contained" 
                      startIcon={<CloseIcon />} 
                      onClick={(e) => { e.stopPropagation(); setRemarkModal({ open: true, requestId: req.id }); }}
                      sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' }, textTransform: 'none', fontWeight: 700 }}
                    >
                      Reject
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        // --- DESKTOP VIEW ---
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
                <TableRow 
                  key={req.id} 
                  hover 
                  onClick={() => handleOpenInfo(req.pdfs)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Avatar 
                        variant="rounded" 
                        src={req.pdfs?.image_url ? getImageUrl(req.pdfs.image_url) : glclogo} 
                        sx={{ width: 45, height: 50, border: `1px solid ${borderCol}`, bgcolor: cardBg }}
                      >
                        {!req.pdfs?.image_url && <PictureAsPdfIcon fontSize="small" sx={{ color: '#ef4444' }} />}
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
                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" justifyContent="center" spacing={1}>
                      <Tooltip title="View PDF">
                        <IconButton onClick={() => handleViewPdf(req.pdfs)} sx={{ color: '#0ea5e9' }}>
                          <VisibilityIcon sx={{ fontSize: 24 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Approve">
                        <IconButton onClick={(e) => handleApprove(req.id, req.pdfs?.id, e)} sx={{ color: '#16a34a' }}>
                          <CheckIcon sx={{ fontSize: 24 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reject">
                        <IconButton onClick={() => setRemarkModal({ open: true, requestId: req.id })} sx={{ color: '#dc2626' }}>
                          <CloseIcon sx={{ fontSize: 24 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* --- DOCUMENT INFO MODAL (STYLE FROM FIRST PIC) --- */}
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
              
              {/* Cover Image */}
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
                {!selectedPdfInfo.image_url && <PictureAsPdfIcon sx={{ fontSize: 60, color: '#ef4444' }} />}
              </Avatar>

              {/* Details List */}
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
                    <Typography variant="body2"><strong>Published:</strong> {selectedPdfInfo.published_date || selectedPdfInfo.published_year || selectedPdfInfo.year || 'N/A'}</Typography>
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
            sx={{ color: isDarkMode ? '#ffffff' : '#ffffff', bgcolor: '#1e1b4b', '&:hover': { bgcolor: '#312e81' }, textTransform: 'none', fontWeight: 700 }}
          >
            Read PDF
          </Button>
          <Button onClick={() => setInfoModalOpen(false)} sx={{ fontWeight: 700, color: 'text.secondary' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

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