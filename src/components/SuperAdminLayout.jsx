import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Box, AppBar, Toolbar, IconButton, Typography, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SuperAdminSidebar from './SuperAdminSidebar';

const collapsedWidth = 85;

const SuperAdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const navigate = useNavigate();

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  // Safe auto-refresh: Che-check muna kung nag-e-edit o may active input ang user
  useEffect(() => {
    const interval = setInterval(() => {
      const activeElement = document.activeElement;

      // Sineseguro na hindi nagta-type sa anumang input field o dropdown
      const isUserTyping = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.isContentEditable ||
        activeElement.getAttribute('role') === 'combobox' // Support para sa MUI Selects/Autocomplete
      );

      // Kung HINDI nagfo-form o nagta-type ang user, magre-refresh
      if (!isUserTyping) {
        navigate(0);
      }
    }, 90000); // 1 minutes interval

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: theme.palette.mode === 'dark' ? '#0f172a' : '#ffffff', zoom: '85%' }}>

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
          p: { xs: 0, md: 0 }, 
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