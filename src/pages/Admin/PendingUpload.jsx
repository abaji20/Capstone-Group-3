import React, { useEffect, useState } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Typography, CircularProgress, Stack, IconButton, Avatar,
  useTheme, useMediaQuery, Container, TextField, InputAdornment, MenuItem, 
  Collapse, Divider, Chip, Button, Card, CardContent
} from '@mui/material';
import { 
  CheckCircleOutline as CheckCircleIcon, 
  HighlightOff as HighlightOffIcon, 
  PictureAsPdf as PdfIcon,
  Search as SearchIcon,
  HourglassEmpty as HourglassIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PersonOutline as PersonIcon // Added icon for user display
} from '@mui/icons-material';
import { supabase } from '../../supabaseClient';

const PendingUpload = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // --- STYLING ---
  const pageBg = isDarkMode ? '#0f172a' : '#ffffff'; 
  const cardBg = isDarkMode ? '#1e293b' : 'rgba(255, 255, 255, 0.9)';
  const inputBg = isDarkMode ? '#28334e' : '#f1f5f9'; 
  const borderCol = isDarkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0';
  const headerColor = isDarkMode ? '#1e1e2d' : '#213C51';

  const filterInputStyle = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 1,
      bgcolor: inputBg,
      '& fieldset': { border: 'none' },
    },
    '& .MuiInputLabel-root': { fontWeight: 700 }
  };

  // --- STATE ---
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { fetchPendingRequests(); }, []);

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('pdfs').getPublicUrl(path);
    return data.publicUrl;
  };

  const fetchPendingRequests = async () => {
    setLoading(true);
    // UPDATED: Added profiles(full_name) to the select query
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

  const handleApprove = async (req) => {
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
      fetchPendingRequests();
    }
  };

  const handleReject = async (reqId) => {
    await supabase.from('upload_requests').update({ status: 'rejected' }).eq('id', reqId);
    fetchPendingRequests();
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = (req.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          req.author?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'All Types' || req.category === typeFilter;
    return matchesSearch && matchesType;
  });

  const RequestMobileCard = ({ req }) => (
    <Card sx={{ mb: 2, bgcolor: cardBg, border: `1px solid ${borderCol}`, borderRadius: 2 }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Avatar variant="rounded" src={getImageUrl(req.cover_url)} sx={{ width: 60, height: 80, border: `1px solid ${borderCol}` }}>
            <PdfIcon />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{req.title}</Typography>
            <Typography variant="body2" color="text.secondary">{req.author} • {req.genre}</Typography>
            
            {/* ADDED: Submitted by display for mobile */}
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
              <PersonIcon sx={{ fontSize: '0.9rem', opacity: 0.7 }} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                By: {req.profiles?.full_name || 'Unknown'}
              </Typography>
            </Stack>

            <Typography 
              sx={{ 
                mt: 1, 
                fontWeight: 900, 
                color: isDarkMode ? '#94a3b8' : '#64748b', 
                fontSize: '0.75rem', 
                letterSpacing: '0.5px' 
              }}
            >
              {req.category?.toUpperCase() || 'N/A'}
            </Typography>
          </Box>
        </Stack>
        
        <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>REASON:</Typography>
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{req.upload_reason || "None"}</Typography>
        </Box>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button 
            fullWidth variant="contained" color="success" startIcon={<CheckCircleIcon />} 
            onClick={() => handleApprove(req)} sx={{ fontWeight: 700 }}
          >
            Approve
          </Button>
          <Button 
            fullWidth variant="contained" color="error" startIcon={<HighlightOffIcon />} 
            onClick={() => handleReject(req.id)} sx={{ fontWeight: 700 }}
          >
            Reject
          </Button>
        </Stack>
        
        <Button 
          fullWidth size="small" sx={{ mt: 1, textTransform: 'none' }}
          onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
          endIcon={expandedId === req.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        >
          {expandedId === req.id ? "Hide Details" : "View Details"}
        </Button>

        <Collapse in={expandedId === req.id}>
          <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${borderCol}` }}>
            <Typography variant="caption" sx={{ fontWeight: 800 }}>DESCRIPTION:</Typography>
            <Typography variant="body2" color="text.secondary">{req.description}</Typography>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: pageBg, minHeight: '100vh' }}>
      <Container maxWidth="xl">
        
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 3 }}>
          <Box>
            <Typography 
              variant="h3" 
              sx={{ 
                fontStyle: 'italic', fontWeight: 900, color: isDarkMode ? '#ffffff' : '#213C51', 
                fontFamily: "'Montserrat', sans-serif", fontSize: { xs: '1.75rem', sm: '2.2rem', md: '3rem' }, letterSpacing: '1px'
              }}
            >
              PENDING UPLOADS
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, display: 'block' }}>
              REVIEW AND MANAGE DOCUMENT SUBMISSIONS
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4 }}>
          <TextField 
            fullWidth 
            placeholder="Search title or author..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            InputProps={{ 
              startAdornment: <InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment> 
            }} 
            sx={filterInputStyle}
          />
          <TextField 
            select 
            label="Type" 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)} 
            sx={{ ...filterInputStyle, minWidth: { md: 200 } }}
          >
            <MenuItem value="All Types">All Types</MenuItem>
            <MenuItem value="book">Book</MenuItem>
            <MenuItem value="academic paper">Academic Paper</MenuItem>
          </TextField>
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress color="secondary" /></Box>
        ) : filteredRequests.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 8, opacity: 0.5 }}>
            <HourglassIcon sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>NO PENDING UPLOADS</Typography>
          </Box>
        ) : (
          <>
            {isMobile ? (
              <Box>
                {filteredRequests.map((req) => <RequestMobileCard key={req.id} req={req} />)}
              </Box>
            ) : (
              <TableContainer component={Paper} sx={{ borderRadius: 1, backgroundColor: cardBg, border: `1px solid ${borderCol}` }}>
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
                      <React.Fragment key={req.id}>
                        <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={2}>
                              <Avatar variant="rounded" src={getImageUrl(req.cover_url)} sx={{ width: 45, height: 55, border: `1px solid ${borderCol}` }}>
                                <PdfIcon fontSize="small" />
                              </Avatar>
                              <Box>
                                <Typography sx={{ fontWeight: 700 }}>{req.title}</Typography>
                                <Button 
                                  size="small" 
                                  onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                                  startIcon={expandedId === req.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                  sx={{ textTransform: 'none', fontSize: '0.7rem', p: 0 }}
                                >
                                  Details
                                </Button>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{req.author}</Typography></TableCell>
                          {/* ADDED: Submitted By Cell */}
                          <TableCell>
                             <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                {req.profiles?.full_name || 'N/A'}
                             </Typography>
                          </TableCell>
                          <TableCell><Typography variant="body2">{req.genre}</Typography></TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 800, 
                                color: isDarkMode ? '#cbd5e1' : '#475569', 
                                letterSpacing: '0.5px' 
                              }}
                            >
                              {req.category?.toUpperCase() || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="row" justifyContent="center" spacing={1}>
                              <IconButton onClick={() => handleApprove(req)} sx={{ color: '#16a34a' }}><CheckCircleIcon sx={{ fontSize: 30 }} /></IconButton>
                              <IconButton onClick={() => handleReject(req.id)} sx={{ color: '#dc2626' }}><HighlightOffIcon sx={{ fontSize: 30 }} /></IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                            <Collapse in={expandedId === req.id} timeout="auto" unmountOnExit>
                              <Box sx={{ margin: 2, p: 2, bgcolor: isDarkMode ? 'rgba(0,0,0,0.2)' : '#f8fafc', borderRadius: 2 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Full Description:</Typography>
                                <Typography variant="body2" color="text.secondary">{req.description}</Typography>
                                <Divider sx={{ my: 2 }} />
                                <Stack direction="row" spacing={3}>
                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Reason: {req.upload_reason || "None"}</Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Submitted: {new Date(req.created_at).toLocaleDateString()}</Typography>
                                </Stack>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Container>
    </Box>
  );
};

export default PendingUpload;