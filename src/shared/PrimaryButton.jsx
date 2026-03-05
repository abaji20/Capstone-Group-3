import { Button } from '@mui/material';

const PrimaryButton = ({ children, onClick, ...props }) => (
  <Button 
    variant="contained" 
    onClick={onClick}
    sx={{ 
      bgcolor: '#1976D2', 
      textTransform: 'none', 
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