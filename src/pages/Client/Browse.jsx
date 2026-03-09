import React, { useState, useEffect, useMemo } from 'react';
import { 
  Grid, Box, Stack, Typography, CircularProgress, 
  TextField, MenuItem, Paper, InputAdornment 
} from '@mui/material';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import CategoryIcon from '@mui/icons-material/Category';
import FilterListIcon from '@mui/icons-material/FilterList';
import DateRangeIcon from '@mui/icons-material/DateRange';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import PersonIcon from '@mui/icons-material/Person';

import { SearchBar, PdfCard } from '../../shared';
import { fetchPdfs } from '../../services/pdfService'; 
import { supabase } from '../../supabaseClient';

const Browse = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState(''); 
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchPdfs();
        setDocuments(data || []);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          if (profile) setUserName(profile.full_name);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleDownloadLog = async (pdf) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('audit_logs').insert([{
          user_id: user.id,
          pdf_id: pdf.id,
          action_type: 'Download',
          description: `Downloaded file: "${pdf.title}"`
        }]);
        await supabase.from('downloads').insert([{ user_id: user.id, pdf_id: pdf.id }]);
      }
      window.open(pdf.file_url, '_blank');
    } catch (error) {
      console.error("Error logging download:", error);
    }
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (doc.author && doc.author.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchGenre = genreFilter === '' || (doc.genre && doc.genre.toLowerCase() === genreFilter.toLowerCase());
      const matchYear = yearFilter === '' || String(doc.published_date) === yearFilter;
      const matchCategory = categoryFilter === '' || doc.category === categoryFilter;
      return matchSearch && matchGenre && matchYear && matchCategory;
    });
  }, [documents, searchQuery, genreFilter, yearFilter, categoryFilter]);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, background: 'linear-gradient(135deg, #e0f7fa 0%, #80deea 100%)', minHeight: '100vh', fontFamily: "'Inter', sans-serif"}}>
      {/* Header Section */}
      <Stack direction="row" alignItems="center" spacing={3} sx={{ mb: 2, mt: 5} }>
        <Box sx={{  p: 2, borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {userName ? <PersonIcon sx={{ fontSize: 50, color: '#1e3a8a' }} /> : <LibraryBooksIcon sx={{ fontSize: 40, color: '#1e3a8a' }} />}
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a' }}>
            {userName ? `Welcome back, ${userName}!` : "Browse Library"}
          </Typography>
          <Typography variant="subtitle1" sx={{ color: '#1e3a8a', fontWeight: 600 }}>
            “Your digital library of research and discovery”
          </Typography>
        </Box>
      </Stack>
      
      {/* Filters Section */}
      <Paper sx={{ p: 3, mb: 2, borderRadius: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'center', background: 'linear-gradient(135deg, #f0f7ff 0%, #e1effe 100%)', backdropFilter: 'blur(10px)' }}>
        <Box sx={{ flexGrow: 1, width: '100%', }}>
          <SearchBar placeholder="Search title or author..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </Box>  
        
        <TextField select label="Genre" value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)} sx={{ minWidth: 150 }} InputProps={{ startAdornment: <FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}>
          <MenuItem value="">All Genres</MenuItem>
          <MenuItem value="Fantasy">Fantasy</MenuItem>
          <MenuItem value="Education">Education</MenuItem> 
          <MenuItem value="Science Fiction">Science Fiction</MenuItem> 
          <MenuItem value="Comedy">Comedy</MenuItem> 
          <MenuItem value="Historical Fiction">Historical Fiction</MenuItem> 
          <MenuItem value="Mystery">Mystery</MenuItem> 
          <MenuItem value="Romance">Romance</MenuItem> 
          <MenuItem value="Thriller">Thriller</MenuItem> 
          <MenuItem value="Horror">Horror</MenuItem> 
          <MenuItem value="Adventure">Adventure</MenuItem> 
          <MenuItem value="Biography">Biography</MenuItem>
        </TextField>

        <TextField select label="Category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} sx={{ minWidth: 150 }} InputProps={{ startAdornment: <CategoryIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}>
          <MenuItem value="">All Categories</MenuItem>
          <MenuItem value="book">Book</MenuItem>
          <MenuItem value="academic paper">Academic Paper</MenuItem>
        </TextField>

        <TextField label="Year" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} sx={{ minWidth: 120 }} InputProps={{ startAdornment: <DateRangeIcon sx={{ mr: 1, color: 'text.secondary' }} /> }} />
      </Paper>

      {/* Grid Display */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>
      ) : filteredDocuments.length > 0 ? (
        <Grid container spacing={3}>
          {filteredDocuments.map((doc) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={doc.id}>
              <PdfCard pdf={doc} onDownload={() => handleDownloadLog(doc)} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Typography variant="h6" color="textSecondary">No documents found matching these filters.</Typography>
        </Box>
      )}
    </Box>
  );
};

export default Browse;