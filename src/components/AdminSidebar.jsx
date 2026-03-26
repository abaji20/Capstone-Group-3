import React, { useContext, useEffect, useState } from 'react';
import { 
  Drawer, List, ListItem, ListItemButton, ListItemIcon, 
  ListItemText, Toolbar, Typography, Divider, Box, 
  useTheme, useMediaQuery, Avatar, IconButton 
} from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { navLinks } from '../navConfig';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { supabase } from '../supabaseClient';

// Import the context from your App.jsx to fix the resolve error
import { ColorModeContext } from '../App'; 

const drawerWidth = 240;

const AdminSidebar = ({ mobileOpen, handleDrawerToggle }) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const colorMode = useContext(ColorModeContext);
  
  // State to hold the name from the database
  const [fullName, setFullName] = useState('Loading...');

  useEffect(() => {
    const fetchProfile = async () => {
      // 1. Get the current logged-in user's ID from Auth
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // 2. Query the 'profiles' table for the full_name row
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (data && data.full_name) {
          setFullName(data.full_name);
        } else {
          // Fallback if full_name is empty
          setFullName(user.email.split('@')[0]);
        }
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const drawerContent = (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: theme.palette.mode === 'dark' ? '#0f172a' : '#213C51', 
      color: 'white' 
    }}>
      {/* PROFILE SECTION: Avatar and DB Full Name */}
      <Box sx={{ p: 3, textAlign: 'center', mt: 1 }}>
        <Avatar 
          sx={{ 
            bgcolor: 'primary.main', 
            width: 56, 
            height: 56, 
            mx: 'auto', 
            mb: 1.5,
            boxShadow: '0px 4px 12px rgba(0,0,0,0.4)',
            border: '2px solid rgba(255,255,255,0.2)'
          }}
        >
          <AccountCircleIcon sx={{ fontSize: 40 }} />
        </Avatar>
        <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '1rem' }} noWrap>
          {fullName}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>
          ADMINISTRATOR
        </Typography>
      </Box>

      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)', mx: 2, mb: 1 }} />
      
      {/* NAVIGATION: Icons and Labels */}
      <List sx={{ px: 1.5, flexGrow: 1 }}>
        {navLinks.admin.map((item) => (
          <ListItem key={item.name} disablePadding sx={{ mb: 0.8 }}>
            <ListItemButton 
              component={Link} 
              to={item.path}
              onClick={isMobile ? handleDrawerToggle : null}
              sx={{ 
                borderRadius: '10px',
                py: 1,
                backgroundColor: location.pathname === item.path ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' }
              }}
            >
              <ListItemIcon sx={{ color: 'white', minWidth: 42 }}>
                {React.cloneElement(item.icon, { sx: { fontSize: 22 } })}
              </ListItemIcon>
              <ListItemText 
                primary={item.name} 
                primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }} 
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* BOTTOM SECTION: Dark Mode & Logout */}
      <Box sx={{ p: 2, mt: 'auto' }}>
        <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)', mb: 2 }} />
        
        {/* Dark Mode Toggle - Icon Only, Above Logout */}
        <Box sx={{ display: 'flex', justifyContent: 'left', mb: 1, ml: 1 }}>
          <IconButton 
            onClick={colorMode.toggleColorMode} 
            color="inherit" 
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.05)', 
              '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } 
            }}
          >
            {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Box>

        {/* Logout Button */}
        <ListItemButton 
          onClick={handleLogout}
          sx={{ 
            borderRadius: '10px', 
            justifyContent: 'center',
            color: '#ff8a65',
            '&:hover': { backgroundColor: 'rgba(255, 138, 101, 0.1)' }
          }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 35 }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 'bold' }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
      {/* Mobile Sidebar */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }} // Better open performance on mobile
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, border: 'none' },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, border: 'none' },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default AdminSidebar;