import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge, IconButton, Popover, Box, Typography, Stack, Button, Divider,
  Chip, Tooltip, ButtonBase, CircularProgress, useTheme
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CloseIcon from '@mui/icons-material/Close';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { supabase } from '../supabaseClient';

// ── Settings ───────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 60000;   // safety-net refresh if realtime is off
const NEW_LIBRARY_DAYS = 7;       // "New in the library" looks this far back
const STATES_TABLE = 'notification_states'; // see notification_states.sql

// Color + icon per notification tone.
const TONES = {
  success: { color: '#16a34a', Icon: CheckCircleOutlineIcon },
  error:   { color: '#dc2626', Icon: HighlightOffIcon },
  warning: { color: '#f59e0b', Icon: DeleteOutlineIcon },
  info:    { color: '#3b82f6', Icon: HourglassEmptyIcon },
  library: { color: '#8b5cf6', Icon: MenuBookIcon },
  role:    { color: '#0ea5e9', Icon: AssignmentIndIcon },
};

// Sections the list is grouped into (in this order), and the filter chips.
const SECTIONS = [
  { key: 'request', label: 'Requests' },
  { key: 'library', label: 'New in the library' },
];

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'request', label: 'Requests' },
  { value: 'library', label: 'Library' },
];

const EMPTY_TITLES = {
  all: "You're all caught up",
  unread: 'No unread notifications',
  request: 'No request updates',
  library: 'Nothing new in the library',
};

// ── Read / dismissed state (stored in Supabase, per user) ──────────────────
// Notification ids include the status (e.g. "upload-12-approved"), so when a
// request changes status it becomes a brand-new, unread notification.

// Old versions kept this in localStorage. Move it to the database once, then
// remove it, so nobody's read history is lost.
const legacyKey = (uid) => `glc_notifications_${uid}`;

const migrateLegacyState = async (uid) => {
  try {
    const saved = JSON.parse(localStorage.getItem(legacyKey(uid)));
    if (!saved) return;

    const rows = new Map();
    (saved.read || []).forEach((id) => rows.set(id, { read: true, dismissed: false }));
    (saved.dismissed || []).forEach((id) => rows.set(id, { read: true, dismissed: true }));

    if (rows.size > 0) {
      const { error } = await supabase.from(STATES_TABLE).upsert(
        Array.from(rows, ([id, flags]) => ({ user_id: uid, notification_id: id, ...flags })),
        { onConflict: 'user_id,notification_id' }
      );
      if (error) return; // keep the local copy and try again next time
    }
    localStorage.removeItem(legacyKey(uid));
  } catch { /* ignore */ }
};

const fetchUiState = async (uid) => {
  const { data, error } = await supabase
    .from(STATES_TABLE)
    .select('notification_id, read, dismissed')
    .eq('user_id', uid);

  if (error) throw error;

  const read = new Set();
  const dismissed = new Set();
  (data || []).forEach((row) => {
    if (row.read) read.add(row.notification_id);
    if (row.dismissed) dismissed.add(row.notification_id);
  });
  return { read, dismissed };
};

// ── Helpers ────────────────────────────────────────────────────────────────
const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Pending items show when they were submitted. Approved / rejected items show
// when the admin reviewed them (reviewed_at, stamped by the database trigger in
// reviewed_at.sql), falling back to older timestamps if that isn't set.
const whenOf = (row) => {
  if (row.status === 'pending') return row.created_at;
  return row.reviewed_at || row.updated_at || row.created_at;
};

const rowsOf = (result) =>
  result.status === 'fulfilled' && !result.value.error ? (result.value.data || []) : [];

