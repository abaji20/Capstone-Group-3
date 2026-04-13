import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, CircularProgress, Typography, Stack, Chip, useTheme, useMediaQuery, 
  Container, Button, Modal, Fade, Backdrop 
} from '@mui/material';
import { supabase } from '../../supabaseClient';

// Icons
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SpeakerNotesOffIcon from '@mui/icons-material/SpeakerNotesOff';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

const PendingActions = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- DELETE MODAL STATE ---
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });

  const pageBg = isDarkMode ? '#0f172a' : '#f8fafc'; 
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  const headerBg = isDarkMode ? '#0f172a' : '#213C51';
  const borderCol = isDarkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0';

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
        // Standardizing status to uppercase for consistent UI logic
        status: req.status ? req.status.toUpperCase() : 'PENDING'
      })));
    }
    setLoading(false);
  };

  // --- CANCEL REQUEST FUNCTION ---
  const handleCancelRequest = async (id) => {
    // We use 'rejected' here because the database constraint 
    // does not allow the word 'cancelled'
    const { error } = await supabase
      .from('delete_requests')
      .update({ status: 'rejected' }) 
      .eq('id', id);

    if (error) {
      alert("Failed to cancel request: " + error.message);
    } else {
      // We manually set the local state to 'CANCELLED' 
      // so the UI shows what you want
      setRequests(requests.map(req => 
        req.id === id ? { ...req, status: 'CANCELLED' } : req
      ));
    }
  };

  // --- DELETE FUNCTION ---
  const handleDelete = async () => {
    const { error } = await supabase
      .from('delete_requests')
      .delete()
      .eq('id', deleteModal.id);

    if (error) {
      alert("Failed to delete log: " + error.message);
    } else {
      setRequests(requests.filter(req => req.id !== deleteModal.id));
      setDeleteModal({ open: false, id: null });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'REJECTED': 
      case 'CANCELLED': return 'error';
      default: return 'warning';
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 5 }, bgcolor: pageBg, minHeight: '100vh' }}>
      <Container maxWidth="xl">
        
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h3" sx={{ 
              fontStyle: 'italic', fontWeight: 900, color: isDarkMode ? '#ffffff' : '#213C51', 
              fontFamily: "'Montserrat', sans-serif", fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' }, letterSpacing: '1px'
            }}>
              DELETE REQUEST LOGS
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, display: 'block' }}>
              RECORDS OF DOCUMENT REMOVAL AUTHORIZATIONS
            </Typography>
          </Box>
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
        ) : requests.length === 0 ? (
          <Box sx={{ 
            textAlign: 'center', py: 10, bgcolor: cardBg, borderRadius: 2, 
            border: `1px dashed ${borderCol}`, display: 'flex', flexDirection: 'column', alignItems: 'center' 
          }}>
            <SpeakerNotesOffIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              No pending logs
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              All request histories have been cleared or none exist.
            </Typography>
          </Box>
        ) : (
          <>
            {isMobile ? (
              <Stack spacing={2}>
                {requests.map((req) => (
                  <Paper key={req.id} sx={{ 
                    p: 2, borderRadius: 1, bgcolor: cardBg, 
                    borderLeft: `6px solid ${theme.palette[getStatusColor(req.status)].main}`,
                    border: `1px solid ${borderCol}`, boxShadow: 'none'
                  }}>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                          {req.pdfs?.title || 'Untitled Document'}
                        </Typography>
                        <Chip label={req.status} color={getStatusColor(req.status)} size="small" />
                      </Stack>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                        "{req.reason}"
                      </Typography>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 1, borderTop: `1px solid ${borderCol}` }}>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                          {new Date(req.created_at).toLocaleDateString()}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          {req.status === 'PENDING' ? (
                            <Button 
                              size="small" 
                              color="inherit" 
                              sx={{ fontWeight: 700 }}
                              startIcon={<CloseIcon />}
                              onClick={() => handleCancelRequest(req.id)}
                            >
                              Cancel
                            </Button>
                          ) : (
                            <Button 
                              size="small" 
                              color="error" 
                              sx={{ fontWeight: 700 }}
                              startIcon={<DeleteOutlineIcon />}
                              onClick={() => setDeleteModal({ open: true, id: req.id })}
                            >
                              Delete Log
                            </Button>
                          )}
                        </Stack>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <TableContainer component={Paper} sx={{ bgcolor: cardBg, borderRadius: 1, border: `1px solid ${borderCol}`, boxShadow: 'none' }}>
                <Table>
                  <TableHead sx={{ bgcolor: headerBg }}>
                    <TableRow>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }}>DOCUMENT</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }}>REASON</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }} align="center">STATUS</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }}>DATE</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }} align="center">ACTIONS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests.map((req) => (
                      <TableRow key={req.id} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{req.pdfs?.title}</TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>{req.reason}</TableCell>
                        <TableCell align="center">
                          <Chip label={req.status} color={getStatusColor(req.status)} size="small" sx={{ fontWeight: 900, fontSize: '0.65rem' }} />
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>
                          {new Date(req.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            {req.status === 'PENDING' ? (
                              <Button 
                                variant="outlined"
                                size="small" 
                                color="error" 
                                startIcon={<CloseIcon />}
                                sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem' }}
                                onClick={() => handleCancelRequest(req.id)}
                              >
                                Cancel Request
                              </Button>
                            ) : (
                              <Button 
                                variant="text"
                                size="small" 
                                color="error" 
                                startIcon={<DeleteOutlineIcon />}
                                sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem' }}
                                onClick={() => setDeleteModal({ open: true, id: req.id })}
                              >
                                Delete Log
                              </Button>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Container>

      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null })}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{ timeout: 500 }}
      >
        <Fade in={deleteModal.open}>
          <Box sx={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: 400 }, bgcolor: cardBg, p: 4, borderRadius: 2, textAlign: 'center',
            border: `1px solid ${borderCol}`, outline: 'none'
          }}>
            <WarningAmberIcon sx={{ fontSize: 60, color: '#ef4444', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Delete Log Entry?</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              This will permanently remove this record from the history.
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button fullWidth onClick={() => setDeleteModal({ open: false, id: null })}>Cancel</Button>
              <Button fullWidth variant="contained" color="error" onClick={handleDelete}>Delete</Button>
            </Stack>
          </Box>
        </Fade>
      </Modal>
    </Box>
  );
};

export default PendingActions;