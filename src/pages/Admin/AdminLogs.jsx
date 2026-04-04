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
  const inputBg = isDarkMode ? '#28334e' : '#ffffff'; 
  const headerBg = isDarkMode ? '#0f172a' : '#213C51';
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
    
    // Logic: Admin view only sees Admin and Client actions (Excludes Superadmin)
    tempLogs = tempLogs.filter(log => 
        log.profiles?.role?.toLowerCase() === 'admin' || 
        log.profiles?.role?.toLowerCase() === 'client'
    );

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

  // --- INTEGRATED COLOR & DARK MODE LOGIC ---
  const getRoleStyles = (role, darkMode) => {
    const r = role?.toLowerCase();
    if (darkMode) {
        // Dark Mode Roles: Subtle backgrounds with vibrant text (as seen in your clips)
        if (r === 'superadmin') return { bg: '#f3e8ff1a', text: '#d8b4fe' }; 
        if (r === 'admin') return { bg: '#fef3c71a', text: '#fbbf24' }; 
        if (r === 'client') return { bg: '#dbeafe1a', text: '#60a5fa' }; 
        return { bg: '#1e293b', text: '#94a3b8' };
    } else {
        // Light Mode Roles
        if (r === 'superadmin') return { bg: '#F3E8FF', text: '#7C3AED' }; 
        if (r === 'admin') return { bg: '#FEF3C7', text: '#D97706' }; 
        if (r === 'client') return { bg: '#DBEAFE', text: '#2563EB' }; 
        return { bg: '#F1F5F9', text: '#475569' };
    }
  };

  const getActionStyles = (action) => {
    const type = action?.toLowerCase();
    if (type?.includes('upload')) return { bg: '#2F6B3F', text: '#FBF6F6', label: 'UPLOAD' };
    if (type?.includes('edit')) return { bg: '#ffd500', text: '#7c6800', label: 'EDIT' }; 
    if (type?.includes('delete')) return { bg: '#A82323', text: '#ffffff', label: 'DELETE' };
    if (type?.includes('download')) return { bg: '#261CC1', text: '#adc3ff', label: 'DOWNLOAD' };
    return { bg: '#f1f5f9', text: '#475569', label: action?.toUpperCase() };
  };

  const ActionButton = ({ action }) => {
    const style = getActionStyles(action);
    return (
      <Box sx={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '120px', py: 0.5, borderRadius: '4px', fontWeight: 800, fontSize: '0.7rem',
          bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : style.bg,
          color: isDarkMode ? 'white' : style.text,
          border: isDarkMode ? `1px solid ${style.text === '#7c6800' ? '#ffd500' : style.text}` : 'none',
        }}>
        {style.label}
      </Box>
    );
  };

  const RoleChip = ({ role }) => {
    const styles = getRoleStyles(role, isDarkMode);
    return (
      <Box sx={{ 
        px: 1.5, py: 0.4, borderRadius: 0.5, fontSize: '0.65rem', fontWeight: 900,
        bgcolor: styles.bg,
        color: styles.text,
        textTransform: 'uppercase',
        minWidth: '100px', // Uniform width to match Master Logs
        display: 'inline-flex',
        justifyContent: 'center'
      }}>
        {role || 'CLIENT'}
      </Box>
    );
  };

  const filterStyle = {
    backgroundColor: inputBg,
    borderRadius: 2,
    '& .MuiOutlinedInput-root': {
      '& input': { backgroundColor: 'transparent' },
      '& .MuiSelect-select': { backgroundColor: 'transparent' },
      '& fieldset': { border: isDarkMode ? 'none' : '1px solid #e2e8f0' },
      '&:hover fieldset': { border: isDarkMode ? 'none' : '1px solid #cbd5e1' },
      '&.Mui-focused fieldset': { border: `1px solid ${theme.palette.primary.main}` }
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 5 }, bgcolor: pageBg, minHeight: '100vh' }}>
      <Container maxWidth="xl">
        {/* HEADER SECTION */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4, borderBottom: `2px solid ${isDarkMode ? '#3b82f6' : '#1e3a8a'}`, pb: 2 }}>
          <HistoryIcon sx={{ fontSize: 32, color: isDarkMode ? '#3b82f6' : '#1e3a8a' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>ACTIVITY HISTORY</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 1 }}>SYSTEM AUDIT LOGS</Typography>
          </Box>
        </Stack>

        {/* FILTERS */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4 }}>
          <TextField 
            fullWidth placeholder="Search name, action, or file..." value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment> }} 
            sx={filterStyle} 
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
            {!isMobile && (
              <TableContainer component={Paper} sx={{ bgcolor: cardBg, borderRadius: 1, border: `1px solid ${borderCol}`, boxShadow: 'none' }}>
                <Table>
                  <TableHead sx={{ bgcolor: headerBg }}>
                    <TableRow>
                      <TableCell sx={{ color: 'white', fontWeight: 700, py: 2.5, width: '200px' }} align="center">PERFORMED BY</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700, width: '150px' }} align="center">ROLE</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">ACTION</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>TARGET PDF</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>DETAILS</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>DATE</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell sx={{ width: '200px' }}>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                            {log.profiles?.full_name || 'System User'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ width: '150px' }} align="center">
                          <RoleChip role={log.profiles?.role} />
                        </TableCell>
                        <TableCell align="center">
                          <ActionButton action={log.action_type} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{log.pdfs?.title || '—'}</TableCell>
                        <TableCell sx={{ maxWidth: 300, color: 'text.secondary', fontSize: '0.85rem' }}>{log.description || '—'}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>{new Date(log.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {isMobile && (
              <Stack spacing={2}>
                {filteredLogs.map((log) => (
                  <Card key={log.id} sx={{ bgcolor: cardBg, borderRadius: 1, border: `1px solid ${borderCol}`, boxShadow: 'none' }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                        <Typography sx={{ fontWeight: 700 }}>{log.profiles?.full_name}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>{new Date(log.created_at).toLocaleDateString()}</Typography>
                      </Stack> 
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={700}>ROLE</Typography><br/>
                          <RoleChip role={log.profiles?.role} />
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={700}>ACTION</Typography><br/>
                          <ActionButton action={log.action_type} />
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={700}>TARGET PDF</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{log.pdfs?.title || '—'}</Typography>
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