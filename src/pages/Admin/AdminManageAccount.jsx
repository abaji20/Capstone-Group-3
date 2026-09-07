import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Stack, Typography, MenuItem, TextField, InputAdornment, Avatar,
  IconButton, Chip, useTheme, useMediaQuery, Divider, Snackbar, Alert,
  CircularProgress, Button
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PrimaryButton, ActionModal, FormInput } from '../../shared';
import { supabase } from '../../supabaseClient';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import BadgeIcon from '@mui/icons-material/Badge';
import EmailIcon from '@mui/icons-material/Email';
import KeyIcon from '@mui/icons-material/Key';
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

  // Departments List
  const departments = [
    "BS-Information Technology",
    "BS-Business Administration",
    "BS-Accounting Information Systems",
    "BS-English",
    "BEED-Elementary Education",
    "BS-Mathematics",
    "BS-Science",
    "BS-Psychology"
  ];
  
  // Year Levels List
  const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year", "N/A"];

  // Default empty form
  const defaultFormData = { fullName: '', email: '', role: 'client', password: '', idNumber: '', department: '', yearLevel: '' };

  // States
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Restore create form data and modal open status from sessionStorage if available
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(() => {
    return sessionStorage.getItem('isCreateModalOpen') === 'true';
  });
  const [formData, setFormData] = useState(() => {
    const saved = sessionStorage.getItem('createFormData');
    return saved ? JSON.parse(saved) : defaultFormData;
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({ id: '', fullName: '', role: 'client', oldName: '', idNumber: '', department: '', yearLevel: '' });
  const [notify, setNotify] = useState({ open: false, message: '', severity: 'success' });

  // Auto-save Create Form Data to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('createFormData', JSON.stringify(formData));
  }, [formData]);

  // Auto-save Create Modal Open state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('isCreateModalOpen', isCreateModalOpen);
  }, [isCreateModalOpen]);

  // Styles to remove browser autofill blue background
  const removeAutofillBg = {
    '& input:-webkit-autofill': {
      WebkitBoxShadow: `0 0 0 1000px ${inputBg} inset !important`,
      WebkitTextFillColor: isDarkMode ? '#ffffff' : '#000000',
      transition: 'background-color 5000s ease-in-out 0s',
    },
  };

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

  const validatePassword = (password) => {
    const missing = [];
    if (password.length < 8) {
      missing.push('be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      missing.push('an uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      missing.push('a lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      missing.push('a number');
    }
    return missing;
  };

  const formatIdNumber = (value) => {
    const raw = value.replace(/\D/g, '').slice(0, 10);
    if (raw.length <= 2) return raw;
    if (raw.length <= 4) return `${raw.slice(0, 2)}-${raw.slice(2)}`;
    return `${raw.slice(0, 2)}-${raw.slice(2, 4)}-${raw.slice(4)}`;
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    sessionStorage.removeItem('createFormData');
    sessionStorage.removeItem('isCreateModalOpen');
    setFormData(defaultFormData);
  };

  const handleCreateAccount = async () => {
    if (!formData.fullName || !formData.idNumber || !formData.department || !formData.yearLevel || !formData.email || !formData.password) {
      setNotify({ open: true, message: 'All fields are required!', severity: 'error' });
      return;
    }

    const cleanId = formData.idNumber.replace(/-/g, '');
    if (cleanId.length !== 10) {
      setNotify({ open: true, message: 'ID Number must be exactly 10 digits in XX-XX-XXXXXX format!', severity: 'error' });
      return;
    }

    const missingPasswordRequirements = validatePassword(formData.password);
    if (missingPasswordRequirements.length > 0) {
      setNotify({ 
        open: true, 
        message: `Password must contain: ${missingPasswordRequirements.join(', ')}!`, 
        severity: 'error' 
      });
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
      
      // Clear saved data upon successful creation
      handleCloseCreateModal();
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
    if (!editData.fullName || !editData.idNumber || !editData.department || !editData.yearLevel) {
      setNotify({ open: true, message: 'All fields are required!', severity: 'error' });
      return;
    }

    const cleanId = editData.idNumber.replace(/-/g, '');
    if (cleanId.length !== 10) {
      setNotify({ open: true, message: 'ID Number must be exactly 10 digits in XX-XX-XXXXXX format!', severity: 'error' });
      return;
    }

    setLoading(true);
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

      if (changes.length > 0) {
        await Promise.all(
          changes.map(detail => 
            createAuditLog('Edit Client', `Updated client info for: ${targetName} : ${detail}`)
          )
        );
      } else {
        await createAuditLog('Edit Client', `Updated client info for: ${targetName} : No changes made`);
      }
      
      setNotify({ open: true, message: 'Updated successfully!', severity: 'success' });
      setIsEditModalOpen(false);
      fetchClients();
    }
    setLoading(false);
  };

  // Filter Logic
  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (u.full_name || "").toLowerCase().includes(term) || 
      (u.email || "").toLowerCase().includes(term) ||
      (u.id_number || "").toLowerCase().includes(term) ||
      (u.department || "").toLowerCase().includes(term) ||
      (u.year_level || "").toLowerCase().includes(term);

    let matchesDate = true;
    if (filterDate) {
      const userDate = new Date(u.created_at).toISOString().split('T')[0];
      matchesDate = userDate === filterDate;
    }

    return matchesSearch && matchesDate;
  });

  // Pagination Calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 5 }, minHeight: '100vh', bgcolor: pageBg }}>
      
      {/* HEADER WITH ACCOUNT COUNTER */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h3" sx={{ fontStyle: 'italic', fontWeight: 900, color: isDarkMode ? '#ffffff' : '#213C51', fontFamily: "'Montserrat', sans-serif", fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' }, letterSpacing: '1px' }}>
            ACCOUNT MANAGEMENT
          </Typography>
          <Chip 
            label={`${filteredUsers.length} ${filteredUsers.length === 1 ? 'Account' : 'Accounts'}`} 
            color="primary" 
            sx={{ fontWeight: 800, borderRadius: '8px', fontSize: '0.85rem' }} 
          />
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, display: 'block', mt: 0 }}>
          MANAGE SYSTEM USERS & ACCOUNTS
        </Typography>
      </Box>

      <Snackbar open={notify.open} autoHideDuration={4000} onClose={() => setNotify({ ...notify, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={notify.severity} variant="filled">{notify.message}</Alert>
      </Snackbar>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4 }}>
        <TextField fullWidth placeholder="Search by name, email, ID, dept, or year..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} sx={{ bgcolor: inputBg, borderRadius: 0.5, ...removeAutofillBg }} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment>) }} />
        
        {/* Single Date Filter */}
        <TextField 
          type="date" 
          size="medium" 
          value={filterDate} 
          onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }} 
          sx={{ minWidth: 200, bgcolor: inputBg, borderRadius: 0.5, '& input::-webkit-calendar-picker-indicator': { filter: isDarkMode ? 'invert(1)' : 'none' }, ...removeAutofillBg }} 
          InputProps={{ startAdornment: ( <InputAdornment position="start"> <CalendarTodayIcon fontSize="small" sx={{ color: isDarkMode ? '#ffffff' : 'primary.main' }} /> </InputAdornment> ) }} 
        />

        <PrimaryButton 
          sx={{ 
            bgcolor: isDarkMode ? '#28334e' : '#213C51', 
            color: '#ffffff',
            height: '56px', 
            minWidth: 180, 
            borderRadius: 0.5, 
            '&:hover': { bgcolor: isDarkMode ? '#3b486b' : '#1a3041' } 
          }} 
          startIcon={<AddCircleOutlineIcon sx={{ color: '#ffffff' }} />} 
          onClick={() => setIsCreateModalOpen(true)}
        > 
          New Account 
        </PrimaryButton>
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
          {currentUsers.map((user) => (
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
              {currentUsers.map((user) => (
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
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 4, gap: 1 }}>
          {currentPage > 1 && (
            <Button 
              onClick={() => handlePageChange(currentPage - 1)}
              sx={{ minWidth: 'auto', px: 1.5, color: '#0000ff', fontWeight: 500, fontSize: '1rem', textTransform: 'none' }}
            >
              Prev
            </Button>
          )}

          {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
            <Button
              key={page}
              onClick={() => handlePageChange(page)}
              sx={{
                height: '32px',
                p: 0,
                fontSize: '1rem',
                fontWeight: page === currentPage ? 700 : 400,
                color: page === currentPage ? '#854d0e' : '#0000ff',
                textTransform: 'none',
                minWidth: 'auto',
                mx: 0.5
              }}
            >
              {page}
            </Button>
          ))}

          {currentPage < totalPages && (
            <Button 
              onClick={() => handlePageChange(currentPage + 1)}
              sx={{ minWidth: 'auto', px: 1.5, color: '#0000ff', fontWeight: 500, fontSize: '1rem', textTransform: 'none' }}
            >
              Next
            </Button>
          )}
        </Box>
      )}

      {/* CREATE MODAL */}
      <ActionModal 
        open={isCreateModalOpen} 
        onClose={handleCloseCreateModal} 
        title="Create New User Account" 
        onConfirm={handleCreateAccount} 
        confirmText={loading ? "Creating..." : "Create Account"}
        confirmBtnSx={{
          bgcolor: isDarkMode ? '#28334e' : '#213C51',
          color: '#ffffff',
          '&:hover': { bgcolor: isDarkMode ? '#3b486b' : '#1a3041' }
        }}
      >
        <Stack spacing={2} sx={{ mt: 2, ...removeAutofillBg }}>
          <FormInput 
            required 
            label="Full Name" 
            placeholder="e.g. Juan Dela Cruz"
            value={formData.fullName} 
            onChange={(e) => setFormData({...formData, fullName: e.target.value})} 
            InputProps={{ startAdornment: <BadgeIcon sx={{ mr: 1, opacity: 0.7 }} /> }} 
            sx={removeAutofillBg}
          />
          <FormInput 
            required 
            label="ID Number" 
            placeholder="Enter Student ID Number" 
            value={formData.idNumber} 
            onChange={(e) => setFormData({...formData, idNumber: formatIdNumber(e.target.value)})} 
            InputProps={{ startAdornment: <SchoolIcon sx={{ mr: 1, opacity: 0.7 }} /> }} 
            sx={removeAutofillBg}
          />
          
          <Stack direction="row" spacing={2}>
            <FormInput 
              required
              select 
              label="Department" 
              fullWidth 
              value={formData.department} 
              onChange={(e) => setFormData({...formData, department: e.target.value})} 
              InputProps={{ startAdornment: <BusinessIcon sx={{ mr: 1, opacity: 0.7 }} /> }}
              sx={removeAutofillBg}
            >
              <MenuItem value="" disabled>Select Department</MenuItem>
              {departments.map((dept) => <MenuItem key={dept} value={dept}>{dept}</MenuItem>)}
            </FormInput>

            <FormInput 
              required
              select 
              label="Year Level" 
              fullWidth 
              value={formData.yearLevel} 
              onChange={(e) => setFormData({...formData, yearLevel: e.target.value})} 
              InputProps={{ startAdornment: <SchoolIcon sx={{ mr: 1, opacity: 0.7 }} /> }}
              sx={removeAutofillBg}
            >
              <MenuItem value="" disabled>Select Year Level</MenuItem>
              {yearLevels.map((year) => <MenuItem key={year} value={year}>{year}</MenuItem>)}
            </FormInput>
          </Stack>

          <FormInput 
            required 
            label="Email" 
            placeholder="example@goldenlink.ph" 
            value={formData.email} 
            onChange={(e) => setFormData({...formData, email: e.target.value})} 
            InputProps={{ startAdornment: <EmailIcon sx={{ mr: 1, opacity: 0.7 }} /> }} 
            sx={removeAutofillBg}
          />
          <FormInput 
            required 
            label="Default Password" 
            placeholder="Enter temporary password"
            type={showPassword ? 'text' : 'password'} 
            value={formData.password} 
            onChange={(e) => setFormData({...formData, password: e.target.value})} 
            InputProps={{ 
              startAdornment: <KeyIcon sx={{ mr: 1, opacity: 0.7 }} />, 
              endAdornment: ( 
                <InputAdornment position="end"> 
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end"> 
                    {showPassword ? <VisibilityOff /> : <Visibility />} 
                  </IconButton> 
                </InputAdornment> 
              ) 
            }} 
            sx={removeAutofillBg}
          />
          <Typography variant="caption" color="text.secondary">Requirement: Must use <b>@goldenlink.ph</b> domain and at least 8 characters long with uppercase, lowercase, and numbers.</Typography>
        </Stack>
      </ActionModal>

      {/* EDIT MODAL */}
      <ActionModal 
        open={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title="Edit Account Info" 
        onConfirm={handleUpdateAccount} 
        confirmText={loading ? "Saving..." : "Update"}
        confirmBtnSx={{
          bgcolor: isDarkMode ? '#28334e' : '#213C51',
          color: '#ffffff',
          '&:hover': { bgcolor: isDarkMode ? '#3b486b' : '#1a3041' }
        }}
      >
        <Stack spacing={2} sx={{ mt: 2, ...removeAutofillBg }}>
          <FormInput 
            required 
            label="Full Name" 
            placeholder="e.g. Juan Dela Cruz"
            value={editData.fullName} 
            onChange={(e) => setEditData({...editData, fullName: e.target.value})} 
            InputProps={{ startAdornment: <BadgeIcon sx={{ mr: 1, opacity: 0.7 }} /> }} 
            sx={removeAutofillBg}
          />
          <FormInput 
            required 
            label="ID Number" 
            placeholder="23-02-000104" 
            value={editData.idNumber} 
            onChange={(e) => setEditData({...editData, idNumber: formatIdNumber(e.target.value)})} 
            InputProps={{ startAdornment: <SchoolIcon sx={{ mr: 1, opacity: 0.7 }} /> }} 
            sx={removeAutofillBg}
          />
          
          <Stack direction="row" spacing={2}>
            <FormInput 
              required
              select 
              label="Department" 
              fullWidth 
              value={editData.department} 
              onChange={(e) => setEditData({...editData, department: e.target.value})} 
              InputProps={{ startAdornment: <BusinessIcon sx={{ mr: 1, opacity: 0.7 }} /> }}
              sx={removeAutofillBg}
            >
              <MenuItem value="" disabled>Select Department</MenuItem>
              {departments.map((dept) => <MenuItem key={dept} value={dept}>{dept}</MenuItem>)}
            </FormInput>

            <FormInput 
              required
              select 
              label="Year Level" 
              fullWidth 
              value={editData.yearLevel} 
              onChange={(e) => setEditData({...editData, yearLevel: e.target.value})} 
              InputProps={{ startAdornment: <SchoolIcon sx={{ mr: 1, opacity: 0.7 }} /> }}
              sx={removeAutofillBg}
            >
              <MenuItem value="" disabled>Select Year Level</MenuItem>
              {yearLevels.map((year) => <MenuItem key={year} value={year}>{year}</MenuItem>)}
            </FormInput>
          </Stack>
        </Stack>
      </ActionModal>
    </Box>
  );
};

export default AdminManageAccount;