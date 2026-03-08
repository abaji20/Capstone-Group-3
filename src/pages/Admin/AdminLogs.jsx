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
    // Added 'description' to the select query
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
                {/* New Header for Details */}
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
                        label={log.action_type === 'Edit' ? 'Edit PDF' : log.action_type || 'N/A'} 
                        size="large" 
                        color="primary" 
                        variant="outlined" 
                      />
                    </TableCell>
                    <TableCell>{log.pdfs?.title || 'Deleted PDF'}</TableCell>
                    {/* Displaying the description data here */}
                    <TableCell sx={{ fontSize: '0.85rem', color: '#555' }}>
                      {log.description || '-'}
                    </TableCell>
                    <TableCell>{new Date(log.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  {/* Updated colSpan to 5 to account for the new column */}
                  <TableCell colSpan={5} align="center">No logs found.</TableCell>
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