import React, { useState, useEffect } from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress } from '@mui/material';
import { PageHeader, StatusChip } from '../../shared';
import { supabase } from '../../supabaseClient';

const PendingActions = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    setLoading(true);
    
    // 1. Fetch from delete_requests
    const { data, error } = await supabase
      .from('delete_requests')
      .select(`
        id, 
        reason, 
        status, 
        pdfs!delete_requests_pdf_id_fkey(title) 
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching:", error);
    } else {
      // 2. Transform the data so status is always uppercase
      const formattedData = data.map(req => ({
        ...req,
        status: req.status ? req.status.toUpperCase() : 'PENDING'
      }));
      setRequests(formattedData);
    }
    setLoading(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader 
        title="Pending Deletion Actions" 
        subtitle="Track the status of your deletion requests awaiting Super Admin approval." 
      />
      <TableContainer component={Paper} sx={{ mt: 3, borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ p: 1, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell><strong>Document Title</strong></TableCell>
                <TableCell><strong>Reason for Deletion</strong></TableCell>
                <TableCell><strong>Current Status</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.length > 0 ? (
                requests.map((req) => (
                  <TableRow key={req.id} hover>
                    <TableCell>{req.pdfs?.title || 'Unknown Title'}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{req.reason}</TableCell>
                    <TableCell>
                      <StatusChip status={req.status || 'Pending'} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center">No pending requests found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Box>
  );
};

export default PendingActions;