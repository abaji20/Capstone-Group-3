import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper } from '@mui/material';
import { supabase } from '../supabaseClient';

const UpdatePassword = () => {
  const [password, setPassword] = useState('');

  const handleUpdate = async () => {
    const { error } = await supabase.auth.updateUser({ password: password });
    
    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("Password updated! Redirecting to login...");
      window.location.href = '/login'; // Or use your router
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
      <Paper sx={{ p: 4, width: 300 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Set Your Password</Typography>
        <TextField 
          fullWidth type="password" label="New Password" 
          value={password} onChange={(e) => setPassword(e.target.value)} 
          sx={{ mb: 2 }}
        />
        <Button fullWidth variant="contained" onClick={handleUpdate}>Save Password</Button>
      </Paper>
    </Box>
  );
};

export default UpdatePassword;