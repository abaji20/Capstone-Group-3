import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Box, Avatar, Typography, ButtonBase, Menu, MenuItem, ListItemIcon, Divider } from '@mui/material';
import { History, LockReset, Person as PersonIcon } from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { navLinks } from '../navConfig';
import { LogoutButton } from '../shared';
import logo from '../assets/logo.png'; 

const ClientTopbar = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [username, setUsername] = useState('Loading...');
  const navigate = useNavigate();
  const location = useLocation();

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

  return (
    <AppBar position="fixed" sx={{ backgroundColor: '#213C51', height: 80, justifyContent: 'center' }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
        {/* Left: Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 1.5 }} onClick={() => navigate('/')}>
          <Box component="img" src={logo} sx={{ height: 50 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'white', letterSpacing: 0.5 }}>Library Repository</Typography>
        </Box>

        {/* Center/Right: Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {navLinks.client.filter(l => l.path !== '/my-downloads').map(item => (
            <ButtonBase key={item.name} component={Link} to={item.path} 
              sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, color: location.pathname === item.path ? '#fff' : 'rgba(255,255,255,0.6)' }}>
              {item.icon}
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>{item.name}</Typography>
            </ButtonBase>
          ))}
          
          {/* User Profile Trigger */}
          <ButtonBase onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, color: 'white', ml: 2 }}>
            <Avatar sx={{ bgcolor: '#fff', color: '#213C51', width: 32, height: 32 }}><PersonIcon /></Avatar>
            {/* DYNAMIC NAME DISPLAYED HERE */}
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
              {username === 'Loading...' ? '...' : username.split(' ')[0]}
            </Typography>
          </ButtonBase>
        </Box>

        {/* Dropdown Menu */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} 
          PaperProps={{ sx: { mt: 1.5, borderRadius: 3, minWidth: 220, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' } }}>
          <Box sx={{ px: 2, py: 1.5, bgcolor: '#f8fafc' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b' }}>{username}</Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>Client Account</Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => { setAnchorEl(null); navigate('/my-downloads'); }}><ListItemIcon><History fontSize="small" /></ListItemIcon> My Downloads</MenuItem>
          <MenuItem onClick={() => { setAnchorEl(null); navigate('/reset-password'); }}><ListItemIcon><LockReset fontSize="small" /></ListItemIcon> Reset Password</MenuItem>
          <Divider sx={{ my: 0.5 }} />
          <Box sx={{ px: 2, py: 1 }}><LogoutButton /></Box>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};
export default ClientTopbar;