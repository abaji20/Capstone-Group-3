import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Typography, CircularProgress, Stack, MenuItem, TextField, 
  InputAdornment, useTheme, useMediaQuery, Container, Card, CardContent,
  Button, IconButton, Dialog, DialogActions, DialogContent, Menu,
  DialogContentText, DialogTitle, Tabs, Tab, Chip,
  Autocomplete, Alert
} from '@mui/material';
import { supabase } from '../../supabaseClient';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Icons
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// ---------------------------------------------------------------------
// Category classification. Every audit_logs row is bucketed into one of
// these sections purely from its action_type / whether it's tied to a
// pdf row, so no schema change is needed — this is UI-side grouping only.
// Order matters: account actions are checked first because some of them
// (e.g. "Edit Account") would otherwise also match the generic "edit"
// check used for documents.
// ---------------------------------------------------------------------
const LOG_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'documents', label: 'Documents' },
  { key: 'requests', label: 'Requests' },
  { key: 'downloads', label: 'Downloads' },
  { key: 'other', label: 'Other' },
];

const getLogCategory = (log) => {
  const action = (log.action_type || '').toLowerCase();
  const hasPdf = Boolean(log.pdfs?.title);

  if (action.includes('download')) return 'downloads';

  if (
    action.includes('account') ||
    action.includes('role') ||
    action.includes('status change')
  ) return 'accounts';

  // Delete-request approvals/rejections, and plain "approved"/"rejected"
  // from upload-request review, both belong under Requests.
  if (action.includes('delete request')) return 'requests';
  if (action === 'approved' || action === 'rejected') return 'requests';

  if (
    hasPdf ||
    action.includes('upload') ||
    action.includes('edit') ||
    action.includes('delete') ||
    action.includes('restore') ||
    action.includes('archive') ||
    action.includes('permanently')
  ) return 'documents';

  return 'other';
};

const startOfWeek = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
};
const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date, amount) => new Date(date.getFullYear(), date.getMonth() + amount, 1);
const pad = (value) => String(value).padStart(2, '0');
const toInputDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const toInputMonth = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
const formatWeekRange = (start) => {
  const end = addDays(start, 6);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
};
const formatMonth = (date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
const formatWeekFileRange = (start) => {
  const end = addDays(start, 6);
  const formatFileDate = (date) => date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).replace(', ', '_').replace(' ', '_');
  return `Week_of_${formatFileDate(start)}_to_${formatFileDate(end)}`;
};

