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

// Animations: Float at Indicator expansion
const customAnimations = `
  @keyframes floatFaster {
    0% { transform: translateY(0px) scale(1); }
    50% { transform: translateY(-8px) scale(1.15); }
    100% { transform: translateY(0px) scale(1); }
  }
  @keyframes lineGrow {
    from { width: 0%; opacity: 0; }
    to { width: 70%; opacity: 1; }
  }
`;

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

  return (
    <>
      <style>{customAnimations}</style>
      <AppBar 
        position="fixed" 
        sx={{ 
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(17, 24, 39, 0.95)' : '#213C51', 
          backdropFilter: 'blur(8px)',
          height: { xs: 70, md: 90 }, 
          justifyContent: 'center',
          zIndex: theme.zIndex.drawer + 1,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          borderBottom: '2px solid rgba(59, 130, 246, 0.3)'
        }}
      >
        <Toolbar sx={{ position: 'relative', display: 'flex', justifyContent: 'space-between', px: { xs: 1, md: 4 } }}>
          
          {/* LEFT: Logo Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, zIndex: 2 }}>
            {isMobile && (
              <IconButton color="inherit" onClick={handleDrawerToggle} sx={{ mr: 1 }}>
                <MenuIcon fontSize="large" />
              </IconButton>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 2 }} onClick={() => navigate('/')}>
              <Box component="img" src={logo} sx={{ height: { xs: 40, md: 60 }, filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.2))' }} />
              <Typography 
                fontFamily="Cinzel Decorative, sans-serif" 
                sx={{ 
                  fontWeight: 900, 
                  color: 'white', 
                  fontSize: { xs: '0.9rem', md: '1.25rem' }, 
                  letterSpacing: 2,
                  textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                }}
              >
                Library Repository
              </Typography>
            </Box>
          </Box>

          {/* CENTER: Navigation Links (Desktop Only) */}
          {!isMobile && (
            <Box 
              sx={{ 
                position: 'absolute', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                display: 'flex', 
                gap: 8, 
                zIndex: 1 
              }}
            >
              {navLinks.client.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <ButtonBase 
                    key={item.name} 
                    component={Link} 
                    to={item.path} 
                    sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 0.8, 
                      px: 2,
                      py: 1,
                      borderRadius: '9px',
                      color: isActive ? '#3b82f6' : 'rgba(255,255,255,0.7)',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      '&:hover': { 
                        color: '#fff',
                        bgcolor: 'rgba(255,255,255,0.05)',
                        '& .nav-icon': { 
                          animation: 'floatFaster 0.6s ease-in-out infinite',
                          color: '#3b82f6',
                          filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.8))'
                        } 
                      }
                    }}
                  >
                    <Box className="nav-icon" sx={{ display: 'flex', transition: 'all 0.3s ease' }}>
                      {React.cloneElement(item.icon, { sx: { fontSize: '1.5rem' } })}
                    </Box>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {item.name}
                    </Typography>

                    {/* ACTIVE INDICATOR (Underline effect) */}
                    {isActive && (
                      <Box 
                        sx={{ 
                          position: 'absolute', 
                          bottom: -5, 
                          height: '4px', 
                          bgcolor: '#3b82f6', 
                          borderRadius: '10px',
                          boxShadow: '0 0 12px #3b82f6',
                          animation: 'lineGrow 0.3s forwards'
                        }} 
                      />
                    )}
                  </ButtonBase>
                );
              })}
            </Box>
          )}

          {/* RIGHT: Profile Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', zIndex: 2 }}>
            <ButtonBase 
              onClick={(e) => setAnchorEl(e.currentTarget)} 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                color: 'white', 
                p: 1, 
                px: 1, 
                borderRadius: '15px', 
                bgcolor: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: 'rgba(59, 130, 246, 0.2)',
                  transform: 'scale(1.05)'
                }
              }}
            >
              {!isMobile && (
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 900, lineHeight: 1 }}>
                    {username === 'Loading...' ? '...' : username.split(' ')[0].toUpperCase()}
                  </Typography>
                  <Typography sx={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: 800, mt: 0.5 }}>
                    Client Account
                  </Typography>
                </Box>
              )}
              <Avatar 
                sx={{ 
                  bgcolor: '#3b82f6', 
                  color: '#fff', 
                  width: { xs: 40, md: 50 }, 
                  height: { xs: 40, md: 50 }, 
                  fontSize: '1.4rem',
                  fontWeight: 900, 
                  border: '3px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)'
                }}
              >
                {username.charAt(0).toUpperCase()}
              </Avatar>
            </ButtonBase>
          </Box>

          {/* ... Rest of the menu and drawer (Mananatili ang logic mo dito) ... */}
          <Menu 
            anchorEl={anchorEl} 
            open={Boolean(anchorEl)} 
            onClose={() => setAnchorEl(null)} 
            PaperProps={{ 
              sx: { 
                mt: 2, 
                borderRadius: 2, 
                minWidth: 250, 
                boxShadow: '0 15px 35px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.1)',
                bgcolor: theme.palette.mode === 'dark' ? '#1f2937' : '#fff'
              } 
            }}
          >
            <Box sx={{ px: 3, py: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, fontSize: '1rem' }}>{username}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Client Account</Typography>
            </Box>
            <Divider />
            <MenuItem onClick={colorMode.toggleColorMode} sx={{ py: 1.5 }}>
              <ListItemIcon>{theme.palette.mode === 'dark' ? <Brightness7 /> : <Brightness4 />}</ListItemIcon>
              <ListItemText primary="Theme Mode" primaryTypographyProps={{ fontWeight: 700 }} />
              <Switch checked={theme.palette.mode === 'dark'} />
            </MenuItem>
            <MenuItem onClick={() => { setAnchorEl(null); navigate('/reset-password'); }} sx={{ py: 1.5 }}>
              <ListItemIcon><LockReset /></ListItemIcon> 
              <ListItemText primary="Account Security" primaryTypographyProps={{ fontWeight: 700 }} />
            </MenuItem>
            <Divider />
            <Box sx={{ p: 2 }}><LogoutButton fullWidth /></Box>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* DRAWER (Mobile) - Consistent styling with the new look */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        sx={{ '& .MuiDrawer-paper': { width: 300, bgcolor: theme.palette.mode === 'dark' ? '#0f172a' : '#fff' } }}
      >
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#213C51', color: 'white' }}>
          <Typography variant="h5" fontWeight={900}>NAVIGATION</Typography>
          <IconButton onClick={handleDrawerToggle} sx={{ color: 'white' }}><CloseIcon fontSize="large" /></IconButton>
        </Box>
        <List sx={{ p: 2 }}>
          {navLinks.client.map((item) => (
            <ListItem key={item.name} disablePadding sx={{ mb: 2 }}>
              <ButtonBase component={Link} to={item.path} onClick={handleDrawerToggle}
                sx={{ 
                  width: '100%', 
                  justifyContent: 'flex-start', 
                  p: 2, 
                  borderRadius: 3, 
                  bgcolor: location.pathname === item.path ? 'rgba(59, 130, 246, 0.15)' : 'transparent', 
                  color: location.pathname === item.path ? '#3b82f6' : 'text.primary',
                  transition: '0.2s'
                }}>
                <ListItemIcon sx={{ color: 'inherit', minWidth: 50 }}>{React.cloneElement(item.icon, { sx: { fontSize: '2.2rem' } })}</ListItemIcon>
                <ListItemText primary={item.name} primaryTypographyProps={{ fontWeight: 900, fontSize: '1.1rem' }} />
              </ButtonBase>
            </ListItem>
          ))}
        </List>
      </Drawer>
      <Box sx={{ height: { xs: 70, md: 100 } }} />
    </>
  );
};

export default ClientTopbar;