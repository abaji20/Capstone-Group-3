import React, { useEffect } from 'react';
import { Box, Typography, Button, IconButton, Paper, Stack, useTheme } from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import logo from '../assets/logo.png'; 

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
            backgroundImage: imageUrl 
              ? `linear-gradient(to right, rgba(0,0,0,0.95) 10%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.2) 100%), url(${imageUrl})`
              : `linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)`, 
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
            p: { xs: 2.5, md: 8 }, 
            width: { xs: '100%', md: '65%' },
            zIndex: 2,
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            justifyContent: 'center'
          }}>
            
            <Box sx={{ 
              bgcolor: '#2ecc71', 
              color: '#fff', 
              px: 1.5, py: 0.5, 
              borderRadius: '4px', 
              fontWeight: '900', 
              fontSize: '0.65rem', 
              width: 'fit-content', 
              mb: 1.5,
              textTransform: 'uppercase',
              letterSpacing: 1
            }}>
              #{displayRank} Spotlight ({doc.download_count || 0} Downloads)
            </Box>
            
            <Typography 
              variant="h2" 
              fontWeight="900" 
              sx={{ 
                fontSize: { xs: '1.5rem', md: '3.5rem' },
                lineHeight: 1.1,
                mb: 0.5,
                textShadow: '0 2px 10px rgba(0,0,0,0.8)'
              }}
            >
              {doc.title}
            </Typography>
            
            {/* Metadata Section: Author, Genre, and Category */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="subtitle1" sx={{ opacity: 0.9, fontWeight: 700, fontSize: { xs: '0.8rem', md: '1rem' } }}>
                By <span style={{ color: '#2ecc71' }}>{doc.author}</span>
              </Typography>
              <Typography sx={{ opacity: 0.5 }}>|</Typography>
              
              {/* CATEGORY ADDED HERE */}
              <Typography sx={{ 
                fontSize: { xs: '0.75rem', md: '0.9rem' }, 
                fontWeight: 600, 
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: 0.5
              }}>
                {doc.category || 'Document'}
              </Typography>

              <Typography sx={{ opacity: 0.3 }}>•</Typography>

              <Typography sx={{ 
                fontSize: { xs: '0.75rem', md: '0.9rem' }, 
                fontWeight: 600, 
                color: '#2ecc71',
                textTransform: 'capitalize' 
              }}>
                {doc.genre || 'General'}
              </Typography>
            </Stack>
            
            <Box sx={{ 
              mb: 3, 
              maxWidth: '500px',
              maxHeight: { xs: '80px', md: '120px' },
              overflowY: 'auto',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }}>
              <Typography variant="body1" sx={{ 
                fontSize: { xs: '0.85rem', md: '1rem' },
                lineHeight: 1.6,
                opacity: 0.85,
                textAlign: 'justify'
              }}>
                {doc.description}
              </Typography>
            </Box>
            
            <Stack direction="row" spacing={2}>
              <Button 
                variant="contained" 
                onClick={handleRead}  
                sx={{ 
                  bgcolor: '#2ecc71', 
                  color: '#fff', 
                  px: { xs: 3, md: 5 }, 
                  py: { xs: 0.8, md: 1.2 },
                  fontWeight: 900,
                  textTransform: 'none',
                  borderRadius: '6px',
                  fontSize: { xs: '0.8rem', md: '0.9rem' },
                  '&:hover': { bgcolor: '#27ae60' }
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
            background: imageUrl 
              ? `url(${imageUrl}) center/cover` 
              : `linear-gradient(145deg, #2c2c2c, #1a1a1a)`, 
            border: '2px solid rgba(255,255,255,0.2)',
            transform: 'perspective(1000px) rotateY(-5deg)',
            zIndex: 3,
            overflow: 'hidden'
          }}>
            {!imageUrl && (
              <Box 
                component="img"
                src={logo}
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