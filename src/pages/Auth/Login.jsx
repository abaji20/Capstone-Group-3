import React, { useState } from 'react';
import { Box, Paper, TextField, Button, Typography, Container, Avatar, FormControlLabel, Checkbox, Link } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'; // Optional: Use an icon
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert(error.message);
    navigate('/');
  };

  return (
    // This container centers everything
    <Container component="main" maxWidth="xs" sx={{ display: 'flex', alignItems: 'center', height: '100vh' }}>
      <Paper elevation={6} sx={{ p: 4, width: '100%', borderRadius: 3, backgroundColor: '#213C51', color: '#fff' }}>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>SIGN IN</Typography>
          
          <Avatar sx={{ m: 1, bgcolor: '#00E5FF' }}> {/* Teal accent */}
            <LockOutlinedIcon />
          </Avatar>

          <form onSubmit={handleSignIn} style={{ width: '100%' }}>
            <TextField
              margin="normal" required fullWidth label="Username" autoFocus
              onChange={(e) => setEmail(e.target.value)}
              sx={{ input: { color: 'white' }, label: { color: '#ccc' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#ccc' } } }}
            />
            <TextField
              margin="normal" required fullWidth label="Password" type="password"
              onChange={(e) => setPassword(e.target.value)}
              sx={{ input: { color: 'white' }, label: { color: '#ccc' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#ccc' } } }}
            />
            
            <FormControlLabel control={<Checkbox sx={{ color: '#ccc' }} />} label="Remember me" />
            
            <Button
              type="submit" fullWidth variant="contained"
              sx={{ mt: 3, mb: 2, backgroundColor: '#00E5FF', color: '#000', fontWeight: 'bold', '&:hover': { backgroundColor: '#00bcd4' } }}
            >
              LOGIN
            </Button>
            
            <Link href="#" variant="body2" sx={{ color: '#ccc', display: 'block', textAlign: 'center' }}>
              Forgot your password?
            </Link>
          </form>
        </Box>
      </Paper>
    </Container>
  );
};
export default Login;