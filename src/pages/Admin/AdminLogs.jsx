import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Typography, CircularProgress, Stack, MenuItem, TextField, 
  InputAdornment, useTheme, useMediaQuery, Container, Card, CardContent 
} from '@mui/material';
import { supabase } from '../../supabaseClient';

// Icons
import HistoryIcon from '@mui/icons-material/History';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CategoryIcon from '@mui/icons-material/Category';
import DescriptionIcon from '@mui/icons-material/Description';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SearchIcon from '@mui/icons-material/Search';

const AdminLogs = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); 

  // --- DARK MODE COLOR STRATEGY ---
  const pageBg = isDarkMode ? '#141b2d' : '#f8fafc'; 
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  
  // FIXED: Consolidated input background to prevent color bleed ("kitang ibang kulay")
  const inputBg = isDarkMode ? '#28334e' : '#ffffff'; 
  
  const headerBg = isDarkMode ? '#0f172a' : '#1e3a8a';
  const borderCol = isDarkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0';

  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, searchTerm, roleFilter, dateFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        id, action_type, created_at, description,
        pdfs!audit_logs_pdf_id_fkey(title),
        profiles!fk_audit_logs_user_id(full_name, role)
      `)
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching logs:", error);
    else setLogs(data || []);
    setLoading(false);
  };

  const applyFilters = () => {
    let tempLogs = [...logs];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      tempLogs = tempLogs.filter(log => 
        log.profiles?.full_name?.toLowerCase().includes(term) ||
        log.pdfs?.title?.toLowerCase().includes(term) ||
        log.action_type?.toLowerCase().includes(term) ||
        log.description?.toLowerCase().includes(term)
      );
    }
    if (roleFilter !== 'All') {
      tempLogs = tempLogs.filter(log => log.profiles?.role?.toLowerCase() === roleFilter.toLowerCase());
    }
    if (dateFilter) {
      tempLogs = tempLogs.filter(log => log.created_at.startsWith(dateFilter));
    }
    setFilteredLogs(tempLogs);
  };

  // 1. UPDATED: Logic for the uniform Action Buttons to match reference colors in light mode
  const getActionStyles = (action) => {
    const type = action?.toLowerCase();
    
    // Green (from ref img 2)
    if (type?.includes('upload')) return { bg: '#2F6B3F', text: '#FBF6F6', label: 'UPLOAD' };
    
    // FIXED: Pastel Yellow/Cream & Maroon Text (matches your 'parang gold' reference)
    if (type?.includes('edit')) return { bg: '#ffd500', text: '#7c6800', label: 'EDIT' }; 
    
    // Red (from ref img 2)
    if (type?.includes('delete')) return { bg: '#A82323', text: '#ffffff', label: 'DELETE' };
    
    // Blue (from ref img 2)
    if (type?.includes('download')) return { bg: '#261CC1', text: '#adc3ff', label: 'DOWNLOAD' };
    
    return { bg: '#f1f5f9', text: '#475569', label: action?.toUpperCase() };
  };

  // COMPONENT: UNIFORM ACTION BUTTON
  const ActionButton = ({ action }) => {
    const style = getActionStyles(action);
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '110px', 
          py: 0.7,
          borderRadius: '6px', 
          fontWeight: 800,
          fontSize: '0.7rem',
          letterSpacing: '0.5px',
          // Adapt background for dark mode (slightly less opaque)
          bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : style.bg,
          color: isDarkMode ? 'white' : style.text,
          border: isDarkMode ? `1px solid ${style.text}` : 'none',
        }}
      >
        {style.label}
      </Box>
    );
  };

  // FIXED: Styles for the filters to prevent color bleeding
  const filterStyle = {
    backgroundColor: inputBg, // Unified background color here
    borderRadius: 2,
    '& .MuiOutlinedInput-root': {
      // Remove any component-level background so it uses the parent bgcolor
      '& input': { backgroundColor: 'transparent' },
      '& .MuiSelect-select': { backgroundColor: 'transparent' },
      '& fieldset': { border: isDarkMode ? 'none' : '1px solid #e2e8f0' },
      '&:hover fieldset': { border: isDarkMode ? 'none' : '1px solid #cbd5e1' },
      '&.Mui-focused fieldset': { border: `1px solid ${theme.palette.primary.main}` }
    }
  };

  return (
    <Box sx={{ 
      p: { xs: 2, md: 5 }, 
      bgcolor: pageBg, 
      minHeight: '100vh',
      transition: 'background-color 0.3s ease'
    }}>
      <Container maxWidth="xl">
        {/* HEADER SECTION */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4, borderBottom: `2px solid ${isDarkMode ? '#3b82f6' : '#1e3a8a'}`, pb: 2 }}>
          <HistoryIcon sx={{ fontSize: 32, color: isDarkMode ? '#3b82f6' : '#1e3a8a' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>ACTIVITY HISTORY</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 1 }}>SYSTEM AUDIT LOGS</Typography>
          </Box>
        </Stack>

        {/* RESPONSIVE FILTERS */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4 }}>
          <TextField 
            fullWidth
            placeholder="Search name, action, or file..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment> }} 
            sx={filterStyle} // Removed fixed bgcolor: white here
          />
          <Stack direction="row" spacing={2}>
            <TextField select label="Role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} sx={{ ...filterStyle, minWidth: 120 }}>
              <MenuItem value="All">All Roles</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="client">Client</MenuItem>
            </TextField>
            <TextField type="month" label="Date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ ...filterStyle, minWidth: 150 }} />
          </Stack>
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress color="primary" /></Box>
        ) : (
          <>
            {/* DESKTOP VIEW (Table) */}
            {!isMobile && (
              <TableContainer component={Paper} sx={{ bgcolor: cardBg, borderRadius: 3, overflow: 'hidden', border: `1px solid ${borderCol}` }}>
                <Table>
                  <TableHead sx={{ bgcolor: headerBg }}>
                    <TableRow>
                      <TableCell sx={{ color: 'white', fontWeight: 700, py: 2.5 }}><PersonOutlineIcon sx={{ mr: 1, fontSize: 18, verticalAlign: 'middle' }}/>PERFORMED BY</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}><CategoryIcon sx={{ mr: 1, fontSize: 18, verticalAlign: 'middle' }}/>ACTION</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}><DescriptionIcon sx={{ mr: 1, fontSize: 18, verticalAlign: 'middle' }}/>TARGET PDF</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>DETAILS</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}><CalendarTodayIcon sx={{ mr: 1, fontSize: 18, verticalAlign: 'middle' }}/>DATE</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id} hover sx={{ '&:hover': { bgcolor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' } }}>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box sx={{ 
                                px: 1, py: 0.5, borderRadius: 1, fontSize: '0.65rem', fontWeight: 900,
                                bgcolor: log.profiles?.role?.toLowerCase() === 'admin' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                color: log.profiles?.role?.toLowerCase() === 'admin' ? '#f87171' : '#60a5fa',
                                textTransform: 'uppercase'
                              }}>
                                {log.profiles?.role || 'CLIENT'}
                              </Box>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.primary' }}>{log.profiles?.full_name || 'System User'}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <ActionButton action={log.action_type} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500, color: 'text.primary' }}>{log.pdfs?.title || '—'}</TableCell>
                        <TableCell sx={{ maxWidth: 300, color: 'text.secondary', fontSize: '0.85rem' }}>{log.description || '—'}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>{new Date(log.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* MOBILE VIEW (Cards) - Uses same styles as desktop */}
            {isMobile && (
              <Stack spacing={2}>
                {filteredLogs.map((log) => (
                  <Card key={log.id} sx={{ bgcolor: cardBg, borderRadius: 3, border: `1px solid ${borderCol}` }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                        <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>{log.profiles?.full_name}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>{new Date(log.created_at).toLocaleDateString()}</Typography>
                      </Stack>  
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, mb: 0.5 }}>ACTION</Typography>
                          <ActionButton action={log.action_type} />
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700 }}>TARGET PDF</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>{log.pdfs?.title || '—'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700 }}>DETAILS</Typography>
                          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', fontSize: '0.85rem' }}>{log.description || '—'}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </>
        )}
      </Container>
    </Box>
  );
};

export default AdminLogs;