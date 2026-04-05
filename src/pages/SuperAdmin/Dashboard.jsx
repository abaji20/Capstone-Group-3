import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Grid, Paper, List, ListItem, 
  ListItemAvatar, Avatar, ListItemText, useTheme,
  Select, MenuItem, FormControl, Container, useMediaQuery, Stack
} from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { supabase } from '../../supabaseClient';

// MUI Icons
import DescriptionIcon from '@mui/icons-material/Description';
import GroupIcon from '@mui/icons-material/Group';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SecurityIcon from '@mui/icons-material/Security'; 
import DownloadIcon from '@mui/icons-material/Download';
import HistoryIcon from '@mui/icons-material/History';

const Dashboard = () => {
  // Added superAdmins to state
  const [stats, setStats] = useState({ books: 0, papers: 0, clients: 0, admins: 0, superAdmins: 0, total: 0, downloads: 0 });
  const [activities, setActivities] = useState([]);
  const [monthlyDownloads, setMonthlyDownloads] = useState(new Array(12).fill(0));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const years = [2026, 2027, 2028, 2029, 2030];

  useEffect(() => {
    const fetchData = async () => {
      const { count: books } = await supabase.from('pdfs').select('*', { count: 'exact', head: true }).eq('category', 'book');
      const { count: papers } = await supabase.from('pdfs').select('*', { count: 'exact', head: true }).eq('category', 'academic paper');
      const { count: clients } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client');
      
      // Separate counts for Admin and Superadmin
      const { count: admins } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin');
      const { count: superAdmins } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'superadmin');
      
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

  // Updated statItems: Removed Books/Academic, Added Super Admin
  const statItems = [
    { title: 'Total PDF', val: stats.total, icon: <DescriptionIcon />, color: '#3b82f6' },
    { title: 'Clients', val: stats.clients, icon: <GroupIcon />, color: '#10b981' },
    { title: 'Super Admin', val: stats.superAdmins, icon: <SecurityIcon />, color: '#7c3aed' },
    { title: 'Total Admins', val: stats.admins, icon: <AdminPanelSettingsIcon />, color: '#8b5cf6' },
    { title: 'Downloads', val: stats.downloads, icon: <DownloadIcon />, color: '#f59e0b' }
  ];

  const commonPaperStyle = {
    p: 3,
    borderRadius: '16px',
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0'}`,
    color: isDarkMode ? '#f8fafc' : '#213C51',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: isDarkMode ? 'none' : '0 2px 10px rgba(0,0,0,0.03)',
    overflow: 'hidden'
  };

  const headerBoxStyle = {
    bgcolor: '#213C51', 
    p: 2, mt: -3, mx: -3, mb: 3,
    borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  };

  const headerTextStyle = {
    fontFamily: "'Montserrat', sans-serif",
    color: '#ffffff', fontWeight: 900, fontSize: '0.9rem',
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
    const isDark = darkMode;
    const base = { bg: 'transparent', label: action?.toUpperCase() || 'ACTION' };
    if (type?.includes('upload')) return { ...base, text: isDark ? '#4ade80' : '#ffffff', bg: isDark ? 'transparent' : '#2F6B3F', label: 'UPLOAD' };
    if (type?.includes('edit')) return { ...base, text: isDark ? '#facc15' : '#7c6800', bg: isDark ? 'transparent' : '#ffd500', label: 'EDIT' };
    if (type?.includes('delete')) return { ...base, text: isDark ? '#f87171' : '#ffffff', bg: isDark ? 'transparent' : '#A82323', label: 'DELETE' };
    if (type?.includes('download')) return { ...base, text: isDark ? '#818cf8' : '#ffffff', bg: isDark ? 'transparent' : '#261CC1', label: 'DOWNLOAD' };
    return { ...base, text: isDark ? '#94a3b8' : '#475569', bg: isDark ? 'transparent' : '#f1f5f9' };
  };

  return (
    <Box sx={{ bgcolor: isDarkMode ? '#0f172a' : '#ffffff', minHeight: '100vh', pb: 6 }}>
      <Container maxWidth="xl" sx={{ mt: { xs: 2, md: 4 } }}>
        
        {/* DASHBOARD HEADER */}
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontStyle: 'italic', fontWeight: 900, color: isDarkMode ? '#ffffff' : '#213C51', 
                  fontFamily: "'Montserrat', sans-serif", fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' }, letterSpacing: '1px'
                }}
              >
                DASHBOARD OVERVIEW
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, display: 'block' }}>
                SYSTEM OVERVIEW & ANALYTICS
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* TOP STATS CARDS */}
        <Grid container spacing={2} sx={{ mb: 5 }}>
          {statItems.map((item, i) => (
            <Grid item xs={6} sm={4} md={2.4} key={i}>
              <Paper sx={{ ...commonPaperStyle, alignItems: 'center', textAlign: 'center', minWidth: 160, p: 2 }}>
                <Avatar sx={{ bgcolor: `${item.color}15`, color: item.color, mb: 1 }}>{item.icon}</Avatar>
                <Typography variant="caption" fontWeight="700" color="textSecondary">{item.title}</Typography>
                <Typography variant="h5" fontWeight="900" sx={{ color: item.color }}>{item.val}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* DOWNLOAD TRENDS SECTION */}
        <Box sx={{ mb: 4 }}>
          <Paper sx={commonPaperStyle}>
            <Box sx={headerBoxStyle}>
              <Typography sx={headerTextStyle}>Download Trends</Typography>
              <FormControl size="small" sx={{ minWidth: 100, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  sx={{ color: 'white', '.MuiSvgIcon-root': { color: 'white' }, fontWeight: 700 }}
                >
                  {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ width: '100%', height: 350 }}>
              <BarChart
                xAxis={[{ scaleType: 'band', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] }]}
                series={[{ data: monthlyDownloads, color: '#3b82f6', label: 'Downloads' }]}
                height={350}
                margin={{ top: 10, bottom: 30, left: 40, right: 10 }}
              />
            </Box>
          </Paper>
        </Box>

        {/* RESOURCES AND RECENT ACTIVITIES GRID */}
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ ...commonPaperStyle, height: '100%', minHeight: 450 }}>
              <Box sx={headerBoxStyle}>
                <Typography sx={headerTextStyle}>Resources Ratio</Typography>
              </Box>
              <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <PieChart
                  series={[{ 
                    innerRadius: 55, outerRadius: 110, paddingAngle: 5,
                    arcLabel: (item) => `${item.value}`, arcLabelMinAngle: 35,
                    data: [
                      { id: 0, value: stats.books, label: 'Books', color: '#ec4899' },
                      { id: 1, value: stats.papers, label: 'Papers', color: '#0ea5e9' }
                    ] 
                  }]}
                  sx={{ '& .MuiPieArcLabel-root': { fill: 'white', fontWeight: 'bold', fontSize: 20 } }}
                  height={300}
                />
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            <Paper sx={{ ...commonPaperStyle, height: '100%' }}>
              <Box sx={headerBoxStyle}>
                <Typography sx={headerTextStyle}>Recent Activities</Typography>
              </Box>
              <List disablePadding>
                {activities.length > 0 ? (
                  activities.map((act, i) => {
                    const roleStyle = getRoleStyles(act.profiles?.role, isDarkMode);
                    const actionStyle = getActionStyles(act.action_type, isDarkMode);
                    return (
                      <ListItem key={i} divider={i !== activities.length - 1} sx={{ px: 0, py: 1.5 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: isDarkMode ? '#334155' : '#f1f5f9', color: '#3b82f6' }}>
                            <HistoryIcon />
                          </Avatar> 
                        </ListItemAvatar>
                        <ListItemText 
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                              <Box sx={{ 
                                px: 1.5, py: 0.3, borderRadius: '4px', fontSize: '0.65rem', fontWeight: 900,
                                bgcolor: actionStyle.bg, color: actionStyle.text, 
                                border: isDarkMode ? `1px solid ${actionStyle.text}` : 'none',
                                textAlign: 'center', minWidth: '80px'
                              }}>
                                {actionStyle.label}
                              </Box>
                              <Typography variant="caption" sx={{ fontWeight: 900, color: roleStyle.text }}>
                                {act.profiles?.role?.toUpperCase() || 'USER'}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 500 }}>
                              <span style={{ fontWeight: 800, color: isDarkMode ? '#f8fafc' : '#1e293b' }}>
                                {act.profiles?.full_name || 'System'}
                              </span>: {act.description}
                            </Typography>
                          } 
                        />
                        {!isMobile && (
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', ml: 2 }}>
                            {new Date(act.created_at).toLocaleDateString()}
                          </Typography>
                        )}
                      </ListItem>
                    );
                  })
                ) : (
                  <Box sx={{ py: 4, textAlign: 'center', opacity: 0.5 }}>
                    <HistoryIcon sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="body2">No recent activities found.</Typography>
                  </Box>
                )}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;