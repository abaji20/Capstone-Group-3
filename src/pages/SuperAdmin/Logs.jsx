import React, { useState, useEffect } from 'react';
import { 
  Box, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Typography, CircularProgress, Chip, Stack, InputAdornment, 
  TextField, MenuItem, Paper
} from '@mui/material';
import { supabase } from '../../supabaseClient';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState(''); // Format: YYYY-MM

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
        id, 
        action_type, 
        created_at, 
        description,
        pdfs!audit_logs_pdf_id_fkey(title),
        profiles!fk_audit_logs_user_id(full_name, role)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching logs:", error);
    } else {
      setLogs(data || []);
    }
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
      tempLogs = tempLogs.filter(log => 
        log.profiles?.role?.toLowerCase() === roleFilter.toLowerCase()
      );
    }

    if (dateFilter) {
      tempLogs = tempLogs.filter(log => log.created_at.startsWith(dateFilter));
    }

    setFilteredLogs(tempLogs);
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'Upload': return 'success';
      case 'Edit': 
      case 'Edit PDF': return 'warning';
      case 'Delete Request': return 'error';
      case 'Download': return 'info';
      default: return 'primary';
    }
  };

  return (
    <Box sx={{ p: 4, minHeight: '100vh', background: 'linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 100%)' }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
        <HistoryIcon sx={{ fontSize: 40, color: '#1e3a8a' }} />
        <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a' }}>
          Activity History
        </Typography>
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
          sx={{ width: 500, bgcolor: 'white', borderRadius: 1 }}
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
      
      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#1e3a8a' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', py: 2 }}>PERFORMED BY</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ACTION</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>TARGET PDF</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>DATE</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 10 }}>
                  <CircularProgress color="primary" />
                </TableCell>
              </TableRow>
            ) : filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <TableRow key={log.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
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
                      <Typography sx={{ fontWeight: 600, color: '#334155' }}>
                        {log.profiles?.full_name || 'System User'}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip label={log.action_type} color={getActionColor(log.action_type)} sx={{ width: 140, fontWeight: 'bold', borderRadius: '6px' }} />
                  </TableCell>
                  <TableCell sx={{ fontStyle: 'italic' }}>{log.pdfs?.title || 'No file associated'}</TableCell>
                  <TableCell>{new Date(log.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 10 }}>
                  <Typography color="text.secondary">No matching logs found.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Logs;