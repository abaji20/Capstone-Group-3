import React from 'react';
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Divider, Box } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { navLinks } from '../navConfig';
import LogoutIcon from '@mui/icons-material/Logout';

const drawerWidth = 260;

const AdminSidebar = () => {
  const location = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, backgroundColor: '#1976D2', color: 'white' },
      }}
    >
      <Toolbar sx={{ py: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>ADMIN PANEL</Typography>
      </Toolbar>
      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
      <List sx={{ px: 1 }}>
        {navLinks.admin.map((item) => (
          <ListItem key={item.name} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton 
              component={Link} to={item.path}
              sx={{ borderRadius: '8px', backgroundColor: location.pathname === item.path ? 'rgba(255, 255, 255, 0.2)' : 'transparent' }}
            >
              <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ mt: 'auto', p: 2 }}>
        <ListItemButton sx={{ borderRadius: '8px' }}>
          <ListItemIcon sx={{ color: 'white', minWidth: 40 }}><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </Box>
    </Drawer>
  );
};

export default AdminSidebar;