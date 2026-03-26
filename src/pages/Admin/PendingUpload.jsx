import React, { useEffect, useState } from 'react';
import { 
  Box, Paper, Typography, Button, Stack, CircularProgress, 
  useTheme, useMediaQuery, Container, Avatar, Collapse, Divider
} from '@mui/material';
import { CheckCircle, Cancel, PictureAsPdf, ExpandMore, ExpandLess, HourglassEmpty } from '@mui/icons-material';
import { supabase } from '../../supabaseClient';

const PendingUpload = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const pageBg = isDarkMode ? '#141b2d' : '#f8fafc'; 
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  const borderCol = isDarkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0';

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { fetchPendingRequests(); }, []);

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('pdfs').getPublicUrl(path);
    return data.publicUrl;
  };

  const fetchPendingRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('upload_requests')
      .select('*')
      .eq('status', 'pending');
    setRequests(data || []);
    setLoading(false);
  };

  const handleApprove = async (req) => {
    const { error: insertError } = await supabase.from('pdfs').insert([{
      title: req.title,
      author: req.author,
      description: req.description,
      genre: req.genre,
      category: req.category,
      published_date: req.published_date,
      file_url: req.pdf_url,
      image_url: req.cover_url
    }]);

    if (insertError) {
      console.error("Error inserting PDF:", insertError);
      return;
    }

    await supabase.from('upload_requests').update({ status: 'approved' }).eq('id', req.id);
    fetchPendingRequests();
  };

  const handleReject = async (reqId) => {
    await supabase.from('upload_requests').update({ status: 'rejected' }).eq('id', reqId);
    fetchPendingRequests();
  };

  return (
    <Box sx={{ p: { xs: 2, md: 5 }, bgcolor: pageBg, minHeight: '100vh' }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 4, borderBottom: `2px solid ${isDarkMode ? '#3b82f6' : '#1e3a8a'}`, pb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>PENDING UPLOADS</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>REVIEW SUBMITTED INFORMATION</Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
        ) : requests.length > 0 ? (
          <Stack spacing={2}>
            {requests.map((req) => (
              <Paper key={req.id} sx={{ p: 3, bgcolor: cardBg, borderRadius: 1.5, border: `1px solid ${borderCol}` }}>
                <Stack direction={isMobile ? 'column' : 'row'} spacing={2} alignItems="center" justifyContent="space-between">
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ flexGrow: 1 }}>
                    <Avatar variant="rounded" src={getImageUrl(req.cover_url)} sx={{ width: 70, height: 90, bgcolor: 'divider' }}>
                      <PictureAsPdf />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{req.title}</Typography>
                      <Typography variant="body1" color="text.secondary">{req.author} | {req.genre}</Typography>
                      <Button 
                        size="small" 
                        onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                        startIcon={expandedId === req.id ? <ExpandLess /> : <ExpandMore />}
                        sx={{ mt: 0.5, textTransform: 'none', fontWeight: 700 }}
                      >
                        {expandedId === req.id ? "Hide Details" : "View Details"}
                      </Button>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={1.5}>
                    <Button variant="contained" onClick={() => handleApprove(req)} startIcon={<CheckCircle />} sx={{ bgcolor: '#16a34a', fontWeight: 800 }}>Approve</Button>
                    <Button variant="contained" onClick={() => handleReject(req.id)} startIcon={<Cancel />} sx={{ bgcolor: '#dc2626', fontWeight: 800 }}>Reject</Button>
                  </Stack>
                </Stack>

                <Collapse in={expandedId === req.id} timeout="auto" unmountOnExit>
                  <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: isDarkMode ? 'rgba(0,0,0,0.2)' : '#f8fafc' }}>
                    <Divider sx={{ mb: 2 }} />
                    <Stack spacing={1}>
                      <Typography variant="body1"><strong>Category:</strong> {req.category || 'Not specified'}</Typography>
                      <Typography variant="body1"><strong>Published Date:</strong> {req.published_date || 'N/A'}</Typography>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>Description:</Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                          {req.description || 'No description provided.'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Collapse>
              </Paper>
            ))}
          </Stack>
        ) : (
          /* EMPTY STATE - Shown when requests.length === 0 */
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              py: 10,
              opacity: 0.6 
            }}
          >
            <HourglassEmpty sx={{ fontSize: 60, mb: 2, color: 'text.secondary' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              No pending uploads found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All submitted documents have been processed.
            </Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default PendingUpload;