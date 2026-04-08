import { Button } from '@mui/material';

const PrimaryButton = ({ children, onClick, ...props }) => (
  <Button 
    variant="contained" 
    onClick={onClick}
    sx={{ 
      bgcolor: '#003569', 
      textTransform: 'none', 
      color: '#fff',
      borderRadius: 2,
      fontSize: '0.95rem',
      fontWeight: 'bold',
      px: 3,
      '&:hover': { bgcolor: '#0D47A1' } 
    }}
    {...props}
  >
    {children}
  </Button>
);

export default PrimaryButton;