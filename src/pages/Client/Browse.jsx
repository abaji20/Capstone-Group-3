import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Grid, Box, Typography, TextField, MenuItem, Stack, IconButton, Button, Container 
} from '@mui/material';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import FilterListIcon from '@mui/icons-material/FilterList'; 
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { PdfCard } from '../../shared';
import { fetchPdfs, fetchFeaturedPdfs } from '../../services/pdfService'; 
import FeaturedBanner from '../../components/FeaturedBanner';

const MultiRowSection = ({ title, items, onSeeAll }) => {
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Physics refs
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
      
      // Track velocity for momentum
      velocity.current = e.pageX - lastPageX.current;
      lastPageX.current = e.pageX;

      // SPEED MULTIPLIER: Lowered to 0.8 for "heavy" controlled movement
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
          // FRICTION: Lowered to 0.85 so it stops much faster
          velocity.current += 0.5 ; 
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
    <Box sx={{ mb: 6 }}>
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  
  const [activeView, setActiveView] = useState('browse'); 
  const [expandedTitle, setExpandedTitle] = useState('');

  useEffect(() => {
    fetchPdfs().then(data => setDocuments(data || []));
    fetchFeaturedPdfs().then(data => setSpotlightDocs(data || []));
  }, []);

  const genres = useMemo(() => {
    const commonGenres = [
      'All', 'Romance', 'Action', 'Drama', 'Science Fiction', 
      'Research Paper', 'Review Article', 'Case Study', 
      'Thesis', 'Biography', 'Textbook'
    ];
    const dbGenres = documents.map(doc => doc.genre).filter(Boolean);
    return [...new Set([...commonGenres, ...dbGenres])];
  }, [documents]);

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            doc.author?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGenre = selectedGenre === 'All' || doc.genre === selectedGenre;
      return matchesSearch && matchesGenre;
    });
  }, [documents, searchQuery, selectedGenre]);

  const sections = [
    { title: "Library", items: filteredDocs },
    { title: "Books", items: filteredDocs.filter(d => d.category?.toLowerCase() === 'book') },
    { title: "Academic", items: filteredDocs.filter(d => d.category?.toLowerCase() === 'academic paper') }
  ];

  const handleSeeAll = (title) => {
    setExpandedTitle(title);
    setActiveView('expanded');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, pt: 12, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="xl">
        
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

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 6 } }>
              <TextField 
                fullWidth size="medium" placeholder="Search titles or authors..." value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                sx={{ bgcolor: 'background.paper', borderRadius: 1 }} 
              />
              <TextField
                select size="medium" label="Genre" value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                sx={{ minWidth: { xs: '100%', sm: 200 }, bgcolor: 'background.paper', borderRadius: 1 }}
                InputProps={{ startAdornment: <FilterListIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} /> }}
              >
                {genres.map((option) => (<MenuItem key={option} value={option}>{option}</MenuItem>))}
              </TextField>
            </Stack>

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

            <Grid container spacing={3}>
              {sections.find(s => s.title === expandedTitle)?.items.map((doc) => (
                <Grid item xs={6} sm={4} md={3} lg={2.4} key={doc.id}>
                  <PdfCard pdf={doc} />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {filteredDocs.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography color="text.secondary">No documents found matching your filters.</Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default Browse;