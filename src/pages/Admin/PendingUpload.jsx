import React, { useEffect, useState } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Typography, CircularProgress, Stack, IconButton, Avatar,
  useTheme, useMediaQuery, Container, TextField, InputAdornment, MenuItem, 
  Divider, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip,
  Grid, CardMedia
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
  Description as DescriptionIcon,
  Bookmark as BookmarkIcon,
  School as SchoolIcon,
  Business as BusinessIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  Layers as LayersIcon,
  Language as LanguageIcon,
  WarningAmber as WarningAmberIcon,
  Category as CategoryIcon,
  LibraryBooks as LibraryBooksIcon,
  DateRange as DateRangeIcon
} from '@mui/icons-material';
import { supabase } from '../../supabaseClient';
import glclogo from '../../assets/glclogo.png';
// NEW: shared date formatter (year / month / day -> "March 15, 2020")
import { formatPublishedDate } from '../../utils/formatPublishedDate';

// One label/value line for the Document Info dialog, copied from
// AdminDashboard.jsx's InfoRow so both "document info" surfaces look and
// behave the same way (icon + bold label + value, wraps instead of truncating).
const InfoRow = ({ icon, label, value }) => (
  <Typography
    variant="body2"
    component="div"
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 1,
      minWidth: 0,
      '& > svg': { flexShrink: 0 },
      '& > strong': { flexShrink: 0 },
      '& > span': {
        minWidth: 0,
        whiteSpace: 'normal',
        overflowWrap: 'anywhere',
      },
    }}
  >
    {icon} <strong>{label}:</strong> <span>{value || 'N/A'}</span>
  </Typography>
);

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

  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog State for Item Details
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedDocDetails, setSelectedDocDetails] = useState(null);

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [remarks, setRemarks] = useState('');

  // --- APPROVE CONFIRMATION MODAL STATE ---
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [requestToApprove, setRequestToApprove] = useState(null);
  const [approving, setApproving] = useState(false);

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

  // Opens the confirmation modal (does NOT approve yet)
  const openApproveConfirm = (req, e) => {
    if (e) e.stopPropagation();
    setRequestToApprove(req);
    setApproveDialogOpen(true);
  };

  const closeApproveConfirm = () => {
    if (approving) return;
    setApproveDialogOpen(false);
    setRequestToApprove(null);
  };

  const handleConfirmApprove = async () => {
    if (!requestToApprove) return;
    setApproving(true);
    try {
      await handleApprove(requestToApprove);
    } finally {
      setApproving(false);
      setApproveDialogOpen(false);
      setRequestToApprove(null);
    }
  };

  const handleApprove = async (req, e) => {
    if (e) e.stopPropagation();
    // NEW: carry over the newly-added digital-library metadata fields from
    // the upload_requests row into the pdfs record on approval — these were
    // previously dropped here even though they were already collected on
    // the request.
    const { error: insertError } = await supabase.from('pdfs').insert([{
      title: req.title,
      author: req.author,
      description: req.description,
      genre: req.genre,
      category: req.category,
      published_date: req.published_date,
      file_url: req.pdf_url,
      image_url: req.cover_url,
      section: req.section,
      program_course: req.program_course,
      publisher: req.publisher,
      isbn: req.isbn,
      edition: req.edition,
      language: req.language,
      published_month: req.published_month,
      published_day: req.published_day
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

  // --- PAGINATION (12 per page, same pattern as ManageAccount.jsx) ---
  const requestsPerPage = 12;
  const totalPages = Math.ceil(filteredRequests.length / requestsPerPage);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * requestsPerPage,
    currentPage * requestsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, genreFilter, monthFilter, dayFilter, yearFilter]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const RequestMobileCard = ({ req }) => (
    <Card 
      onClick={(e) => handleOpenDetails(req, e)}
      sx={{ mb: 2, bgcolor: cardBg, border: `1px solid ${borderCol}`, borderRadius: 2, cursor: 'pointer' }}
    >
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Avatar variant="rounded" src={req.cover_url ? getImageUrl(req.cover_url) : glclogo} sx={{ width: 60, height: 60, border: `1px solid ${borderCol}`, bgcolor: 'transparent' }}>
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
              onClick={(e) => openApproveConfirm(req, e)}
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
              <Box>{paginatedRequests.map((req) => <RequestMobileCard key={req.id} req={req} />)}</Box>
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
                    {paginatedRequests.map((req) => (
                      <TableRow 
                        key={req.id}
                        hover 
                        onClick={(e) => handleOpenDetails(req, e)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar variant="rounded" src={req.cover_url ? getImageUrl(req.cover_url) : glclogo} sx={{ width: 50, height: 50, border: `1px solid ${borderCol}`, bgcolor: 'transparent' }}>
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
                              <IconButton onClick={(e) => openApproveConfirm(req, e)} sx={{ color: '#16a34a' }}>
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

            {totalPages > 1 && (
              <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center" sx={{ mt: 3, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  onClick={() => setCurrentPage((page) => page - 1)}
                  disabled={currentPage === 1}
                  sx={{ minWidth: 72, fontWeight: 700, textTransform: 'none' }}
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <Button
                    key={page}
                    size="small"
                    onClick={() => setCurrentPage(page)}
                    variant={currentPage === page ? 'contained' : 'text'}
                    sx={{ minWidth: 32, fontWeight: 700 }}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  size="small"
                  onClick={() => setCurrentPage((page) => page + 1)}
                  disabled={currentPage === totalPages}
                  sx={{ minWidth: 55, fontWeight: 700, textTransform: 'none' }}
                >
                  Next
                </Button>
              </Stack>
            )}
          </>
        )}
      </Container>

      {/* DOCUMENT DETAILS POPUP DIALOG — layout mirrors AdminDashboard.jsx's
          Book Details dialog: header with icon + close button, cover on the
          left, title / author / two-column InfoRow grid / description on the
          right. Pending-upload-only info (Submitted By, Upload Reason) is
          added on top of that same layout. */}
      <Dialog 
        open={detailsDialogOpen} 
        onClose={() => setDetailsDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
            color: isDarkMode ? '#f8fafc' : '#1e293b',
            p: 1
          }
        }}
      >
        {selectedDocDetails && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <PdfIcon color="primary" />
                <Typography variant="h6" fontWeight="800">
                  Document Info
                </Typography>
              </Stack>
              <IconButton onClick={() => setDetailsDialogOpen(false)} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                  {getImageUrl(selectedDocDetails.cover_url) ? (
                    <CardMedia
                      component="img"
                      image={getImageUrl(selectedDocDetails.cover_url)}
                      alt={selectedDocDetails.title}
                      sx={{ borderRadius: '12px', height: 260, objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                    />
                  ) : (
                    <Box sx={{ 
                      height: 260, 
                      borderRadius: '12px', 
                      bgcolor: isDarkMode ? '#0f172a' : '#f1f5f9', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'text.secondary'
                    }}>
                      <BookIcon sx={{ fontSize: 60, mb: 1, color: '#94a3b8' }} />
                      <Typography variant="caption" fontWeight="700">No Cover Available</Typography>
                    </Box>
                  )}
                </Grid>
                <Grid size={{ xs: 12, md: 8 }}>
                  <Typography variant="h5" fontWeight="900" sx={{ mb: 1 }}>
                    {selectedDocDetails.title || 'Untitled Material'}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="700" color="text.secondary" sx={{ mb: 2 }}>
                    Author: {selectedDocDetails.author || 'Unknown'}
                  </Typography>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'auto auto' },
                      justifyContent: 'start',
                      columnGap: 3,
                      rowGap: 1,
                      mb: 2.5,
                    }}
                  >
                    <InfoRow icon={<LibraryBooksIcon fontSize="small" color="primary" />} label="Type" value={selectedDocDetails.category || 'book'} />
                    <InfoRow icon={<CategoryIcon fontSize="small" color="primary" />} label="Genre" value={selectedDocDetails.genre || 'N/A'} />

                    {selectedDocDetails.section && (
                      <InfoRow icon={<BookmarkIcon fontSize="small" color="primary" />} label="Section" value={selectedDocDetails.section} />
                    )}
                    {selectedDocDetails.program_course && (
                      <InfoRow icon={<SchoolIcon fontSize="small" color="primary" />} label="Program" value={selectedDocDetails.program_course} />
                    )}

                    <InfoRow icon={<DateRangeIcon fontSize="small" color="primary" />} label="Published" value={formatPublishedDate(selectedDocDetails)} />

                    {selectedDocDetails.publisher && (
                      <InfoRow icon={<BusinessIcon fontSize="small" color="primary" />} label="Publisher" value={selectedDocDetails.publisher} />
                    )}
                    {selectedDocDetails.edition && (
                      <InfoRow icon={<LayersIcon fontSize="small" color="primary" />} label="Edition" value={selectedDocDetails.edition} />
                    )}
                    {selectedDocDetails.isbn && (
                      <InfoRow icon={<ConfirmationNumberIcon fontSize="small" color="primary" />} label="ISBN" value={selectedDocDetails.isbn} />
                    )}
                    {selectedDocDetails.language && (
                      <InfoRow icon={<LanguageIcon fontSize="small" color="primary" />} label="Language" value={selectedDocDetails.language} />
                    )}

                    <InfoRow icon={<PersonIcon fontSize="small" color="secondary" />} label="Submitted By" value={selectedDocDetails.profiles?.full_name || 'Unknown'} />
                  </Box>

                  <Typography variant="subtitle2" fontWeight="800" sx={{ mb: 0.5, color: 'text.secondary' }}>
                    DESCRIPTION / ABSTRACT
                  </Typography>
                  <Typography variant="body2" sx={{ lineHeight: 1.7, color: isDarkMode ? '#cbd5e1' : '#475569', mb: 2.5 }}>
                    {selectedDocDetails.description || 'No description provided.'}
                  </Typography>

                  <Typography variant="subtitle2" fontWeight="800" sx={{ mb: 0.5, color: 'text.secondary' }}>
                    UPLOAD REASON
                  </Typography>
                  <Typography variant="body2" sx={{ lineHeight: 1.7, fontStyle: 'italic', color: isDarkMode ? '#cbd5e1' : '#475569', mb: 1 }}>
                    "{selectedDocDetails.upload_reason || 'None'}"
                  </Typography>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0, justifyContent: 'space-between' }}>
              <Button 
                variant="contained" 
                startIcon={<VisibilityIcon />}
                onClick={(e) => handleViewPdf(selectedDocDetails.pdf_url, e)}
                sx={{color: isDarkMode ? '#ffffff' : '#ffffff', bgcolor: '#2e1a47', '&:hover': { bgcolor: '#1e1130' }, textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
              >
                Read PDF
              </Button>
              <Button onClick={() => setDetailsDialogOpen(false)} variant="outlined" sx={{ fontWeight: 700, borderRadius: '8px' }}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* APPROVE CONFIRMATION DIALOG */}
      <Dialog
        open={approveDialogOpen}
        onClose={closeApproveConfirm}
        PaperProps={{ sx: { borderRadius: 3, bgcolor: cardBg, p: 1, minWidth: { xs: '90%', sm: 400 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="warning" /> Confirm Approval
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 1, fontWeight: 700, overflowWrap: 'anywhere' }}>
            Approve "{requestToApprove?.title}"?
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, opacity: 0.8 }}>
            This document will be added to the library and will become available to users.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={closeApproveConfirm} disabled={approving} sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmApprove}
            disabled={approving}
            startIcon={approving ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
            sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, borderRadius: '20px', px: 4, fontWeight: 700, textTransform: 'none' }}
          >
            Confirm Approve
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