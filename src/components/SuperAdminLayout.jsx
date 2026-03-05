import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import SuperAdminSidebar from './SuperAdminSidebar'; // Specifically for Super Admin

const SuperAdminLayout = () => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* SUPER ADMIN SIDEBAR: Focuses on System/Accounts */}
      <SuperAdminSidebar />

      {/* CONTENT AREA */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          backgroundColor: '#ECEFF1' // Slightly different grey-blue background
        }}
      >
        <Outlet /> 
      </Box>
    </Box>
  );
};

export default SuperAdminLayout;