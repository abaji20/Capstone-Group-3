import React, { useState } from 'react';
import { 
  Box, Paper, TextField, Button, Typography, 
  Stack, Alert, InputAdornment, useTheme 
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { supabase } from '../../supabaseClient';

const ResetPassword = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

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
    }
    setLoading(false);
  };

  // Styles for the text fields to match your Library Repository UI
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
      p: 2, 
      bgcolor: 'background.default', // Automatically switches based on theme
      transition: 'background-color 0.3s ease'
    }}>
      <Paper elevation={0} sx={{ 
        p: 4, 
        width: '100%', 
        maxWidth: 400, 
        borderRadius: 2.5, 
        textAlign: 'center', 
        bgcolor: 'background.paper',
        border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
        boxShadow: isDarkMode 
          ? '0 20px 25px -5px rgba(0, 0, 0, 0.5)' 
          : '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Icon Container */}
        <Box sx={{ 
          bgcolor: isDarkMode ? 'rgba(144, 202, 249, 0.1)' : '#e1effe', 
          width: 64, 
          height: 64, 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 24px' 
        }}>
          <LockResetIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
        </Box>
        
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: 'text.primary' }}>
          Reset Password
        </Typography>
        <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary' }}>
          Enter your new secure password below to regain access.
        </Typography>
        
        {message && (
          <Alert severity={message.type} sx={{ mb: 3, borderRadius: 3 }}>
            {message.text}
          </Alert>
        )}

        <Stack component="form" onSubmit={handleSubmit} spacing={2.5}>
          <TextField 
            label="New Password *" 
            type="password" 
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
              ) 
            }}
          />
          <TextField 
            label="Confirm Password *" 
            type="password" 
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
              borderRadius: 4, 
              py: 1.8, 
              fontWeight: 800,
              fontSize: '1rem',
              textTransform: 'uppercase',
              boxShadow: '0 4px 14px 0 rgba(0,118,255,0.39)',
              '&:hover': {
                boxShadow: '0 6px 20px rgba(0,118,255,0.23)',
              }
            }}
          >
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default ResetPassword;