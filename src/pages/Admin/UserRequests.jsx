import React from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { PageHeader, PrimaryButton, StatusChip } from '../../shared';

const UsersRequests = () => {
  const requests = [
    { id: 1, student: 'John Doe', book: 'Advanced Calculus', date: 'Mar 05, 2026', status: 'Pending' },
  ];

  return (
    <Box>
      <PageHeader title="Student Book Requests" subtitle="Review documents requested by students." />
      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>Requested Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((req) => (
              <TableRow key={req.id}>
                <TableCell>{req.student}</TableCell>
                <TableCell>{req.book}</TableCell>
                <TableCell><StatusChip status={req.status} /></TableCell>
                <TableCell align="right">
                  <PrimaryButton size="small">Upload & Resolve</PrimaryButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default UsersRequests;