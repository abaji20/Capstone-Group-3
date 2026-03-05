import React from 'react';
import { Grid, Box, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PageHeader, SearchBar, PdfCard, PrimaryButton } from '../../shared';

const Browse = () => {
  const navigate = useNavigate();

  // Mock data
  const documents = [
    { id: 1, title: 'Network Security Fundamentals', category: 'IT' },
    { id: 2, title: 'Advanced Calculus Vol 1', category: 'Math' },
    { id: 3, title: 'Machine Learning Basics', category: 'Computer Science' },
    { id: 4, title: 'English Composition II', category: 'General' },
    { id: 5, title: 'Database Management Systems', category: 'IT' },
    { id: 6, title: 'Discrete Mathematics', category: 'Math' },
  ];

  return (
    <Box>
      <PageHeader 
        title="Browse Library" 
        subtitle="Search and download academic documents from the repository." 
      />
      
      {/* Action Bar: Search and Request Button */}
      <Stack 
        direction={{ xs: 'column', sm: 'row' }} 
        spacing={2} 
        sx={{ mb: 4 }} 
        alignItems="center" 
        justifyContent="space-between"
      >
        <Box sx={{ width: '100%', maxWidth: 600 }}>
          <SearchBar placeholder="Search by document title or subject..." />
        </Box>

        <PrimaryButton 
          variant="outlined" 
          onClick={() => navigate('/request-pdf')}
          sx={{ whiteSpace: 'nowrap', height: 'fit-content' }}
        >
          Request a PDF
        </PrimaryButton>
      </Stack>

      {/* Grid of PDF Cards */}
      {documents.length > 0 ? (
        <Grid container spacing={3}>
          {documents.map((doc) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={doc.id}>
              <PdfCard 
                title={doc.title} 
                category={doc.category} 
                onDownload={() => alert(`Downloading: ${doc.title}`)} 
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        /* Empty State logic if search returns nothing */
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            Can't find the document you're looking for?
          </Typography>
          <PrimaryButton onClick={() => navigate('/request-pdf')}>
            Submit a Request
          </PrimaryButton>
        </Box>
      )}
    </Box>
  );
};

export default Browse;