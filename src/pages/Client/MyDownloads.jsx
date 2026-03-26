import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Box, Typography, CircularProgress, Stack, TextField, 
  MenuItem, Button, Container, IconButton, Divider, useTheme, Grid
} from '@mui/material';
import { History, Search } from '@mui/icons-material';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { PdfCard } from '../../shared';
import { supabase } from '../../supabaseClient';

// --- Reusable Responsive Row Component ---
const DownloadRow = ({ title, items }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    const { current } = scrollRef;
    const scrollAmount = window.innerWidth < 600 ? 280 : 400;
    if (direction === 'left') {
      current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (items.length === 0) return null;

  return (
    <Box sx={{ mb: { xs: 4, md: 6 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 800, borderLeft: '5px solid #1976d2', pl: 1.5, 
            textTransform: 'uppercase', 
            color: theme.palette.text.primary,
            fontSize: { xs: '0.85rem', sm: '1.1rem' }
          }}
        >
          {title}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button size="small" sx={{ color: theme.palette.text.secondary, fontWeight: 700, textTransform: 'none' }}>
            See All
          </Button>
          <IconButton 
            onClick={() => scroll('left')} 
            size="small" 
            sx={{ bgcolor: isDarkMode ? '#1e293b' : '#e2e8f0', color: theme.palette.text.primary, display: { xs: 'none', sm: 'inline-flex' } }}
          >
            <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
          </IconButton>
          <IconButton 
            onClick={() => scroll('right')} 
            size="small" 
            sx={{ bgcolor: isDarkMode ? '#1e293b' : '#e2e8f0', color: theme.palette.text.primary, display: { xs: 'none', sm: 'inline-flex' } }}
          >
            <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Stack>
      </Stack>

      <Box 
        ref={scrollRef}
        sx={{ 
          display: 'flex', gap: 2, overflowX: 'auto', whiteSpace: 'nowrap', 
          pb: 2,
          msOverflowStyle: 'none', scrollbarWidth: 'none', 
          '&::-webkit-scrollbar': { display: 'none' }, 
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {items.map((doc) => (
          <Box key={doc.id} sx={{ minWidth: { xs: '200px', sm: '250px' }, flexShrink: 0 }}>
            <PdfCard pdf={doc} />
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const MyDownloads = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('LIBRARY');
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('');

  const dynamicStyles = {
    inputBg: isDarkMode ? '#1e293b' : '#f1f5f9',
    textPrimary: theme.palette.text.primary,
    textSecondary: theme.palette.text.secondary,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  };

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
          const uniquePdfsMap = new Map();
          data?.forEach(item => {
            if (item.pdfs && !uniquePdfsMap.has(item.pdfs.id)) {
              uniquePdfsMap.set(item.pdfs.id, item.pdfs);
            }
          });
          setDownloads(Array.from(uniquePdfsMap.values()));
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchMyDownloads();
  }, []);

  const filteredDownloads = useMemo(() => {
    return downloads.filter((doc) => {
      const matchSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (doc.author && doc.author.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchGenre = genreFilter === 'All' || (doc.genre && doc.genre.includes(genreFilter));
      const matchYear = yearFilter === '' || String(doc.published_date || '').includes(yearFilter);
      const matchTab = activeTab === 'LIBRARY' || 
                       (activeTab === 'BOOKS' && doc.category?.toLowerCase() === 'book') ||
                       (activeTab === 'ACADEMIC PAPERS' && doc.category?.toLowerCase() === 'academic paper');
      return matchSearch && matchGenre && matchYear && matchTab;
    });
  }, [downloads, searchQuery, genreFilter, yearFilter, activeTab]);

  return (
    // ADJUSTED: Reduced pt (padding-top) from 10/12 to 4/6 to remove excess white space
    <Box sx={{ p: { xs: 2, md: 4 }, pt: { xs: 4, md: 6 }, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="xl">
        
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
          <History sx={{ fontSize: { xs: 28, md: 36 }, color: '#38bdf8' }} />
          <Typography variant="h4" sx={{ fontWeight: 800, color: dynamicStyles.textPrimary }}>
            Download History
          </Typography>
        </Stack>

        <Grid container spacing={2} sx={{ mb: 4, alignItems: 'center' }}>
          <Grid item xs={12} md={6} lg={5}>
            <TextField 
              fullWidth size="small"
              placeholder="Search your library..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{ 
                startAdornment: <Search sx={{ mr: 1, color: dynamicStyles.textSecondary }} />,
                sx: { color: dynamicStyles.textPrimary, bgcolor: dynamicStyles.inputBg, borderRadius: 2, height: 45 }
              }}
              sx={{ '& fieldset': { border: 'none' } }}
            />
          </Grid>
          
          <Grid item xs={6} md={3} lg={2}>
            <TextField 
              select fullWidth size="small" label="Genre" value={genreFilter} 
              onChange={(e) => setGenreFilter(e.target.value)} 
              sx={{ 
                bgcolor: dynamicStyles.inputBg, borderRadius: 2,
                '& .MuiInputLabel-root': { color: dynamicStyles.textSecondary },
                '& fieldset': { border: 'none' }
              }}
            >
              <MenuItem value="All">All Genres</MenuItem>
              <MenuItem value="Fantasy">Fantasy</MenuItem>
              <MenuItem value="Education">Education</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={6} md={3} lg={2}>
            <TextField 
              fullWidth size="small" label="Year" value={yearFilter} 
              onChange={(e) => setYearFilter(e.target.value)} 
              sx={{ 
                bgcolor: dynamicStyles.inputBg, borderRadius: 2,
                '& .MuiInputLabel-root': { color: dynamicStyles.textSecondary },
                '& fieldset': { border: 'none' }
              }} 
            />
          </Grid>
        </Grid>

        <Stack 
          direction="row" 
          spacing={4} 
          sx={{ 
            mb: 4, 
            overflowX: 'auto', 
            pb: 1,
            msOverflowStyle: 'none', 
            scrollbarWidth: 'none', 
            '&::-webkit-scrollbar': { display: 'none' } 
          }}
        >
          {['LIBRARY', 'BOOKS', 'ACADEMIC PAPERS'].map((tab) => (
            <Typography
              key={tab}
              onClick={() => setActiveTab(tab)}
              sx={{
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                color: activeTab === tab ? dynamicStyles.textPrimary : dynamicStyles.textSecondary,
                borderBottom: activeTab === tab ? '3px solid #38bdf8' : 'none',
                pb: 0.5,
                '&:hover': { color: dynamicStyles.textPrimary }
              }}
            >
              {tab}
            </Typography>
          ))}
        </Stack>

        <Divider sx={{ mb: 6, borderColor: dynamicStyles.borderColor }} />

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 10 }}><CircularProgress /></Box>
        ) : filteredDownloads.length > 0 ? (
          <DownloadRow 
            title={activeTab === 'LIBRARY' ? "Recently Downloaded" : activeTab} 
            items={filteredDownloads} 
          />
        ) : (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography sx={{ color: dynamicStyles.textSecondary }}>No documents found.</Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default MyDownloads;