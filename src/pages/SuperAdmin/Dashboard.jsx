import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, List, ListItem, ListItemAvatar, Avatar, ListItemText, Divider } from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { Calendar as CalendarIcon } from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { supabase } from '../../supabaseClient';

// Importing MUI Icons
import DescriptionIcon from '@mui/icons-material/Description';
import GroupIcon from '@mui/icons-material/Group';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DownloadIcon from '@mui/icons-material/Download';
import HistoryIcon from '@mui/icons-material/History';
import SchoolIcon from '@mui/icons-material/School';

const Dashboard = () => {
  const [stats, setStats] = useState({ books: 0, papers: 0, clients: 0, admins: 0, total: 0, downloads: 0 });
  const [activities, setActivities] = useState([]);
  const [monthlyDownloads, setMonthlyDownloads] = useState(new Array(12).fill(0));

  useEffect(() => {
    const fetchData = async () => {
      const { count: books } = await supabase.from('pdfs').select('*', { count: 'exact', head: true }).eq('category', 'book');
      const { count: papers } = await supabase.from('pdfs').select('*', { count: 'exact', head: true }).eq('category', 'academic paper');
      const { count: clients } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client');
      const { count: admins } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin');
      const { data: downloadList } = await supabase.from('downloads').select('downloaded_at');
      
      setStats({ books, papers, clients, admins, total: (books + papers), downloads: downloadList?.length || 0 });

      if (downloadList) {
        const trends = new Array(12).fill(0);
        downloadList.forEach((item) => {
          const month = new Date(item.downloaded_at).getMonth();
          trends[month]++;
        });
        setMonthlyDownloads(trends);
      }

      const { data: logs } = await supabase.from('audit_logs').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(5);
      setActivities(logs || []);
    };
    fetchData();
  }, []);

  // Updated Stat Data with 6 items
  const statItems = [
    { title: 'Total PDF', val: stats.total, icon: <DescriptionIcon />, color: '#1e3a8a' },
    { title: 'Clients', val: stats.clients, icon: <GroupIcon />, color: '#059669' },
    { title: 'Admins', val: stats.admins, icon: <AdminPanelSettingsIcon />, color: '#7c3aed' },
    { title: 'Books', val: stats.books, icon: <MenuBookIcon />, color: '#db2777' },
    { title: 'Academic', val: stats.papers, icon: <SchoolIcon />, color: '#0284c7' },
    { title: 'Downloads', val: stats.downloads, icon: <DownloadIcon />, color: '#d97706' }
  ];

  return (
    <Box sx={{ p: 2, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <Typography variant="h4" fontWeight="900" sx={{ mb: 4, color: '#0f172a', mt: 1 }}>Dashboard Overview</Typography>

      

      {/* Row 1: Stat Cards - 6 items */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {statItems.map((item, i) => (
          <Grid item xs={12} sm={6} md={2} key={i}>
            <Paper sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: `${item.color}15`, color: item.color }}>{item.icon}</Avatar>
              <Box>
                <Typography variant="caption" color="textSecondary" fontWeight="700">{item.title.toUpperCase()}</Typography>
                <Typography variant="h5" fontWeight="800">{item.val}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

          
      {/* Row 2: Monthly Download Trends */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight="800" sx={{ mb: 2 }}>Client Download Trends</Typography>
        <LineChart
          xAxis={[{ scaleType: 'point', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] }]}
          series={[{ curve: "linear", data: monthlyDownloads, label: 'Total Downloads', color: '#1e3a8a' }]}
          height={300}
        />
      </Paper>

      {/* Row 3: 3-Column Bottom */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, height: 400 }}>
            <Typography variant="h6" fontWeight="800" sx={{ mb: 2 }}>Resources Ratio</Typography>
            <PieChart series={[{ innerRadius: 50, outerRadius: 100, data: [{id: 0, value: stats.books, label: 'Books'}, {id: 1, value: stats.papers, label: 'Papers'}], arcLabel: 'value' }]} height={300} />
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, height: 400 }}>
            <Typography variant="h6" fontWeight="800" sx={{ mb: 2 }}>Recent Activities</Typography>
            <List>
               {activities.map((act, i) => (
                 <ListItem key={i}>
                   <ListItemAvatar><Avatar><HistoryIcon /></Avatar></ListItemAvatar>
                   <ListItemText primary={act.action_type} secondary={act.description} />
                 </ListItem>
               ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, height: 400 }}>
            <Typography variant="h6" fontWeight="800" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}><CalendarIcon size={20}/> Mini Calendar</Typography>
            <Calendar />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;