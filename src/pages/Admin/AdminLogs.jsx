import React, { useState, useEffect } from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, CircularProgress, Chip } from '@mui/material';
import { supabase } from '../../supabaseClient';

const AdminLogs = () => {
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

    if (error) {
      console.error("Error fetching logs:", error);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  // Helper to color-code actions
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
      
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
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
                    <TableCell>{log.profiles?.full_name || 'System'}</TableCell>
                    <TableCell>
                      <Chip 
                        // Label dynamically changed to "Edit PDF" for better clarity
                        label={log.action_type === 'Edit' ? 'Edit PDF' : log.action_type} 
                        size="large" 
                        color={getActionColor(log.action_type)} 
                        variant="outlined" 
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell>{log.pdfs?.title || 'N/A'}</TableCell>
                    <TableCell sx={{ fontSize: '0.85rem', color: '#555' }}>
                      {log.description || '-'}
                    </TableCell>
                    <TableCell>{new Date(log.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>No activity logs found.</TableCell>
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