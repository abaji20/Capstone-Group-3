import React, { useEffect } from 'react';
import { Box, Typography, Button, IconButton, Paper, Stack, Chip } from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';

const FeaturedBanner = ({ doc, rank, onNext, onPrev }) => {
  // --- AUTO-SLIDE LOGIC ---
  useEffect(() => {
    const interval = setInterval(() => {
      onNext();
    }, 5000); // 5000ms = 5 seconds

    return () => clearInterval(interval); // Cleanup on unmount
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
        <Paper elevation={6} sx={{ width: '100%', height: '400px', borderRadius: 4, display: 'flex', alignItems: 'center', overflow: 'hidden', position: 'relative', bgcolor: '#FFFCFB', mb: 4 }}>
          
          <IconButton onClick={onPrev} sx={{ position: 'absolute', left: 15, zIndex: 2 }}><ArrowBackIosIcon /></IconButton>
          
          <Box sx={{ width: '280px', height: '100%', backgroundImage: `url(${getImageUrl(doc.image_url)})`, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />
          
          <Box sx={{ p: 5, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ bgcolor: '#e11d48', color: 'white', px: 2, py: 0.5, borderRadius: '20px', fontWeight: 'bold', fontSize: '0.8rem', width: 'fit-content', mb: 1 }}>
              #{rank} Most Downloaded ({doc.download_count || 0} downloads)
            </Box>
            
            <Typography variant="h3" fontWeight="900" sx={{ color: '#0f172a' }}>{doc.title}</Typography>
            
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Chip label={doc.genre || 'N/A'} color="primary" variant="outlined" />
              <Chip label={doc.category || 'N/A'} variant="outlined" />
            </Stack>
            
            <Typography variant="subtitle1" sx={{ color: '#475569' }}><strong>Author:</strong> {doc.author}</Typography>
            <Typography variant="body1" sx={{ mt: 1, mb: 3, maxHeight: '100px', overflow: 'hidden' }}>{doc.description}</Typography>
            
            <Button variant="contained" size="large" onClick={handleDownload} sx={{ bgcolor: '#1e3a8a', width: 'fit-content', px: 4 }}>Download Now</Button>
          </Box>
          
          <IconButton onClick={onNext} sx={{ position: 'absolute', right: 15, zIndex: 2 }}><ArrowForwardIosIcon /></IconButton>
        </Paper>
      </motion.div>
    </AnimatePresence>
  );
};
export default FeaturedBanner;