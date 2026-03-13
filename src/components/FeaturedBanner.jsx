import React, { useEffect } from 'react';
import { Box, Typography, Button, IconButton, Paper, Stack, Chip } from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';

const FeaturedBanner = ({ doc, rank, onNext, onPrev }) => {
  if (!doc) return null;
  const STORAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/pdfs`;

  // Auto-slide effect (10 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      onNext();
    }, 5000);
    return () => clearInterval(timer);
  }, [onNext]);

  const handleDownload = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('downloads').upsert([{ user_id: user.id, pdf_id: doc.id }], { onConflict: 'user_id,pdf_id' });
        await supabase.from('audit_logs').insert([{ user_id: user.id, pdf_id: doc.id, action_type: 'Download', description: `Downloaded: "${doc.title}"` }]);
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
      const { data } = supabase.storage.from('pdfs').getPublicUrl(doc.file_url);
      window.open(data.publicUrl, '_blank');
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={doc.id}
        initial={{ opacity: 0, x: 20 }} 
        animate={{ opacity: 1, x: 0 }} 
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
      >
        <Paper elevation={6} sx={{ width: '100%', height: '400px', borderRadius: 4, display: 'flex', alignItems: 'center', overflow: 'hidden', position: 'relative', bgcolor: '#FFFCFB', mb: 4 }}>
          <Box sx={{ position: 'absolute', top: 20, left: 300, zIndex: 3, bgcolor: '#e11d48', color: 'white', px: 3, py: 0.5, borderRadius: '20px', fontWeight: 'bold' }}>
            #{rank} Most Downloaded
          </Box>
          <IconButton onClick={onPrev} sx={{ position: 'absolute', left: 15, zIndex: 2 }}><ArrowBackIosIcon /></IconButton>
          
          <Box sx={{ 
            width: '280px', height: '100%', 
            // Safe image URL handling:
            backgroundImage: `url(${doc.image_url?.startsWith('http') ? doc.image_url : `${STORAGE_URL}/${doc.image_url || ''}`})`, 
            backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 
          }} />
          
          <Box sx={{ p: 5, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h3" fontWeight="900" sx={{ color: '#0f172a' }}>{doc.title}</Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Chip label={doc.genre} color="primary" variant="outlined" />
              <Chip label={doc.category} variant="outlined" />
            </Stack>
            <Typography variant="subtitle1" sx={{ color: '#475569' }}><strong>Author:</strong> {doc.author} | <strong>Released:</strong> {doc.published_date}</Typography>
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