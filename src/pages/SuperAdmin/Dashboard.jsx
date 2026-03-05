import React from 'react';
import { Box, Grid, Paper, Typography, Stack } from '@mui/material';
import { PageHeader, StatusChip } from '../../shared';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import StorageIcon from '@mui/icons-material/Storage';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

// Small Card Component for Stats
const StatCard = ({ title, value, icon, color }) => (
  <Paper sx={{ p: 3, borderRadius: 2, borderLeft: `5px solid ${color}` }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{value}</Typography>
        <Typography variant="body2" color="textSecondary">{title}</Typography>
      </Box>
      <Box sx={{ color: color }}>{icon}</Box>
    </Stack>
  </Paper>
);

const Dashboard = () => {
  return (
    <Box>
      <PageHeader 
        title="Super Admin Dashboard" 
        subtitle="Welcome back! Here is what's happening across the entire library system today." 
      />

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Users" value="152" icon={<PeopleIcon />} color="#1976d2" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Active PDFs" value="1,240" icon={<DescriptionIcon />} color="#2e7d32" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Storage Used" value="85%" icon={<StorageIcon />} color="#ed6c02" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Pending Deletes" value="8" icon={<ErrorOutlineIcon />} color="#d32f2f" />
        </Grid>
      </Grid>

      <Paper sx={{ mt: 4, p: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          Recent System Alerts
        </Typography>
        <Stack spacing={2}>
          <Box sx={{ p: 2, bgcolor: '#fff4e5', borderRadius: 1, border: '1px solid #ffe2b7' }}>
            <Typography variant="body2">
              <strong>Security Alert:</strong> Admin "Mark_Admin" requested deletion of 5 sensitive documents. 
              <span style={{ color: '#ed6c02', marginLeft: '10px', fontWeight: 'bold' }}>Check Delete Requests</span>
            </Typography>
          </Box>
          <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 1, border: '1px solid #c8e6c9' }}>
            <Typography variant="body2">
              <strong>User Growth:</strong> 12 new Student accounts were registered in the last 24 hours.
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};

export default Dashboard;