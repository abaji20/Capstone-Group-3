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
import BookIcon from '@mui/icons-material/Book'; 
import PersonIcon from '@mui/icons-material/Person'; 
import { supabase } from '../supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloudArrowDown, faFilePdf } from '@fortawesome/free-solid-svg-icons';
// Import your logo
import logo from '../assets/logo.png'; 

const PdfCard = ({ pdf, downloadLabel = "Download", variant = "normal" }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  if (!pdf) return null;

  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  
  const coverUrl = pdf.image_url ? supabase.storage.from('pdfs').getPublicUrl(pdf.image_url).data.publicUrl : null;
  const iconColor = isDarkMode ? theme.palette.primary.light : '#1976d2'; 
  const poppinsFont = { fontFamily: "'Poppins', sans-serif" };

  const isSmall = variant === "small";

  const handleRead = () => {
    const { data } = supabase.storage.from('pdfs').getPublicUrl(pdf.file_url);
    if (data?.publicUrl) {
      window.open(data.publicUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownload = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: existingDownload } = await supabase
          .from('downloads')
          .select('id')
          .eq('user_id', user.id)
          .eq('pdf_id', pdf.id)
          .maybeSingle();

        if (!existingDownload) {
          await supabase.from('downloads').insert([{ user_id: user.id, pdf_id: pdf.id }]);
          
          await supabase.from('audit_logs').insert([{
            user_id: user.id, 
            pdf_id: pdf.id, 
            action_type: 'Download', 
            description: `Downloaded file: "${pdf.title}"`
          }]);
        }
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
        height: '100%', display: 'flex', flexDirection: 'column',
        borderRadius: 2, 
        maxWidth: isSmall ? { xs: 160, sm: 180 } : 220, 
        minWidth: isSmall ? { xs: 160, sm: 180 } : 220, 
        flexShrink: 0,
        bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': { transform: 'translateY(-8px)', boxShadow: isDarkMode ? '0 8px 20px rgba(0,0,0,0.5)' : '0 8px 16px rgba(0,0,0,0.1)' }
      }}>
        {coverUrl ? (
          <CardMedia 
            component="img" 
            height={isSmall ? "200" : "260"} 
            image={coverUrl} 
            alt={pdf.title} 
            sx={{ objectFit: 'cover' }} 
          />
        ) : (
          /* UPDATED: Replaced PDF Icon with Logo */
          <Box sx={{ 
            height: isSmall ? 200 : 260, 
            bgcolor: isDarkMode ? '#334155' : '#3441fd', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            p: 3
          }}>
            <Box 
              component="img"
              src={logo}
              alt="Logo Fallback"
              sx={{ 
                width: '65%', 
                height: 'auto', 
                opacity: 0.8,
                filter: isDarkMode ? 'drop-shadow(0px 4px 10px rgba(0,0,0,0.5))' : 'none'
              }}
            />
          </Box>
        )}
        
        <CardContent sx={{ flexGrow: 1, p: isSmall ? 1.5 : 2 }}>
          <Typography 
            variant={isSmall ? "body2" : "body1"} 
            noWrap 
            sx={{ fontWeight: 700, color: isDarkMode ? '#f8fafc' : 'inherit' }}
          >
            {pdf.title}
          </Typography>
          <Typography 
            variant="caption" 
            color="text.secondary" 
            noWrap 
            sx={{ color: isDarkMode ? '#94a3b8' : 'text.secondary' }}
          >
            {pdf.author}
          </Typography>
        </CardContent>

        <Stack spacing={isSmall ? 1 : 1.5} sx={{ p: isSmall ? 1.5 : 2, pt: 0 }}>
          <Button 
            fullWidth 
            variant="outlined" 
            startIcon={<VisibilityIcon sx={{ fontSize: isSmall ? '1rem' : 'inherit' }} />} 
            onClick={() => setOpen(true)} 
            sx={{ fontSize: isSmall ? '0.7rem' : '0.8rem', textTransform: 'none' }}
          >
            See More
          </Button>
          <Button 
            fullWidth 
            variant="contained" 
            startIcon={<DownloadIcon sx={{ fontSize: isSmall ? '1rem' : 'inherit' }} />} 
            onClick={() => setConfirmOpen(true)} 
            sx={{ 
              fontSize: isSmall ? '0.7rem' : '0.8rem', 
              textTransform: 'none',  
              color: '#fff', 
              bgcolor: isDarkMode ? '#0284c7' : iconColor 
            }}
          >
            {downloadLabel}
          </Button>
        </Stack>
      </Card>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} PaperProps={{ sx: { borderRadius: 3, p: 2, ...poppinsFont, bgcolor: isDarkMode ? '#0f172a' : '#fff' } }}>
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
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDownload} variant="contained" sx={{ bgcolor: isDarkMode ? '#0284c7' : iconColor }}>Confirm</Button>
        </DialogActions>
      </Dialog>
      
      <Dialog 
        open={open} 
        onClose={() => setOpen(false)} 
        fullWidth 
        maxWidth="sm" 
        PaperProps={{ sx: { borderRadius: 1.5, ...poppinsFont, bgcolor: isDarkMode ? '#0f172a' : '#fff' } }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon sx={{ color: iconColor }} /> Document Info
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: isDarkMode ? '#334155' : 'rgba(0,0,0,0.12)' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'center', sm: 'flex-start' }}>
            {coverUrl && (
              <Box sx={{ 
                width: { xs: '50%', sm: 160 }, 
                flexShrink: 0,
                mb: { xs: 1, sm: 0 } 
              }}>
                <img 
                  src={coverUrl} 
                  alt={pdf.title} 
                  style={{ width: '100%', borderRadius: 8, boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }} 
                />
              </Box>
            )}
            <Stack spacing={1.5} sx={{ flexGrow: 1, width: '100%' }}>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TitleIcon fontSize="small" sx={{ color: iconColor }} /> <strong>Title:</strong> {pdf.title}
              </Typography>
              
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon fontSize="small" sx={{ color: iconColor }} /> <strong>Author:</strong> {pdf.author || 'N/A'}
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
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ 
                  color: isDarkMode ? '#94a3b8' : 'text.secondary',
                  textAlign: 'justify',
                  display: 'block'
                }}
              >
                {pdf.description || "No description provided."}
              </Typography>
              
              <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
                <Button 
                  fullWidth 
                  variant="contained" 
                  startIcon={<BookIcon />} 
                  onClick={handleRead}
                  sx={{ 
                    textTransform: 'none',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }, 
                    color: '#fff',  
                    bgcolor: isDarkMode ? '#059669' : '#2e7d32', 
                    '&:hover': { bgcolor: isDarkMode ? '#10b981' : '#68976b' }
                  }}
                >
                  Read
                </Button>
                <Button 
                  fullWidth 
                  variant="contained" 
                  startIcon={<DownloadIcon />} 
                  onClick={() => setConfirmOpen(true)}
                  sx={{ 
                    textTransform: 'none',
                    color: '#fff',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    bgcolor: '#d32f2f', 
                    '&:hover': { bgcolor: '#b71c1c' }
                  }}
                >
                  Download
                </Button> 
              </Stack>
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