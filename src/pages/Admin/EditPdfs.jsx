import React from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton } from '@mui/material';
import { PageHeader, SearchBar, DeleteButton, PrimaryButton } from '../../shared';
import EditIcon from '@mui/icons-material/Edit';

const EditPDFs = () => {
  // Mock data for current repository
  const pdfs = [
    { id: 1, title: 'Network Security Fundamentals', category: 'IT', uploadDate: '2024-02-01' },
    { id: 2, title: 'Advanced Calculus Vol 1', category: 'Math', uploadDate: '2024-01-15' },
    { id: 3, title: 'Machine Learning Basics', category: 'CS', uploadDate: '2024-02-20' },
  ];

  return (
    <Box>
      <PageHeader 
        title="Manage Repository" 
        subtitle="Edit document details or remove outdated files from the library." 
      />

      <Box sx={{ mb: 3, maxWidth: 500 }}>
        <SearchBar placeholder="Search by title or category..." />
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><strong>Document Title</strong></TableCell>
              <TableCell><strong>Category</strong></TableCell>
              <TableCell><strong>Upload Date</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pdfs.map((pdf) => (
              <TableRow key={pdf.id} hover>
                <TableCell>{pdf.title}</TableCell>
                <TableCell>{pdf.category}</TableCell>
                <TableCell>{pdf.uploadDate}</TableCell>
                <TableCell align="right">
                  {/* Edit Button */}
                  <IconButton 
                    color="primary" 
                    onClick={() => alert(`Editing ${pdf.title}`)}
                    sx={{ mr: 1 }}
                  >
                    <EditIcon />
                  </IconButton>
                  
                  {/* Reuse your DeleteButton */}
                  <DeleteButton onClick={() => alert("Requesting deletion from Super Admin...")} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default EditPDFs;