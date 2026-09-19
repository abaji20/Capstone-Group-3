import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Card, CardContent, Typography, Avatar, Chip,
  CircularProgress, useTheme, useMediaQuery, Stack, Divider, Button, Tooltip, IconButton,
  Select, MenuItem
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import DownloadIcon from '@mui/icons-material/Download';
import PublishIcon from '@mui/icons-material/Publish';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { supabase } from '../../supabaseClient';
import { PdfCard } from '../../shared';
import glclogo from '../../assets/glclogo.png';

// How many cards to show per page in the "Recent Downloads" and
// "New in the Library" shelves.
const PAGE_SIZE = 8;

// ── Image resolution ────────────────────────────────────────────────────
const getStorageImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return supabase.storage.from('pdfs').getPublicUrl(imageUrl).data.publicUrl;
};

// Relative time for the "2d ago" captions.
const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
};

const UserDashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isDarkMode = theme.palette.mode === 'dark';
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  const currentYear = new Date().getFullYear();
  const firstDownloadYear = 2026;

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [fullName, setFullName] = useState('');
  const [stats, setStats] = useState({
    totalDownloads: 0,
    totalRequests: 0,
    recentPendingRequests: [],
  });

  // ── Downloads Graph (user-specific) ─────────────────────────────────────
  const [userDownloadRecords, setUserDownloadRecords] = useState([]);
  const [downloadYear, setDownloadYear] = useState(currentYear);
  const [downloadYears, setDownloadYears] = useState([currentYear]);
  const [monthlyDownloads, setMonthlyDownloads] = useState(Array(12).fill(0));

  // ── Recent Downloads (paginated) ───────────────────────────────────────
  const [recentDownloads, setRecentDownloads] = useState([]);
  const [downloadsPage, setDownloadsPage] = useState(0);
  const [downloadsTotal, setDownloadsTotal] = useState(0);
  const [downloadsLoading, setDownloadsLoading] = useState(false);

  // ── New in the Library (paginated) ─────────────────────────────────────
  const [newInLibrary, setNewInLibrary] = useState([]);
  const [libraryPage, setLibraryPage] = useState(0);
  const [libraryTotal, setLibraryTotal] = useState(0);
  const [libraryLoading, setLibraryLoading] = useState(false);

  // Fetch one page of "Recent Downloads". Dedup (one card per material) is
  // scoped to this page only, so paging keeps the query itself simple and
  // fast — a title could technically reappear on a later page if it was
  // downloaded again further back in time.
  const fetchRecentDownloads = useCallback(async (uid, page) => {
    setDownloadsLoading(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await supabase
        .from('downloads')
        .select('id, downloaded_at, pdfs ( * )', { count: 'exact' })
        .eq('user_id', uid)
        .order('downloaded_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const seen = new Set();
      const deduped = [];
      (data || []).forEach((row) => {
        if (row.pdfs && !seen.has(row.pdfs.id)) {
          seen.add(row.pdfs.id);
          deduped.push({ ...row.pdfs, downloaded_at: row.downloaded_at });
        }
      });

      setRecentDownloads(deduped);
      setDownloadsTotal(count || 0);
      setDownloadsPage(page);
    } catch (err) {
      console.error('Error loading recent downloads:', err);
    } finally {
      setDownloadsLoading(false);
    }
  }, []);

  // Fetch one page of "New in the Library".
  const fetchNewInLibrary = useCallback(async (page) => {
    setLibraryLoading(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await supabase
        .from('pdfs')
        .select('*', { count: 'exact' })
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setNewInLibrary(data || []);
      setLibraryTotal(count || 0);
      setLibraryPage(page);
    } catch (err) {
      console.error('Error loading new-in-library items:', err);
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      try {
        const [
          profileRes,
          downloadsCountRes,
          requestsCountRes,
          recentPendingRes,
          userDownloadRecordsRes,
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single(),

          supabase
            .from('downloads')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),

          supabase
            .from('upload_requests')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', user.id),

          // Pending requests — now includes the reason and admin remarks
          supabase
            .from('upload_requests')
            .select('id, title, author, category, status, created_at, upload_reason, remarks, cover_url')
            .eq('client_id', user.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(5),

          // Raw download timestamps for THIS user only, used to build the
          // "My Downloads" chart below. Never pulls other accounts' data.
          supabase
            .from('downloads')
            .select('downloaded_at')
            .eq('user_id', user.id),
        ]);

        setFullName(profileRes.data?.full_name || '');
        setStats({
          totalDownloads: downloadsCountRes.count || 0,
          totalRequests: requestsCountRes.count || 0,
          recentPendingRequests: recentPendingRes.data || [],
        });
        setUserDownloadRecords(userDownloadRecordsRes.data || []);

        // Kick off page 0 of both paginated shelves in parallel.
        await Promise.all([
          fetchRecentDownloads(user.id, 0),
          fetchNewInLibrary(0),
        ]);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recompute the monthly chart data whenever the selected year changes, or
  // once the user's raw download records arrive. Purely client-side — no
  // refetch needed since we already have every download timestamp for this
  // user.
  useEffect(() => {
    const yearsWithDownloads = userDownloadRecords
      .filter((record) => record.downloaded_at)
      .map((record) => new Date(record.downloaded_at).getFullYear())
      .filter((year) => year >= firstDownloadYear);
    setDownloadYears([...new Set([currentYear, ...yearsWithDownloads])].sort((a, b) => b - a));

    const monthsCount = Array(12).fill(0);
    userDownloadRecords.forEach((record) => {
      if (record.downloaded_at) {
        const date = new Date(record.downloaded_at);
        if (date.getFullYear() === Number(downloadYear)) {
          monthsCount[date.getMonth()] += 1;
        }
      }
    });
    setMonthlyDownloads(monthsCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDownloadRecords, downloadYear]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const statCards = [
    { label: 'Total Downloads', value: stats.totalDownloads, icon: <DownloadIcon />, color: '#3b82f6' },
    { label: 'Total Material Requests', value: stats.totalRequests, icon: <PublishIcon />, color: '#f59e0b' },
  ];

  const equalCardSx = { borderRadius: 2, boxShadow: 2, height: '100%', minHeight: 120, display: 'flex' };
  const equalCardContentSx = {
    display: 'flex', alignItems: 'center', gap: 2, width: '100%',
    p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } },
  };

  // Shared card-grid used by both "Recent Downloads" and "New in the Library",
  // so the two sections read as the same kind of shelf.
  const cardGridSx = {
    display: 'grid',
    gap: { xs: 1.25, sm: 1.5, md: 2 },
    gridTemplateColumns: {
      xs: 'repeat(3, minmax(0, 1fr))',
      sm: 'repeat(4, minmax(0, 1fr))',
      md: 'repeat(6, minmax(0, 1fr))',
      lg: 'repeat(8, minmax(0, 1fr))',
    },
    alignItems: 'stretch',
    '& > div > .MuiCard-root': { width: '100%', minWidth: 0, maxWidth: 'none' },
  };

  // Section header with an optional "View all" on the right. Icon-free —
  // just the title, an optional count chip, and the view-all action.
  const sectionHeader = (title, onViewAll, count) => (
    <>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{title}</Typography>
          {count > 0 && (
            <Chip
              size="small"
              label={count}
              sx={{
                height: 20, fontWeight: 800, fontSize: '0.7rem',
                bgcolor: isDarkMode ? 'rgba(148,163,184,0.16)' : 'rgba(15,23,42,0.06)',
              }}
            />
          )}
        </Stack>
        {onViewAll && (
          <Button
            size="small"
            endIcon={<ArrowForwardIcon />}
            onClick={onViewAll}
            sx={{ fontWeight: 700, textTransform: 'none' }}
          >
            View all
          </Button>
        )}
      </Stack>
      <Divider sx={{ mb: 2 }} />
    </>
  );

  // Prev/Next pager shown under a paginated shelf. `total` is the exact row
  // count from the query so the Next button disables itself correctly on
  // the last page.
  const Pager = ({ page, total, loading: pagerLoading, onPrev, onNext }) => {
    const start = total === 0 ? 0 : page * PAGE_SIZE + 1;
    const end = Math.min((page + 1) * PAGE_SIZE, total);
    const hasPrev = page > 0;
    const hasNext = end < total;

    if (total <= PAGE_SIZE && !hasPrev) return null;

    return (
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {total > 0 ? `${start}–${end} of ${total}` : ''}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {pagerLoading && <CircularProgress size={16} thickness={5} />}
          <IconButton
            size="small"
            onClick={onPrev}
            disabled={!hasPrev || pagerLoading}
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={onNext}
            disabled={!hasNext || pagerLoading}
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            <ArrowForwardIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
    );
  };

  // ── Pending request row pieces ─────────────────────────────────────────
  const pendingColumns = {
    xs: '1fr',
    md: '56px minmax(0, 1.2fr) minmax(0, 1.3fr) minmax(0, 1fr) 150px 140px',
  };

  const headerLabelSx = {
    fontSize: '0.7rem',
    fontWeight: 800,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: isDarkMode ? '#94a3b8' : 'text.secondary',
  };

  const StatusPill = () => (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.8}
      sx={{
        display: 'inline-flex',
        px: 1.3, py: 0.5, borderRadius: 5,
        bgcolor: isDarkMode ? 'rgba(245,158,11,0.16)' : '#fff4e5',
        border: '1px solid',
        borderColor: isDarkMode ? 'rgba(245,158,11,0.4)' : '#ffd8a8',
      }}
    >
      <Box
        sx={{
          width: 7, height: 7, borderRadius: '50%', bgcolor: '#f59e0b',
          animation: 'glcPulse 1.8s ease-in-out infinite',
          '@keyframes glcPulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.25 } },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      />
      <Typography sx={{ fontWeight: 800, fontSize: '0.7rem', color: isDarkMode ? '#fbbf24' : '#b45309' }}>
        Awaiting review
      </Typography>
    </Stack>
  );

  const clamp2 = {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };

  return (
    <Box sx={{ bgcolor: isDarkMode ? '#0f172a' : '#f8fafc', minHeight: '100vh', width: '100%', pb: 6 }}>
      <Container maxWidth={false} sx={{ mt: { xs: 2, md: 4 }, px: { xs: 2, sm: 3, md: 5 } }}>

        {/* Welcome banner */}
        <Card
          sx={{
            borderRadius: 2, mb: 3, color: '#fff', boxShadow: 3,
            background: 'linear-gradient(135deg, #213C51 0%, #3b5f80 100%)',
          }}
        >
          <CardContent sx={{ py: { xs: 3, md: 4 } }}>
            <Typography variant="h5" sx={{ fontWeight: 900, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
             WELCOME BACK{fullName ? `, ${fullName.toUpperCase()}` : ''}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
              Here's a summary of your activity on the library.
            </Typography>
          </CardContent>
        </Card>

        {/* Stat cards */}
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 2, md: 3 },
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
            mb: 3,
          }}
        >
          {statCards.map((card) => (
            <Card key={card.label} sx={equalCardSx}>
              <CardContent sx={equalCardContentSx}>
                <Avatar sx={{ bgcolor: card.color, width: 56, height: 56, flexShrink: 0 }}>
                  {card.icon}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.1, fontSize: { xs: '1.5rem', md: '2rem' } }}>
                    {card.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }} noWrap title={card.label}>
                    {card.label}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* ── My Downloads Graph — user-specific, styled after the SuperAdmin
             dashboard's "Download Overview" chart, but scoped to this
             account's own download activity only ────────────────────────── */}
        <Card sx={{ borderRadius: 2, boxShadow: 2, width: '100%', mb: { xs: 2, md: 3 }, overflow: 'hidden' }}>
          <Box sx={{
            background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)',
            px: 3,
            py: 2.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}>
            <Typography variant="subtitle1" fontWeight="800" sx={{ color: '#ffffff', letterSpacing: 0.5 }}>
              MY DOWNLOAD OVERVIEW
            </Typography>
            <Select
              value={downloadYear}
              onChange={(e) => setDownloadYear(e.target.value)}
              size="small"
              sx={{
                color: '#ffffff',
                bgcolor: 'rgba(255,255,255,0.1)',
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#ffffff' },
                '.MuiSvgIcon-root': { color: '#ffffff' },
                fontWeight: 700,
                borderRadius: '8px',
                height: 38,
              }}
            >
              {downloadYears.map((year) => (
                <MenuItem key={year} value={year}>Year {year}</MenuItem>
              ))}
            </Select>
          </Box>
          <Box sx={{ width: '100%', height: 300, p: { xs: 1, sm: 2 } }}>
            <LineChart
              xAxis={[{ scaleType: 'point', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] }]}
              series={[{ data: monthlyDownloads, color: '#3b82f6', area: true, showMark: true, label: 'My Downloads' }]}
              height={280}
              margin={{ top: 20, bottom: 25, left: 45, right: 25 }}
            />
          </Box>
        </Card>

        {/* ── Recent Pending Requests ──────────────────────────────────────── */}
        <Card sx={{ borderRadius: 2, boxShadow: 2, width: '100%', mb: { xs: 2, md: 3 } }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            {sectionHeader(
              'Recent Pending Requests',
              stats.recentPendingRequests.length > 0 ? () => navigate('/request-upload') : null,
              stats.recentPendingRequests.length,
            )}

            {stats.recentPendingRequests.length > 0 ? (
              <Box>
                {/* Header row — desktop only */}
                <Box
                  sx={{
                    display: { xs: 'none', md: 'grid' },
                    gridTemplateColumns: pendingColumns.md,
                    gap: 1.5, px: 1.5, py: 1, borderRadius: 2,
                    bgcolor: isDarkMode ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.04)',
                  }}
                >
                  <Box />
                  <Typography sx={headerLabelSx}>Target</Typography>
                  <Typography sx={headerLabelSx}>Reason</Typography>
                  <Typography sx={headerLabelSx}>Remarks</Typography>
                  <Typography sx={headerLabelSx}>Status</Typography>
                  <Typography sx={{ ...headerLabelSx, textAlign: 'right' }}>Submitted</Typography>
                </Box>

                <Stack sx={{ mt: 0.5 }}>
                  {stats.recentPendingRequests.map((req) => (
                    <Box
                      key={req.id}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: pendingColumns,
                        gap: { xs: 1, md: 1.5 },
                        alignItems: 'center',
                        px: 1.5,
                        py: { xs: 1.75, md: 1.5 },
                        borderRadius: 2,
                        // amber edge marks the row as still waiting
                        borderLeft: '3px solid',
                        borderColor: isDarkMode ? 'rgba(245,158,11,0.55)' : '#fbbf24',
                        borderBottom: { xs: '1px solid', md: 'none' },
                        borderBottomColor: 'divider',
                        transition: 'background-color 0.15s ease',
                        '&:hover': {
                          bgcolor: isDarkMode ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.035)',
                        },
                      }}
                    >
                      {/* Cover thumbnail */}
                      <Avatar
                        variant="rounded"
                        src={getStorageImageUrl(req.cover_url) || glclogo}
                        sx={{
                          width: 44, height: 56, borderRadius: 2,
                          bgcolor: 'action.hover', flexShrink: 0,
                          display: { xs: 'none', md: 'flex' },
                        }}
                      />

                      {/* Target */}
                      <Box sx={{ minWidth: 0 }}>
                        <Tooltip title={req.title}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                            {req.title}
                          </Typography>
                        </Tooltip>
                        <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {req.author}
                          </Typography>
                          {req.category && (
                            <Chip
                              label={req.category}
                              size="small"
                              sx={{ height: 17, fontSize: '0.62rem', fontWeight: 700, textTransform: 'capitalize' }}
                            />
                          )}
                        </Stack>
                        {/* Status folds under the title on mobile */}
                        <Box sx={{ display: { xs: 'block', md: 'none' }, mt: 1 }}>
                          <StatusPill />
                        </Box>
                      </Box>

                      {/* Reason */}
                      <Box
                        sx={{
                          minWidth: 0,
                          borderLeft: '3px solid',
                          borderColor: isDarkMode ? '#3b82f6' : '#213C51',
                          pl: 1.25,
                          mt: { xs: 1, md: 0 },
                        }}
                      >
                        <Stack direction="row" spacing={0.5} alignItems="flex-start">
                          <FormatQuoteIcon
                            sx={{ fontSize: 14, color: 'text.disabled', transform: 'scaleX(-1)', mt: '2px', flexShrink: 0 }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: '0.82rem',
                              lineHeight: 1.45,
                              color: req.upload_reason ? 'text.primary' : 'text.disabled',
                              fontStyle: req.upload_reason ? 'normal' : 'italic',
                              ...clamp2,
                            }}
                          >
                            {req.upload_reason || 'No reason given'}
                          </Typography>
                        </Stack>
                      </Box>

                      {/* Remarks */}
                      <Stack
                        direction="row"
                        spacing={0.6}
                        alignItems="flex-start"
                        sx={{ minWidth: 0, mt: { xs: 0.75, md: 0 } }}
                      >
                        <ChatBubbleOutlineIcon
                          sx={{ fontSize: 14, color: 'text.disabled', mt: '3px', flexShrink: 0 }}
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: '0.82rem',
                            lineHeight: 1.45,
                            color: req.remarks ? 'text.primary' : 'text.disabled',
                            fontStyle: req.remarks ? 'normal' : 'italic',
                            ...clamp2,
                          }}
                        >
                          {req.remarks || 'Not reviewed yet'}
                        </Typography>
                      </Stack>

                      {/* Status — desktop column */}
                      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                        <StatusPill />
                      </Box>

                      {/* Date */}
                      <Box sx={{ textAlign: { xs: 'left', md: 'right' }, mt: { xs: 0.75, md: 0 } }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                          {formatDate(req.created_at)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {timeAgo(req.created_at)}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>
            ) : (
              <Box sx={{ py: 5, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  No requests waiting
                </Typography>
                <Button
                  size="small"
                  onClick={() => navigate('/request-upload')}
                  sx={{ mt: 1, fontWeight: 700, textTransform: 'none' }}
                >
                  Request an upload
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* ── Recent Downloads — same card shelf as New in the Library ─────── */}
        <Card sx={{ borderRadius: 2, boxShadow: 2, width: '100%', mb: { xs: 2, md: 3 } }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            {sectionHeader(
              'Recent Downloads',
              downloadsTotal > 0 ? () => navigate('/my-downloads') : null,
            )}

            {recentDownloads.length > 0 ? (
              <>
                <Box sx={{ ...cardGridSx, opacity: downloadsLoading ? 0.5 : 1, transition: 'opacity 0.15s ease' }}>
                  {recentDownloads.map((item) => (
                    <Box key={item.id} sx={{ display: 'flex', minWidth: 0, flexDirection: 'column' }}>
                      <PdfCard pdf={item} variant="small" />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 0.75, textAlign: 'center', fontWeight: 600 }}
                      >
                        Downloaded {timeAgo(item.downloaded_at)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Pager
                  page={downloadsPage}
                  total={downloadsTotal}
                  loading={downloadsLoading}
                  onPrev={() => fetchRecentDownloads(userId, downloadsPage - 1)}
                  onNext={() => fetchRecentDownloads(userId, downloadsPage + 1)}
                />
              </>
            ) : (
              <Box sx={{ py: 5, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  Nothing downloaded yet
                </Typography>
                <Button
                  size="small"
                  onClick={() => navigate('/browse')}
                  sx={{ mt: 1, fontWeight: 700, textTransform: 'none' }}
                >
                  Browse the library
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* ── New in the Library ───────────────────────────────────────────── */}
        <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            {sectionHeader(
              'New in the Library',
              () => navigate('/browse'),
            )}

            {newInLibrary.length > 0 ? (
              <>
                <Box sx={{ ...cardGridSx, opacity: libraryLoading ? 0.5 : 1, transition: 'opacity 0.15s ease' }}>
                  {newInLibrary.map((item) => (
                    <Box key={item.id} sx={{ display: 'flex', minWidth: 0 }}>
                      <PdfCard pdf={item} variant="small" />
                    </Box>
                  ))}
                </Box>
                <Pager
                  page={libraryPage}
                  total={libraryTotal}
                  loading={libraryLoading}
                  onPrev={() => fetchNewInLibrary(libraryPage - 1)}
                  onNext={() => fetchNewInLibrary(libraryPage + 1)}
                />
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No materials available yet.
              </Typography>
            )}
          </CardContent>
        </Card>

      </Container>
    </Box>
  );
};

export default UserDashboard;