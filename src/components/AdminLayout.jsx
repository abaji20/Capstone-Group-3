import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, AppBar, Toolbar, IconButton, Typography, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AdminSidebar from './AdminSidebar';

const collapsedWidth = 85;

const AdminLayout = () => {
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
          zIndex: theme.zIndex.appBar
        }}
      >
        <Toolbar>
          <IconButton color="inherit" onClick={handleDrawerToggle} edge="start" sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography fontFamily="montserrat" fontWeight={800} variant="h6" noWrap>ADMIN PANEL</Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar - Hover logic is internal now */}
      <AdminSidebar 
        mobileOpen={mobileOpen} 
        handleDrawerToggle={handleDrawerToggle} 
      />

      {/* Main Content Area */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: { xs: 2, md: 4 }, 
          // Always leaves room for the collapsed bar; expanded bar overlaps
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

export default AdminLayout;