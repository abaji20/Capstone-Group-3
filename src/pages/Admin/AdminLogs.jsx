import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Typography, CircularProgress, Chip, Stack, Avatar 
} from '@mui/material';
import { supabase } from '../../supabaseClient';

// Modern Icons for clarity
import HistoryIcon from '@mui/icons-material/History';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CategoryIcon from '@mui/icons-material/Category';
import DescriptionIcon from '@mui/icons-material/Description';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    // Using the specific constraint name avoids PGRST201 ambiguity errors
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

  const getActionColor = (action) => {
    switch (action) {
      case 'Upload': return 'success';
      case 'Edit': return 'warning';
      case 'Delete Request': return 'error';
      default: return 'primary';
    }
  };

  return (
    <Box sx={{ 
      p: 5, 
      background: 'linear-gradient(135deg, #e0f7fa 0%, #80deea 100%)', 
      minHeight: '100vh',
      fontFamily: "'Inter', sans-serif" // Professional dashboard font
    }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3, borderBottom: '2px solid #1e3a8a', pb: 2 }}>
        <HistoryIcon sx={{ fontSize: 32, color: '#1e3a8a' }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
            ACTIVITY HISTORY
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, letterSpacing: '1px' }}>
            SYSTEM AUDIT LOGS
          </Typography>
        </Box>
      </Stack>
      
      <TableContainer component={Paper} sx={{ 
        borderRadius: 4, 
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(255, 255, 255, 0.8)'
      }}>
        {loading ? (
          <Box sx={{ p: 8, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
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
              {logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id} hover sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.5)' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>{log.profiles?.full_name || 'System Admin'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={log.action_type === 'Edit' ? 'Edit PDF' : log.action_type} 
                        color={getActionColor(log.action_type)} 
                        variant="filled"
                        sx={{ fontWeight: 700, borderRadius: '8px', minWidth: '110px' }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontStyle: 'italic', fontWeight: 500 }}>{log.pdfs?.title || '—'}</TableCell>
                    <TableCell sx={{ color: '#334155' }}>{log.description || '—'}</TableCell>
                    <TableCell>{new Date(log.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5 }}>No activity logs found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Box>
  );
};

export default AdminLogs;