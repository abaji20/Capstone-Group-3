import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Typography, CircularProgress, Stack, IconButton, Tooltip, Avatar
} from '@mui/material';
import { PageHeader } from '../../shared';
import { supabase } from '../../supabaseClient';

// Icons
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import DateRangeIcon from '@mui/icons-material/DateRange';

const Archived = () => {
  const [archivedFiles, setArchivedFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchArchived(); }, []);

  const fetchArchived = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pdfs')
      .select('*')
      .eq('is_archived', true); 

    if (error) console.error("Error fetching archives:", error);
    else setArchivedFiles(data || []);
    setLoading(false);
  };

  const handleRestore = async (id) => {
    await supabase.from('pdfs').update({ is_archived: false }).eq('id', id);
    fetchArchived();
  };

  const handlePurge = async (id) => {
    await supabase.from('pdfs').delete().eq('id', id);
    fetchArchived();
  };

  // Build full URL for your cover images
  const getImageUrl = (path) => {
    if (!path) return null;
    return `https://yktwxeyxmzfkxqhlesly.supabase.co/storage/v1/object/public/pdfs/${path}`;
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, background: 'linear-gradient(200deg, #e0f7fa 0%, #a7ffeb 100%)', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <PageHeader title="Archived & Restore" subtitle="Manage files in the repository's trash bin." />

      <TableContainer component={Paper} sx={{ borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(15px)', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
        {loading ? (
          <Box sx={{ p: 8, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: '#1e3a8a' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 800, py: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1}><DescriptionOutlinedIcon fontSize="small" />DOCUMENT</Stack>
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 800 }}>
                  <Stack direction="row" alignItems="center" spacing={1}><CategoryOutlinedIcon fontSize="small" />CATEGORY</Stack>
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 800 }}>
                  <Stack direction="row" alignItems="center" spacing={1}><DateRangeIcon fontSize="small" />DATE ARCHIVED</Stack>
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 800 }} align="center">ACTION</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {archivedFiles.length > 0 ? (
                archivedFiles.map((file) => (
                  <TableRow key={file.id} hover sx={{ '&:hover': { bgcolor: 'rgba(230, 245, 255, 0.5)' } }}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar 
                          variant="rounded" 
                          src={getImageUrl(file.image_url)} 
                          sx={{ width: 45, height: 55, border: '1px solid #e2e8f0', bgcolor: '#f1f5f9' }}
                        >
                          <DescriptionOutlinedIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                        </Avatar>
                        <Typography sx={{ fontWeight: 700, color: '#1e293b' }}>{file.title}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: '#475569' }}>{file.category || 'N/A'}</TableCell>
                    <TableCell sx={{ color: '#64748b' }}>{new Date(file.created_at).toLocaleDateString()}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Restore File">
                        <IconButton onClick={() => handleRestore(file.id)} sx={{ color: '#0288d1', mr: 1 }}>
                          <RestoreFromTrashIcon sx={{ fontSize: 40 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Permanently Delete">
                        <IconButton onClick={() => handlePurge(file.id)} sx={{ color: '#dc2626' }}>
                          <DeleteForeverIcon sx={{ fontSize: 40}} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                    <ArchiveOutlinedIcon sx={{ fontSize: 40, color: '#94a3b8', mb: 1 }} />
                    <Typography color="textSecondary">No archived files found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Box>
  );
};

export default Archived;