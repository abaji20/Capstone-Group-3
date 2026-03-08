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
// MUST import supabase to use auth
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
      const data = await fetchPdfs();
      setPdfs(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPdfs(); }, []);

 const handleConfirmDeleteRequest = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert("You must be logged in.");
      return;
    }

    // 1. Submit the deletion request
    await submitDeleteRequest(selectedPdf.id, deleteReason, user.id);
    
    // 2. LOG THE ACTION (This is what fills your audit_logs table!)
    await supabase.from('audit_logs').insert([{
      user_id: user.id,
      pdf_id: selectedPdf.id,
      action_type: 'Delete Request',
      description: `Requested deletion of: ${selectedPdf.title}`
    }]);
    
    setDeleteOpen(false);
    setDeleteReason("");
    alert("Request submitted successfully.");
    loadPdfs();
  } catch (error) {
    console.error("Error:", error);
    alert("Error: " + error.message);
  }
};

  return (
    <Box sx={{ p: 5, maxWidth: '1500px', mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>Manage Repository</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        View and manage all uploaded documents.
      </Typography>
      
      <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Table sx={{ minWidth: 1000 }}>
            <TableHead sx={{ bgcolor: '#76D2DB' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Author</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Genre</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Published</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pdfs.map((pdf) => (
                <TableRow key={pdf.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                  <TableCell sx={{ fontWeight: 500 }}>{pdf.title}</TableCell>
                  <TableCell>{pdf.author}</TableCell>
                  <TableCell>
                    <Chip label={pdf.genre || 'N/A'} size="large" variant="outlined" color="primary" />
                  </TableCell>
                  <TableCell>{pdf.published_date || 'N/A'}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <IconButton color="primary" onClick={() => { setSelectedPdf(pdf); setEditOpen(true); }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton color="error" onClick={() => { setSelectedPdf(pdf); setDeleteOpen(true); }}>
                      <DeleteIcon fontSize="small" />
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
          <Typography variant="body2" sx={{ mb: 2 }}>
            Are you sure you want to request the deletion of <strong>{selectedPdf?.title}</strong>?
          </Typography>
          <TextField 
            fullWidth label="Reason for deletion" multiline rows={3} 
            onChange={(e) => setDeleteReason(e.target.value)} 
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDeleteRequest} variant="contained" color="error">Submit Request</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EditPDFs;