import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Card, CardContent, Typography, Avatar, Chip,
  CircularProgress, useTheme, Stack, Divider, Button, Tooltip,
  Select, MenuItem
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import DownloadIcon from '@mui/icons-material/Download';
import PublishIcon from '@mui/icons-material/Publish';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CategoryIcon from '@mui/icons-material/Category';
import PersonIcon from '@mui/icons-material/Person';
import { supabase } from '../../supabaseClient';
import { BookShelf } from '../../shared';
import glclogo from '../../assets/glclogo.png';
import clientbackground from '../../assets/clientbackground.png';

// How many books to load per page in the "Recent Download" and
// "New in the Library" shelves.
const PAGE_SIZE = 8;

// Palette used to color the Favorite Genre donut slices. Reused cyclically
// if the user has more distinct genres than colors.
const GENRE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#ef4444', '#84cc16'];

// How many ranked authors to show in the Favorite Authors leaderboard.
const TOP_AUTHORS_COUNT = 8;

// Rank hierarchy for the Favorite Authors leaderboard (index 0 = #1).
// A single accent (the same blue used everywhere else on this dashboard)
// scaled down in weight per rank, rather than a new color per row. Weights
// taper from 1 (rank 1) down to a floor of 0.4, spread evenly across
// TOP_AUTHORS_COUNT so adding more ranks just adds finer color steps.
const AUTHOR_RANK_WEIGHT_FLOOR = 0.4;
const AUTHOR_RANK_WEIGHTS = Array.from({ length: TOP_AUTHORS_COUNT }, (_, i) => (
  TOP_AUTHORS_COUNT <= 1
    ? 1
    : 1 - (i / (TOP_AUTHORS_COUNT - 1)) * (1 - AUTHOR_RANK_WEIGHT_FLOOR)
));

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

  // ── Recent Download (paginated) ─────────────────────────────────────────
  const [recentDownloads, setRecentDownloads] = useState([]);
  const [downloadsPage, setDownloadsPage] = useState(0);
  const [downloadsTotal, setDownloadsTotal] = useState(0);
  const [downloadsLoading, setDownloadsLoading] = useState(false);

  // ── New in the Library (paginated) ─────────────────────────────────────
  const [newInLibrary, setNewInLibrary] = useState([]);
  const [libraryPage, setLibraryPage] = useState(0);
  const [libraryTotal, setLibraryTotal] = useState(0);
  const [libraryLoading, setLibraryLoading] = useState(false);

  // ── Favorite Genre / Favorite Author ────────────────────────────────────
  // Derived from this user's own download history joined against pdfs.genre
  // and pdfs.author (both columns already exist on the pdfs table).
  const [genreStats, setGenreStats] = useState([]); // [{ genre, count }] desc
  const [authorStats, setAuthorStats] = useState([]); // [{ author, count }] desc

  // Fetch one page of "Recent Download". Dedup (one card per material) is
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

  // Pull every download this user has ever made, joined against the genre
  // and author of the material they downloaded, and aggregate counts on the
  // client. This is intentionally separate from the paginated "Recent
  // Download" query above, since favorites must reflect the user's FULL
  // history, not just the current page.
  const fetchPreferenceStats = useCallback(async (uid) => {
    try {
      const { data, error } = await supabase
        .from('downloads')
        .select('pdfs ( genre, author )')
        .eq('user_id', uid);

      if (error) throw error;

      const genreCounts = {};
      const authorCounts = {};

      (data || []).forEach((row) => {
        const genre = row.pdfs?.genre;
        const author = row.pdfs?.author;
        if (genre) genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        if (author) authorCounts[author] = (authorCounts[author] || 0) + 1;
      });

      setGenreStats(
        Object.entries(genreCounts)
          .map(([genre, count]) => ({ genre, count }))
          .sort((a, b) => b.count - a.count)
      );
      setAuthorStats(
        Object.entries(authorCounts)
          .map(([author, count]) => ({ author, count }))
          .sort((a, b) => b.count - a.count)
      );
    } catch (err) {
      console.error('Error loading favorite genre/author stats:', err);
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

          // Pending requests — includes the reason and admin remarks
          supabase
            .from('upload_requests')
            .select('id, title, author, category, status, created_at, upload_reason, remarks, cover_url')
            .eq('client_id', user.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(6),

          // Raw download timestamps for THIS user only, used to build the
          // "Download Overview" chart below. Never pulls other accounts' data.
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

        // Kick off page 0 of both paginated shelves, plus the favorite
        // genre/author aggregation, in parallel.
        await Promise.all([
          fetchRecentDownloads(user.id, 0),
          fetchNewInLibrary(0),
          fetchPreferenceStats(user.id),
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

  const cardSx = { borderRadius: 1, boxShadow: 2 };

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

  // A single ring in the "Your Goals" card. The ring is a full, solid circle
  // (there is no target to measure progress against) — it's a stat badge,
  // not a percentage claim, so the value shown is always the real count.
  const GoalRing = ({ value, label, color, icon }) => (
    <Stack alignItems="center" spacing={1} sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          variant="determinate"
          value={100}
          size={92}
          thickness={4}
          sx={{ color, '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }}
        />
        <Box
          sx={{
            position: 'absolute', top: 0, left: 0, bottom: 0, right: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {icon}
          <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1 }}>{value}</Typography>
        </Box>
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center' }}>{label}</Typography>
    </Stack>
  );

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

  // Top 6 genres get a donut slice; the rest are still counted in
  // genreStats but not charted, to keep the legend readable.
  const topGenres = genreStats.slice(0, 6).map((g, i) => ({
    id: g.genre,
    value: g.count,
    label: g.genre,
    color: GENRE_COLORS[i % GENRE_COLORS.length],
  }));

  // Top 5 authors for the Favorite Authors leaderboard. Rank hierarchy
  // (badge size, text weight, fill bar) is derived from AUTHOR_RANK_WEIGHTS
  // below, all built off the app's existing blue accent (#3b82f6) so the
  // section doesn't introduce a new color story.
  const topAuthors = authorStats.slice(0, TOP_AUTHORS_COUNT);
  const topAuthorMax = topAuthors[0]?.count || 1;

  return (
    <Box sx={{ bgcolor: isDarkMode ? '#0f172a' : '#f8fafc', minHeight: '100vh', width: '100%', pb: 6 }}>
      <Container maxWidth={false} sx={{ mt: { xs: 2, md: 4 }, px: { xs: 2, sm: 3, md: 5 } }}>

        {/* Welcome banner */}
        <Card
          sx={{
            borderRadius: 2, mb: 3, color: '#fff', boxShadow: 3,
            position: 'relative',
            overflow: 'hidden',
            backgroundImage: `url(${clientbackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Dark gradient overlay so text stays readable over the photo */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(33,60,81,0.88) 0%, rgba(15,23,42,0.55) 100%)',
            }}
          />
          <CardContent sx={{ py: { xs: 3, md: 4 }, position: 'relative', zIndex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 900, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
              Welcome back{fullName ? `, ${fullName}` : ''}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              Here's a summary of your activity on the library.
            </Typography>
          </CardContent>
        </Card>

        {/* ── Two-column dashboard body ──────────────────────────────────────
             Desktop/laptop: Your Goals / Recent Pending / Download Overview
             on the left, Recent Download / Favorite Genre / Favorite Author
             on the right. Tablet/mobile: everything stacks into one column,
             in the same top-to-bottom order. ────────────────────────────── */}
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 2, md: 3 },
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            alignItems: 'stretch',
          }}
        >
          {/* ── LEFT COLUMN ────────────────────────────────────────────── */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 }, minWidth: 0 }}>

            {/* Your Goals */}
            <Card sx={cardSx}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                {sectionHeader('Your Goals')}
                <Stack direction="row" spacing={2} sx={{ py: 1 }}>
                  <GoalRing
                    value={stats.totalDownloads}
                    label="Total Downloads"
                    color="#3b82f6"
                    icon={<DownloadIcon sx={{ fontSize: 18, color: '#3b82f6' }} />}
                  />
                  <GoalRing
                    value={stats.totalRequests}
                    label="Total Material Requests"
                    color="#f59e0b"
                    icon={<PublishIcon sx={{ fontSize: 18, color: '#f59e0b' }} />}
                  />
                </Stack>
              </CardContent>
            </Card>

            {/* Recent Pending Request */}
            <Card sx={cardSx}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                {sectionHeader(
                  'Recent Pending Request',
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

            {/* Download Overview */}
            <Card sx={{ ...cardSx, width: '100%', overflow: 'hidden', flexGrow: 1 }}>
              <Box sx={{
                background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)',
                px: 3, py: 2.5,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: 2,
              }}>
                <Typography variant="subtitle1" fontWeight="800" sx={{ color: '#ffffff', letterSpacing: 0.5 }}>
                  DOWNLOAD OVERVIEW
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
                    fontWeight: 700, borderRadius: '8px', height: 38,
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
          </Box>

          {/* ── RIGHT COLUMN ───────────────────────────────────────────── */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 }, minWidth: 0 }}>

            {/* Recent Download */}
            <Card sx={cardSx}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <BookShelf
                  title="Recent Download"
                  items={recentDownloads}
                  loading={downloadsLoading}
                  page={downloadsPage}
                  total={downloadsTotal}
                  pageSize={PAGE_SIZE}
                  onPrev={() => fetchRecentDownloads(userId, downloadsPage - 1)}
                  onNext={() => fetchRecentDownloads(userId, downloadsPage + 1)}
                  onSeeMore={downloadsTotal > 0 ? () => navigate('/my-downloads') : null}
                  getImageUrl={getStorageImageUrl}
                  fallbackImage={glclogo}
                  caption={(item) => `Downloaded ${timeAgo(item.downloaded_at)}`}
                  empty={
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
                  }
                />
              </CardContent>
            </Card>

            {/* Favorite Genre */}
            <Card sx={cardSx}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                {sectionHeader('Favorite Genre')}
                {topGenres.length > 0 ? (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                    <PieChart
                      series={[{
                        data: topGenres,
                        innerRadius: 38,
                        outerRadius: 68,
                        paddingAngle: 2,
                        cornerRadius: 4,
                      }]}
                      width={168}
                      height={168}
                      slotProps={{ legend: { hidden: true } }}
                    />
                    <Stack spacing={1} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                      {topGenres.map((g) => (
                        <Stack key={g.label} direction="row" alignItems="center" spacing={1}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: g.color, flexShrink: 0 }} />
                          <Typography variant="body2" noWrap sx={{ flex: 1 }}>{g.label}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                            {g.value}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Stack>
                ) : (
                  <Box sx={{ py: 5, textAlign: 'center' }}>
                    <CategoryIcon sx={{ fontSize: 28, color: 'text.disabled', mb: 0.5 }} />
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      No genre data yet
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Favorite Authors — ranked leaderboard, top TOP_AUTHORS_COUNT.
                A single accent (the dashboard's existing blue) scales in
                weight and size by rank instead of introducing new colors.
                Each row's fill width is proportional to that author's share
                of the #1 author's count, so the hierarchy also reads as a
                mini bar chart. Stacks full-width at any viewport, so it's
                responsive by construction rather than relying on wrapping
                chips. */}
            <Card sx={{ ...cardSx, flexGrow: 1, minHeight: 220 }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                {sectionHeader('Favorite Authors')}
                {topAuthors.length > 0 ? (
                  <Stack spacing={1.1}>
                    {topAuthors.map((a, i) => {
                      // Hierarchy is carried entirely by color intensity and
                      // the fill bar here — every row keeps the same
                      // padding, badge size and font size.
                      const weight = AUTHOR_RANK_WEIGHTS[i] ?? 0.4;
                      const fillPct = Math.max(14, Math.round((a.count / topAuthorMax) * 100));
                      const accentAlpha = (v) => `rgba(59,130,246,${v})`;

                      return (
                        <Box
                          key={a.author}
                          sx={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            minWidth: 0,
                            px: 2,
                            py: 1.2,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: accentAlpha(0.15 + weight * 0.35),
                            overflow: 'hidden',
                          }}
                        >
                          {/* Proportional fill representing this author's share */}
                          <Box
                            aria-hidden
                            sx={{
                              position: 'absolute',
                              left: 0, top: 0, bottom: 0,
                              width: `${fillPct}%`,
                              bgcolor: accentAlpha(isDarkMode ? 0.14 : 0.08),
                            }}
                          />

                          {/* Rank badge */}
                          <Box
                            sx={{
                              position: 'relative',
                              zIndex: 1,
                              flexShrink: 0,
                              width: 30,
                              height: 30,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: accentAlpha(0.25 + weight * 0.6),
                              color: '#ffffff',
                              fontWeight: 900,
                              fontSize: '0.85rem',
                            }}
                          >
                            {i + 1}
                          </Box>

                          {/* Author name */}
                          <Tooltip title={a.author}>
                            <Typography
                              noWrap
                              sx={{
                                position: 'relative',
                                zIndex: 1,
                                flex: 1,
                                minWidth: 0,
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                color: isDarkMode ? '#e2e8f0' : '#0f172a',
                              }}
                            >
                              {a.author}
                            </Typography>
                          </Tooltip>

                          {/* Count */}
                          <Typography
                            sx={{
                              position: 'relative',
                              zIndex: 1,
                              flexShrink: 0,
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              color: isDarkMode ? '#93c5fd' : '#1d4ed8',
                            }}
                          >
                            {a.count}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                ) : (
                  <Box sx={{ py: 5, textAlign: 'center' }}>
                    <PersonIcon sx={{ fontSize: 28, color: 'text.disabled', mb: 0.5 }} />
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      No author data yet
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* ── New in the Library — full width, below the two-column body ──── */}
        <Card sx={{ ...cardSx, mt: { xs: 2, md: 3 } }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <BookShelf
              title="New in the Library"
              items={newInLibrary}
              loading={libraryLoading}
              page={libraryPage}
              total={libraryTotal}
              pageSize={PAGE_SIZE}
              onPrev={() => fetchNewInLibrary(libraryPage - 1)}
              onNext={() => fetchNewInLibrary(libraryPage + 1)}
              onSeeMore={() => navigate('/browse')}
              getImageUrl={getStorageImageUrl}
              fallbackImage={glclogo}
              empty={
                <Typography variant="body2" color="text.secondary">
                  No materials available yet.
                </Typography>
              }
            />
          </CardContent>
        </Card>

      </Container>
    </Box>
  );
};

export default UserDashboard;