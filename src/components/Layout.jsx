import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, IconButton, Drawer, List, ListItem, ListItemText, Typography, Box, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { supabase } from '../supabaseClient'; // Ensure this path matches your structure

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Query the profiles table to get the full_name
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (data) setUserName(data.full_name);
      }
    };
    fetchProfile();
  }, []);

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <IconButton 
            color="inherit" 
            onClick={() => setMobileOpen(true)} 
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Personalized Greeting */}
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {userName ? `Welcome, ${userName}!` : 'LIBRARY REPOSITORY'}
          </Typography>

          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <Button color="inherit">Browse PDFs</Button>
            <Button color="inherit">My Downloads</Button>
            <Button color="inherit">Logout</Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <Box sx={{ width: 250 }} onClick={() => setMobileOpen(false)}>
          <List>
            <ListItem button><ListItemText primary="Browse PDFs" /></ListItem>
            <ListItem button><ListItemText primary="My Downloads" /></ListItem>
            <ListItem button><ListItemText primary="Logout" /></ListItem>
          </List>
        </Box>
      </Drawer>

      <Box sx={{ p: 3 }}>{children}</Box>
    </Box>
  );
};
export default Layout;