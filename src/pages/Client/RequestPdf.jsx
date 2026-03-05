import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { PageHeader, FormInput, PrimaryButton } from '../../shared';

const RequestPdf = () => {
  return (
    <Box>
      <PageHeader 
        title="Request a Document or Book" 
        subtitle="If a resource is restricted or missing from the library, submit a request here." 
      />

      <Paper sx={{ p: 4, maxWidth: 600, mx: 'auto', borderRadius: 2, boxShadow: 3 }}>
        <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary', fontStyle: 'italic' }}>
          Note: Your request will be sent to the Admin for review. You can track the status in your 'My Requests' tab.
        </Typography>

        {/* Input for the Book/PDF Title */}
        <FormInput 
          label="Book or Document Title" 
          placeholder="Enter the full name of the resource" 
        />

        {/* Input for Category or Subject */}
        <FormInput 
          label="Subject / Category" 
          placeholder="e.g. Mechanical Engineering, Literature" 
        />

        {/* The "Why" - This replaces the 'Private' logic */}
        <FormInput 
          label="Purpose of Request" 
          placeholder="Explain why you need access to this specific resource..." 
          multiline 
          rows={4} 
        />
        
        <Box sx={{ mt: 3 }}>
          <PrimaryButton 
            fullWidth 
            size="large" 
            onClick={() => alert("Request submitted! It is now 'Pending' in the Admin queue.")}
          >
            Submit Request
          </PrimaryButton>
        </Box>
      </Paper>
    </Box>
  );
};

export default RequestPdf;