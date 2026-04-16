import React, { useState, useEffect, useContext } from 'react';
import { 
  AppBar, Toolbar, Box, Avatar, Typography, ButtonBase, Menu, MenuItem, 
  ListItemIcon, Divider, IconButton, useTheme, Drawer, List, ListItem, 
  ListItemText, useMediaQuery, Switch, ListItemButton, Stack, Snackbar, Alert,
  FormControl, InputLabel, Select, TextField
} from '@mui/material';
import { 
  LockReset, Brightness4 as Brightness4Icon, 
  Brightness7 as Brightness7Icon, Menu as MenuIcon,
  AccountCircle as AccountCircleIcon, Logout as LogoutIcon,
  Person as PersonIcon, Business as BusinessIcon, 
  Fingerprint as FingerprintIcon, Download as DownloadIcon,
  AssignmentInd as AssignmentIndIcon, ChatBubbleOutline as ChatIcon
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { navLinks } from '../navConfig';
import { LogoutButton, ActionModal, FormInput } from '../shared';
import logo from '../assets/logo.png'; 
import nonamelogo from '../assets/nonamelogo.png'; 
import { ColorModeContext } from '../App';

const expandedWidth = 280;

const customAnimations = `
  @keyframes floatFaster {
    0% { transform: translateY(0px) scale(1); }
    50% { transform: translateY(-8px) scale(1.15); }
    100% { transform: translateY(0px) scale(1); }
  }
  @keyframes lineGrow {
    from { width: 0%; opacity: 0; }
    to { width: 70%; opacity: 1; }
  }
`;

const ClientTopbar = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [username, setUsername] = useState('Loading...');
  
  // Lists for Dropdowns
  const departments = ["BSIT", "BSBA", "BSAIS", "BSENG", "BEED", "BSMATH", "BSSCI", "BSPSYCH"];
  const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

  const [userData, setUserData] = useState({ 
    id: '', 
    full_name: '', 
    department: '', 
    id_number: '', 
    role: '',
    year_level: '' 
  });
  const [requestData, setRequestData] = useState({ role: '', reason: '' });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notify, setNotify] = useState({ open: false, message: '', severity: 'success' });

  const [latestRequest, setLatestRequest] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setUsername(data.full_name);
        setUserData(data);

        const { data: lastRequest } = await supabase
          .from('role_requests')
          .select('status, remarks, requested_role')
          .eq('requested_by', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (lastRequest) {
          setLatestRequest(lastRequest);
        }
      }
    }
  };

  useEffect(() => { fetchUser(); }, []);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    
    // 1. UPDATE PROFILE (Including Year Level)
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
      setNotify({ open: true, message: 'Update failed!', severity: 'error' });
      setLoading(false);
      return;
    }

    // 2. INSERT ACTIVITY LOG
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert([{
        user_id: userData.id,
        action: 'Update Profile',
        details: `Client updated profile info: ${userData.full_name}`,
        created_at: new Date().toISOString()
      }]);

    if (logError) console.error("Activity Log Error:", logError);

    // 3. ROLE REQUEST LOGIC
    if (requestData.role) {
      const { error: roleError } = await supabase
        .from('role_requests')
        .insert([{
          requested_by: userData.id,
          "current_role": userData.role, 
          requested_role: requestData.role,
          reason: requestData.reason,
          status: 'pending'
        }]);

      if (roleError) {
        setNotify({ open: true, message: 'Role request failed!', severity: 'error' });
      } else {
        setNotify({ open: true, message: 'Profile updated and role request sent!', severity: 'success' });
        fetchUser(); 
      }
    } else {
      setNotify({ open: true, message: 'Profile updated successfully!', severity: 'success' });
    }

    setUsername(userData.full_name);
    setIsProfileModalOpen(false);
    setRequestData({ role: '', reason: '' }); 
    setLoading(false);
  };

  const drawerContent = (
    <Box 
      sx={{ 
        height: '100%', display: 'flex', flexDirection: 'column', 
        backgroundColor: theme.palette.mode === 'dark' ? '#111827' : '#213C51', 
        color: 'white', width: expandedWidth, borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', px: 3, minHeight: 100 }}>
        <Avatar sx={{ bgcolor: '#3b82f6', width: 45, height: 45, border: '2px solid rgba(255,255,255,0.2)' }}>
          <AccountCircleIcon sx={{ fontSize: 28 }} />
        </Avatar>
        <Box sx={{ ml: 2, textAlign: 'left', whiteSpace: 'nowrap' }}>
          <Typography variant="body1" sx={{ fontWeight: 800, color: 'white' }}>{username}</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontSize: '0.7rem' }}>
            Client Account
          </Typography>
        </Box>
      </Box>

      <List sx={{ px: 1.5, flexGrow: 1 }}>
        {navLinks.client.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.name} disablePadding>
              <ListItemButton 
                component={Link} to={item.path} onClick={handleDrawerToggle}
                sx={{ 
                  borderRadius: '8px', py: 1.2, mb: 0.5,
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  borderLeft: isActive ? '4px solid #3b82f6' : '3px solid transparent',
                }}
              >
                <ListItemIcon sx={{ color: isActive ? '#3b82f6' : 'rgba(255,255,255,0.7)', minWidth: 40 }}>
                  {React.cloneElement(item.icon, { sx: { fontSize: 22 } })}
                </ListItemIcon>
                <ListItemText primary={item.name} primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: isActive ? 600 : 400, color: isActive ? 'white' : 'rgba(255,255,255,0.7)' }} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Box sx={{ p: 2, mt: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <ListItemButton onClick={handleLogout} sx={{ borderRadius: '8px', color: '#ff5252' }}>
          <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><LogoutIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 600, fontSize: '0.85rem' }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <>
      <style>{customAnimations}</style>
      <Snackbar open={notify.open} autoHideDuration={3000} onClose={() => setNotify({ ...notify, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={notify.severity} variant="filled">{notify.message}</Alert>
      </Snackbar>

      <AppBar 
        position="fixed" 
        sx={{ 
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(17, 24, 39, 0.95)' : '#213C51', 
          backdropFilter: 'blur(8px)', height: { xs: 70, md: 80 }, justifyContent: 'center',
          zIndex: theme.zIndex.drawer + 1, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', borderBottom: '1px solid rgba(0, 58, 151, 0.34)'
        }}
      >
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', px: { xs: 1, md: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 1 } }}>
            {isMobile && (
              <IconButton color="inherit" onClick={handleDrawerToggle} sx={{ mr: 0.5 }}>
                <MenuIcon fontSize="medium" />
              </IconButton>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: { xs: 1, md: 0 } }} onClick={() => navigate('/')}>
              <Box component="img" src={nonamelogo} sx={{ height: { xs: 35, md: 45 }, filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.2))' }} />
              <Typography fontFamily="Paytone One" sx={{ fontStyle: 'italic', fontWeight: 200, color: 'white', fontSize: { xs: '0.85rem', sm: '1.1rem', md: '1.25rem' }, letterSpacing: { xs: 1, md: 2 }, display: 'block', whiteSpace: 'nowrap', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                Library Repository
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { md: 2, lg: 4 } }}>
            {!isMobile && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {navLinks.client
                  .filter(item => item.name.toLowerCase() !== 'downloads')
                  .map(item => {
                    const isActive = location.pathname === item.path;
                    return (
                      <ButtonBase key={item.name} component={Link} to={item.path} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, px: 2, py: 1, borderRadius: '9px', color: isActive ? '#3b82f6' : 'rgba(255,255,255,0.7)', transition: 'all 0.3s ease', position: 'relative', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)', '& .nav-icon': { animation: 'floatFaster 0.6s ease-in-out infinite', color: '#3b82f6' } } }}>
                        <Box className="nav-icon" sx={{ display: 'flex', transition: 'all 0.3s ease' }}>{React.cloneElement(item.icon, { sx: { fontSize: '1.2rem' } })}</Box>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{item.name}</Typography>
                        {isActive && <Box sx={{ position: 'absolute', bottom: -2, height: '3px', width: '60%', bgcolor: '#3b82f6', borderRadius: '10px', animation: 'lineGrow 0.3s forwards' }} />}
                      </ButtonBase>
                    );
                })}
              </Box>
            )}

            <ButtonBase onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'white', p: 0.5, px: 1, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.3s ease', '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.2)' } }}>
              {!isMobile && (
                <Box sx={{ textAlign: 'right', mr: 0.5 }}>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 900, lineHeight: 1 }}>{username === 'Loading...' ? '...' : username.split(' ')[0].toUpperCase()}</Typography>
                  <Typography sx={{ fontSize: '0.6rem', color: '#3b82f6', fontWeight: 800, mt: 0.3 }}>Client Account</Typography>
                </Box>
              )}
              <Avatar sx={{ bgcolor: '#3b82f6', color: '#fff', width: { xs: 35, md: 45 }, height: { xs: 35, md: 45 }, fontSize: { xs: '1rem', md: '1.2rem' }, fontWeight: 900, border: '2px solid rgba(255,255,255,0.3)' }}>{username.charAt(0).toUpperCase()}</Avatar>
            </ButtonBase>
          </Box>

          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { mt: 2, borderRadius: 2, minWidth: 240, bgcolor: theme.palette.mode === 'dark' ? '#1f2937' : '#fff' } }}>
            <Box sx={{ px: 3, py: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'text.primary' }}>{username}</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: 'text.secondary' }}>ID: {userData.id_number || 'N/A'}</Typography>
              <Typography variant="caption" color="primary" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>{userData.department || 'No Department'}</Typography>
            </Box>
            <Divider />
            
            <MenuItem onClick={() => { setAnchorEl(null); setIsProfileModalOpen(true); }} sx={{ py: 1 }}>
              <ListItemIcon><PersonIcon fontSize="small" sx={{ color: 'text.primary' }} /></ListItemIcon>
              <ListItemText primary="Profile Settings" primaryTypographyProps={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }} />
            </MenuItem>

            <MenuItem onClick={() => { setAnchorEl(null); navigate('/my-downloads'); }} sx={{ py: 1 }}>
              <ListItemIcon><DownloadIcon fontSize="small" sx={{ color: 'text.primary' }} /></ListItemIcon>
              <ListItemText primary="My Downloads" primaryTypographyProps={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }} />
            </MenuItem>

            <MenuItem onClick={colorMode.toggleColorMode} sx={{ py: 1 }}>
              <ListItemIcon>{theme.palette.mode === 'dark' ? <Brightness7Icon fontSize="small" sx={{ color: 'text.primary' }} /> : <Brightness4Icon fontSize="small" sx={{ color: 'text.primary' }} />}</ListItemIcon>
              <ListItemText primary="Theme Mode" primaryTypographyProps={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }} />
              <Switch size="small" checked={theme.palette.mode === 'dark'} />
            </MenuItem>
            
            <MenuItem onClick={() => { setAnchorEl(null); navigate('/reset-password'); }} sx={{ py: 1 }}>
              <ListItemIcon><LockReset fontSize="small" sx={{ color: 'text.primary' }} /></ListItemIcon> 
              <ListItemText primary="Change Password" primaryTypographyProps={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }} />
            </MenuItem>

            <Divider />
            <Box sx={{ p: 1.5 }}><LogoutButton fullWidth /></Box>
          </Menu>
        </Toolbar>
      </AppBar>

      <ActionModal open={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title="Edit User Information" onConfirm={handleUpdateProfile} confirmText={loading ? "Saving..." : "Save Changes"}>
        <Stack spacing={2.5} sx={{ mt: 2 }}>
          <FormInput label="Full Name" value={userData.full_name} onChange={(e) => setUserData({...userData, full_name: e.target.value})} InputProps={{ startAdornment: <PersonIcon sx={{ mr: 1, opacity: 0.7 }} /> }} />
          
          <FormInput 
            select 
            label="Department" 
            value={userData.department} 
            onChange={(e) => setUserData({...userData, department: e.target.value})} 
            InputProps={{ startAdornment: <BusinessIcon sx={{ mr: 1, opacity: 0.7 }} /> }}
          >
            {departments.map((dept) => (
              <MenuItem key={dept} value={dept}>{dept}</MenuItem>
            ))}
          </FormInput>

          {/* Year Level Dropdown Added Here */}
          <FormInput 
            select 
            label="Year Level" 
            value={userData.year_level || ''} 
            onChange={(e) => setUserData({...userData, year_level: e.target.value})} 
            InputProps={{ startAdornment: <AssignmentIndIcon sx={{ mr: 1, opacity: 0.7 }} /> }}
          >
            {yearLevels.map((year) => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </FormInput>

          <FormInput label="Student / Staff Number" value={userData.id_number} onChange={(e) => setUserData({...userData, id_number: e.target.value})} InputProps={{ startAdornment: <FingerprintIcon sx={{ mr: 1, opacity: 0.7 }} /> }} />

          {latestRequest?.status === 'rejected' && (
            <Alert severity="error" variant="outlined" sx={{ borderRadius: '8px', borderLeft: '5px solid' }}>
              <Typography variant="caption" sx={{ fontWeight: 900, display: 'block', textTransform: 'uppercase' }}>Request Rejected ({latestRequest.requested_role})</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontStyle: 'italic' }}>"{latestRequest.remarks || 'No remarks provided.'}"</Typography>
            </Alert>
          )}

          {latestRequest?.status === 'pending' && (
            <Alert severity="info" variant="outlined" sx={{ borderRadius: '8px' }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Request for <b>{latestRequest.requested_role}</b> is pending review.</Typography>
            </Alert>
          )}

          <Divider sx={{ my: 1 }}><Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary', px: 1 }}>ROLE REQUEST</Typography></Divider>
          
          <Stack spacing={2}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel sx={{ color: 'text.secondary', fontWeight: 600 }}>Request Access Level</InputLabel>
              <Select
                value={requestData.role}
                label="Request Access Level"
                onChange={(e) => setRequestData({...requestData, role: e.target.value})}
                startAdornment={<AssignmentIndIcon sx={{ mr: 1, opacity: 0.7, fontSize: 20 }} />}
                sx={{ borderRadius: '8px', fontWeight: 700, color: theme.palette.text.primary }}
              >
                <MenuItem value="" sx={{ fontWeight: 600 }}>None</MenuItem>
                <MenuItem value="admin" sx={{ fontWeight: 600 }}>Admin</MenuItem>
                <MenuItem value="superadmin" sx={{ fontWeight: 600 }}>Superadmin</MenuItem>
              </Select>
            </FormControl>

            {requestData.role && (
              <TextField
                fullWidth multiline rows={2} label="Reason for Request" placeholder="Briefly explain why you need this role..." value={requestData.reason} onChange={(e) => setRequestData({...requestData, reason: e.target.value})} InputProps={{ startAdornment: <ChatIcon sx={{ mr: 1, mt: 1, opacity: 0.7, alignSelf: 'flex-start' }} /> }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' }, '& .MuiInputLabel-root': { fontWeight: 600 } }}
              />
            )}
          </Stack>
        </Stack>
      </ActionModal>

      <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} sx={{ display: { xs: 'block', md: 'none' }, zIndex: theme.zIndex.drawer + 2, '& .MuiDrawer-paper': { width: expandedWidth, border: 'none', bgcolor: '#213C51' } }}>
        {drawerContent}
      </Drawer>
      <Box sx={{ height: { xs: 70, md: 80 } }} />
    </>
  );
};

export default ClientTopbar;