// src/pages/user/DownloadOverview.jsx  (adjust the folder to match your project)
import { Card, Box, Typography, Select, MenuItem, useTheme, useMediaQuery } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Hide the "0" label on empty months so the chart stays clean.
const barLabel = (item) => (item.value ? String(item.value) : null);

const DownloadOverview = ({ year, years, onYearChange, monthlyDownloads, cardSx }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const series = [{
    data: monthlyDownloads,
    color: '#3b82f6',
    label: 'My Downloads',
    ...(isMobile ? { layout: 'horizontal' } : {}), // needed on older x-charts, ignored on newer
  }];

  return (
    // Card is a flex column so the chart area grows to fill whatever height
    // the left column gets, instead of sitting small with empty space below.
    <Card sx={{ ...cardSx, width: '100%', overflow: 'hidden', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
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
          value={year}
          onChange={(e) => onYearChange(e.target.value)}
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
          {years.map((y) => (
            <MenuItem key={y} value={y}>Year {y}</MenuItem>
          ))}
        </Select>
      </Box>

      {/* No fixed `height` on the chart: it measures this box. Desktop fills the
          card (min 320px); mobile gets a taller box so 12 horizontal bars breathe. */}
      <Box sx={{ flex: 1, width: '100%', minHeight: isMobile ? 460 : 320, p: { xs: 1, sm: 2 } }}>
        {isMobile ? (
          <BarChart
            layout="horizontal"
            yAxis={[{ scaleType: 'band', data: MONTHS }]}
            xAxis={[{ min: 0, tickMinStep: 1 }]}
            series={series}
            barLabel={barLabel}
            margin={{ top: 20, bottom: 25, left: 10, right: 30 }}
          />
        ) : (
          <BarChart
            xAxis={[{ scaleType: 'band', data: MONTHS }]}
            yAxis={[{ min: 0, tickMinStep: 1 }]}
            series={series}
            barLabel={barLabel}
            margin={{ top: 20, bottom: 25, left: 45, right: 25 }}
          />
        )}
      </Box>
    </Card>
  );
};

export default DownloadOverview;