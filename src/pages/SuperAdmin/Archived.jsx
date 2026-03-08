import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Typography, 
  CircularProgress 
} from '@mui/material';
import { PageHeader, PrimaryButton, DeleteButton, SearchBar } from '../../shared';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import { supabase } from '../../supabaseClient';

const Archived = () => {
  const [archivedFiles, setArchivedFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArchived();
  }, []);

  const fetchArchived = async () => {
    setLoading(true);
    // Fetch only files marked as archived
    const { data, error } = await supabase
      .from('pdfs')
      .select('*')
      .eq('is_archived', true); 

    if (error) console.error("Error fetching archives:", error);
    else setArchivedFiles(data || []);
    setLoading(false);
  };

  const handleRestore = async (id) => {
    const { error } = await supabase
      .from('pdfs')
      .update({ is_archived: false }) // Move back to active library
      .eq('id', id);

    if (!error) {
      alert("File restored successfully.");
      fetchArchived();
    }
  };

  const handlePurge = async (id) => {
    const { error } = await supabase
      .from('pdfs')
      .delete() // Permanent removal
      .eq('id', id);

    if (!error) {
      alert("File permanently erased.");
      fetchArchived();
    }
  };

  return (
    <Box>
      <PageHeader 
        title="Archived & Restore" 
        subtitle="Manage files in the repository's trash bin. Restore them or delete them permanently." 
      />

      <Box sx={{ mb: 3, maxWidth: 400 }}>
        <SearchBar placeholder="Search archive..." />
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        {loading ? (
          <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: '#2c3e50' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>File Title</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Category</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date Archived</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {archivedFiles.length > 0 ? (
                archivedFiles.map((file) => (
                  <TableRow key={file.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{file.title}</TableCell>
                    <TableCell>{file.category}</TableCell>
                    <TableCell>{new Date(file.created_at).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <PrimaryButton 
                        size="small" 
                        startIcon={<RestoreFromTrashIcon />}
                        onClick={() => handleRestore(file.id)}
                        sx={{ mr: 1, bgcolor: '#0288d1' }}
                      >
                        Restore
                      </PrimaryButton>
                      <DeleteButton title="Purge" onClick={() => handlePurge(file.id)} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                    <Typography color="textSecondary">No archived files found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Box>
  );
};

export default Archived;