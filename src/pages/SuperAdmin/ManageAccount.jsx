import React, { useState, useEffect } from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack, Typography, MenuItem, TextField, InputAdornment, Avatar } from '@mui/material';
import { PageHeader, PrimaryButton, DeleteButton, ActionModal, FormInput } from '../../shared';
import { supabase } from '../../supabaseClient';
import SearchIcon from '@mui/icons-material/Search';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import BadgeIcon from '@mui/icons-material/Badge';
import EmailIcon from '@mui/icons-material/Email';
import KeyIcon from '@mui/icons-material/Key';

const ManageAccount = () => {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', email: '', role: 'client', password: '' });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) console.error("Error fetching users:", error);
    else setUsers(data || []);
  };

  // This function now creates the user AND their profile in one go
  const handleCreateAccount = async () => {
    setLoading(true);
    try {
      // 1. Create the Auth user (Auto-confirmed because you turned off email confirm)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { full_name: formData.fullName, role: formData.role }
        }
      });

      if (authError) throw authError;

      // 2. Add the user to your 'profiles' table
      const { error: profileError } = await supabase.from('profiles').insert([
        { id: authData.user.id, email: formData.email, full_name: formData.fullName, role: formData.role }
      ]);

      if (profileError) throw profileError;

      alert("Account created successfully! User can log in immediately.");
      setOpen(false);
      setFormData({ fullName: '', email: '', role: 'client', password: '' });
      fetchUsers();
    } catch (err) { 
      alert("Error: " + err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const filteredUsers = users.filter((user) =>
    (user.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (user.email?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, background: 'linear-gradient(135deg, #e0f7fa 0%, #80deea 100%)', minHeight: '100vh' }}>
      <PageHeader title="Account Management" subtitle="Manage your system users and roles." />
      
      <Paper sx={{ p: 2, mb: 3, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(8px)' }}>
        <TextField 
          placeholder="Search name or email..." size="small" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: 350, bgcolor: 'white', borderRadius: 2 }}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment>) }}
        />
        <PrimaryButton startIcon={<AddCircleOutlineIcon />} onClick={() => setOpen(true)}>New Account</PrimaryButton>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 4 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#1e3a8a' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 800 }}>USER DETAILS</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 800 }}>ROLE</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 800 }}>JOINED DATE</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 800 }} align="right">ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: '#dbeafe', color: '#1e40af' }}><PersonOutlineIcon /></Avatar>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>{user.full_name || 'N/A'}</Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>{user.email}</Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell><Typography sx={{ textTransform: 'capitalize' }}>{user.role}</Typography></TableCell>
                <TableCell>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                <TableCell align="right"><DeleteButton /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <ActionModal open={open} onClose={() => setOpen(false)} title="Create New User" onConfirm={handleCreateAccount} confirmText={loading ? "Creating..." : "Create Account"} disabled={loading}>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <FormInput label="Full Name" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} InputProps={{ startAdornment: <BadgeIcon sx={{ mr: 1 }} /> }} />
          <FormInput label="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} InputProps={{ startAdornment: <EmailIcon sx={{ mr: 1 }} /> }} />
          <FormInput label="Default Password" type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} InputProps={{ startAdornment: <KeyIcon sx={{ mr: 1 }} /> }} />
          <TextField select label="Role" fullWidth value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
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