const Logs = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); 

  // --- DARK MODE LAYOUT COLORS ---
  const pageBg = isDarkMode ? '#0f172a' : '#ffffff'; 
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  const inputBg = isDarkMode ? '#28334e' : '#ffffff'; 
  const headerBg = isDarkMode ? '#0f172a' : '#213C51';
  const borderCol = isDarkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0';

  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  // Logs after search/role/date filters but BEFORE the category tab is
  // applied — used only to compute the live count shown on each tab.
  const [preCategoryLogs, setPreCategoryLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('');
  const [dayFilter, setDayFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);

  const [studentReportOpen, setStudentReportOpen] = useState(false);
  const [verifiedAccounts, setVerifiedAccounts] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [reportError, setReportError] = useState('');
  const [exportAnchor, setExportAnchor] = useState(null);
  const [weeklyReportOpen, setWeeklyReportOpen] = useState(false);
  const [weeklyStart, setWeeklyStart] = useState(() => startOfWeek(new Date()));
  const [monthlyReportOpen, setMonthlyReportOpen] = useState(false);
  const [monthlyStart, setMonthlyStart] = useState(() => startOfMonth(new Date()));
  const [yearlyReportOpen, setYearlyReportOpen] = useState(false);
  const [reportYear, setReportYear] = useState(() => new Date().getFullYear());
  const firstLogYear = 2026;
  const currentYear = new Date().getFullYear();
  const currentWeekStart = startOfWeek(new Date());
  const minimumWeekStart = startOfWeek(new Date(firstLogYear, 0, 1));
  const currentMonthStart = startOfMonth(new Date());
  const minimumMonthStart = startOfMonth(new Date(firstLogYear, 0, 1));

  useEffect(() => { fetchLogs(); }, []);
  useEffect(() => { applyFilters(); }, [logs, searchTerm, roleFilter, monthFilter, dayFilter, yearFilter, activeCategory]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          user_id,
          action_type, 
          created_at, 
          description,
          pdfs(title),
          profiles!audit_logs_user_id_fkey1(full_name, role, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let tempLogs = [...logs];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      tempLogs = tempLogs.filter(log => 
        log.profiles?.full_name?.toLowerCase().includes(term) ||
        log.pdfs?.title?.toLowerCase().includes(term) ||
        log.action_type?.toLowerCase().includes(term) ||
        log.description?.toLowerCase().includes(term)
      );
    }
    if (roleFilter !== 'All') {
      // Keeps internal database value comparison ('client') intact
      tempLogs = tempLogs.filter(log => log.profiles?.role?.toLowerCase() === roleFilter.toLowerCase());
    }
    if (monthFilter || dayFilter || yearFilter) {
      tempLogs = tempLogs.filter(log => {
        const logDate = log.created_at ? new Date(log.created_at) : null;
        return (!monthFilter || logDate?.getMonth() + 1 === Number(monthFilter)) &&
          (!dayFilter || logDate?.getDate() === Number(dayFilter)) &&
          (!yearFilter || logDate?.getFullYear() === Number(yearFilter));
      });
    }

    // Snapshot before the category tab narrows things further, so each
    // tab's count reflects the current search/role/date filters.
    setPreCategoryLogs(tempLogs);

    if (activeCategory !== 'all') {
      tempLogs = tempLogs.filter(log => getLogCategory(log) === activeCategory);
    }

    setFilteredLogs(tempLogs);
  };

  // Count of logs per category, computed from preCategoryLogs so the
  // numbers on the tabs stay in sync with search/role/date filters.
  const categoryCounts = useMemo(() => {
    const counts = { all: preCategoryLogs.length, accounts: 0, documents: 0, requests: 0, downloads: 0, other: 0 };
    preCategoryLogs.forEach(log => {
      const cat = getLogCategory(log);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [preCategoryLogs]);

  // --- PAGINATION (20 per page, same pattern as ManageAccount.jsx) ---
  const logsPerPage = 20;
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, monthFilter, dayFilter, yearFilter, activeCategory]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const getTargetName = (log) => {
    if (log.pdfs?.title) return log.pdfs.title;
    const desc = String(log.description || '').trim();
    if (desc.includes(': ')) return desc.split(': ').pop().trim();
    const accountTarget = desc.match(/(?:account|role request|profile)\s+for\s+(.+?)(?:\. Reason:.*)?$/i);
    if (accountTarget) return accountTarget[1].trim().replace(/[.!]+$/, '');
    const genericTarget = desc.match(/\bfor\s+(.+?)(?:\. Reason:.*)?$/i);
    if (genericTarget) return genericTarget[1].trim().replace(/[.!]+$/, '');
    return "—";
  };

  const drawLogsPdf = (reportLogs, title, subtitle, fileName) => {
    const sortedLogs = [...reportLogs].sort((a, b) => (
      new Date(b.created_at || 0) - new Date(a.created_at || 0)
    ));
    const doc = new jsPDF({ orientation: 'landscape' });
    const generatedAt = new Date().toLocaleString();

    doc.setFillColor(33, 60, 81);
    doc.rect(0, 0, 297, 29, 'F');
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 29, 297, 2.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(15);
    doc.text(title, 14, 15);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    if (subtitle) doc.text(subtitle, 14, 22);
    doc.text(`Generated: ${generatedAt}`, 283, 22, { align: 'right' });

    let nextY = subtitle ? 38 : 35;
    const categories = LOG_CATEGORIES.filter((category) => category.key !== 'all');
    categories.forEach((category) => {
      const categoryLogs = sortedLogs.filter((log) => getLogCategory(log) === category.key);
      if (!categoryLogs.length) return;
      if (nextY > 175) {
        doc.addPage();
        nextY = 20;
      }

      doc.setFont(undefined, 'bold');
      doc.setFontSize(10);
      doc.setTextColor(33, 60, 81);
      doc.text(`${category.label.toUpperCase()} (${categoryLogs.length})`, 14, nextY);
      doc.setFont(undefined, 'normal');
      autoTable(doc, {
        startY: nextY + 3,
        head: [['Date & Time', 'Performed By', 'Role', 'Action', 'Target', 'Details']],
        body: categoryLogs.map((log) => [
          log.created_at ? new Date(log.created_at).toLocaleString() : '—',
          log.profiles?.full_name || log.profiles?.email || 'Unknown account',
          log.profiles?.role === 'client' ? 'User' : (log.profiles?.role || 'N/A'),
          (log.action_type || 'N/A').replace(/client/gi, 'user'),
          getTargetName(log).replace(/client/gi, 'user'),
          (log.description || '—').replace(/client/gi, 'user'),
        ]),
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [33, 60, 81], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [244, 247, 250] },
        theme: 'grid',
        margin: { top: 18, left: 14, right: 14, bottom: 16 },
      });
      nextY = doc.lastAutoTable.finalY + 10;
    });

    if (!sortedLogs.length) {
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('No activity logs match the selected account or current filters.', 14, nextY + 5);
    }

    const totalPages = doc.internal.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 198, 283, 198);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Generated ${generatedAt}`, 14, 203);
      doc.text(`Page ${page} of ${totalPages}`, 283, 203, { align: 'right' });
    }
    doc.save(fileName);
  };

  const openIndividualReport = async () => {
    setStudentReportOpen(true);
    setSelectedAccount(null);
    setVerifiedAccounts([]);
    setReportError('');
    setStudentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, id_number, department, year_level, role')
        .eq('is_confirm', true)
        .eq('is_archived', false)
        .order('full_name', { ascending: true });
      if (error) throw error;
      setVerifiedAccounts(data || []);
    } catch (error) {
      console.error('Error loading verified students for log report:', error);
      setReportError('Unable to load verified student accounts. Please try again.');
    } finally {
      setStudentsLoading(false);
    }
  };

  const generateStudentLogsPdf = () => {
    if (!selectedAccount) return;
    setReportError('');

    const accountName = selectedAccount.full_name || selectedAccount.email || 'Selected account';
    const matchingLogs = logs.filter((log) => (
      log.user_id === selectedAccount.id ||
      String(log.description || '').toLocaleLowerCase().includes(accountName.toLocaleLowerCase())
    ));
    const fileName = accountName.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');
    drawLogsPdf(
      matchingLogs,
      'INDIVIDUAL ACCOUNT ACTIVITY LOG REPORT',
      `Account: ${accountName}  |  ${selectedAccount.email || 'No email'}  |  Role: ${selectedAccount.role || 'N/A'}  |  ID: ${selectedAccount.id_number || 'N/A'}  |  Department: ${selectedAccount.department || 'N/A'}  |  Year Level: ${selectedAccount.year_level || 'N/A'}`,
      `Individual_Activity_Logs_${fileName || 'account'}.pdf`
    );
    setStudentReportOpen(false);
  };

  const exportLogsForRange = (start, end, title, fileName) => {
    const startTime = start.getTime();
    const endTime = end.getTime();
    const reportLogs = logs.filter((log) => {
      const createdAt = log.created_at ? new Date(log.created_at).getTime() : NaN;
      return Number.isFinite(createdAt) && createdAt >= startTime && createdAt < endTime;
    });
    drawLogsPdf(reportLogs, title, `Date range: ${start.toLocaleDateString()} – ${new Date(end.getTime() - 1).toLocaleDateString()}  |  Entries: ${reportLogs.length}`, fileName);
  };

  const handleJumpWeek = (event) => {
    if (!event.target.value) return;
    const selectedDate = new Date(`${event.target.value}T00:00:00`);
    const selectedWeek = startOfWeek(selectedDate);
    if (selectedWeek > currentWeekStart || selectedWeek < minimumWeekStart) return;
    setWeeklyStart(selectedWeek);
  };

  const handleJumpMonth = (event) => {
    if (!event.target.value) return;
    const [year, month] = event.target.value.split('-').map(Number);
    const selectedMonth = new Date(year, month - 1, 1);
    if (selectedMonth > currentMonthStart || selectedMonth < minimumMonthStart) return;
    setMonthlyStart(selectedMonth);
  };

  const canGoNextWeek = addDays(weeklyStart, 7) <= currentWeekStart;
  const canGoPrevWeek = addDays(weeklyStart, -7) >= minimumWeekStart;
  const canGoNextMonth = addMonths(monthlyStart, 1) <= currentMonthStart;
  const canGoPrevMonth = addMonths(monthlyStart, -1) >= minimumMonthStart;
  const canGoNextYear = reportYear < currentYear;
  const canGoPrevYear = reportYear > firstLogYear;
  const shiftWeek = (direction) => {
    const next = addDays(weeklyStart, direction * 7);
    if (next <= currentWeekStart && next >= minimumWeekStart) setWeeklyStart(next);
  };
  const shiftMonth = (direction) => {
    const next = addMonths(monthlyStart, direction);
    if (next <= currentMonthStart && next >= minimumMonthStart) setMonthlyStart(next);
  };
  const shiftYear = (direction) => {
    const next = reportYear + direction;
    if (next >= firstLogYear && next <= currentYear) setReportYear(next);
  };

  const handleOpenWeeklyExport = () => {
    setExportAnchor(null);
    setWeeklyStart(startOfWeek(new Date()));
    setWeeklyReportOpen(true);
  };
  const handleOpenMonthlyExport = () => {
    setExportAnchor(null);
    setMonthlyStart(startOfMonth(new Date()));
    setMonthlyReportOpen(true);
  };
  const handleOpenYearlyExport = () => {
    setExportAnchor(null);
    setReportYear(currentYear);
    setYearlyReportOpen(true);
  };

 const getActionStyles = (action, darkMode) => { 
  const type = action?.toLowerCase();

  if (darkMode) {
    if (type?.includes('upload')) return { bg: 'transparent', text: '#4ade80', label: 'UPLOAD' };
    if (type?.includes('approved')) return { bg: 'transparent', text: '#4ade80', label: 'APPROVED' };
    if (type?.includes('rejected')) return { bg: 'transparent', text: '#f87171', label: 'REJECTED' };
    if (type?.includes('edit')) return { bg: 'transparent', text: '#facc15', label: 'EDIT' }; 
    if (type?.includes('delete')) return { bg: 'transparent', text: '#f87171', label: 'DELETE' };
    if (type?.includes('download')) return { bg: 'transparent', text: '#6171ff', label: 'DOWNLOAD' };
    if (type?.includes('create')) return { bg: 'transparent', text: '#01a8f0', label: 'CREATE' };
    if (type?.includes('request')) return { bg: 'transparent', text: '#fdfdff', label: 'REQUEST' };
    
    // --- NEW ARCHIVE ACTIONS (DARK MODE) ---
    if (type?.includes('restore')) return { bg: 'transparent', text: '#0ea5e9', label: 'RESTORED' };
    if (type?.includes('permanently')) return { bg: 'transparent', text: '#f87171', label: 'PURGED' };

    return { bg: 'transparent', text: '#94a3b8', label: action?.toUpperCase() };
  } else {
    if (type?.includes('upload')) return { bg: '#2F6B3F', text: '#FBF6F6', label: 'UPLOAD' };
    if (type?.includes('approved')) return { bg: '#2F6B3F', text: '#FBF6F6', label: 'APPROVED' };
    if (type?.includes('rejected')) return { bg: '#A82323', text: '#ffffff', label: 'REJECTED' };
    if (type?.includes('edit')) return { bg: '#ffd500', text: '#7c6800', label: 'EDIT' }; 
    if (type?.includes('delete')) return { bg: '#A82323', text: '#ffffff', label: 'DELETE' };
    if (type?.includes('download')) return { bg: '#261CC1', text: '#ffffff', label: 'DOWNLOAD' };
    if (type?.includes('create')) return { bg: '#003052', text: '#ffffff', label: 'CREATE' };
    if (type?.includes('request')) return { bg: '#261CC1', text: '#fdfdff', label: 'REQUEST' };

    // --- NEW ARCHIVE ACTIONS (LIGHT MODE) ---
    if (type?.includes('restore')) return { bg: '#195983', text: '#ffffff', label: 'RESTORED' };
    if (type?.includes('permanently')) return { bg: '#fee2e2', text: '#b91c1c', label: 'PURGED' };

    return { bg: '#f1f5f9', text: '#475569', label: action?.toUpperCase() };
  }
};

  const getRoleStyles = (role, darkMode) => {
    const r = role?.toLowerCase();
    if (darkMode) {
        if (r === 'superadmin') return { bg: '#f3e8ff1a', text: '#d8b4fe' }; 
        if (r === 'admin') return { bg: '#fef3c71a', text: '#fbbf24' }; 
        if (r === 'client') return { bg: '#dbeafe1a', text: '#60a5fa' }; 
        return { bg: '#1e293b', text: '#94a3b8' };
    } else {
        if (r === 'superadmin') return { bg: '#F3E8FF', text: '#7C3AED' }; 
        if (r === 'admin') return { bg: '#FEF3C7', text: '#D97706' }; 
        if (r === 'client') return { bg: '#DBEAFE', text: '#2563EB' }; 
        return { bg: '#F1F5F9', text: '#475569' };
    }
  };

  const ActionButton = ({ action }) => {
    const style = getActionStyles(action, isDarkMode);
    return (
      <Box sx={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '120px', py: 0.5 , borderRadius: '4px', fontWeight: 800, fontSize: '0.7rem',
          bgcolor: style.bg,
          color: style.text,
          border: isDarkMode ? `1px solid ${style.text}` : 'none',
        }}>
        {style.label}
      </Box>
    );
  };

  const RoleChip = ({ role }) => {
    const style = getRoleStyles(role, isDarkMode);
    // Display "USER" instead of "CLIENT" in the UI badge/chip
    const displayRole = role?.toLowerCase() === 'client' ? 'USER' : (role?.toUpperCase() || 'USER');
    return (
      <Box sx={{ 
        px: 1.5, py: 0.4, borderRadius: 0.5, 
        fontSize: '0.65rem', fontWeight: 900, 
        bgcolor: style.bg, color: style.text, display: 'inline-flex', 
        justifyContent: 'center', minWidth: '100px'
      }}>
        {displayRole}
      </Box>
    );
  };

  const monthOptions = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];
  const dayOptions = Array.from({ length: 31 }, (_, index) => index + 1);
  const logYears = [...new Set(logs
    .filter(log => log.created_at)
    .map(log => new Date(log.created_at).getFullYear()))].sort((a, b) => b - a);

  return (
    <Box sx={{ p: { xs: 2, md: 5 }, bgcolor: pageBg, minHeight: '100vh' }}>
      <Container maxWidth="xls">
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          justifyContent="space-between" 
          alignItems={{ xs: 'flex-start', sm: 'center' }} 
          spacing={2}
          mb={3}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box>
              <Typography 
                variant="h3" 
                fontWeight="900" 
                sx={{ 
                  fontStyle: 'italic',
                  color: isDarkMode ? '#ffffff' : '#213C51', 
                  fontFamily: "'Montserrat', sans-serif", 
                  fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
                  letterSpacing: '1px'
                }}
              >
                ACTIVITY LOGS
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, display: 'block' }}>
                SUPERADMIN MASTER AUDIT TRAIL
              </Typography>
            </Box>
          </Stack>
          <Box>
            <Button
              variant="contained"
              startIcon={<PictureAsPdfIcon />}
              onClick={(event) => setExportAnchor(event.currentTarget)}
              disabled={loading}
              sx={{
                bgcolor: '#213C51',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.95rem',
                borderRadius: '10px',
                px: 3,
                py: 1.25,
                minHeight: 48,
                boxShadow: '0 4px 14px rgba(33, 60, 81, 0.25)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': { bgcolor: '#162836', transform: 'translateY(-2px)' },
              }}
            >
              Export Logs
            </Button>
            <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}>
              <MenuItem onClick={() => {
                setExportAnchor(null);
                drawLogsPdf(filteredLogs, 'ACTIVITY LOG REPORT', `Filtered log entries: ${filteredLogs.length}`, 'Activity_Logs_Report.pdf');
              }}>
                Export Logs PDF
              </MenuItem>
              <MenuItem onClick={handleOpenWeeklyExport}>Export Weekly Logs PDF</MenuItem>
              <MenuItem onClick={handleOpenMonthlyExport}>Export Monthly Logs PDF</MenuItem>
              <MenuItem onClick={handleOpenYearlyExport}>Export Yearly Logs PDF</MenuItem>
              <MenuItem onClick={() => {
                setExportAnchor(null);
                openIndividualReport();
              }}>
                Export Individual Logs PDF
              </MenuItem>
            </Menu>
          </Box>
        </Stack>

        {/* CATEGORY TABS — groups the flat audit_logs stream into Accounts,
            Documents, Requests and Downloads sections. Counts respect the
            current search/role/date filters below. The selected-tab
            underline indicator is hidden (display: none) per request. */}
        <Tabs
          value={activeCategory}
          onChange={(e, v) => setActiveCategory(v)}
          variant="scrollable"
          scrollButtons="auto"
          TabIndicatorProps={{ sx: { display: 'none' } }}
          sx={{
            mb: 3,
            borderBottom: `1px solid ${borderCol}`,
            '& .MuiTab-root': {
              fontWeight: 800,
              fontSize: '0.85rem',
              textTransform: 'none',
              minHeight: 44,
              color: isDarkMode ? 'rgba(255,255,255,0.55)' : '#64748b',
            },
            '& .Mui-selected': { color: '#3b82f6 !important' },
          }}
        >
          {LOG_CATEGORIES.map((cat) => (
            <Tab
              key={cat.key}
              value={cat.key}
              label={
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <span>{cat.label}</span>
                  <Chip
                    label={categoryCounts[cat.key] || 0}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      bgcolor: activeCategory === cat.key ? '#3b82f6' : (isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
                      color: activeCategory === cat.key ? '#ffffff' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#475569'),
                      '& .MuiChip-label': { px: 0.7 },
                    }}
                  />
                </Stack>
              }
            />
          ))}
        </Tabs>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4 }}>
          <TextField 
            fullWidth 
            placeholder="Search all activities..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            sx={{ flexGrow: 1, bgcolor: inputBg, borderRadius: 0.5 }}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="secondary" /></InputAdornment>) }}
          />
          
          <TextField select size="medium" label="Month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} sx={{ minWidth: 145, bgcolor: inputBg, borderRadius: 0.5 }}>
            <MenuItem value="">All Months</MenuItem>
            {monthOptions.map((month) => <MenuItem key={month.value} value={month.value}>{month.label}</MenuItem>)}
          </TextField>

          <TextField select size="medium" label="Date" value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} sx={{ minWidth: 125, bgcolor: inputBg, borderRadius: 0.5 }}>
            <MenuItem value="">All Dates</MenuItem>
            {dayOptions.map((day) => <MenuItem key={day} value={day}>{day}</MenuItem>)}
          </TextField>

          <TextField select size="medium" label="Year" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} sx={{ minWidth: 125, bgcolor: inputBg, borderRadius: 0.5 }}>
            <MenuItem value="">All Years</MenuItem>
            {logYears.map((year) => <MenuItem key={year} value={year}>{year}</MenuItem>)}
          </TextField>

          <TextField 
            select 
            size="medium" 
            label="Filter Role" 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)} 
            sx={{ minWidth: 200, bgcolor: inputBg, borderRadius: 0.5 }}
          >
            <MenuItem value="All">All Roles</MenuItem>
            <MenuItem value="superadmin">Superadmin</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            {/* UI option displays "User", but sends 'client' to match database value */}
            <MenuItem value="client">User</MenuItem>
          </TextField>
        </Stack>

        {/* LOADING & EMPTY STATE LOGIC INTEGRATED HERE */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress color="secondary" />
          </Box>
        ) : filteredLogs.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 10 }}>
            <AssignmentLateIcon sx={{ fontSize: 60, color: 'text.disabled', opacity: 0.3, mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
              No Activity Logs Found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search or filters to find specific records.
            </Typography>
          </Box>
        ) : (
          <>
            {!isMobile ? (
              <TableContainer component={Paper} sx={{ bgcolor: cardBg, borderRadius: 1, border: `1px solid ${borderCol}`, boxShadow: 'none' }}>
                <Table>
                  <TableHead sx={{ bgcolor: headerBg }}>
                    <TableRow>
                      <TableCell sx={{ color: 'white', fontWeight: 800, width: '250px' }}>PERFORMED BY</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800, width: '150px' }} align="center">ROLE</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }} align="center">ACTION</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }}>TARGET</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }}>DETAILS</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 800 }}>DATE</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedLogs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell sx={{ width: '250px' }}>
                            <Stack spacing={0}>
                                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem'}}>
                                {log.profiles?.full_name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                {log.profiles?.email}
                                </Typography>
                            </Stack>
                        </TableCell>  
                        <TableCell align="center" sx={{ width: '150px' }}>
                          <RoleChip role={log.profiles?.role} />
                        </TableCell>
                        <TableCell align="center">
                          <ActionButton action={log.action_type} />
                        </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {getTargetName(log).replace(/client/gi, 'user')}
                      </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                          {/* Safely displays description with client-to-user terminology update in UI text */}
                          {log.description ? log.description.replace(/client/gi, 'user') : ''}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{new Date(log.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Stack spacing={2}>
                {paginatedLogs.map((log) => (
                  <Card key={log.id} sx={{ bgcolor: cardBg, borderRadius: 1, border: `1px solid ${borderCol}`, boxShadow: 'none' }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                        <Stack direction="column" spacing={0.5}>
                            <Typography sx={{ fontWeight: 700 }}>{log.profiles?.full_name}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.80rem', lineHeight: 1 }}>
                                {log.profiles?.email}
                            </Typography> 
                            <RoleChip role={log.profiles?.role} />  
                        </Stack>
                      </Stack>
                      <Stack spacing={2}>
                        <Box><Typography variant="caption" color="text.secondary" fontWeight={700}>ACTION</Typography><br/><ActionButton action={log.action_type} /></Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={700}>TARGET</Typography>
                          <Typography variant="body2" fontWeight={800} color="secondary">{getTargetName(log)}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={700}>DETAILS</Typography>
                          <Typography variant="body2" color="text.secondary" fontSize="0.85rem">
                            {log.description ? log.description.replace(/client/gi, 'user') : '—'}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}

            {totalPages > 1 && (
              <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center" sx={{ mt: 3, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  onClick={() => setCurrentPage((page) => page - 1)}
                  disabled={currentPage === 1}
                  sx={{ minWidth: 72, fontWeight: 700, textTransform: 'none' }}
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <Button
                    key={page}
                    size="small"
                    onClick={() => setCurrentPage(page)}
                    variant={currentPage === page ? 'contained' : 'text'}
                    sx={{ minWidth: 32, fontWeight: 700 }}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  size="small"
                  onClick={() => setCurrentPage((page) => page + 1)}
                  disabled={currentPage === totalPages}
                  sx={{ minWidth: 55, fontWeight: 700, textTransform: 'none' }}
                >
                  Next
                </Button>
              </Stack>
            )}
          </>
        )}

        <Dialog open={weeklyReportOpen} onClose={() => setWeeklyReportOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Export Weekly Logs</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Choose a week (Monday to Sunday). Future weeks can't be selected.
            </DialogContentText>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <IconButton onClick={() => shiftWeek(-1)} disabled={!canGoPrevWeek}><HistoryIcon /></IconButton>
              <Box sx={{ textAlign: 'center' }}>
                <Typography fontWeight={800}>{formatWeekRange(weeklyStart)}</Typography>
                {weeklyStart.getTime() === currentWeekStart.getTime() && (
                  <Typography variant="caption" color="text.secondary">Current week</Typography>
                )}
              </Box>
              <IconButton onClick={() => shiftWeek(1)} disabled={!canGoNextWeek}><HistoryIcon /></IconButton>
            </Stack>
            <TextField
              type="date"
              size="small"
              fullWidth
              label="Jump to date"
              InputLabelProps={{ shrink: true }}
              value={toInputDate(weeklyStart)}
              onChange={handleJumpWeek}
              inputProps={{ min: `${firstLogYear}-01-01`, max: toInputDate(new Date()) }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setWeeklyReportOpen(false)} color="inherit">Cancel</Button>
            <Button
              onClick={() => {
                setWeeklyReportOpen(false);
                exportLogsForRange(
                  weeklyStart,
                  addDays(weeklyStart, 7),
                  `WEEKLY ACTIVITY LOG REPORT - ${formatWeekRange(weeklyStart)}`,
                  `${formatWeekFileRange(weeklyStart)}_Activity_Logs.pdf`
                );
              }}
              variant="contained"
              sx={{ bgcolor: '#213C51', color: '#ffffff', fontWeight: 700 }}
            >
              Export PDF
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={monthlyReportOpen} onClose={() => setMonthlyReportOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Export Monthly Logs</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Choose a month. Future months can't be selected.
            </DialogContentText>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <IconButton onClick={() => shiftMonth(-1)} disabled={!canGoPrevMonth}><HistoryIcon /></IconButton>
              <Box sx={{ textAlign: 'center' }}>
                <Typography fontWeight={800}>{formatMonth(monthlyStart)}</Typography>
                {monthlyStart.getTime() === currentMonthStart.getTime() && (
                  <Typography variant="caption" color="text.secondary">Current month</Typography>
                )}
              </Box>
              <IconButton onClick={() => shiftMonth(1)} disabled={!canGoNextMonth}><HistoryIcon /></IconButton>
            </Stack>
            <TextField
              type="month"
              size="small"
              fullWidth
              label="Jump to month"
              InputLabelProps={{ shrink: true }}
              value={toInputMonth(monthlyStart)}
              onChange={handleJumpMonth}
              inputProps={{ min: toInputMonth(minimumMonthStart), max: toInputMonth(currentMonthStart) }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setMonthlyReportOpen(false)} color="inherit">Cancel</Button>
            <Button
              onClick={() => {
                setMonthlyReportOpen(false);
                exportLogsForRange(
                  monthlyStart,
                  addMonths(monthlyStart, 1),
                  `MONTHLY ACTIVITY LOG REPORT - ${formatMonth(monthlyStart)}`,
                  `Monthly_Activity_Logs_${formatMonth(monthlyStart).replace(' ', '_')}.pdf`
                );
              }}
              variant="contained"
              sx={{ bgcolor: '#213C51', color: '#ffffff', fontWeight: 700 }}
            >
              Export PDF
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={yearlyReportOpen} onClose={() => setYearlyReportOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Export Yearly Logs</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Choose a year. Future years can't be selected.
            </DialogContentText>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <IconButton onClick={() => shiftYear(-1)} disabled={!canGoPrevYear}><ChevronLeftIcon /></IconButton>
              <Box sx={{ textAlign: 'center' }}>
                <Typography fontWeight={800}>{reportYear}</Typography>
                {reportYear === currentYear && (
                  <Typography variant="caption" color="text.secondary">Current year</Typography>
                )}
              </Box>
              <IconButton onClick={() => shiftYear(1)} disabled={!canGoNextYear}><ChevronRightIcon /></IconButton>
            </Stack>
            <TextField
              select
              size="small"
              fullWidth
              label="Jump to year"
              value={reportYear}
              onChange={(event) => setReportYear(Number(event.target.value))}
            >
              {Array.from({ length: currentYear - firstLogYear + 1 }, (_, index) => currentYear - index).map((year) => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setYearlyReportOpen(false)} color="inherit">Cancel</Button>
            <Button
              onClick={() => {
                setYearlyReportOpen(false);
                const yearStart = new Date(reportYear, 0, 1);
                exportLogsForRange(
                  yearStart,
                  new Date(reportYear + 1, 0, 1),
                  `YEARLY ACTIVITY LOG REPORT - ${reportYear}`,
                  `Yearly_Activity_Logs_${reportYear}.pdf`
                );
              }}
              variant="contained"
              sx={{ bgcolor: '#213C51', color: '#ffffff', fontWeight: 700 }}
            >
              Export PDF
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={studentReportOpen}
          onClose={() => !studentsLoading && setStudentReportOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 800 }}>Individual Account Logs Report</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Search for user, admin, or super admin. Their logs are grouped by category and sorted newest first.
            </DialogContentText>
            <Autocomplete
              options={verifiedAccounts}
              value={selectedAccount}
              onChange={(_, account) => setSelectedAccount(account)}
              loading={studentsLoading}
              getOptionLabel={(account) => `${account.full_name || 'No name'} — ${account.email || account.id_number || account.id}`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText={studentsLoading ? 'Loading accounts...' : 'No verified accounts found'}
              renderOption={(props, account) => (
                <li {...props} key={account.id}>
                  <Box>
                    <Typography variant="body2" fontWeight={700}>{account.full_name || 'No name provided'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {account.email || 'No email'} · {account.role?.toLowerCase() === 'client' ? 'USER' : (account.role || 'account').toUpperCase()}
                      {account.id_number ? ` · ${account.id_number}` : ''}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField {...params} label="Search verified account" placeholder="Name, email, or ID number" />
              )}
            />
            {reportError && <Alert severity="error" sx={{ mt: 2 }}>{reportError}</Alert>}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setStudentReportOpen(false)} color="inherit">Cancel</Button>
            <Button
              onClick={generateStudentLogsPdf}
              disabled={!selectedAccount || studentsLoading}
              variant="contained"
              startIcon={<PictureAsPdfIcon />}
              sx={{ bgcolor: '#213C51', color: '#ffffff', fontWeight: 700 }}
            >
              Generate PDF
            </Button>
          </DialogActions>
        </Dialog>

      </Container>
    </Box>
  );
};

export default Logs;