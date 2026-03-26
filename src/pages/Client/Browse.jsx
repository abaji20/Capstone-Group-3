import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Grid, Box, Typography, TextField, MenuItem, Stack, useTheme, IconButton, Button, Container 
} from '@mui/material';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import FilterListIcon from '@mui/icons-material/FilterList'; 
import { PdfCard } from '../../shared';
import { fetchPdfs, fetchFeaturedPdfs } from '../../services/pdfService'; 
import FeaturedBanner from '../../components/FeaturedBanner';
import { useNavigate } from 'react-router-dom';

const MultiRowSection = ({ title, items, onSeeAll }) => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    const { current } = scrollRef;
    const scrollAmount = 300; 
    if (direction === 'left') {
      current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
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
        sx={{ 
          display: 'flex', gap: 2, overflowX: 'auto', whiteSpace: 'nowrap', scrollBehavior: 'smooth', pb: 1,
          msOverflowStyle: 'none', scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' }
        }}
      >
        {items.map((doc) => (
          <PdfCard key={doc.id} pdf={doc} />
        ))}
      </Box>
    </Box>
  );
};

const Browse = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [spotlightDocs, setSpotlightDocs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');

  useEffect(() => {
    fetchPdfs().then(data => setDocuments(data || []));
    fetchFeaturedPdfs().then(data => setSpotlightDocs(data || []));
  }, []);

  // Updated genres array with common book and academic categories
  const genres = useMemo(() => {
    const commonGenres = [
      'All', 
      'Romance', 
      'Action', 
      'Drama', 
      'Science Fiction', 
      'Research Paper', 
      'Review Article', 
      'Case Study', 
      'Thesis', 
      'Biography', 
      'Textbook'
    ];
    
    // This keeps the common list + any unique ones found in your database
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

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, pt: 12, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="xl">
        
        <Box sx={{ mb: 6 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, textTransform: 'uppercase', borderLeft: '5px solid #1976d2', pl: 1.5 }}>
            Spotlight
          </Typography>
          {spotlightDocs.length > 0 && (
            <FeaturedBanner 
              doc={spotlightDocs[currentIndex]} 
              onNext={() => setCurrentIndex((prev) => (prev + 1) % spotlightDocs.length)} 
              onPrev={() => setCurrentIndex((prev) => (prev - 1 + spotlightDocs.length) % spotlightDocs.length)} 
            />
          )}
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 6 }}>
          <TextField 
            fullWidth 
            size="small" 
            placeholder="Search titles or authors..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            sx={{ bgcolor: 'background.paper', borderRadius: 1 }} 
          />
          
          <TextField
            select
            size="small"
            label="Genre"
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 200 }, bgcolor: 'background.paper', borderRadius: 1 }}
            InputProps={{
              startAdornment: <FilterListIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
            }}
          >
            {genres.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <MultiRowSection title="Library" items={filteredDocs} onSeeAll={() => navigate('/library')} />
        
        <MultiRowSection 
          title="Books" 
          items={filteredDocs.filter(d => d.category?.toLowerCase() === 'book')} 
          onSeeAll={() => navigate('/books')} 
        />
        
        <MultiRowSection 
          title="Academic" 
          items={filteredDocs.filter(d => d.category?.toLowerCase() === 'academic paper')} 
          onSeeAll={() => navigate('/academic')} 
        />

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