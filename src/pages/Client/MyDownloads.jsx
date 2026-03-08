// src/pages/Client/MyDownloads.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Box, Grid, Typography, CircularProgress, Stack } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History'; // 1. Updated to HistoryIcon
import { PdfCard, SearchBar } from '../../shared';
import { supabase } from '../../supabaseClient';

const MyDownloads = () => {
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchMyDownloads = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data, error } = await supabase
            .from('downloads')
            .select('pdfs(*)') 
            .eq('user_id', user.id);
            
          if (error) throw error;
          
          setDownloads(data.map(item => item.pdfs));
        }
      } catch (error) {
        console.error("Error fetching downloads:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyDownloads();
  }, []);

  const filteredDownloads = useMemo(() => {
    return downloads.filter((doc) => 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.author && doc.author.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [downloads, searchQuery]);

  return (
    <Box>
      {/* 2. Updated Header Design with History Theme */}
      <Box sx={{ mb: 6, mt: 2 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
          <Box sx={{ 
            p: 2, 
            borderRadius: 3,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <HistoryIcon sx={{ fontSize: 60, color: '#00796b' }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: '800', letterSpacing: '-0.5px' }}>
              Download History
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Review and redownload documents you've accessed previously. 
              <strong> {downloads.length} items found.</strong>
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ mt: 3, maxWidth: 700 }}>
          <SearchBar 
            placeholder="Search your history..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredDownloads.length > 0 ? (
        <Grid container spacing={3}>
          {filteredDownloads.map((doc) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={doc.id}>
              <PdfCard pdf={doc} downloadLabel="Redownload" />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ textAlign: 'center', mt: 10 }}>
          <Typography color="textSecondary">
            {searchQuery ? "No matches found in your history." : "Your download history is empty."}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MyDownloads;