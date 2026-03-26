import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, useTheme } from '@mui/material';
import ClientTopbar from './ClientTopbar';

const ClientLayout = () => {
  const theme = useTheme(); // Access the current theme (light or dark)

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
          // DYNAMIC BACKGROUND LOGIC
          background: theme.palette.mode === 'dark' 
            ? 'none' // Remove the gradient in dark mode
            : 'primary.light', // Use the primary light color from your App.jsx theme in light mode
          
          // Fallback background color (uses the one we set in App.jsx)
          bgcolor: 'background.default', 
          
          mt: '0',
          transition: 'background 0.3s ease, background-color 0.3s ease' // Smooth transition
        }}
      >
        <Outlet /> 
      </Box>
    </Box>
  );
};

export default ClientLayout;