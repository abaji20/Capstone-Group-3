import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Button, Stack, CircularProgress, Divider } from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import { supabase } from '../../supabaseClient';

const PendingUpload = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    setLoading(true);
    // Fetch only requests that are still pending
    const { data } = await supabase
      .from('upload_requests')
      .select('*')
      .eq('status', 'pending');
    setRequests(data || []);
    setLoading(false);
  };

  const handleApprove = async (req) => {
    // 1. Insert into the main 'pdfs' library table
    const { error: insertError } = await supabase.from('pdfs').insert([{
      title: req.title,
      author: req.author,
      description: req.description,
      genre: req.genre,
      category: req.category,
      published_date: req.published_date,
      file_url: req.pdf_url,   // Mapping staging field to main table field
      image_url: req.cover_url // Mapping staging field to main table field
    }]);

    if (insertError) {
      console.error("Error approving request:", insertError);
      return;
    }

    // 2. Mark as approved in the staging table
    await supabase.from('upload_requests').update({ status: 'approved' }).eq('id', req.id);
    fetchPendingRequests();
  };

  const handleReject = async (reqId) => {
    // Mark as rejected in the staging table
    await supabase.from('upload_requests').update({ status: 'rejected' }).eq('id', reqId);
    fetchPendingRequests();
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>Pending Uploads</Typography>
      {loading ? <CircularProgress /> : (
        <Stack spacing={2}>
          {requests.length === 0 ? <Typography>No pending requests found.</Typography> : 
            requests.map((req) => (
              <Paper key={req.id} sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6">{req.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Author: {req.author} | Genre: {req.genre} | Category: {req.category}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => handleApprove(req)}>
                    Approve
                  </Button>
                  <Button variant="outlined" color="error" startIcon={<Cancel />} onClick={() => handleReject(req.id)}>
                    Reject
                  </Button>
                </Stack>
              </Paper>
            ))
          }
        </Stack>
      )}
    </Box>
  );
};

export default PendingUpload;