import React, { useEffect } from 'react';
import { Box, Typography, Button, IconButton, Paper, Stack, Chip, useTheme } from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';

const FeaturedBanner = ({ doc, rank, onNext, onPrev }) => {
  const theme = useTheme(); // Access the theme to detect light/dark mode

  // --- AUTO-SLIDE LOGIC (Unchanged) ---
  useEffect(() => {
    const interval = setInterval(() => {
      onNext();
    }, 5000); 

    return () => clearInterval(interval); 
  }, [onNext]);
  // -------------------------

  if (!doc) return null;
  
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
            borderRadius: 2.5, 
            display: 'flex', 
            alignItems: 'center', 
            overflow: 'hidden', 
            position: 'relative', 
            // DYNAMIC BACKGROUND: Paper color from App.jsx theme
            bgcolor: 'background.paper', 
            mb: 4,
            transition: 'background-color 0.3s ease'
          }}
        >
          
          <IconButton onClick={onPrev} sx={{ position: 'absolute', left: 15, zIndex: 2, color: 'text.primary' }}>
            <ArrowBackIosIcon />
          </IconButton>
          
          <Box sx={{ width: '280px', height: '100%', backgroundImage: `url(${getImageUrl(doc.image_url)})`, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />
          
          <Box sx={{ p: 5, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ bgcolor: '#e11d48', color: 'white', px: 2, py: 0.5, borderRadius: '20px', fontWeight: 'bold', fontSize: '0.8rem', width: 'fit-content', mb: 1 }}>
              #{rank} Most Downloaded ({doc.download_count || 0} downloads)
            </Box>
            
            {/* DYNAMIC TEXT COLOR */}
            <Typography variant="h3" fontWeight="900" sx={{ color: 'text.primary' }}>
              {doc.title}
            </Typography>
            
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Chip label={doc.genre || 'N/A'} color="primary" variant="outlined" />
              <Chip label={doc.category || 'N/A'} variant="outlined" sx={{ color: 'text.secondary', borderColor: 'divider' }} />
            </Stack>
            
            <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
              <strong>Author:</strong> {doc.author}
            </Typography>
            
            <Typography variant="body1" sx={{ color: 'text.primary', mt: 1, mb: 3, maxHeight: '100px', overflow: 'hidden' }}>
              {doc.description}
            </Typography>
            
            <Button 
            variant="contained" 
            size="large" 
            onClick={handleDownload}  
            sx={{ 
              // Uses the primary main color from your App.jsx theme
              bgcolor: 'primary.main', 
              
              // 'primary.contrastText' ensures text is white on dark blue 
              // and dark on light colors automatically
              color: 'primary.contrastText', 
              
              width: 'fit-content', 
              px: 4,
              fontWeight: 700,
              borderRadius: 2, // Matches the rounded look of your banner
              
              // Add a hover state so the button feels interactive
              '&:hover': {
                bgcolor: 'primary.dark',
                transform: 'translateY(-2px)',
                boxShadow: theme.palette.mode === 'dark' 
                  ? '0 4px 20px rgba(0,0,0,0.5)' 
                  : '0 4px 15px rgba(30, 58, 138, 0.3)',
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            Download Now
          </Button>
          </Box>
          
          <IconButton onClick={onNext} sx={{ position: 'absolute', right: 15, zIndex: 2, color: 'text.primary' }}>
            <ArrowForwardIosIcon />
          </IconButton>
        </Paper>
      </motion.div>
    </AnimatePresence>
  );
};

export default FeaturedBanner;