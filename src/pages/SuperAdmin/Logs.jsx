import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Typography, CircularProgress, Chip, Stack, InputAdornment, TextField
} from '@mui/material';
import { supabase } from '../../supabaseClient';
import HistoryIcon from '@mui/icons-material/History';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CategoryIcon from '@mui/icons-material/Category';
import DescriptionIcon from '@mui/icons-material/Description';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SearchIcon from '@mui/icons-material/Search';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
  setLoading(true);
  // Specify the exact constraint name 'audit_logs_pdf_id_fkey'
  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      id, 
      action_type, 
      created_at, 
      description,
      pdfs!audit_logs_pdf_id_fkey(title),
      profiles!fk_audit_logs_user_id(full_name)
    `)
    .order('created_at', { ascending: false });

  if (error) console.error("Error fetching logs:", error);
  else setLogs(data || []);
  setLoading(false);
};

  // Updated safe filter logic
  const filteredLogs = logs.filter((log) => {
    const userName = log.profiles?.full_name?.toLowerCase() || '';
    const pdfTitle = log.pdfs?.title?.toLowerCase() || 'deleted pdf';
    return userName.includes(searchTerm.toLowerCase()) || pdfTitle.includes(searchTerm.toLowerCase());
  });

  const getActionColor = (action) => {
    switch (action) {
      case 'Upload': return 'success';
      case 'Edit': return 'warning';
      case 'Delete Request': return 'error';
      default: return 'primary';
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, background: 'linear-gradient(160deg, #e0f7fa 0%, #b2ebf2 100%)', minHeight: '100vh' }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <HistoryIcon sx={{ fontSize: 35, color: '#1e3a8a' }} />
        <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a' }}>Activity History</Typography>
      </Stack>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(8px)' }}>
        <TextField 
          placeholder="Search logs..." 
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: 350, bgcolor: 'white', borderRadius: 2 }}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment>) }}
        />
      </Paper>
      
      <TableContainer component={Paper} sx={{ borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.8)' }}>
        {loading ? (
          <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: '#1e3a8a' }}>
              <TableRow>
                <TableCell sx={{ color: 'white' }}>PERFORMED BY</TableCell>
                <TableCell sx={{ color: 'white' }}>ACTION</TableCell>
                <TableCell sx={{ color: 'white' }}>TARGET PDF</TableCell>
                <TableCell sx={{ color: 'white' }}>DETAILS</TableCell>
                <TableCell sx={{ color: 'white' }}>DATE</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell sx={{ fontWeight: 600 }}>{log.profiles?.full_name || 'System'}</TableCell>
                  <TableCell>
                    <Chip label={log.action_type} color={getActionColor(log.action_type)} size="small" />
                  </TableCell>
                  <TableCell sx={{ fontStyle: 'italic' }}>
                    {log.pdfs?.title || <span style={{ color: '#999' }}>Deleted PDF</span>}
                  </TableCell>
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

export default Logs;