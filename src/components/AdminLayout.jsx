import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import AdminSidebar from './AdminSidebar'; // We will build this next

const AdminLayout = () => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* SIDEBAR: Stays fixed on the left */}
      <AdminSidebar />

      {/* CONTENT: Changes based on what you click */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          backgroundColor: '#F0F4F8' // Very light blue background
        }}
      >
        <Outlet /> 
      </Box>
    </Box>
  );
};

export default AdminLayout;