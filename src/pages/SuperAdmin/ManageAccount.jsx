import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Stack, Typography, MenuItem, TextField, InputAdornment, Avatar,
  IconButton, Chip, useTheme, useMediaQuery, Divider, Snackbar, Alert,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button,
  Tabs, Tab
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
import BusinessIcon from '@mui/icons-material/Business'; 
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SchoolIcon from '@mui/icons-material/School'; // Added for Year Level icon

const ManageAccount = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDarkMode = theme.palette.mode === 'dark';
  
  const pageBg = isDarkMode ? '#0f172a' : '#ffffff';

  // Departments List
  const departments = ["BSIT", "BSBA", "BSAIS", "BSENG", "BEED", "BSMATH", "BSSCI", "BSPSYCH"];
  // Year Levels List
  const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Highschool", "Senior Highschool", "Staff", "N/A"];

  // States
  const [users, setUsers] = useState([]);
  const [roleRequests, setRoleRequests] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [requestSearch, setRequestSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [requestRoleFilter, setRequestRoleFilter] = useState('All Roles');
  const [requestDateFilter, setRequestDateFilter] = useState('');
  
  // Modal/Dialog States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  
  // Data States
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [formData, setFormData] = useState({ 
    fullName: '', email: '', role: 'client', password: '', 
    department: '', idNumber: '', yearLevel: '' // Added yearLevel
  });
  const [editData, setEditData] = useState({ 
    id: '', fullName: '', role: '', department: '', idNumber: '', yearLevel: '', // Added yearLevel
    oldName: '', oldRole: '', oldDept: '', oldIdNum: '', oldYear: '' // Added oldYear
  });
  const [notify, setNotify] = useState({ open: false, message: '', severity: 'success' });

  // Route Protection & Initial Fetch
  useEffect(() => { 
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
      } else {
        fetchUsers();
        fetchRoleRequests();
      }
    };
    checkUser();
  }, [navigate]);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) console.error("Error fetching users:", error);
    else setUsers(data || []);
  };

  const fetchRoleRequests = async () => {
    const { data, error } = await supabase
      .from('role_requests')
      .select('*, profiles(full_name, email)')
      .eq('status', 'pending');
    if (error) console.error("Error fetching role requests:", error);
    else setRoleRequests(data || []);
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

  // --- ROLE REQUEST HANDLERS ---
  const handleApproveRole = async (req) => {
    setLoading(true);
    try {
      const { error: profErr } = await supabase
        .from('profiles')
        .update({ role: req.requested_role })
        .eq('id', req.requested_by);
      
      if (profErr) throw profErr;

      await supabase.from('role_requests')
        .update({ status: 'approved', remarks: 'Approved by administrator' })
        .eq('id', req.id);

      await createAuditLog('Role Approval', `Approved ${req.requested_role} role for ${req.profiles.full_name}`);
      setNotify({ open: true, message: 'Role upgrade approved!', severity: 'success' });
      fetchRoleRequests();
      fetchUsers();
    } catch (err) {
      setNotify({ open: true, message: 'Approval failed', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRole = async () => {
    if (!rejectionRemarks) {
      setNotify({ open: true, message: 'Please provide a reason for rejection', severity: 'warning' });
      return;
    }
    setLoading(true);
    try {
      await supabase.from('role_requests')
        .update({ status: 'rejected', remarks: rejectionRemarks })
        .eq('id', selectedRequest.id);

      await createAuditLog('Role Rejection', `Rejected role request for ${selectedRequest.profiles.full_name}. Reason: ${rejectionRemarks}`);
      setNotify({ open: true, message: 'Request rejected', severity: 'info' });
      setIsRejectModalOpen(false);
      setRejectionRemarks('');
      fetchRoleRequests();
    } catch (err) {
      setNotify({ open: true, message: 'Rejection failed', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!formData.email || !formData.password || !formData.fullName) {
      setNotify({ open: true, message: 'Please fill in required fields!', severity: 'error' });
      return;
    }
    if (!formData.email.toLowerCase().endsWith('@goldenlink.ph')) {
      setNotify({ open: true, message: 'Only @goldenlink.ph accounts are allowed!', severity: 'error' });
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
        setNotify({ open: true, message: 'Email already registered. Please check inbox or try another.', severity: 'warning' });
        setLoading(false);
        return;
      }
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { 
            full_name: formData.fullName, 
            role: formData.role,
            department: formData.department,
            id_number: formData.idNumber,
            year_level: formData.yearLevel // Added year_level
          },
          emailRedirectTo: 'https://capstone-group-3-swart.vercel.app/login'
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
          role: formData.role,
          department: formData.department,
          id_number: formData.idNumber,
          year_level: formData.yearLevel // Added year_level
        }]);
      if (profileError) {
        setNotify({ open: true, message: 'Account created, but profile sync delayed.', severity: 'warning' });
      } else {
        await createAuditLog('Create Account', `Created ${formData.role} account for ${formData.fullName}`);
        setNotify({ open: true, message: 'Account created! Please check email to confirm.', severity: 'success' });
      }
      setIsCreateModalOpen(false);
      setFormData({ fullName: '', email: '', role: 'client', password: '', department: '', idNumber: '', yearLevel: '' });
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
        department: user.department || '',
        idNumber: user.id_number || '',
        yearLevel: user.year_level || '', // Added yearLevel
        oldName: user.full_name,
        oldRole: user.role,
        oldDept: user.department || 'N/A',
        oldIdNum: user.id_number || 'N/A',
        oldYear: user.year_level || 'N/A' // Added oldYear
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateAccount = async () => {
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ 
      full_name: editData.fullName, 
      role: editData.role,
      department: editData.department,
      id_number: editData.idNumber,
      year_level: editData.yearLevel // Added year_level
    }).eq('id', editData.id);
    if (error) {
      setNotify({ open: true, message: 'Update failed', severity: 'error' });
    } else {
      if (editData.oldName !== editData.fullName) {
        await createAuditLog('Edit Account', `Updated ${editData.fullName}: Changed name from "${editData.oldName}" to "${editData.fullName}"`);
      }
      if (editData.oldRole !== editData.role) {
        await createAuditLog('Edit Account', `Updated ${editData.fullName}: Changed role from "${editData.oldRole}" to "${editData.role}"`);
      }
      const currentDept = editData.department || 'N/A';
      if (editData.oldDept !== currentDept) {
        await createAuditLog('Edit Account', `Updated ${editData.fullName}: Changed department from "${editData.oldDept}" to "${currentDept}"`);
      }
      const currentIdNum = editData.idNumber || 'N/A';
      if (editData.oldIdNum !== currentIdNum) {
        await createAuditLog('Edit Account', `Updated ${editData.fullName}: Changed ID number from "${editData.oldIdNum}" to "${currentIdNum}"`);
      }
      const currentYear = editData.yearLevel || 'N/A';
      if (editData.oldYear !== currentYear) {
        await createAuditLog('Edit Account', `Updated ${editData.fullName}: Changed year level from "${editData.oldYear}" to "${currentYear}"`);
      }
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
    const userId = selectedUser?.id;
    const deletedUserName = selectedUser?.full_name;
    try {
      await supabase.from('audit_logs').delete().eq('user_id', userId);
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      await createAuditLog('Delete Account', `Deleted account for ${deletedUserName}`);
      setNotify({ open: true, message: 'Account deleted!', severity: 'success' });
      setIsConfirmOpen(false);
      fetchUsers();
    } catch (err) {
      console.error("Delete failed:", err);
      setNotify({ open: true, message: 'Delete failed. User may have active dependencies.', severity: 'error' });
    } finally {
      setLoading(false);
    }
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
    const matchesSearch = (u.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
                          (u.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                          (u.id_number?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All Roles' || u.role?.toLowerCase() === roleFilter.toLowerCase();
    let matchesDate = true;
    if (dateFilter) {
      const userDate = new Date(u.created_at).toISOString().split('T')[0];
      matchesDate = userDate === dateFilter;
    }
    return matchesSearch && matchesRole && matchesDate;
  });

  const filteredRequests = roleRequests.filter((req) => {
    const name = req.profiles?.full_name?.toLowerCase() || '';
    const email = req.profiles?.email?.toLowerCase() || '';
    const term = requestSearch.toLowerCase();
    const matchesSearch = name.includes(term) || email.includes(term);
    const matchesRole = requestRoleFilter === 'All Roles' || req.requested_role?.toLowerCase() === requestRoleFilter.toLowerCase();
    let matchesDate = true;
    if (requestDateFilter) {
      const requestDate = new Date(req.created_at).toISOString().split('T')[0];
      matchesDate = requestDate === requestDateFilter;
    }
    return matchesSearch && matchesRole && matchesDate;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 5 }, minHeight: '100vh', bgcolor: pageBg }}>
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h3" sx={{ fontStyle: 'italic', fontWeight: 900, color: isDarkMode ? '#ffffff' : '#213C51', fontFamily: "'Montserrat', sans-serif", fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' }, letterSpacing: '1px' }}>
              ACCOUNT MANAGEMENT
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, display: 'block', mt: 0 }}>
              MANAGE USER ACCOUNTS & ROLES
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Tabs 
        value={activeTab} 
        onChange={(e, v) => setActiveTab(v)} 
        sx={{ 
          mb: 3, 
          '& .MuiTab-root': { fontWeight: 800, fontSize: '0.9rem', color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#213C51' },
          '& .Mui-selected': { color: '#3b82f6 !important' }
        }}
      >
        <Tab label={`User List (${users.length})`} />
        <Tab label={`Role Requests (${roleRequests.length})`} />
      </Tabs>

      <Snackbar open={notify.open} autoHideDuration={4000} onClose={() => setNotify({ ...notify, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={notify.severity} variant="filled">{notify.message}</Alert>
      </Snackbar>

      {activeTab === 0 ? (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
            <TextField placeholder="Search accounts or ID..." size="medium" fullWidth={isMobile} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ flexGrow: 1, bgcolor: isDarkMode ? '#28334e' : '#ffffff', borderRadius: 0.5 }} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment>) }} />
            <TextField type="date" size="medium" label="Date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} sx={{ minWidth: 180, bgcolor: isDarkMode ? '#28334e' : '#ffffff', borderRadius: 0.5, '& input::-webkit-calendar-picker-indicator': { filter: isDarkMode ? 'invert(1)' : 'none' } }} InputProps={{ startAdornment: ( <InputAdornment position="start"> <CalendarTodayIcon fontSize="small" sx={{ color: isDarkMode ? '#ffffff' : 'primary.main' }} /> </InputAdornment> ) }} />
            <TextField select size="medium" label="Filter Role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} sx={{ minWidth: 200, bgcolor: isDarkMode ? '#28334e' : '#ffffff', borderRadius: 0.5 }}>
              <MenuItem value="All Roles">All Roles</MenuItem>
              <MenuItem value="superadmin">Superadmin</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="client">Client</MenuItem>
            </TextField>
            <PrimaryButton fullWidth={isMobile} sx={{color: '#ffffff', bgcolor: '#28334e', '&:hover': { bgcolor: '#1e293b' }}} startIcon={<AddCircleOutlineIcon />} onClick={() => setIsCreateModalOpen(true)}> New Account </PrimaryButton>
          </Stack>   

          {isMobile ? (
            <Stack spacing={2} alignItems="center">
              {filteredUsers.map((user) => (
                <Paper key={user.id} sx={{ p: 3, width: '100%', borderRadius: 2, textAlign: 'center', bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}><StyledAvatar user={user} size={40} /></Box>
                  <Typography variant="h6" fontWeight={800}>{user.full_name}</Typography>
                  <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                  <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>ID: {user.id_number || 'N/A'} | {user.department || 'N/A'} | {user.year_level || 'N/A'}</Typography>
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
                    <TableCell sx={{ color: 'white', fontWeight: 750 }} align="center">ID NUMBER</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 750 }} align="center">DEPT / YEAR</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 750 }} align="center">ROLE</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 750 }} align="center">JOINED DATE</TableCell>
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
                      <TableCell align="center"><Typography variant="body2" fontWeight={600}>{user.id_number || '—'}</Typography></TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={600}>{user.department || '—'}</Typography>
                        <Typography variant="caption" color="primary" sx={{ fontWeight: 700 }}>{user.year_level || ''}</Typography>
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
        </>
      ) : (
        /* ROLE REQUEST SECTION - UNCHANGED DESIGN */
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
            <TextField placeholder="Search by name or email..." size="medium" fullWidth={isMobile} value={requestSearch} onChange={(e) => setRequestSearch(e.target.value)} sx={{ flexGrow: 1, bgcolor: isDarkMode ? '#28334e' : '#ffffff', borderRadius: 0.5 }} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment>) }} />
            <TextField type="date" size="medium" label="Request Date" InputLabelProps={{ shrink: true }} value={requestDateFilter} onChange={(e) => setRequestDateFilter(e.target.value)} sx={{ minWidth: 180, bgcolor: isDarkMode ? '#28334e' : '#ffffff', borderRadius: 0.5, '& input::-webkit-calendar-picker-indicator': { filter: isDarkMode ? 'invert(1)' : 'none' } }} InputProps={{ startAdornment: ( <InputAdornment position="start"> <CalendarTodayIcon fontSize="small" sx={{ color: isDarkMode ? '#ffffff' : 'primary.main' }} /> </InputAdornment> ) }} />
            <TextField select size="medium" label="Requested Role" value={requestRoleFilter} onChange={(e) => setRequestRoleFilter(e.target.value)} sx={{ minWidth: 180, bgcolor: isDarkMode ? '#28334e' : '#ffffff', borderRadius: 0.5 }}>
              <MenuItem value="All Roles">All Roles</MenuItem>
              <MenuItem value="superadmin">Superadmin</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="client">Client</MenuItem>
            </TextField>
            {(requestSearch || requestDateFilter || requestRoleFilter !== 'All Roles') && (
              <Button variant="text" onClick={() => { setRequestSearch(''); setRequestDateFilter(''); setRequestRoleFilter('All Roles'); }} sx={{ fontWeight: 700 }}> RESET </Button>
            )}
          </Stack>

          {isMobile ? (
            <Stack spacing={2} alignItems="center">
              {filteredRequests.length === 0 ? (
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 600, py: 8 }}> No pending role requests found. </Typography>
              ) : (
                filteredRequests.map((req) => (
                  <Paper key={req.id} sx={{ p: 3, width: '100%', borderRadius: 2, textAlign: 'center', bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}><StyledAvatar user={{ role: req.current_role, full_name: req.profiles?.full_name }} size={40} /></Box>
                    <Typography variant="h6" fontWeight={800}>{req.profiles?.full_name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{req.profiles?.email}</Typography>
                    <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 1 }}><RoleChip role={req.current_role} /><Chip label={req.requested_role} sx={{ bgcolor: '#3b82f6', color: 'white', fontWeight: 800, textTransform: 'uppercase', borderRadius: '10px', width: '120px', fontSize: '0.7rem' }} /></Stack>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', mb: 2 }}> "{req.reason || 'No reason provided'}" </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Stack direction="row" spacing={1.5} justifyContent="center">
                      <Button variant="contained" color="success" size="small" startIcon={<CheckCircleIcon />} onClick={() => handleApproveRole(req)} sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.80rem', px: 1, boxShadow: 'none', '&:hover': { filter: 'brightness(0.9)' } }}> APPROVE </Button>
                      <Button variant="contained" color="error" size="small" startIcon={<CancelIcon />} onClick={() => { setSelectedRequest(req); setIsRejectModalOpen(true); }} sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.80rem', px: 1, boxShadow: 'none', '&:hover': { filter: 'brightness(0.9)' } }}> REJECT </Button>
                    </Stack>
                  </Paper>
                ))
              )}
            </Stack>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 1, bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
              <Table>
                <TableHead sx={{ bgcolor: isDarkMode ? '#0f172a' : '#213C51' }}>
                  <TableRow>
                    <TableCell sx={{ color: 'white', fontWeight: 750 }}>REQUESTER DETAILS</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 750 }} align="center">CURRENT ROLE</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 750 }} align="center">REQUESTED ROLE</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 750 }}>REASON FOR REQUEST</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 750 }} align="right">ACTIONS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 8 }}><Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 600 }}> No pending role requests found. </Typography></TableCell></TableRow>
                  ) : (
                    filteredRequests.map((req) => (
                      <TableRow key={req.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <StyledAvatar user={{ role: req.current_role, full_name: req.profiles?.full_name }} />
                            <Box><Typography fontWeight={700}>{req.profiles?.full_name}</Typography><Typography variant="caption" color="text.secondary">{req.profiles?.email}</Typography></Box>
                          </Stack>
                        </TableCell>
                        <TableCell align="center"><RoleChip role={req.current_role} /></TableCell>
                        <TableCell align="center"><Chip label={req.requested_role} sx={{ bgcolor: '#3b82f6', color: 'white', fontWeight: 800, textTransform: 'uppercase', borderRadius: '10px', width: '120px', fontSize: '0.7rem' }} /></TableCell>
                        <TableCell sx={{ maxWidth: 250 }}><Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontStyle: 'italic' }}> "{req.reason || 'No reason provided'}" </Typography></TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                            <Button variant="contained" color="success" size="small" startIcon={<CheckCircleIcon />} onClick={() => handleApproveRole(req)} sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.80rem', px: 1, boxShadow: 'none', '&:hover': { filter: 'brightness(0.9)' } }}> APPROVE </Button>
                            <Button variant="contained" color="error" size="small" startIcon={<CancelIcon />} onClick={() => { setSelectedRequest(req); setIsRejectModalOpen(true); }} sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.80rem', px: 1, boxShadow: 'none', '&:hover': { filter: 'brightness(0.9)' } }}> REJECT </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* --- ALL MODALS --- */}
      <Dialog open={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} PaperProps={{ sx: { borderRadius: 3, p: 1, width: '400px' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}> <WarningAmberIcon color="error" /> Confirm Deletion </DialogTitle>
        <DialogContent> <DialogContentText sx={{ fontWeight: 500 }}> Delete <b>{selectedUser?.full_name}</b>? This cannot be undone. </DialogContentText> </DialogContent>
        <DialogActions sx={{ pb: 2, px: 3 }}>
          <Button onClick={() => setIsConfirmOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={handleDeleteAccount} variant="contained" color="error" sx={{ borderRadius: 2 }}> {loading ? "Deleting..." : "Confirm Delete"} </Button>
        </DialogActions>
      </Dialog>

      <ActionModal open={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title="Reject Role Request" onConfirm={handleRejectRole} confirmText={loading ? "Rejecting..." : "Confirm Reject"}>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">Provide a reason for rejecting the request from <b>{selectedRequest?.profiles?.full_name}</b>:</Typography>
          <TextField fullWidth multiline rows={3} placeholder="e.g. Unauthorized access, please verify department..." value={rejectionRemarks} onChange={(e) => setRejectionRemarks(e.target.value)} />
        </Stack>
      </ActionModal>

      <ActionModal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Account" onConfirm={handleCreateAccount} confirmText={loading ? "Creating..." : "Create Account"}>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <FormInput label="Full Name" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} InputProps={{ startAdornment: <BadgeIcon sx={{ mr: 1, opacity: 0.7 }} /> }} />
          <FormInput label="ID Number (Student/Staff)" value={formData.idNumber} onChange={(e) => setFormData({...formData, idNumber: e.target.value})} InputProps={{ startAdornment: <FingerprintIcon sx={{ mr: 1, opacity: 0.7 }} /> }} />
          
          <FormInput select label="Department" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} InputProps={{ startAdornment: <BusinessIcon sx={{ mr: 1, opacity: 0.7 }} /> }}>
            {departments.map((dept) => (
              <MenuItem key={dept} value={dept}>{dept}</MenuItem>
            ))}
          </FormInput>

          {/* YEAR LEVEL DROPDOWN IN CREATE */}
          <FormInput select label="Year Level" value={formData.yearLevel} onChange={(e) => setFormData({...formData, yearLevel: e.target.value})} InputProps={{ startAdornment: <SchoolIcon sx={{ mr: 1, opacity: 0.7 }} /> }}>
            {yearLevels.map((year) => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </FormInput>

          <FormInput label="Email" placeholder="example@goldenlink.ph" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} InputProps={{ startAdornment: <EmailIcon sx={{ mr: 1, opacity: 0.7 }} /> }} />
          <FormInput label="Default Password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} InputProps={{ startAdornment: <KeyIcon sx={{ mr: 1, opacity: 0.7 }} />, endAdornment: ( <InputAdornment position="end"> <IconButton onClick={() => setShowPassword(!showPassword)} edge="end"> {showPassword ? <VisibilityOff /> : <Visibility />} </IconButton> </InputAdornment> ) }} />
          <TextField select label="Role" fullWidth value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
            <MenuItem value="superadmin">Superadmin</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="client">Client</MenuItem>
          </TextField>
        </Stack>
      </ActionModal>

      <ActionModal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Account" onConfirm={handleUpdateAccount} confirmText={loading ? "Saving..." : "Update"}>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <FormInput label="Full Name" value={editData.fullName} onChange={(e) => setEditData({...editData, fullName: e.target.value})} />
          <FormInput label="ID Number" value={editData.idNumber} onChange={(e) => setEditData({...editData, idNumber: e.target.value})} />
          
          <FormInput select label="Department" value={editData.department} onChange={(e) => setEditData({...editData, department: e.target.value})} InputProps={{ startAdornment: <BusinessIcon sx={{ mr: 1, opacity: 0.7 }} /> }}>
            {departments.map((dept) => (
              <MenuItem key={dept} value={dept}>{dept}</MenuItem>
            ))}
          </FormInput>

          {/* YEAR LEVEL DROPDOWN IN EDIT */}
          <FormInput select label="Year Level" value={editData.yearLevel} onChange={(e) => setEditData({...editData, yearLevel: e.target.value})} InputProps={{ startAdornment: <SchoolIcon sx={{ mr: 1, opacity: 0.7 }} /> }}>
            {yearLevels.map((year) => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </FormInput>

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