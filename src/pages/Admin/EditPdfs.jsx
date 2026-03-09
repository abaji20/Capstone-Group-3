import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, IconButton, CircularProgress, Typography, Dialog, 
  DialogTitle, DialogContent, TextField, DialogActions, Button, Chip, Stack, Avatar 
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
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");

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

const handleDeleteSubmit = async () => {
    if (selectedPdf) {
      try {
        // 1. Submit the delete request (assuming this inserts into 'delete_requests')
        await submitDeleteRequest(selectedPdf.id, deleteReason);

        // 2. INSERT THE LOG ENTRY FOR THE DELETE REQUEST
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('audit_logs').insert([{
            user_id: user.id,
            pdf_id: selectedPdf.id,
            action_type: 'Delete Request',
            description: `Requested deletion for: "${selectedPdf.title}". Reason: ${deleteReason}`
          }]);
        }

        setDeleteOpen(false);
        setDeleteReason("");
        loadPdfs(); // Refreshes the table
      } catch (error) {
        console.error("Error submitting delete request:", error.message);
        alert("Failed to submit delete request.");
      }
    }
  };

  return (
    <Box sx={{ p: 4, background: 'linear-gradient(135deg, #e0f7fa 0%, #80deea 100%)', minHeight: '100vh' }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4, pb: 2, borderBottom: '2px solid rgba(255,255,255,0.3)' }}>
        <Box sx={{ bgcolor: '#1e3a8a', p: 1.5, borderRadius: 3, color: 'white', display: 'flex' }}>
          <InventoryIcon sx={{ fontSize: 32 }} />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#0f172a' }}>Repository Management</Typography>
          <Typography variant="body2" sx={{ color: '#1e3a8a', fontWeight: 600 }}>Manage, edit, or remove your academic documents.</Typography>
        </Box>
      </Stack>
      
      <TableContainer component={Paper} sx={{ borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', backgroundColor: 'rgba(255, 255, 255, 0.8)' }}>
        {loading ? (
          <Box sx={{ p: 8, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: '#1e3a8a' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>PREVIEW</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>TITLE</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>AUTHOR</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>GENRE</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'center' }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pdfs.map((pdf) => (
                <TableRow key={pdf.id} hover>
                  <TableCell>
                    <Avatar variant="rounded" src={getImageUrl(pdf.image_url)} sx={{ width: 45, height: 55, bgcolor: '#fee2e2' }}>
                      {!pdf.image_url && <PictureAsPdfIcon color="error" />}
                    </Avatar>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{pdf.title}</TableCell>
                  <TableCell>{pdf.author}</TableCell>
                  <TableCell><Chip label={pdf.genre || 'N/A'} color="primary" variant="outlined" /></TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <IconButton color="primary" onClick={() => { setSelectedPdf(pdf); setEditOpen(true); }}><EditIcon /></IconButton>
                    <IconButton color="error" onClick={() => { setSelectedPdf(pdf); setDeleteOpen(true); }}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Edit Modal */}
      {selectedPdf && (
        <EditPdfModal 
          open={editOpen} 
          onClose={() => setEditOpen(false)} 
          pdf={selectedPdf} 
          onUpdate={loadPdfs} // This triggers the table refresh
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Request Deletion</DialogTitle>
        <DialogContent>
          <TextField 
            fullWidth label="Reason for deletion" multiline rows={3} 
            value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} 
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" onClick={handleDeleteSubmit}>Submit Request</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default EditPDFs;