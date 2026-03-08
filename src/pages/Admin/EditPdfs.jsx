import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, IconButton, CircularProgress, Typography, Dialog, 
  DialogTitle, DialogContent, TextField, DialogActions, Button, Chip 
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
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

  const handleConfirmDeleteRequest = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await submitDeleteRequest(selectedPdf.id, deleteReason, user.id);
      
      await supabase.from('audit_logs').insert([{
        user_id: user.id,
        pdf_id: selectedPdf.id,
        action_type: 'Delete Request',
        description: `Requested deletion of: ${selectedPdf.title}`
      }]);
      
      setDeleteOpen(false);
      setDeleteReason("");
      alert("Request submitted. File will remain until Super Admin approval.");
      loadPdfs(); // This will now refresh and remove the item if you filter it
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  return (
    <Box sx={{ p: 5, maxWidth: '1500px', mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>Manage Repository</Typography>
      
      <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: '#76D2DB' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Author</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Genre</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pdfs.map((pdf) => (
                <TableRow key={pdf.id} hover>
                  <TableCell>{pdf.title}</TableCell>
                  <TableCell>{pdf.author}</TableCell>
                  <TableCell><Chip label={pdf.genre || 'N/A'} color="primary" variant="outlined" /></TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <IconButton color="primary" onClick={() => { setSelectedPdf(pdf); setEditOpen(true); }}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => { setSelectedPdf(pdf); setDeleteOpen(true); }}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {selectedPdf && (
        <EditPdfModal open={editOpen} onClose={() => setEditOpen(false)} pdf={selectedPdf} onUpdate={loadPdfs} />
      )}

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ bgcolor: '#f44336', color: 'white' }}>Request Deletion</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>Confirm request for <strong>{selectedPdf?.title}</strong>?</Typography>
          <TextField fullWidth label="Reason" multiline rows={3} onChange={(e) => setDeleteReason(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDeleteRequest} variant="contained" color="error">Submit Request</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
  
export default EditPDFs;