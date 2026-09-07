import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Grid, Paper, List, ListItem, 
  ListItemAvatar, Avatar, ListItemText, useTheme,
  Select, MenuItem, FormControl, Container, useMediaQuery, Stack, Button,
  Menu, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { supabase } from '../../supabaseClient';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// MUI Icons
import DescriptionIcon from '@mui/icons-material/Description';
import GroupIcon from '@mui/icons-material/Group';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SecurityIcon from '@mui/icons-material/Security'; 
import DownloadIcon from '@mui/icons-material/Download';
import HistoryIcon from '@mui/icons-material/History';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'; 
import PublishIcon from '@mui/icons-material/Publish'; 
import PeopleIcon from '@mui/icons-material/People';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

const Dashboard = () => {
  const [stats, setStats] = useState({ 
    books: 0, papers: 0, clients: 0, admins: 0, superAdmins: 0, 
    total: 0, downloads: 0, deleteRequests: 0, clientRequests: 0,
    totalAccounts: 0 
  });
  const [activities, setActivities] = useState([]);
  const [topPdfs, setTopPdfs] = useState([]);
  const [monthlyDownloads, setMonthlyDownloads] = useState(new Array(12).fill(0));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Export states & Dialog states
  const [anchorEl, setAnchorEl] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exportType, setExportType] = useState(null); // 'excel' or 'pdf'
  const [fileSizeEst, setFileSizeEst] = useState('~120 KB');
  
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const years = [2026, 2027, 2028, 2029, 2030];

  useEffect(() => {
    const fetchData = async () => {
      const { data: rankedPdfs } = await supabase
        .from('pdfs')
        .select(`
          id, title, author, genre,
          downloads:downloads(count)
        `)
        .eq('is_archived', false);

      if (rankedPdfs) {
        const sortedDocs = rankedPdfs
          .map(pdf => ({
            ...pdf,
            download_count: pdf.downloads?.[0]?.count || 0
          }))
          .sort((a, b) => b.download_count - a.download_count)
          .slice(0, 5);
        setTopPdfs(sortedDocs);
      }

      const { count: books } = await supabase.from('pdfs').select('*', { count: 'exact', head: true }).eq('category', 'book').eq('is_archived', false);
      const { count: papers } = await supabase.from('pdfs').select('*', { count: 'exact', head: true }).eq('category', 'academic paper').eq('is_archived', false);
      const { count: clients } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client');
      const { count: admins } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin');
      const { count: superAdmins } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'superadmin');
      const { count: deleteReqs } = await supabase.from('delete_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: clientReqs } = await supabase.from('upload_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');

      const { data: downloadList } = await supabase
        .from('downloads')
        .select('downloaded_at')
        .gte('downloaded_at', `${selectedYear}-01-01`)
        .lte('downloaded_at', `${selectedYear}-12-31`);
      
      setStats({ 
        books: books || 0, 
        papers: papers || 0, 
        clients: clients || 0, 
        admins: admins || 0, 
        superAdmins: superAdmins || 0,
        deleteRequests: deleteReqs || 0,
        clientRequests: clientReqs || 0,
        totalAccounts: (clients || 0) + (admins || 0) + (superAdmins || 0),
        total: (books || 0) + (papers || 0), 
        downloads: downloadList?.length || 0 
      });

      const trends = new Array(12).fill(0);
      downloadList?.forEach((item) => {
        const month = new Date(item.downloaded_at).getMonth();
        trends[month]++;
      });
      setMonthlyDownloads(trends);

      const { data: logs, error: logError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!logError && logs) {
        const logsWithProfiles = await Promise.all(logs.map(async (log) => {
          const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', log.user_id).single();
          return { ...log, profiles: profile };
        }));
        setActivities(logsWithProfiles);
      }
    };
    fetchData();
  }, [selectedYear]);

  // Handlers for Export Menu & Confirmation Dialog
  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSelectExportType = (type) => {
    setExportType(type);
    setFileSizeEst(type === 'pdf' ? '~350 KB (PDF Report)' : '~85 KB (Excel Workbook)');
    handleMenuClose();
    setConfirmOpen(true);
  };

  const handleConfirmExport = () => {
    setConfirmOpen(false);
    if (exportType === 'excel') {
      executeExcelExport();
    } else if (exportType === 'pdf') {
      executePdfExport();
    }
  };

  const executeExcelExport = async () => {
    const { data: allPDFs } = await supabase.from('pdfs').select('*').eq('is_archived', false);
    const { data: allProfiles } = await supabase.from('profiles').select('*');

    const now = new Date();
    const dateString = `${now.toLocaleString('default', { month: 'long' })}-${now.getDate()}-${now.getFullYear()}`;
    const wb = XLSX.utils.book_new();

    let dashboardSheetData = [
      ["LIBRARY REPOSITORY SYSTEM SUMMARY REPORT"],
      ["Generated on:", now.toLocaleString()],
      [],
      ["OVERVIEW STATS"],
      ["Metric", "Value"],
      ["Total PDF", stats.total],
      ["Total Accounts", stats.totalAccounts],
      ["Clients", stats.clients],
      ["Super Admins", stats.superAdmins],
      ["Total Admins", stats.admins],
      ["Total Downloads", stats.downloads],
      ["Pending Delete Requests", stats.deleteRequests],
      ["Pending Client Requests", stats.clientRequests],
      [],
      ["RESOURCE RATIO"],
      ["Category", "Count"],
      ["Books", stats.books],
      ["Academic Papers", stats.papers],
    ];
    const wsDashboard = XLSX.utils.aoa_to_sheet(dashboardSheetData);
    XLSX.utils.book_append_sheet(wb, wsDashboard, "Dashboard Summary");

    let accountsSheetData = [["USER ACCOUNTS CATEGORIZED BY ROLE"], ["Generated on:", now.toLocaleString()], []];
    ['superadmin', 'admin', 'client'].forEach(role => {
      const filtered = allProfiles?.filter(acc => acc.role === role) || [];
      accountsSheetData.push([`${role.toUpperCase()} ACCOUNTS`]);
      if (filtered.length > 0) {
        accountsSheetData.push(["Full Name", "ID Number", "Department", "Email", "Role", "Created At"]);
        filtered.forEach(item => {
          accountsSheetData.push([
            item.full_name || 'N/A', item.id_number || 'N/A', item.department || 'N/A',
            item.email || 'N/A', item.role, new Date(item.created_at).toLocaleDateString()
          ]);
        });
      } else {
        accountsSheetData.push(["No accounts found for this role."]);
      }
      accountsSheetData.push([]);
    });
    const wsAccounts = XLSX.utils.aoa_to_sheet(accountsSheetData);
    XLSX.utils.book_append_sheet(wb, wsAccounts, "Accounts");

    let pdfSheetData = [["PDF LIBRARY CATEGORIZED BY TYPE"], ["Generated on:", now.toLocaleString()], []];
    ['book', 'academic paper'].forEach(cat => {
      const filtered = allPDFs?.filter(p => p.category?.toLowerCase() === cat.toLowerCase()) || [];
      pdfSheetData.push([`${cat.toUpperCase()}S`]);
      if (filtered.length > 0) {
        pdfSheetData.push(["ID", "Title", "Author", "Genre", "Category", "Uploaded At"]);
        filtered.forEach(item => {
          pdfSheetData.push([
            item.id, item.title, item.author || 'N/A', item.genre || 'Uncategorized',
            item.category, new Date(item.created_at).toLocaleDateString()
          ]);
        });
      } else {
        pdfSheetData.push([`No ${cat}s found in the library.`]);
      }
      pdfSheetData.push([]);
    });
    const wsPDFs = XLSX.utils.aoa_to_sheet(pdfSheetData);
    XLSX.utils.book_append_sheet(wb, wsPDFs, "PDF Library");

    XLSX.writeFile(wb, `Library_Repository_Report_${dateString}.xlsx`);
  };

  const executePdfExport = async () => {
    const { data: allPDFs } = await supabase.from('pdfs').select('*').eq('is_archived', false);
    const now = new Date();
    const dateTimeString = now.toLocaleString('en-US', { 
      month: 'long', day: 'numeric', year: 'numeric', 
      hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });

    const doc = new jsPDF();

    // Formal Header Design
    doc.setFillColor(33, 60, 81); // #213C51
    doc.rect(0, 0, 210, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("LIBRARY REPOSITORY SYSTEM", 14, 15);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${dateTimeString}`, 14, 22);

    // Summary Section Text
    doc.setTextColor(33, 60, 81);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Executive Summary & Statistics", 14, 42);

    const summaryData = [
      ["Total Documents", stats.total],
      ["Total Books", stats.books],
      ["Academic Papers", stats.papers],
      ["Total System Downloads", stats.downloads],
      ["Pending Delete Requests", stats.deleteRequests],
      ["Pending Client Requests", stats.clientRequests]
    ];

    autoTable(doc, {
      startY: 46,
      head: [["Metric Description", "Count"]],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [33, 60, 81], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 }
    });

    let currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : 90;

    // Books Table Section
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Categorized Materials: Books", 14, currentY);

    const booksList = allPDFs?.filter(p => p.category?.toLowerCase() === 'book') || [];
    const booksRows = booksList.map(item => [
      item.title || 'N/A', 
      item.author || 'N/A', 
      item.genre || 'General', 
      new Date(item.created_at).toLocaleDateString()
    ]);

    autoTable(doc, {
      startY: currentY + 4,
      head: [["Title", "Author", "Genre", "Uploaded At"]],
      body: booksRows.length > 0 ? booksRows : [["No books found in the repository.", "", "", ""]],
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : currentY + 50;

    // Check page overflow to add page if needed
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    // Academic Papers Table Section
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Categorized Materials: Academic Papers", 14, currentY);

    const papersList = allPDFs?.filter(p => p.category?.toLowerCase() === 'academic paper') || [];
    const papersRows = papersList.map(item => [
      item.title || 'N/A', 
      item.author || 'N/A', 
      item.genre || 'General', 
      new Date(item.created_at).toLocaleDateString()
    ]);

    autoTable(doc, {
      startY: currentY + 4,
      head: [["Title", "Author", "Genre", "Uploaded At"]],
      body: papersRows.length > 0 ? papersRows : [["No academic papers found in the repository.", "", "", ""]],
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    // Footer with page count
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount} - Library Repository System Report`, 14, 290);
    }

    const fileDateStr = `${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear()}`;
    doc.save(`Library_Official_Report_${fileDateStr}.pdf`);
  };

  const statItems = [
    { title: 'Total PDF', val: stats.total, icon: <DescriptionIcon />, color: '#3b82f6' },
    { title: 'Total Accounts', val: stats.totalAccounts, icon: <PeopleIcon />, color: '#6366f1' },
    { title: 'Users', val: stats.clients, icon: <GroupIcon />, color: '#10b981' },
    { title: 'Super Admin', val: stats.superAdmins, icon: <SecurityIcon />, color: '#7c3aed' },
    { title: 'Total Admins', val: stats.admins, icon: <AdminPanelSettingsIcon />, color: '#8b5cf6' },
    { title: 'Downloads', val: stats.downloads, icon: <DownloadIcon />, color: '#f59e0b' },
    { title: 'Delete Request', val: stats.deleteRequests, icon: <DeleteSweepIcon />, color: '#ef4444' },
    { title: 'Users Request', val: stats.clientRequests, icon: <PublishIcon />, color: '#06b6d4' }
  ];

  const commonPaperStyle = {
    p: 3, borderRadius: '16px',
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0'}`,
    color: isDarkMode ? '#f8fafc' : '#213C51',
    display: 'flex', flexDirection: 'column',
    boxShadow: isDarkMode ? 'none' : '0 2px 10px rgba(0,0,0,0.03)',
    overflow: 'hidden'
  };

  const headerBoxStyle = {
    bgcolor: '#213C51', p: 2, mt: -3, mx: -3, mb: 3,
    borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  };

  const headerTextStyle = {
    fontFamily: "'Montserrat', sans-serif", color: '#ffffff', fontWeight: 900, fontSize: '0.9rem',
    textTransform: 'uppercase', letterSpacing: '1px'
  };

  const getRoleStyles = (role, darkMode) => {
    const r = role?.toLowerCase();
    if (darkMode) {
      if (r === 'superadmin') return { bg: '#f3e8ff1a', text: '#d8b4fe' }; 
      if (r === 'admin') return { bg: '#fef3c71a', text: '#fbbf24' }; 
      if (r === 'client') return { bg: '#dbeafe1a', text: '#60a5fa' }; 
      return { bg: '#1e293b', text: '#94a3b8' };
    }
    if (r === 'superadmin') return { bg: '#F3E8FF', text: '#7C3AED' }; 
    if (r === 'admin') return { bg: '#FEF3C7', text: '#D97706' }; 
    if (r === 'client') return { bg: '#DBEAFE', text: '#2563EB' }; 
    return { bg: '#F1F5F9', text: '#475569' };
  };

  const getActionStyles = (action, darkMode) => {
    const type = action?.toLowerCase();
    const base = { bg: 'transparent', label: action?.toUpperCase() || 'ACTION' };
    if (type?.includes('upload')) return { ...base, text: darkMode ? '#4ade80' : '#ffffff', bg: darkMode ? 'transparent' : '#2F6B3F', label: 'UPLOAD' };
    if (type?.includes('edit')) return { ...base, text: darkMode ? '#facc15' : '#7c6800', bg: darkMode ? 'transparent' : '#ffd500', label: 'EDIT' };
    if (type?.includes('delete')) return { ...base, text: darkMode ? '#f87171' : '#ffffff', bg: darkMode ? 'transparent' : '#A82323', label: 'DELETE' };
    if (type?.includes('download')) return { ...base, text: darkMode ? '#818cf8' : '#ffffff', bg: darkMode ? 'transparent' : '#261CC1', label: 'DOWNLOAD' };
    return { ...base, text: darkMode ? '#94a3b8' : '#475569', bg: darkMode ? 'transparent' : '#f1f5f9' };
  };

  return (
    <Box sx={{ bgcolor: isDarkMode ? '#0f172a' : '#ffffff', minHeight: '100vh', pb: 6 }}>
      <Container maxWidth="xls" sx={{ mt: { xs: 1, md: 7 } }}>
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h3" sx={{ fontStyle: 'italic', fontWeight: 900, color: isDarkMode ? '#ffffff' : '#213C51', fontFamily: "'Montserrat', sans-serif", fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' }, letterSpacing: '1px' }}>
                DASHBOARD OVERVIEW
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, display: 'block' }}>
                SYSTEM OVERVIEW & ANALYTICS
              </Typography>
            </Box>
            
            {/* Export Report Button & Dropdown Menu */}
            <Button 
              variant="contained" 
              startIcon={<FileDownloadIcon />} 
              onClick={handleMenuClick} 
              sx={{ bgcolor: '#213C51', color: '#ffffff', '&:hover': { bgcolor: '#162836' }, fontFamily: "'Montserrat', sans-serif", fontWeight: 700, borderRadius: '8px' }}
            >
              Generate Report
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={() => handleSelectExportType('pdf')}>Generate PDF Report</MenuItem>
              <MenuItem onClick={() => handleSelectExportType('excel')}>Generate Excel Workbook</MenuItem>
            </Menu>
          </Stack>
        </Box>

        {/* Confirmation Dialog */}
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle sx={{ fontWeight: 800, color: '#213C51' }}>Confirm Generate Report</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mt: 1 }}>
              Do you want to Generate this system report now? 
              <br /><br />
              <strong>Format:</strong> {exportType?.toUpperCase()}
              <br />
              <strong>Estimated File Size:</strong> {fileSizeEst}
              <br />
              <strong>Generated Timestamp:</strong> {new Date().toLocaleString()}
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setConfirmOpen(false)} color="inherit" sx={{ fontWeight: 700 }}>
              Cancel
            </Button>
            <Button onClick={handleConfirmExport} variant="contained" sx={{ bgcolor: '#213C51', fontWeight: 700 }}>
              Proceed
            </Button>
          </DialogActions>
        </Dialog>

        <Grid container spacing={2} sx={{ mb: 5 }}>
          {statItems.map((item, i) => (
            <Grid item xs={6} sm={4} md={1.5} key={i}> 
              <Paper sx={{ ...commonPaperStyle, alignItems: 'center', textAlign: 'center', minWidth: 130, p: 2 }}>
                <Avatar sx={{ bgcolor: `${item.color}15`, color: item.color, mb: 1 }}>{item.icon}</Avatar>
                <Typography variant="caption" fontWeight="700" color="textSecondary" sx={{ whiteSpace: 'nowrap' }}>{item.title}</Typography>
                <Typography variant="h5" fontWeight="900" sx={{ color: item.color }}>{item.val}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mb: 4 }}>
          <Paper sx={commonPaperStyle}>
            <Box sx={headerBoxStyle}>
              <Typography sx={headerTextStyle}>Download Trends</Typography>
              <FormControl size="small" sx={{ minWidth: 100, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                <Select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} sx={{ color: 'white', '.MuiSvgIcon-root': { color: 'white' }, fontWeight: 700 }}>
                  {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ width: '100%', overflowX: isMobile ? 'auto' : 'hidden', backgroundColor: '#fff', overflowY: 'hidden', borderRadius: '12px', p: 1 }}>
              <Box sx={{ minWidth: isMobile ? 100 : '100%', height: 350 }}>
                {isMobile ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {monthlyDownloads.map((val, index) => {
                      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      if (val === 0) return null; 
                      return (
                        <Box key={index} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0px 2px 8px rgba(0,0,0,0.05)', borderLeft: '5px solid #3b82f6' }}>
                          <Typography sx={{ fontWeight: 'bold', color: '#1e293b' }}>{months[index]}</Typography>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h6" sx={{ color: '#3b82f6', fontWeight: 800 }}>{val}</Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>Downloads</Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <LineChart
                    xAxis={[{ scaleType: 'point', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], tickLabelStyle: { fontSize: 12, fill: '#64748b', fontWeight: 500 } }]}
                    series={[{ data: monthlyDownloads, color: '#3b82f6', label: 'Downloads', area: true, showMark: true }]}
                    height={350}
                    margin={{ top: 40, bottom: 40, left: 50, right: 20 }}
                  />
                )}
              </Box>
            </Box>
          </Paper>
        </Box>

        <Grid container spacing={4} sx={{ mb: 4 }}>
          <Grid item xs={1} md={4}>
            <Paper sx={{ ...commonPaperStyle, height: '100%', minHeight: 450, width: '100%' }}>
              <Box sx={headerBoxStyle}>
                <Typography sx={headerTextStyle}>Resources Ratio</Typography>
              </Box>
              <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <PieChart
                  series={[{ innerRadius: 55, outerRadius: 110, paddingAngle: 5, arcLabel: (item) => `${item.value}`, arcLabelMinAngle: 35, data: [{ id: 0, value: stats.books, label: 'Books', color: '#ec4899' }, { id: 1, value: stats.papers, label: 'Papers', color: '#0ea5e9' }] }]}
                  sx={{ '& .MuiPieArcLabel-root': { fill: 'white', fontWeight: 'bold', fontSize: 18 } }}
                  height={300}
                />
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            <Grid container spacing={4} sx={{ height: '100%' }}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ ...commonPaperStyle, height: '100%', width: '100%' }}>
                  <Box sx={headerBoxStyle}>
                    <Typography sx={headerTextStyle}>Recent Activities</Typography>
                  </Box>
                  <List disablePadding>
                    {activities.map((act, i) => {
                      const roleStyle = getRoleStyles(act.profiles?.role, isDarkMode);
                      const actionStyle = getActionStyles(act.action_type, isDarkMode);
                      return (
                        <ListItem key={i} divider={i !== activities.length - 1} sx={{ px: 0, py: 1.5 }}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: isDarkMode ? '#334155' : '#f1f5f9', color: '#3b82f6' }}><HistoryIcon /></Avatar> 
                          </ListItemAvatar>
                          <ListItemText 
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Box sx={{ px: 1, py: 0.2, borderRadius: '4px', fontSize: '0.6rem', fontWeight: 900, bgcolor: actionStyle.bg, color: actionStyle.text, border: isDarkMode ? `1px solid ${actionStyle.text}` : 'none', textAlign: 'center', minWidth: '70px' }}>{actionStyle.label}</Box>
                                <Typography variant="caption" sx={{ fontWeight: 900, color: roleStyle.text }}>{act.profiles?.role?.toUpperCase() || 'USER'}</Typography>
                              </Box>
                            }
                            secondary={<Typography variant="caption" color="textSecondary" sx={{ fontWeight: 500, display: 'block', lineHeight: 1.2 }}><span style={{ fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#1e293b' }}>{act.profiles?.full_name || 'System'}</span>: {act.description}</Typography>} 
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Paper>
              </Grid>

              <Grid item xs={8} md={12}>
                <Paper sx={{ ...commonPaperStyle, height: '100%', width: '100%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={headerBoxStyle}>
                    <Typography sx={headerTextStyle}>Top Performing PDFs</Typography>
                  </Box>
                  <List disablePadding>
                    {topPdfs.map((pdf, i) => (
                      <ListItem key={pdf.id} divider={i !== topPdfs.length - 1} sx={{ px: 0, py: 1.5, display: 'flex', alignItems: 'center' }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: '#f59e0b15', color: '#f59e0b' }}><Typography variant="caption" fontWeight="900">#{i + 1}</Typography></Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          sx={{ minWidth: isMobile ? 'auto' : 300, mr: 2 }}
                          primary={<Typography variant="caption" sx={{ fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#1e293b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pdf.title}</Typography>} 
                          secondary={<Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pdf.author || 'Unknown'} • {pdf.genre || 'General'}</Typography>} 
                        />
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: '#f59e0b', ml: 'auto', flexShrink: 0 }}>
                          <DownloadIcon sx={{ fontSize: '0.9rem' }} />
                          <Typography variant="caption" sx={{ fontWeight: 900 }}>{pdf.download_count}</Typography>
                        </Stack>
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;