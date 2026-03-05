import React from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { PageHeader, PrimaryButton, DeleteButton, SearchBar } from '../../shared';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';

const Archived = () => {
  // Mock data for files that have been "Soft Deleted"
  const archivedFiles = [
    { id: 101, title: 'Old_Syllabus_2022.pdf', category: 'Admin', deletedBy: 'SuperAdmin', date: '2024-02-10' },
    { id: 102, title: 'Draft_Thesis_Sample.pdf', category: 'General', deletedBy: 'Admin_Mark', date: '2024-02-15' },
  ];

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
        <Table>
          <TableHead sx={{ bgcolor: '#2c3e50' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>File Title</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Category</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Deleted By</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date Archived</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {archivedFiles.map((file) => (
              <TableRow key={file.id} hover>
                <TableCell sx={{ fontWeight: 500 }}>{file.title}</TableCell>
                <TableCell>{file.category}</TableCell>
                <TableCell>{file.deletedBy}</TableCell>
                <TableCell>{file.date}</TableCell>
                <TableCell align="right">
                  {/* Restore Button */}
                  <PrimaryButton 
                    size="small" 
                    startIcon={<RestoreFromTrashIcon />}
                    onClick={() => alert(`Restoring ${file.title}...`)}
                    sx={{ mr: 1, bgcolor: '#0288d1', '&:hover': { bgcolor: '#01579b' } }}
                  >
                    Restore
                  </PrimaryButton>
                  
                  {/* Permanent Delete */}
                  <DeleteButton 
                    title="Purge" 
                    onClick={() => alert("This will permanently erase the file from the server.")} 
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Archived;