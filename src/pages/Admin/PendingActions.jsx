import React from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { PageHeader, StatusChip } from '../../shared';

const PendingActions = () => {
  const pendingFiles = [
    { id: 1, title: 'Old_Calculus_Syllabus.pdf', reason: 'Outdated', status: 'Pending Approval' },
    { id: 2, title: 'Duplicate_Network_Security.pdf', reason: 'Duplicate', status: 'In Review' },
  ];

  return (
    <Box>
      <PageHeader 
        title="Pending Deletion Actions" 
        subtitle="Track the status of your deletion requests awaiting Super Admin approval." 
      />
      <TableContainer component={Paper} sx={{ mt: 3, borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><strong>Document Title</strong></TableCell>
              <TableCell><strong>Reason for Deletion</strong></TableCell>
              <TableCell><strong>Current Status</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pendingFiles.map((file) => (
              <TableRow key={file.id}>
                <TableCell>{file.title}</TableCell>
                <TableCell color="textSecondary">{file.reason}</TableCell>
                <TableCell><StatusChip status="Pending" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default PendingActions;