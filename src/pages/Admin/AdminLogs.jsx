import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Stack, Typography, MenuItem, TextField, InputAdornment, 
  useTheme, useMediaQuery, Container, Card, CardContent, CircularProgress
} from '@mui/material';
import { supabase } from '../../supabaseClient';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import FilterListIcon from '@mui/icons-material/FilterList';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';

const AdminLogs = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); 

  // --- DARK MODE LAYOUT COLORS ---
  const pageBg = isDarkMode ? '#0f172a' : '#ffffff'; 
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  const inputBg = isDarkMode ? '#28334e' : '#f1f5f9'; 
  const headerBg = isDarkMode ? '#0f172a' : '#213C51';
  const borderCol = isDarkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0';

  // --- STATE ---
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => { fetchLogs(); }, []);
  useEffect(() => { applyFilters(); }, [logs, searchTerm, roleFilter, dateFilter]);

  // --- DATE FORMATTER FUNCTION (MM/DD/YYYY) ---
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id, 
          action_type, 
          created_at, 
          description,
          pdfs(title),
          profiles!audit_logs_user_id_fkey1(full_name, role, email)
        `) 
        .order('created_at', { ascending: false });
  
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let tempLogs = [...logs];
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

  const getRoleStyles = (role, darkMode) => {
    const r = role?.toLowerCase();
    if (darkMode) {
        if (r === 'superadmin') return { bg: '#f3e8ff1a', text: '#d8b4fe' }; 
        if (r === 'admin') return { bg: '#fef3c71a', text: '#fbbf24' }; 
        if (r === 'client') return { bg: '#dbeafe1a', text: '#60a5fa' }; 
        return { bg: '#1e293b', text: '#94a3b8' };
    } else {
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
        minWidth: '100px',
        display: 'inline-flex',
        justifyContent: 'center'
      }}>
        {role || 'CLIENT'}
      </Box>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 5 }, bgcolor: pageBg, minHeight: '100vh' }}>
      <Container maxWidth="xl">
        
        {/* HEADER SECTION */}
        <Box sx={{ mb: 5 }}>
          <Typography 
            variant="h3" 
            sx={{ 
              fontStyle: 'italic', fontWeight: 900, color: isDarkMode ? '#ffffff' : '#213C51', 
              fontFamily: "'Montserrat', sans-serif", fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' }, letterSpacing: '1px'
            }}
          >
            ACTIVITY LOGS
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, display: 'block' }}>
            SYSTEM AUDIT AND USER ACTIVITIES
          </Typography>
        </Box>

        {/* SEARCH AND FILTERS */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4 }}>
          <TextField 
            fullWidth 
            placeholder="Search all activities..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            sx={{ flexGrow: 1, bgcolor: inputBg, borderRadius: 0.5 }}
            InputProps={{ 
                startAdornment: (
                    <InputAdornment position="start">
                        <SearchIcon color="primary" sx={{ opacity: 0.8 }} />
                    </InputAdornment>
                ) 
            }} 
          />
          
          <TextField
            type="date"
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
            label="Filter Role" 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)} 
            sx={{ minWidth: 200, bgcolor: inputBg, borderRadius: 0.5 }}
          >
            <MenuItem value="All">All Roles</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="client">Client</MenuItem>
          </TextField>
        </Stack>

        {/* CONTENT AREA */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress color="primary" /></Box>
        ) : filteredLogs.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 10 }}>
            <AssignmentLateIcon sx={{ fontSize: 60, color: 'text.disabled', opacity: 0.3, mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
              No Activity Logs Found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search or filters to find specific records.
            </Typography>
          </Box>
        ) : (
          <>
            {!isMobile && (
              <TableContainer component={Paper} sx={{ bgcolor: cardBg, borderRadius: 1, border: `1px solid ${borderCol}`, boxShadow: 'none', overflow: 'hidden' }}>
                <Table>
                  <TableHead sx={{ bgcolor: headerBg }}>
                    <TableRow>
                      <TableCell sx={{ color: 'white', fontWeight: 800, py: 2.5, width: '200px' }}>PERFORMED BY</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800, width: '150px' }} align="center">ROLE</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }} align="center">ACTION</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }}>TARGET PDF</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }}>DETAILS</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }}>DATE</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                            {log.profiles?.full_name || 'System User'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <RoleChip role={log.profiles?.role} />
                        </TableCell>
                        <TableCell align="center">
                          <ActionButton action={log.action_type} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{log.pdfs?.title || '—'}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>{log.description || '—'}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                          {/* UPDATED DATE FORMAT */}
                          {formatDate(log.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {isMobile && (
              <Stack spacing={2}>
                {filteredLogs.map((log) => (
                  <Card key={log.id} sx={{ bgcolor: cardBg, borderRadius: 2, border: `1px solid ${borderCol}`, boxShadow: 'none' }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                        <Typography sx={{ fontWeight: 700 }}>{log.profiles?.full_name}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                           {/* UPDATED DATE FORMAT */}
                           {formatDate(log.created_at)}
                        </Typography>
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