// Turns rows from the database into a flat, newest-first notification list.
const buildNotifications = async (uid) => {
  const since = new Date(Date.now() - NEW_LIBRARY_DAYS * 86400000).toISOString();

  const [uploadRes, deleteRes, roleRes, libraryRes] = await Promise.allSettled([
    supabase.from('upload_requests').select('*').eq('client_id', uid)
      .order('created_at', { ascending: false }).limit(20),
    supabase.from('delete_requests').select('*, pdfs ( title )').eq('requested_by', uid).limit(30),
    supabase.from('role_requests').select('*').eq('requested_by', uid)
      .order('created_at', { ascending: false }).limit(5),
    supabase.from('pdfs').select('id, title, author, created_at')
      .eq('is_archived', false).gte('created_at', since)
      .order('created_at', { ascending: false }).limit(5),
  ]);

  const list = [];

  // Upload requests: submitted / approved / rejected
  rowsOf(uploadRes).forEach((req) => {
    const base = { time: whenOf(req), path: '/request-upload', category: 'request' };
    if (req.status === 'approved') {
      list.push({
        ...base, id: `upload-${req.id}-approved`, tone: 'success',
        title: 'Upload approved',
        message: `"${req.title}" was approved and is now in the library.`,
        path: '/browse',
      });
    } else if (req.status === 'rejected') {
      list.push({
        ...base, id: `upload-${req.id}-rejected`, tone: 'error',
        title: 'Upload rejected',
        message: req.remarks ? `"${req.title}": ${req.remarks}` : `"${req.title}" was rejected by the admin.`,
      });
    } else if (req.status === 'pending') {
      list.push({
        ...base, id: `upload-${req.id}-pending`, tone: 'info',
        title: 'Awaiting review',
        message: `"${req.title}" is waiting for admin review.`,
      });
    }
  });

  // Deletion requests: pending / approved / rejected
  rowsOf(deleteRes).forEach((del) => {
    const name = del.pdfs?.title || 'A document';
    const base = { time: whenOf(del), path: '/request-upload', category: 'request' };
    if (del.status === 'approved') {
      list.push({
        ...base, id: `delete-${del.id}-approved`, tone: 'success',
        title: 'Deletion approved', message: `"${name}" was removed from the library.`,
      });
    } else if (del.status === 'rejected') {
      list.push({
        ...base, id: `delete-${del.id}-rejected`, tone: 'error',
        title: 'Deletion rejected',
        message: del.remarks ? `"${name}": ${del.remarks}` : `Your request to delete "${name}" was rejected.`,
      });
    } else if (del.status === 'pending') {
      list.push({
        ...base, id: `delete-${del.id}-pending`, tone: 'warning',
        title: 'Deletion requested', message: `Your request to delete "${name}" is waiting for admin review.`,
      });
    }
  });

  // Role request: only the most recent one matters
  const lastRole = rowsOf(roleRes)[0];
  if (lastRole && lastRole.status !== 'cancelled') {
    const role = lastRole.requested_role || 'a new';
    const base = { time: whenOf(lastRole), path: null, tone: 'role', category: 'request' };
    if (lastRole.status === 'approved') {
      list.push({
        ...base, id: `role-${lastRole.id}-approved`,
        title: 'Role request approved', message: `Your request for ${role} access was approved.`,
      });
    } else if (lastRole.status === 'rejected') {
      list.push({
        ...base, id: `role-${lastRole.id}-rejected`, tone: 'error',
        title: 'Role request rejected',
        message: lastRole.remarks ? lastRole.remarks : `Your request for ${role} access was rejected.`,
      });
    } else if (lastRole.status === 'pending') {
      list.push({
        ...base, id: `role-${lastRole.id}-pending`,
        title: 'Role request pending', message: `Your request for ${role} access is waiting for review.`,
      });
    }
  }

  // New materials in the library
  rowsOf(libraryRes).forEach((pdf) => {
    list.push({
      id: `library-${pdf.id}`, tone: 'library', category: 'library', time: pdf.created_at, path: '/browse',
      title: 'New in the library',
      message: `"${pdf.title}"${pdf.author ? ` by ${pdf.author}` : ''} was just added.`,
    });
  });

  return list.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
};

