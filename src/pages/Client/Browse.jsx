import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Box, Typography, Stack, IconButton, Button, Container 
} from '@mui/material';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { PdfCard } from '../../shared';
import { fetchPdfs, fetchFeaturedPdfs } from '../../services/pdfService'; 
import FeaturedBanner from '../../components/FeaturedBanner';
// Import your background image here
import clientbackground from '../../assets/clientbackground.png'; 

const MultiRowSection = ({ title, items, onSeeAll }) => {
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const lastPageX = useRef(0);
  const velocity = useRef(0);
  const momentumId = useRef(null);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
    
    velocity.current = 0;
    lastPageX.current = e.pageX;
    cancelAnimationFrame(momentumId.current);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      
      const x = e.pageX - scrollRef.current.offsetLeft;
      
      velocity.current = e.pageX - lastPageX.current;
      lastPageX.current = e.pageX;

      const walk = (x - startX) * 0.8; 
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = scrollLeft - walk;
      }
    };

    const handleMouseUp = () => {
      if (!isDragging) return;
      setIsDragging(false);

      const glide = () => {
        if (Math.abs(velocity.current) > 0.5) {
          if (scrollRef.current) {
            scrollRef.current.scrollLeft -= velocity.current * 1.2;
          }
          velocity.current *= 0.85; 
          momentumId.current = requestAnimationFrame(glide);
        }
      };
      momentumId.current = requestAnimationFrame(glide);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(momentumId.current);
    };
  }, [isDragging, startX, scrollLeft]);

  const scroll = (direction) => {
    const { current } = scrollRef;
    const scrollAmount = 400; 
    current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
  };

  if (items.length === 0) return null; 

  return (
    <Box sx={{ mb: 6, position: 'relative', zIndex: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, borderLeft: '5px solid #1976d2', pl: 1.5, textTransform: 'uppercase' }}>
          {title}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton onClick={() => scroll('left')} size="small" sx={{ bgcolor: 'background.paper', boxShadow: 1 }}>
            <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
          </IconButton>
          <IconButton onClick={() => scroll('right')} size="small" sx={{ bgcolor: 'background.paper', boxShadow: 1 }}>
            <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
          </IconButton>
          <Button onClick={onSeeAll} size="small" sx={{ fontWeight: 700, textTransform: 'none', ml: 1 }}>See All</Button>
        </Stack>
      </Stack>

      <Box 
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        sx={{ 
          display: 'flex', 
          overflowX: 'auto', 
          whiteSpace: 'nowrap', 
          scrollBehavior: isDragging ? 'auto' : 'smooth', 
          pb: 2,
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none', 
          msOverflowStyle: 'none', 
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          '& img': { pointerEvents: 'none' }
        }}
      >
        {items.map((doc) => (
          <Box key={doc.id} sx={{ pr: 2, display: 'inline-block' }}> 
            <PdfCard pdf={doc} />
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const Browse = () => {
  const [documents, setDocuments] = useState([]);
  const [spotlightDocs, setSpotlightDocs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [activeView, setActiveView] = useState('browse'); 
  const [expandedTitle, setExpandedTitle] = useState('');

  useEffect(() => {
    fetchPdfs().then(data => setDocuments(data || []));
    fetchFeaturedPdfs().then(data => setSpotlightDocs(data || []));
  }, []);

  // Search and filtering now live in the topbar's Search panel (TopbarSearch),
  // so Browse.jsx just renders the library grouped by category/section.

  // One row per distinct `section` value actually present in the data, added
  // alongside (not replacing) the existing Library/Books/Academic rows.
  const dynamicSectionNames = useMemo(() => {
    const values = documents.map((doc) => doc.section).filter(Boolean);
    return Array.from(new Set(values)).sort();
  }, [documents]);

  const sections = useMemo(() => ([
    { title: "Library", items: documents },
    { title: "Books", items: documents.filter(d => d.category?.toLowerCase() === 'book') },
    { title: "Academic", items: documents.filter(d => d.category?.toLowerCase() === 'academic paper') },
    ...dynamicSectionNames.map((name) => ({
      title: name,
      items: documents.filter((d) => d.section === name),
    })),
  ]), [documents, dynamicSectionNames]);

  const handleSeeAll = (title) => {
    setExpandedTitle(title);
    setActiveView('expanded');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, pt: 12, bgcolor: 'background.default', minHeight: '100vh', position: 'relative' }}>
      
      {/* BACKGROUND IMAGE - FITTED TO TOP SECTION ONLY */}
      {activeView === 'browse' && (
        <Box 
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '800px', // Fitted height hanggang filter area
            backgroundImage: `url(${clientbackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0,
            opacity: 0.4, // Adjust transparency as needed
            pointerEvents: 'none',
            // Fade out effect para hindi biglang putol sa filter area
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)',
          }}
        />
      )}

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
        
        {activeView === 'browse' ? (
          <>
            <Box sx={{ mb: 6 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, textTransform: 'uppercase', borderLeft: '5px solid #1976d2', pl: 1.5 }}>
                Spotlight
              </Typography>
              {spotlightDocs.length > 0 && (
                <FeaturedBanner 
                  doc={spotlightDocs[currentIndex]} 
                  rank={currentIndex + 1} 
                  onNext={() => setCurrentIndex((prev) => (prev + 1) % spotlightDocs.length)} 
                  onPrev={() => setCurrentIndex((prev) => (prev - 1 + spotlightDocs.length) % spotlightDocs.length)} 
                />
              )}
            </Box>

            {sections.map(section => (
              <MultiRowSection 
                key={section.title}
                title={section.title} 
                items={section.items} 
                onSeeAll={() => handleSeeAll(section.title)} 
              />
            ))}
          </>
        ) : (
          <Box>
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={() => setActiveView('browse')}
            sx={{ mb: 3, fontWeight: 700, textTransform: 'none', color: '#1976d2' }}
          >
            Back to Browse
          </Button>
          
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 4, textTransform: 'uppercase', borderLeft: '8px solid #1976d2', pl: 2 }}>
            {expandedTitle}
          </Typography>

          <Box 
            sx={{ 
              display: 'grid',
              gridTemplateColumns: { 
                xs: 'repeat(auto-fill, minmax(155px, 1fr))', 
                sm: 'repeat(auto-fill, minmax(175px, 1fr))' 
              },
              gap: 1.5, 
              justifyContent: 'start',
              width: '100%',
              maxWidth: '1400px' 
            }}
          >
            {sections.find(s => s.title === expandedTitle)?.items.map((doc) => (
              <Box 
                key={doc.id} 
                sx={{ 
                  display: 'flex',
                  justifyContent: 'flex-start',
                  width: '100%'
                }}
              >
                <PdfCard pdf={doc} variant="small" />
              </Box>
            ))}
          </Box>
        </Box>
        )}

        {documents.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography color="text.secondary">No documents found in the library yet.</Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default Browse;