import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, CircularProgress, Typography, Stack, Chip, useTheme, useMediaQuery, 
  Container, Button, Modal, Fade, Backdrop, Checkbox, FormControlLabel,
  TextField, MenuItem, InputAdornment
} from '@mui/material';
import { supabase } from '../../supabaseClient';

// Icons
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SpeakerNotesOffIcon from '@mui/icons-material/SpeakerNotesOff';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';

const PendingActions = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [monthFilter, setMonthFilter] = useState('');
  const [dayFilter, setDayFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  // --- SELECTION STATE (Select All + individual checkboxes -> bulk delete) ---
  // Only finished requests (APPROVED / REJECTED / CANCELLED) can be selected.
  // PENDING requests must be cancelled first, so they have no checkbox.
  const [selectedIds, setSelectedIds] = useState([]);

  // --- DELETE MODAL STATE ---
  // bulk: false -> delete the single request in `id`; bulk: true -> delete all selected.
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, bulk: false });

  const pageBg = isDarkMode ? '#0f172a' : '#ffffff'; 
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  const headerBg = isDarkMode ? '#0f172a' : '#213C51';
  const borderCol = isDarkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0';

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
  setLoading(true);
  
  const { data: { user } } = await supabase.auth.getUser();
  console.log("Current user:", user); // ADD THIS

  if (user) {
    const { data, error } = await supabase
      .from('delete_requests')
      .select(`id, reason, status, created_at, remarks, pdfs(title)`)
      .eq('requested_by', user.id)
      .order('created_at', { ascending: false });

    console.log("Query result:", { data, error }); // ADD THIS

    if (error) {
      console.error("Error fetching:", error);
    } else {
      setRequests(data.map(req => ({
        ...req,
        status: req.status ? req.status.toUpperCase() : 'PENDING'
      })));
    }
  } else {
    console.log("No user found — auth session missing?"); // ADD THIS
  }
  setLoading(false);
};
  const handleCancelRequest = async (id) => {
    const { error } = await supabase
      .from('delete_requests')
      .update({ status: 'rejected' }) 
      .eq('id', id);

    if (error) {
      alert("Failed to cancel request: " + error.message);
    } else {
      setRequests(requests.map(req => 
        req.id === id ? { ...req, status: 'CANCELLED' } : req
      ));
    }
  };

  // --- SELECTION LOGIC ---
  const deletableRequests = requests.filter((req) => req.status !== 'PENDING');
  const monthOptions = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];
  const dayOptions = Array.from({ length: 31 }, (_, index) => index + 1);
  const requestYears = [...new Set(requests
    .filter((request) => request.created_at)
    .map((request) => new Date(request.created_at).getFullYear())
    .filter(Number.isFinite))].sort((a, b) => b - a);
  const filteredRequests = requests.filter((request) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = [
      request.pdfs?.title,
      request.reason,
      request.remarks,
      request.status
    ].some((value) => value?.toLowerCase().includes(query));
    const matchesStatus = statusFilter === 'All Statuses' || request.status === statusFilter;
    const createdAt = request.created_at ? new Date(request.created_at) : null;
    const matchesMonth = !monthFilter || createdAt?.getMonth() + 1 === Number(monthFilter);
    const matchesDay = !dayFilter || createdAt?.getDate() === Number(dayFilter);
    const matchesYear = !yearFilter || createdAt?.getFullYear() === Number(yearFilter);

    return matchesSearch && matchesStatus && matchesMonth && matchesDay && matchesYear;
  });

  // Drop selections that are gone or became PENDING again.
  useEffect(() => {
    setSelectedIds((prev) => {
      const next = prev.filter((id) => requests.some((r) => r.id === id && r.status !== 'PENDING'));
      return next.length === prev.length ? prev : next;
    });
  }, [requests]);

  const selectedCount = selectedIds.length;
  const allSelected = deletableRequests.length > 0 && deletableRequests.every((r) => selectedIds.includes(r.id));
  const someSelected = selectedCount > 0 && !allSelected;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : deletableRequests.map((r) => r.id));
  };

  const toggleSelected = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const closeDeleteModal = () => setDeleteModal({ open: false, id: null, bulk: false });

  const handleDelete = async () => {
    if (deleteModal.bulk) {
      // Bulk delete operates ONLY on the checked logs.
      const ids = [...selectedIds];
      if (!ids.length) { closeDeleteModal(); return; }

      const { error } = await supabase
        .from('delete_requests')
        .delete()
        .in('id', ids);

      if (error) {
        alert("Failed to delete logs: " + error.message);
      } else {
        setRequests(requests.filter(req => !ids.includes(req.id)));
        setSelectedIds([]);
        closeDeleteModal();
      }
      return;
    }

    const { error } = await supabase
      .from('delete_requests')
      .delete()
      .eq('id', deleteModal.id);

    if (error) {
      alert("Failed to delete log: " + error.message);
    } else {
      setRequests(requests.filter(req => req.id !== deleteModal.id));
      setSelectedIds((prev) => prev.filter((id) => id !== deleteModal.id));
      closeDeleteModal();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'REJECTED': 
      case 'CANCELLED': return 'error';
      default: return 'warning';
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 5 }, bgcolor: pageBg, minHeight: '100vh' }}>
      <Container maxWidth="xls">
        
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h3" sx={{ 
              fontStyle: 'italic', fontWeight: 900, color: isDarkMode ? '#ffffff' : '#213C51', 
              fontFamily: "'Montserrat', sans-serif", fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' }, letterSpacing: '1px'
            }}>
              DELETE REQUEST LOGS
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, display: 'block' }}>
              RECORDS OF DOCUMENT REMOVAL AUTHORIZATIONS
            </Typography>
          </Box>
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
        ) : requests.length === 0 ? (
          <Box sx={{ 
            textAlign: 'center', py: 10, bgcolor: cardBg, borderRadius: 2, 
            border: `1px dashed ${borderCol}`, display: 'flex', flexDirection: 'column', alignItems: 'center' 
          }}>
            <SpeakerNotesOffIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              No pending logs
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              All request histories have been cleared or none exist.
            </Typography>
          </Box>
        ) : (
          <>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              useFlexGap
              flexWrap="wrap"
              sx={{ mb: 3 }}
            >
              <TextField
                placeholder="Search by document, reason, remarks..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                sx={{ flex: '1 1 260px', bgcolor: isDarkMode ? '#28334e' : '#ffffff' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="primary" />
                    </InputAdornment>
                  )
                }}
              />
              <TextField
                select
                label="Status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                sx={{ minWidth: 155, bgcolor: isDarkMode ? '#28334e' : '#ffffff' }}
              >
                {['All Statuses', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((status) => (
                  <MenuItem key={status} value={status}>
                    {status === 'All Statuses' ? status : status.charAt(0) + status.slice(1).toLowerCase()}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Month"
                value={monthFilter}
                onChange={(event) => setMonthFilter(event.target.value)}
                sx={{ minWidth: 145, bgcolor: isDarkMode ? '#28334e' : '#ffffff' }}
              >
                <MenuItem value="">All Months</MenuItem>
                {monthOptions.map((month) => (
                  <MenuItem key={month.value} value={month.value}>{month.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Date"
                value={dayFilter}
                onChange={(event) => setDayFilter(event.target.value)}
                sx={{ minWidth: 125, bgcolor: isDarkMode ? '#28334e' : '#ffffff' }}
              >
                <MenuItem value="">All Dates</MenuItem>
                {dayOptions.map((day) => <MenuItem key={day} value={day}>{day}</MenuItem>)}
              </TextField>
              <TextField
                select
                label="Year"
                value={yearFilter}
                onChange={(event) => setYearFilter(event.target.value)}
                sx={{ minWidth: 125, bgcolor: isDarkMode ? '#28334e' : '#ffffff' }}
              >
                <MenuItem value="">All Years</MenuItem>
                {requestYears.map((year) => <MenuItem key={year} value={year}>{year}</MenuItem>)}
              </TextField>
            </Stack>

            {/* Bulk-selection bar — only appears once something is selected
                (on mobile it stays so the "Select All" checkbox is reachable,
                as long as at least one log is deletable) */}
            {deletableRequests.length > 0 && (isMobile || selectedCount > 0) && (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                sx={{ mb: 2 }}
              >
                {isMobile ? (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={toggleSelectAll}
                      />
                    }
                    label={<Typography variant="body2" fontWeight={700}>Select All ({selectedCount} of {deletableRequests.length} selected)</Typography>}
                  />
                ) : (
                  <Typography variant="body2" fontWeight={700} color="text.secondary">
                    {selectedCount} of {deletableRequests.length} selected
                  </Typography>
                )}
                {selectedCount > 0 && (
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={() => setDeleteModal({ open: true, id: null, bulk: true })}
                    sx={{ borderRadius: '8px', fontWeight: 700, boxShadow: 'none' }}
                  >
                    Delete Selected ({selectedCount})
                  </Button>
                )}
              </Stack>
            )}

            {filteredRequests.length === 0 ? (
              <Box sx={{
                textAlign: 'center', py: 8, bgcolor: cardBg, borderRadius: 2,
                border: `1px dashed ${borderCol}`
              }}>
                <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                  No matching requests
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                  Try changing or clearing your search and filters.
                </Typography>
              </Box>
            ) : isMobile ? (
              <Stack spacing={2}>
                {filteredRequests.map((req) => (
                  <Paper key={req.id} sx={{ 
                    p: 2, borderRadius: 1, bgcolor: cardBg, 
                    borderLeft: `6px solid ${theme.palette[getStatusColor(req.status)].main}`,
                    border: `1px solid ${borderCol}`, boxShadow: 'none'
                  }}>
                    <Stack spacing={1}>
                      {req.status !== 'PENDING' && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: -1, ml: -1 }}>
                          <Checkbox
                            checked={selectedIds.includes(req.id)}
                            onChange={() => toggleSelected(req.id)}
                            inputProps={{ 'aria-label': `Select ${req.pdfs?.title || 'log'}` }}
                          />
                        </Box>
                      )}
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                          {req.pdfs?.title || 'Untitled Document'}
                        </Typography>
                        <Chip label={req.status} color={getStatusColor(req.status)} size="small" />
                      </Stack>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                        "Your Reason: {req.reason}"
                      </Typography>
                      {/* Separate Remarks Box for Mobile */}
                      {req.remarks && (
                        <Box sx={{ mt: 1, p: 1.5, bgcolor: isDarkMode ? 'rgba(239, 68, 68, 0.05)' : '#fff5f5', borderRadius: 1, border: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#feb2b2'}` }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: '#ef4444', display: 'block', textTransform: 'uppercase', mb: 0.5 }}>
                            Remarks
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: isDarkMode ? '#fca5a5' : '#c53030' }}>
                            {req.remarks}
                          </Typography>
                        </Box>
                      )}
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 1, borderTop: `1px solid ${borderCol}` }}>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                          {new Date(req.created_at).toLocaleDateString()}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          {req.status === 'PENDING' ? (
                            <Button 
                              size="small" 
                              color="inherit" 
                              sx={{ fontWeight: 700 }}
                              startIcon={<CloseIcon />}
                              onClick={() => handleCancelRequest(req.id)}
                            >
                              Cancel
                            </Button>
                          ) : (
                            <Button 
                              size="small" 
                              color="error" 
                              sx={{ fontWeight: 700 }}
                              startIcon={<DeleteOutlineIcon />}
                              onClick={() => setDeleteModal({ open: true, id: req.id, bulk: false })}
                            >
                              Delete Log
                            </Button>
                          )}
                        </Stack>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <TableContainer component={Paper} sx={{ bgcolor: cardBg, borderRadius: 1, border: `1px solid ${borderCol}`, boxShadow: 'none' }}>
                <Table>
                  <TableHead sx={{ bgcolor: headerBg }}>
                    <TableRow>
                      <TableCell padding="checkbox" sx={{ width: 48 }}>
                        <Checkbox
                          checked={allSelected}
                          indeterminate={someSelected}
                          onChange={toggleSelectAll}
                          disabled={deletableRequests.length === 0}
                          inputProps={{ 'aria-label': 'Select all deletable logs' }}
                          sx={{
                            color: 'white',
                            '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: 'white' },
                            '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }}>DOCUMENT</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }}>REASON</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }}>REMARKS</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }} align="center">STATUS</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }}>DATE</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }} align="center">ACTIONS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRequests.map((req) => (
                      <TableRow key={req.id} hover selected={selectedIds.includes(req.id)}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedIds.includes(req.id)}
                            onChange={() => toggleSelected(req.id)}
                            disabled={req.status === 'PENDING'}
                            inputProps={{ 'aria-label': `Select ${req.pdfs?.title || 'log'}` }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{req.pdfs?.title}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', maxWidth: 250 }}>{req.reason}</TableCell>
                        {/* Separate Remarks Column for Desktop */}
                        <TableCell sx={{ maxWidth: 250 }}>
                          {req.remarks ? (
                            <Typography variant="body2" sx={{ color: '#ef4444', fontWeight: 600 }}>
                              {req.remarks}
                            </Typography>
                          ) : (
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                              No remarks yet
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={req.status} color={getStatusColor(req.status)} size="small" sx={{ fontWeight: 900, fontSize: '0.65rem' }} />
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>
                          {new Date(req.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            {req.status === 'PENDING' ? (
                              <Button 
                                variant="outlined"
                                size="small" 
                                color="error" 
                                startIcon={<CloseIcon />}
                                sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem' }}
                                onClick={() => handleCancelRequest(req.id)}
                              >
                                Cancel Request
                              </Button>
                            ) : (
                              <Button 
                                variant="text"
                                size="small" 
                                color="error" 
                                startIcon={<DeleteOutlineIcon />}
                                sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem' }}
                                onClick={() => setDeleteModal({ open: true, id: req.id, bulk: false })}
                              >
                                Delete Log
                              </Button>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Container>

      <Modal
        open={deleteModal.open}
        onClose={closeDeleteModal}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{ timeout: 500 }}
      >
        <Fade in={deleteModal.open}>
          <Box sx={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: 400 }, bgcolor: cardBg, p: 4, borderRadius: 2, textAlign: 'center',
            border: `1px solid ${borderCol}`, outline: 'none'
          }}>
            <WarningAmberIcon sx={{ fontSize: 60, color: '#ef4444', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              {deleteModal.bulk ? 'Delete Selected Logs?' : 'Delete Log Entry?'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              {deleteModal.bulk
                ? `This will permanently remove ${selectedCount} selected record(s) from the history.`
                : 'This will permanently remove this record from the history.'}
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button fullWidth onClick={closeDeleteModal}>Cancel</Button>
              <Button fullWidth variant="contained" color="error" onClick={handleDelete}>Delete</Button>
            </Stack>
          </Box>
        </Fade>
      </Modal>
    </Box>
  );
};

export default PendingActions;