import { TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

const SearchBar = ({ value, onChange, placeholder = "Search..." }) => (
  <TextField
    fullWidth
    size="small"
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          <SearchIcon sx={{ color: '#1976D2' }} />
        </InputAdornment>
      ),
    }}
    sx={{ 
      bgcolor: 'white', 
      borderRadius: 1,
      '& .MuiOutlinedInput-root': {
        '&.Mui-focused fieldset': { borderColor: '#1976D2' },
      }
    }}
  />
);

export default SearchBar;