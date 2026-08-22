import React, { useState } from 'react';
import { 
  Button, Dialog, DialogTitle, DialogContent, 
  DialogContentText, DialogActions 
} from '@mui/material';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const LogoutButton = ({ sx, fullWidth = false, onClick }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleOpenConfirm = (e) => {
    e.stopPropagation();
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleConfirmLogout = async () => {
    setLoading(true);
    if (onClick) {
      await onClick();
    } else {
      await supabase.auth.signOut();
      navigate('/login');
    }
    setLoading(false);
    setOpen(false);
  };

  return (
    <>
      <Button 
        color="error" 
        variant="outlined"
        fullWidth={fullWidth}
        startIcon={<ExitToAppIcon />} 
        onClick={handleOpenConfirm}
        sx={{ 
          fontWeight: 700, 
          textTransform: 'none', 
          borderRadius: '8px', 
          ...sx 
        }}
      >
        Logout
      </Button>

      {/* Logout Confirmation Modal */}
      <Dialog
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: { borderRadius: '12px', padding: 1, minWidth: 320 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          Confirm Logout
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Are you sure you want to log out of your account?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleClose} 
            disabled={loading}
            sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmLogout} 
            color="error" 
            variant="contained" 
            disabled={loading}
            disableElevation
            sx={{ fontWeight: 700, borderRadius: '8px', textTransform: 'none' }}
          >
            {loading ? 'Logging out...' : 'Logout'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LogoutButton;