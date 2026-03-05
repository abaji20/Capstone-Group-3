import React from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { PageHeader, StatusChip, PrimaryButton, DeleteButton } from '../../shared';

const DeleteRequests = () => {
  // Mock data: Documents pending Super Admin approval for deletion
  const pendingDeletions = [
    { id: 1, title: 'Old_Curriculum_v1.pdf', requestedBy: 'Admin_Mark', reason: 'Outdated Content', date: '2024-03-05' },
    { id: 2, title: 'Test_Upload_123.pdf', requestedBy: 'Admin_Sarah', reason: 'Duplicate Upload', date: '2024-03-04' },
  ];

  return (
    <Box>
      <PageHeader 
        title="Delete Requests" 
        subtitle="Review and approve permanent deletion requests from Admins." 
      />

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#2c3e50' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>File Title</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Requested By</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Reason</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date Requested</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pendingDeletions.length > 0 ? (
              pendingDeletions.map((req) => (
                <TableRow key={req.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{req.title}</TableCell>
                  <TableCell>{req.requestedBy}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                      "{req.reason}"
                    </Typography>
                  </TableCell>
                  <TableCell>{req.date}</TableCell>
                  <TableCell align="right">
                    {/* Approve button moves it to "Archived" */}
                    <PrimaryButton 
                      size="small" 
                      onClick={() => alert("Deletion Approved: Moved to Archive")}
                      sx={{ mr: 1, bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
                    >
                      Approve
                    </PrimaryButton>
                    {/* Reject button keeps it in the library */}
                    <DeleteButton 
                      title="Reject" 
                      onClick={() => alert("Deletion Rejected: File stays in Library")} 
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                  <Typography color="textSecondary">No pending deletion requests found.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DeleteRequests;