import React, { useContext, useEffect, useState } from 'react';
import { 
  Drawer, List, ListItem, ListItemButton, ListItemIcon, 
  ListItemText, Typography, Box, useTheme, useMediaQuery, 
  Avatar, IconButton, Tooltip 
} from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft as ChevronLeftIcon, 
  ChevronRight as ChevronRightIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon 
} from '@mui/icons-material';
import { navLinks } from '../navConfig';
import { supabase } from '../supabaseClient';
import { ColorModeContext } from '../App'; 

const expandedWidth = 280;
const collapsedWidth = 85;

const AdminSidebar = ({ mobileOpen, handleDrawerToggle, isMini, handleToggleMini }) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const colorMode = useContext(ColorModeContext);
  const [fullName, setFullName] = useState('Loading...');

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        setFullName(data?.full_name || user.email.split('@')[0]);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const drawerContent = (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: theme.palette.mode === 'dark' ? '#111827' : '#213C51', 
      color: 'white',
      borderRadius: 0, 
      transition: 'width 0.3s ease',
      overflowX: 'hidden',
      position: 'relative',
    }}>
      
      {/* TOGGLE SECTION */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: isMini ? 'center' : 'flex-end', 
        p: 1,
        minHeight: 50 
      }}>
        {!isMobile && (
          <IconButton 
            onClick={handleToggleMini}
            sx={{
              color: 'white',
              bgcolor: 'rgba(255,255,255,0.15)',
              width: 32,
              height: 32,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
            }}
          >
            {isMini ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
          </IconButton>
        )}
      </Box>

      {/* PROFILE SECTION */}
      <Box sx={{ pb: isMini ? 2 : 4, px: 2, textAlign: 'center' }}>
        <Avatar 
          sx={{ 
            bgcolor: '#3b82f6', 
            width: isMini ? 40 : 70, 
            height: isMini ? 40 : 70, 
            mx: 'auto', 
            mb: isMini ? 0 : 2,
            border: '2px solid rgba(255,255,255,0.2)',
            transition: 'all 0.3s ease'
          }}
        >
          <AccountCircleIcon sx={{ fontSize: isMini ? 24 : 50 }} />
        </Avatar>
        {!isMini && (
          <>
            <Typography variant="body1" sx={{ fontWeight: 800, mt: 1 }}>
              {fullName}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
              Administrator
            </Typography>
          </>
        )}
      </Box>

      {/* NAVIGATION */}
      <List sx={{ px: isMini ? 0 : 1.5, flexGrow: 1 }}>
        {navLinks.admin.map((item) => {
          const isActive = location.pathname === item.path;
          const buttonContent = (
            <ListItemButton 
              component={Link} 
              to={item.path}
              sx={{ 
                borderRadius: isMini ? 0 : '8px',
                py: 1.5,
                mb: 0.5,
                justifyContent: isMini ? 'center' : 'flex-start',
                backgroundColor: isActive ? '#3b82f6' : 'transparent',
                '&:hover': { backgroundColor: isActive ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)' }
              }}
            >
              <ListItemIcon sx={{ 
                color: 'white', 
                minWidth: isMini ? 0 : 45, 
                display: 'flex',
                justifyContent: 'center' 
              }}>
                {React.isValidElement(item.icon) 
                  ? React.cloneElement(item.icon, { sx: { fontSize: 24 } }) 
                  : null}
              </ListItemIcon>
              {!isMini && (
                <ListItemText 
                  primary={item.name} 
                  primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: isActive ? 700 : 500 }} 
                />
              )}
            </ListItemButton>
          );

          return (
            <ListItem key={item.name} disablePadding>
              {isMini ? <Tooltip title={item.name} placement="right">{buttonContent}</Tooltip> : buttonContent}
            </ListItem>
          );
        })}
      </List>

      {/* BOTTOM TOOLS */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {!isMini && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, px: 1 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>THEME</Typography>
            <IconButton onClick={colorMode.toggleColorMode} size="small" sx={{ color: 'white' }}>
              {theme.palette.mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
            </IconButton>
          </Box>
        )}
        
        <ListItemButton 
          onClick={handleLogout}
          sx={{ 
            borderRadius: '8px', 
            color: '#ff5252', 
            justifyContent: isMini ? 'center' : 'flex-start'
          }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: isMini ? 0 : 45, justifyContent: 'center' }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          {!isMini && <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 700, fontSize: '0.9rem' }} />}
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: isMini ? collapsedWidth : expandedWidth }, flexShrink: { md: 0 }, transition: 'width 0.3s' }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: expandedWidth, border: 'none', bgcolor: '#213C51' },
        }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { 
            width: isMini ? collapsedWidth : expandedWidth, 
            border: 'none',
            bgcolor: 'transparent',
            transition: 'width 0.3s'
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default AdminSidebar;