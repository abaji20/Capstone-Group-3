import React from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { PageHeader, SearchBar } from '../../shared';

const Logs = () => {
  // Mock data for the audit trail
  const logs = [
    { id: 1, user: 'Admin_Mark', action: 'Uploaded "Data Structures 101"', type: 'Upload', time: '2024-03-05 10:30 AM' },
    { id: 2, user: 'Student_2021', action: 'Downloaded "Network Security"', type: 'Download', time: '2024-03-05 11:15 AM' },
    { id: 3, user: 'SuperAdmin', action: 'Deleted User: Guest_User_09', type: 'Account', time: '2024-03-04 09:00 PM' },
    { id: 4, user: 'Admin_Sarah', action: 'Approved Request for "React Docs"', type: 'Request', time: '2024-03-04 02:45 PM' },
  ];

  return (
    <Box>
      <PageHeader 
        title="System Activity Logs" 
        subtitle="Maintain security and transparency by tracking all system-wide actions." 
      />

      <Box sx={{ mb: 3, maxWidth: 500 }}>
        <SearchBar placeholder="Search logs by user or specific action..." />
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#2c3e50' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>User</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Action Performed</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Category</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Timestamp</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{log.user}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ px: 1, py: 0.5, bgcolor: '#f0f0f0', borderRadius: 1 }}>
                    {log.type}
                  </Typography>
                </TableCell>
                <TableCell color="textSecondary">{log.time}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Logs;