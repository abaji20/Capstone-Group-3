import React from 'react';
import { Button } from '@mui/material';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const LogoutButton = ({ sx }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <Button 
      color="inherit" 
      startIcon={<ExitToAppIcon />} 
      onClick={handleLogout}
      sx={sx}
    >
      Logout
    </Button>
  );
};

export default LogoutButton;