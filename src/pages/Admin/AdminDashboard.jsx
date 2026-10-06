import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Grid, Paper, Avatar, useTheme,
  Container, Stack, Button, Menu, MenuItem, Dialog, 
  DialogTitle, DialogContent, DialogContentText, DialogActions,
  Select, Chip, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, List, ListItem, 
  ListItemAvatar, ListItemText, CardMedia, Divider, IconButton,
  TextField
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { supabase } from '../../supabaseClient';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import glclogo from '../../assets/glclogo.png';
// Shared date formatter (year / month / day -> "March 15, 2020")
import { formatPublishedDate } from '../../utils/formatPublishedDate';
// Shared numeric summary (headline numbers + bar charts) for the PDF report.
// Same file is used by SuperAdminDashboard.jsx.
import { drawReportSummary } from '../../utils/Reportsummary';

// MUI Icons
import GroupIcon from '@mui/icons-material/Group';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DescriptionIcon from '@mui/icons-material/Description';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SecurityIcon from '@mui/icons-material/Security';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PersonIcon from '@mui/icons-material/Person';
import BookIcon from '@mui/icons-material/Book';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
// Icons for the metadata fields (mirrors pdfCard.jsx)
import BookmarkIcon from '@mui/icons-material/Bookmark';
import SchoolIcon from '@mui/icons-material/School';
import BusinessIcon from '@mui/icons-material/Business';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import LayersIcon from '@mui/icons-material/Layers';
import LanguageIcon from '@mui/icons-material/Language';
import CategoryIcon from '@mui/icons-material/Category';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import DateRangeIcon from '@mui/icons-material/DateRange';

const getStorageImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  return supabase.storage.from('pdfs').getPublicUrl(imageUrl).data.publicUrl;
};

// ---------------------------------------------------------------------
// Shared PDF report design system. These exact constants and helpers are
// duplicated in SuperAdminDashboard.jsx so both dashboards' PDF reports
// share one palette, one type scale and one set of table dimensions
// instead of each drifting into its own look. The summary section itself
// (headline numbers + bar charts) lives in utils/Reportsummary.js.
// ---------------------------------------------------------------------
const REPORT_NAVY = [33, 60, 81];
const REPORT_BLUE = [37, 99, 235];
const REPORT_PAGE = { width: 297, height: 210, margin: 14 };

const MATERIAL_COLUMNS = 'id, title, author, category, genre, published_date, published_month, published_day, section, program_course, publisher, isbn, edition, language, created_at, is_archived';

const formatReportDate = (value) => value ? new Date(value).toLocaleString() : 'N/A';

