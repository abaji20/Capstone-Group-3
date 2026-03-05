import React from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { PageHeader, PdfCard, SearchBar} from '../../shared';

const Downloads = () => {
  // Mock data of what the student already downloaded
  const myHistory = [
    { id: 101, title: 'Network Security Fundamentals', category: 'IT', date: 'Downloaded 2 days ago' },
    { id: 105, title: 'Database Management Systems', category: 'IT', date: 'Downloaded 1 week ago' },
  ];

  return (
    <Box>
      <PageHeader 
        title="My Downloads" 
        subtitle="Access the documents you have previously saved." 
      />
       <Box sx={{ mb: 4, maxWidth: 600 }}>
              <SearchBar placeholder="Search by document title or subject..." />
            </Box>

      {myHistory.length > 0 ? (
        <Grid container spacing={3}>
          {myHistory.map((doc) => (
            <Grid item xs={12} sm={6} md={4} key={doc.id}>
              <PdfCard 
                title={doc.title} 
                category={doc.category} 
                onDownload={() => alert("Re-downloading...")} 
              />
              <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'gray' }}>
                {doc.date}
              </Typography>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ textAlign: 'center', mt: 10 }}>
          <Typography color="textSecondary">You haven't downloaded any files yet.</Typography>
        </Box>
      )}
    </Box>
  );
};

export default Downloads;