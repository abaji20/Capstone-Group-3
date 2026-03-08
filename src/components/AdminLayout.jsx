import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, AppBar, Toolbar, IconButton, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AdminSidebar from './AdminSidebar';

const AdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerWidth = 260;

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ display: { md: 'none' }, bgcolor: '#213C51' }}>
        <Toolbar>
          <IconButton color="inherit" onClick={handleDrawerToggle} edge="start" sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6">ADMIN PANEL</Typography>
        </Toolbar>
      </AppBar>

      <AdminSidebar mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} />

      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          mt: { xs: 8, md: 0 }, 
          background: 'linear-gradient(135deg, #e0f7fa 0%, #80deea 100%)',
          width: { md: `calc(100% - ${drawerWidth}px)` } 
        }}
      >
        <Outlet /> 
      </Box>
    </Box>
  );
};

export default AdminLayout;