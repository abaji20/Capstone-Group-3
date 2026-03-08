import React from 'react';
import { Chip } from '@mui/material';

const StatusChip = ({ status }) => {
  // Logic to pick the color based on the text
  const getColor = (s) => {
    switch (s?.toLowerCase()) {
      case 'active':
      case 'approved':
        return 'success'; // Green
      case 'pending':
        return 'warning'; // Yellow/Orange
      case 'archived':
      case 'denied':
        return 'error';   // Red
      default:
        return 'default'; // Grey
    }
  };

  return (
    <Chip 
      label={status} 
      color={getColor(status)} 
      size="large" 
      variant="outlined" 
      sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}
    />
  );
};

export default StatusChip;