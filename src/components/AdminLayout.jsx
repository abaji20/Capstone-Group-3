import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, AppBar, Toolbar, IconButton, Typography, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AdminSidebar from './AdminSidebar';

const drawerWidth = 260;

const AdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      
      {/* Mobile Top Bar - Only visible on small screens */}
      <AppBar 
        position="fixed" 
        sx={{ 
          display: { md: 'none' }, 
          bgcolor: theme.palette.mode === 'dark' ? '#1e293b' : '#213C51',
          zIndex: theme.zIndex.drawer + 1
        }}
      >
        <Toolbar>
          <IconButton color="inherit" onClick={handleDrawerToggle} edge="start" sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap>ADMIN PANEL</Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar Component */}
      <AdminSidebar 
        mobileOpen={mobileOpen} 
        handleDrawerToggle={handleDrawerToggle} 
        drawerWidth={drawerWidth} 
      />

      {/* Main Content Area */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: { xs: 2, md: 3 }, 
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: 8, md: 0 }, // Adds margin on mobile to prevent header overlap
          minHeight: '100vh',
          // Theme-aware background
          background: theme.palette.mode === 'light' 
            ? 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' 
            : theme.palette.background.default,
          transition: 'background 0.3s ease'
        }}
      >
        <Outlet /> 
      </Box>
    </Box>
  );
};

export default AdminLayout;