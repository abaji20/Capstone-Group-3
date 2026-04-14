import React, { useState } from 'react';
import { 
  Box, Paper, TextField, Button, Typography, 
  Stack, Alert, InputAdornment, useTheme, IconButton 
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { supabase } from '../../supabaseClient';

const ResetPassword = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); 
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleClickShowPassword = () => setShowPassword(!showPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: "Passwords do not match!" });
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: password });
    
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: "Password updated successfully!" });
      // SUCCESS: Clear the fields here
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false); // Optional: reset visibility to hidden
    }
    setLoading(false);
  };

  const inputStyle = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
      '& fieldset': {
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.23)',
      },
      '&:hover fieldset': {
        borderColor: theme.palette.primary.main,
      },
    },
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh', 
      p: 3, 
      bgcolor: 'background.default',
      transition: 'background-color 0.3s ease'
    }}>
      <Paper 
        elevation={isDarkMode ? 0 : 3} 
        sx={{ 
          p: { xs: 4, md: 6 }, 
          width: '100%', 
          maxWidth: 480, 
          borderRadius: 4, 
          textAlign: 'center', 
          bgcolor: 'background.paper',
          border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #eef2f6',
          boxShadow: isDarkMode 
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.7)' 
            : '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        <Box sx={{ 
          bgcolor: isDarkMode ? 'rgba(144, 202, 249, 0.1)' : '#e1effe', 
          width: 72, 
          height: 72, 
          borderRadius: '20px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 28px',
          transform: 'rotate(-5deg)' 
        }}>
          <LockResetIcon sx={{ fontSize: 38, color: theme.palette.primary.main }} />
        </Box>
        
        <Typography variant="h4" sx={{ fontWeight: 900, mb: 1.5, color: 'text.primary', letterSpacing: '-0.5px' }}>
          Reset Password
        </Typography>
        <Typography variant="body1" sx={{ mb: 5, color: 'text.secondary', px: 2 }}>
          Create a new strong password to keep your account safe.
        </Typography>
        
        {message && (
          <Alert severity={message.type} sx={{ mb: 4, borderRadius: 3, fontWeight: 600 }}>
            {message.text}
          </Alert>
        )}

        <Stack component="form" onSubmit={handleSubmit} spacing={3}>
          <TextField 
            label="New Password *" 
            type={showPassword ? 'text' : 'password'} 
            fullWidth 
            required 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            sx={inputStyle}
            InputProps={{ 
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleClickShowPassword} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <TextField 
            label="Confirm Password *" 
            type={showPassword ? 'text' : 'password'} 
            fullWidth 
            required 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)}
            sx={inputStyle}
            InputProps={{ 
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleClickShowPassword} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <Button 
            type="submit" 
            variant="contained" 
            size="large" 
            disabled={loading}
            sx={{ 
              mt: 2, 
              borderRadius: '12px', 
              py: 2, 
              fontWeight: 800,
              fontSize: '1rem',
              textTransform: 'none', 
              boxShadow: '0 10px 15px -3px rgba(0,118,255,0.3)',
              '&:hover': {
                boxShadow: '0 20px 25px -5px rgba(0,118,255,0.2)',
                transform: 'translateY(-1px)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? "Updating Securely..." : "Update Password"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default ResetPassword;