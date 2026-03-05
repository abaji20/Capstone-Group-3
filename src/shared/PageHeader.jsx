import { Box, Typography, Divider } from '@mui/material';

const PageHeader = ({ title, subtitle }) => (
  <Box sx={{ mb: 4 }}>
    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#0D47A1' }}>
      {title}
    </Typography>
    {subtitle && (
      <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>
        {subtitle}
      </Typography>
    )}
    <Divider sx={{ mt: 2, bgcolor: '#0D47A1', height: 2 }} />
  </Box>
);

export default PageHeader;