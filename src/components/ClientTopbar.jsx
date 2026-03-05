import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { navLinks } from '../navConfig';
import LogoutIcon from '@mui/icons-material/Logout';

const ClientTopbar = () => {
  const location = useLocation();

  return (
    <AppBar position="fixed" sx={{ backgroundColor: '#03A9F4' }}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>LIBRARY REPOSITORY</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {navLinks.client.map((item) => (
            <Button
              key={item.name} component={Link} to={item.path} startIcon={item.icon}
              sx={{ color: 'white', backgroundColor: location.pathname === item.path ? 'rgba(255, 255, 255, 0.2)' : 'transparent' }}
            >
              {item.name}
            </Button>
          ))}
          <Button color="inherit" startIcon={<LogoutIcon />}>Logout</Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default ClientTopbar;