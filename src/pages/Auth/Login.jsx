import React, { useState, useContext } from 'react';
import { 
  Box, Paper, TextField, Button, Typography, Container, 
  InputAdornment, IconButton, Avatar, Alert, Collapse, useTheme, Tooltip 
} from '@mui/material';
import { 
  Visibility, VisibilityOff, Email, Lock, Brightness4, Brightness7 
} from '@mui/icons-material';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

// Import the context from your App.js file
import { ColorModeContext } from '../../App'; 

// Import your logo from the correct path
import logo from '../../assets/logo.png'; 

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  
  const theme = useTheme();
  const navigate = useNavigate();
  const isDarkMode = theme.palette.mode === 'dark';

  // Consume the toggle function from Context
  const { toggleColorMode } = useContext(ColorModeContext);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Incorrect email or password." : error.message);
      return;
    }
    navigate('/');
  };

  // Adjusted gradients for a smoother look
  const dynamicPageBg = isDarkMode 
    ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' 
    : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';

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
      
      {/* Darkmode Toggle - Top Right */}
      <Box sx={{ position: 'absolute', top: 20, right: 20 }}>
        <Tooltip title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}>
          <IconButton 
            onClick={toggleColorMode} 
            sx={{ 
              bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              color: isDarkMode ? '#ffb74d' : '#1e293b',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
              '&:hover': { bgcolor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }
            }}
          >
            {isDarkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Tooltip>
      </Box>

      <Container maxWidth="xs" sx={{ p: 0 }}>
        <Paper 
          elevation={isDarkMode ? 0 : 8} 
          sx={{ 
            p: { xs: 3, sm: 5 }, 
            width: '100%', 
            borderRadius: 2, // Matches the rounded look in your screenshots
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            // Made the dark mode background slightly lighter (Slate 800ish)
            bgcolor: isDarkMode ? '#202d3e' : '#ffffff', 
            backgroundImage: 'none',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
            boxShadow: isDarkMode ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease'
          }}
        >
          <Avatar 
            src={logo} 
            variant="square" 
            sx={{ mb: 1, width: 80, height: 80, bgcolor: 'transparent' }} 
          />
          
          <Typography 
            variant="h5" 
            sx={{ mb: 1, fontWeight: 900, color: 'text.primary', letterSpacing: '-0.5px' }}
          >
            Library Repository
          </Typography>
          
          <Collapse in={!!error} sx={{ width: '100%', mb: 2 }}>
            <Alert severity="error" variant="outlined" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          </Collapse>

          <form onSubmit={handleSignIn} style={{ width: '100%' }}>
            <TextField 
              margin="normal" 
              required 
              fullWidth 
              label="Email" 
              variant="outlined"
              onChange={(e) => setEmail(e.target.value)} 
              InputProps={{ 
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                  </InputAdornment>
                ) 
              }} 
              sx={{ 
                '& .MuiOutlinedInput-root': { 
                  borderRadius: 3,
                  bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'transparent'
                } 
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
                    <Lock sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
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
              sx={{ 
                '& .MuiOutlinedInput-root': { 
                  borderRadius: 3,
                  bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'transparent'
                } 
              }}
            />
            
            <Button 
              type="submit" 
              fullWidth 
              variant="contained" 
              sx={{ 
                mt: 4, 
                py: 1.8, 
                backgroundColor: isDarkMode ? '#38bdf8' : '#1976d2', 
                fontWeight: 800, 
                borderRadius: 3, 
                fontSize: '0.95rem',
                boxShadow: isDarkMode ? '0 10px 15px -3px rgba(56, 189, 248, 0.3)' : '0 10px 15px -3px rgba(25, 118, 210, 0.3)',
                '&:hover': { 
                  backgroundColor: isDarkMode ? '#0ea5e9' : '#1565c0',
                  transform: 'translateY(-1px)'
                },
                transition: 'all 0.2s ease'
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