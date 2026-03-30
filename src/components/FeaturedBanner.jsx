import React, { useEffect } from 'react';
import { Box, Typography, Button, IconButton, Paper, Stack, Chip, useTheme } from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import StarIcon from '@mui/icons-material/Star';
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
  
  // FIX: Safety check for rank. 
  // If 'rank' prop is undefined, it defaults to 1.
  const displayRank = rank || doc.rank || 1;

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const { data } = supabase.storage.from('pdfs').getPublicUrl(url);
    return data.publicUrl;
  };

  const handleDownload = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('downloads').insert([{ user_id: user.id, pdf_id: doc.id }]);
      }
      
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
            height: '400px', 
            borderRadius: 3, 
            display: 'flex', 
            alignItems: 'center', 
            overflow: 'hidden', 
            position: 'relative', 
            bgcolor: 'background.paper', 
            mb: 4,
            transition: 'background-color 0.3s ease'
          }}
        >
          {/* Nav Prev */}
          <IconButton onClick={onPrev} sx={{ position: 'absolute', left: 10, zIndex: 2, color: 'text.primary', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
            <ArrowBackIosIcon fontSize="small" />
          </IconButton>
          
          {/* Cover Image */}
          <Box sx={{ 
            width: '280px', 
            height: '100%', 
            backgroundImage: `url(${getImageUrl(doc.image_url)})`, 
            backgroundSize: 'cover', 
            backgroundPosition: 'center', 
            flexShrink: 0,
            position: 'relative'
          }}>
          </Box>
          
          {/* Content Area */}
          <Box sx={{ p: { xs: 3, md: 5 }, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            
            {/* RANK BADGE (The Fix is applied here using displayRank) */}
            <Box sx={{ 
              bgcolor: '#E4FF30', 
              color: '#362F4F', 
              px: 2, 
              py: 0.7, 
              borderRadius: '20px', 
              fontWeight: '900', 
              fontSize: '0.85rem', 
              width: 'fit-content', 
              mb: 1,
              boxShadow: '0 4px 10px rgba(225, 29, 72, 0.4)'
            }}>
              #{displayRank} Most Downloaded ({doc.download_count || 0} downloads)
            </Box>
            
            <Typography variant="h3" fontWeight="900" sx={{ color: 'text.primary', fontSize: { xs: '1.8rem', md: '2.8rem' } }}>
              {doc.title}
            </Typography>
            
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Chip label={doc.genre || 'N/A'} color="primary" variant="outlined" size="small" />
              <Chip label={doc.category || 'N/A'} variant="outlined" size="small" sx={{ color: 'text.secondary' }} />
            </Stack>
            
            <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
              By <span style={{ color: theme.palette.primary.main, fontWeight: 700 }}>{doc.author}</span>
            </Typography>
            
            <Typography variant="body1" sx={{ 
              color: 'text.primary', mt: 1, mb: 3, 
              maxHeight: '80px', overflow: 'hidden', 
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical'
            }}>
              {doc.description}
            </Typography>
            
            <Button 
              variant="contained" 
              size="large" 
              onClick={handleDownload}  
              sx={{ 
                bgcolor: 'primary.main', 
                color: 'primary.contrastText', 
                width: 'fit-content', 
                px: 5,
                fontWeight: 800,
                borderRadius: 2,
                '&:hover': { bgcolor: 'primary.dark', transform: 'translateY(-2px)' },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              Download Now
            </Button>
          </Box>
          
          {/* Nav Next */}
          <IconButton onClick={onNext} sx={{ position: 'absolute', right: 10, zIndex: 2, color: 'text.primary', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        </Paper>
      </motion.div>
    </AnimatePresence>
  );
};

export default FeaturedBanner;