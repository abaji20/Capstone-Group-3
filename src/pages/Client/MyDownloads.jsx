import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Grid, Typography, CircularProgress, Stack, 
  TextField, MenuItem, Divider, Button, Container
} from '@mui/material';
import { History, Search } from '@mui/icons-material';
import { PdfCard } from '../../shared';
import { supabase } from '../../supabaseClient';

const MyDownloads = () => {
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    const fetchMyDownloads = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('downloads')
            .select('pdfs(*)') 
            .eq('user_id', user.id);
          
          if (error) throw error;

          // --- UNIQUE FILTER LOGIC ---
          // Use a Map to ensure each PDF ID only appears once
          const uniquePdfsMap = new Map();
          
          data?.forEach(item => {
            if (item.pdfs && !uniquePdfsMap.has(item.pdfs.id)) {
              uniquePdfsMap.set(item.pdfs.id, item.pdfs);
            }
          });

          setDownloads(Array.from(uniquePdfsMap.values()));
          // ---------------------------
        }
      } catch (error) { 
        console.error("Error:", error); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchMyDownloads();
  }, []);

  const filteredDownloads = useMemo(() => {
    return downloads.filter((doc) => {
      const matchSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (doc.author && doc.author.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchGenre = genreFilter === '' || (doc.genre && doc.genre.toLowerCase() === genreFilter.toLowerCase());
      const matchYear = yearFilter === '' || String(doc.published_date || '') === yearFilter;
      const matchCategory = categoryFilter === '' || doc.category === categoryFilter;
      return matchSearch && matchGenre && matchYear && matchCategory;
    });
  }, [downloads, searchQuery, genreFilter, yearFilter, categoryFilter]);

  return (
    <Container maxWidth="100%" sx={{ mt: 10, mb: 4 }}>
      
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
        <History sx={{ fontSize: 32, color: '#111827' }} />
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Download History</Typography>
      </Stack>

      {/* FILTER SECTION */}
      <Grid container spacing={1} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField 
            fullWidth 
            size="medium"
            label="Search history..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{ startAdornment: <Search sx={{ mr: 1, color: '#94a3b8' }} /> }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <TextField 
            select 
            fullWidth 
            label="Genre" 
            value={genreFilter} 
            onChange={(e) => setGenreFilter(e.target.value)} 
            sx={{ 
              '& .MuiOutlinedInput-root': { 
                borderRadius: '12px',
                minWidth: 'unset' 
              } 
            }}
          >
            <MenuItem value="">All Genres</MenuItem>
            <MenuItem value="Fantasy">Fantasy</MenuItem>
            <MenuItem value="Education">Education</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={6} md={3}>
          <TextField 
            fullWidth size="medium" label="Year" 
            value={yearFilter} 
            onChange={(e) => setYearFilter(e.target.value)} 
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} 
          />
        </Grid>
      </Grid>

      {/* Categories */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button onClick={() => setCategoryFilter('')} sx={{ color: categoryFilter === '' ? '#111827' : '#94a3b8', fontWeight: 600 }}>Library</Button>
        <Button onClick={() => setCategoryFilter('book')} sx={{ color: categoryFilter === 'book' ? '#111827' : '#94a3b8', fontWeight: 600 }}>Books</Button>
        <Button onClick={() => setCategoryFilter('academic paper')} sx={{ color: categoryFilter === 'academic paper' ? '#111827' : '#94a3b8', fontWeight: 600 }}>Academic Papers</Button>
      </Stack>
      <Divider sx={{ mb: 4 }} />

      {/* Results Grid - Centered */}
      <Grid container spacing={3} justifyContent="left">
        {loading ? (
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress />
          </Box>
        ) : filteredDownloads.length > 0 ? (
          filteredDownloads.map((doc) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={doc.id} display="flex" justifyContent="center">
              <PdfCard pdf={doc} sx={{ height: '100%', width: '100%' }} />
            </Grid>
          ))
        ) : (
          <Box sx={{ width: '100%', textAlign: 'center', mt: 8 }}>
            <Typography sx={{ color: '#94a3b8' }}>No matches found.</Typography>
          </Box>
        )}
      </Grid>
    </Container>
  );
};

export default MyDownloads;