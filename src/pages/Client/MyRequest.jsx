import React from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { PageHeader, StatusChip, EmptyState } from '../../shared';

const MyRequests = () => {
  // Mock data - In the future, this will come from your "requests" table in Supabase
  const myRequests = [
    { id: 1, title: 'Introduction to Psychology PDF', date: '2024-03-01', status: 'Pending' },
    { id: 2, title: 'Data Structures and Algorithms', date: '2024-02-28', status: 'Approved' },
    { id: 3, title: 'Physics for Engineers Vol 2', date: '2024-02-25', status: 'Denied' },
  ];

  return (
    <Box>
      <PageHeader 
        title="My Pending Requests" 
        subtitle="Track the status of the documents you've requested from the library administrators." 
      />

      {myRequests.length === 0 ? (
        <EmptyState message="You haven't made any requests yet." />
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 3, borderRadius: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#F5F7FA' }}>
              <TableRow>
                <TableCell><strong>Document Title</strong></TableCell>
                <TableCell><strong>Date Requested</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {myRequests.map((req) => (
                <TableRow key={req.id} hover>
                  <TableCell>{req.title}</TableCell>
                  <TableCell>{req.date}</TableCell>
                  <TableCell>
                    <StatusChip status={req.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default MyRequests;