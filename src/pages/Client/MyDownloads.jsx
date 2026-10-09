import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, CircularProgress, Stack, TextField,
  MenuItem, Container, Divider, useTheme, useMediaQuery,
  InputAdornment, IconButton, Badge, Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import TuneIcon from '@mui/icons-material/Tune';
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

const MONTH_OPTIONS = ['All', ...MONTH_NAMES.map((_, i) => i + 1)];
const DAY_OPTIONS = ['All', ...Array.from({ length: 31 }, (_, i) => i + 1)];

const MyDownloads = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('LIBRARY');
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('All');
  const [sectionFilter, setSectionFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(true); // toggled by the tune icon on mobile

  // Publication date filters
  const [yearFilter, setYearFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');
  const [dayFilter, setDayFilter] = useState('All');

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

  // Genres are comma-separated: split, trim, de-duplicate
  const availableGenres = useMemo(() => {
    const allGenres = new Set();
    downloads.forEach(doc => {
      if (doc.genre) {
        doc.genre.split(',').forEach(g => {
          const trimmed = g.trim();
          if (trimmed) allGenres.add(trimmed);
        });
      }
    });
    return ['All', ...Array.from(allGenres).sort()];
  }, [downloads]);

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

  const activeFilterCount = [genreFilter, sectionFilter, yearFilter, monthFilter, dayFilter]
    .filter(v => v !== 'All').length;

  const clearFilters = () => {
    setGenreFilter('All');
    setSectionFilter('All');
    setYearFilter('All');
    setMonthFilter('All');
    setDayFilter('All');
  };

  // Shared look for every filter dropdown (outlined, like the search modal)
  const filterSx = {
    width: '100%',
    '& .MuiOutlinedInput-root': {
      bgcolor: isDarkMode ? '#1e293b' : '#fafafa',
      borderRadius: 1,
      '& fieldset': { borderColor: dynamicStyles.borderColor }
    }
  };

  const filters = [
    { label: 'Genre', value: genreFilter, set: setGenreFilter, options: availableGenres },
    { label: 'Section', value: sectionFilter, set: setSectionFilter, options: availableSections },
    { label: 'Year', value: yearFilter, set: setYearFilter, options: availableYears },
    {
      label: 'Month', value: monthFilter, set: setMonthFilter, options: MONTH_OPTIONS,
      render: (o) => (o === 'All' ? 'All' : MONTH_NAMES[o - 1])
    },
    { label: 'Day', value: dayFilter, set: setDayFilter, options: DAY_OPTIONS },
  ];

  return (
    <Box
      sx={{
        px: { xs: 1.5, sm: 2, md: 4 },
        pb: 4,
        pt: { xs: 10, md: 12 },
        bgcolor: 'background.default',
        minHeight: '100vh',
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}
    >
      <Container maxWidth="xl" disableGutters>

        {/* HEADER SECTION */}
        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <Typography
            variant="h3"
            sx={{
              fontStyle: 'italic', fontWeight: 900,
              color: dynamicStyles.textPrimary,
              fontFamily: "'Montserrat', sans-serif",
              fontSize: { xs: '1.6rem', sm: '2.5rem', md: '3rem' },
              letterSpacing: '1px',
              textTransform: 'uppercase',
              wordBreak: 'break-word'
            }}
          >
            Download History
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, display: 'block' }}>
            MANAGE, RESTORE, OR REDOWNLOAD YOUR SAVED FILES.
          </Typography>
        </Box>

        {/* SEARCH (with filter toggle icon on mobile) */}
        <TextField
          fullWidth
          placeholder="Search titles, authors, ISBN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
            endAdornment: isMobile ? (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowFilters(s => !s)}
                  aria-label="Toggle filters"
                  edge="end"
                  color={showFilters ? 'primary' : 'default'}
                >
                  <Badge color="primary" badgeContent={activeFilterCount} invisible={activeFilterCount === 0}>
                    <TuneIcon />
                  </Badge>
                </IconButton>
              </InputAdornment>
            ) : null
          }}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              bgcolor: isDarkMode ? '#1e293b' : '#fafafa',
              borderRadius: 1,
              '& fieldset': { borderColor: dynamicStyles.borderColor }
            }
          }}
        />

        {/* FILTERS — 2 columns on mobile, 3 on tablet, 5 on desktop */}
        {(!isMobile || showFilters) && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(3, minmax(0, 1fr))',
                md: 'repeat(5, minmax(0, 1fr))'
              },
              gap: { xs: 1.5, md: 2 },
              mb: { xs: 2, md: 4 }
            }}
          >
            {filters.map((f) => (
              <TextField
                key={f.label}
                select
                size="small"
                label={f.label}
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                sx={filterSx}
              >
                {f.options.map((option) => (
                  <MenuItem key={option} value={option}>
                    {f.render ? f.render(option) : option}
                  </MenuItem>
                ))}
              </TextField>
            ))}
            {activeFilterCount > 0 && (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Button size="small" onClick={clearFilters}>Clear filters</Button>
              </Box>
            )}
          </Box>
        )}

        {/* TAB NAVIGATION */}
        <Stack direction="row" spacing={{ xs: 3, sm: 4 }} sx={{ mb: 2, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
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

        <Divider sx={{ mb: { xs: 3, md: 6 }, borderColor: dynamicStyles.borderColor }} />

        {/* Keep cards packed at their natural desktop width; use wider columns only on small screens. */}
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 10 }}><CircularProgress /></Box>
        ) : filteredDocs.length > 0 ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(3, minmax(0, 1fr))',
                md: 'repeat(auto-fill, minmax(175px, 175px))'
              },
              gap: { xs: 1.5, sm: 2.5, md: '24px' },
              alignItems: { xs: 'stretch', md: 'start' },
              width: '100%'
            }}
          >
            {filteredDocs.map((doc) => (
              <Box
                key={doc.id}
                sx={{
                  minWidth: 0,
                  display: { xs: 'flex', md: 'block' },
                  // Only below md: force the card to fill its grid cell so phones/tablets
                  // get even 2/3-column cards. On desktop the card keeps its original size.
                  [theme.breakpoints.down('md')]: {
                    '& > *': {
                      width: '100% !important',
                      maxWidth: '100% !important',
                      minWidth: 0,
                      margin: '0 !important'
                    }
                  }
                }}
              >
                <PdfCard
                  pdf={doc}
                  downloadLabel="DOWNLOAD"
                  onDownload={() => handleDownload(doc)}
                />
              </Box>
            ))}
          </Box>
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