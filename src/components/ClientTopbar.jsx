import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, IconButton, Drawer, List, ListItem, ListItemText } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { navLinks } from '../navConfig';
import MenuIcon from '@mui/icons-material/Menu';
import { LogoutButton } from '../shared'; // Import from shared folder

const ClientTopbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <AppBar position="fixed" sx={{ backgroundColor: '#213C51' }}>
        <Toolbar>
          <IconButton 
            color="inherit" 
            onClick={() => setMobileOpen(true)} 
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box 
            component="img" 
            src="src/assets/logoLibrary.png" 
            alt="Logo" 
            sx={{ height: 40, width: 'auto', mr: 2 }} 
          />

          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            LIBRARY REPOSITORY
          </Typography>

          {/* Desktop Navigation */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2 }}>
            {navLinks.client.map((item) => (
              <Button
                key={item.name} component={Link} to={item.path} startIcon={item.icon}
                sx={{ color: 'white', backgroundColor: location.pathname === item.path ? 'rgba(255, 255, 255, 0.2)' : 'transparent' }}
              >
                {item.name}
              </Button>
            ))}
            {/* Integrated shared logout button */}
            <LogoutButton sx={{ color: 'white' }} />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer anchor="left" open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <Box sx={{ width: 250 }} onClick={() => setMobileOpen(false)}>
          <List>
            {navLinks.client.map((item) => (
              <ListItem button key={item.name} component={Link} to={item.path}>
                <ListItemText primary={item.name} />
              </ListItem>
            ))}
            {/* Integrated shared logout button in mobile drawer */}
            <ListItem button component="div">
              <LogoutButton />
            </ListItem>
          </List>
        </Box>
      </Drawer>
      
      <Toolbar />
    </>
  );
};

export default ClientTopbar;