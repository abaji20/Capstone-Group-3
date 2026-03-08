import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Typography, CircularProgress, Stack, IconButton, Tooltip, Avatar
} from '@mui/material';
import { PageHeader } from '../../shared';
import { supabase } from '../../supabaseClient';

// Icons
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import DateRangeIcon from '@mui/icons-material/DateRange';

const DeleteRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    // Updated to select image_url from your 'pdfs' table
    const { data, error } = await supabase
      .from('delete_requests')
      .select(`
        id, 
        pdf_id, 
        reason, 
        created_at, 
        pdfs(id, title, image_url), 
        profiles(full_name)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching:", error);
    else setRequests(data || []);
    setLoading(false);
  };

  const handleApprove = async (requestId, pdfId) => {
    await supabase.from('pdfs').update({ is_archived: true }).eq('id', pdfId);
    await supabase.from('delete_requests').update({ status: 'approved' }).eq('id', requestId);
    fetchRequests();
  };

  const handleReject = async (requestId) => {
    await supabase.from('delete_requests').update({ status: 'rejected' }).eq('id', requestId);
    fetchRequests();
  };

  // Helper to build the image URL
  const getImageUrl = (path) => {
    if (!path) return null;
    return `https://yktwxeyxmzfkxqhlesly.supabase.co/storage/v1/object/public/pdfs/${path}`;
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, background: 'linear-gradient(135deg, #e0f7fa 0%, #80deea 100%)', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <PageHeader title="Delete Requests" subtitle="Authorizing permanent removal of documents." />

      <TableContainer component={Paper} sx={{ borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(15px)', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
        {loading ? (
          <Box sx={{ p: 8, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: '#1e3a8a' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 800, py: 2 }}>DOCUMENT</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 800 }}>REQUESTED BY</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 800 }}>REASON</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 800 }}>DATE</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 800 }} align="center">ACTION</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id} hover sx={{ '&:hover': { bgcolor: 'rgba(230, 245, 255, 0.5)' } }}>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Avatar 
                        variant="rounded" 
                        src={getImageUrl(req.pdfs?.image_url)} 
                        sx={{ width: 45, height: 55, border: '1px solid #e2e8f0', bgcolor: '#f1f5f9' }}
                      >
                        <DescriptionOutlinedIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                      </Avatar>
                      <Typography sx={{ fontWeight: 700, color: '#1e293b' }}>
                        {req.pdfs?.title || 'Unknown File'}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <PersonOutlineIcon sx={{ color: '#64748b', fontSize: 18 }} />
                      {req.profiles?.full_name || 'N/A'}
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ color: '#475569', fontSize: '0.9rem'}}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {req.reason}
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ color: '#64748b' }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <DateRangeIcon sx={{ color: '#94a3b8', fontSize: 16 }} />
                      {new Date(req.created_at).toLocaleDateString()}
                    </Stack>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Approve Request">
                      <IconButton onClick={() => handleApprove(req.id, req.pdfs.id)} sx={{ color: '#16a34a' }}>
                        <CheckCircleOutlineIcon sx={{ fontSize: 40 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Reject Request">
                      <IconButton onClick={() => handleReject(req.id)} sx={{ color: '#dc2626' }}>
                        <HighlightOffIcon sx={{ fontSize: 40 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Box>
  );
};

export default DeleteRequests;