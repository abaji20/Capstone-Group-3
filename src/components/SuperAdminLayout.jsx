import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, AppBar, Toolbar, IconButton, Typography, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SuperAdminSidebar from './SuperAdminSidebar';

const collapsedWidth = 85;

const SuperAdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: theme.palette.mode === 'dark' ? '#0f172a' : '#ffffff' }}>
      
      {/* Mobile Top Bar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          display: { md: 'none' }, 
          bgcolor: theme.palette.mode === 'dark' ? '#1e293b' : '#213C51', 
          // Standard zIndex so Sidebar can slide over it
          zIndex: theme.zIndex.appBar 
        }}
      >
        <Toolbar>
          <IconButton color="inherit" onClick={handleDrawerToggle} edge="start" sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography fontFamily="montserrat" fontWeight={800} variant="h6" noWrap>SUPERADMIN PANEL</Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <SuperAdminSidebar 
        mobileOpen={mobileOpen} 
        handleDrawerToggle={handleDrawerToggle} 
      />

      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: { xs: 2, md: 4 }, 
          ml: { md: `${collapsedWidth}px` },
          mt: { xs: 8, md: 0 },
          minHeight: '100vh',
        }}
      >
        <Outlet /> 
      </Box>
    </Box>
  );
};

export default SuperAdminLayout;