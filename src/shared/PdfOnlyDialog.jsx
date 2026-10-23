import React from 'react';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const PdfOnlyDialog = ({ open, onClose }) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="xs"
    fullWidth
    PaperProps={{ sx: { borderRadius: 0.5 } }}
    aria-labelledby="pdf-only-dialog-title"
  >
    <DialogTitle
      id="pdf-only-dialog-title"
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800 }}
    >
      File type not supported
      <IconButton aria-label="Close alert" onClick={onClose} edge="end" size="small">
        <CloseIcon />
      </IconButton>
    </DialogTitle>
    <DialogContent>
      <Alert severity="error" sx={{ borderRadius: 0.5 }}>
        Only PDF files can be uploaded!
      </Alert>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Close</Button>
    </DialogActions>
  </Dialog>
);

export default PdfOnlyDialog;
