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
import glcBG from '../../assets/glcBG.jpg';
import libraryBG from '../../assets/libraryBG.jpg';
import glclogo from '../../assets/glclogo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null); 
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('privacy'); // 'privacy' or 'terms'
  
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

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    // --- DOMAIN RESTRICTION LOGIC ---
    if (!email.toLowerCase().endsWith('@goldenlink.ph')) {
      setError("Access Denied: Only @goldenlink.ph accounts are allowed.");
      return;
    }

    setLoading(true);
    
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (authError) {
        if (authError.message === "Invalid login credentials") {
          setError("Incorrect email or password. Please check your credentials.");
        } else if (authError.message.includes("Email not confirmed")) {
          setError("Email not confirmed. Please check your Gmail inbox to verify your account.");
        } else {
          setError(authError.message);
        }
        return;
      }

      if (data.user) {
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
      setError("Only @goldenlink.ph accounts can request a password reset.");
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
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      p: { xs: 2, md: 4 }, 
      backgroundImage: dynamicPageBg,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      position: 'relative',
      transition: 'background 0.3s ease'
    }}>

      {/* DESKTOP-ONLY LOGO (Top-Left, Outside Box) */}
      <Box 
        component="img" 
        src={glclogo} 
        alt="GLC Logo" 
        sx={{ 
          position: 'absolute', 
          top: { md: 24 }, 
          left: { md: 32 }, 
          width: 95, 
          height: 'auto',
          filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.4))',
          zIndex: 10,
          display: { xs: 'none', md: 'block' }
        }} 
      />

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

      {/* MAIN CONTAINER - EXPANDED TO 'md' */}
      <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center' }}>
        <Paper 
          elevation={isDarkMode ? 0 : 20}
          sx={{ 
            display: 'flex',
            width: '100%',
            maxWidth: '1000px', // Pinalaki ang width ng card
            overflow: 'hidden',
            borderRadius: { xs: 3, sm: 5 },
            bgcolor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : '#ffffff', 
            backdropFilter: 'blur(12px)',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* LEFT SIDE: COVER IMAGE BANNER */}
          <Box sx={{ 
            flex: 1.2, 
            display: { xs: 'none', md: 'flex' }, 
            flexDirection: 'column',
            justifyContent: 'flex-end',
            p: 5,
            position: 'relative',
            backgroundImage: `linear-gradient(to top, rgba(15, 23, 42, 0.92) 0%, rgba(15, 23, 42, 0.2) 60%), url(${libraryBG})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            overflow: 'hidden'
          }}>
            <Box sx={{ position: 'relative', zIndex: 2, color: 'white' }}>
              <Typography variant="h5" sx={{ fontWeight: 500, fontFamily: 'Paytone One, sans-serif', letterSpacing: 1 }}>
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
              minHeight: { xs: 'auto', sm: '620px' }, // Pinalaki ang vertical height
              p: { xs: 4, sm: 6 }, 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
            }}
          >
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* MOBILE-ONLY LOGO */}
              <Box
                component="img"
                src={glclogo}
                alt="GLC Logo Mobile"
                sx={{
                  width: 75,
                  height: 'auto',
                  mb: 1.5,
                  filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))',
                  display: { xs: 'block', md: 'none' }
                }}
              />

              {/* BLUE SIGN IN TITLE */}
              <Typography 
                variant="h4" 
                sx={{ 
                  mt: 1,
                  mb: 1, 
                  fontWeight: 800, 
                  color: isDarkMode ? '#38bdf8' : '#1e40af', 
                  textAlign: 'center',
                  fontSize: { xs: '1.6rem', sm: '2rem' }
                }}
              >
                Sign In
              </Typography>

              <Typography 
                variant="body2" 
                sx={{ color: 'text.secondary', mb: 3, textAlign: 'center', fontWeight: 500 }}
              >
                Enter your college credentials to proceed
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
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                />
                
                <TextField 
                  margin="normal" required fullWidth label="Password" 
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
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
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
                    mt: 3, py: 1.6, 
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

            {/* PRIVACY POLICY & TERMS LINKS AT THE BOTTOM OF THE BOX */}
            <Box sx={{ mt: 4, textAlign: 'center' }}>
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
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
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

        <DialogContent dividers sx={{ borderTop: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : undefined }}>
          {modalType === 'privacy' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>1. Data Collection</Typography>
              <Typography variant="body2" color="text.secondary">
                We collect your college email address (`@goldenlink.ph`) and login timestamps purely for authentication and administrative oversight within the Golden Link College Library Repository.
              </Typography>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>2. Use of Information</Typography>
              <Typography variant="body2" color="text.secondary">
                Your credentials are used solely to grant access to repository documents, research papers, and institutional resources based on user roles (Student, Faculty, Admin).
              </Typography>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>3. Data Protection</Typography>
              <Typography variant="body2" color="text.secondary">
                All data is securely handled via Supabase authentication protocols. We do not sell, trade, or share your personal information with external parties.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>1. Authorized Use</Typography>
              <Typography variant="body2" color="text.secondary">
                Access to the Golden Link College Library Repository is strictly limited to active students, faculty, and authorized personnel holding a valid `@goldenlink.ph` email account.
              </Typography>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>2. Intellectual Property</Typography>
              <Typography variant="body2" color="text.secondary">
                All research, capstone papers, and digital archives contained within this repository are protected by intellectual property guidelines. Unauthorized redistribution is strictly prohibited.
              </Typography>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>3. Account Conduct</Typography>
              <Typography variant="body2" color="text.secondary">
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