import { Card, CardContent, CardActions, Typography, Button, Box } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DownloadIcon from '@mui/icons-material/Download';

const PdfCard = ({ title, category, onDownload }) => (
  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 3 }}>
    <Box sx={{ bgcolor: '#E3F2FD', display: 'flex', justifyContent: 'center', py: 4 }}>
      <PictureAsPdfIcon sx={{ fontSize: 60, color: '#1976D2' }} />
    </Box>
    <CardContent sx={{ flexGrow: 1 }}>
      <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Category: {category}
      </Typography>
    </CardContent>
    <CardActions sx={{ p: 2, pt: 0 }}>
      <Button 
        fullWidth 
        variant="contained" 
        startIcon={<DownloadIcon />}
        onClick={onDownload}
        sx={{ bgcolor: '#1976D2' }}
      >
        Download
      </Button>
    </CardActions>
  </Card>
);

export default PdfCard;