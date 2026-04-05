import React, { useEffect } from 'react';
import { Box, Typography, Button, IconButton, Paper, Stack, Chip, useTheme } from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import BookIcon from '@mui/icons-material/MenuBook';
import DownloadIcon from '@mui/icons-material/Download';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';

const FeaturedBanner = ({ doc, rank, onNext, onPrev }) => {
  const theme = useTheme();

  useEffect(() => {
    const interval = setInterval(() => {
      onNext();
    }, 5000); 
    return () => clearInterval(interval); 
  }, [onNext]);

  if (!doc) return null;
  
  const displayRank = rank || doc.rank || 1;

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const { data } = supabase.storage.from('pdfs').getPublicUrl(url);
    return data.publicUrl;
  };

  const handleRead = () => {
    const { data } = supabase.storage.from('pdfs').getPublicUrl(doc.file_url);
    window.open(data.publicUrl, '_blank');
  };

  const handleDownload = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if the user has already downloaded this specific document
        const { data: existingDownload } = await supabase
          .from('downloads')
          .select('id')
          .eq('user_id', user.id)
          .eq('pdf_id', doc.id)
          .maybeSingle();

        // Only insert if no previous record exists for this user/doc pair
        if (!existingDownload) {
          await supabase.from('downloads').insert([
            { user_id: user.id, pdf_id: doc.id }
          ]);
        }
      }
      
      // Proceed with the file download regardless of whether the count incremented
      const { data } = supabase.storage.from('pdfs').getPublicUrl(doc.file_url);
      const response = await fetch(data.publicUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${doc.title || 'document'}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={doc.id} 
        initial={{ opacity: 0, x: 20 }} 
        animate={{ opacity: 1, x: 0 }} 
        exit={{ opacity: 0, x: -20 }} 
        transition={{ duration: 0.4 }}
      >
        <Paper 
          elevation={6} 
          sx={{ 
            width: '100%', 
            height: { xs: 'auto', md: '400px' }, 
            borderRadius: 3, 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            alignItems: 'center', 
            overflow: 'hidden', 
            position: 'relative', 
            bgcolor: 'background.paper', 
            mb: 4,
            transition: 'background-color 0.3s ease'
          }}
        >
          <IconButton 
            onClick={onPrev} 
            sx={{ 
              position: 'absolute', 
              left: 10, 
              top: { xs: '30%', md: '50%' },
              transform: 'translateY(-50%)',
              zIndex: 2, 
              color: 'text.primary', 
              bgcolor: 'rgba(255,255,255,0.2)', 
              '&:hover': { bgcolor: 'rgba(255,255,255,0.4)' } 
            }}
          >
            <ArrowBackIosIcon fontSize="small" sx={{ ml: 0.5 }} />
          </IconButton>
          
          <Box sx={{ 
            width: { xs: '100%', md: '280px' }, 
            height: { xs: '250px', md: '100%' }, 
            backgroundImage: `url(${getImageUrl(doc.image_url)})`, 
            backgroundSize: 'cover', 
            backgroundPosition: 'center', 
            flexShrink: 0,
            position: 'relative'
          }} />
          
          <Box sx={{ 
            p: { xs: 3, md: 5 }, 
            flexGrow: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 1,
            width: '100%'
          }}>
            
            <Box sx={{ 
              bgcolor: '#E4FF30', 
              color: '#362F4F', 
              px: 2, 
              py: 0.7, 
              borderRadius: '20px', 
              fontWeight: '900', 
              fontSize: { xs: '0.75rem', md: '0.85rem' }, 
              width: 'fit-content', 
              mb: 1,
              boxShadow: '0 4px 10px rgba(225, 29, 72, 0.4)'
            }}>
              #{displayRank} Most Downloaded ({doc.download_count || 0} downloads)
            </Box>
            
            <Typography 
              variant="h3" 
              fontWeight="900" 
              sx={{ 
                color: 'text.primary', 
                fontSize: { xs: '1.5rem', md: '2.5rem' },
                lineHeight: 1.2
              }}
            >
              {doc.title}
            </Typography>
            
            <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
              <Chip label={doc.genre || 'N/A'} color="primary" variant="outlined" size="small" />
              <Chip label={doc.category || 'N/A'} variant="outlined" size="small" sx={{ color: 'text.secondary' }} />
            </Stack>
            
            <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
              By <span style={{ color: theme.palette.primary.main, fontWeight: 700 }}>{doc.author}</span>
            </Typography>
            
            <Typography variant="body1" sx={{ 
              color: 'text.primary', mt: 1, mb: 3, 
              maxHeight: { xs: '60px', md: '80px' }, 
              overflow: 'hidden', 
              display: '-webkit-box', 
              WebkitLineClamp: { xs: 2, md: 3 }, 
              WebkitBoxOrient: 'vertical',
              fontSize: '0.875rem'
            }}>
              {doc.description}
            </Typography>
            
            <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
              <Button 
                variant="contained" 
                onClick={handleRead}  
                sx={{ 
                  bgcolor: '#d32f2f', 
                  color: '#ffffff', 
                  minWidth: { xs: '100px', sm: '120px' },
                  px: { xs: 0, sm: 4 },
                  fontWeight: 800,
                  textTransform: 'none',
                  borderRadius: 1,
                  '&:hover': { bgcolor: '#b71c1c' }
                }}
              >
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>Read Now</Box>
                <BookIcon sx={{ display: { xs: 'block', sm: 'none' } }} />
              </Button>

              <Button 
                variant="contained" 
                onClick={handleDownload}  
                sx={{ 
                  bgcolor: '#1976d2', 
                  color: '#ffffff', 
                  minWidth: { xs: '100px ', sm: '120px' },
                  px: { xs: 0, sm: 4 },
                  fontWeight: 800,
                  textTransform: 'none',
                  borderRadius: 1,
                  '&:hover': { bgcolor: '#1565c0' }
                }}
              >
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>Download Now</Box>
                <DownloadIcon sx={{ display: { xs: 'block', sm: 'none' } }} />
              </Button>
            </Stack>
          </Box>
          
          <IconButton 
            onClick={onNext} 
            sx={{ 
              position: 'absolute', 
              right: 10, 
              top: { xs: '30%', md: '50%' },
              transform: 'translateY(-50%)',
              zIndex: 2, 
              color: 'text.primary', 
              '&:hover': { bgcolor: 'rgba(255,255,255,0.4)' } 
            }}
          >
            <ArrowForwardIosIcon fontSize="large" />
          </IconButton>
        </Paper>
      </motion.div>
    </AnimatePresence>
  );
};

export default FeaturedBanner;