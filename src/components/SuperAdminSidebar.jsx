import React, { useContext, useEffect, useState } from 'react';
import { 
  Drawer, List, ListItem, ListItemButton, ListItemIcon, 
  ListItemText, Typography, Box, useTheme, useMediaQuery, 
  Avatar, Tooltip, Stack, Divider, Alert, Snackbar
} from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Fingerprint as FingerprintIcon
} from '@mui/icons-material';
import { navLinks } from '../navConfig';
import { supabase } from '../supabaseClient';
import { ColorModeContext } from '../App'; 
import { ActionModal, FormInput } from '../shared';

const expandedWidth = 280;
const collapsedWidth = 85;

const SuperAdminSidebar = ({ mobileOpen, handleDrawerToggle }) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const colorMode = useContext(ColorModeContext);
  
  const [fullName, setFullName] = useState('Loading...');
  const [isHovered, setIsHovered] = useState(false);

  // PROFILE SETTINGS STATES
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [userData, setUserData] = useState({ id: '', full_name: '', department: '', id_number: '' });
  const [loading, setLoading] = useState(false);
  const [notify, setNotify] = useState({ open: false, message: '', severity: 'success' });

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profile) {
        setFullName(profile.full_name);
        setUserData(profile);
      }
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateProfile = async () => {
    setLoading(true);
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        full_name: userData.full_name, 
        department: userData.department, 
        id_number: userData.id_number 
      })
      .eq('id', userData.id);

    if (profileError) {
      setNotify({ open: true, message: 'Update failed!', severity: 'error' });
    } else {
      setNotify({ open: true, message: 'Profile updated successfully!', severity: 'success' });
      setFullName(userData.full_name);
      setIsProfileModalOpen(false);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
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
        backgroundColor: theme.palette.mode === 'dark' ? '#111827' : '#213C51', 
        color: 'white',
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        width: isMini ? collapsedWidth : expandedWidth,
        borderRight: '1px solid rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'visible', 
      }}
    >
      {/* PROFILE SECTION - CLICKABLE */}
      <Tooltip title={isMini ? "Profile Settings" : ""} placement="right">
        <Box 
          onClick={() => setIsProfileModalOpen(true)}
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: isMini ? 'center' : 'flex-start',
            px: isMini ? 0 : 3,
            minHeight: 100,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
            transition: 'background 0.2s'
          }}
        >
          <Avatar 
            sx={{ 
              bgcolor: '#3b82f6', 
              width: isMini ? 32 : 45, 
              height: isMini ? 32 : 45, 
              mx: isMini ? 'auto' : 0,
              border: '2px solid rgba(255,255,255,0.2)',
              transition: 'all 0.2s'
            }}
          >
            <AccountCircleIcon sx={{ fontSize: isMini ? 20 : 28 }} />
          </Avatar>
          {!isMini && (
            <Box sx={{ ml: 2, textAlign: 'left', whiteSpace: 'nowrap' }}>
              <Typography variant="body1" sx={{ fontWeight: 800, color: 'white' }}>
                {fullName}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontSize: '0.7rem', display: 'block' }}>
                Super Admin
              </Typography>
              <Typography variant="caption" sx={{ color: '#3b82f6', fontSize: '0.65rem', fontWeight: 600, display: 'block' }}>
                Manage Profile
              </Typography>
            </Box>
          )}
        </Box>
      </Tooltip>

      {/* NAVIGATION */}
      <List sx={{ px: 1.5, flexGrow: 1 }}>
        {navLinks.superadmin.map((item) => {
          const isActive = location.pathname === item.path;
          
          const buttonContent = (
            <ListItemButton 
              component={Link} 
              to={item.path}
              onClick={() => isMobile && handleDrawerToggle()}
              sx={{ 
                borderRadius: '8px',
                py: 1.2,
                mb: 0.5,
                justifyContent: isMini ? 'center' : 'flex-start',
                backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                position: 'relative',
                transition: 'all 0.1s ease',
                borderLeft: isActive ? '4px solid #3b82f6' : '3px solid transparent',
              }}
            >
              <ListItemIcon sx={{ 
                color: isActive ? '#3b82f6' : 'rgba(255,255,255,0.7)', 
                minWidth: isMini ? 0 : 40, 
                display: 'flex',
                justifyContent: 'center' 
              }}>
                {React.isValidElement(item.icon) 
                  ? React.cloneElement(item.icon, { sx: { fontSize: 22 } }) 
                  : null}
              </ListItemIcon>
              {!isMini && (
                <ListItemText 
                  primary={item.name} 
                  primaryTypographyProps={{ 
                    fontSize: '0.85rem', 
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
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
      <Box sx={{ p: 2, mt: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <ListItemButton 
          onClick={colorMode.toggleColorMode}
          sx={{ borderRadius: '8px', justifyContent: isMini ? 'center' : 'flex-start', mb: 1 }}
        >
          <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: isMini ? 0 : 40, justifyContent: 'center' }}>
            {theme.palette.mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
          </ListItemIcon>
          {!isMini && <ListItemText primary="Appearance" primaryTypographyProps={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }} />}
        </ListItemButton>

        <ListItemButton 
          onClick={handleLogout}
          sx={{ 
            borderRadius: '8px', 
            color: '#ff5252', 
            justifyContent: isMini ? 'center' : 'flex-start'
          }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: isMini ? 0 : 40, justifyContent: 'center' }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          {!isMini && <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }} />}
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
          '& .MuiDrawer-paper': { 
            width: expandedWidth, 
            border: 'none', 
            bgcolor: theme.palette.mode === 'dark' ? '#111827' : '#213C51' 
          },
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

      {/* PROFILE SETTINGS MODAL */}
      <ActionModal 
        open={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        title="Edit Super Admin Profile" 
        onConfirm={handleUpdateProfile} 
        confirmText={loading ? "Saving..." : "Save Changes"}
      >
        <Stack spacing={2.5} sx={{ mt: 2 }}>
          <FormInput label="Full Name" value={userData.full_name} onChange={(e) => setUserData({...userData, full_name: e.target.value})} InputProps={{ startAdornment: <PersonIcon sx={{ mr: 1, opacity: 0.7 }} /> }} />
          <FormInput label="Department" value={userData.department} onChange={(e) => setUserData({...userData, department: e.target.value})} InputProps={{ startAdornment: <BusinessIcon sx={{ mr: 1, opacity: 0.7 }} /> }} />
          <FormInput label="Employee / ID Number" value={userData.id_number} onChange={(e) => setUserData({...userData, id_number: e.target.value})} InputProps={{ startAdornment: <FingerprintIcon sx={{ mr: 1, opacity: 0.7 }} /> }} />
          {/* Tinanggal ang Request Role Section dito */}
        </Stack>
      </ActionModal>
    </Box>
  );
};

export default SuperAdminSidebar;