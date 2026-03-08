import React, { useState } from 'react';
import { 
  Box, Paper, TextField, Button, Typography, Container, 
  InputAdornment, IconButton, Avatar 
} from '@mui/material';
import { 
  Visibility, VisibilityOff, Email, Lock, PersonOutline 
} from '@mui/icons-material';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert(error.message);
    navigate('/');
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: 2, // Ensures padding on very small devices
        background: 'linear-gradient(135deg, #e0f7fa 0%, #80deea 100%)' 
      }}
    >
      <Container maxWidth="xs" sx={{ p: 0 }}>
        <Paper elevation={8} sx={{ 
          p: { xs: 3, sm: 5 }, // Less padding on mobile, more on desktop
          width: '100%', 
          borderRadius: 4, 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: '#ffffff'
        }}>
          <Avatar sx={{ mb: 2, bgcolor: '#1976d2', width: 90, height: 90 }}>
            <PersonOutline sx={{ fontSize: 60 }} />
          </Avatar>
          
          <Typography variant="h5" sx={{ mb: 4, fontWeight: 700, color: '#333' }}>
            User Log in
          </Typography>
          
          <form onSubmit={handleSignIn} style={{ width: '100%' }}>
            <TextField
              margin="normal" 
              required 
              fullWidth 
              label="User ID (Email)"
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              margin="normal" 
              required 
              fullWidth 
              label="Password" 
              type={showPassword ? 'text' : 'password'}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton 
                      onClick={() => setShowPassword(!showPassword)} 
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <Button 
              type="submit" 
              fullWidth 
              variant="contained" 
              sx={{ 
                mt: 4, 
                py: 1.5, 
                backgroundColor: '#1976d2', 
                fontWeight: 700, 
                borderRadius: 2,
                '&:hover': { backgroundColor: '#1565c0' } 
              }}
            >
              LOGIN
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;