import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, useTheme } from '@mui/material';

const ActionModal = ({ open, onClose, title, children, onConfirm, confirmText = "Save", confirmBtnSx }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle 
        sx={{ 
          fontWeight: 'bold', 
          bgcolor: isDarkMode ? '#1e293b' : '#f5f5f5', 
          color: isDarkMode ? '#ffffff' : '#213C51' 
        }}
      >
        {title}
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        {children}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button 
          onClick={onConfirm} 
          variant="contained" 
          sx={{ 
            bgcolor: '#1976d2', 
            '&:hover': { bgcolor: '#115293' }, 
            ...confirmBtnSx 
          }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ActionModal;