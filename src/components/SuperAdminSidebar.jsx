import React from 'react';
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Divider, Box, useTheme, useMediaQuery } from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { navLinks } from '../navConfig';
import LogoutIcon from '@mui/icons-material/Logout';
import { supabase } from '../supabaseClient';

const drawerWidth = 260;

const SuperAdminSidebar = ({ mobileOpen, handleDrawerToggle }) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#213C51', color: 'white' }}>
      <Toolbar sx={{ py: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#90caf9' }}>SUPER ADMIN</Typography>
      </Toolbar>
      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
      <List sx={{ px: 1, flexGrow: 1 }}>
        {navLinks.superadmin.map((item) => (
          <ListItem key={item.name} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton 
              component={Link} 
              to={item.path}
              onClick={isMobile ? handleDrawerToggle : null}
              sx={{ 
                borderRadius: '8px', 
                backgroundColor: location.pathname === item.path ? 'rgba(144, 202, 249, 0.2)' : 'transparent',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
              }}
            >
              <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ p: 2 }}>
        <ListItemButton sx={{ borderRadius: '8px', color: '#ff8a80' }} onClick={handleLogout}>
          <ListItemIcon sx={{ color: '#ff8a80', minWidth: 40 }}><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawerContent}
      </Drawer>
      {/* Permanent Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, border: 'none' },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default SuperAdminSidebar;