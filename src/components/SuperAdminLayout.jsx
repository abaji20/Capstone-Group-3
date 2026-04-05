import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, AppBar, Toolbar, IconButton, Typography, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SuperAdminSidebar from './SuperAdminSidebar';

const expandedWidth = 280;
const collapsedWidth = 85;

const SuperAdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMini, setIsMini] = useState(false);
  const theme = useTheme();

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleToggleMini = () => setIsMini(!isMini);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc' }}>
      
      {/* Mobile Top Bar */}
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
          <Typography fontFamily="montserrat" fontWeight={800} variant="h6" noWrap>SUPERADMIN PANEL</Typography>
        </Toolbar>
      </AppBar>

      <SuperAdminSidebar 
        mobileOpen={mobileOpen} 
        handleDrawerToggle={handleDrawerToggle} 
        isMini={isMini}
        handleToggleMini={handleToggleMini}
      />

      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: { xs: 2, md: 4 }, 
          // Dynamically adjust margin and width based on sidebar
          width: { md: `calc(100% - ${isMini ? collapsedWidth : expandedWidth}px)` },
          mt: { xs: 8, md: 0 },
          minHeight: '100vh',
          transition: 'width 0.3s ease'
        }}
      >
        <Outlet /> 
      </Box>
    </Box>
  );
};

export default SuperAdminLayout;