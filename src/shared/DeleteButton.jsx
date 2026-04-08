import { IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const DeleteButton = ({ onClick, title = "Delete" }) => (
  <Tooltip title={title}>
    <IconButton 
      // Removed the window.confirm logic entirely
      onClick={onClick} 
      sx={{ 
        color: '#d32f2f', 
        '&:hover': { bgcolor: '#ffebee' } 
      }}
    >
      <DeleteIcon />
    </IconButton>
  </Tooltip>
);

export default DeleteButton;