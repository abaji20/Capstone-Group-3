import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, Box, TextField, InputAdornment, IconButton, Typography,
  Chip, Stack, MenuItem, Divider, CircularProgress, useTheme, useMediaQuery
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import TuneIcon from '@mui/icons-material/Tune';
import PdfCard from './PdfCard';
import { fetchPdfs } from '../services/pdfService';
import { MONTH_NAMES } from '../utils/formatPublishedDate';

const CATEGORY_TABS = [
  { label: 'All', value: 'All' },
  { label: 'Book', value: 'book' },
  { label: 'Academic Paper', value: 'academic paper' },
];

// Same small helper Browse.jsx uses to build a filter dropdown's option list
// from a flat (non comma-separated) text field. Kept local to this component
// so TopbarSearch has no dependency on Browse.jsx internals.
const buildOptionList = (documents, field) => {
  const values = documents.map((doc) => doc[field]).filter(Boolean);
  return ['All', ...Array.from(new Set(values)).sort()];
};

// Same idea but for numeric publication fields (year / month / day), sorted
// numerically instead of alphabetically. 0 is a valid falsy-looking value for
// some fields so we filter on null/undefined/'' rather than truthiness.
const buildNumericOptionList = (documents, field, order = 'asc') => {
  const values = documents
    .map((doc) => doc[field])
    .filter((v) => v !== null && v !== undefined && v !== '');
  const unique = Array.from(new Set(values));
  unique.sort((a, b) => (order === 'desc' ? Number(b) - Number(a) : Number(a) - Number(b)));
  return ['All', ...unique];
};

// Cap how many PdfCard tiles render at once so a broad/empty query doesn't
// mount hundreds of cards (each with its own dialog state) at once.
const RESULTS_LIMIT = 24;

