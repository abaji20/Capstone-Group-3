import { TextField } from '@mui/material';

const FormInput = ({ label, ...props }) => (
  <TextField
    fullWidth
    label={label}
    variant="outlined"
    margin="normal"
    sx={{
      '& .MuiOutlinedInput-root': {
        '&.Mui-focused fieldset': { borderColor: '#1976D2' },
      },
    }}
    {...props}
  />
);

export default FormInput;