import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Typography, CircularProgress, Stack, TextField, 
  MenuItem, Container, Divider, useTheme, Grid, useMediaQuery 
} from '@mui/material';
import { PdfCard } from '../../shared';
import { supabase } from '../../supabaseClient';

const MyDownloads = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('LIBRARY');
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('All');

  // Colors based on your provided typography and shading preferences
  const dynamicStyles = {
    inputBg: isDarkMode ? '#1e293b' : '#f1f5f9', 
    textPrimary: isDarkMode ? '#ffffff' : '#213C51',
    accent: '#1976d2',
    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  };

  /**
   * Functional Download Logic
   * Generates a signed URL from Supabase storage
   */
  const handleDownload = async (pdf) => {
    try {
      const { data, error } = await supabase.storage
        .from('pdfs') 
        .createSignedUrl(pdf.file_url, 60);

      if (error) throw error;

      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = `${pdf.title || 'document'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download error:', error.message);
    }
  };

  // Fetch unique download history for the current user
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
      } catch (error) { 
        console.error(error); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchMyDownloads();
  }, []);

  /**
   * Working Genre Logic:
   * Dynamically extracts unique genres from your downloaded PDFs
   */
  const availableGenres = useMemo(() => {
    const genres = downloads.map(doc => doc.genre).filter(Boolean);
    return ['All', ...new Set(genres)];
  }, [downloads]);

  const filteredDocs = useMemo(() => {
    return downloads.filter((doc) => {
      const matchSearch = doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (doc.author && doc.author.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchGenre = genreFilter === 'All' || doc.genre === genreFilter;
      
      const matchTab = activeTab === 'LIBRARY' || 
                       (activeTab === 'BOOKS' && doc.category?.toLowerCase() === 'book') ||
                       (activeTab === 'ACADEMIC PAPERS' && doc.category?.toLowerCase() === 'academic paper');
      
      return matchSearch && matchGenre && matchTab;
    });
  }, [downloads, searchQuery, genreFilter, activeTab]);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, pt: 12, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="xl">
        
        {/* HEADER SECTION */}
        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="h3" 
            sx={{ 
              fontStyle: 'italic', fontWeight: 900, 
              color: dynamicStyles.textPrimary, 
              fontFamily: "'Montserrat', sans-serif",
              fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}
          >
            Download History
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, display: 'block' }}>
            MANAGE, RESTORE, OR REDOWNLOAD YOUR SAVED FILES.
          </Typography>
        </Box>

        {/* FILTERS SECTION */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 6 }}>
          <TextField 
            fullWidth size="medium" placeholder="Search history..." value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            InputProps={{ sx: { bgcolor: dynamicStyles.inputBg, borderRadius: 1 } }}
            sx={{ '& fieldset': { border: 'none' } }}
          />
          <TextField
            select size="medium" label="Genre" value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 200 }, bgcolor: dynamicStyles.inputBg, borderRadius: 1 }}
            InputProps={{ sx: { '& fieldset': { border: 'none' } } }}
          >
            {availableGenres.map((option) => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </TextField>
        </Stack>

        {/* TAB NAVIGATION */}
        <Stack direction="row" spacing={4} sx={{ mb: 2, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
          {['LIBRARY', 'BOOKS', 'ACADEMIC PAPERS'].map((tab) => (
            <Typography
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setGenreFilter('All');
              }}
              sx={{
                fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap',
                color: activeTab === tab ? dynamicStyles.accent : 'text.secondary',
                borderBottom: activeTab === tab ? `3px solid ${dynamicStyles.accent}` : 'none',
                pb: 0.5, transition: '0.2s',
                '&:hover': { color: dynamicStyles.accent }
              }}
            >
              {tab}
            </Typography>
          ))}
        </Stack>

        <Divider sx={{ mb: 6, borderColor: dynamicStyles.borderColor }} />

        {/* GRID LAYOUT */}
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 10 }}><CircularProgress /></Box>
        ) : filteredDocs.length > 0 ? (
          <Grid container spacing={3}>
            {filteredDocs.map((doc) => (
              <Grid item xs={6} sm={4} md={3} lg={2.4} key={doc.id}>
                <PdfCard 
                  pdf={doc} 
                  downloadLabel="REDOWNLOAD" // Corrected prop name to match your PdfCard.js
                  onDownload={() => handleDownload(doc)} 
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography color="text.secondary">No documents found matching your filters.</Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default MyDownloads;