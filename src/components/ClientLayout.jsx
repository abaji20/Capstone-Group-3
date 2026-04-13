import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, useTheme } from '@mui/material';
import ClientTopbar from './ClientTopbar';

const ClientLayout = () => {
  const theme = useTheme();

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        minHeight: '100vh', 
        bgcolor: theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc',
      }}
    >
      <ClientTopbar />
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 0, md: 0 } }}>
        <Outlet /> 
      </Box>
    </Box>
  );
};

export default ClientLayout;