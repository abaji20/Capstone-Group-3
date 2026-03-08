// src/components/PdfCard.jsx
import React, { useState } from 'react';
import { Card, CardMedia, CardContent, Typography, Button, Box, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Divider } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'; 
import PersonIcon from '@mui/icons-material/Person';
import DateRangeIcon from '@mui/icons-material/DateRange';
import CategoryIcon from '@mui/icons-material/Category';
import InfoIcon from '@mui/icons-material/Info';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import { supabase } from '../supabaseClient';

// Font Awesome components
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloudArrowDown, faFilePdf } from '@fortawesome/free-solid-svg-icons';

const PdfCard = ({ pdf, downloadLabel = "Download" }) => {
  if (!pdf) return null;

  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  
  const coverUrl = pdf.image_url ? supabase.storage.from('pdfs').getPublicUrl(pdf.image_url).data.publicUrl : null;
  const iconColor = '#d32f2f'; // Red theme

  const handleDownload = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // 1. STATS: Update the 'downloads' table for counting purposes
        const { data: existing } = await supabase
          .from('downloads')
          .select('id')
          .eq('user_id', user.id)
          .eq('pdf_id', pdf.id)
          .maybeSingle();

        if (!existing) {
          await supabase.from('downloads').insert([{ user_id: user.id, pdf_id: pdf.id }]);
        }

        // 2. AUDIT LOG: Insert into 'audit_logs' so it shows in AdminLogs.jsx
        await supabase.from('audit_logs').insert([{
          user_id: user.id,
          pdf_id: pdf.id,
          action_type: 'Download',
          description: `Downloaded file: "${pdf.title}"`
        }]);
      }

      // 3. FILE RETRIEVAL & DOWNLOAD LOGIC
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
      // Fallback if blob download fails
      const { data } = supabase.storage.from('pdfs').getPublicUrl(pdf.file_url);
      window.open(data.publicUrl, '_blank');
    } finally {
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3, maxWidth: 250, minWidth: 250}}>
        {coverUrl ? (
          <CardMedia component="img" height="300" image={coverUrl} alt={pdf.title} sx={{ objectFit: 'cover' }} />
        ) : (
          <Box sx={{ height: 300, bgcolor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PictureAsPdfIcon sx={{ fontSize: 100, color: iconColor }} /> 
          </Box>
        )}
        
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="h6" noWrap>{pdf.title}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>{pdf.author}</Typography>
        </CardContent>

        <Stack spacing={1} sx={{ p: 2}}>
          <Button 
            fullWidth 
            variant="outlined" 
            startIcon={<VisibilityIcon />} 
            onClick={() => setOpen(true)}
            sx={{ fontSize: '0.75rem', borderColor: iconColor, color: iconColor }}
          >
            See More
          </Button>
          <Button 
            fullWidth 
            variant="contained" 
            startIcon={<DownloadIcon />} 
            onClick={() => setConfirmOpen(true)}
            sx={{ fontSize: '0.75rem', bgcolor: iconColor, '&:hover': { bgcolor: '#b71c1c' } }}
          >
            {downloadLabel}
          </Button>
        </Stack>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} PaperProps={{ sx: { borderRadius: 3, p: 2.5 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FontAwesomeIcon icon={faCloudArrowDown} style={{ color: iconColor }} />
          Confirm {downloadLabel}
        </DialogTitle>
        <DialogContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <FontAwesomeIcon icon={faFilePdf} style={{ color: iconColor, fontSize: '40px' }} />
            <Typography>
              You are about to: <strong>{downloadLabel} "{pdf.title}"</strong>
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDownload} variant="contained" sx={{ bgcolor: iconColor }}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Details Modal */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon sx={{ color: iconColor }} /> {pdf.title}
        </DialogTitle>
        <DialogContent dividers>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {coverUrl && (
              <Box sx={{ width: { xs: '100%', sm: 150 }, flexShrink: 0 }}>
                <img src={coverUrl} alt={pdf.title} style={{ width: '100%', borderRadius: 8 }} />
              </Box>
            )}
            <Stack spacing={1.5}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon sx={{ color: iconColor }} /> <strong>Author:</strong> {pdf.author}
              </Typography>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DateRangeIcon sx={{ color: iconColor }} /> <strong>Published:</strong> {pdf.published_date}
              </Typography>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CategoryIcon sx={{ color: iconColor }} /> <strong>Genre:</strong> {pdf.genre}
              </Typography>
            </Stack>
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Description</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {pdf.description || "No description provided."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PdfCard;