import React, { useState, useEffect, useMemo } from 'react';
import { Grid, Box, Typography, TextField, MenuItem, Stack } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import DateRangeIcon from '@mui/icons-material/DateRange';
import { PdfCard } from '../../shared';
import { fetchPdfs } from '../../services/pdfService'; 
import { supabase } from '../../supabaseClient';
import FeaturedBanner from '../../components/FeaturedBanner';

const SectionLabel = ({ title }) => (
  <Box sx={{ mt: 10, mb: 4 }}>
    <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', borderLeft: '6px solid #1e3a8a', pl: 2, textTransform: 'uppercase', letterSpacing: '1px' }}>
      {title}
    </Typography>
  </Box>
);

const Browse = () => {
  const [documents, setDocuments] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  useEffect(() => {
    fetchPdfs().then(data => setDocuments(data || []));
  }, []);

  const spotlightDocs = useMemo(() => documents.slice(0, 5), [documents]);

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) || doc.author?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGenre = genreFilter === '' || doc.genre === genreFilter;
      const matchesYear = yearFilter === '' || String(doc.published_date || '').startsWith(yearFilter);
      return matchesSearch && matchesGenre && matchesYear;
    });
  }, [documents, searchQuery, genreFilter, yearFilter]);

  const handleDownload = async (doc) => {
    const { data } = supabase.storage.from('pdfs').getPublicUrl(doc.file_url);
    const res = await fetch(data.publicUrl);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${doc.title}.pdf`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: 4, pt: 8, background: 'linear-gradient(135deg, #e0f7fa 0%, #80deea 100%)', minHeight: '100vh' }}>
      <SectionLabel title="Spotlight" />
      
      {spotlightDocs.length > 0 && (
        <FeaturedBanner 
          doc={spotlightDocs[currentIndex]} 
          rank={currentIndex + 1}
          onNext={() => setCurrentIndex((prev) => (prev + 1) % spotlightDocs.length)} 
          onPrev={() => setCurrentIndex((prev) => (prev - 1 + spotlightDocs.length) % spotlightDocs.length)} 
        />
      )}

      {/* Unboxed Filter Area */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ my: 5, alignItems: 'center' }}>
        <TextField fullWidth label="Search title or author..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} sx={{ bgcolor: 'white', borderRadius: 2 }} />
        
        <TextField select label="Genre" value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)} sx={{ minWidth: 200, bgcolor: 'white', borderRadius: 2 }} InputProps={{ startAdornment: <FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}>
          <MenuItem value="">All Genres</MenuItem>
          {['Fantasy', 'Education', 'Science Fiction', 'Romance', 'Adventure'].map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
        </TextField>

        <TextField label="Year" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} sx={{ minWidth: 150, bgcolor: 'white', borderRadius: 2 }} InputProps={{ startAdornment: <DateRangeIcon sx={{ mr: 1, color: 'text.secondary' }} /> }} />
      </Stack>

      <SectionLabel title="Library" />
      <Grid container spacing={3}>{filteredDocs.map(d => <Grid item key={d.id} xs={3}><PdfCard pdf={d} onDownload={() => handleDownload(d)} /></Grid>)}</Grid>

      <SectionLabel title="Books" />
      <Grid container spacing={3}>{filteredDocs.filter(d => d.category?.toLowerCase() === 'book').map(d => <Grid item key={d.id} xs={3}><PdfCard pdf={d} onDownload={() => handleDownload(d)} /></Grid>)}</Grid>

      <SectionLabel title="Academic Papers" />
      <Grid container spacing={3}>{filteredDocs.filter(d => d.category?.toLowerCase() === 'academic paper').map(d => <Grid item key={d.id} xs={3}><PdfCard pdf={d} onDownload={() => handleDownload(d)} /></Grid>)}</Grid>
    </Box>
  );
};
export default Browse;