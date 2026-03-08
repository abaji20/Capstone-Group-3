// src/pages/Auth/ResetPassword.jsx
import React, { useState } from 'react';
import { 
  Box, Paper, TextField, Button, Typography, 
  Stack, Alert, InputAdornment 
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { supabase } from '../../supabaseClient';

const ResetPassword = () => {
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
    // Supabase logic para sa pag-update ng password
    const { error } = await supabase.auth.updateUser({ password: password });
    
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: "Password updated successfully!" });
    }
    setLoading(false);
  };

  return (
    <Box sx={{ 
      display: 'flex', justifyContent: 'center', alignItems: 'center', 
      minHeight: '80vh', p: 2, fontFamily: "'Poppins', sans-serif" 
    }}>
      <Paper sx={{ 
        p: 4, width: '100%', maxWidth: 400, borderRadius: 4, 
        textAlign: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' 
      }}>
        <Box sx={{ bgcolor: '#e1effe', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <LockResetIcon sx={{ fontSize: 30, color: '#1976d2' }} />
        </Box>
        
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: '#1e293b' }}>
          Reset Password
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter your new secure password below to regain access.
        </Typography>
        
        {message && (
          <Alert severity={message.type} sx={{ mb: 2, borderRadius: 2 }}>
            {message.text}
          </Alert>
        )}

        <Stack component="form" onSubmit={handleSubmit} spacing={2}>
          <TextField 
            label="New Password" 
            type="password" 
            fullWidth 
            required 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><LockOutlinedIcon color="action" /></InputAdornment> }}
          />
          <TextField 
            label="Confirm Password" 
            type="password" 
            fullWidth 
            required 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><LockOutlinedIcon color="action" /></InputAdornment> }}
          />
          <Button 
            type="submit" 
            variant="contained" 
            size="large" 
            disabled={loading}
            sx={{ 
              bgcolor: '#1976d2', mt: 2, borderRadius: 3, 
              py: 1.5, fontWeight: 700, '&:hover': { bgcolor: '#1565c0' } 
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