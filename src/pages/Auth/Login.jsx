import React, { useState, useContext } from 'react';
import { 
  Box, Paper, TextField, Button, Typography, Container, 
  InputAdornment, IconButton, Alert, Collapse, useTheme, Tooltip, Link,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { 
  Visibility, VisibilityOff, Email, Lock, Brightness4, Brightness7, Close 
} from '@mui/icons-material';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

import { ColorModeContext } from '../../App'; 
import glcBG from '../../assets/glclogin.jpg';
import libraryBG from '../../assets/libraryBG.jpg';
import glclogo from '../../assets/glclogo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null); 
  const [loading, setLoading] = useState(false);

  // Modal State (Removed automatic first-visit session logic)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('privacy'); 
  
  const theme = useTheme();
  const navigate = useNavigate();
  const isDarkMode = theme.palette.mode === 'dark';
  const { toggleColorMode } = useContext(ColorModeContext);

  const handleOpenModal = (type) => {
    setModalType(type);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  // --- LOGIN LOCKOUT HELPER FUNCTIONS ---
  const checkIsLockedOut = () => {
    const lockUntil = localStorage.getItem('loginLockUntil');
    if (lockUntil) {
      const now = new Date().getTime();
      if (now < parseInt(lockUntil, 10)) {
        return true;
      } else {
        localStorage.removeItem('loginLockUntil');
        localStorage.removeItem('loginAttempts');
        return false;
      }
    }
    return false;
  };

  const registerFailedAttempt = () => {
    let attempts = parseInt(localStorage.getItem('loginAttempts') || '0', 10);
    attempts += 1;
    localStorage.setItem('loginAttempts', attempts.toString());

    if (attempts >= 5) {
      const lockUntil = new Date().getTime() + 3 * 60 * 1000;
      localStorage.setItem('loginLockUntil', lockUntil.toString());
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (checkIsLockedOut()) {
      setError("Too many failed login attempts. Please try again later.");
      return;
    }

    if (!email.toLowerCase().endsWith('@goldenlink.ph')) {
      setError("Access Denied: Only Authorized accounts are allowed.");
      return;
    }

    setLoading(true);
    
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (authError) {
        registerFailedAttempt();

        if (checkIsLockedOut()) {
          setError("Too many failed login attempts. Please try again later.");
        } else {
          if (authError.message === "Invalid login credentials") {
            setError("Incorrect email or password. Please check your credentials.");
          } else if (authError.message.includes("Email not confirmed")) {
            setError("Email not confirmed. Please check your Gmail inbox to verify your account.");
          } else {
            setError(authError.message);
          }
        }
        return;
      }

      if (data.user) {
        localStorage.removeItem('loginAttempts');
        localStorage.removeItem('loginLockUntil');
        navigate('/');
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    
    if (!email.toLowerCase().endsWith('@goldenlink.ph')) {
      setError("Only Authorized accounts can request a password reset.");
      return;
    }

    setError(null);
    setMessage(null);

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
    ? `linear-gradient(rgba(15, 23, 42, 0.88), rgba(15, 23, 42, 0.88)), url(${glcBG})` 
    : `linear-gradient(rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.65)), url(${glcBG})`;

  return (
    <Box sx={{ 
      height: '100vh', 
      width: '100vw',
      overflow: 'hidden',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      p: { xs: 2, md: 3, lg: 4 }, 
      backgroundImage: dynamicPageBg,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      position: 'relative',
      transition: 'background 0.3s ease'
    }}>

      {/* Darkmode Toggle */}
      <Box sx={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
        <Tooltip title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}>
          <IconButton onClick={toggleColorMode} sx={{ 
              bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
              color: isDarkMode ? '#ffb74d' : '#ffffff',
              backdropFilter: 'blur(10px)',
              '&:hover': { bgcolor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)' }
          }}>
            {isDarkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* MAIN CONTAINER */}
      <Container maxWidth="xl" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 0 }}>
        <Paper 
          elevation={isDarkMode ? 0 : 20}
          sx={{ 
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            width: '100%',
            maxWidth: { xs: '100%', sm: '420px', md: '850px', lg: '1050px' },
            height: { xs: 'auto', md: '550px', lg: '600px' },
            maxHeight: '90vh',
            overflow: 'hidden',
            borderRadius: { xs: 2, sm: 3 },
            bgcolor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : '#ffffff', 
            backdropFilter: 'blur(12px)',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* LEFT SIDE: COVER IMAGE BANNER */}
          <Box sx={{ 
            flex: { md: 1, lg: 1.2 }, 
            justifyContent: 'flex-end',
            display: { xs: 'none', md: 'flex' }, 
            flexDirection: 'column',
            p: { md: 4, lg: 5 },
            position: 'relative',
            backgroundImage: `linear-gradient(to top, rgba(15, 23, 42, 0.92) 0%, rgba(15, 23, 42, 0.2) 60%), url(${libraryBG})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            overflow: 'hidden',
            height: '100%'
          }}>
            <Box sx={{ position: 'relative', zIndex: 2, color: 'white' }}>
              <Typography variant="h4" sx={{ fontWeight: 500, fontFamily: 'Paytone One, sans-serif', letterSpacing: 1 }}>
                Library Repository
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85, mt: 1, fontWeight: 500 }}>
                Golden Link College Web-based Library Repository System
              </Typography>
            </Box>
          </Box>

          {/* RIGHT SIDE: LOGIN FORM */}
          <Box 
            sx={{ 
              flex: 1,
              height: '100%',
              p: { xs: 3, sm: 4, lg: 5 }, 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              overflowY: { xs: 'auto', md: 'hidden' }
            }}
          >
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* LOGO */}
              <Box
                component="img"
                src={glclogo}
                alt="GLC Logo"
                sx={{
                  width: { xs: 50, md: 65, lg: 75 },
                  height: 'auto',
                  mb: 0.5,
                  filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))',
                }}
              />

              {/* BLUE SIGN IN TITLE */}
              <Typography 
                variant="h4" 
                sx={{ 
                  mt: 0.5,
                  mb: 0.5, 
                  fontWeight: 800, 
                  color: isDarkMode ? '#38bdf8' : '#1e40af', 
                  textAlign: 'center',
                  fontSize: { xs: '1.3rem', sm: '1.5rem', lg: '1.8rem' }
                }}
              >
                Sign In
              </Typography>

              <Typography 
                variant="body2" 
                sx={{ color: 'text.secondary', mb: 2, textAlign: 'center', fontWeight: 500 }}
              >
                Enter your college credentials to proceed
              </Typography>
              
              <Collapse in={!!error} sx={{ width: '100%', mb: 1.5 }}>
                <Alert severity="error" variant="outlined" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>
                  {error}
                </Alert>
              </Collapse>

              <Collapse in={!!message} sx={{ width: '100%', mb: 1.5 }}>
                <Alert severity="success" variant="outlined" onClose={() => setMessage(null)} sx={{ borderRadius: 2 }}>
                  {message}
                </Alert>
              </Collapse>

              <form onSubmit={handleSignIn} style={{ width: '100%' }}>
                <TextField 
                  margin="dense" required fullWidth label="Email" 
                  variant="outlined"
                  placeholder="username@goldenlink.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)} 
                  InputProps={{ 
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email sx={{ color: '#213C51', fontSize: '1.2rem' }} />
                      </InputAdornment>
                    ) 
                  }} 
                  sx={{ 
                    '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                    '& input:-webkit-autofill': {
                      WebkitBoxShadow: `0 0 0 1000px ${isDarkMode ? '#1e293b' : '#ffffff'} inset !important`,
                      WebkitTextFillColor: `${isDarkMode ? '#f8fafc' : '#0f172a'} !important`,
                      transition: 'background-color 5000s ease-in-out 0s'
                    }
                  }}
                />
                
                <TextField 
                  margin="dense" required fullWidth label="Password" 
                  variant="outlined"
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)} 
                  InputProps={{ 
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: '#213C51', fontSize: '1.2rem' }} />
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
                    '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                    '& input:-webkit-autofill': {
                      WebkitBoxShadow: `0 0 0 1000px ${isDarkMode ? '#1e293b' : '#ffffff'} inset !important`,
                      WebkitTextFillColor: `${isDarkMode ? '#f8fafc' : '#0f172a'} !important`,
                      transition: 'background-color 5000s ease-in-out 0s'
                    }
                  }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                  <Link
                    component="button"
                    type="button"
                    variant="body2"
                    onClick={handleForgotPassword}
                    sx={{ 
                      fontWeight: 700, 
                      textDecoration: 'none', 
                      color: isDarkMode ? '#38bdf8' : '#213C51',
                      '&:hover': { textDecoration: 'underline' }
                    }}
                  >
                    Forgot Password?
                  </Link>
                </Box>
                
                <Button 
                  type="submit" fullWidth variant="contained" 
                  disabled={loading}
                  sx={{ 
                    mt: 2, py: 1.4, 
                    backgroundColor: '#213C51', 
                    color: '#ffffff',
                    fontWeight: 800, 
                    borderRadius: 2.5, 
                    fontSize: '0.95rem',
                    textTransform: 'none',
                    boxShadow: '0 10px 15px -3px rgba(33, 60, 81, 0.3)',
                    '&:hover': { backgroundColor: '#182d3e', transform: 'translateY(-1px)' },
                  }}
                >
                  {loading ? "AUTHENTICATING..." : "LOGIN"}
                </Button>
              </form>
            </Box>

            {/* PRIVACY POLICY & TERMS LINKS AT THE BOTTOM */}
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                By signing in, you agree to Golden Link College Policies.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
                <Link
                  component="button"
                  variant="caption"
                  onClick={() => handleOpenModal('privacy')}
                  sx={{ 
                    color: isDarkMode ? '#94a3b8' : '#64748b', 
                    fontWeight: 600, 
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline', color: isDarkMode ? '#38bdf8' : '#1e40af' }
                  }}
                >
                  Privacy Policy
                </Link>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>•</Typography>
                <Link
                  component="button"
                  variant="caption"
                  onClick={() => handleOpenModal('terms')}
                  sx={{ 
                    color: isDarkMode ? '#94a3b8' : '#64748b', 
                    fontWeight: 600, 
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline', color: isDarkMode ? '#38bdf8' : '#1e40af' }
                  }}
                >
                  Terms & Conditions
                </Link>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Container>

      {/* POLICY & TERMS MODAL / DIALOG */}
      <Dialog 
        open={modalOpen} 
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            minHeight: '250px',
            maxHeight: '200vh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
            color: isDarkMode ? '#f8fafc' : '#0f172a'
          }
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800 }}>
          {modalType === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'}
          <IconButton onClick={handleCloseModal} sx={{ color: (theme) => theme.palette.grey[500] }}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ flexGrow: 1, borderTop: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : undefined, p: 3 }}>
          {modalType === 'privacy' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>1. Data Collection</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                We collect your college email address and login timestamps purely for authentication and administrative oversight within the Golden Link College Library Repository.
              </Typography>

              <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 1 }}>2. Use of Information</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                Your credentials are used solely to grant access to repository documents, research papers, and institutional resources based on user roles.
              </Typography>

              <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 1 }}>3. Data Protection</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                All data is securely handled via authentication protocols. We do not sell, trade, or share your personal information with external parties.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>1. Authorized Use</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                Access to the Golden Link College Library Repository is strictly limited to active students, faculty, and authorized personnel holding a valid email account.
              </Typography>

              <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 1 }}>2. Intellectual Property</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                All research, capstone papers, and digital archives contained within this repository are protected by intellectual property guidelines. Unauthorized redistribution is strictly prohibited.
              </Typography>

              <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 1 }}>3. Account Conduct</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                Users are responsible for maintaining the confidentiality of their login details. Any unauthorized activity performed under your credentials must be reported to the system administrator immediately.
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={handleCloseModal} 
            variant="contained" 
            sx={{ 
              backgroundColor: '#213C51', 
              color: '#fff', 
              fontWeight: 700, 
              borderRadius: 2,
              px: 3,
              '&:hover': { backgroundColor: '#182d3e' }
            }}
          >
            I Understand
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Login;