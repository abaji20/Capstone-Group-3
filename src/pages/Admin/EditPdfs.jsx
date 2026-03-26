import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, IconButton, CircularProgress, Typography, Dialog, 
  DialogTitle, DialogContent, TextField, DialogActions, Button, 
  Chip, Stack, Avatar, useTheme, useMediaQuery, Container, Snackbar, Alert 
} from '@mui/material';

// Icons
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InventoryIcon from '@mui/icons-material/Inventory';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

import { fetchPdfs, submitDeleteRequest } from '../../services/pdfService';
import EditPdfModal from '../../shared/EditPdfModal';
import { supabase } from '../../supabaseClient'; 

const EditPDFs = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [status, setStatus] = useState({ open: false, type: 'success', message: '' });

  // --- DARK MODE COLOR STRATEGY ---
  // Sidebar is #0f172a (Darkest)
  // Page Background is #141b2d (Contrast)
  // Table/Card is #1e293b (Floating depth)
  const pageBg = isDarkMode ? '#141b2d' : '#f8fafc'; 
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  const inputBg = isDarkMode ? '#28334e' : '#f1f5f9';

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

  useEffect(() => { loadPdfs(); }, []);

  const getImageUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from('pdfs').getPublicUrl(path);
    return data.publicUrl;
  };

  const showStatus = (type, message) => setStatus({ open: true, type, message });

  const handleDeleteSubmit = async () => {
    if (selectedPdf) {
      try {
        await submitDeleteRequest(selectedPdf.id, deleteReason);
        showStatus('success', "Delete request submitted.");
        setDeleteOpen(false);
        setDeleteReason("");
        loadPdfs(); 
      } catch (error) {
        showStatus('error', "Failed to submit request.");
      }
    }
  };

  // Reusable header cell style for bolding and alignment
  const headerCellStyle = { 
    fontWeight: 600, // Slight bold
    fontSize: '0.75rem', 
    color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'text.secondary',
    letterSpacing: '0.05em',
    borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f1f5f9',
    py: 2,
    bgcolor: isDarkMode ? 'rgba(0,0,0,0.1)' : '#f8fafc' 
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      width: '100%', 
      bgcolor: pageBg, 
      p: { xs: 1.5, sm: 2, md: 4 },
      transition: 'background-color 0.3s ease'
    }}>
      <Container maxWidth="lg" sx={{ px: { xs: 0.5, sm: 2 } }}>
        
        {/* Header Section */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4, mt: { xs: 1, md: 0 } }}>
          <Box sx={{ bgcolor: '#3b82f6', p: 1.2, borderRadius: 2, color: 'white', display: 'flex', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
            <InventoryIcon sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#0f172a', lineHeight: 1.2 }}>
              Repository Management
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Manage and edit your academic documents.
            </Typography>
          </Box>
        </Stack>
        
        <TableContainer component={Paper} sx={{ 
          borderRadius: 2, 
          bgcolor: cardBg,
          boxShadow: isDarkMode ? '0 10px 30px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.05)',
          border: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : 'none',
          overflow: 'hidden'
        }}>
          {loading ? (
            <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress size={35} thickness={5} /></Box>
          ) : (
            <Table>
              {!isMobile && (
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...headerCellStyle, pl: 4 }}>PREVIEW</TableCell>
                    <TableCell sx={headerCellStyle}>TITLE</TableCell>
                    <TableCell sx={headerCellStyle}>AUTHOR</TableCell>
                    <TableCell sx={{ ...headerCellStyle, textAlign: 'center' }}>GENRE</TableCell>
                    <TableCell sx={{ ...headerCellStyle, textAlign: 'center', pr: 4 }}>ACTIONS</TableCell>
                  </TableRow>
                </TableHead>
              )}
              <TableBody>
                {pdfs.map((pdf) => (
                  <TableRow key={pdf.id} sx={{ 
                    display: isMobile ? 'flex' : 'table-row',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'center' : 'stretch',
                    borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f1f5f9',
                    py: isMobile ? 4 : 0,
                    '&:hover': { bgcolor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }
                  }}>
                    <TableCell sx={{ display: isMobile ? 'block' : 'table-cell', border: 'none', pl: isMobile ? 0 : 4 }}>
                      <Avatar variant="rounded" src={getImageUrl(pdf.image_url)} sx={{ width: 55, height: 75, bgcolor: inputBg, mx: isMobile ? 'auto' : 0, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                        {!pdf.image_url && <PictureAsPdfIcon sx={{ color: '#ef4444' }} />}
                      </Avatar>
                    </TableCell>
                    
                    <TableCell sx={{ display: isMobile ? 'block' : 'table-cell', border: 'none', textAlign: isMobile ? 'center' : 'left' }}>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary' }}>{pdf.title}</Typography>
                      {isMobile && <Typography variant="body2" color="text.secondary">{pdf.author}</Typography>}
                    </TableCell>

                    {!isMobile && <TableCell sx={{ border: 'none', color: 'text.primary' }}>{pdf.author}</TableCell>}
                    
                    <TableCell sx={{ display: isMobile ? 'block' : 'table-cell', border: 'none', textAlign: 'center', py: isMobile ? 2 : 2 }}>
                      <Chip 
                        label={pdf.genre || 'N/A'} 
                        variant="outlined"
                        sx={{ 
                          color: '#3b82f6', 
                          borderColor: isDarkMode ? '#3b82f6aa' : '#3b82f6',
                          fontWeight: 600, 
                          borderRadius: '16px',
                          minWidth: '110px', // Fixed: Consistent width
                          justifyContent: 'center',
                          fontSize: '0.75rem'
                        }} 
                      />
                    </TableCell>

                    <TableCell sx={{ display: isMobile ? 'block' : 'table-cell', border: 'none', pr: isMobile ? 0 : 4 }}>
                      <Stack direction="row" spacing={1.5} justifyContent="center">
                        <IconButton 
                          size="small"
                          sx={{ bgcolor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : '#f0f7ff', color: '#3b82f6', '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.25)' } }}
                          onClick={() => { setSelectedPdf(pdf); setEditOpen(true); }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small"
                          sx={{ bgcolor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2', color: '#ef4444', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.25)' } }}
                          onClick={() => { setSelectedPdf(pdf); setDeleteOpen(true); }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>

        {/* Feedback Messages */}
        <Snackbar 
          open={status.open} 
          autoHideDuration={4000} 
          onClose={() => setStatus({ ...status, open: false })}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity={status.type} variant="filled" sx={{ width: '100%', borderRadius: '12px', fontWeight: 600 }}>
            {status.message}
          </Alert>
        </Snackbar>

        {/* Modals */}
        {selectedPdf && (
          <EditPdfModal open={editOpen} onClose={() => setEditOpen(false)} pdf={selectedPdf} onUpdate={loadPdfs} />
        )}

        <Dialog 
          open={deleteOpen} 
          onClose={() => setDeleteOpen(false)} 
          PaperProps={{ sx: { borderRadius: 4, bgcolor: cardBg, p: 1 } }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: 'text.primary' }}>Request Deletion</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              Please provide a reason for removing this document.
            </Typography>
            <TextField 
              fullWidth label="Reason for deletion" multiline rows={3} 
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
            <Button variant="contained" color="error" onClick={handleDeleteSubmit} sx={{ borderRadius: '25px', px: 4, fontWeight: 700, textTransform: 'none' }}>
              Submit Request
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default EditPDFs;