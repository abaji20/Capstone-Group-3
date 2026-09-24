import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Typography, CircularProgress, Stack, TextField, 
  MenuItem, Container, Divider, useTheme, Grid, useMediaQuery 
} from '@mui/material';
import { PdfCard } from '../../shared';
import { supabase } from '../../supabaseClient';
// Month names for the Month filter (1 = January ... 12 = December)
import { MONTH_NAMES } from '../../utils/formatPublishedDate';

// Builds a unique, sorted list of values for a filter dropdown from a flat
// (non comma-separated) text field on each document, e.g. section.
const buildOptionList = (docs, field) => {
  const values = docs.map(doc => doc[field]).filter(Boolean);
  return ['All', ...Array.from(new Set(values)).sort()];
};

// Same idea for the numeric publication fields (year / month / day), sorted
// numerically. Only values that actually exist in the user's downloads show up.
const buildNumericOptionList = (docs, field, order = 'asc') => {
  const values = docs
    .map(doc => doc[field])
    .filter(v => v !== null && v !== undefined && v !== '');
  const unique = Array.from(new Set(values.map(Number)));
  unique.sort((a, b) => (order === 'desc' ? b - a : a - b));
  return ['All', ...unique];
};

const MyDownloads = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('LIBRARY');
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('All');
  const [sectionFilter, setSectionFilter] = useState('All');

  // Publication date filters
  const [yearFilter, setYearFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');
  const [dayFilter, setDayFilter] = useState('All');

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
   * Updated Genre Logic:
   * Splits genres by comma, trims whitespace, and creates a unique list
   */
  const availableGenres = useMemo(() => {
    const allGenres = new Set();
    downloads.forEach(doc => {
      if (doc.genre) {
        // Split by comma, trim spaces, and add each to the Set
        doc.genre.split(',').forEach(g => {
          const trimmed = g.trim();
          if (trimmed) allGenres.add(trimmed);
        });
      }
    });
    return ['All', ...Array.from(allGenres).sort()];
  }, [downloads]);

  // Month (Jan-Dec) and Day (1-31) always show the full range.
  const MONTH_OPTIONS = ['All', ...MONTH_NAMES.map((_, i) => i + 1)];
  const DAY_OPTIONS = ['All', ...Array.from({ length: 31 }, (_, i) => i + 1)];

  // Section and Year lists come from this user's own download history only.
  const availableSections = useMemo(() => buildOptionList(downloads, 'section'), [downloads]);
  // published_date holds the publication YEAR; most recent year first.
  const availableYears = useMemo(() => buildNumericOptionList(downloads, 'published_date', 'desc'), [downloads]);

  const filteredDocs = useMemo(() => {
    return downloads.filter((doc) => {
      const q = searchQuery.toLowerCase();
      const matchSearch = doc.title?.toLowerCase().includes(q) ||
                          (doc.author && doc.author.toLowerCase().includes(q)) ||
                          (doc.isbn && doc.isbn.toLowerCase().includes(q)) ||
                          (doc.edition && doc.edition.toLowerCase().includes(q));
      
      // Check if the selected genre exists within the comma-separated string
      const matchGenre = genreFilter === 'All' || 
                         (doc.genre && doc.genre.split(',').map(g => g.trim()).includes(genreFilter));

      const matchSection = sectionFilter === 'All' || doc.section === sectionFilter;

      const matchYear = yearFilter === 'All' || Number(doc.published_date) === Number(yearFilter);
      const matchMonth = monthFilter === 'All' || Number(doc.published_month) === Number(monthFilter);
      const matchDay = dayFilter === 'All' || Number(doc.published_day) === Number(dayFilter);
      
      const matchTab = activeTab === 'LIBRARY' || 
                       (activeTab === 'BOOKS' && doc.category?.toLowerCase() === 'book') ||
                       (activeTab === 'ACADEMIC PAPERS' && doc.category?.toLowerCase() === 'academic paper');
      
      return matchSearch && matchGenre && matchSection && matchYear && matchMonth && matchDay && matchTab;
    });
  }, [downloads, searchQuery, genreFilter, sectionFilter, yearFilter, monthFilter, dayFilter, activeTab]);

  // Shared look for every filter dropdown
  const filterSx = { 
    minWidth: { xs: '100%', sm: 180 }, 
    flex: { sm: 1 }, 
    bgcolor: dynamicStyles.inputBg, 
    borderRadius: 1 
  };
  const filterInputProps = { sx: { '& fieldset': { border: 'none' } } };

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

        {/* SEARCH */}
        <TextField 
          fullWidth size="medium" placeholder="Search history..." value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          InputProps={{ sx: { bgcolor: dynamicStyles.inputBg, borderRadius: 1 } }}
          sx={{ mb: 2, '& fieldset': { border: 'none' } }}
        />

        {/* FILTERS SECTION — wraps on smaller screens */}
        <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mb: 6 }}>
          <TextField
            select size="medium" label="Genre" value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            sx={filterSx} InputProps={filterInputProps}
          >
            {availableGenres.map((option) => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </TextField>

          <TextField
            select size="medium" label="Section" value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            sx={filterSx} InputProps={filterInputProps}
          >
            {availableSections.map((option) => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </TextField>

          <TextField
            select size="medium" label="Year" value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            sx={filterSx} InputProps={filterInputProps}
          >
            {availableYears.map((option) => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </TextField>

          <TextField
            select size="medium" label="Month" value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            sx={filterSx} InputProps={filterInputProps}
          >
            {MONTH_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option === 'All' ? 'All' : MONTH_NAMES[option - 1]}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select size="medium" label="Day" value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
            sx={filterSx} InputProps={filterInputProps}
          >
            {DAY_OPTIONS.map((option) => (
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
                  downloadLabel="DOWNLOAD" 
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