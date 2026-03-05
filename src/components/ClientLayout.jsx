import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import ClientTopbar from './ClientTopbar'; // We will build this next

const ClientLayout = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* TOPBAR: Stays at the top */}
      <ClientTopbar />

      {/* CONTENT: Changes below the topbar */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          backgroundColor: '#E3F2FD', // Sky Blue background
          mt: '64px' // Space for the topbar
        }}
      >
        <Outlet /> 
      </Box>
    </Box>
  );
};

export default ClientLayout;