import React, { useState } from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack, Typography, MenuItem, TextField } from '@mui/material';
import { PageHeader, SearchBar, PrimaryButton, DeleteButton, ActionModal, FormInput, StatusChip } from '../../shared';

const ManageAccount = () => {
  const [open, setOpen] = useState(false);
  const [filterRole, setFilterRole] = useState('All');

  const users = [
    { id: 1, name: 'Juan Dela Cruz', email: 'juan@admin.com', role: 'Admin', status: 'Active' },
    { id: 2, name: 'Maria Santos', email: 'maria@student.com', role: 'Client', status: 'Pending' },
    { id: 3, name: 'System Root', email: 'root@super.com', role: 'SuperAdmin', status: 'Active' },
  ];

  return (
    <Box>
      <PageHeader 
        title="Account Management" 
        subtitle="Review system users, modify permissions, and manage account statuses." 
      />

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center" sx={{ flexGrow: 1 }}>
            <Box sx={{ width: 350 }}>
              <SearchBar placeholder="Search name or email..." />
            </Box>
            
            <TextField
              select
              size="small"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              sx={{ width: 150 }}
              label="Filter Role"
            >
              <MenuItem value="All">All Roles</MenuItem>
              <MenuItem value="SuperAdmin">Super Admin</MenuItem>
              <MenuItem value="Admin">Admin</MenuItem>
              <MenuItem value="Client">Client</MenuItem>
            </TextField>
          </Stack>

          <PrimaryButton onClick={() => setOpen(true)}>
            + New Account
          </PrimaryButton>
        </Stack>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#2c3e50' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>User Details</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Role</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
              {/* Added align="right" to match the body cell */}
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{user.name}</Typography>
                  <Typography variant="caption" color="textSecondary">{user.email}</Typography>
                </TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>
                  {/* Integrated the StatusChip for a better look */}
                  <StatusChip status={user.status} />
                </TableCell>
                <TableCell align="right">
                  <PrimaryButton size="small" variant="text" sx={{ mr: 1 }}>View</PrimaryButton>
                  <DeleteButton onClick={() => alert("Delete user?")} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <ActionModal open={open} onClose={() => setOpen(false)} title="Create User Account">
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormInput label="Full Name" />
          <FormInput label="Email" />
          <FormInput label="Role" placeholder="Admin or Client" />
        </Stack>
      </ActionModal>
    </Box>
  );
};

export default ManageAccount;