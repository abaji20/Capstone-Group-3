import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Stack, Typography, MenuItem, TextField, InputAdornment, Avatar,
  IconButton, Chip, useTheme, useMediaQuery, Divider, Snackbar, Alert,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
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
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SchoolIcon from '@mui/icons-material/School';
import BusinessIcon from '@mui/icons-material/Business';

const AdminManageAccount = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDarkMode = theme.palette.mode === 'dark';
  
  const pageBg = isDarkMode ? '#0f172a' : '#ffffff';
  const inputBg = isDarkMode ? '#28334e' : '#ffffff';
  const borderCol = isDarkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0';
  const headerColor = isDarkMode ? '#1e1e2d' : '#213C51';

  // Constants
  const departments = ["BSIT", "BSBA", "BSAIS", "BSENG", "BEED", "BSMATH", "BSSCI", "BSPSYCH"];
  const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year", "High School", "Senior High", "Staff"];

  // States
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({ fullName: '', email: '', role: 'client', password: '', idNumber: '', department: '', yearLevel: '' });
  const [editData, setEditData] = useState({ id: '', fullName: '', role: 'client', oldName: '', idNumber: '', department: '', yearLevel: '' });
  const [notify, setNotify] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => { 
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
      } else {
        fetchClients();
      }
    };
    checkUser();
  }, [navigate]);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .order('created_at', { ascending: false });
    
    if (error) console.error("Error fetching users:", error);
    else setUsers(data || []);
    setLoading(false);
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

  const handleCreateAccount = async () => {
    if (!formData.email || !formData.password || !formData.fullName || !formData.idNumber || !formData.department || !formData.yearLevel) {
      setNotify({ open: true, message: 'Please fill in all fields!', severity: 'error' });
      return;
    }
    if (!formData.email.toLowerCase().endsWith('@goldenlink.ph')) {
      setNotify({ open: true, message: 'Only @goldenlink.ph accounts are allowed!', severity: 'error' });
      return;
    }
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { full_name: formData.fullName, role: 'client' },
          emailRedirectTo: 'https://capstone-group-3-swart.vercel.app/login'
        }
      });
      if (authError) throw authError;
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          id_number: formData.idNumber,
          department: formData.department,
          year_level: formData.yearLevel,
          role: 'client'
        }]);
      
      if (profileError) throw profileError;

      await createAuditLog('Create Client', `Created GLC account: ${formData.fullName}`);
      setNotify({ open: true, message: 'Client account created! Verify email to activate.', severity: 'success' });
      setIsCreateModalOpen(false);
      setFormData({ fullName: '', email: '', role: 'client', password: '', idNumber: '', department: '', yearLevel: '' });
      fetchClients();
    } catch (err) {
      const errorMessage = err.message?.toLowerCase().includes('unique constraint') || err.message?.toLowerCase().includes('already registered')
        ? 'This email is already registered!' 
        : 'Error: ' + err.message;
      setNotify({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };
const handleUpdateAccount = async () => {
    setLoading(true);
    
    // Hanapin ang original data para sa comparison
    const originalUser = users.find(u => u.id === editData.id);
    
    const { error } = await supabase
      .from('profiles')
      .update({ 
        full_name: editData.fullName,
        id_number: editData.idNumber,
        department: editData.department,
        year_level: editData.yearLevel
      })
      .eq('id', editData.id);

    if (error) {
      setNotify({ open: true, message: 'Update failed', severity: 'error' });
    } else {
      const targetName = editData.fullName;

      // 1. I-collect ang bawat pagbabago bilang magkakahiwalay na entries
      let changes = [];
      if (originalUser) {
        if (originalUser.full_name !== editData.fullName) 
          changes.push(`Name: [${originalUser.full_name}] -> [${editData.fullName}]`);
        
        if (originalUser.id_number !== editData.idNumber) 
          changes.push(`ID: [${originalUser.id_number || 'None'}] -> [${editData.idNumber}]`);
        
        if (originalUser.department !== editData.department) 
          changes.push(`Dept: [${originalUser.department || 'None'}] -> [${editData.department}]`);
        
        if (originalUser.year_level !== editData.yearLevel) 
          changes.push(`Year: [${originalUser.year_level || 'None'}] -> [${editData.yearLevel}]`);
      }

      // 2. I-save sa Audit Logs nang magkakahiwalay (Individual Rows)
      if (changes.length > 0) {
        // Gagamit tayo ng Promise.all para sabay-sabay i-insert pero separate rows
        await Promise.all(
          changes.map(detail => 
            createAuditLog('Edit Client', `Updated client info for: ${targetName} : ${detail}`)
          )
        );
      } else {
        // Optional: Log lang kung walang binago talaga
        await createAuditLog('Edit Client', `Updated client info for: ${targetName} : No changes made`);
      }
      
      setNotify({ open: true, message: 'Updated successfully!', severity: 'success' });
      setIsEditModalOpen(false);
      fetchClients();
    }
    setLoading(false);
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', selectedUser?.id);
      if (error) throw error;
      await createAuditLog('Delete Client', `Deleted account for ${selectedUser?.full_name}`);
      setNotify({ open: true, message: 'Account deleted!', severity: 'success' });
      setIsConfirmOpen(false);
      fetchClients();
    } catch (err) {
      setNotify({ open: true, message: 'Delete failed. Active dependencies found.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (u.full_name || "").toLowerCase().includes(term) || 
      (u.email || "").toLowerCase().includes(term) ||
      (u.id_number || "").toLowerCase().includes(term) ||
      (u.department || "").toLowerCase().includes(term) ||
      (u.year_level || "").toLowerCase().includes(term);

    let matchesDate = true;
    if (dateFilter) {
      const userDate = new Date(u.created_at).toISOString().split('T')[0];
      matchesDate = userDate === dateFilter;
    }
    return matchesSearch && matchesDate;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 5 }, minHeight: '100vh', bgcolor: pageBg }}>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontStyle: 'italic', fontWeight: 900, color: isDarkMode ? '#ffffff' : '#213C51', fontFamily: "'Montserrat', sans-serif", fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' }, letterSpacing: '1px' }}>
          CLIENT MANAGEMENT
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, display: 'block', mt: 0 }}>
          MANAGE SYSTEM CLIENTS & ACCOUNTS
        </Typography>
      </Box>

      <Snackbar open={notify.open} autoHideDuration={4000} onClose={() => setNotify({ ...notify, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={notify.severity} variant="filled">{notify.message}</Alert>
      </Snackbar>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4 }}>
        <TextField fullWidth placeholder="Search by name, email, ID, dept, or year..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ bgcolor: inputBg, borderRadius: 0.5 }} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment>) }} />
        <TextField type="date" label="Date Joined" size="medium" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} sx={{ minWidth: 200, bgcolor: inputBg, borderRadius: 0.5, '& input::-webkit-calendar-picker-indicator': { filter: isDarkMode ? 'invert(1)' : 'none' } }} InputProps={{ startAdornment: ( <InputAdornment position="start"> <CalendarTodayIcon fontSize="small" sx={{ color: isDarkMode ? '#ffffff' : 'primary.main' }} /> </InputAdornment> ) }} />
        <PrimaryButton sx={{ bgcolor: '#213C51', height: '56px', minWidth: 180, borderRadius: 0.5, '&:hover': { bgcolor: '#1a3041' } }} startIcon={<AddCircleOutlineIcon />} onClick={() => setIsCreateModalOpen(true)}> New Client </PrimaryButton>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}> <CircularProgress color="primary" /> </Box>
      ) : filteredUsers.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 10 }}>
          <PersonOutlineIcon sx={{ fontSize: 60, color: 'text.disabled', opacity: 0.3, mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase' }}> No Client Accounts Found </Typography>
        </Box>
      ) : isMobile ? (
        <Stack spacing={2}>
          {filteredUsers.map((user) => (
            <Paper key={user.id} sx={{ p: 3, width: '100%', borderRadius: 2, textAlign: 'center', bgcolor: theme.palette.background.paper, border: `1px solid ${borderCol}`, boxShadow: 'none' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}> <Avatar sx={{ width: 45, height: 45, bgcolor: '#fbc02d', color: '#000000', fontWeight: 700 }}>{user.full_name?.charAt(0)}</Avatar> </Box>
              <Typography variant="h6" fontWeight={800}>{user.full_name}</Typography>
              <Typography variant="body2" color="text.secondary">{user.email}</Typography>
              <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 700 }}>ID: {user.id_number}</Typography>
              <Box sx={{ mb: 2 }}>
                <Chip label={user.department?.toUpperCase() || "NO DEPT"} size="small" variant="outlined" sx={{ mb: 1, mr: 1 }} />
                <Chip label={user.year_level?.toUpperCase() || "NO YEAR"} size="small" variant="outlined" sx={{ mb: 1, mr: 1 }} />
                <Chip label="CLIENT" variant="outlined" sx={{ borderColor: theme.palette.primary.main, color: theme.palette.primary.main, fontWeight: 800, borderRadius: '10px', width: '120px', fontSize: '0.7rem' }} />
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Stack direction="row" spacing={2} justifyContent="center">
                <IconButton onClick={() => { setEditData({ id: user.id, fullName: user.full_name, idNumber: user.id_number, department: user.department, yearLevel: user.year_level }); setIsEditModalOpen(true); }} sx={{ color: theme.palette.primary.main }}><EditIcon /></IconButton>
                <DeleteButton onClick={() => { setSelectedUser(user); setIsConfirmOpen(true); }} />
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 1, bgcolor: theme.palette.background.paper, border: `1px solid ${borderCol}`, boxShadow: 'none' }}>
          <Table>
            <TableHead sx={{ bgcolor: headerColor }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 800 }}>CLIENT DETAILS</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 800 }} align="center">ID NUMBER</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 800 }} align="center">DEPT / YEAR</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 800 }} align="center">JOINED DATE</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 800 }} align="right">ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ width: 35, height: 35, bgcolor: '#fbc02d', color: '#000000', fontWeight: 700 }}>{user.full_name?.charAt(0)}</Avatar>
                      <Box> <Typography fontWeight={700}>{user.full_name}</Typography> <Typography variant="caption" color="text.secondary">{user.email}</Typography> </Box>
                    </Stack>
                  </TableCell>
                  <TableCell align="center"> <Typography variant="body2" sx={{ fontWeight: 600 }}>{user.id_number || '---'}</Typography> </TableCell>
                  <TableCell align="center"> 
                    <Typography variant="body2" fontWeight={700}>{user.department || '---'}</Typography>
                    <Typography variant="caption" color="primary" fontWeight={800}>{user.year_level || '---'}</Typography>
                  </TableCell>
                  <TableCell align="center">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <IconButton onClick={() => { setEditData({ id: user.id, fullName: user.full_name, idNumber: user.id_number, department: user.department, yearLevel: user.year_level }); setIsEditModalOpen(true); }} size="small" color="primary"><EditIcon fontSize="small" /></IconButton>
                      <DeleteButton onClick={() => { setSelectedUser(user); setIsConfirmOpen(true); }} />
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <Dialog open={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} PaperProps={{ sx: { borderRadius: 3, p: 1, width: '400px' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}> <WarningAmberIcon color="error" /> Confirm Deletion </DialogTitle>
        <DialogContent> <DialogContentText sx={{ fontWeight: 500 }}> Delete <b>{selectedUser?.full_name}</b>? Profile removal only. </DialogContentText> </DialogContent>
        <DialogActions sx={{ pb: 2, px: 3 }}>
          <Button onClick={() => setIsConfirmOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleDeleteAccount} variant="contained" color="error" sx={{ borderRadius: 2 }}> {loading ? "Deleting..." : "Confirm Delete"} </Button>
        </DialogActions>
      </Dialog>

      {/* CREATE MODAL */}
      <ActionModal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create GLC Client" onConfirm={handleCreateAccount} confirmText={loading ? "Creating..." : "Create Account"}>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <FormInput label="Full Name" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} InputProps={{ startAdornment: <BadgeIcon sx={{ mr: 1, opacity: 0.7 }} /> }} />
          <FormInput label="ID Number" placeholder="e.g. 2024-0001" value={formData.idNumber} onChange={(e) => setFormData({...formData, idNumber: e.target.value})} InputProps={{ startAdornment: <SchoolIcon sx={{ mr: 1, opacity: 0.7 }} /> }} />
          
          <Stack direction="row" spacing={2}>
            <FormInput select label="Department" fullWidth value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} InputProps={{ startAdornment: <BusinessIcon sx={{ mr: 1, opacity: 0.7 }} /> }}>
              {departments.map((dept) => <MenuItem key={dept} value={dept}>{dept}</MenuItem>)}
            </FormInput>

            <FormInput select label="Year Level" fullWidth value={formData.yearLevel} onChange={(e) => setFormData({...formData, yearLevel: e.target.value})} InputProps={{ startAdornment: <SchoolIcon sx={{ mr: 1, opacity: 0.7 }} /> }}>
              {yearLevels.map((year) => <MenuItem key={year} value={year}>{year}</MenuItem>)}
            </FormInput>
          </Stack>

          <FormInput label="Email" placeholder="example@goldenlink.ph" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} InputProps={{ startAdornment: <EmailIcon sx={{ mr: 1, opacity: 0.7 }} /> }} />
          <FormInput label="Default Password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} InputProps={{ startAdornment: <KeyIcon sx={{ mr: 1, opacity: 0.7 }} />, endAdornment: ( <InputAdornment position="end"> <IconButton onClick={() => setShowPassword(!showPassword)} edge="end"> {showPassword ? <VisibilityOff /> : <Visibility />} </IconButton> </InputAdornment> ) }} />
          <Typography variant="caption" color="text.secondary">Requirement: Must use <b>@goldenlink.ph</b> domain.</Typography>
        </Stack>
      </ActionModal>

      {/* EDIT MODAL */}
      <ActionModal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Client Info" onConfirm={handleUpdateAccount} confirmText={loading ? "Saving..." : "Update"}>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <FormInput label="Full Name" value={editData.fullName} onChange={(e) => setEditData({...editData, fullName: e.target.value})} InputProps={{ startAdornment: <BadgeIcon sx={{ mr: 1, opacity: 0.7 }} /> }} />
          <FormInput label="ID Number" value={editData.idNumber} onChange={(e) => setEditData({...editData, idNumber: e.target.value})} InputProps={{ startAdornment: <SchoolIcon sx={{ mr: 1, opacity: 0.7 }} /> }} />
          
          <Stack direction="row" spacing={2}>
            <FormInput select label="Department" fullWidth value={editData.department} onChange={(e) => setEditData({...editData, department: e.target.value})} InputProps={{ startAdornment: <BusinessIcon sx={{ mr: 1, opacity: 0.7 }} /> }}>
              {departments.map((dept) => <MenuItem key={dept} value={dept}>{dept}</MenuItem>)}
            </FormInput>

            <FormInput select label="Year Level" fullWidth value={editData.yearLevel} onChange={(e) => setEditData({...editData, yearLevel: e.target.value})} InputProps={{ startAdornment: <SchoolIcon sx={{ mr: 1, opacity: 0.7 }} /> }}>
              {yearLevels.map((year) => <MenuItem key={year} value={year}>{year}</MenuItem>)}
            </FormInput>
          </Stack>
        </Stack>
      </ActionModal>
    </Box>
  );
};

export default AdminManageAccount;