// src/components/ClientTopbar.jsx
import React, { useState } from 'react';
import { 
  AppBar, Toolbar, Typography, Button, Box, IconButton, 
  Menu, MenuItem, Avatar, Divider, ListItemIcon 
} from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { navLinks } from '../navConfig';
import HistoryIcon from '@mui/icons-material/History';
import LockResetIcon from '@mui/icons-material/LockReset';
import PersonIcon from '@mui/icons-material/Person'; // New Import
import { LogoutButton } from '../shared';

const ClientTopbar = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const handleMenu = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const mainLinks = navLinks.client.filter(link => link.path !== '/my-downloads');

  return (
    <AppBar position="fixed" sx={{ backgroundColor: '#213C51', height: 80, justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
          LIBRARY REPOSITORY
        </Typography>

        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, mr: 1,   alignItems: 'center' }}>
          {mainLinks.map((item) => (
            <Button key={item.name} component={Link} to={item.path} startIcon={item.icon}
              sx={{ color: 'white', backgroundColor: location.pathname === item.path ? 'rgba(255, 255, 255, 0.2)' : 'transparent' }}>
              {item.name}
            </Button>
          ))}

          {/* Avatar Menu with PersonIcon */}
          <IconButton onClick={handleMenu} sx={{ ml: 2 }}>
            <Avatar sx={{ bgcolor: '#ffffff', color: '#213C51' }}>
              <PersonIcon />
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            PaperProps={{ sx: { mt: 1.5, borderRadius: 3, minWidth: 200 } }}
          >
            <MenuItem onClick={() => { handleClose(); navigate('/my-downloads'); }}>
              <ListItemIcon><HistoryIcon /></ListItemIcon>
              My Downloads
            </MenuItem>
            
            <MenuItem onClick={() => { handleClose(); navigate('/reset-password'); }}>
              <ListItemIcon><LockResetIcon /></ListItemIcon>
              Reset Password
            </MenuItem>
            
            <Divider />
            
            <MenuItem disableRipple sx={{ p: 0 }}>
              <Box sx={{ width: '100%', mt: 1, ml: 5, mb: 1 }}>
                <LogoutButton />
              </Box>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default ClientTopbar;