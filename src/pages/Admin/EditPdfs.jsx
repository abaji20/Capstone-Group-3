import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, IconButton, CircularProgress, Typography, Dialog, 
  DialogTitle, DialogContent, TextField, DialogActions, Button, 
  Chip, Stack, Avatar, useTheme, useMediaQuery, Container, Snackbar, Alert,
  Divider
} from '@mui/material';

// Icons
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

import { fetchPdfs, submitDeleteRequest } from '../../services/pdfService';
import EditPdfModal from '../../shared/EditPdfModal';
import { supabase } from '../../supabaseClient'; 

const EditPDFs = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // --- STATE ---
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [status, setStatus] = useState({ open: false, type: 'success', message: '' });

  // --- STYLING STRATEGY ---
  const pageBg = isDarkMode ? '#0f172a' : '#ffffff';
  const cardBg = isDarkMode ? '#1e293b' : 'rgba(255, 255, 255, 0.9)';
  const inputBg = isDarkMode ? '#28334e' : '#f1f5f9';
  const borderCol = isDarkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0';
  const headerBg = isDarkMode ? '#1e1e2d' : '#213C51'; 

  useEffect(() => { loadPdfs(); }, []);

  const loadPdfs = async () => {
    try {
      setLoading(true);
      const data = await fetchPdfs();
      setPdfs(data || []);
    } catch (error) {
      console.error("Error loading PDFs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from('pdfs').getPublicUrl(path);
    return data.publicUrl;
  };

  const showStatus = (type, message) => setStatus({ open: true, type, message });

  const handleDeleteSubmit = async () => {
    if (selectedPdf) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await submitDeleteRequest(selectedPdf.id, deleteReason, user.id);
        showStatus('success', "Delete request submitted.");
        setDeleteOpen(false);
        setDeleteReason("");
        loadPdfs(); 
      } catch (error) {
        showStatus('error', "Failed to submit request.");
      }
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 5 }, background: pageBg, minHeight: '100vh', transition: 'all 0.3s ease' }}>
      
      {/* HEADER SECTION */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h3" 
          sx={{ 
            fontStyle: 'italic', fontWeight: 900, 
            color: isDarkMode ? '#ffffff' : '#213C51', 
            fontFamily: "'Montserrat', sans-serif",
            fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
            letterSpacing: '1px'
          }}
        >
          MANAGE PDFS
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, display: 'block' }}>
          MANAGE AND EDIT YOUR ACADEMIC DOCUMENTS.
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress color="secondary" />
        </Box>
      ) : (
        <>
          {!isMobile ? (
            /* --- DESKTOP TABLE VIEW --- */
            <TableContainer component={Paper} sx={{ borderRadius: 1, bgcolor: cardBg, border: `1px solid ${borderCol}`, boxShadow: 'none' }}>
              <Table>
                <TableHead sx={{ bgcolor: headerBg }}>
                  <TableRow>
                    <TableCell sx={{ color: 'white', fontWeight: 800 }}>DOCUMENT</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 800 }}>AUTHOR</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 800 }} align="center">GENRE</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 800 }} align="center">ACTIONS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pdfs.map((pdf) => (
                    <TableRow key={pdf.id} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Avatar variant="rounded" src={getImageUrl(pdf.image_url)} sx={{ width: 45, height: 55, border: `1px solid ${borderCol}` }}>
                             {!pdf.image_url && <PictureAsPdfIcon sx={{ color: '#ef4444' }} />}
                          </Avatar>
                          <Typography sx={{ fontWeight: 700 }}>{pdf.title}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{pdf.author || 'N/A'}</TableCell>
                      <TableCell align="center">
                        {/* RESTORED PREVIOUS CHIP STYLE */}
                        <Chip 
                          label={pdf.genre || 'N/A'} 
                          variant="outlined"
                          sx={{ 
                            color: '#3b82f6', 
                            borderColor: isDarkMode ? '#3b82f6aa' : '#3b82f6',
                            fontWeight: 600, 
                            borderRadius: '16px',
                            minWidth: '110px', 
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            textTransform: 'uppercase'
                          }} 
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" justifyContent="center" spacing={1}>
                          <IconButton onClick={() => { setSelectedPdf(pdf); setEditOpen(true); }} color="info" sx={{ bgcolor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : '#f0f7ff' }}>
                            <EditIcon />
                          </IconButton>
                          <IconButton onClick={() => { setSelectedPdf(pdf); setDeleteOpen(true); }} color="error" sx={{ bgcolor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2' }}>
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            /* --- MOBILE CARD VIEW --- */
            <Stack spacing={2}>
              {pdfs.map((pdf) => (
                <Paper key={pdf.id} sx={{ p: 3, bgcolor: cardBg, borderRadius: 2, border: `1px solid ${borderCol}`, textAlign: 'center' }}>
                  <Avatar variant="rounded" src={getImageUrl(pdf.image_url)} sx={{ width: 80, height: 110, mx: 'auto', mb: 2 }} />
                  <Typography sx={{ fontWeight: 800 }}>{pdf.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{pdf.author}</Typography>
                  
                  <Chip 
                    label={pdf.genre || 'N/A'} 
                    variant="outlined"
                    sx={{ color: '#3b82f6', borderColor: '#3b82f6', fontWeight: 600, mb: 3 }} 
                  />
                  
                  <Stack direction="row" spacing={2}>
                    <Button fullWidth variant="contained" color="info" startIcon={<EditIcon />} onClick={() => { setSelectedPdf(pdf); setEditOpen(true); }}>Edit</Button>
                    <Button fullWidth variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => { setSelectedPdf(pdf); setDeleteOpen(true); }}>Delete</Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </>
      )}

      {/* MODALS & FEEDBACK */}
      <Snackbar open={status.open} autoHideDuration={4000} onClose={() => setStatus({ ...status, open: false })}>
        <Alert severity={status.type} variant="filled">{status.message}</Alert>
      </Snackbar>

      {selectedPdf && <EditPdfModal open={editOpen} onClose={() => setEditOpen(false)} pdf={selectedPdf} onUpdate={loadPdfs} />}

      {/* RESTORED DELETE REQUEST DIALOG DESIGN */}
      <Dialog 
        open={deleteOpen} 
        onClose={() => setDeleteOpen(false)} 
        PaperProps={{ sx: { borderRadius: 2, bgcolor: cardBg, p: 1, backgroundImage: 'none' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'text.primary' }}>Request Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Please provide a reason for removing this document.
          </Typography>
          <TextField 
            fullWidth placeholder="Reason for deletion" multiline rows={3} 
            value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} 
            variant="outlined"
            sx={{ 
              '& .MuiOutlinedInput-root': { 
                borderRadius: 3, 
                bgcolor: inputBg,
                '& fieldset': { border: 'none' } 
              } 
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setDeleteOpen(false)} sx={{ color: 'text.secondary', fontWeight: 600 }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleDeleteSubmit} 
            disabled={!deleteReason.trim()}
            sx={{ 
              bgcolor: '#ff4d4d', // Your previous Red button
              '&:hover': { bgcolor: '#ff3333' },
              borderRadius: '20px', 
              px: 4, 
              fontWeight: 700, 
              textTransform: 'none' 
            }}
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default EditPDFs;