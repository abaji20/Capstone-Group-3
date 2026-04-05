import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Typography, CircularProgress, Stack, IconButton, Tooltip, Avatar,
  useTheme, useMediaQuery, Card, CardContent, Button, Divider, TextField, MenuItem, InputAdornment
} from '@mui/material';
import { supabase } from '../../supabaseClient';

// Icons
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import DateRangeIcon from '@mui/icons-material/DateRange';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SearchIcon from '@mui/icons-material/Search';

const DeleteRequests = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); 

  // --- STYLING CONSTANTS ---
  const pageBg = isDarkMode ? '#0f172a' : '#ffffff'; 
  const cardBg = isDarkMode ? '#1e293b' : 'rgba(255, 255, 255, 0.9)';
  const borderCol = isDarkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0';
  const headerColor = isDarkMode ? '#1e1e2d' : '#213C51';

  const filterStyle = {
    bgcolor: isDarkMode ? '#28334e' : '#ffffff',
    borderRadius: '5px',
    '& .MuiOutlinedInput-root': {
      height: '55px',
      borderRadius: '12px',
      '& fieldset': { borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0' },
    },
    '& .MuiInputLabel-root': { lineHeight: '10px', fontSize: '0.85rem' }
  };

  // --- STATE ---
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [dateFilter, setDateFilter] = useState(''); // Simplified date state

  useEffect(() => { fetchRequests(); }, []);

  // --- LOGIC FUNCTIONS (STRICTLY UNCHANGED) ---
  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('delete_requests')
      .select(`
        id, pdf_id, reason, created_at, 
        pdfs(id, title, image_url), 
        profiles(full_name, role)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching:", error);
    else setRequests(data || []);
    setLoading(false);
  };

  const handleApprove = async (requestId, pdfId) => {
    await supabase.from('pdfs').update({ is_archived: true }).eq('id', pdfId);
    await supabase.from('delete_requests').update({ status: 'approved' }).eq('id', requestId);
    fetchRequests();
  };

  const handleReject = async (requestId) => {
    await supabase.from('delete_requests').update({ status: 'rejected' }).eq('id', requestId);
    fetchRequests();
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    return `https://yktwxeyxmzfkxqhlesly.supabase.co/storage/v1/object/public/pdfs/${path}`;
  };

  // --- FILTERING LOGIC ---
  const filteredRequests = requests.filter(req => {
    const createdAt = new Date(req.created_at).toISOString().split('T')[0]; // Format to YYYY-MM-DD
    
    const matchesSearch = req.pdfs?.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         req.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'All Roles' || req.profiles?.role === roleFilter;
    
    // Simple date match
    const matchesDate = !dateFilter || createdAt === dateFilter;
    
    return matchesSearch && matchesRole && matchesDate;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 5 }, background: pageBg, minHeight: '100vh', transition: 'all 0.3s ease' }}>
      
      {/* HEADER SECTION */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography 
              variant="h3" 
              sx={{ 
                fontStyle: 'italic', fontWeight: 900, color: isDarkMode ? '#ffffff' : '#213C51', 
                fontFamily: "'Montserrat', sans-serif", fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' }, letterSpacing: '1px'
              }}
            >
              DELETE REQUEST
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, display: 'block' }}>
              AUTHORIZING PERMANENT REMOVAL OF DOCUMENTS
            </Typography>
          </Box>
        </Stack>

        {/* FILTER TOOLBAR */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField 
            fullWidth placeholder="Search requests..." size="medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment> }} 
            sx={filterStyle}
          />

          <Stack direction="row" spacing={1} sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' }, width: { xs: '100%', md: 'auto' } }}>
            {/* SIMPLE DATE FILTER */}
            <TextField 
              type="date"
              label="Filter Date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ 
                ...filterStyle, 
                minWidth: { xs: 'calc(50% - 4px)', sm: 160 },
                '& input::-webkit-calendar-picker-indicator': {
                  filter: isDarkMode ? 'invert(1)' : 'none',
                  cursor: 'pointer'
                }
              }}
            />

            {/* ROLE FILTER */}
            <TextField select label="Role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} sx={{ ...filterStyle, minWidth: { xs: 'calc(50% - 4px)', sm: 140 } }}>
              <MenuItem value="All Roles">All Roles</MenuItem>
              <MenuItem value="superadmin">Superadmin</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="client">Client</MenuItem>
            </TextField>
          </Stack>
        </Stack>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress color="secondary" /></Box>
      ) : filteredRequests.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', mt: 12, textAlign: 'center' }}>
          <HourglassEmptyIcon sx={{ fontSize: 50, color: 'text.disabled', mb: 2, opacity: 0.4 }} />
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: '1px' }}>NO REQUESTS FOUND</Typography>
        </Box>
      ) : (
        <>
          {!isMobile ? (
            /* --- DESKTOP TABLE VIEW --- */
            <TableContainer component={Paper} sx={{ mt: 4, borderRadius: 1, backgroundColor: cardBg, border: `1px solid ${borderCol}`, boxShadow: isDarkMode ? 'none' : '0 10px 40px rgba(0,0,0,0.08)' }}>
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
                            <DescriptionOutlinedIcon fontSize="small" />
                          </Avatar>
                          <Typography sx={{ fontWeight: 700 }}>{req.pdfs?.title || 'Unknown File'}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{req.profiles?.full_name}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ maxWidth: '250px' }}><Typography variant="body2" noWrap>{req.reason}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{new Date(req.created_at).toLocaleDateString()}</Typography></TableCell>
                      <TableCell align="center">
                        <Stack direction="row" justifyContent="center" spacing={1}>
                          <IconButton onClick={() => handleApprove(req.id, req.pdfs.id)} sx={{ color: '#16a34a' }}><CheckCircleOutlineIcon sx={{ fontSize: 32 }} /></IconButton>
                          <IconButton onClick={() => handleReject(req.id)} sx={{ color: '#dc2626' }}><HighlightOffIcon sx={{ fontSize: 32 }} /></IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            /* --- MOBILE CARD VIEW --- */
            <Stack spacing={2} sx={{ mt: 2 }}>
              {filteredRequests.map((req) => (
                <Card key={req.id} sx={{ bgcolor: cardBg, borderRadius: 1, border: `1px solid ${borderCol}`, boxShadow: 'none' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                       <Avatar variant="rounded" src={getImageUrl(req.pdfs?.image_url)} sx={{ width: 50, height: 65, border: `1px solid ${borderCol}` }}><DescriptionOutlinedIcon /></Avatar>
                       <Box sx={{ flex: 1 }}>
                         <Typography sx={{ fontWeight: 800 }}>{req.pdfs?.title}</Typography>
                         <Typography variant="caption">{req.profiles?.full_name}</Typography>
                       </Box>
                    </Stack>
                    <Box sx={{ bgcolor: isDarkMode ? 'rgba(0,0,0,0.2)' : '#f8fafc', p: 1.5, mb: 2 }}>
                      <Typography variant="body2" sx={{ fontStyle: 'italic' }}>"{req.reason}"</Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Stack direction="row" spacing={2}>
                      <Button fullWidth variant="contained" color="success" onClick={() => handleApprove(req.id, req.pdfs.id)}>Approve</Button>
                      <Button fullWidth variant="outlined" color="error" onClick={() => handleReject(req.id)}>Reject</Button>
                    </Stack>
                  </CardContent>
                </Card> 
              ))}
            </Stack>
          )}
        </>
      )}
    </Box>
  );
};

export default DeleteRequests;