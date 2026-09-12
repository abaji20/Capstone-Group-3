import React, { useEffect, useState } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Typography, CircularProgress, Stack, IconButton, Avatar,
  useTheme, useMediaQuery, Container, TextField, InputAdornment, MenuItem, 
  Divider, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip
} from '@mui/material';
import { 
  Check as CheckIcon, 
  Close as CloseIcon, 
  PictureAsPdf as PdfIcon,
  Search as SearchIcon,
  HourglassEmpty as HourglassIcon,
  PersonOutline as PersonIcon,
  CalendarToday as CalendarIcon,
  RateReview as ReviewIcon,
  Visibility as VisibilityIcon,
  Info as InfoIcon,
  Title as TitleIcon,
  Book as BookIcon,
  MenuBook as GenreIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { supabase } from '../../supabaseClient';
import glclogo from '../../assets/glclogo.png';

const PendingUpload = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // --- STYLING ---
  const pageBg = isDarkMode ? '#0f172a' : '#ffffff'; 
  const cardBg = isDarkMode ? '#1e293b' : 'rgba(255, 255, 255, 0.9)';
  const inputBg = isDarkMode ? '#28334e' : '#ffffff'; 
  const borderCol = isDarkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0';
  const headerColor = isDarkMode ? '#1e1e2d' : '#213C51';

  // --- STATE ---
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [genreFilter, setGenreFilter] = useState('All Genres');
  const [monthFilter, setMonthFilter] = useState('');
  const [dayFilter, setDayFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  // Dialog State for Item Details
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedDocDetails, setSelectedDocDetails] = useState(null);

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [remarks, setRemarks] = useState('');

  useEffect(() => { fetchPendingRequests(); }, []);

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('pdfs').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleViewPdf = (path, e) => {
    if (e) e.stopPropagation();
    if (!path) return;
    const { data } = supabase.storage.from('pdfs').getPublicUrl(path);
    window.open(data.publicUrl, '_blank');
  };

  const handleOpenDetails = (req, e) => {
    if (e) e.stopPropagation();
    setSelectedDocDetails(req);
    setDetailsDialogOpen(true);
  };

  const fetchPendingRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('upload_requests')
      .select(`
        *,
        profiles (
          full_name
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  const handleApprove = async (req, e) => {
    if (e) e.stopPropagation();
    const { error: insertError } = await supabase.from('pdfs').insert([{
      title: req.title,
      author: req.author,
      description: req.description,
      genre: req.genre,
      category: req.category,
      published_date: req.published_date,
      file_url: req.pdf_url,
      image_url: req.cover_url
    }]);

    if (!insertError) {
      await supabase.from('upload_requests').update({ status: 'approved' }).eq('id', req.id);
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('audit_logs').insert([
        {
          user_id: user.id,
          action_type: 'approved',
          description: `Admin approved upload request for: "${req.title}" submitted by ${req.profiles?.full_name || 'Unknown'}`
        }
      ]);

      fetchPendingRequests();
    }
  };

  const handleRejectClick = (req, e) => {
    if (e) e.stopPropagation();
    setSelectedRequest(req);
    setRemarks('');
    setRejectDialogOpen(true);
  };

  const confirmRejection = async () => {
    if (!selectedRequest) return;
    
    await supabase
      .from('upload_requests')
      .update({ 
        status: 'rejected',
        remarks: remarks 
      })
      .eq('id', selectedRequest.id);
    
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('audit_logs').insert([
      {
        user_id: user.id,
        action_type: 'rejected',
        description: `Admin rejected upload request for: "${selectedRequest.title}" with remarks: ${remarks}`
      }
    ]);

    setRejectDialogOpen(false);
    fetchPendingRequests();
  };

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
  const genres = ['All Genres', ...new Set(
    requests.flatMap(request => request.genre ? request.genre.split(',').map(genre => genre.trim()) : [])
  )].sort();

  const filteredRequests = requests.filter(req => {
    const matchesSearch = (
      req.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      req.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesCategory = categoryFilter === 'All Categories' || req.category === categoryFilter;
    const matchesGenre = genreFilter === 'All Genres' || req.genre?.split(',').map(genre => genre.trim()).includes(genreFilter);
    const requestDate = req.created_at ? new Date(req.created_at) : null;
    const matchesMonth = !monthFilter || requestDate?.getMonth() + 1 === Number(monthFilter);
    const matchesDay = !dayFilter || requestDate?.getDate() === Number(dayFilter);
    const matchesYear = !yearFilter || requestDate?.getFullYear() === Number(yearFilter);
    const matchesDate = matchesMonth && matchesDay && matchesYear;

    return matchesSearch && matchesCategory && matchesGenre && matchesDate;
  });

  const RequestMobileCard = ({ req }) => (
    <Card 
      onClick={(e) => handleOpenDetails(req, e)}
      sx={{ mb: 2, bgcolor: cardBg, border: `1px solid ${borderCol}`, borderRadius: 2, cursor: 'pointer' }}
    >
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Avatar variant="rounded" src={req.cover_url ? getImageUrl(req.cover_url) : glclogo} sx={{ width: 60, height: 80, border: `1px solid ${borderCol}`, bgcolor: 'transparent' }}>
            {!req.cover_url && <PdfIcon sx={{ color: 'red', fontSize: '2rem' }} />}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{req.title}</Typography>
            <Typography variant="body2" color="text.secondary">{req.author} • {req.genre}</Typography>
            
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
              <PersonIcon sx={{ fontSize: '0.9rem', opacity: 0.7 }} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                By: {req.profiles?.full_name || 'Unknown'}
              </Typography>
            </Stack>

            <Typography sx={{ mt: 1, fontWeight: 900, color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
              {req.category?.toUpperCase() || 'N/A'}
            </Typography>
          </Box>
        </Stack>
        
        <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>REASON:</Typography>
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{req.upload_reason || "None"}</Typography>
        </Box>

        {/* LABELED BUTTONS FOR MOBILE */}
        <Stack direction="column" spacing={1} sx={{ mt: 2 }} onClick={(e) => e.stopPropagation()}>
          <Button 
            variant="outlined" 
            startIcon={<VisibilityIcon />} 
            onClick={(e) => handleViewPdf(req.pdf_url, e)}
            sx={{ color: '#0ea5e9', borderColor: '#0ea5e9', textTransform: 'none', fontWeight: 700 }}
          >
            View PDF
          </Button>
          <Stack direction="row" spacing={1}>
            <Button 
              fullWidth
              variant="contained" 
              startIcon={<CheckIcon />} 
              onClick={(e) => handleApprove(req, e)}
              sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, textTransform: 'none', fontWeight: 700 }}
            >
              Accept
            </Button>
            <Button 
              fullWidth
              variant="contained" 
              startIcon={<CloseIcon />} 
              onClick={(e) => handleRejectClick(req, e)}
              sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' }, textTransform: 'none', fontWeight: 700 }}
            >
              Reject
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: pageBg, minHeight: '100vh' }}>
      <Container maxWidth="xls">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" sx={{ fontStyle: 'italic', fontWeight: 900, color: isDarkMode ? '#ffffff' : '#213C51', fontFamily: "'Montserrat', sans-serif", fontSize: { xs: '1.75rem', sm: '2.2rem', md: '3rem' }, letterSpacing: '1px' }}>
            PENDING UPLOADS
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, display: 'block' }}>
            REVIEW AND MANAGE DOCUMENT SUBMISSIONS
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4 }}>
          <TextField fullWidth placeholder="Search title, author, or requester..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ bgcolor: inputBg, borderRadius: 0.5 }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment> }} />
          <TextField select size="medium" label="Month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} sx={{ minWidth: 145, bgcolor: inputBg, borderRadius: 0.5 }}>
            <MenuItem value="">All Months</MenuItem>
            {monthOptions.map((month) => <MenuItem key={month.value} value={month.value}>{month.label}</MenuItem>)}
          </TextField>
          <TextField select size="medium" label="Date" value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} sx={{ minWidth: 125, bgcolor: inputBg, borderRadius: 0.5 }}>
            <MenuItem value="">All Dates</MenuItem>
            {dayOptions.map((day) => <MenuItem key={day} value={day}>{day}</MenuItem>)}
          </TextField>
          <TextField select size="medium" label="Year" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} sx={{ minWidth: 125, bgcolor: inputBg, borderRadius: 0.5 }}>
            <MenuItem value="">All Years</MenuItem>
            {requestYears.map((year) => <MenuItem key={year} value={year}>{year}</MenuItem>)}
          </TextField>
          <TextField select size="medium" label="Category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} sx={{ minWidth: 200, bgcolor: inputBg, borderRadius: 0.5 }}>
            <MenuItem value="All Categories">All Categories</MenuItem>
            <MenuItem value="book">Book</MenuItem>
            <MenuItem value="academic paper">Academic Paper</MenuItem>
          </TextField>
          <TextField select size="medium" label="Genre" value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)} sx={{ minWidth: 200, bgcolor: inputBg, borderRadius: 0.5 }}>
            {genres.map((genre) => <MenuItem key={genre} value={genre}>{genre}</MenuItem>)}
          </TextField>
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress color="secondary" /></Box>
        ) : filteredRequests.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <HourglassIcon sx={{ fontSize: 50, color: 'text.disabled', opacity: 0.4, mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 800 }}>NO PENDING UPLOADS</Typography>
          </Box>
        ) : (
          <>
            {isMobile ? (
              <Box>{filteredRequests.map((req) => <RequestMobileCard key={req.id} req={req} />)}</Box>
            ) : (
              <TableContainer component={Paper} sx={{ borderRadius: 1, backgroundColor: cardBg, border: `1px solid ${borderCol}`, boxShadow: 'none' }}>
                <Table>
                  <TableHead sx={{ bgcolor: headerColor }}>
                    <TableRow>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }}>DOCUMENT</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }}>AUTHOR</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }}>SUBMITTED BY</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }}>GENRE</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }}>CATEGORY</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }} align="center">ACTIONS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRequests.map((req) => (
                      <TableRow 
                        key={req.id}
                        hover 
                        onClick={(e) => handleOpenDetails(req, e)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar variant="rounded" src={req.cover_url ? getImageUrl(req.cover_url) : glclogo} sx={{ width: 45, height: 50, border: `1px solid ${borderCol}`, bgcolor: 'transparent' }}>
                              {!req.cover_url && <PdfIcon sx={{ color: 'red' }} />}
                            </Avatar>
                            <Box>
                              <Typography sx={{ fontWeight: 700 }}>{req.title}</Typography>
                              <Button size="small" onClick={(e) => handleOpenDetails(req, e)} sx={{ textTransform: 'none', fontSize: '0.7rem', p: 0 }}>View Info</Button>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{req.author}</Typography></TableCell>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>{req.profiles?.full_name || 'N/A'}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{req.genre}</Typography></TableCell>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 800, color: isDarkMode ? '#cbd5e1' : '#475569', letterSpacing: '0.5px' }}>{req.category?.toUpperCase() || 'N/A'}</Typography></TableCell>
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Stack direction="row" justifyContent="center" spacing={1}>
                            <Tooltip title="View PDF">
                              <IconButton onClick={(e) => handleViewPdf(req.pdf_url, e)} sx={{ color: '#0ea5e9' }}>
                                <VisibilityIcon sx={{ fontSize: 24 }} />
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Approve">
                              <IconButton onClick={(e) => handleApprove(req, e)} sx={{ color: '#16a34a' }}>
                                <CheckIcon sx={{ fontSize: 24 }} />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Reject">
                              <IconButton onClick={(e) => handleRejectClick(req, e)} sx={{ color: '#dc2626' }}>
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
          </>
        )}
      </Container>

      {/* DOCUMENT DETAILS POPUP DIALOG */}
      <Dialog 
        open={detailsDialogOpen} 
        onClose={() => setDetailsDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { bgcolor: cardBg, borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon color="primary" /> Document Info
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: borderCol, maxHeight: '70vh', overflowY: 'auto' }}>
          {selectedDocDetails && (
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, alignItems: { xs: 'center', md: 'flex-start' } }}>
              <Avatar 
                variant="rounded" 
                src={selectedDocDetails.cover_url ? getImageUrl(selectedDocDetails.cover_url) : glclogo} 
                sx={{ 
                  width: { xs: 160, md: 210 }, 
                  height: { xs: 200, md: 200 }, 
                  boxShadow: 3,
                  border: `1px solid ${borderCol}`,
                  bgcolor: 'transparent',
                  objectFit: 'cover',
                  flexShrink: 0
                }}
              >
                {!selectedDocDetails.cover_url && <PdfIcon sx={{ color: 'red', fontSize: '3rem' }} />}
              </Avatar>

              <Box sx={{ flexGrow: 1, width: '100%' }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <TitleIcon color="primary" fontSize="small" />
                    <Typography variant="body2"><strong>Title:</strong> {selectedDocDetails.title || 'N/A'}</Typography>
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <PersonIcon color="primary" fontSize="small" />
                    <Typography variant="body2"><strong>Author:</strong> {selectedDocDetails.author || 'N/A'}</Typography>
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <BookIcon color="primary" fontSize="small" />
                    <Typography variant="body2"><strong>Type:</strong> {selectedDocDetails.category || 'book'}</Typography>
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <GenreIcon color="primary" fontSize="small" />
                    <Typography variant="body2"><strong>Genre:</strong> {selectedDocDetails.genre || 'N/A'}</Typography>
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <CalendarIcon color="primary" fontSize="small" />
                    <Typography variant="body2"><strong>Published:</strong> {selectedDocDetails.published_date || 'N/A'}</Typography>
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <PersonIcon color="secondary" fontSize="small" />
                    <Typography variant="body2"><strong>Submitted By:</strong> {selectedDocDetails.profiles?.full_name || 'Unknown'}</Typography>
                  </Stack>
                </Stack>

                <Divider sx={{ my: 2, opacity: 0.2 }} />

                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Description</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  {selectedDocDetails.description || 'No description provided.'}
                </Typography>
              </Box>
            </Box>
          )}

          {selectedDocDetails && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>Upload Reason</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                "{selectedDocDetails.upload_reason || 'None'}"
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          {selectedDocDetails && (
            <Button 
              variant="contained" 
              startIcon={<VisibilityIcon />}
              onClick={(e) => handleViewPdf(selectedDocDetails.pdf_url, e)}
              sx={{color: isDarkMode ? '#ffffff' : '#ffffff', bgcolor: '#2e1a47', '&:hover': { bgcolor: '#1e1130' }, textTransform: 'none', fontWeight: 700 }}
            >
              Read PDF
            </Button>
          )}
          <Button onClick={() => setDetailsDialogOpen(false)} sx={{ fontWeight: 700, color: 'text.secondary' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* REJECTION REASON DIALOG */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} PaperProps={{ sx: { borderRadius: 2, bgcolor: cardBg, minWidth: { xs: '90%', sm: 400 } } }}>
        <DialogTitle sx={{ fontWeight: 900, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReviewIcon /> REJECT SUBMISSION
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, fontWeight: 700, color: 'text.secondary' }}>
            Provide a reason for rejecting "{selectedRequest?.title}". This feedback will be visible to the client.
          </Typography>
          <TextField 
            fullWidth multiline rows={4} placeholder="e.g., Incomplete document, Wrong category, Blur cover page..." 
            value={remarks} onChange={(e) => setRemarks(e.target.value)}
            sx={{ bgcolor: inputBg, borderRadius: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setRejectDialogOpen(false)} sx={{ fontWeight: 700, color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={confirmRejection} variant="contained" color="error" sx={{ fontWeight: 800, px: 3 }} disabled={!remarks.trim()}>
            Confirm Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PendingUpload;