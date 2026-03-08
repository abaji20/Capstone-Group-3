// src/pages/Client/MyDownloads.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Grid, Typography, CircularProgress, Stack, Paper, 
  TextField, MenuItem, InputAdornment 
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import FilterListIcon from '@mui/icons-material/FilterList';
import CategoryIcon from '@mui/icons-material/Category';
import DateRangeIcon from '@mui/icons-material/DateRange';
import SearchIcon from '@mui/icons-material/Search';
import { PdfCard } from '../../shared';
import { supabase } from '../../supabaseClient';

const MyDownloads = () => {
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const poppins = { fontFamily: "'Poppins', sans-serif" };

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
          setDownloads(data.map(item => item.pdfs));
        }
      } catch (error) { console.error("Error:", error); } 
      finally { setLoading(false); }
    };
    fetchMyDownloads();
  }, []);

  const filteredDownloads = useMemo(() => {
    return downloads.filter((doc) => {
      const matchSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (doc.author && doc.author.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchGenre = genreFilter === '' || (doc.genre && doc.genre.toLowerCase() === genreFilter.toLowerCase());
      const matchYear = yearFilter === '' || String(doc.published_date) === yearFilter;
      const matchCategory = categoryFilter === '' || doc.category === categoryFilter;
      return matchSearch && matchGenre && matchYear && matchCategory;
    });
  }, [downloads, searchQuery, genreFilter, yearFilter, categoryFilter]);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, ...poppins }}>
      <Box sx={{ mb: 6, mt: 5 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
          <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#e1effe', display: 'flex' }}>
            <HistoryIcon sx={{ fontSize: 40, color: '#1976d2' }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e293b' }}>Download History</Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Review and redownload your accessed documents.
            </Typography>
          </Box>
        </Stack>

        {/* Filter Section: Consistent with Browse.jsx */}
        <Paper sx={{ mt: 3, p: 3, borderRadius: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'center' }}>
          <TextField 
            fullWidth
            placeholder="Search your history..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { height: '56px', borderRadius: 3 } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#1976d2' }} /></InputAdornment> }}
          />

          <TextField select label="Genre" value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)} sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: 3 } }} InputProps={{ startAdornment: <FilterListIcon sx={{ mr: 1, color: '#1976d2' }} /> }}>
            <MenuItem value="">All Genres</MenuItem>
            <MenuItem value="Fantasy">Fantasy</MenuItem>
            <MenuItem value="Education">Education</MenuItem>
          </TextField>

          <TextField select label="Category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: 3 } }} InputProps={{ startAdornment: <CategoryIcon sx={{ mr: 1, color: '#1976d2' }} /> }}>
            <MenuItem value="">All Categories</MenuItem>
            <MenuItem value="book">Book</MenuItem>
            <MenuItem value="academic paper">Academic Paper</MenuItem>
          </TextField>

          <TextField label="Year" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} sx={{ minWidth: 120, '& .MuiOutlinedInput-root': { borderRadius: 3 } }} InputProps={{ startAdornment: <DateRangeIcon sx={{ mr: 1, color: '#1976d2' }} /> }} />
        </Paper>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>
      ) : filteredDownloads.length > 0 ? (
        <Grid container spacing={3}>
          {filteredDownloads.map((doc) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={doc.id}>
              <PdfCard pdf={doc} downloadLabel="Redownload" />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ textAlign: 'center', mt: 10 }}>
          <Typography color="textSecondary">No matches found.</Typography>
        </Box>
      )}
    </Box>
  );
};

export default MyDownloads;