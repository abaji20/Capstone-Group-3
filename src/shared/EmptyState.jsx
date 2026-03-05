import { Box, Typography } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

const EmptyState = ({ message = "No data found" }) => (
  <Box sx={{ textAlign: 'center', py: 10, color: 'gray' }}>
    <InboxIcon sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
    <Typography variant="h6">{message}</Typography>
  </Box>
);

export default EmptyState;