const TopbarSearch = ({ open, onClose }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  // Phones: the search panel takes the whole screen instead of a floating box.
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedProgram, setSelectedProgram] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedDay, setSelectedDay] = useState('All');

  // Lazy-load once on first open; cached for the rest of the session so
  // reopening the panel doesn't refetch every time.
  useEffect(() => {
    if (open && documents.length === 0 && !loading) {
      setLoading(true);
      fetchPdfs()
        .then((data) => setDocuments(data || []))
        .finally(() => setLoading(false));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const genres = useMemo(() => {
    const dbGenres = documents.flatMap((doc) =>
      doc.genre ? doc.genre.split(',').map((g) => g.trim()) : []
    );
    return ['All', ...new Set(dbGenres.filter(Boolean))];
  }, [documents]);
  const sectionsList = useMemo(() => buildOptionList(documents, 'section'), [documents]);
  const programsList = useMemo(() => buildOptionList(documents, 'program_course'), [documents]);
  // Most recent year first; month/day in natural calendar order.
  const yearsList = useMemo(() => buildNumericOptionList(documents, 'published_date', 'desc'), [documents]);
  const monthsList = useMemo(() => buildNumericOptionList(documents, 'published_month', 'asc'), [documents]);
  const daysList = useMemo(() => buildNumericOptionList(documents, 'published_day', 'asc'), [documents]);

  const hasActiveFilter =
    category !== 'All' || selectedGenre !== 'All' || selectedSection !== 'All' ||
    selectedProgram !== 'All' || selectedYear !== 'All' || selectedMonth !== 'All' || selectedDay !== 'All';
  const hasQuery = query.trim().length > 0;

  const results = useMemo(() => {
    if (!hasQuery && !hasActiveFilter) return [];
    const q = query.trim().toLowerCase();

    return documents.filter((doc) => {
      const matchesSearch =
        !q ||
        doc.title?.toLowerCase().includes(q) ||
        doc.author?.toLowerCase().includes(q) ||
        doc.isbn?.toLowerCase().includes(q) ||
        doc.edition?.toLowerCase().includes(q);

      const matchesCategory = category === 'All' || doc.category?.toLowerCase() === category;
      const matchesGenre =
        selectedGenre === 'All' ||
        (doc.genre && doc.genre.split(',').map((g) => g.trim()).includes(selectedGenre));
      const matchesSection = selectedSection === 'All' || doc.section === selectedSection;
      const matchesProgram = selectedProgram === 'All' || doc.program_course === selectedProgram;
      const matchesYear = selectedYear === 'All' || doc.published_date === selectedYear;
      const matchesMonth = selectedMonth === 'All' || doc.published_month === selectedMonth;
      const matchesDay = selectedDay === 'All' || doc.published_day === selectedDay;

      return matchesSearch && matchesCategory && matchesGenre && matchesSection &&
        matchesProgram && matchesYear && matchesMonth && matchesDay;
    });
  }, [documents, query, category, selectedGenre, selectedSection, selectedProgram, selectedYear, selectedMonth, selectedDay, hasQuery, hasActiveFilter]);

  const visibleResults = results.slice(0, RESULTS_LIMIT);

  const filterSelectSx = {
    bgcolor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      fullWidth
      maxWidth="md"
      sx={{ '& .MuiDialog-container': { alignItems: 'flex-start', justifyContent: 'center' } }}
      PaperProps={{
        sx: {
          // Was { sm: 8, md: 10 } — that pushed the panel well down the page.
          // Now sits just under the topbar.
          mt: isMobile ? 0 : { sm: 2, md: 2.5 },
          mx: isMobile ? 0 : { sm: 2 },
          width: isMobile ? '100%' : { sm: 'calc(100% - 32px)' },
          borderRadius: isMobile ? 0 : 1,
          bgcolor: isDarkMode ? '#0f172a' : '#ffffff',
          backgroundImage: 'none',
          maxHeight: isMobile ? '100%' : 'calc(100vh - 40px)',
          overflow: 'hidden',
        },
      }}
    >
      {/* Search header (stays put; only the results scroll) */}
      <Box
        sx={{
          p: { xs: 2, sm: 2.5 }, pb: 1.5, flexShrink: 0,
          // if many filters are open on a small screen, let the header scroll
          // instead of pushing the results off-screen
          maxHeight: '60vh', overflowY: 'auto',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5, color: 'text.secondary' }}>
            Search the Library
          </Typography>
          <IconButton size="small" onClick={onClose} aria-label="Close search">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <TextField
          fullWidth
          autoFocus
          placeholder="Search titles, authors, ISBN..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setShowFilters((prev) => !prev)}
                  aria-label="Toggle filters"
                  sx={{ color: hasActiveFilter ? 'primary.main' : 'text.secondary' }}
                >
                  <TuneIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
          {CATEGORY_TABS.map((tab) => (
            <Chip
              key={tab.value}
              label={tab.label}
              size="small"
              onClick={() => setCategory(tab.value)}
              color={category === tab.value ? 'primary' : 'default'}
              variant={category === tab.value ? 'filled' : 'outlined'}
              sx={{ fontWeight: 700 }}
            />
          ))}
        </Stack>

        {/* Filters: 2 columns on phones, 3 on tablets, 6 on desktop */}
        {showFilters && (
          <Box
            sx={{
              mt: 1.5,
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(3, minmax(0, 1fr))',
                md: 'repeat(6, minmax(0, 1fr))',
              },
            }}
          >
            <TextField select fullWidth size="small" label="Genre" value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)} sx={filterSelectSx}>
              {genres.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </TextField>
            <TextField select fullWidth size="small" label="Section" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} sx={filterSelectSx}>
              {sectionsList.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </TextField>
            <TextField select fullWidth size="small" label="Program" value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)} sx={filterSelectSx}>
              {programsList.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </TextField>
            <TextField select fullWidth size="small" label="Year" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} sx={filterSelectSx}>
              {yearsList.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </TextField>
            <TextField select fullWidth size="small" label="Month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} sx={filterSelectSx}>
              {monthsList.map((opt) => (
                <MenuItem key={opt} value={opt}>{opt === 'All' ? 'All' : MONTH_NAMES[opt - 1]}</MenuItem>
              ))}
            </TextField>
            <TextField select fullWidth size="small" label="Day" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} sx={filterSelectSx}>
              {daysList.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </TextField>
          </Box>
        )}
      </Box>

      <Divider />

      {/* Results — the only part that scrolls */}
      <Box sx={{ p: { xs: 2, sm: 2.5 }, overflowY: 'auto', flex: 1, minHeight: 0 }}>
        {loading ? (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : !hasQuery && !hasActiveFilter ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
            Start typing or pick a filter to search the library.
          </Typography>
        ) : results.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
            No matching materials found.
          </Typography>
        ) : (
          <>
            {/* Fluid grid: 2 cards per row on phones, 3 on tablets, then as
                many as fit. PdfCard has a fixed min/max width, so it's
                overridden here to fill its grid cell. */}
            <Box
              sx={{
                display: 'grid',
                // Gap between PdfCards in this grid — tweak these numbers
                // directly to make it tighter/looser (MUI spacing unit,
                // 1 = 8px).
                gap: { xs: 1, sm: 1.25, md: 1.5 },
                // Was repeat(2, minmax(0,1fr)) / repeat(3, minmax(0,1fr)):
                // those force each column to stretch to half/third of the
                // row width, but PdfCard itself only fills ~130-145px of
                // that column (justifyItems below stops it from
                // stretching) — the leftover space inside each column read
                // as one huge gap between cards. Sizing columns to the
                // card's own width at every breakpoint removes that
                // leftover space; the browser just fits as many columns as
                // will actually hold a card.
                gridTemplateColumns: {
                  xs: 'repeat(auto-fill, minmax(130px, 130px))',
                  sm: 'repeat(auto-fill, minmax(145px, 145px))',
                  md: 'repeat(auto-fill, minmax(150px, 150px))',
                },
                justifyContent: 'start',
              }}
            >
              {visibleResults.map((doc) => (
                <Box key={doc.id} sx={{ display: 'flex', minWidth: 0 }}>
                  <PdfCard pdf={doc} variant="small" />
                </Box>
              ))}
            </Box>
            {results.length > RESULTS_LIMIT && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
                Showing {RESULTS_LIMIT} of {results.length} results — refine your search to narrow further.
              </Typography>
            )}
          </>
        )}
      </Box>
    </Dialog>
  );
};

export default TopbarSearch;