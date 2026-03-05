import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

const ActionModal = ({ open, onClose, title, children, onConfirm, confirmText = "Save" }) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>{title}</DialogTitle>
    <DialogContent sx={{ mt: 2 }}>
      {children}
    </DialogContent>
    <DialogActions sx={{ p: 2 }}>
      <Button onClick={onClose} color="inherit">Cancel</Button>
      <Button onClick={onConfirm} variant="contained" sx={{ bgcolor: '#1976D2' }}>
        {confirmText}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ActionModal;