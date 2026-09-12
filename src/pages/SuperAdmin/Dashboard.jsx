import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Grid, Paper, Avatar, useTheme,
  Container, Stack, Button, Menu, MenuItem, Dialog, 
  DialogTitle, DialogContent, DialogContentText, DialogActions,
  Select, Chip, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, List, ListItem, 
  ListItemAvatar, ListItemText, CardMedia, Divider, IconButton
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { supabase } from '../../supabaseClient';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import glclogo from '../../assets/glclogo.png';

// MUI Icons
import GroupIcon from '@mui/icons-material/Group';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DescriptionIcon from '@mui/icons-material/Description';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SecurityIcon from '@mui/icons-material/Security';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PersonIcon from '@mui/icons-material/Person';
import BookIcon from '@mui/icons-material/Book';
import HistoryIcon from '@mui/icons-material/History';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

const getStorageImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  return supabase.storage.from('pdfs').getPublicUrl(imageUrl).data.publicUrl;
};

const Dashboard = () => {
  const currentYear = new Date().getFullYear();
  const firstDownloadYear = 2026;
  const [stats, setStats] = useState({ 
    totalPdf: 0, totalAccounts: 0, users: 0, superAdmin: 0, 
    totalAdmins: 0, downloads: 0, deleteRequest: 0, usersRequest: 0 
  });
  const [recentAccounts, setRecentAccounts] = useState([]);
  const [recentBooks, setRecentBooks] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [topPdfs, setTopPdfs] = useState([]);
  const [downloadYear, setDownloadYear] = useState(currentYear);
  const [downloadYears, setDownloadYears] = useState([currentYear]);
  const [monthlyDownloads, setMonthlyDownloads] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  
  // Export State
  const [anchorEl, setAnchorEl] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exportType, setExportType] = useState(null);
  const [fileSizeEst, setFileSizeEst] = useState('~120 KB');

  // Book Detail Modal State ("See More")
  const [selectedBook, setSelectedBook] = useState(null);
  const [bookDialogOpen, setBookDialogOpen] = useState(false);

  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch Recent Accounts
      const { data: accountsData } = await supabase
        .from('profiles')
        .select('id, email, role, created_at, full_name, department, id_number, year_level')
        .order('created_at', { ascending: false })
        .limit(5);

      if (accountsData) setRecentAccounts(accountsData);

      // 2. Fetch Recent Books
      const { data: booksData } = await supabase
        .from('pdfs')
        .select('id, created_at, title, author, genre, published_date, description, image_url, file_url, category, is_archived')
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
      const { count: deleteReqs } = await supabase.from('delete_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: clientReqs } = await supabase.from('upload_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: totalDownloads } = await supabase.from('downloads').select('*', { count: 'exact', head: true });

      setStats({ 
        totalPdf: totalPdf || 0, 
        totalAccounts: (clients || 0) + (admins || 0) + (superAdmins || 0), 
        users: clients || 0, 
        superAdmin: superAdmins || 0, 
        totalAdmins: admins || 0,
        downloads: totalDownloads || 0,
        deleteRequest: deleteReqs || 0,
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

      // 5. Fetch Audit Logs
      const { data: auditData } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(5);
      setRecentActivities(auditData || []);
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

  const formatReportDate = (value) => value ? new Date(value).toLocaleString() : 'N/A';

  const executeExcelExport = async () => {
    const now = new Date();
    const dateString = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const [{ data: accounts }, { data: materials }, { data: requests }, { data: downloads }, { data: logs }] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, role, department, id_number, year_level, created_at').order('created_at', { ascending: false }),
      supabase.from('pdfs').select('id, title, author, category, genre, published_date, created_at, is_archived').order('created_at', { ascending: false }),
      supabase.from('upload_requests').select('id, status, created_at, user_id').order('created_at', { ascending: false }),
      supabase.from('downloads').select('id, user_id, pdf_id, downloaded_at').order('downloaded_at', { ascending: false }),
      supabase.from('audit_logs').select('id, action_type, description, created_at, user_id').order('created_at', { ascending: false })
    ]);
    const wb = XLSX.utils.book_new();
    const dashboardSheetData = [
      ["LIBRARY REPOSITORY SYSTEM SUMMARY REPORT"],
      ["Generated on:", now.toLocaleString()],
      [],
      ["OVERVIEW STATS"],
      ["Metric", "Value"],
      ["Total PDF", stats.totalPdf],
      ["Total Accounts", stats.totalAccounts],
      ["Users", stats.users],
      ["Super Admin", stats.superAdmin],
      ["Total Admins", stats.totalAdmins],
      ["Downloads", stats.downloads],
      ["Delete Requests", stats.deleteRequest],
      ["Users Requests", stats.usersRequest],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dashboardSheetData), "Dashboard Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((accounts || []).map(account => ({
      Name: account.full_name || 'N/A', Email: account.email || 'N/A', Role: account.role || 'N/A',
      'ID Number': account.id_number || 'N/A', Department: account.department || 'N/A',
      'Year Level': account.year_level || 'N/A', 'Date Joined': formatReportDate(account.created_at)
    }))), 'Account Information');
    const categories = [...new Set((materials || []).map(material => material.category || 'Uncategorized'))];
    categories.forEach(category => {
      const categoryRows = (materials || []).filter(material => (material.category || 'Uncategorized') === category);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(categoryRows.map(material => ({
        Title: material.title || 'Untitled', Author: material.author || 'N/A', Genre: material.genre || 'General',
        'Published Date': material.published_date || 'N/A', 'Date Added': formatReportDate(material.created_at),
        Archived: material.is_archived ? 'Yes' : 'No'
      }))), String(category).slice(0, 31) || 'Materials');
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((requests || []).map(request => ({
      'Request ID': request.id, Status: request.status || 'N/A', 'User ID': request.user_id || 'N/A',
      'Requested At': formatReportDate(request.created_at)
    }))), 'Upload Requests');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((downloads || []).map(download => ({
      'Download ID': download.id, 'User ID': download.user_id || 'N/A', 'PDF ID': download.pdf_id || 'N/A',
      'Downloaded At': formatReportDate(download.downloaded_at)
    }))), 'Downloads');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((logs || []).map(log => ({
      Action: log.action_type || 'N/A', Description: log.description || 'N/A', 'User ID': log.user_id || 'N/A',
      'Created At': formatReportDate(log.created_at)
    }))), 'Audit Logs');
    XLSX.writeFile(wb, `Library_Repository_Report_${dateString}.xlsx`);
  };

  const executePdfExport = async () => {
    const now = new Date();
    const generatedDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const [{ data: materials }, { data: accounts }, { data: requests }, { data: downloads }] = await Promise.all([
      supabase.from('pdfs').select('id, title, author, category, genre, published_date, created_at, is_archived').order('category').order('created_at', { ascending: false }),
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
    const doc = new jsPDF();
    doc.setFillColor(33, 60, 81);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("LIBRARY MANAGEMENT SYSTEM REPORT", 14, 18);
    doc.setTextColor(33, 60, 81);
    doc.setFontSize(10);
    doc.text(`Generated: ${now.toLocaleString()}`, 14, 40);
    autoTable(doc, {
      startY: 48,
      head: [['Summary Metric', 'Total']],
      body: [
        ['Total Accounts', accountTotals.totalAccounts],
        ['Total Users', accountTotals.users],
        ['Total Admins', accountTotals.admins],
        ['Total Super Admins', accountTotals.superAdmins],
        ['Total PDFs / Materials', materials?.length || 0],
        ['Pending PDF Requests', requests?.length || 0],
        ['Total Downloads', downloads?.length || 0]
      ],
      theme: 'grid',
      headStyles: { fillColor: [33, 60, 81] }
    });
    let nextY = doc.lastAutoTable.finalY + 14;
    const categories = [...new Set((materials || []).map(material => material.category || 'Uncategorized'))];
    categories.forEach(category => {
      if (nextY > 245) { doc.addPage(); nextY = 18; }
      const categoryRows = (materials || []).filter(material => (material.category || 'Uncategorized') === category);
      doc.setFontSize(12);
      doc.setTextColor(33, 60, 81);
      doc.text(String(category).toUpperCase(), 14, nextY);
      autoTable(doc, {
        startY: nextY + 4,
        head: [['Title', 'Author', 'Genre', 'Published', 'Date Added', 'Status']],
        body: categoryRows.map(material => [
          material.title || 'Untitled', material.author || 'N/A', material.genre || 'General',
          material.published_date || 'N/A', formatReportDate(material.created_at), material.is_archived ? 'Archived' : 'Active'
        ]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [33, 60, 81] },
        theme: 'grid'
      });
      nextY = doc.lastAutoTable.finalY + 12;
    });
    doc.save(`Library_Official_Report_${generatedDate}.pdf`);
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
    borderRadius: '16px',
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
    { label: 'Delete Request', value: stats.deleteRequest, color: '#f87171', bg: 'linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)', darkBg: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)', icon: <DeleteSweepIcon sx={{ color: '#dc2626', fontSize: 28, opacity: 1 }} /> },
    { label: 'Users Request', value: stats.usersRequest, color: '#2dd4bf', bg: 'linear-gradient(135deg, #ccfbf1 0%, #f0fdfa 100%)', darkBg: 'linear-gradient(135deg, #134e4a 0%, #115e59 100%)', icon: <UploadFileIcon sx={{ color: '#0f9f91', fontSize: 28, opacity: 1 }} /> },
  ];

  return (
    <Box sx={{ bgcolor: isDarkMode ? '#0f172a' : '#f8fafc', minHeight: '100vh', pb: 6, width: '100%' }}>
      <Container maxWidth={false} sx={{ mt: { xs: 2, md: 4 }, px: { xs: 2, sm: 3, md: 5 } }}>
        
        {/* Top Header Title & Export Button */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h3" sx={{ fontStyle: 'italic', fontWeight: 900, color: isDarkMode ? '#ffffff' : '#213C51', fontFamily: "'Montserrat', sans-serif", fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' }, letterSpacing: '1px' }}>
            SUPERADMIN DASHBOARD
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

        {/* SECTION 1: Recent Accounts (Full-Width Responsive Table) */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ ...commonPaperStyle, p: { xs: 2, sm: 3 } }}>
              <Box sx={{ background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)', mx: { xs: -2, sm: -3 }, mt: { xs: -2, sm: -3 }, mb: 2.5, px: { xs: 2, sm: 3 }, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="h6" fontWeight="800" sx={{ color: '#ffffff' }}>
                 RECENT ACCOUNTS REGISTERED
                </Typography>
                <Chip label={`${recentAccounts.length} Total Registered`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#ffffff', fontWeight: 800 }} />
              </Box>
              
              <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow sx={{ borderBottom: '2px solid', borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>User / Member</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>ID / Number</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Department</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Year Level</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: 'text.secondary' }}>Date Joined</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentAccounts.length > 0 ? (
                      recentAccounts.map((account) => (
                        <TableRow key={account.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 }, transition: 'background-color 0.2s' }}>
                          <TableCell>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Avatar sx={{ bgcolor: '#facc15', color: '#713f12', width: 38, height: 38 }}>
                                <PersonIcon fontSize="small" />
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="700">
                                  {account.full_name || 'No Name Provided'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {account.email}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary" fontWeight="600">
                              {account.id_number || `#${String(account.id).slice(0, 6)}`}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={account.role === 'client' ? 'USER' : account.role ? account.role.toUpperCase() : 'USER'}
                              size="small" 
                              sx={{ 
                                bgcolor: account.role === 'superadmin' ? '#faf5ff' : account.role === 'admin' ? '#eef2ff' : '#f0fdf4',
                                color: account.role === 'superadmin' ? '#9333ea' : account.role === 'admin' ? '#6366f1' : '#16a34a',
                                fontWeight: 800, 
                                fontSize: '0.65rem',
                                border: '1px solid',
                                borderColor: account.role === 'superadmin' ? '#f3e8ff' : account.role === 'admin' ? '#c7d2fe' : '#bbf7d0',
                                width: 84,
                                justifyContent: 'center',
                                '& .MuiChip-label': { width: '100%', px: 0, textAlign: 'center' }
                              }} 
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="600">
                              {account.department || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="600">
                              {account.year_level || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="caption" fontWeight="600" color="text.secondary">
                              {account.created_at ? new Date(account.created_at).toLocaleDateString() : 'N/A'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          No account records found.
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
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow sx={{ borderBottom: '2px solid', borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Book Title</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Author</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Genre</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Category</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: 'text.secondary' }}>Date Added</TableCell>
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
                          <TableCell>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              {book.imageUrl ? (
                                <Box component="img" src={book.imageUrl} alt="" sx={{ width: 34, height: 34, borderRadius: '8px', objectFit: 'cover' }} />
                              ) : (
                                <Avatar sx={{ bgcolor: '#f43f5e', width: 34, height: 34 }}><BookIcon sx={{ fontSize: '1.1rem' }} /></Avatar>
                              )}
                              <Typography variant="body2" fontWeight="700" sx={{ color: '#2563eb', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                                {book.title || 'Untitled Material'}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="600" color="text.secondary">
                              {book.author || 'Unknown Author'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={book.genre || 'General'} size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={book.category ? book.category.toUpperCase() : 'BOOK'} 
                              size="small" 
                              sx={{ bgcolor: '#f1f5f9', color: '#334155', fontWeight: 800, fontSize: '0.65rem' }} 
                            />
                          </TableCell>
                          <TableCell align="right">
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

        {/* Bottom Section: Recent Activities & Dynamic Top Performing PDFs */}
        <Grid container spacing={3}>
          {/* Recent Activities Panel */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ ...commonPaperStyle, overflow: 'hidden', height: '100%' }}>
              <Box sx={{ background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)', px: 3, py: 2 }}>
                <Typography variant="subtitle1" fontWeight="800" sx={{ color: '#ffffff', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                   RECENT SYSTEM ACTIVITY
                </Typography>
              </Box>
              <List sx={{ p: 1.5 }}>
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity, index) => (
                    <ListItem key={activity.id || index} divider={index !== recentActivities.length - 1} sx={{ px: { xs: 1, sm: 2 }, py: 2, alignItems: 'flex-start', gap: { xs: 1, sm: 2 } }}>
                      <ListItemAvatar sx={{ minWidth: 44, mt: 0.5 }}>
                        <Avatar sx={{ bgcolor: '#e0e7ff', color: '#4f46e5', width: 34, height: 34 }}>
                          <HistoryIcon sx={{ fontSize: '1.1rem' }} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText sx={{ minWidth: 0, pr: 1 }}
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                            <Chip 
                              label={activity.action_type || 'ACTION'} 
                              size="small" 
                              sx={{ bgcolor: '#e2e8f0', color: '#1e293b', fontWeight: 800, fontSize: '0.65rem', height: 20, borderRadius: '4px' }} 
                            />
                            <Chip 
                              label={activity.role || 'SYSTEM'} 
                              size="small" 
                              sx={{ bgcolor: '#f3e8ff', color: '#7c3aed', fontWeight: 800, fontSize: '0.65rem', height: 20, borderRadius: '4px' }} 
                            />
                          </Stack>
                        }
                        secondary={
                          <Typography variant="body2" sx={{ color: isDarkMode ? '#cbd5e1' : '#334155', fontWeight: 600, mt: 0.5 }}>
                            <strong>{activity.performed_by || 'Admin'}:</strong> {activity.description || 'Performed system activity action.'}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))
                ) : (
                  <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                    <Typography variant="body2">No recent system activity recorded.</Typography>
                  </Box>
                )}
              </List>
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

      {/* "SEE MORE" BOOK DETAILS DIALOG */}
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
                      justify: 'center',
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

                  <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Chip label={`Genre: ${selectedBook.genre || 'General'}`} color="primary" variant="outlined" size="small" sx={{ fontWeight: 700 }} />
                    <Chip label={`Category: ${selectedBook.category || 'Book'}`} color="secondary" variant="outlined" size="small" sx={{ fontWeight: 700 }} />
                    {selectedBook.published_date && (
                      <Chip label={`Published: ${selectedBook.published_date}`} variant="outlined" size="small" sx={{ fontWeight: 700 }} />
                    )}
                  </Stack>

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

export default Dashboard;