// ── Component ──────────────────────────────────────────────────────────────
const NotificationBell = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isDarkMode = theme.palette.mode === 'dark';

  const [userId, setUserId] = useState(null);
  const [items, setItems] = useState([]);
  const [ui, setUi] = useState({ read: new Set(), dismissed: new Set() });
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [tab, setTab] = useState('all'); // 'all' | 'unread'

  const open = Boolean(anchorEl);

  // Refresh the notification list (requests, library).
  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setItems(await buildNotifications(userId));
    } catch (err) {
      console.error('Notification load error:', err);
    }
  }, [userId]);

  // Refresh read / dismissed flags (also runs when another device changes them).
  const loadStates = useCallback(async () => {
    if (!userId) return;
    try {
      setUi(await fetchUiState(userId));
    } catch (err) {
      console.error('Notification state load error:', err);
    }
  }, [userId]);

  // Who is signed in? Then load the list and the saved flags together, so the
  // badge never flashes "everything unread" before the flags arrive.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);
      await migrateLegacyState(user.id);

      const [list, states] = await Promise.all([
        buildNotifications(user.id).catch((err) => { console.error(err); return []; }),
        fetchUiState(user.id).catch((err) => { console.error(err); return null; }),
      ]);
      if (cancelled) return;

      if (states) setUi(states);
      setItems(list);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, []);

  // Slow polling as a safety net.
  useEffect(() => {
    if (!userId) return undefined;
    const timer = setInterval(() => { load(); loadStates(); }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [userId, load, loadStates]);

  // Live updates: an admin changes one of this user's requests, or this same
  // account reads / dismisses something on another device.
  // (Needs Realtime enabled for these tables; polling covers it if not.)
  useEffect(() => {
    if (!userId) return undefined;
    let channel;
    try {
      channel = supabase
        .channel(`client-notifications-${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'upload_requests', filter: `client_id=eq.${userId}` }, load)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'delete_requests', filter: `requested_by=eq.${userId}` }, load)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'role_requests', filter: `requested_by=eq.${userId}` }, load)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pdfs' }, load)
        .on('postgres_changes', { event: '*', schema: 'public', table: STATES_TABLE, filter: `user_id=eq.${userId}` }, loadStates)
        .subscribe();
    } catch (err) {
      console.error('Notification realtime error:', err);
    }
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [userId, load, loadStates]);

  // ── Derived lists ────────────────────────────────────────────────────────
  const visible = useMemo(() => items.filter((n) => !ui.dismissed.has(n.id)), [items, ui.dismissed]);
  const unreadCount = useMemo(() => visible.filter((n) => !ui.read.has(n.id)).length, [visible, ui.read]);

  const shown = visible.filter((n) => {
    if (tab === 'all') return true;
    if (tab === 'unread') return !ui.read.has(n.id);
    return n.category === tab; // 'request' | 'library'
  });
  const groups = SECTIONS
    .map((s) => ({ ...s, list: shown.filter((n) => n.category === s.key) }))
    .filter((g) => g.list.length > 0);

  // ── Actions ──────────────────────────────────────────────────────────────
  // The screen updates right away; the database write happens in the background.
  const persist = async (rows) => {
    if (!userId || rows.length === 0) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from(STATES_TABLE).upsert(
      rows.map((r) => ({
        user_id: userId,
        notification_id: r.id,
        read: r.read,
        dismissed: r.dismissed,
        updated_at: now,
      })),
      { onConflict: 'user_id,notification_id' }
    );
    if (error) console.error('Could not save notification state:', error.message);
  };

  const markRead = (id) => {
    if (ui.read.has(id)) return;
    setUi((prev) => ({ ...prev, read: new Set(prev.read).add(id) }));
    persist([{ id, read: true, dismissed: ui.dismissed.has(id) }]);
  };

  const markAllRead = () => {
    const ids = visible.filter((n) => !ui.read.has(n.id)).map((n) => n.id);
    if (ids.length === 0) return;
    setUi((prev) => ({ ...prev, read: new Set([...prev.read, ...ids]) }));
    persist(ids.map((id) => ({ id, read: true, dismissed: false })));
  };

  const dismiss = (id) => {
    setUi((prev) => ({
      read: new Set(prev.read).add(id),
      dismissed: new Set(prev.dismissed).add(id),
    }));
    persist([{ id, read: true, dismissed: true }]);
  };

  const clearAll = () => {
    const ids = visible.map((n) => n.id);
    if (ids.length === 0) return;
    setUi((prev) => ({
      read: new Set([...prev.read, ...ids]),
      dismissed: new Set([...prev.dismissed, ...ids]),
    }));
    persist(ids.map((id) => ({ id, read: true, dismissed: true })));
  };

  const handleOpen = (e) => {
    setAnchorEl(e.currentTarget);
    load(); // always show fresh data when the panel opens
    loadStates();
  };
  const handleClose = () => setAnchorEl(null);

  const handleItemClick = (n) => {
    markRead(n.id);
    if (n.path) {
      handleClose();
      navigate(n.path);
    }
  };

  // ── Styles ───────────────────────────────────────────────────────────────
  const panelBg = isDarkMode ? '#1f2937' : '#ffffff';
  const borderCol = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.1)';
  const headerBg = isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)';
  const sectionLabelSx = {
    px: 2.5, pt: 1.5, pb: 0.5, fontSize: '0.78rem', fontWeight: 800,
    color: 'text.secondary',
  };

  const renderItem = (n) => {
    const tone = TONES[n.tone] || TONES.info;
    const isUnread = !ui.read.has(n.id);
    const { Icon } = tone;

    return (
      <Box
        key={n.id}
        sx={{
          position: 'relative',
          bgcolor: isUnread ? alpha('#3b82f6', isDarkMode ? 0.1 : 0.06) : 'transparent',
          '&:hover': { bgcolor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)' },
          '&:hover .notif-dismiss, &:focus-within .notif-dismiss': { opacity: 1 },
        }}
      >
        <ButtonBase
          component="div"
          onClick={() => handleItemClick(n)}
          sx={{
            width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start',
            gap: 1.5, textAlign: 'left', px: 2.5, py: 1.5, pr: 6,
          }}
        >
          <Box
            sx={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: alpha(tone.color, isDarkMode ? 0.22 : 0.14), color: tone.color,
            }}
          >
            <Icon sx={{ fontSize: 20 }} />
          </Box>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <Typography sx={{ fontWeight: isUnread ? 800 : 700, fontSize: '0.88rem', lineHeight: 1.3 }}>
                {n.title}
              </Typography>
              {isUnread && (
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3b82f6', flexShrink: 0 }} />
              )}
            </Stack>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: '0.82rem', lineHeight: 1.45, mt: 0.25,
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                overflow: 'hidden', overflowWrap: 'anywhere',
              }}
            >
              {n.message}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, display: 'block', mt: 0.5 }}>
              {timeAgo(n.time)}
            </Typography>
          </Box>
        </ButtonBase>

        <Tooltip title="Dismiss">
          <IconButton
            className="notif-dismiss"
            size="small"
            aria-label="Dismiss notification"
            onClick={() => dismiss(n.id)}
            sx={{
              position: 'absolute', top: 8, right: 12,
              opacity: 0, transition: 'opacity 0.15s ease',
              '@media (hover: none)': { opacity: 1 },
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
    );
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          onClick={handleOpen}
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          sx={{
            color: 'white',
            bgcolor: open ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            width: { xs: 40, md: 44 },
            height: { xs: 40, md: 44 },
            '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.2)' },
          }}
        >
          <Badge
            color="error"
            badgeContent={unreadCount}
            max={9}
            overlap="circular"
            sx={{ '& .MuiBadge-badge': { fontWeight: 800, fontSize: '0.65rem', border: '2px solid #213C51' } }}
          >
            <NotificationsNoneIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            mt: 1.5,
            width: 400,
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: 'min(580px, calc(100vh - 110px))',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 3,
            overflow: 'hidden',
            bgcolor: panelBg,
            backgroundImage: 'none',
            border: `1px solid ${borderCol}`,
            boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
          },
        }}
      >
        {/* Header card */}
        <Box sx={{ m: 1.5, mb: 0, p: 2, borderRadius: 2.5, bgcolor: headerBg, flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography sx={{ fontWeight: 900, fontSize: '1.05rem' }}>Notifications</Typography>
              {unreadCount > 0 && (
                <Chip
                  size="small"
                  label={`${unreadCount} new`}
                  sx={{ height: 20, fontWeight: 800, fontSize: '0.68rem', bgcolor: '#3b82f6', color: '#fff' }}
                />
              )}
            </Stack>
            <Button
              size="small"
              startIcon={<DoneAllIcon sx={{ fontSize: 16 }} />}
              onClick={markAllRead}
              disabled={unreadCount === 0}
              sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.78rem' }}
            >
              Mark all as read
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
            {TABS.map((t) => (
              <Chip
                key={t.value}
                label={t.label}
                size="small"
                onClick={() => setTab(t.value)}
                color={tab === t.value ? 'primary' : 'default'}
                variant={tab === t.value ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700 }}
              />
            ))}
          </Stack>
        </Box>

        {/* List (the only part that scrolls) */}
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', py: 0.5 }}>
          {loading ? (
            <Stack alignItems="center" sx={{ py: 6 }}>
              <CircularProgress size={26} />
            </Stack>
          ) : shown.length === 0 ? (
            <Stack alignItems="center" sx={{ py: 6, px: 3, textAlign: 'center' }}>
              <NotificationsNoneIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
              <Typography sx={{ fontWeight: 800, fontSize: '0.92rem' }}>
                {EMPTY_TITLES[tab]}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.82rem' }}>
                Updates on your upload requests and new library materials will show up here.
              </Typography>
            </Stack>
          ) : (
            <>
              {groups.map((g, idx) => {
                const unread = g.list.filter((n) => !ui.read.has(n.id)).length;
                return (
                  <React.Fragment key={g.key}>
                    {idx > 0 && <Divider sx={{ my: 0.5, borderColor: borderCol }} />}
                    <Stack direction="row" alignItems="center" spacing={1} sx={sectionLabelSx}>
                      <span>{g.label}</span>
                      {unread > 0 && (
                        <Chip
                          size="small"
                          label={unread}
                          sx={{ height: 18, fontWeight: 800, fontSize: '0.65rem', bgcolor: '#3b82f6', color: '#fff' }}
                        />
                      )}
                    </Stack>
                    {g.list.map(renderItem)}
                  </React.Fragment>
                );
              })}
            </>
          )}
        </Box>

        {/* Footer */}
        <Divider sx={{ borderColor: borderCol }} />
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 1.5, py: 1, flexShrink: 0 }}>
          <Button
            size="small"
            onClick={() => { handleClose(); navigate('/request-upload'); }}
            sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.8rem' }}
          >
            View my requests
          </Button>
          <Button
            size="small"
            color="inherit"
            onClick={clearAll}
            disabled={visible.length === 0}
            sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.8rem', color: 'text.secondary' }}
          >
            Clear all
          </Button>
        </Stack>
      </Popover>
    </>
  );
};

export default NotificationBell;