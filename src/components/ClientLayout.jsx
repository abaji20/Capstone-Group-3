import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Box, useTheme } from '@mui/material';
import ClientTopbar from './ClientTopbar';

const ClientLayout = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  // Auto-refresh current page every 1 minute (60,000 ms) without hard reloads
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
    }, 90000); // 1 minute interval

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        minHeight: '100vh', 
        bgcolor: theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc',
        zoom: '80%' // Viewpoint zoom set to 80%
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