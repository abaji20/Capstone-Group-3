import React, { useState } from 'react';
import { 
  Card, CardMedia, CardContent, Typography, Button, Box, 
  Dialog, DialogTitle, DialogContent, DialogActions, Stack, Divider, useTheme 
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'; 
import DateRangeIcon from '@mui/icons-material/DateRange';
import CategoryIcon from '@mui/icons-material/Category';
import InfoIcon from '@mui/icons-material/Info';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'; 
import TitleIcon from '@mui/icons-material/Title';
import { supabase } from '../supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloudArrowDown, faFilePdf } from '@fortawesome/free-solid-svg-icons';

const PdfCard = ({ pdf, downloadLabel = "Download" }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  if (!pdf) return null;

  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  
  const coverUrl = pdf.image_url ? supabase.storage.from('pdfs').getPublicUrl(pdf.image_url).data.publicUrl : null;
  
  // Design Constants for Dark/Light compatibility
  const iconColor = isDarkMode ? theme.palette.primary.light : '#1976d2'; 
  const poppinsFont = { fontFamily: "'Poppins', sans-serif" };

  const handleDownload = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existing } = await supabase
          .from('downloads')
          .select('id')
          .eq('user_id', user.id)
          .eq('pdf_id', pdf.id)
          .maybeSingle();

        if (!existing) {
          await supabase.from('downloads').insert([{ user_id: user.id, pdf_id: pdf.id }]);
        }
        await supabase.from('audit_logs').insert([{
          user_id: user.id, pdf_id: pdf.id, action_type: 'Download', description: `Downloaded file: "${pdf.title}"`
        }]);
      }

      const { data } = supabase.storage.from('pdfs').getPublicUrl(pdf.file_url);
      const response = await fetch(data.publicUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${pdf.title || 'document'}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Card sx={{ 
        ...poppinsFont,
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        borderRadius: 2, 
        maxWidth: 220, 
        minWidth: 220,
        flexShrink: 0,
        bgcolor: isDarkMode ? '#1e293b' : '#ffffff', // Better dark surface color
        backgroundImage: 'none',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': { transform: 'translateY(-8px)', boxShadow: isDarkMode ? '0 8px 20px rgba(0,0,0,0.5)' : '0 8px 16px rgba(0,0,0,0.1)' }
      }}>
        {coverUrl ? (
          <CardMedia component="img" height="260" image={coverUrl} alt={pdf.title} sx={{ objectFit: 'cover' }} />
        ) : (
          <Box sx={{ height: 260, bgcolor: isDarkMode ? '#334155' : '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PictureAsPdfIcon sx={{ fontSize: 80, color: iconColor }} /> 
          </Box>
        )}
        
        <CardContent sx={{ flexGrow: 1, p: 2 }}>
          <Typography variant="body1" noWrap sx={{ fontWeight: 700, color: isDarkMode ? '#f8fafc' : 'inherit' }}>
            {pdf.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap sx={{ color: isDarkMode ? '#94a3b8' : 'text.secondary' }}>
            {pdf.author}
          </Typography>
        </CardContent>

        <Stack spacing={1.5} sx={{ p: 2, pt: 0 }}>
          {/* Outlined Button - Adjusted for Dark Mode Contrast */}
          <Button 
            fullWidth 
            variant="outlined" 
            startIcon={<VisibilityIcon />} 
            onClick={() => setOpen(true)} 
            sx={{ 
              fontSize: '0.8rem', 
              textTransform: 'none', 
              borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.5)' : iconColor, 
              color: isDarkMode ? '#38bdf8' : iconColor,
              '&:hover': {
                borderColor: isDarkMode ? '#38bdf8' : iconColor,
                bgcolor: isDarkMode ? 'rgba(56, 189, 248, 0.1)' : 'rgba(25, 118, 210, 0.04)'
              }
            }}
          >
            See More
          </Button>

          {/* Contained Button - Using a vibrant blue for Dark Mode */}
          <Button 
            fullWidth 
            variant="contained" 
            startIcon={<DownloadIcon />} 
            onClick={() => setConfirmOpen(true)} 
            sx={{ 
              fontSize: '0.8rem', 
              textTransform: 'none', 
              bgcolor: isDarkMode ? '#0284c7' : iconColor,
              color: '#ffffff',
              boxShadow: isDarkMode ? '0 4px 14px 0 rgba(2, 132, 199, 0.39)' : 'none',
              '&:hover': { 
                bgcolor: isDarkMode ? '#0ea5e9' : '#1565c0',
                boxShadow: isDarkMode ? '0 6px 20px rgba(2, 132, 199, 0.23)' : 'none'
              } 
            }}
          >
            {downloadLabel}
          </Button>
        </Stack>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog 
        open={confirmOpen} 
        onClose={() => setConfirmOpen(false)} 
        PaperProps={{ sx: { borderRadius: 3, p: 2, ...poppinsFont, bgcolor: isDarkMode ? '#0f172a' : '#fff' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
          <FontAwesomeIcon icon={faCloudArrowDown} style={{ color: iconColor }} /> Confirm {downloadLabel}
        </DialogTitle>
        <DialogContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <FontAwesomeIcon icon={faFilePdf} style={{ color: iconColor, fontSize: '40px' }} />
            <Typography>You are about to download: <br/><strong>"{pdf.title}"</strong></Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} sx={{ color: isDarkMode ? '#94a3b8' : 'inherit' }}>Cancel</Button>
          <Button onClick={handleDownload} variant="contained" sx={{ bgcolor: isDarkMode ? '#0284c7' : iconColor }}>Confirm</Button>
        </DialogActions>
      </Dialog>
      
      {/* Details Modal */}
      <Dialog 
        open={open} 
        onClose={() => setOpen(false)} 
        fullWidth 
        maxWidth="sm" 
        PaperProps={{ sx: { borderRadius: 3, ...poppinsFont, bgcolor: isDarkMode ? '#0f172a' : '#fff' } }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon sx={{ color: iconColor }} /> Document Info
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: isDarkMode ? '#334155' : 'rgba(0,0,0,0.12)' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
            {coverUrl && (
              <Box sx={{ width: { xs: '100%', sm: 160 }, flexShrink: 0 }}>
                <img src={coverUrl} alt={pdf.title} style={{ width: '100%', borderRadius: 8, boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }} />
              </Box>
            )}
            <Stack spacing={1.5} sx={{ flexGrow: 1 }}>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TitleIcon fontSize="small" sx={{ color: iconColor }} /> <strong>Title:</strong> {pdf.title}
              </Typography>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LibraryBooksIcon fontSize="small" sx={{ color: iconColor }} /> <strong>Type:</strong> {pdf.category || 'N/A'}
              </Typography>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CategoryIcon fontSize="small" sx={{ color: iconColor }} /> <strong>Genre:</strong> {pdf.genre}
              </Typography>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DateRangeIcon fontSize="small" sx={{ color: iconColor }} /> <strong>Published:</strong> {pdf.published_date || 'N/A'}
              </Typography>
              <Divider sx={{ bgcolor: isDarkMode ? '#334155' : 'rgba(0,0,0,0.12)' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Description</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ color: isDarkMode ? '#94a3b8' : 'text.secondary' }}>
                {pdf.description || "No description provided."}
              </Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} sx={{ color: isDarkMode ? '#94a3b8' : 'inherit' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PdfCard;