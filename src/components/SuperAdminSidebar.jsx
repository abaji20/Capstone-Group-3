import React, { useContext, useEffect, useState } from 'react';
import { 
  Drawer, List, ListItem, ListItemButton, ListItemIcon, 
  ListItemText, Typography, Box, useTheme, useMediaQuery, 
  Avatar, Tooltip 
} from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon 
} from '@mui/icons-material';
import { navLinks } from '../navConfig';
import { supabase } from '../supabaseClient';
import { ColorModeContext } from '../App'; 

const expandedWidth = 280;
const collapsedWidth = 85;

const SuperAdminSidebar = ({ mobileOpen, handleDrawerToggle }) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const colorMode = useContext(ColorModeContext);
  
  const [fullName, setFullName] = useState('Loading...');
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        setFullName(data?.full_name || user.email.split('@')[0]);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const isMini = !isMobile && !isHovered;

  const drawerContent = (
    <Box 
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        backgroundColor: theme.palette.mode === 'dark' ? '#111827' : '#213C51', 
        color: 'white',
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        width: isMini ? collapsedWidth : expandedWidth,
        borderRight: '1px solid rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'visible', 
      }}
    >
      {/* PROFILE SECTION */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: isMini ? 'center' : 'flex-start',
        px: isMini ? 0 : 3,
        minHeight: 100 
      }}>
        <Avatar 
          sx={{ 
            bgcolor: '#3b82f6', 
            width: isMini ? 32 : 45, 
            height: isMini ? 32 : 45, 
            mx: isMini ? 'auto' : 0,
            border: '2px solid rgba(255,255,255,0.2)',
            transition: 'all 0.2s'
          }}
        >
          <AccountCircleIcon sx={{ fontSize: isMini ? 20 : 28 }} />
        </Avatar>
        {!isMini && (
          <Box sx={{ ml: 2, textAlign: 'left', whiteSpace: 'nowrap' }}>
            <Typography variant="body1" sx={{ fontWeight: 800, color: 'white' }}>
              {fullName}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontSize: '0.7rem' }}>
              Super Admin
            </Typography>
          </Box>
        )}
      </Box>

      {/* NAVIGATION */}
      <List sx={{ px: isMini ? 1.5 : 1.5, flexGrow: 1 }}>
        {navLinks.superadmin.map((item) => {
          const isActive = location.pathname === item.path;
          
          const buttonContent = (
            <ListItemButton 
              component={Link} 
              to={item.path}
              onClick={() => isMobile && handleDrawerToggle()}
              sx={{ 
                borderRadius: '8px',
                py: 1.2,
                mb: 0.5,
                justifyContent: isMini ? 'center' : 'flex-start',
                backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                position: 'relative',
                transition: 'all 0.1s ease',
                // Restore Left Active Indication
                borderLeft: isActive ? '4px solid #3b82f6' : '3px solid transparent',
              }}
            >
              <ListItemIcon sx={{ 
                color: isActive ? '#3b82f6' : 'rgba(255,255,255,0.7)', 
                minWidth: isMini ? 0 : 40, 
                display: 'flex',
                justifyContent: 'center' 
              }}>
                {React.isValidElement(item.icon) 
                  ? React.cloneElement(item.icon, { sx: { fontSize: 22 } }) 
                  : null}
              </ListItemIcon>
              {!isMini && (
                <ListItemText 
                  primary={item.name} 
                  primaryTypographyProps={{ 
                    fontSize: '0.85rem', 
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                    whiteSpace: 'nowrap'
                  }} 
                />
              )}
            </ListItemButton>
          );

          return (
            <ListItem key={item.name} disablePadding>
              {isMini ? (
                <Tooltip title={item.name} placement="right" arrow>
                  {buttonContent}
                </Tooltip>
              ) : buttonContent}
            </ListItem>
          );
        })}
      </List>

      {/* BOTTOM TOOLS */}
      <Box sx={{ p: 2, mt: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <ListItemButton 
          onClick={colorMode.toggleColorMode}
          sx={{ borderRadius: '8px', justifyContent: isMini ? 'center' : 'flex-start', mb: 1 }}
        >
          <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: isMini ? 0 : 40, justifyContent: 'center' }}>
            {theme.palette.mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
          </ListItemIcon>
          {!isMini && <ListItemText primary="Appearance" primaryTypographyProps={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }} />}
        </ListItemButton>

        <ListItemButton 
          onClick={handleLogout}
          sx={{ 
            borderRadius: '8px', 
            color: '#ff5252', 
            justifyContent: isMini ? 'center' : 'flex-start'
          }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: isMini ? 0 : 40, justifyContent: 'center' }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          {!isMini && <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }} />}
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box component="nav">
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          zIndex: theme.zIndex.drawer + 2, 
          '& .MuiDrawer-paper': { 
            width: expandedWidth, 
            border: 'none', 
            bgcolor: theme.palette.mode === 'dark' ? '#111827' : '#213C51' 
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { 
            width: isMini ? collapsedWidth : expandedWidth, 
            border: 'none',
            overflowX: 'visible',
            transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: theme.zIndex.drawer + 1,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default SuperAdminSidebar;