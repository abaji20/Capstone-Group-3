import React from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Stack } from '@mui/material';
import { PageHeader, StatusChip, SearchBar } from '../../shared';
import HistoryIcon from '@mui/icons-material/History';

const AdminLogs = () => {
  // Mock data: History of actions taken by this specific Admin
  const myLogs = [
    { id: 1, action: 'Uploaded "Machine Learning Essentials"', type: 'Upload', date: '2026-03-05', time: '02:30 PM' },
    { id: 2, action: 'Requested deletion of "Old_Python_Guide.pdf"', type: 'Delete Request', date: '2026-03-05', time: '11:15 AM' },
    { id: 3, action: 'Updated metadata for "Discrete Math v2"', type: 'Edit', date: '2026-03-04', time: '04:45 PM' },
    { id: 4, action: 'Fulfilled Student Request: "React Native Docs"', type: 'Request Fulfillment', date: '2026-03-04', time: '09:00 AM' },
  ];

  return (
    <Box>
      <PageHeader 
        title="Activity History" 
        subtitle="Track your contributions, document uploads, and management actions." 
      />

      <Box sx={{ mb: 3, maxWidth: 450 }}>
        <SearchBar placeholder="Search your history..." />
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#1976d2' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Action Performed</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Category</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {myLogs.map((log) => (
              <TableRow key={log.id} hover>
                <TableCell sx={{ fontWeight: 500 }}>{log.action}</TableCell>
                <TableCell>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      px: 1.5, 
                      py: 0.5, 
                      bgcolor: '#e3f2fd', 
                      color: '#1976d2', 
                      borderRadius: 1,
                      fontWeight: 'bold'
                    }}
                  >
                    {log.type}
                  </Typography>
                </TableCell>
                <TableCell>{log.date}</TableCell>
                <TableCell color="textSecondary">{log.time}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AdminLogs;