import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, AppBar, Toolbar, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SuperAdminSidebar from './SuperAdminSidebar';

const SuperAdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile Menu Button - Only visible on small screens */}
      <AppBar position="fixed" sx={{ display: { md: 'none' }, bgcolor: '#213C51' }}>
        <Toolbar>
          <IconButton color="inherit" onClick={handleDrawerToggle}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* The Sidebar receives the functions as props */}
      <SuperAdminSidebar 
        mobileOpen={mobileOpen} 
        handleDrawerToggle={handleDrawerToggle} 
      />

      <Box component="main" sx={{ flexGrow: 1, p: 3, backgroundColor: '#ECEFF1' }}>
        {/* Spacer for the mobile AppBar */}
        <Toolbar sx={{ display: { md: 'none' } }} />
        <Outlet /> 
      </Box>
    </Box>
  );
};

export default SuperAdminLayout;