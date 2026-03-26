import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, CircularProgress, Typography, Stack, Chip, useTheme, useMediaQuery 
} from '@mui/material';
import { supabase } from '../../supabaseClient';

// Icons
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DescriptionIcon from '@mui/icons-material/Description';

const PendingActions = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Styles
  const pageBg = isDarkMode 
    ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' 
    : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)';
  
  const cardBg = isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)';
  const headerBg = isDarkMode ? '#334155' : '#1e3a8a';

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('delete_requests')
      .select(`id, reason, status, created_at, pdfs(title)`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching:", error);
    } else {
      setRequests(data.map(req => ({
        ...req,
        status: req.status ? req.status.toUpperCase() : 'PENDING'
      })));
    }
    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'error';
      default: return 'warning';
    }
  };

  return (
    <Box sx={{ 
      p: { xs: 2, sm: 3, md: 4 }, 
      background: pageBg, 
      minHeight: '100vh',
      transition: 'all 0.3s ease'
    }}>
      {/* Header Section */}
      <Stack 
        direction={{ xs: 'column', sm: 'row' }} 
        alignItems={{ xs: 'flex-start', sm: 'center' }} 
        spacing={2} 
        sx={{ mb: 4 }}
      >
        <PendingActionsIcon sx={{ fontSize: { xs: 40, md: 50 }, color: isDarkMode ? '#38bdf8' : '#1e3a8a' }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: isDarkMode ? '#f8fafc' : '#0f172a', fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
            Pending Deletions
          </Typography>
          <Typography variant="body2" sx={{ color: isDarkMode ? '#94a3b8' : '#1e3a8a', fontWeight: 600 }}>
            Manage and track document removal requests.
          </Typography>
        </Box>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}><CircularProgress /></Box>
      ) : isMobile ? (
        /* MOBILE VIEW: Card List */
        <Stack spacing={2}>
          {requests.map((req) => (
            <Paper key={req.id} sx={{ p: 2, borderRadius: 1, bgcolor: cardBg, borderLeft: `6px solid ${theme.palette[getStatusColor(req.status)].main}` }}>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>
                    {req.pdfs?.title || 'Untitled Document'}
                  </Typography>
                  <Chip label={req.status} color={getStatusColor(req.status)} size="small" sx={{ fontWeight: 700, borderRadius: 1 }} />
                </Stack>
                
                <Typography variant="body2" sx={{ color: isDarkMode ? '#cbd5e1' : '#475569', fontStyle: 'italic' }}>
                  "{req.reason}"
                </Typography>

                <Stack direction="row" alignItems="center" spacing={1} sx={{ pt: 1, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                  <AccessTimeIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                    Requested on {new Date(req.created_at).toLocaleDateString()}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : (
        /* DESKTOP VIEW: Professional Table */
        <TableContainer component={Paper} sx={{ borderRadius: 1, overflow: 'hidden', bgcolor: cardBg }}>
          <Table>
            <TableHead sx={{ bgcolor: headerBg }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 800 }}>DOCUMENT</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 800 }}>REASON</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 800 }}>STATUS</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 800 }}>DATE</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{req.pdfs?.title}</TableCell>
                  <TableCell>{req.reason}</TableCell>
                  <TableCell>
                    <Chip label={req.status} color={getStatusColor(req.status)} variant="outlined" sx={{ fontWeight: 700 }} />
                  </TableCell>
                  <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default PendingActions;