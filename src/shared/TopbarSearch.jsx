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

const CATEGORY_TABS = [
  { label: 'All', value: 'All' },
  { label: 'Book', value: 'book' },
  { label: 'Academic Paper', value: 'academic paper' },
];

// ---------------------------------------------------------------------------
// FIXED OPTION LISTS
// ---------------------------------------------------------------------------

// Always show all 12 months, regardless of what's in the database.
const MONTH_OPTIONS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
].map((label, i) => ({ value: i + 1, label }));

// Always show days 1-31.
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

// Default library sections. Edit this list to match the real sections of the
// Goldenlink College library. Any extra section found in the database is
// automatically added on top of these.
const DEFAULT_SECTIONS = [
  'Circulation',
  'Filipiana',
  'General Reference',
  'General Collection',
  'Fiction',
  'Non-Fiction',
  'Reserve',
  'Periodicals',
  'Journals & Magazines',
  'Newspapers',
  'Thesis & Dissertations',
  'Research & Special Projects',
  'Graduate Studies',
  'Electronic Resources',
  'Audio-Visual',
  'Special Collection',
  'Vertical Files',
  'Textbooks',
  'Children’s Section',
  'Young Adult Section',
];

// Default programs/courses. Same idea: edit to match your school.
const DEFAULT_PROGRAMS = [
  "BS-Information Technology",
    "BS-Business Administration",
    "BS-Accounting Information Systems",
    "BS-Elementary Education",
    "BS-Psychology",
    "BS-Mathematics",
    "BS-Science",
    "BS-English",
    "BS-Computer Science",
    "BS-Information Systems",
    "BS-Management Accounting",
    'BS-Entrepreneurship',
    "BS-Hospitality Management",
    "BS-Tourism Management",
    "BS-Criminology",
    "BS-Nursing",
    "BS-Pharmacy",
    "BS-Architecture",
    "BS-Civil Engineering",
    "BS-Electrical Engineering",
    "BS-Mechanical Engineering",
    "BS-Chemical Engineering",
    "BS-Industrial Engineering",
    "BS-Computer Engineering",
    "BS-Environmental Engineering",
    "BS-Information Technology",
    "High School",
    "Senior High School",
    "Junior High School",
    "Elementary",
];

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

// Defaults + whatever is actually in the database, de-duplicated
// (case-insensitive) and sorted alphabetically.
const buildMergedOptionList = (documents, field, defaults = []) => {
  const map = new Map();
  [...defaults, ...documents.map((doc) => doc[field])]
    .filter(Boolean)
    .forEach((value) => {
      const clean = String(value).trim();
      const key = clean.toLowerCase();
      if (clean && !map.has(key)) map.set(key, clean);
    });
  const sorted = Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  return ['All', ...sorted];
};

// Year options come from the real data only, most recent first.
const buildYearList = (documents, field) => {
  const values = documents
    .map((doc) => doc[field])
    .filter((v) => v !== null && v !== undefined && v !== '')
    .map(Number)
    .filter((n) => !Number.isNaN(n));
  const unique = Array.from(new Set(values)).sort((a, b) => b - a);
  return ['All', ...unique];
};

// Safe comparisons (handles "3" vs 3, and trailing spaces / casing).
const sameNumber = (a, b) => Number(a) === Number(b);
const sameText = (a, b) =>
  String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

// Cap how many PdfCard tiles render at once.
const RESULTS_LIMIT = 24;

const TopbarSearch = ({ open, onClose }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
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

  // Lazy-load once on first open; cached for the rest of the session.
  useEffect(() => {
    if (open && documents.length === 0 && !loading) {
      setLoading(true);
      fetchPdfs()
        .then((data) => setDocuments(data || []))
        .finally(() => setLoading(false));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Genre: real data only (comma-separated field).
  const genres = useMemo(() => {
    const dbGenres = documents.flatMap((doc) =>
      doc.genre ? doc.genre.split(',').map((g) => g.trim()) : []
    );
    return ['All', ...new Set(dbGenres.filter(Boolean))];
  }, [documents]);

  // Section & Program: defaults + real data.
  const sectionsList = useMemo(
    () => buildMergedOptionList(documents, 'section', DEFAULT_SECTIONS),
    [documents]
  );
  const programsList = useMemo(
    () => buildMergedOptionList(documents, 'program_course', DEFAULT_PROGRAMS),
    [documents]
  );

  // Year: real data only, newest first.
  const yearsList = useMemo(
    () => buildYearList(documents, 'published_date'),
    [documents]
  );

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
      const matchesSection = selectedSection === 'All' || sameText(doc.section, selectedSection);
      const matchesProgram = selectedProgram === 'All' || sameText(doc.program_course, selectedProgram);
      const matchesYear = selectedYear === 'All' || sameNumber(doc.published_date, selectedYear);
      const matchesMonth = selectedMonth === 'All' || sameNumber(doc.published_month, selectedMonth);
      const matchesDay = selectedDay === 'All' || sameNumber(doc.published_day, selectedDay);

      return matchesSearch && matchesCategory && matchesGenre && matchesSection &&
        matchesProgram && matchesYear && matchesMonth && matchesDay;
    });
  }, [documents, query, category, selectedGenre, selectedSection, selectedProgram, selectedYear, selectedMonth, selectedDay, hasQuery, hasActiveFilter]);

  const visibleResults = results.slice(0, RESULTS_LIMIT);

  const filterSelectSx = {
    bgcolor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
  };

  // Keeps long dropdown lists (sections, programs, days) scrollable.
  const selectMenuProps = {
    SelectProps: { MenuProps: { PaperProps: { sx: { maxHeight: 320 } } } },
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
            <TextField select fullWidth size="small" label="Genre" value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)} sx={filterSelectSx} {...selectMenuProps}>
              {genres.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </TextField>

            <TextField select fullWidth size="small" label="Section" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} sx={filterSelectSx} {...selectMenuProps}>
              {sectionsList.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </TextField>

            <TextField select fullWidth size="small" label="Program" value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)} sx={filterSelectSx} {...selectMenuProps}>
              {programsList.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </TextField>

            <TextField select fullWidth size="small" label="Year" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} sx={filterSelectSx} {...selectMenuProps}>
              {yearsList.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </TextField>

            {/* Month: always January - December */}
            <TextField select fullWidth size="small" label="Month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} sx={filterSelectSx} {...selectMenuProps}>
              <MenuItem value="All">All</MenuItem>
              {MONTH_OPTIONS.map((m) => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </TextField>

            {/* Day: always 1 - 31 */}
            <TextField select fullWidth size="small" label="Day" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} sx={filterSelectSx} {...selectMenuProps}>
              <MenuItem value="All">All</MenuItem>
              {DAY_OPTIONS.map((d) => (
                <MenuItem key={d} value={d}>{d}</MenuItem>
              ))}
            </TextField>
          </Box>
        )}

        {/* Category chips */}
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
            <Box
              sx={{
                display: 'grid',
                gap: { xs: 1, sm: 1.25, md: 1.5 },
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