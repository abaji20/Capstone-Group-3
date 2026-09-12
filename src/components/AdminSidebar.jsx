import React, { useContext, useEffect, useState } from 'react';
import { 
  Drawer, List, ListItem, ListItemButton, ListItemIcon, 
  ListItemText, Typography, Box, useTheme, useMediaQuery, 
  Avatar, Tooltip, Stack, Divider, Alert, Snackbar, MenuItem,
  FormControl, InputLabel, Select, TextField, Dialog, DialogActions,
  Button, Paper
} from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Logout as LogoutIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Fingerprint as FingerprintIcon,
  School as SchoolIcon,
  AssignmentInd as AssignmentIndIcon,
  ChatBubbleOutline as ChatIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { navLinks } from '../navConfig';
import { supabase } from '../supabaseClient';
import { ColorModeContext } from '../App'; 
import { ActionModal, FormInput } from '../shared'; 
import glclogo from '../assets/glclogo.png';
import glclogdesktop from '../assets/glclogdesktop.png';

const expandedWidth = 280;
const collapsedWidth = 85;

const AdminSidebar = ({ mobileOpen, handleDrawerToggle }) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const colorMode = useContext(ColorModeContext);
  const isDarkMode = theme.palette.mode === 'dark';
  
  const [userRoleText, setUserRoleText] = useState('ADMIN');
  const [isHovered, setIsHovered] = useState(false);

  // Constants
  const departments = ["Staff", "Steward"];
  const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year", "N/A"];

  // MODAL STATES
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  
  const [initialData, setInitialData] = useState({});
  const [userData, setUserData] = useState({ 
    id: '', 
    full_name: '', 
    department: '', 
    id_number: '', 
    role: '',
    year_level: '' 
  });
  
  // Password state & Validation
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validatePassword = (password) => {
    if (!password) {
      setPasswordError('');
      return true;
    }
    const minLength = 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (password.length < minLength) {
      setPasswordError('Password must be at least 8 characters long');
      return false;
    }
    if (!hasUpper) {
      setPasswordError('Password must contain at least one uppercase letter');
      return false;
    }
    if (!hasLower) {
      setPasswordError('Password must contain at least one lowercase letter');
      return false;
    }
    if (!hasNumber) {
      setPasswordError('Password must contain at least one number');
      return false;
    }

    setPasswordError('');
    return true;
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setNewPassword(value);
    validatePassword(value);
  };
  
  const [requestData, setRequestData] = useState({ role: '', reason: '' });
  const [latestRequest, setLatestRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notify, setNotify] = useState({ open: false, message: '', severity: 'success' });

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profile) {
        setUserData(profile);
        setInitialData(profile);

        if (profile.role) {
          setUserRoleText(profile.role.toUpperCase());
        }

        const { data: lastReq } = await supabase
          .from('role_requests')
          .select('status, remarks, requested_role')
          .eq('requested_by', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (lastReq) setLatestRequest(lastReq);
      }
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateProfile = async () => {
    if (newPassword.trim() !== '' && !validatePassword(newPassword)) {
      setNotify({ open: true, message: 'Please fulfill all password requirements!', severity: 'error' });
      return;
    }

    setLoading(true);

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        full_name: userData.full_name, 
        department: userData.department, 
        id_number: userData.id_number,
        year_level: userData.year_level 
      })
      .eq('id', userData.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      setNotify({ open: true, message: 'Update failed!', severity: 'error' });
      setLoading(false);
      return;
    }

    const changes = [];
    if ((initialData.full_name || '') !== (userData.full_name || '')) {
      changes.push(`name from "${initialData.full_name || 'N/A'}" to "${userData.full_name}"`);
    }
    if ((initialData.department || '') !== (userData.department || '')) {
      changes.push(`department from "${initialData.department || 'N/A'}" to "${userData.department}"`);
    }
    if ((initialData.year_level || '') !== (userData.year_level || '')) {
      changes.push(`year level from "${initialData.year_level || 'N/A'}" to "${userData.year_level}"`);
    }
    if ((initialData.id_number || '') !== (userData.id_number || '')) {
      changes.push(`ID number from "${initialData.id_number || 'N/A'}" to "${userData.id_number}"`);
    }

    if (changes.length > 0) {
      const logDetails = `Updated ${changes.join(', ')}`;

      const { error: logError } = await supabase
        .from('audit_logs')
        .insert([{
          user_id: userData.id,
          action_type: 'Edit Profile',
          description: logDetails,
          created_at: new Date().toISOString()
        }]);

      if (logError) {
        console.error("Error inserting to audit_logs:", logError);
      }
    }

    if (newPassword.trim() !== '') {
      const { error: pwdError } = await supabase.auth.updateUser({ password: newPassword });
      
      if (pwdError) {
        setNotify({ open: true, message: 'Failed to update password: ' + pwdError.message, severity: 'error' });
        setLoading(false);
        return;
      }
    }

    if (requestData.role) {
      const { error: roleError } = await supabase
        .from('role_requests')
        .insert([{
          requested_by: userData.id,
          current_role: userData.role, 
          requested_role: requestData.role,
          reason: requestData.reason,
          status: 'pending'
        }]);

      if (roleError) {
        setNotify({ open: true, message: 'Role request failed!', severity: 'error' });
      } else {
        setNotify({ open: true, message: 'Profile updated and request sent!', severity: 'success' });
        fetchProfile();
      }
    } else {
      setNotify({ open: true, message: 'Profile updated successfully!', severity: 'success' });
    }

    setInitialData(userData);
    if (userData.role) {
      setUserRoleText(userData.role.toUpperCase());
    }
    setNewPassword('');
    setPasswordError('');
    setIsProfileModalOpen(false);
    setRequestData({ role: '', reason: '' }); 
    setLoading(false);
  };

  const handleConfirmLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const isMini = !isMobile && !isHovered;

  const drawerContent = (
    <Box 
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        backgroundColor: theme.palette.mode === 'dark' ? '#0f172a' : '#213C51',
        backgroundImage: theme.palette.mode === 'dark'
          ? 'linear-gradient(180deg, #1e293b 0%, #111827 48%, #0f172a 100%)'
          : 'linear-gradient(180deg, #294d65 0%, #213c51 48%, #172f43 100%)',
        color: 'white',
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)', 
        width: isMini ? collapsedWidth : expandedWidth,
        borderRight: '1px solid rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'visible', 
      }}
    >
      {/* BRAND SECTION */}
      <Box sx={{
        minHeight: 110,
        px: isMini ? 1.5 : 2,
        py: 2.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(15,23,42,0.16)'
      }}>
        <Box
          component="img"
          src={isMini ? glclogo : glclogdesktop}
          alt="Golden Link College Foundation"
          sx={{
            width: isMini ? 48 : '100%',
            maxWidth: 240,
            height: isMini ? 48 : 62,
            objectFit: 'contain',
            transition: 'all 0.2s ease'
          }}
        />
      </Box>

      {/* NAVIGATION */}
      <List sx={{ px: 1.5, py: 2, flexGrow: 1 }}>
        {navLinks.admin.map((item) => {
          const isActive = location.pathname === item.path;
          
          const buttonContent = (
            <ListItemButton 
              key={item.name}
              component={Link} 
              to={item.path}
              onClick={() => isMobile && handleDrawerToggle()}
              sx={{ 
                borderRadius: '10px',
                py: { xs: 1.2, sm: 1.5, md: 1.8 }, 
                px: { xs: 1.5, sm: 1.8, md: 2 }, 
                mb: { xs: 1, md: 1.5 },
                justifyContent: isMini ? 'center' : 'flex-start',
                background: isActive ? 'rgba(96,165,250,0.18)' : 'transparent',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
                position: 'relative',
                transition: 'all 0.2s ease',
                borderLeft: isActive ? '4px solid #60a5fa' : '4px solid transparent',
              }}
            >
              <ListItemIcon sx={{ 
                color: isActive ? '#3b82f6' : '#ffffff',
                minWidth: isMini ? 0 : 45, 
                display: 'flex',
                justifyContent: 'center' 
              }}>
                {React.isValidElement(item.icon) 
                  ? React.cloneElement(item.icon, { sx: { fontSize: { xs: 24, sm: 26, md: 28 } } }) 
                  : null}
              </ListItemIcon>
              {!isMini && (
                <ListItemText 
                  primary={item.name} 
                  primaryTypographyProps={{ 
                    fontSize: { xs: '0.95rem', sm: '1rem', md: '1.1rem' }, 
                    fontWeight: isActive ? 500 : 500,
                    color: isActive ? '#3b82f6' : '#ffffff',
                    whiteSpace: 'nowrap'
                  }} 
                />
              )}
            </ListItemButton>
          );

          return (
            <ListItem key={item.name} disablePadding>
              {isMini ? (
                <Tooltip title={item.name} placement="right" arrow>
                  {buttonContent}
                </Tooltip>
              ) : buttonContent}
            </ListItem>
          );
        })}
      </List>

      {/* BOTTOM TOOLS */}
      <Box sx={{
        p: 1.5,
        mt: 'auto',
        borderTop: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(15,23,42,0.28)'
      }}>
        <Tooltip title={isMini ? "Profile Settings" : ""} placement="right">
          <Box
            onClick={() => setIsProfileModalOpen(true)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isMini ? 'center' : 'flex-start',
              px: isMini ? 0 : 1,
              py: 1,
              mb: 1,
              borderRadius: '8px',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
              transition: 'background 0.2s'
            }}
          >
            <ListItemIcon sx={{
              color: '#ffffff',
              minWidth: 40,
              width: 40,
              justifyContent: 'center'
            }}>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            {!isMini && (
              <Box sx={{ ml: 0.5, textAlign: 'left', whiteSpace: 'nowrap' }}>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#ffea00', textTransform: 'uppercase' }}>
                  {userData.role || userRoleText}
                </Typography>
                <Typography variant="caption" sx={{ color: '#93c5fd', fontSize: '0.65rem', fontWeight: 600 }}>
                  Manage Profile
                </Typography>
              </Box>
            )}
          </Box>
        </Tooltip>

        <ListItemButton 
          onClick={colorMode.toggleColorMode}
          sx={{ borderRadius: '8px', justifyContent: isMini ? 'center' : 'flex-start', mb: 1 }}
        >
          <ListItemIcon sx={{ color: isDarkMode ? '#ffea00' : 'rgba(255,255,255,0.7)', minWidth: isMini ? 0 : 40, justifyContent: 'center' }}>
            {isDarkMode ? <Brightness7Icon fontSize="small" sx={{ color: '#ffea00' }} /> : <Brightness4Icon fontSize="small" />}
          </ListItemIcon>
          {!isMini && <ListItemText primary="Appearance" primaryTypographyProps={{ fontSize: { xs: '0.8rem', md: '0.85rem' }, color: '#ffffff', whiteSpace: 'nowrap' }} />}
        </ListItemButton>

        <ListItemButton 
          onClick={() => setIsLogoutModalOpen(true)}
          sx={{ 
            borderRadius: '8px', 
            color: '#ff5252', 
            justifyContent: isMini ? 'center' : 'flex-start'
          }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: isMini ? 0 : 40, justifyContent: 'center' }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          {!isMini && <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 600, fontSize: { xs: '0.8rem', md: '0.85rem' }, whiteSpace: 'nowrap' }} />}
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box component="nav">
      <Snackbar open={notify.open} autoHideDuration={3000} onClose={() => setNotify({ ...notify, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={notify.severity} variant="filled">{notify.message}</Alert>
      </Snackbar>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          zIndex: theme.zIndex.drawer + 2, 
          '& .MuiDrawer-paper': { width: expandedWidth, border: 'none', bgcolor: theme.palette.mode === 'dark' ? '#111827' : '#213C51' },
        }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { 
            width: isMini ? collapsedWidth : expandedWidth, 
            border: 'none',
            overflowX: 'hidden',
            transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: theme.zIndex.drawer + 1,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* MATCHED LOGOUT CONFIRMATION DIALOG DESIGN */}
      <Dialog
        open={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        PaperProps={{
          elevation: 12,
          sx: {
            backgroundColor: '#434e5e',
            color: '#ffffff',
            borderRadius: '24px',
            maxWidth: 480,
            width: '100%',
            px: 3.5,
            pt: 3.5,
            pb: 2.5,
            boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.35)',
          }
        }}
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
          }
        }}
      >
        <Box sx={{ mb: 2 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 500, 
              color: '#ffffff', 
              fontSize: '1.65rem',
              letterSpacing: '-0.3px',
              mb: 1
            }}
          >
            Confirm Logout
          </Typography>

          <Typography 
            variant="body1" 
            sx={{ 
              color: '#bdc5d1', 
              fontSize: '1.05rem',
              fontWeight: 400,
              lineHeight: 1.4
            }}
          >
            Are you sure you want to log out of your account?
          </Typography>
        </Box>

        <DialogActions 
          sx={{ 
            p: 0, 
            pt: 1, 
            justifyContent: 'flex-end', 
            gap: 1.5 
          }}
        >
          <Button
            onClick={() => setIsLogoutModalOpen(false)}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              color: '#d1d5db',
              px: 2,
              py: 1,
              borderRadius: '8px',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff'
              }
            }}
          >
            Cancel
          </Button>

          <Button
            onClick={handleConfirmLogout}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              backgroundColor: '#ff4d39',
              color: '#ffffff',
              px: 3,
              py: 1,
              borderRadius: '16px',
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: '#e03e2b',
                boxShadow: 'none'
              }
            }}
          >
            Logout
          </Button>
        </DialogActions>
      </Dialog>

      {/* PROFILE SETTINGS MODAL */}
      <ActionModal 
        open={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        title="Edit Administrator Profile" 
        onConfirm={handleUpdateProfile} 
        confirmText={loading ? "Saving..." : "Save Changes"}
      >
        <Stack spacing={2.5} sx={{ mt: 2 }}>
          <FormInput label="Full Name" value={userData.full_name || ''} onChange={(e) => setUserData({...userData, full_name: e.target.value})} InputProps={{ startAdornment: <PersonIcon sx={{ mr: 1, opacity: 0.7 }} /> }} />
          
          <Stack direction="row" spacing={2}>
            <FormInput 
              select 
              label="User Type" 
              fullWidth
              value={userData.department || ''} 
              onChange={(e) => setUserData({...userData, department: e.target.value})} 
              InputProps={{ startAdornment: <BusinessIcon sx={{ mr: 1, opacity: 0.7 }} /> }}
            >
              {departments.map((dept) => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </FormInput>

            <FormInput 
              select 
              label="Year Level" 
              fullWidth
              value={userData.year_level || ''} 
              onChange={(e) => setUserData({...userData, year_level: e.target.value})} 
              InputProps={{ startAdornment: <SchoolIcon sx={{ mr: 1, opacity: 0.7 }} /> }}
            >
              {yearLevels.map((year) => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </FormInput>
          </Stack>

          <FormInput label="Employee / ID Number" value={userData.id_number || ''} onChange={(e) => setUserData({...userData, id_number: e.target.value})} InputProps={{ startAdornment: <FingerprintIcon sx={{ mr: 1, opacity: 0.7 }} /> }} />

          <Divider sx={{ my: 1 }}><Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary', px: 1 }}>CHANGE PASSWORD</Typography></Divider>
          
          <FormInput 
            type="password" 
            label="New Password" 
            placeholder="Leave blank to keep current password" 
            value={newPassword} 
            onChange={handlePasswordChange}
            error={Boolean(passwordError)}
            helperText={passwordError || "Must be at least 8 characters with uppercase, lowercase, and numbers."}
            InputProps={{ startAdornment: <LockIcon sx={{ mr: 1, opacity: 0.7 }} /> }} 
          />

          {latestRequest?.status === 'rejected' && (
            <Alert severity="error" variant="outlined" sx={{ borderRadius: '8px' }}>
              <Typography variant="caption" sx={{ fontWeight: 900, display: 'block' }}>REQUEST REJECTED ({latestRequest.requested_role})</Typography>
              <Typography variant="body2">"{latestRequest.remarks || 'No remarks provided.'}"</Typography>
            </Alert>
          )}

          {latestRequest?.status === 'pending' && (
            <Alert severity="info" variant="outlined" sx={{ borderRadius: '8px' }}>
              <Typography variant="body2">Request for <b>{latestRequest.requested_role}</b> is pending review.</Typography>
            </Alert>
          )}

          <Divider sx={{ my: 1 }}><Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary', px: 1 }}>REQUEST ROLE</Typography></Divider>
          
          <Stack spacing={2}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel sx={{ fontWeight: 600 }}>Request Access Level</InputLabel>
              <Select
                value={requestData.role}
                label="Request Access Level"
                onChange={(e) => setRequestData({...requestData, role: e.target.value})}
                startAdornment={<AssignmentIndIcon sx={{ mr: 1, opacity: 0.7, fontSize: 20 }} />}
                sx={{ borderRadius: '8px', fontWeight: 700 }}
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="superadmin">Superadmin</MenuItem>
                <MenuItem value="client">Client</MenuItem>
              </Select>
            </FormControl>

            {requestData.role && (
              <TextField
                fullWidth multiline rows={2} label="Reason" placeholder="Why do you need superadmin access?" value={requestData.reason} onChange={(e) => setRequestData({...requestData, reason: e.target.value})} InputProps={{ startAdornment: <ChatIcon sx={{ mr: 1, mt: 1, opacity: 0.7, alignSelf: 'flex-start' }} /> }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              />
            )}
          </Stack>
        </Stack>
      </ActionModal>
    </Box>
  );
};

export default AdminSidebar;