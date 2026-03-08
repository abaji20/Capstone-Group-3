import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, CircularProgress, Typography, Stack, Chip 
} from '@mui/material';
import { PageHeader } from '../../shared';
import { supabase } from '../../supabaseClient';

// Icons
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const PendingActions = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('delete_requests')
      .select(`
        id, 
        reason, 
        status, 
        created_at,
        pdfs(title) 
      `)
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching:", error);
    else {
      const formattedData = data.map(req => ({
        ...req,
        status: req.status ? req.status.toUpperCase() : 'PENDING'
      }));
      setRequests(formattedData);
    }
    setLoading(false);
  };

  // Helper for status chip colors
  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'error';
      default: return 'warning';
    }
  };

  return (
    <Box sx={{ 
      p: 4, 
      background: 'linear-gradient(135deg, #e0f7fa 0%, #80deea 100%)', 
      minHeight: '100vh',
      fontFamily: "'Inter', sans-serif" 
    }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
        <PendingActionsIcon sx={{ fontSize: 40, color: '#1e3a8a' }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#0f172a' }}>Pending Deletion Actions</Typography>
          <Typography variant="body2" sx={{ color: '#1e3a8a', fontWeight: 600 }}>Tracking the progress of your document removal requests.</Typography>
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
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>DOCUMENT TITLE</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>REASON</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>STATUS</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>DATE</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.length > 0 ? (
                requests.map((req) => (
                  <TableRow key={req.id} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.5)' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>{req.pdfs?.title || 'Unknown Title'}</TableCell>
                    <TableCell sx={{ color: '#475569' }}>{req.reason}</TableCell>
                    <TableCell>
                      <Chip 
                        label={req.status} 
                        color={getStatusColor(req.status)} 
                        variant="outlined" 
                        sx={{ fontWeight: 700, borderRadius: '8px' }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#64748b' }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <AccessTimeIcon sx={{ fontSize: 16 }} />
                        {new Date(req.created_at).toLocaleDateString()}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 8, color: '#64748b' }}>No requests found.</TableCell>
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