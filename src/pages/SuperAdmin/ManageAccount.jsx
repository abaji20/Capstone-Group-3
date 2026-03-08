import React, { useState, useEffect } from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack, Typography, MenuItem, TextField } from '@mui/material';
import { PageHeader, SearchBar, PrimaryButton, DeleteButton, ActionModal, FormInput, StatusChip } from '../../shared';
import { supabase } from '../../supabaseClient';

const ManageAccount = () => {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState([]);
  
  // New state to capture form data
  const [formData, setFormData] = useState({ fullName: '', email: '', role: 'client' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) console.error("Error fetching users:", error);
    else setUsers(data || []);
  };

// Inside ManageAccount.jsx
const handleCreateAccount = async () => {
  const { data, error } = await supabase.auth.signUp({
    email: formData.email,
    password: 'TemporaryPassword123!', // This is required, but the user will reset it via email
    options: {
      data: { 
        full_name: formData.fullName, 
        role: formData.role 
      },
      // This sends the confirmation email to the user
      emailRedirectTo: 'https://your-app-url.com/login' 
    }
  });

  if (error) {
    alert("Error: " + error.message);
  } else {
    alert("Account created! Please ask the user to check their email to confirm and set their password.");
    setOpen(false);
  }
};

  const updateUserRole = async (userId, newRole) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) alert("Error updating role");
    else fetchUsers();
  };

  const handleDelete = async (userId) => {
    if (window.confirm("Delete this user?")) {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) alert("Error deleting user");
      else fetchUsers();
    }
  };

  return (
    <Box>
      <PageHeader title="Account Management" subtitle="Review system users, modify permissions, and manage account statuses." />

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <SearchBar placeholder="Search name or email..." />
          <PrimaryButton onClick={() => setOpen(true)}>+ New Account</PrimaryButton>
        </Stack>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#2c3e50' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>User Details</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Role</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{user.full_name}</Typography>
                  <Typography variant="caption" color="textSecondary">{user.email}</Typography>
                </TableCell>
                <TableCell>
                  <TextField
                    select
                    size="small"
                    value={user.role || 'client'}
                    onChange={(e) => updateUserRole(user.id, e.target.value)}
                    sx={{ width: 120 }}
                  >
                    {/* Ensure values match your database lowercase strings */}
                    <MenuItem value="superadmin">Super Admin</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="client">Client</MenuItem>
                  </TextField>
                </TableCell>
                <TableCell><StatusChip status={user.status} /></TableCell>
                <TableCell align="right">
                  <DeleteButton onClick={() => handleDelete(user.id)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* CREATE ACCOUNT MODAL */}
      <ActionModal 
        open={open} 
        onClose={() => setOpen(false)} 
        title="Create User Account"
        onConfirm={handleCreateAccount} // Ensure your ActionModal uses this prop
      >
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormInput label="Full Name" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} />
          <FormInput label="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          <TextField
            select
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
            fullWidth
          >
            <MenuItem value="superadmin">Super Admin</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="client">Client</MenuItem>
          </TextField>
        </Stack>
      </ActionModal>
    </Box>
  );
};

export default ManageAccount;