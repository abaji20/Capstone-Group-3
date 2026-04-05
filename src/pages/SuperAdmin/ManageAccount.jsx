import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Stack, Typography, MenuItem, TextField, InputAdornment, Avatar,
  IconButton, Chip, useTheme, useMediaQuery, Divider, Snackbar, Alert,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button
} from '@mui/material';
import { PageHeader, PrimaryButton, DeleteButton, ActionModal, FormInput } from '../../shared';
import { supabase } from '../../supabaseClient';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import BadgeIcon from '@mui/icons-material/Badge';
import EmailIcon from '@mui/icons-material/Email';
import KeyIcon from '@mui/icons-material/Key';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

const ManageAccount = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDarkMode = theme.palette.mode === 'dark';
  
  // --- SPECIFIED BACKGROUND LOGIC ---
  const pageBg = isDarkMode ? '#0f172a' : '#ffffff';

  // States
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [loading, setLoading] = useState(false);
  
  // Modal/Dialog States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  // Data States
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({ fullName: '', email: '', role: 'client', password: '' });
  const [editData, setEditData] = useState({ id: '', fullName: '', role: '', oldName: '', oldRole: '' });
  const [notify, setNotify] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) console.error("Error fetching users:", error);
    else setUsers(data || []);
  };

  const createAuditLog = async (action, description) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('audit_logs').insert([{
        user_id: user?.id,
        action_type: action,
        description: description,
        created_at: new Date().toISOString()
      }]);
    } catch (e) {
      console.error("Audit log failed:", e);
    }
  };

  const getAvatarColors = (role) => {
    switch (role?.toLowerCase()) {
      case 'superadmin': return { bg: '#7b1fa2', text: '#ffffff' }; 
      case 'admin':      return { bg: '#1976d2', text: '#ffffff' }; 
      case 'client':     return { bg: '#fbc02d', text: '#000000' }; 
      default:           return { bg: '#9e9e9e', text: '#ffffff' };
    }
  };

  // --- HANDLERS (UNTOUCHED) ---

  const handleCreateAccount = async () => {
    if (!formData.email || !formData.password || !formData.fullName) {
      setNotify({ open: true, message: 'Please fill in all fields!', severity: 'error' });
      return;
    }

    setLoading(true);

    try {
      const { data: existingUser, error: existingError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.email)
        .single();

      if (existingError && existingError.code !== 'PGRST116') throw existingError;

      if (existingUser) {
        setNotify({
          open: true,
          message: 'Email already registered. Please check inbox or try another.',
          severity: 'warning'
        });
        setLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { full_name: formData.fullName, role: formData.role }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed.");

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          role: formData.role
        }]);

      if (profileError) {
        setNotify({ open: true, message: 'Account created, but profile sync delayed.', severity: 'warning' });
      } else {
        await createAuditLog('Create Account', `Created ${formData.role} account for ${formData.fullName}`);
        setNotify({ open: true, message: 'Account created! Please check email to confirm.', severity: 'success' });
      }

      setIsCreateModalOpen(false);
      setFormData({ fullName: '', email: '', role: 'client', password: '' });
      fetchUsers();

    } catch (err) {
      setNotify({ open: true, message: 'Error: ' + err.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (user) => {
    setEditData({ 
        id: user.id, 
        fullName: user.full_name, 
        role: user.role,
        oldName: user.full_name,
        oldRole: user.role 
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateAccount = async () => {
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ full_name: editData.fullName, role: editData.role }).eq('id', editData.id);
    
    if (error) setNotify({ open: true, message: 'Update failed', severity: 'error' });
    else {
      let changes = [];
      if (editData.oldName !== editData.fullName) changes.push(`name to ${editData.fullName}`);
      if (editData.oldRole !== editData.role) changes.push(`role to ${editData.role}`);
      
      await createAuditLog('Edit Account', `Updated ${editData.fullName}: ${changes.join(', ') || 'profile details'}`);
      setNotify({ open: true, message: 'Updated successfully!', severity: 'success' });
      setIsEditModalOpen(false);
      fetchUsers();
    }
    setLoading(false);
  };

  const handleDeleteTrigger = (user) => {
    setSelectedUser(user);
    setIsConfirmOpen(true);
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    const deletedUserName = selectedUser?.full_name;
    const { error } = await supabase.from('profiles').delete().eq('id', selectedUser.id);
    
    if (error) {
      setNotify({ open: true, message: 'Delete failed. Check dependencies.', severity: 'error' });
    } else {
      await createAuditLog('Delete Account', `Deleted account for ${deletedUserName}`);
      setNotify({ open: true, message: 'Account deleted!', severity: 'success' });
      setIsConfirmOpen(false);
      fetchUsers();
    }
    setLoading(false);
  };

  const StyledAvatar = ({ user, size = 30 }) => {
    const colors = getAvatarColors(user.role);
    return (
      <Avatar sx={{ width: size, height: size, bgcolor: colors.bg, color: colors.text, fontWeight: 700 }}>
        {user.full_name?.charAt(0) || <PersonOutlineIcon />}
      </Avatar>
    );
  };

  const RoleChip = ({ role }) => {
    const mainBlue = isDarkMode ? theme.palette.primary.light : theme.palette.primary.main;
    return (
      <Chip label={role} variant="outlined" sx={{ borderColor: mainBlue, color: mainBlue, fontWeight: 800, textTransform: 'uppercase', borderRadius: '10px', width: '120px', fontSize: '0.7rem' }} />
    );
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = (u.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || (u.email?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All Roles' || u.role?.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  return (
      <Box sx={{ p: { xs: 2, md: 5 }, minHeight: '100vh', bgcolor: pageBg }}>
      
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography 
              variant="h3" 
              sx={{ 
                fontStyle: 'italic',
                fontWeight: 900, 
                color: isDarkMode ? '#ffffff' : '#213C51', 
                fontFamily: "'Montserrat', sans-serif",
                fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
                letterSpacing: '1px'
              }}
            >
              ACCOUNT MANAGEMENT
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, display: 'block', mt: 0 }}>
              MANAGE USER ACCOUNTS & ROLES
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Snackbar open={notify.open} autoHideDuration={4000} onClose={() => setNotify({ ...notify, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={notify.severity} variant="filled">{notify.message}</Alert>
      </Snackbar>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
        <TextField 
          placeholder="Search accounts..." size="medium" fullWidth={isMobile} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
          sx={{ minWidth: { sm: 800 }, bgcolor: isDarkMode ? '#28334e' : '#ffffff', borderRadius: 0.5 }}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment>) }}
        />
        <TextField select size="medium" label="Filter Role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} sx={{ minWidth: 200, bgcolor: isDarkMode ? '#28334e' : '#ffffff', borderRadius: 0.5 }}>
          <MenuItem value="All Roles">All Roles</MenuItem>
          <MenuItem value="superadmin">Superadmin</MenuItem>
          <MenuItem value="admin">Admin</MenuItem>
          <MenuItem value="client">Client</MenuItem>
        </TextField>
        <PrimaryButton fullWidth={isMobile} sx={{ ml: { sm: 'auto !important' } , bbgcolor: isDarkMode ? '#28334e' : '#ffffff'}} startIcon={<AddCircleOutlineIcon />} onClick={() => setIsCreateModalOpen(true)}>
          New Account
        </PrimaryButton>
      </Stack>

      {isMobile ? (
        <Stack spacing={2} alignItems="center">
          {filteredUsers.map((user) => (
            <Paper key={user.id} sx={{ p: 3, width: '100%', borderRadius: 2, textAlign: 'center', bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}><StyledAvatar user={user} size={40} /></Box>
              <Typography variant="h6" fontWeight={800}>{user.full_name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{user.email}</Typography>
              <Box sx={{ mb: 2 }}><RoleChip role={user.role} /></Box>
              <Divider sx={{ mb: 2 }} />
              <Stack direction="row" spacing={2} justifyContent="center">
                <IconButton onClick={() => handleOpenEdit(user)} sx={{ color: theme.palette.primary.main }}><EditIcon /></IconButton>
                <DeleteButton onClick={() => handleDeleteTrigger(user)} />
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 1, bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
          <Table>
            <TableHead sx={{ bgcolor: isDarkMode ? '#0f172a' : '#213C51' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 750 }}>USER DETAILS</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 750 }} align="center">ROLE</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 750 }} align="center"> JOINED DATE</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 750 }} align="right">ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <StyledAvatar user={user} />
                      <Box>
                        <Typography fontWeight={700}>{user.full_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell align="center"><RoleChip role={user.role} /></TableCell>
                  <TableCell align="center">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <IconButton onClick={() => handleOpenEdit(user)} size="small" color="primary"><EditIcon fontSize="small" /></IconButton>
                      <DeleteButton onClick={() => handleDeleteTrigger(user)} />
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* DELETE CONFIRMATION */}
      <Dialog open={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} PaperProps={{ sx: { borderRadius: 3, p: 1, width: '400px' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="error" /> Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontWeight: 500 }}>
            Delete <b>{selectedUser?.full_name}</b>? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 3 }}>
          <Button onClick={() => setIsConfirmOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleDeleteAccount} variant="contained" color="error" sx={{ borderRadius: 2 }}>
            {loading ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* CREATE ACCOUNT MODAL */}
      <ActionModal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Account" onConfirm={handleCreateAccount} confirmText={loading ? "Creating..." : "Create Account"}>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <FormInput label="Full Name" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} InputProps={{ startAdornment: <BadgeIcon sx={{ mr: 1, opacity: 0.7 }} /> }} />
          <FormInput label="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} InputProps={{ startAdornment: <EmailIcon sx={{ mr: 1, opacity: 0.7 }} /> }} />
          <FormInput label="Default Password" type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} InputProps={{ startAdornment: <KeyIcon sx={{ mr: 1, opacity: 0.7 }} /> }} />
          <TextField select label="Role" fullWidth value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
            <MenuItem value="superadmin">Superadmin</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="client">Client</MenuItem>
          </TextField>
        </Stack>
      </ActionModal>

      {/* EDIT ACCOUNT MODAL */}
      <ActionModal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Account" onConfirm={handleUpdateAccount} confirmText={loading ? "Saving..." : "Update"}>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <FormInput label="Full Name" value={editData.fullName} onChange={(e) => setEditData({...editData, fullName: e.target.value})} />
          <TextField select label="Role" fullWidth value={editData.role} onChange={(e) => setEditData({...editData, role: e.target.value})}>
            <MenuItem value="superadmin">Superadmin</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="client">Client</MenuItem>
          </TextField>
        </Stack>
      </ActionModal>
    </Box>
  );
};

export default ManageAccount;