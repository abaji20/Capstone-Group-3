import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Typography, 
  CircularProgress 
} from '@mui/material';
import { PageHeader, PrimaryButton, DeleteButton } from '../../shared';
import { supabase } from '../../supabaseClient';

const DeleteRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    // Fetching join data for clear identification of PDF and user
    const { data, error } = await supabase
      .from('delete_requests')
      .select(`
        id, 
        pdf_id,
        reason, 
        created_at,
        pdfs(id, title),
        profiles(full_name)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching requests:", error);
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  const handleApprove = async (requestId, pdfId) => {
    // 1. Move PDF to Archive by setting is_archived to true
    const { error: archiveError } = await supabase
      .from('pdfs')
      .update({ is_archived: true }) 
      .eq('id', pdfId);

    // 2. Mark the request as approved so it disappears from this view
    const { error: requestError } = await supabase
      .from('delete_requests')
      .update({ status: 'approved' })
      .eq('id', requestId);

    if (!archiveError && !requestError) {
      alert("File successfully moved to Archive.");
      fetchRequests();
    } else {
      console.error("Approval error:", archiveError || requestError);
      alert("Error processing approval.");
    }
  };

  const handleReject = async (requestId) => {
    // Mark request as rejected without moving the PDF
    const { error } = await supabase
      .from('delete_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (!error) {
      alert("Deletion request rejected.");
      fetchRequests();
    } else {
      alert("Error rejecting request.");
    }
  };

  return (
    <Box>
      <PageHeader 
        title="Delete Requests" 
        subtitle="Review and approve permanent deletion requests from Admins." 
      />

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        {loading ? (
          <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: '#2c3e50' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>File Title</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Requested By</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Reason</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.length > 0 ? (
                requests.map((req) => (
                  <TableRow key={req.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{req.pdfs?.title || 'Unknown'}</TableCell>
                    <TableCell>{req.profiles?.full_name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                        "{req.reason}"
                      </Typography>
                    </TableCell>
                    <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <PrimaryButton 
                        size="small" 
                        onClick={() => handleApprove(req.id, req.pdfs.id)}
                        sx={{ mr: 1, bgcolor: '#2e7d32' }}
                      >
                        Approve
                      </PrimaryButton>
                      <DeleteButton onClick={() => handleReject(req.id)} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                    <Typography color="textSecondary">No pending deletion requests.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Box>
  );
};

export default DeleteRequests;