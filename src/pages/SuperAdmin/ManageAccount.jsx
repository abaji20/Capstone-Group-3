import React, { useState, useEffect } from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack, Typography, MenuItem, TextField, InputAdornment, Avatar } from '@mui/material';
import { PageHeader, PrimaryButton, DeleteButton, ActionModal, FormInput } from '../../shared';
import { supabase } from '../../supabaseClient';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import BadgeIcon from '@mui/icons-material/Badge';
import EmailIcon from '@mui/icons-material/Email';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SupervisedUserCircleIcon from '@mui/icons-material/SupervisedUserCircle';

const ManageAccount = () => {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ fullName: '', email: '', role: 'client' });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) console.error("Error fetching users:", error);
    else setUsers(data || []);
  };

  const handleCreateAccount = async () => {
    try {
      sessionStorage.setItem('isCreatingAccount', 'true');
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: 'password123',
        options: { data: { full_name: formData.fullName, role: formData.role } }
      });
      if (authError) throw authError;
      await supabase.from('profiles').insert([{ id: data.user.id, email: formData.email, full_name: formData.fullName, role: formData.role }]);
      alert("Account created successfully!");
      setOpen(false); fetchUsers();
    } catch (err) { alert("Error: " + err.message); }
    finally { sessionStorage.removeItem('isCreatingAccount'); }
  };

  const filteredUsers = users.filter((user) =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, background: 'linear-gradient(135deg, #e0f7fa 0%, #80deea 100%)', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <PageHeader title="Account Management" subtitle="Review system users, modify permissions, and track registration dates." />
      
      {/* Search Filter */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(8px)' }}>
        <TextField 
          placeholder="Search name or email..." 
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: 350, bgcolor: 'white', borderRadius: 2 }}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment>) }}
        />
        <PrimaryButton startIcon={<AddCircleOutlineIcon />} onClick={() => setOpen(true)}>New Account</PrimaryButton>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#1e3a8a' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 800 }}><PersonOutlineIcon sx={{ verticalAlign: 'middle', mr: 1 }} />USER DETAILS</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 800 }}><AdminPanelSettingsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />ROLE</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 800 }}><CalendarTodayIcon sx={{ verticalAlign: 'middle', mr: 1 }} />JOINED DATE</TableCell>
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
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>{user.full_name}</Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>{user.email}</Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <TextField select size="small" value={user.role || 'client'} sx={{ width: 140, bgcolor: 'white' }}>
                    <MenuItem value="superadmin"><SupervisedUserCircleIcon sx={{ mr: 1, fontSize: 18 }} />Super Admin</MenuItem>
                    <MenuItem value="admin"><AdminPanelSettingsIcon sx={{ mr: 1, fontSize: 18 }} />Admin</MenuItem>
                    <MenuItem value="client"><PersonOutlineIcon sx={{ mr: 1, fontSize: 18 }} />Client</MenuItem>
                  </TextField>
                </TableCell>
                <TableCell>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                <TableCell align="right"><DeleteButton /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* COMPLETE Action Modal */}
      <ActionModal open={open} onClose={() => setOpen(false)} title="Create New User" onConfirm={handleCreateAccount}>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <FormInput 
            label="Full Name" 
            value={formData.fullName} 
            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            InputProps={{ startAdornment: <BadgeIcon sx={{ mr: 1, color: 'gray' }} /> }} 
          />
          <FormInput 
            label="Email" 
            value={formData.email} 
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            InputProps={{ startAdornment: <EmailIcon sx={{ mr: 1, color: 'gray' }} /> }} 
          />
          <TextField 
            select 
            label="Role" 
            fullWidth 
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
            sx={{ bgcolor: '#f8fafc' }}
          >
            <MenuItem value="superadmin"><SupervisedUserCircleIcon sx={{ mr: 1 }} />Super Admin</MenuItem>
            <MenuItem value="admin"><AdminPanelSettingsIcon sx={{ mr: 1 }} />Admin</MenuItem>
            <MenuItem value="client"><PersonOutlineIcon sx={{ mr: 1 }} />Client</MenuItem>
          </TextField>
        </Stack>
      </ActionModal>
    </Box>
  );
};
export default ManageAccount;