import React, { useState, useContext } from 'react';
import { 
  Box, Paper, TextField, Button, Typography, Container, 
  InputAdornment, IconButton, Avatar, Alert, Collapse, useTheme, Tooltip, Link 
} from '@mui/material';
import { 
  Visibility, VisibilityOff, Email, Lock, Brightness4, Brightness7 
} from '@mui/icons-material';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

import { ColorModeContext } from '../../App'; 
import logo from '../../assets/logo.png'; 
import cover from '../../assets/cover.jpg'; 

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null); 
  
  const theme = useTheme();
  const navigate = useNavigate();
  const isDarkMode = theme.palette.mode === 'dark';
  const { toggleColorMode } = useContext(ColorModeContext);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Incorrect email or password." : error.message);
      return;
    }
    navigate('/');
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setError(null);
    setMessage(null);

    // redirectTo is set to your local environment for now
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://capstone-group-3-swart.vercel.app/forgot-password',
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Password reset link sent! Please check your Gmail inbox.");
    }
  };

  const dynamicPageBg = isDarkMode 
    ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' 
    : 'linear-gradient(135deg, #025bb4 0%, #e2e8f0 100%)';

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      p: 2, 
      background: dynamicPageBg,
      position: 'relative',
      transition: 'background 0.3s ease'
    }}>
      
      {/* Darkmode Toggle */}
      <Box sx={{ position: 'absolute', top: 20, right: 20 }}>
        <Tooltip title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}>
          <IconButton onClick={toggleColorMode} sx={{ 
              bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              color: isDarkMode ? '#ffb74d' : '#1e293b',
          }}>
            {isDarkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* MAIN CONTAINER */}
      <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'center' }}>
        <Paper 
          elevation={isDarkMode ? 0 : 12}
          sx={{ 
            display: 'flex',
            width: '100%',
            overflow: 'hidden',
            borderRadius: 4,
            bgcolor: isDarkMode ? 'rgba(32, 45, 62, 0.9)' : '#ffffff', 
            backdropFilter: isDarkMode ? 'blur(10px)' : 'none',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
          }}
        >
          {/* LEFT SIDE: COVER IMAGE */}
          <Box sx={{ 
            flex: 1.1, 
            display: { xs: 'none', md: 'flex' }, 
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            bgcolor: '#1e293b',
            overflow: 'hidden'
          }}>
            {isDarkMode && (
              <Box sx={{
                position: 'absolute',
                top: -20,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'conic-gradient(from 180deg at 100% 0%, rgba(0, 0, 0, 0.1) 0%, rgba(255, 255, 255, 0.49) 10%, rgba(0, 0, 0, 0.1) 20%, transparent 40%)',
                filter: 'blur(25px)', 
                width: '100%',
                height: '100%',
                zIndex: 2,
                pointerEvents: 'none',
                maskImage: 'linear-gradient(to bottom, black 50%, transparent 90%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 90%)'
              }} />
            )}

            <Box
              component="img"
              src={cover}
              alt="Library Cover"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                position: 'absolute',
                opacity: isDarkMode ? 0.5 : 0.9,
                zIndex: 1
              }}
            />
          </Box>

          {/* RIGHT SIDE: LOGIN FORM */}
          <Box 
            sx={{ 
              flex: 1,
              minHeight: { xs: 'auto', sm: '580px' }, 
              p: { xs: 4, sm: 6 }, 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center', 
            }}
          >
            <Avatar src={logo} variant="square" sx={{ mb: 2, width: 80, height: 80, bgcolor: 'transparent' }} />
            
            <Typography 
              variant="h4" 
              sx={{ 
                mb: 3, 
                fontStyle: 'italic', 
                fontWeight: 800, 
                color: isDarkMode ? '#f8fafc' : '#002c72', 
                fontFamily: "Cinzel Decorative, sans-serif",
                letterSpacing: '1px',
                textAlign: 'center',
                fontSize: { xs: '1.25rem', sm: '1.7rem' }
              }}
            >
              Library Repository
            </Typography>
            
            <Collapse in={!!error} sx={{ width: '100%', mb: 2 }}>
              <Alert severity="error" variant="outlined" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>
                {error}
              </Alert>
            </Collapse>

            <Collapse in={!!message} sx={{ width: '100%', mb: 2 }}>
              <Alert severity="success" variant="outlined" onClose={() => setMessage(null)} sx={{ borderRadius: 2 }}>
                {message}
              </Alert>
            </Collapse>

            <form onSubmit={handleSignIn} style={{ width: '100%' }}>
              <TextField 
                margin="normal" required fullWidth label="Email" 
                variant="outlined"
                onChange={(e) => setEmail(e.target.value)} 
                InputProps={{ 
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />
                    </InputAdornment>
                  ) 
                }} 
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
              
              <TextField 
                margin="normal" required fullWidth label="Password" 
                variant="outlined"
                type={showPassword ? 'text' : 'password'} 
                onChange={(e) => setPassword(e.target.value)} 
                InputProps={{ 
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />
                    </InputAdornment>
                  ), 
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }} 
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={handleForgotPassword}
                  sx={{ 
                    fontWeight: 600, 
                    textDecoration: 'none', 
                    color: isDarkMode ? '#38bdf8' : '#1976d2',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  Forgot Password?
                </Link>
              </Box>
              
              <Button 
                type="submit" fullWidth variant="contained" 
                sx={{ 
                  mt: 4, py: 1.8, 
                  backgroundColor: isDarkMode ? '#38bdf8' : '#1976d2', 
                  fontWeight: 800, borderRadius: 2, 
                  boxShadow: isDarkMode ? '0 10px 15px -3px rgba(56, 189, 248, 0.3)' : '0 10px 15px -3px rgba(25, 118, 210, 0.3)',
                  '&:hover': { backgroundColor: isDarkMode ? '#0ea5e9' : '#1565c0', transform: 'translateY(-1px)' },
                }}
              >
                LOGIN
              </Button>
            </form>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;