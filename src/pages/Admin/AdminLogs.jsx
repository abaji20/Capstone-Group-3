import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Typography, CircularProgress, Chip, Stack, MenuItem, TextField, InputAdornment 
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
        log.action_type?.toLowerCase().includes(term)
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

  const getActionColor = (action) => {
    switch (action) {
      case 'Upload': return 'success';
      case 'Edit': return 'warning';
      case 'Delete Request': return 'error';
      case 'Download': return 'info';
      default: return 'primary';
    }
  };

  return (
    <Box sx={{ p: 5, background: 'linear-gradient(135deg, #e0f7fa 0%, #80deea 100%)', minHeight: '100vh' }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3, borderBottom: '2px solid #1e3a8a', pb: 2 }}>
        <HistoryIcon sx={{ fontSize: 32, color: '#1e3a8a' }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>ACTIVITY HISTORY</Typography>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>SYSTEM AUDIT LOGS</Typography>
        </Box>
      </Stack>

      {/* FILTER AREA - Updated design for consistency */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField 
          variant="outlined"
          placeholder="Search name, action, or file..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          InputProps={{ 
            startAdornment: <InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment>
          }} 
          sx={{ width: 700, bgcolor: 'white', borderRadius: 1 }}
        />

        <TextField 
          select 
          variant="outlined" 
          label="Filter Role" 
          value={roleFilter} 
          onChange={(e) => setRoleFilter(e.target.value)} 
          sx={{ width: 140, bgcolor: 'white', borderRadius: 1 }}
        >
          <MenuItem value="All">All Roles</MenuItem>
          <MenuItem value="admin">Admin</MenuItem>
          <MenuItem value="client">Client</MenuItem>
        </TextField>

        {/* Date Picker - Using native input to trigger your system's month/year selector */}
        <TextField 
          variant="outlined"
          type="month"
          label="Filter Month/Year" 
          value={dateFilter} 
          onChange={(e) => setDateFilter(e.target.value)} 
          InputLabelProps={{ shrink: true }}
          sx={{ width: 180, bgcolor: 'white', borderRadius: 1 }}
        />
      </Box>
      
      
      <TableContainer component={Paper} sx={{ borderRadius: 1.5, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', backgroundColor: 'rgba(255, 255, 255, 0.8)' }}>
        {loading ? <Box sx={{ p: 8, textAlign: 'center' }}><CircularProgress /></Box> : (
          <Table>
            <TableHead sx={{ bgcolor: '#1e3a8a' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}><PersonOutlineIcon sx={{ verticalAlign: 'middle', mr: 1 }} />PERFORMED BY</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}><CategoryIcon sx={{ verticalAlign: 'middle', mr: 1 }} />ACTION</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}><DescriptionIcon sx={{ verticalAlign: 'middle', mr: 1 }} />TARGET PDF</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>DETAILS</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}><CalendarTodayIcon sx={{ verticalAlign: 'middle', mr: 1 }} />DATE</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Box sx={{ 
                        px: 1.2, py: 0.4, borderRadius: 1, width: 70, textAlign: 'center', fontSize: '0.7rem', fontWeight: 800,
                        bgcolor: log.profiles?.role?.toLowerCase() === 'admin' ? '#fee2e2' : '#dbeafe',
                        color: log.profiles?.role?.toLowerCase() === 'admin' ? '#991b1b' : '#1e40af',
                        border: `1px solid ${log.profiles?.role?.toLowerCase() === 'admin' ? '#fecaca' : '#bfdbfe'}`
                      }}>
                        {log.profiles?.role?.toUpperCase() || 'CLIENT'}
                      </Box>
                      <Typography sx={{ fontWeight: 600 }}>{log.profiles?.full_name || 'System User'}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip label={log.action_type} color={getActionColor(log.action_type)} sx={{ fontWeight: 700, borderRadius: '8px', minWidth: '110px' }} />
                  </TableCell>
                  <TableCell sx={{ fontStyle: 'italic' }}>{log.pdfs?.title || '—'}</TableCell>
                  <TableCell>{log.description || '—'}</TableCell>
                  <TableCell>{new Date(log.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Box>
  );
};

export default AdminLogs;