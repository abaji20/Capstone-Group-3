// src/pages/Client/Browse.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Grid, Box, Stack, Typography, CircularProgress, TextField, MenuItem } from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import PersonIcon from '@mui/icons-material/Person';
import { PageHeader, SearchBar, PdfCard } from '../../shared';
import { fetchPdfs } from '../../services/pdfService'; 
import { supabase } from '../../supabaseClient';

const Browse = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState(''); 
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchPdfs();
        setDocuments(data || []);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          if (profile) setUserName(profile.full_name);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // --- NEW LOGGING LOGIC START ---
  const handleDownloadLog = async (pdf) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // 1. Insert into audit_logs for Activity History
        await supabase.from('audit_logs').insert([{
          user_id: user.id,
          pdf_id: pdf.id,
          action_type: 'Download',
          description: `Downloaded file: "${pdf.title}"`
        }]);

        // 2. Insert into downloads table for general stats
        await supabase.from('downloads').insert([{
          user_id: user.id,
          pdf_id: pdf.id
        }]);
      }
      
      // 3. Open the file
      window.open(pdf.file_url, '_blank');
    } catch (error) {
      console.error("Error logging download:", error);
    }
  };
  // --- NEW LOGGING LOGIC END ---

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (doc.author && doc.author.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchGenre = genreFilter === '' || (doc.genre && doc.genre.toLowerCase().includes(genreFilter.toLowerCase()));
      const matchYear = yearFilter === '' || String(doc.published_date) === yearFilter;
      return matchSearch && matchGenre && matchYear;
    });
  }, [documents, searchQuery, genreFilter, yearFilter]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 8, mt: 2 }}>
        {userName ? (
          <PersonIcon sx={{ fontSize: 70, color: '#301b3f' }} />
        ) : (
          <LibraryBooksIcon sx={{ fontSize: 50, color: '#d32f2f' }} />
        )}
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            {userName ? `Welcome, ${userName}!` : "Browse Library"}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            “Your digital library of research and discovery”
          </Typography>
        </Box>
      </Box>
      
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 6 }} alignItems="center">
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <SearchBar 
            placeholder="Search by title or author..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Box>
        
        <TextField 
          select label="Genre" value={genreFilter} 
          onChange={(e) => setGenreFilter(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">All Genres</MenuItem>
          <MenuItem value="Fantasy">Fantasy</MenuItem>
          <MenuItem value="Education">Education</MenuItem>
          <MenuItem value="Science Fiction">Science Fiction</MenuItem>
        </TextField>

        <TextField 
          label="Year Published" value={yearFilter} 
          onChange={(e) => setYearFilter(e.target.value)}
          sx={{ minWidth: 150 }}
        />
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8}}><CircularProgress /></Box>
      ) : filteredDocuments.length > 0 ? (
        <Grid container spacing={3}>
          {filteredDocuments.map((doc) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={doc.id}>
              {/* Pass the download handler to the PdfCard */}
              <PdfCard pdf={doc} onDownload={() => handleDownloadLog(doc)} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Typography variant="h6" color="textSecondary">
            No documents found matching these filters.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Browse;