// Page header banner + accent stripe. Returns the Y position
// content can safely start at.
const drawReportHeader = (doc, title, generatedAt) => {
  doc.setFillColor(REPORT_NAVY[0], REPORT_NAVY[1], REPORT_NAVY[2]);
  doc.rect(0, 0, REPORT_PAGE.width, 26, 'F');
  doc.setFillColor(REPORT_BLUE[0], REPORT_BLUE[1], REPORT_BLUE[2]);
  doc.rect(0, 26, REPORT_PAGE.width, 2.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(15);
  doc.text(title, REPORT_PAGE.margin, 15);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.text(`Generated: ${generatedAt}`, REPORT_PAGE.margin, 21.5);
  return 38;
};

// Colored section-title pill drawn above each category table.
const drawReportSectionLabel = (doc, text, x, y, color) => {
  const label = String(text).toUpperCase();
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  const pillW = doc.getTextWidth(label) + 10;
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(x, y - 5.5, pillW, 7.5, 1.2, 1.2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(label, x + 5, y);
  doc.setFont(undefined, 'normal');
};

// "Page X of Y" + generated-date footer stamped on every page once the
// report is fully built (so it covers pages autoTable added on its own).
const drawReportFooters = (doc, generatedAt) => {
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(REPORT_PAGE.margin, REPORT_PAGE.height - 12, REPORT_PAGE.width - REPORT_PAGE.margin, REPORT_PAGE.height - 12);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated ${generatedAt}`, REPORT_PAGE.margin, REPORT_PAGE.height - 7);
    doc.text(`Page ${i} of ${totalPages}`, REPORT_PAGE.width - REPORT_PAGE.margin, REPORT_PAGE.height - 7, { align: 'right' });
  }
};

// Academic papers and books already show their category in the section
// pill above the table, so the "Type" column is redundant for them.
const hidesTypeColumn = (category) => {
  const c = String(category || '').toLowerCase();
  return c.includes('book') || c.includes('academic');
};

// Draws one titled table per category. Returns the next free Y position.
const drawMaterialTables = (doc, materials, startY) => {
  let nextY = startY;
  const categories = [...new Set((materials || []).map(m => m.category || 'Uncategorized'))];

  categories.forEach((category) => {
    if (nextY > 155) { doc.addPage(); nextY = 20; }
    const rows = materials.filter(m => (m.category || 'Uncategorized') === category);
    const hideType = hidesTypeColumn(category);

    const head = hideType
      ? ['Title', 'Author', 'Genre', 'Published', 'Publisher', 'Edition', 'Language', 'ISBN', 'Date Added', 'Status']
      : ['Title', 'Author', 'Type', 'Genre', 'Published', 'Publisher', 'Edition', 'Language', 'ISBN', 'Date Added', 'Status'];

    const body = rows.map(m => {
      const row = [
        m.title || 'Untitled',
        m.author || 'N/A',
        m.category || 'N/A',
        m.genre || 'General',
        formatPublishedDate(m) || 'N/A',
        m.publisher || 'N/A',
        m.edition || 'N/A',
        m.language || 'N/A',
        m.isbn || 'N/A',
        formatReportDate(m.created_at),
        m.is_archived ? 'Archived' : 'Active'
      ];
      if (hideType) row.splice(2, 1); // drop Type
      return row;
    });

    // Widths add up to the 269mm usable landscape width in both cases.
    const widths = hideType
      ? [52, 34, 24, 24, 30, 16, 18, 28, 28, 15]
      : [44, 30, 20, 22, 22, 28, 15, 17, 28, 27, 16];
    const columnStyles = {};
    widths.forEach((w, i) => { columnStyles[i] = { cellWidth: w }; });

    drawReportSectionLabel(doc, category, REPORT_PAGE.margin, nextY, REPORT_BLUE);
    autoTable(doc, {
      startY: nextY + 4,
      head: [head],
      body,
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      columnStyles,
      headStyles: { fillColor: REPORT_BLUE, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [244, 247, 250] },
      theme: 'grid',
      margin: { top: 20, left: REPORT_PAGE.margin, right: REPORT_PAGE.margin, bottom: 16 }
    });
    nextY = doc.lastAutoTable.finalY + 12;
  });

  return nextY;
};

// ---- Week helpers (weeks run Monday to Sunday) ----
const startOfWeek = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const pad = (n) => String(n).padStart(2, '0');
const toInputDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const formatWeekRange = (start) => {
  const end = addDays(start, 6);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

// ---------------------------------------------------------------------
// Excel export helpers. Auto-sizes columns based on header + content
// length so nothing gets cut off, overlaps, or looks crowded, and applies
// a consistent header/frozen-row treatment across every sheet.
// ---------------------------------------------------------------------
const EXCEL_MIN_COL_WIDTH = 10;
const EXCEL_MAX_COL_WIDTH = 45;

// rows: array of plain objects (as passed to XLSX.utils.json_to_sheet)
// headers: array of the exact key names/order used to build those rows
const autoSizeColumns = (ws, rows, headers) => {
  ws['!cols'] = headers.map((header) => {
    const headerLen = String(header).length;
    const maxLen = rows.reduce((max, row) => {
      const val = row[header];
      const len = val === null || val === undefined ? 0 : String(val).length;
      return Math.max(max, len);
    }, headerLen);
    return { wch: Math.min(Math.max(maxLen + 2, EXCEL_MIN_COL_WIDTH), EXCEL_MAX_COL_WIDTH) };
  });
  // Freeze the header row so it stays visible and keep row heights
  // consistent so wrapped/long values don't crowd neighboring rows.
  ws['!views'] = [{ state: 'frozen', ySplit: 1 }];
};

// One label/value line for the Book Details dialog, copied from
// pdfCard.jsx's InfoRow so both "document info" surfaces look and behave
// the same way (icon + bold label + value, wraps instead of truncating).
const InfoRow = ({ icon, label, value }) => (
  <Typography
    variant="body2"
    component="div"
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 1,
      minWidth: 0,
      '& > svg': { flexShrink: 0 },
      '& > strong': { flexShrink: 0 },
      '& > span': {
        minWidth: 0,
        whiteSpace: 'normal',
        overflowWrap: 'anywhere',
      },
    }}
  >
    {icon} <strong>{label}:</strong> <span>{value || 'N/A'}</span>
  </Typography>
);

const AdminDashboard = () => {
  const currentYear = new Date().getFullYear();
  const firstDownloadYear = 2026;
  const [stats, setStats] = useState({ 
    totalPdf: 0, totalAccounts: 0, users: 0, superAdmin: 0, 
    totalAdmins: 0, downloads: 0, pendingRequest: 0, usersRequest: 0 
  });
  const [recentAccounts, setRecentAccounts] = useState([]);
  const [recentBooks, setRecentBooks] = useState([]);
  // Holds ONLY this admin's own pending delete requests. No SuperAdmin
  // logs/activity are fetched anywhere in this component.
  const [recentPendingRequests, setRecentPendingRequests] = useState([]);
  const [topPdfs, setTopPdfs] = useState([]);
  const [downloadYear, setDownloadYear] = useState(currentYear);
  const [downloadYears, setDownloadYears] = useState([currentYear]);
  const [monthlyDownloads, setMonthlyDownloads] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  
  // Export State
  const [anchorEl, setAnchorEl] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exportType, setExportType] = useState(null);
  const [fileSizeEst, setFileSizeEst] = useState('~120 KB');

  // Weekly report state
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  // Book Detail Modal State ("See More")
  const [selectedBook, setSelectedBook] = useState(null);
  const [bookDialogOpen, setBookDialogOpen] = useState(false);

  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // Week navigation limits: nothing after the current week, nothing before
  // the week containing Jan 1 of firstDownloadYear.
  const currentWeekStart = startOfWeek(new Date());
  const minWeekStart = startOfWeek(new Date(firstDownloadYear, 0, 1));
  const canGoNext = addDays(weekStart, 7) <= currentWeekStart;
  const canGoPrev = addDays(weekStart, -7) >= minWeekStart;
  const isCurrentWeek = weekStart.getTime() === currentWeekStart.getTime();

  // Same status→color mapping used on the Admin "Pending Actions" page, so
  // the chips read consistently across both screens.
  const getStatusColor = (status) => {
    switch ((status || '').toUpperCase()) {
      case 'APPROVED': return 'success';
      case 'REJECTED':
      case 'CANCELLED': return 'error';
      default: return 'warning';
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      // Current admin's session — required to scope "Pending Requests" to
      // requests THIS admin submitted (never all admins', never SuperAdmin's).
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Fetch Recent Accounts — User/Client role ONLY. Admin and
      // SuperAdmin accounts are intentionally excluded here.
      const { data: accountsData } = await supabase
        .from('profiles')
        .select('id, email, role, created_at, full_name, department, id_number, year_level')
        .eq('role', 'client')
        .order('created_at', { ascending: false })
        .limit(5);

      if (accountsData) setRecentAccounts(accountsData);

      // 2. Fetch Recent Books
      const { data: booksData } = await supabase
        .from('pdfs')
        .select('id, created_at, title, author, genre, published_date, description, image_url, file_url, category, is_archived, section, program_course, publisher, isbn, edition, language, published_month, published_day')
        .eq('category', 'book')
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (booksData) {
        setRecentBooks(booksData.map(book => ({
          ...book,
          imageUrl: getStorageImageUrl(book.image_url)
        })));
      }

      // 3. Fetch Metric Counts
      const { count: totalPdf } = await supabase.from('pdfs').select('*', { count: 'exact', head: true }).eq('is_archived', false);
      const { count: clients } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client');
      const { count: admins } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin');
      const { count: superAdmins } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'superadmin');
      const { count: clientReqs } = await supabase.from('upload_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: totalDownloads } = await supabase.from('downloads').select('*', { count: 'exact', head: true });

      // "Pending Request" metric — counts ONLY this admin's own pending
      // delete requests (requested_by = this admin).
      let pendingReqCount = 0;
      if (user) {
        const { count: pendingReqs } = await supabase
          .from('delete_requests')
          .select('*', { count: 'exact', head: true })
          .eq('requested_by', user.id)
          .eq('status', 'pending');
        pendingReqCount = pendingReqs || 0;
      }

      setStats({ 
        totalPdf: totalPdf || 0, 
        totalAccounts: (clients || 0) + (admins || 0) + (superAdmins || 0), 
        users: clients || 0, 
        superAdmin: superAdmins || 0, 
        totalAdmins: admins || 0,
        downloads: totalDownloads || 0,
        pendingRequest: pendingReqCount,
        usersRequest: clientReqs || 0
      });

      // 4. Fetch Monthly Download Trends
      const { data: downloadRecords } = await supabase.from('downloads').select('downloaded_at, pdf_id');
      if (downloadRecords) {
        const yearsWithDownloads = downloadRecords
          .filter(record => record.downloaded_at)
          .map(record => new Date(record.downloaded_at).getFullYear())
          .filter(year => year >= firstDownloadYear);
        setDownloadYears([...new Set([currentYear, ...yearsWithDownloads])].sort((a, b) => b - a));

        const monthsCount = Array(12).fill(0);
        const downloadCountsMap = {};

        downloadRecords.forEach(record => {
          if (record.downloaded_at) {
            const date = new Date(record.downloaded_at);
            if (date.getFullYear() === Number(downloadYear)) {
              monthsCount[date.getMonth()] += 1;
            }
          }
          if (record.pdf_id) {
            downloadCountsMap[record.pdf_id] = (downloadCountsMap[record.pdf_id] || 0) + 1;
          }
        });

        setMonthlyDownloads(monthsCount);

        // Calculate Dynamic Top Performing PDFs
        const sortedPdfIds = Object.keys(downloadCountsMap)
          .sort((a, b) => downloadCountsMap[b] - downloadCountsMap[a])
          .slice(0, 5);

        if (sortedPdfIds.length > 0) {
          const { data: topPdfsDetails } = await supabase
            .from('pdfs')
            .select('*')
            .in('id', sortedPdfIds);

          if (topPdfsDetails) {
            const rankedPdfs = topPdfsDetails.map(pdf => ({
              ...pdf,
              downloadCount: downloadCountsMap[pdf.id] || 0
            })).sort((a, b) => b.downloadCount - a.downloadCount);

            setTopPdfs(rankedPdfs);
          }
        } else {
          // Fallback if no downloads recorded yet
          const { data: fallbackPdfs } = await supabase.from('pdfs').select('*').limit(5);
          if (fallbackPdfs) {
            setTopPdfs(fallbackPdfs.map(pdf => ({ ...pdf, downloadCount: 0 })));
          }
        }
      }

      // 5. Fetch this admin's recent Pending Requests (delete_requests they
      // submitted). No audit_logs, no SuperAdmin data, at all.
      if (user) {
        const { data: pendingReqData } = await supabase
          .from('delete_requests')
          .select('id, reason, status, created_at, remarks, pdfs(title)')
          .eq('requested_by', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentPendingRequests((pendingReqData || []).map(req => ({
          ...req,
          status: req.status ? req.status.toUpperCase() : 'PENDING'
        })));
      } else {
        setRecentPendingRequests([]);
      }
    };

    fetchData();
  }, [downloadYear]);

  // Export Handlers
  const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleSelectExportType = (type) => {
    setExportType(type);
    setFileSizeEst(type === 'pdf' ? '~350 KB (PDF Report)' : '~85 KB (Excel Workbook)');
    handleMenuClose();
    setConfirmOpen(true);
  };

  const handleConfirmExport = () => {
    setConfirmOpen(false);
    if (exportType === 'excel') executeExcelExport();
    else if (exportType === 'pdf') executePdfExport();
  };

  // Weekly report handlers
  const handleOpenWeekly = () => {
    handleMenuClose();
    setWeekStart(startOfWeek(new Date()));
    setWeeklyOpen(true);
  };

  const shiftWeek = (dir) => {
    const next = addDays(weekStart, dir * 7);
    if (next > currentWeekStart || next < minWeekStart) return; // no future weeks
    setWeekStart(next);
  };

  const handleJumpDate = (e) => {
    if (!e.target.value) return;
    const picked = new Date(`${e.target.value}T00:00:00`);
    if (picked > new Date() || picked < new Date(firstDownloadYear, 0, 1)) return;
    setWeekStart(startOfWeek(picked));
  };

  const executeExcelExport = async () => {
    const now = new Date();
    const dateString = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const [{ data: accounts }, { data: materials }, { data: requests }, { data: downloads }] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, role, department, id_number, year_level, created_at, is_active, is_archived').eq('role', 'client').order('created_at', { ascending: false }),
      supabase.from('pdfs').select(MATERIAL_COLUMNS).order('created_at', { ascending: false }),
      supabase.from('upload_requests').select('id, status, created_at, user_id').order('created_at', { ascending: false }),
      supabase.from('downloads').select('id, user_id, pdf_id, downloaded_at').order('downloaded_at', { ascending: false })
    ]);
    const wb = XLSX.utils.book_new();
    const dashboardSheetData = [
      ["ADMIN DASHBOARD SUMMARY REPORT"],
      ["Generated on:", now.toLocaleString()],
      [],
      ["OVERVIEW STATS"],
      ["Metric", "Value"],
      ["Total Registered User Accounts", stats.users],
      ["Total PDFs", stats.totalPdf],
      ["Total Accounts", stats.totalAccounts],
      ["Total Users", stats.users],
      ["Total Admins", stats.totalAdmins],
      ["Total Super Admins", stats.superAdmin],
      ["Total Downloads", stats.downloads],
      ["Total Pending Requests", stats.pendingRequest],
      ["Total User Requests", stats.usersRequest],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(dashboardSheetData);
    summarySheet['!cols'] = [{ wch: 34 }, { wch: 22 }];
    summarySheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    ];
    XLSX.utils.book_append_sheet(wb, summarySheet, "Dashboard Summary");

    const accountRows = (accounts || []).map(account => ({
      Name: account.full_name || 'N/A', Email: account.email || 'N/A', Role: account.role || 'N/A',
      'ID Number': account.id_number || 'N/A', Department: account.department || 'N/A',
      'Year Level': account.year_level || 'N/A',
      'Account Status': account.is_active === false ? 'Deactivated' : 'Active',
      'Archived': account.is_archived ? 'Yes' : 'No',
      'Date Joined': formatReportDate(account.created_at)
    }));
    const accountHeaders = ['Name', 'Email', 'Role', 'ID Number', 'Department', 'Year Level', 'Account Status', 'Archived', 'Date Joined'];
    const accountSheet = XLSX.utils.json_to_sheet(accountRows, { header: accountHeaders });
    autoSizeColumns(accountSheet, accountRows, accountHeaders);
    XLSX.utils.book_append_sheet(wb, accountSheet, 'Account Information');

    const materialHeaders = ['Title', 'Author', 'Type', 'Genre', 'Section', 'Program', 'Published', 'Publisher', 'Edition', 'Language', 'ISBN', 'Date Added', 'Archived'];
    const categories = [...new Set((materials || []).map(material => material.category || 'Uncategorized'))];
    categories.forEach(category => {
      const categoryRows = (materials || []).filter(material => (material.category || 'Uncategorized') === category);
      const materialRows = categoryRows.map(material => ({
        Title: material.title || 'Untitled', Author: material.author || 'N/A', Type: material.category || 'N/A',
        Genre: material.genre || 'General', Section: material.section || 'N/A', Program: material.program_course || 'N/A',
        Published: formatPublishedDate(material) || 'N/A', Publisher: material.publisher || 'N/A',
        Edition: material.edition || 'N/A', Language: material.language || 'N/A', ISBN: material.isbn || 'N/A',
        'Date Added': formatReportDate(material.created_at), Archived: material.is_archived ? 'Yes' : 'No'
      }));
      const materialSheet = XLSX.utils.json_to_sheet(materialRows, { header: materialHeaders });
      autoSizeColumns(materialSheet, materialRows, materialHeaders);
      XLSX.utils.book_append_sheet(wb, materialSheet, String(category).slice(0, 31) || 'Materials');
    });

    const requestRows = (requests || []).map(request => ({
      'Request ID': request.id, Status: request.status || 'N/A', 'User ID': request.user_id || 'N/A',
      'Requested At': formatReportDate(request.created_at)
    }));
    const requestHeaders = ['Request ID', 'Status', 'User ID', 'Requested At'];
    const requestSheet = XLSX.utils.json_to_sheet(requestRows, { header: requestHeaders });
    autoSizeColumns(requestSheet, requestRows, requestHeaders);
    XLSX.utils.book_append_sheet(wb, requestSheet, 'Upload Requests');

    const downloadRows = (downloads || []).map(download => ({
      'Download ID': download.id, 'User ID': download.user_id || 'N/A', 'PDF ID': download.pdf_id || 'N/A',
      'Downloaded At': formatReportDate(download.downloaded_at)
    }));
    const downloadHeaders = ['Download ID', 'User ID', 'PDF ID', 'Downloaded At'];
    const downloadSheet = XLSX.utils.json_to_sheet(downloadRows, { header: downloadHeaders });
    autoSizeColumns(downloadSheet, downloadRows, downloadHeaders);
    XLSX.utils.book_append_sheet(wb, downloadSheet, 'Downloads');

    XLSX.writeFile(wb, `Admin_Dashboard_Report_${dateString}.xlsx`);
  };

  const executePdfExport = async () => {
    const now = new Date();
    const generatedDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const [{ data: materials }, { data: accounts }, { data: requests }, { data: downloads }] = await Promise.all([
      supabase.from('pdfs').select(MATERIAL_COLUMNS).order('category').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, role'),
      supabase.from('upload_requests').select('id').eq('status', 'pending'),
      supabase.from('downloads').select('id')
    ]);
    const accountTotals = (accounts || []).reduce((totals, account) => {
      totals.totalAccounts += 1;
      if (account.role === 'client') totals.users += 1;
      if (account.role === 'admin') totals.admins += 1;
      if (account.role === 'superadmin') totals.superAdmins += 1;
      return totals;
    }, { totalAccounts: 0, users: 0, admins: 0, superAdmins: 0 });
    // Landscape, not portrait: the materials table carries the full
    // metadata set and needs the extra width to stay readable.
    const doc = new jsPDF({ orientation: 'landscape' });
    const generatedAt = now.toLocaleString();
    let nextY = drawReportHeader(doc, 'ADMIN DASHBOARD REPORT', generatedAt);

    nextY = drawReportSummary(doc, nextY, {
      registeredUsers: accountTotals.users,
      totalAccounts: accountTotals.totalAccounts,
      users: accountTotals.users,
      admins: accountTotals.admins,
      superAdmins: accountTotals.superAdmins,
      totalPdfs: materials?.length || 0,
      pendingRequests: requests?.length || 0,
      totalDownloads: downloads?.length || 0,
      userRequests: requests?.length || 0,
    });

    nextY = drawMaterialTables(doc, materials || [], nextY);

    drawReportFooters(doc, generatedAt);
    doc.save(`Admin_Dashboard_Report_${generatedDate}.pdf`);
  };

  const executeWeeklyPdfExport = async () => {
    setWeeklyOpen(false);
    const now = new Date();
    const startISO = weekStart.toISOString();
    const endISO = addDays(weekStart, 7).toISOString();
    const rangeLabel = formatWeekRange(weekStart);

    // Every query is scoped to the selected Monday-Sunday window.
    const [{ data: materials }, { data: accounts }, { data: requests }, { data: downloads }] = await Promise.all([
      supabase.from('pdfs').select(MATERIAL_COLUMNS).gte('created_at', startISO).lt('created_at', endISO).order('category').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, email, full_name, role, department, id_number, year_level, created_at').gte('created_at', startISO).lt('created_at', endISO).order('created_at', { ascending: false }),
      supabase.from('upload_requests').select('id').eq('status', 'pending').gte('created_at', startISO).lt('created_at', endISO),
      supabase.from('downloads').select('id').gte('downloaded_at', startISO).lt('downloaded_at', endISO)
    ]);

    const totals = (accounts || []).reduce((t, a) => {
      t.totalAccounts += 1;
      if (a.role === 'client') t.users += 1;
      if (a.role === 'admin') t.admins += 1;
      if (a.role === 'superadmin') t.superAdmins += 1;
      return t;
    }, { totalAccounts: 0, users: 0, admins: 0, superAdmins: 0 });

    // Admins only see User (client) accounts in their dashboard, so the
    // detail table lists clients only; the summary counts still cover all roles.
    const newClients = (accounts || []).filter(a => a.role === 'client');

    const doc = new jsPDF({ orientation: 'landscape' });
    const generatedAt = now.toLocaleString();
    let nextY = drawReportHeader(doc, `WEEKLY ADMIN REPORT  |  ${rangeLabel}`, generatedAt);

    nextY = drawReportSummary(doc, nextY, {
      registeredUsers: totals.users,
      totalAccounts: totals.totalAccounts,
      users: totals.users,
      admins: totals.admins,
      superAdmins: totals.superAdmins,
      totalPdfs: materials?.length || 0,
      pendingRequests: requests?.length || 0,
      totalDownloads: downloads?.length || 0,
      userRequests: requests?.length || 0,
    });

    // New user accounts this week
    if (nextY > 155) { doc.addPage(); nextY = 20; }
    drawReportSectionLabel(doc, 'New User Accounts This Week', REPORT_PAGE.margin, nextY, REPORT_NAVY);
    if (newClients.length > 0) {
      autoTable(doc, {
        startY: nextY + 4,
        head: [['Name', 'Email', 'ID Number', 'Department', 'Year Level', 'Date Joined']],
        body: newClients.map(a => [
          a.full_name || 'N/A', a.email || 'N/A',
          a.id_number || 'N/A', a.department || 'N/A', a.year_level || 'N/A',
          formatReportDate(a.created_at)
        ]),
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: REPORT_NAVY, textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [244, 247, 250] },
        theme: 'grid',
        margin: { top: 20, left: REPORT_PAGE.margin, right: REPORT_PAGE.margin, bottom: 16 }
      });
      nextY = doc.lastAutoTable.finalY + 12;
    } else {
      doc.setFontSize(9); doc.setTextColor(120, 120, 120);
      doc.text('No new user accounts registered this week.', REPORT_PAGE.margin, nextY + 9);
      nextY += 20;
    }

    // Materials added this week (same tables as the full report)
    if ((materials || []).length > 0) {
      nextY = drawMaterialTables(doc, materials, nextY);
    } else {
      if (nextY > 155) { doc.addPage(); nextY = 20; }
      drawReportSectionLabel(doc, 'Materials Added This Week', REPORT_PAGE.margin, nextY, REPORT_BLUE);
      doc.setFontSize(9); doc.setTextColor(120, 120, 120);
      doc.text('No materials were added this week.', REPORT_PAGE.margin, nextY + 9);
    }

    drawReportFooters(doc, generatedAt);
    doc.save(`Admin_Weekly_Report_${toInputDate(weekStart)}_to_${toInputDate(addDays(weekStart, 6))}.pdf`);
  };

  // Book detail dialog handlers
  const handleOpenBookDetail = (book) => {
    setSelectedBook(book);
    setBookDialogOpen(true);
  };

  const handleCloseBookDetail = () => {
    setBookDialogOpen(false);
    setSelectedBook(null);
  };

  const commonPaperStyle = {
    borderRadius: '0px',
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
    color: isDarkMode ? '#f8fafc' : '#1e293b',
    boxShadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.25)' : '0 4px 20px rgba(0,0,0,0.03)',
    width: '100%',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  };

  const statCardsData = [
    { label: 'PDF', value: stats.totalPdf, color: '#60a5fa', bg: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)', darkBg: 'linear-gradient(135deg, #172554 0%, #1e3a8a 100%)', icon: <DescriptionIcon sx={{ color: '#2563eb', fontSize: 28, opacity: 1 }} /> },
    { label: 'Accounts', value: stats.totalAccounts, color: '#c084fc', bg: 'linear-gradient(135deg, #f3e8ff 0%, #faf5ff 100%)', darkBg: 'linear-gradient(135deg, #3b0764 0%, #581c87 100%)', icon: <GroupIcon sx={{ color: '#9333ea', fontSize: 28, opacity: 1 }} /> },
    { label: 'Users', value: stats.users, color: '#34d399', bg: 'linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%)', darkBg: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', icon: <PersonIcon sx={{ color: '#059669', fontSize: 28, opacity: 1 }} /> },
    { label: 'Super Admin', value: stats.superAdmin, color: '#d8b4fe', bg: 'linear-gradient(135deg, #e9d5ff 0%, #f3e8ff 100%)', darkBg: 'linear-gradient(135deg, #4c1d95 0%, #6b21a8 100%)', icon: <SecurityIcon sx={{ color: '#9333ea', fontSize: 28, opacity: 1 }} /> },
    { label: 'Admins', value: stats.totalAdmins, color: '#818cf8', bg: 'linear-gradient(135deg, #e0e7ff 0%, #eef2ff 100%)', darkBg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', icon: <AdminPanelSettingsIcon sx={{ color: '#4f46e5', fontSize: 28, opacity: 1 }} /> },
    { label: 'Downloads', value: stats.downloads, color: '#fbbf24', bg: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)', darkBg: 'linear-gradient(135deg, #78350f 0%, #92400e 100%)', icon: <FileDownloadIcon sx={{ color: '#d97706', fontSize: 28, opacity: 1 }} /> },
    // Shows THIS admin's own pending requests.
    { label: 'Pending Request', value: stats.pendingRequest, color: '#f87171', bg: 'linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)', darkBg: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)', icon: <PendingActionsIcon sx={{ color: '#dc2626', fontSize: 28, opacity: 1 }} /> },
    { label: 'Users Request', value: stats.usersRequest, color: '#2dd4bf', bg: 'linear-gradient(135deg, #ccfbf1 0%, #f0fdfa 100%)', darkBg: 'linear-gradient(135deg, #134e4a 0%, #115e59 100%)', icon: <UploadFileIcon sx={{ color: '#0f9f91', fontSize: 28, opacity: 1 }} /> },
  ];

  return (
    <Box sx={{ bgcolor: isDarkMode ? '#0f172a' : '#ffffff', minHeight: '100vh', pb: 6, width: '100%' }}>
      <Container maxWidth={false} sx={{ mt: { xs: 2, md: 4 }, px: { xs: 2, sm: 3, md: 5 } }}>
        
        {/* Top Header Title & Export Button */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h3" sx={{ fontStyle: 'italic', fontWeight: 900, color: isDarkMode ? '#ffffff' : '#213C51', fontFamily: "'Montserrat', sans-serif", fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' }, letterSpacing: '1px' }}>
            ADMIN DASHBOARD
              </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, display: 'block' }}>
              System Repository Performance & Analytics Overview
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            startIcon={<FileDownloadIcon />} 
            onClick={handleMenuClick} 
            sx={{ 
              bgcolor: '#213C51', 
              color: '#ffffff', 
              '&:hover': { bgcolor: '#162836', transform: 'translateY(-2px)' }, 
              fontWeight: 700, 
              borderRadius: '10px',
              px: 3,
              py: 1,
              boxShadow: '0 4px 14px rgba(33, 60, 81, 0.25)',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            Generate Report
          </Button>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            <MenuItem onClick={() => handleSelectExportType('pdf')}>Generate PDF Report</MenuItem>
            <MenuItem onClick={handleOpenWeekly}>Generate Weekly PDF Report</MenuItem>
            <MenuItem onClick={() => handleSelectExportType('excel')}>Generate Excel Workbook</MenuItem>
          </Menu>
        </Box>

        {/* Export Confirmation Dialog */}
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle sx={{ fontWeight: 800, color: '#FFFFf' }}>Confirm Report Export</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mt: 1 }}>
              Are you sure you want to generate the repository system summary? <br /><br />
              <strong>Selected Format:</strong> {exportType?.toUpperCase()}<br />
              <strong>Estimated File Size:</strong> {fileSizeEst}
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setConfirmOpen(false)} color="inherit" sx={{ fontWeight: 700 }}>Cancel</Button>
            <Button onClick={handleConfirmExport} variant="contained" sx={{ color: '#ffffff', bgcolor: '#213C51', fontWeight: 700 }}>Proceed</Button>
          </DialogActions>
        </Dialog>

        {/* Weekly Report Dialog — week picker, future weeks are blocked */}
        <Dialog open={weeklyOpen} onClose={() => setWeeklyOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Weekly PDF Report</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Select a week (Monday to Sunday). Future weeks can't be selected.
            </DialogContentText>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <IconButton onClick={() => shiftWeek(-1)} disabled={!canGoPrev}><ChevronLeftIcon /></IconButton>
              <Box sx={{ textAlign: 'center' }}>
                <Typography fontWeight={800}>{formatWeekRange(weekStart)}</Typography>
                {isCurrentWeek && (
                  <Typography variant="caption" color="text.secondary">Current week (up to today)</Typography>
                )}
              </Box>
              <IconButton onClick={() => shiftWeek(1)} disabled={!canGoNext}><ChevronRightIcon /></IconButton>
            </Stack>
            <TextField
              type="date"
              size="small"
              fullWidth
              label="Jump to date"
              InputLabelProps={{ shrink: true }}
              value={toInputDate(weekStart)}
              onChange={handleJumpDate}
              inputProps={{ min: `${firstDownloadYear}-01-01`, max: toInputDate(new Date()) }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setWeeklyOpen(false)} color="inherit" sx={{ fontWeight: 700 }}>Cancel</Button>
            <Button onClick={executeWeeklyPdfExport} variant="contained" sx={{ color: '#ffffff', bgcolor: '#213C51', fontWeight: 700 }}>
              Generate
            </Button>
          </DialogActions>
        </Dialog>

        {/* 8 Metric Cards Grid - Fully Responsive */}
        <Grid container spacing={{ xs: 2, md: 2.5 }} sx={{ mb: 4 }}>
          {statCardsData.map((item, idx) => (
            <Grid key={idx} size={{ xs: 12, sm: 6, md: 3, lg: 1.5 }}>
              <Paper sx={{ 
                ...commonPaperStyle, 
                p: 2, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                textAlign: 'center',
                borderRadius: '14px',
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-5px)',
                  boxShadow: isDarkMode ? '0 8px 25px rgba(0,0,0,0.45)' : '0 8px 25px rgba(0,0,0,0.08)',
                  borderColor: item.color
                }
              }}>
                <Box sx={{ background: isDarkMode ? 'rgba(255,255,255,0.14)' : item.bg, p: 1.5, borderRadius: '12px', mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.icon}
                </Box>
                <Typography variant="caption" sx={{ color: isDarkMode ? 'rgba(255,255,255,0.78)' : 'text.secondary', fontWeight: 700, mb: 0.5 }}>
                  {item.label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: item.color }}>
                  {item.value}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Download Trends Line Chart Section */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ ...commonPaperStyle, overflow: 'hidden' }}>
              <Box sx={{ 
                background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)', 
                px: 3, 
                py: 2.5, 
                display: 'flex', 
                justify: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2 
              }}>
                <Typography variant="subtitle1" fontWeight="800" sx={{ color: '#ffffff', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
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
                    fontWeight: 700,
                    borderRadius: '8px',
                    height: 38
                  }}
                >
                  {downloadYears.map(year => (
                    <MenuItem key={year} value={year}>Year {year}</MenuItem>
                  ))}
                </Select>
              </Box>
              <Box sx={{ width: '100%', height: 300, p: { xs: 1, sm: 2 } }}>
                <LineChart
                  xAxis={[{ scaleType: 'point', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] }]}
                  series={[{ data: monthlyDownloads, color: '#3b82f6', area: true, showMark: true, label: 'Downloads' }]}
                  height={280}
                  margin={{ top: 20, bottom: 25, left: 45, right: 25 }}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* SECTION 1: Recent Accounts (User/Client role only) */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ ...commonPaperStyle, p: { xs: 2, sm: 3 } }}>
              <Box sx={{ background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)', mx: { xs: -2, sm: -3 }, mt: { xs: -2, sm: -3 }, mb: 2.5, px: { xs: 2, sm: 3 }, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="h6" fontWeight="800" sx={{ color: '#ffffff' }}>
                 RECENT ACCOUNTS REGISTERED
                </Typography>
                <Chip label={`${recentAccounts.length} Total Registered`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#ffffff', fontWeight: 800 }} />
              </Box>
              
              {/* Fixed-width table layout so the row content spreads across the
                  full container instead of leaving a dead gap after "Year Level". */}
              <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
                <Table sx={{ width: '100%', minWidth: 800, tableLayout: 'fixed' }}>
                  <TableHead>
                    <TableRow sx={{ borderBottom: '2px solid', borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary', width: '30%' }}>User / Member</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary', width: '15%' }}>ID / Number</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary', width: '13%' }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary', width: '20%' }}>Department</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary', width: '12%' }}>Year Level</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: 'text.secondary', width: '10%' }}>Date Joined</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentAccounts.length > 0 ? (
                      recentAccounts.map((account) => (
                        <TableRow key={account.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 }, transition: 'background-color 0.2s' }}>
                          <TableCell sx={{ width: '30%' }}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Avatar sx={{ bgcolor: '#facc15', color: '#713f12', width: 42, height: 42 }}>
                                <PersonIcon fontSize="small" />
                              </Avatar>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" fontWeight="700" noWrap>
                                  {account.full_name || 'No Name Provided'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                  {account.email}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ width: '15%' }}>
                            <Typography variant="body2" color="text.secondary" fontWeight="600">
                              {account.id_number || `#${String(account.id).slice(0, 6)}`}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ width: '13%' }}>
                            <Chip 
                              label={account.role === 'client' ? 'USER' : account.role ? account.role.toUpperCase() : 'USER'}
                              size="small" 
                              sx={{ 
                                bgcolor: '#e2e05db6',
                                color: '#020502',
                                fontWeight: 800, 
                                fontSize: '0.7rem',
                                border: '1px solid',
                                borderColor: '#bbf7d0',
                                width: 90,
                                justifyContent: 'center',
                                '& .MuiChip-label': { width: '100%', px: 0, textAlign: 'center' }
                              }} 
                            />
                          </TableCell>
                          <TableCell sx={{ width: '20%' }}>
                            <Typography variant="body2" fontWeight="600" noWrap>
                              {account.department || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ width: '12%' }}>
                            <Typography variant="body2" fontWeight="600">
                              {account.year_level || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ width: '10%' }}>
                            <Typography variant="caption" fontWeight="600" color="text.secondary">
                              {account.created_at ? new Date(account.created_at).toLocaleDateString() : 'N/A'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          No user accounts found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>

        {/* SECTION 2: Books / Academic Materials (Clickable Rows -> Opens Modal) */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ ...commonPaperStyle, p: { xs: 2, sm: 3 } }}>
              <Box sx={{ background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)', mx: { xs: -2, sm: -3 }, mt: { xs: -2, sm: -3 }, mb: 2.5, px: { xs: 2, sm: 3 }, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="h6" fontWeight="800" sx={{ color: '#ffffff' }}>
                  RECENT ACADEMIC MATERIALS
                </Typography>
                <Chip label="Click row to view details" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#ffffff', fontWeight: 700 }} />
              </Box>

              <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
                <Table sx={{ width: '100%', minWidth: 700, tableLayout: 'fixed' }}>
                  <TableHead>
                    <TableRow sx={{ borderBottom: '2px solid', borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary', width: '32%' }}>Book Title</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary', width: '22%' }}>Author</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary', width: '18%' }}>Genre</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary', width: '16%' }}>Category</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: 'text.secondary', width: '12%' }}>Date Added</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentBooks.length > 0 ? (
                      recentBooks.map((book) => (
                        <TableRow 
                          key={book.id} 
                          hover 
                          onClick={() => handleOpenBookDetail(book)}
                          sx={{ 
                            cursor: 'pointer',
                            '&:last-child td, &:last-child th': { border: 0 },
                            '&:hover': { bgcolor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(59, 130, 246, 0.04)' },
                            transition: 'background-color 0.15s ease-in-out'
                          }}
                        >
                          <TableCell sx={{ width: '32%' }}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              {book.imageUrl ? (
                                <Box component="img" src={book.imageUrl} alt="" sx={{ width: 38, height: 38, borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                              ) : (
                                <Avatar sx={{ bgcolor: '#f43f5e', width: 38, height: 38, flexShrink: 0 }}><BookIcon sx={{ fontSize: '1.1rem' }} /></Avatar>
                              )}
                              <Typography variant="body2" fontWeight="700" noWrap sx={{ color: '#2563eb', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                                {book.title || 'Untitled Material'}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ width: '22%' }}>
                            <Typography variant="body2" fontWeight="600" color="text.secondary" noWrap>
                              {book.author || 'Unknown Author'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ width: '18%' }}>
                            <Chip label={book.genre || 'General'} size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                          </TableCell>
                          <TableCell sx={{ width: '16%' }}>
                            <Chip 
                              label={book.category ? book.category.toUpperCase() : 'BOOK'} 
                              size="small" 
                              sx={{ bgcolor: '#f1f5f9', color: '#334155', fontWeight: 800, fontSize: '0.65rem' }} 
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ width: '12%' }}>
                            <Typography variant="caption" fontWeight="600" color="text.secondary">
                              {book.created_at ? new Date(book.created_at).toLocaleDateString() : 'N/A'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          No recent books found in repository.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>

        {/* Bottom Section: this admin's Pending Requests & Dynamic Top Performing PDFs */}
        <Grid container spacing={3}>
          {/* Recent Pending Requests Panel — scoped strictly to delete_requests
              THIS admin submitted. */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ ...commonPaperStyle, overflow: 'hidden', height: '100%' }}>
              <Box sx={{ background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)', px: 3, py: 2 }}>
                <Typography variant="subtitle1" fontWeight="800" sx={{ color: '#ffffff', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                   RECENT PENDING REQUESTS
                </Typography>
              </Box>
              <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
                <Table sx={{ width: '100%', minWidth: 560, tableLayout: 'fixed' }}>
                  <TableHead>
                    <TableRow sx={{ borderBottom: '2px solid', borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary', width: '26%', fontSize: '0.75rem', letterSpacing: 0.5 }}>DOCUMENT</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary', width: '20%', fontSize: '0.75rem', letterSpacing: 0.5 }}>REASON</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary', width: '22%', fontSize: '0.75rem', letterSpacing: 0.5 }}>REMARKS</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary', width: '16%', fontSize: '0.75rem', letterSpacing: 0.5 }}>STATUS</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: 'text.secondary', width: '16%', fontSize: '0.75rem', letterSpacing: 0.5 }}>DATE</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentPendingRequests.length > 0 ? (
                      recentPendingRequests.map((req, index) => (
                        <TableRow
                          key={req.id || index}
                          hover
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                          <TableCell sx={{ width: '26%' }}>
                            <Typography variant="body2" fontWeight="800" noWrap sx={{ color: isDarkMode ? '#f8fafc' : '#1e293b' }}>
                              {req.pdfs?.title || 'Untitled Document'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ width: '20%' }}>
                            <Typography variant="body2" noWrap sx={{ color: isDarkMode ? '#cbd5e1' : '#334155', fontWeight: 600 }}>
                              {req.reason || 'No reason given'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ width: '22%' }}>
                            <Typography
                              variant="body2"
                              noWrap
                              sx={{
                                fontStyle: req.remarks ? 'normal' : 'italic',
                                color: req.remarks ? '#ef4444' : 'text.secondary',
                                fontWeight: req.remarks ? 700 : 400
                              }}
                            >
                              {req.remarks || 'No remarks yet'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ width: '16%' }}>
                            <Chip
                              label={req.status}
                              color={getStatusColor(req.status)}
                              size="small"
                              sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ width: '16%' }}>
                            <Typography variant="body2" fontWeight="600" color="text.secondary">
                              {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'N/A'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          No pending requests found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Dynamic Top Performing PDFs Panel */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ ...commonPaperStyle, overflow: 'hidden', height: '100%' }}>
              <Box sx={{ background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)', px: 3, py: 2 }}>
                <Typography variant="subtitle1" fontWeight="800" sx={{ color: '#ffffff', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                   MOST DOWNLOADED MATERIALS
                </Typography>
              </Box>
              <List sx={{ p: 1.5 }}>
                {topPdfs.length > 0 ? (
                  topPdfs.map((pdf, idx) => (
                    <ListItem 
                      key={pdf.id || idx} 
                      divider={idx !== topPdfs.length - 1} 
                      onClick={() => handleOpenBookDetail(pdf)}
                      sx={{ 
                        px: 1.5, 
                        py: 1.5, 
                        cursor: 'pointer',
                        borderRadius: '8px',
                        '&:hover': { bgcolor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(245, 158, 11, 0.05)' }
                      }}
                    >
                      <ListItemAvatar sx={{ minWidth: 45 }}>
                        {getStorageImageUrl(pdf.image_url) ? (
                          <Box component="img" src={getStorageImageUrl(pdf.image_url)} alt={pdf.title || 'Book cover'} sx={{ width: 36, height: 48, borderRadius: '6px', objectFit: 'cover' }} />
                        ) : (
                          <Box component="img" src={glclogo} alt="GCLC logo" sx={{ width: 42, height: 48, borderRadius: '6px', objectFit: 'contain' }} />
                        )}
                      </ListItemAvatar>
                      <ListItemText 
                        primary={<Typography variant="body2" fontWeight="800" sx={{ color: isDarkMode ? '#f8fafc' : '#1e293b' }}>{pdf.title || 'Untitled Book'}</Typography>}
                        secondary={
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                            {pdf.author ? `By ${pdf.author}` : 'Unknown Author'} • {pdf.genre || 'General'}
                          </Typography>
                        }
                      />
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: '#d97706', fontWeight: 800, bgcolor: '#fffbeb', px: 1.5, py: 0.5, borderRadius: '20px' }}>
                        <TrendingUpIcon fontSize="small" />
                        <Typography variant="body2" fontWeight="800">{pdf.downloadCount || 0}</Typography>
                      </Stack>
                    </ListItem>
                  ))
                ) : (
                  <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                    <Typography variant="body2">No PDF downloads recorded yet.</Typography>
                  </Box>
                )}
              </List>
            </Paper>
          </Grid>
        </Grid>

      </Container>

      {/* "SEE MORE" BOOK DETAILS DIALOG — mirrors pdfCard.jsx's Document
          Info layout: an icon + label + value grid. */}
      <Dialog 
        open={bookDialogOpen} 
        onClose={handleCloseBookDetail}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
            color: isDarkMode ? '#f8fafc' : '#1e293b',
            p: 1
          }
        }}
      >
        {selectedBook && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <PictureAsPdfIcon color="primary" />
                <Typography variant="h6" fontWeight="800">
                  Book Details
                </Typography>
              </Stack>
              <IconButton onClick={handleCloseBookDetail} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                  {getStorageImageUrl(selectedBook.image_url) ? (
                    <CardMedia
                      component="img"
                      image={getStorageImageUrl(selectedBook.image_url)}
                      alt={selectedBook.title}
                      sx={{ borderRadius: '12px', height: 260, objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                    />
                  ) : (
                    <Box sx={{ 
                      height: 260, 
                      borderRadius: '12px', 
                      bgcolor: isDarkMode ? '#0f172a' : '#f1f5f9', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'text.secondary'
                    }}>
                      <BookIcon sx={{ fontSize: 60, mb: 1, color: '#94a3b8' }} />
                      <Typography variant="caption" fontWeight="700">No Cover Available</Typography>
                    </Box>
                  )}
                </Grid>
                <Grid size={{ xs: 12, md: 8 }}>
                  <Typography variant="h5" fontWeight="900" sx={{ mb: 1 }}>
                    {selectedBook.title || 'Untitled Material'}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="700" color="text.secondary" sx={{ mb: 2 }}>
                    Author: {selectedBook.author || 'Unknown'}
                  </Typography>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'auto auto' },
                      justifyContent: 'start',
                      columnGap: 3,
                      rowGap: 1,
                      mb: 2.5,
                    }}
                  >
                    <InfoRow icon={<LibraryBooksIcon fontSize="small" color="primary" />} label="Type" value={selectedBook.category || 'Book'} />
                    <InfoRow icon={<CategoryIcon fontSize="small" color="primary" />} label="Genre" value={selectedBook.genre || 'General'} />

                    {selectedBook.section && (
                      <InfoRow icon={<BookmarkIcon fontSize="small" color="primary" />} label="Section" value={selectedBook.section} />
                    )}
                    {selectedBook.program_course && (
                      <InfoRow icon={<SchoolIcon fontSize="small" color="primary" />} label="Program" value={selectedBook.program_course} />
                    )}

                    {selectedBook.published_date && (
                      <InfoRow icon={<DateRangeIcon fontSize="small" color="primary" />} label="Published" value={formatPublishedDate(selectedBook)} />
                    )}

                    {selectedBook.publisher && (
                      <InfoRow icon={<BusinessIcon fontSize="small" color="primary" />} label="Publisher" value={selectedBook.publisher} />
                    )}
                    {selectedBook.edition && (
                      <InfoRow icon={<LayersIcon fontSize="small" color="primary" />} label="Edition" value={selectedBook.edition} />
                    )}
                    {selectedBook.isbn && (
                      <InfoRow icon={<ConfirmationNumberIcon fontSize="small" color="primary" />} label="ISBN" value={selectedBook.isbn} />
                    )}
                    {selectedBook.language && (
                      <InfoRow icon={<LanguageIcon fontSize="small" color="primary" />} label="Language" value={selectedBook.language} />
                    )}
                  </Box>

                  <Typography variant="subtitle2" fontWeight="800" sx={{ mb: 0.5, color: 'text.secondary' }}>
                    DESCRIPTION / ABSTRACT
                  </Typography>
                  <Typography variant="body2" sx={{ lineHeight: 1.7, color: isDarkMode ? '#cbd5e1' : '#475569', mb: 3 }}>
                    {selectedBook.description || 'No detailed description available for this academic material.'}
                  </Typography>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0 }}>
              <Button onClick={handleCloseBookDetail} variant="outlined" sx={{ fontWeight: 700, borderRadius: '8px' }}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;