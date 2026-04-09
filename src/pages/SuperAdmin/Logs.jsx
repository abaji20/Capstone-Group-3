import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Typography, CircularProgress, Stack, MenuItem, TextField, 
  InputAdornment, useTheme, useMediaQuery, Container, Card, CardContent,
  Button, IconButton, Dialog, DialogActions, DialogContent, 
  DialogContentText, DialogTitle
} from '@mui/material';
import { supabase } from '../../supabaseClient';

// Icons
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

const Logs = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); 

  // --- DARK MODE LAYOUT COLORS ---
  const pageBg = isDarkMode ? '#0f172a' : '#ffffff'; 
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

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteConfig, setDeleteConfig] = useState({ type: null, id: null });

  useEffect(() => { fetchLogs(); }, []);
  useEffect(() => { applyFilters(); }, [logs, searchTerm, roleFilter, dateFilter]);

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

  const getTargetName = (log) => {
    if (log.pdfs?.title) return log.pdfs.title;
    const desc = log.description || "";
    if (log.action_type?.toUpperCase().includes('ACCOUNT')) {
      if (desc.includes('account for ')) return desc.split('account for ').pop();
      if (desc.includes('for ')) return desc.split('for ').pop();
      if (desc.includes('Updated ')) return desc.split('Updated ')[1].split(':')[0];
    }
    return "—";
  };

  const openConfirm = (type, id = null) => {
    setDeleteConfig({ type, id });
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setConfirmOpen(false);
    if (deleteConfig.type === 'single') {
      const { error } = await supabase.from('audit_logs').delete().eq('id', deleteConfig.id);
      if (!error) fetchLogs();
    } else if (deleteConfig.type === 'all') {
      const { error } = await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (!error) fetchLogs();
    }
  };

  const getActionStyles = (action, darkMode) => { 
    const type = action?.toLowerCase();
    if (darkMode) {
        if (type?.includes('upload')) return { bg: 'transparent', text: '#4ade80', label: 'UPLOAD' };
        if (type?.includes('edit')) return { bg: 'transparent', text: '#facc15', label: 'EDIT' }; 
        if (type?.includes('delete')) return { bg: 'transparent', text: '#f87171', label: 'DELETE' };
        if (type?.includes('download')) return { bg: 'transparent', text: '#6171ff', label: 'DOWNLOAD' };
        if (type?.includes('create')) return { bg: 'transparent', text: '#01a8f0', label: 'CREATE' };
        return { bg: 'transparent', text: '#94a3b8', label: action?.toUpperCase() };
    } else {
        if (type?.includes('upload')) return { bg: '#2F6B3F', text: '#FBF6F6', label: 'UPLOAD' };
        if (type?.includes('edit')) return { bg: '#ffd500', text: '#7c6800', label: 'EDIT' }; 
        if (type?.includes('delete')) return { bg: '#A82323', text: '#ffffff', label: 'DELETE' };
        if (type?.includes('download')) return { bg: '#261CC1', text: '#ffffff', label: 'DOWNLOAD' };
        if (type?.includes('create')) return { bg: '#003052', text: '#ffffff', label: 'CREATE' };
        return { bg: '#f1f5f9', text: '#475569', label: action?.toUpperCase() };
    }
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

  const ActionButton = ({ action }) => {
    const style = getActionStyles(action, isDarkMode);
    return (
      <Box sx={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '120px', py: 0.5, borderRadius: '4px', fontWeight: 800, fontSize: '0.7rem',
          bgcolor: style.bg,
          color: style.text,
          border: isDarkMode ? `1px solid ${style.text}` : 'none',
        }}>
        {style.label}
      </Box>
    );
  };

  const RoleChip = ({ role }) => {
    const style = getRoleStyles(role, isDarkMode);
    return (
      <Box sx={{ 
        px: 1.5, py: 0.4, borderRadius: 0.5, 
        fontSize: '0.65rem', fontWeight: 900, 
        bgcolor: style.bg, color: style.text, display: 'inline-flex', 
        justifyContent: 'center', minWidth: '100px'
      }}>
        {role?.toUpperCase() || 'CLIENT'}
      </Box>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 5   }, bgcolor: pageBg, minHeight: '100vh' }}>
      <Container maxWidth="xl">
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          justifyContent="space-between" 
          alignItems={{ xs: 'flex-start', sm: 'center' }} 
          spacing={2}
          mb={5}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box>
              <Typography 
                variant="h3" 
                fontWeight="900" 
                sx={{ 
                  fontStyle: 'italic',
                  color: isDarkMode ? '#ffffff' : '#213C51', 
                  fontFamily: "'Montserrat', sans-serif", 
                  fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
                  letterSpacing: '1px'
                }}
              >
                ACTIVITY LOGS
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, display: 'block' }}>
                SUPERADMIN MASTER AUDIT TRAIL
              </Typography>
            </Box>
          </Stack>
          <Button 
            variant="contained" 
            color="error" 
            startIcon={<DeleteSweepIcon />} 
            onClick={() => openConfirm('all')} 
            sx={{ fontWeight: 700, borderRadius: 0.5}}
          >
            Clear All Logs
          </Button>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4 }}>
          <TextField 
            fullWidth 
            placeholder="Search all activities..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            sx={{ flexGrow: 1, bgcolor: inputBg, borderRadius: 0.5 }}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="secondary" /></InputAdornment>) }}
          />
          
          <TextField
            type="month"
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
                  <CalendarTodayIcon fontSize="small" sx={{ color: isDarkMode ? '#ffffff' : 'secondary.main' }} />
                </InputAdornment>
              )
            }}
          />

          <TextField 
            select 
            size="medium" 
            label="Filter Role" 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)} 
            sx={{ minWidth: 200, bgcolor: inputBg, borderRadius: 0.5 }}
          >
            <MenuItem value="All">All Roles</MenuItem>
            <MenuItem value="superadmin">Superadmin</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="client">Client</MenuItem>
          </TextField>
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress color="secondary" /></Box>
        ) : (
          <>
            {!isMobile ? (
              <TableContainer component={Paper} sx={{ bgcolor: cardBg, borderRadius: 1, border: `1px solid ${borderCol}`, boxShadow: 'none' }}>
                <Table>
                  <TableHead sx={{ bgcolor: headerBg }}>
                    <TableRow>
                      <TableCell sx={{ color: 'white', fontWeight: 700, width: '250px' }}>PERFORMED BY</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700, width: '150px' }} align="center">ROLE</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">ACTION</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>TARGET</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>DETAILS</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>DATE</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">MANAGE</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell sx={{ width: '250px' }}>
                            <Stack spacing={0}>
                                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem'}}>
                                {log.profiles?.full_name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                {log.profiles?.email}
                                </Typography>
                            </Stack>
                        </TableCell>  
                        <TableCell align="center" sx={{ width: '150px' }}>
                          <RoleChip role={log.profiles?.role} />
                        </TableCell>
                        <TableCell align="center">
                          <ActionButton action={log.action_type} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: isDarkMode ? '#f5f5f5' : '#000000' }}>
                            {getTargetName(log)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>{log.description}</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{new Date(log.created_at).toLocaleDateString()}</TableCell>
                        <TableCell align="center">
                          <IconButton onClick={() => openConfirm('single', log.id)} color="error" size="medium"><DeleteOutlineIcon fontSize="medium" /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Stack spacing={2}>
                {filteredLogs.map((log) => (
                  <Card key={log.id} sx={{ bgcolor: cardBg, borderRadius: 1, border: `1px solid ${borderCol}`, boxShadow: 'none' }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                        <Stack direction="column" spacing={0.5}>
                            <Typography sx={{ fontWeight: 700 }}>{log.profiles?.full_name}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.80rem', lineHeight: 1 }}>
                                {log.profiles?.email}
                            </Typography> 
                            <RoleChip role={log.profiles?.role} />  
                        </Stack>
                        <IconButton onClick={() => openConfirm('single', log.id)} color="error" size="small"><DeleteOutlineIcon fontSize="small" /></IconButton>
                      </Stack>
                      <Stack spacing={2}>
                        <Box><Typography variant="caption" color="text.secondary" fontWeight={700}>ACTION</Typography><br/><ActionButton action={log.action_type} /></Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={700}>TARGET</Typography>
                          <Typography variant="body2" fontWeight={800} color="secondary">{getTargetName(log)}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={700}>DETAILS</Typography>
                          <Typography variant="body2" color="text.secondary" fontSize="0.85rem">{log.description || '—'}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </>
        )}

        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} PaperProps={{ sx: { bgcolor: cardBg, borderRadius: 1, width: '400px' } }}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><WarningAmberIcon color="error" /> Confirm Deletion</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: 'text.primary', fontWeight: 600 }}>
              {deleteConfig.type === 'all' ? "Permanently clear ALL system logs?" : "Delete this log entry?"}
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ pb: 2, px: 3 }}>
            <Button onClick={() => setConfirmOpen(false)} sx={{ color: 'text.secondary', fontWeight: 700 }}>Cancel</Button>
            <Button onClick={handleConfirmDelete} variant="contained" color="error" sx={{ fontWeight: 700, borderRadius: 1 }}>Delete Permanently</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default Logs;