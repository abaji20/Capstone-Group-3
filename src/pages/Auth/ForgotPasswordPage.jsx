import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, TextField, Button, Typography, Container, 
  InputAdornment, Avatar, Alert, Collapse, useTheme 
} from '@mui/material';
import { 
  Email, Lock, ArrowBack, CheckCircleOutline, KeySharp 
} from '@mui/icons-material';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const theme = useTheme();
  const navigate = useNavigate();
  const isDarkMode = theme.palette.mode === 'dark';
  const poppinsFont = "'Poppins', sans-serif";

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsRecoveryMode(true);
      }
    };
    checkSession();
  }, []);

  const handleSendResetEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/forgot-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Reset link sent! Please check your email inbox.");
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      // Changed: Just show success message, do not redirect automatically
      setMessage("Password updated successfully! You can now sign in with your new password.");
      await supabase.auth.signOut(); // Kill recovery session
    }
    setLoading(false);
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      bgcolor: 'background.default',
      p: 2, 
      fontFamily: poppinsFont,
      transition: 'background 0.3s ease'
    }}>
      <Container maxWidth="sm">
        <Paper 
          elevation={isDarkMode ? 0 : 4} 
          sx={{ 
            p: { xs: 4, md: 6 }, 
            borderRadius: 1.5, 
            textAlign: 'center', 
            bgcolor: 'background.paper',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
            boxShadow: isDarkMode ? 'none' : '0px 10px 30px rgba(0,0,0,0.05)'
          }}
        >
          <Avatar 
            sx={{ 
              m: '0 auto 20px', 
              bgcolor: isDarkMode ? 'primary.main' : '#1a3e8a', 
              width: 56, 
              height: 56 
            }}
          >
            {isRecoveryMode ? <Lock /> : <KeySharp />}
          </Avatar>

          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, fontFamily: poppinsFont, color: 'text.primary' }}>
            {isRecoveryMode ? 'Reset Password' : 'Forgot Password'}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4, fontFamily: poppinsFont, px: 2 }}>
            {isRecoveryMode 
              ? 'Enter your new secure password below to regain access.' 
              : 'Enter your email address and we will send you a link to reset your password.'}
          </Typography>

          <Collapse in={!!error}><Alert severity="error" sx={{ mb: 3, borderRadius: 1.5 }}>{error}</Alert></Collapse>
          <Collapse in={!!message}><Alert icon={<CheckCircleOutline fontSize="inherit" />} severity="success" sx={{ mb: 3, borderRadius: 1.5 }}>{message}</Alert></Collapse>

          <form onSubmit={isRecoveryMode ? handleUpdatePassword : handleSendResetEmail}>
            {!isRecoveryMode ? (
              <TextField fullWidth label="Email Address" placeholder="example@gmail.com" required variant="outlined" onChange={(e) => setEmail(e.target.value)}
                InputProps={{ startAdornment: (<InputAdornment position="start"><Email sx={{ color: 'text.secondary' }} /></InputAdornment>) }}
                sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
            ) : (
              <>
                <TextField fullWidth type="password" label="New Password" required variant="outlined" onChange={(e) => setPassword(e.target.value)}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><Lock sx={{ color: 'text.secondary' }} /></InputAdornment>) }}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
                <TextField fullWidth type="password" label="Confirm Password" required variant="outlined" onChange={(e) => setConfirmPassword(e.target.value)}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><Lock sx={{ color: 'text.secondary' }} /></InputAdornment>) }}
                  sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
              </>
            )}

            <Button type="submit" fullWidth variant="contained" disabled={loading}
              sx={{ 
                py: 2, fontWeight: 800, borderRadius: 1.5, textTransform: 'uppercase', fontSize: '0.95rem', fontFamily: poppinsFont, 
                bgcolor: isDarkMode ? 'primary.main' : '#1a3e8a', 
                '&:hover': { bgcolor: isDarkMode ? 'primary.dark' : '#122c63' } 
              }}>
              {loading ? 'Processing...' : isRecoveryMode ? 'Update Password' : 'Send Reset Link'}
            </Button>
          </form>

          <Button startIcon={<ArrowBack />} 
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/login');
            }}
            sx={{ mt: 3, textTransform: 'none', fontWeight: 600, fontFamily: poppinsFont, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
            Back to Login
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default ForgotPasswordPage;