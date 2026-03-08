import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Typography, CircularProgress, Chip 
} from '@mui/material';
import { supabase } from '../../supabaseClient';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        id, 
        action_type, 
        created_at, 
        description,
        pdfs!fk_audit_logs_pdf_id(title),
        profiles!fk_audit_logs_user_id(full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching logs:", error);
    else setLogs(data || []);
    setLoading(false);
  };

  // Helper to determine color based on action
  const getActionColor = (action) => {
    switch (action) {
      case 'Upload': return 'success';
      case 'Edit': return 'warning';
      case 'Delete Request': return 'error';
      default: return 'primary';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>Activity History</Typography>
      
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: '#213C51' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Performed By</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Action</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Target PDF</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Details</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>{log.profiles?.full_name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Chip 
                        // Label mapping for "Edit PDF"
                        label={log.action_type === 'Edit' ? 'Edit PDF' : (log.action_type || 'N/A')} 
                        color={getActionColor(log.action_type)} 
                        variant="outlined"
                        sx={{ 
                          fontWeight: 'bold',
                          px: 1,           // Large horizontal padding
                          py: 2,           // Large vertical padding
                          fontSize: '0.75rem',
                          borderRadius: '20px', // Perfect pill/capsule shape
                          height: '30px'   // Fixed height for consistency
                        }}
                      />
                    </TableCell>
                    <TableCell>{log.pdfs?.title || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: '#555' }}>
                      {log.description || '—'}
                    </TableCell>
                    <TableCell>{new Date(log.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">No activity logs found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Box>
  );
};

export default Logs;