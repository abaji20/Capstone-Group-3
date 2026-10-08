import React, { useEffect } from 'react';
import { Box, Typography, Button, IconButton, Paper, Stack, useTheme } from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import logo from '../assets/logo.png'; 
import nonamelogo from '../assets/glclogo.png';
// Import your background asset
import clientbackground from '../assets/clientbackground.png'; 

const FeaturedBanner = ({ doc, rank, onNext, onPrev }) => {
  const theme = useTheme();

  useEffect(() => {
    const interval = setInterval(() => {
      onNext();
    }, 5000); 
    return () => clearInterval(interval); 
  }, [onNext]);

  // If there is no document, or if the document is archived, render nothing.
  if (!doc || doc.is_archived) return null;
  
  const displayRank = rank || doc.rank || 1;

  // Smaller font as the title gets longer, so the full title always fits
  const getTitleFontSize = (title = '') => {
    const len = title.length;
    if (len <= 40) {
      return { xs: '1.4rem', sm: '1.8rem', md: '2.25rem', lg: '2.75rem', xl: '3rem' };
    }
    if (len <= 80) {
      return { xs: '1.15rem', sm: '1.4rem', md: '1.75rem', lg: '2.1rem', xl: '2.3rem' };
    }
    if (len <= 130) {
      return { xs: '1rem', sm: '1.2rem', md: '1.45rem', lg: '1.75rem', xl: '1.9rem' };
    }
    return { xs: '0.9rem', sm: '1.05rem', md: '1.25rem', lg: '1.5rem', xl: '1.6rem' };
  };

  const getImageUrl = (url) => {
    if (!url) return null;
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
        const { data: existingDownload } = await supabase
          .from('downloads')
          .select('id')
          .eq('user_id', user.id)
          .eq('pdf_id', doc.id)
          .maybeSingle();

        if (!existingDownload) {
          await supabase.from('downloads').insert([
            { user_id: user.id, pdf_id: doc.id }
          ]);
        }
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

  const imageUrl = getImageUrl(doc.image_url);

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={doc.id} 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        transition={{ duration: 0.5 }}
      >
        <Paper 
          elevation={0} 
          sx={{ 
            width: '100%', 
            height: { xs: '320px', md: '450px' }, 
            borderRadius: { xs: 2, md: 4 }, 
            overflow: 'hidden', 
            position: 'relative', 
            mb: 4,
            bgcolor: '#121212',
            // LOGIC FOR MAIN BANNER BACKGROUND
            backgroundImage: imageUrl 
              ? `linear-gradient(to right, rgba(0,0,0,0.95) 10%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.2) 100%), url(${imageUrl})`
              : `linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), url(${clientbackground})`, 
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            display: 'flex',
            alignItems: 'center',
            transform: 'translateZ(0)',
          }}
        >
          {/* Navigation Controls */}
          <IconButton onClick={onPrev} sx={{ position: 'absolute', left: 10, zIndex: 10, color: '#fff', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
            <ArrowBackIosIcon fontSize="small" sx={{ ml: 0.5 }} />
          </IconButton>
          
          <IconButton onClick={onNext} sx={{ position: 'absolute', right: 10, zIndex: 10, color: '#fff', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>

          {/* Content Overlay */}
          <Box sx={{ 
            p: { xs: 2.5, sm: 4, md: 6, lg: 8 }, 
            pr: { lg: 2 },
            width: { xs: '100%', md: '70%', lg: '58%' },
            zIndex: 2,
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            justifyContent: 'center',
            minWidth: 0,
            boxSizing: 'border-box',
          }}>

            <Box sx={{ 
              bgcolor: '#1976d2', 
              color: '#fff', 
              px: 2, py: 1, 
              borderRadius: '4px', 
              fontWeight: '600', 
              fontSize: '0.65rem', 
              width: 'fit-content', 
              flexShrink: 0,
              mb: 1.5,
              textTransform: 'uppercase',
              letterSpacing: 1
            }}>
              #{displayRank} Spotlight
            </Box>

            {/* TITLE - font size shrinks based on title length, never cut off */}
            <Typography 
              variant="h2" 
              title={doc.title}
              fontWeight="900" 
              sx={{ 
                fontSize: getTitleFontSize(doc.title),
                lineHeight: 1.15,
                mb: 1,
                textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                wordBreak: 'break-word',
                flexShrink: 0,
              }}
            >
              {doc.title}
            </Typography>

            {/* Metadata: Author, Category, Genre */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5, flexWrap: 'wrap', rowGap: 0.5, flexShrink: 0 }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  opacity: 0.9, 
                  fontWeight: 700, 
                  fontSize: { xs: '0.75rem', md: '0.9rem' },
                  maxWidth: { xs: '100%', md: '280px' },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                By <span style={{ color: '#1976d2' }}>{doc.author}</span>
              </Typography>
              <Typography sx={{ opacity: 0.5 }}>|</Typography>

              <Typography sx={{ 
                fontSize: { xs: '0.7rem', md: '0.85rem' }, 
                fontWeight: 600, 
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: 0.5
              }}>
                {doc.category || 'Document'}
              </Typography>

              <Typography sx={{ opacity: 0.3 }}>•</Typography>

              <Typography sx={{ 
                fontSize: { xs: '0.7rem', md: '0.85rem' }, 
                fontWeight: 600, 
                color: '#1976d2',
                textTransform: 'capitalize' 
              }}>
                {doc.genre || 'General'}
              </Typography>
            </Stack>

            {/* Description - max 3 lines (2 on mobile) */}
            <Typography 
              variant="body1" 
              sx={{ 
                fontSize: { xs: '0.8rem', md: '0.9rem', lg: '0.95rem' },
                lineHeight: 1.6,
                opacity: 0.85,
                textAlign: 'justify',
                maxWidth: '500px',
                mb: { xs: 2, md: 3 },
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: { xs: 2, md: 3 },
                overflow: 'hidden',
                wordBreak: 'break-word',
                flexShrink: 0,
              }}
            >
              {doc.description}
            </Typography>

            <Stack direction="row" spacing={2} sx={{ flexShrink: 0 }}>
              <Button 
                variant="contained" 
                onClick={handleRead}  
                sx={{ 
                  bgcolor: '#1976d2', 
                  color: '#fff', 
                  px: { xs: 3, md: 5 }, 
                  py: { xs: 0.8, md: 1.2 },
                  fontWeight: 900,
                  textTransform: 'none',
                  borderRadius: '6px',
                  fontSize: { xs: '0.8rem', md: '0.9rem' },
                  whiteSpace: 'nowrap',
                  '&:hover': { bgcolor: '#110835' }
                }}
              >
                Read Now
              </Button>

              <Button 
                variant="outlined" 
                onClick={handleDownload}  
                sx={{ 
                  borderColor: 'rgba(255,255,255,0.4)', 
                  color: '#fff', 
                  px: { xs: 2.5, md: 5 }, 
                  py: { xs: 0.8, md: 1.2 },
                  fontWeight: 900,
                  textTransform: 'none',
                  borderRadius: '6px',
                  fontSize: { xs: '0.8rem', md: '0.9rem' },
                  whiteSpace: 'nowrap',
                  bgcolor: 'rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(4px)',
                  '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                Download Now
              </Button>
            </Stack>
          </Box>

          {/* Floating High-Res Preview Card */}
          <Box sx={{ 
            display: { xs: 'none', lg: 'flex' },
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            right: '8%',
            width: '240px',
            height: '340px',
            borderRadius: 4,
            boxShadow: '0 30px 60px rgba(0,0,0,0.7)',
            // LOGIC FOR FLOATING CARD BACKGROUND
            backgroundImage: imageUrl 
              ? `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url(${imageUrl})` 
              : `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url(${clientbackground})`, 
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: '2px solid rgba(255,255,255,0.2)',
            transform: 'perspective(1000px) rotateY(-5deg)',
            zIndex: 3,
            overflow: 'hidden'
          }}>
            {!imageUrl && (
              <Box 
                component="img"
                src={nonamelogo}
                alt="Logo"
                sx={{ 
                  width: '70%', 
                  height: 'auto',
                  filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.4))'
                }}
              />
            )}
          </Box>
        </Paper>
      </motion.div>
    </AnimatePresence>
  );
};

export default FeaturedBanner;