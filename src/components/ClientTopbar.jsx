import React, { useState, useEffect, useContext } from 'react';
import { 
  AppBar, Toolbar, Box, Avatar, Typography, ButtonBase, Menu, MenuItem, 
  ListItemIcon, Divider, IconButton, useTheme, Drawer, List, ListItem, 
  ListItemText, useMediaQuery, Switch
} from '@mui/material';
import { 
  History, LockReset, Person as PersonIcon, Brightness4, Brightness7, 
  Menu as MenuIcon, Close as CloseIcon 
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { navLinks } from '../navConfig';
import { LogoutButton } from '../shared';
import logo from '../assets/logo.png'; 
import { ColorModeContext } from '../App';

const ClientTopbar = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [username, setUsername] = useState('Loading...');
  
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (data) setUsername(data.full_name);
      }
    };
    fetchUser();
  }, []);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const drawer = (
    <Box sx={{ height: '100%', bgcolor: 'background.paper', color: 'text.primary' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: theme.palette.mode === 'dark' ? '#111827' : '#213C51' }}>
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>Menu</Typography>
        <IconButton onClick={handleDrawerToggle} sx={{ color: 'white' }}><CloseIcon /></IconButton>
      </Box>
      <Divider />
      <List sx={{ pt: 2 }}>
        {navLinks.client.map((item) => (
          <ListItem 
            button 
            key={item.name} 
            component={Link} 
            to={item.path} 
            onClick={handleDrawerToggle}
            sx={{ 
              mb: 1,
              color: location.pathname === item.path ? 'primary.main' : 'text.primary',
              bgcolor: location.pathname === item.path ? 'action.selected' : 'transparent'
            }}
          >
            <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.name} primaryTypographyProps={{ fontWeight: 700 }} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar 
        position="fixed" 
        sx={{ 
          backgroundColor: theme.palette.mode === 'dark' ? '#111827' : '#213C51', 
          height: 90, 
          justifyContent: 'center',
          transition: 'background-color 0.3s ease',
          zIndex: theme.zIndex.drawer + 1
        }}
      >
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {/* Left: Logo & Hamburger */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isMobile && (
              <IconButton color="inherit" onClick={handleDrawerToggle} sx={{ ml: 1, mr: 1 }}>
                <MenuIcon />
              </IconButton>
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 2 }} onClick={() => navigate('/')}>
              <Box 
                component="img" src={logo} 
                sx={{ height: { md: 50 }, ml: { md: 4 }, display: { xs: 'none', md: 'block' } }} 
              />
              <Typography 
                fontFamily="Cinzel Decorative, sans-serif" variant="h6" 
                sx={{ fontWeight: 800, color: 'white', fontSize: { xs: '1.05rem', md: '1.5rem' } }}
              >
                Library Repository
              </Typography>
            </Box>
          </Box>

          {/* Right: Navigation (Desktop) & Profile */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 3 } }}>
            {!isMobile && navLinks.client.filter(l => l.path !== '/my-downloads').map(item => (
              <ButtonBase key={item.name} component={Link} to={item.path} 
                sx={{ 
                  display: 'flex', flexDirection: 'column', gap: 0.5, 
                  color: location.pathname === item.path ? '#fff' : 'rgba(255,255,255,0.6)',
                  '&:hover': { color: '#fff' }
                }}>
                {item.icon}
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>{item.name}</Typography>
              </ButtonBase>
            ))}
            
            <ButtonBase onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, color: 'white', ml: 1 }}>
              <Avatar sx={{ bgcolor: theme.palette.mode === 'dark' ? theme.palette.primary.main : '#fff', color: '#213C51', width: 32, height: 32 }}>
                <PersonIcon />
              </Avatar>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', display: { xs: 'none', sm: 'block' } }}>
                {username === 'Loading...' ? '...' : username.split(' ')[0]}
              </Typography>
            </ButtonBase>
          </Box>

          {/* User Dropdown Menu */}
          <Menu 
            anchorEl={anchorEl} 
            open={Boolean(anchorEl)} 
            onClose={() => setAnchorEl(null)} 
            PaperProps={{ 
              sx: { mt: 1.5, borderRadius: 3, minWidth: 240, bgcolor: 'background.paper' } 
            }}
          >
            <Box sx={{ px: 2, py: 1.5, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{username}</Typography>
              <Typography variant="caption" color="text.secondary">Client Account</Typography>
            </Box>
            <Divider />
            
            {/* INTEGRATED DARK MODE TOGGLE */}
            <MenuItem onClick={colorMode.toggleColorMode}>
              <ListItemIcon>
                {theme.palette.mode === 'dark' ? <Brightness7 fontSize="small" color="primary" /> : <Brightness4 fontSize="small" color="primary" />}
              </ListItemIcon>
              <ListItemText 
                primary={theme.palette.mode === 'dark' ? "Light Mode" : "Dark Mode"} 
                primaryTypographyProps={{ variant: 'body2' }} 
              />
              <Switch 
                size="small" 
                checked={theme.palette.mode === 'dark'} 
                sx={{ ml: 1 }}
              />
            </MenuItem>

            <MenuItem onClick={() => { setAnchorEl(null); navigate('/my-downloads'); }}>
              <ListItemIcon><History fontSize="small" color="primary" /></ListItemIcon> 
              <Typography variant="body2">My Downloads</Typography>
            </MenuItem>
            
            <MenuItem onClick={() => { setAnchorEl(null); navigate('/reset-password'); }}>
              <ListItemIcon><LockReset fontSize="small" color="primary" /></ListItemIcon> 
              <Typography variant="body2">Reset Password</Typography>
            </MenuItem>
            
            <Divider sx={{ my: 0.5 }} />
            <Box sx={{ px: 2, py: 1 }}><LogoutButton /></Box>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }} 
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 260 },
        }}
      >
        {drawer}
      </Drawer>
      
      <Box sx={{ height: 80 }} />
    </>
  );
};

export default ClientTopbar;