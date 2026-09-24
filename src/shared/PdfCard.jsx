import React, { useState } from 'react';
import { 
  Card, CardMedia, CardContent, Typography, Button, Box, 
  Dialog, DialogTitle, DialogContent, DialogActions, Stack, Divider, useTheme,
  CircularProgress
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'; 
import DateRangeIcon from '@mui/icons-material/DateRange';
import CategoryIcon from '@mui/icons-material/Category';
import InfoIcon from '@mui/icons-material/Info';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'; 
import TitleIcon from '@mui/icons-material/Title';
import BookIcon from '@mui/icons-material/Book'; 
import PersonIcon from '@mui/icons-material/Person'; 
import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
// NEW: icons for the added metadata fields
import BookmarkIcon from '@mui/icons-material/Bookmark';
import SchoolIcon from '@mui/icons-material/School';
import BusinessIcon from '@mui/icons-material/Business';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import LayersIcon from '@mui/icons-material/Layers';
import LanguageIcon from '@mui/icons-material/Language';
import { supabase } from '../supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloudArrowDown, faFilePdf } from '@fortawesome/free-solid-svg-icons';

// Inimport ang glclogo bilang school logo fallback
import logo from '../assets/logo.png'; 
import glclogo from '../assets/glclogo.png'; 
import clientbackground from '../assets/clientbackground.png'; 
// NEW: shows the year, or "March 2020" / "March 15, 2020" when month/day exist
import { formatPublishedDate } from '../utils/formatPublishedDate';

// One label/value line in the Document Info grid.
// The value is never cut off with "...". It keeps its natural one-line width,
// so the dialog grows wider to fit it (see the Dialog + grid below).
// Only if the screen itself is too narrow does the value wrap as a last resort.
//  - alignItems: 'flex-start' keeps the icon aligned with the first line
//  - the label (<strong>) never shrinks, so "Author:" stays on one line
//  - the value <span> can shrink (minWidth: 0) only when there is no room left
const InfoRow = ({ icon, label, value }) => (
  <Typography
    variant="body2"
    component="div"
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 1,
      minWidth: 0,
      '& > svg': { flexShrink: 0 },
      '& > strong': { flexShrink: 0 },
      '& > span': {
        minWidth: 0,
        whiteSpace: 'normal',
        overflowWrap: 'anywhere',
      },
    }}
  >
    {icon} <strong>{label}:</strong> <span>{value || 'N/A'}</span>
  </Typography>
);

const PdfCard = ({ pdf, downloadLabel = "Download", variant = "normal" }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  if (!pdf) return null;

  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [fileSize, setFileSize] = useState('Fetching size...');
  const [isDownloading, setIsDownloading] = useState(false);
  
  const coverUrl = pdf.image_url ? supabase.storage.from('pdfs').getPublicUrl(pdf.image_url).data.publicUrl : null;
  const iconColor = isDarkMode ? theme.palette.primary.light : '#1976d2'; 
  const poppinsFont = { fontFamily: "'Poppins', sans-serif" };

  const isSmall = variant === "small";

  // Utility Function para i-convert ang bytes papuntang readable format (KB, MB, GB)
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Shared function para kunin ang size ng file mula sa Supabase Storage
  const fetchFileSize = async () => {
    if (fileSize !== 'Fetching size...' && fileSize !== 'Unknown size') return;

    try {
      const { data } = supabase.storage.from('pdfs').getPublicUrl(pdf.file_url);
      if (data?.publicUrl) {
        const response = await fetch(data.publicUrl, { method: 'HEAD' });
        const size = response.headers.get('content-length');
        if (size) {
          setFileSize(formatBytes(parseInt(size, 10)));
        } else {
          setFileSize('Unknown size');
        }
      }
    } catch (err) {
      console.error("Error fetching file size:", err);
      setFileSize('Unknown size');
    }
  };

  // Kapag pinindot ang See More
  const handleOpenInfo = () => {
    setOpen(true);
    fetchFileSize();
  };

  // Papasok muna sa confirmation modal bago i-download
  const handleOpenDownloadConfirm = () => {
    setConfirmOpen(true);
    fetchFileSize();
  };

  const handleRead = () => {
    const { data } = supabase.storage.from('pdfs').getPublicUrl(pdf.file_url);
    if (data?.publicUrl) {
      window.open(data.publicUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: existingDownload } = await supabase
          .from('downloads')
          .select('id')
          .eq('user_id', user.id)
          .eq('pdf_id', pdf.id)
          .maybeSingle();

        if (!existingDownload) {
          await supabase.from('downloads').insert([{ user_id: user.id, pdf_id: pdf.id }]);
          
          await supabase.from('audit_logs').insert([{
            user_id: user.id, 
            pdf_id: pdf.id, 
            action_type: 'Download', 
            description: `Downloaded file: "${pdf.title}"`
          }]);
        }
      }

      const { data } = supabase.storage.from('pdfs').getPublicUrl(pdf.file_url);
      const response = await fetch(data.publicUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${pdf.title || 'document'}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Card sx={{ 
        ...poppinsFont,
        height: '100%', display: 'flex', flexDirection: 'column',
        borderRadius: 2, 
        maxWidth: isSmall ? { xs: 160, sm: 180 } : 220, 
        minWidth: isSmall ? { xs: 160, sm: 180 } : 220, 
        flexShrink: 0,
        bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': { transform: 'translateY(-8px)', boxShadow: isDarkMode ? '0 8px 20px rgba(0,0,0,0.5)' : '0 8px 16px rgba(0,0,0,0.1)' }
      }}>
        {coverUrl ? (
          <CardMedia 
            component="img" 
            height={isSmall ? "200" : "260"} 
            image={coverUrl} 
            alt={pdf.title} 
            sx={{ objectFit: 'cover' }} 
          />
        ) : ( 
          <Box sx={{ 
            height: isSmall ? 200 : 260, 
            backgroundImage: isDarkMode 
              ? `linear-gradient(rgba(30, 41, 59, 0.85), rgba(30, 41, 59, 0.85)), url(${clientbackground})`
              : `linear-gradient(rgba(33, 60, 81, 0.85), rgba(33, 60, 81, 0.85)), url(${clientbackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            p: 3
          }}>
            <Box 
              component="img"
              src={glclogo}
              alt="Logo Fallback"
              sx={{ 
                width: '65%', 
                height: 'auto', 
                opacity: 0.9,
                filter: isDarkMode ? 'drop-shadow(0px 4px 10px rgba(0,0,0,0.5))' : 'none'
              }}
            />
          </Box>
        )}
        
        <CardContent sx={{ flexGrow: 1, p: isSmall ? 1.5 : 2 }}>
          <Typography 
            variant={isSmall ? "body2" : "body1"} 
            noWrap 
            sx={{ fontWeight: 700, color: isDarkMode ? '#f8fafc' : 'inherit' }}
          >
            {pdf.title}
          </Typography>
          <Typography 
            variant="caption" 
            color="text.secondary" 
            noWrap 
            sx={{ color: isDarkMode ? '#94a3b8' : 'text.secondary' }}
          >
            {pdf.author}
          </Typography>
        </CardContent>

        <Stack spacing={isSmall ? 1 : 1.5} sx={{ p: isSmall ? 1.5 : 2, pt: 0 }}>
          <Button 
            fullWidth 
            variant="outlined" 
            startIcon={<VisibilityIcon sx={{ fontSize: isSmall ? '1rem' : 'inherit' }} />} 
            onClick={handleOpenInfo} 
            sx={{ fontSize: isSmall ? '0.7rem' : '0.8rem', textTransform: 'none' }}
          >
            See More
          </Button>
          <Button 
            fullWidth 
            variant="contained" 
            startIcon={<DownloadIcon sx={{ fontSize: isSmall ? '1rem' : 'inherit' }} />} 
            onClick={handleOpenDownloadConfirm} 
            sx={{ 
              fontSize: isSmall ? '0.7rem' : '0.8rem', 
              textTransform: 'none',  
              color: '#fff', 
              bgcolor: isDarkMode ? '#281C59' : iconColor 
            }}
          >
            {downloadLabel}
          </Button>
        </Stack>
      </Card>
      
      {/* SEE MORE / DOCUMENT INFO DIALOG */}
      <Dialog 
        open={open} 
        onClose={() => setOpen(false)} 
        maxWidth={false}
        PaperProps={{
          sx: {
            borderRadius: 1.5,
            ...poppinsFont,
            bgcolor: isDarkMode ? '#0f172a' : '#fff',
            // Width follows the content: starts at the old 600px and grows
            // when the author/title is long, up to the edge of the screen.
            width: 'fit-content',
            minWidth: { xs: 'calc(100% - 64px)', sm: 'min(600px, calc(100% - 64px))' },
            maxWidth: 'calc(100% - 64px)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon sx={{ color: iconColor }} /> Document Info
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: isDarkMode ? '#334155' : 'rgba(0,0,0,0.12)' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'center', sm: 'flex-start' }}>
            
            <Box sx={{ 
              width: { xs: '50%', sm: 160 }, 
              flexShrink: 0,
              mb: { xs: 1, sm: 0 },
              aspectRatio: '3/4',
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              backgroundImage: !coverUrl ? (isDarkMode 
                ? `linear-gradient(rgba(51, 65, 85, 0.8), rgba(51, 65, 85, 0.8)), url(${clientbackground})`
                : `linear-gradient(rgba(33, 60, 81, 0.8), rgba(33, 60, 81, 0.8)), url(${clientbackground})`) : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              bgcolor: coverUrl ? 'transparent' : (isDarkMode ? '#334155' : '#213C51'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {coverUrl ? (
                <img 
                  src={coverUrl} 
                  alt={pdf.title} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <Box 
                  component="img"
                  src={glclogo}
                  alt="No Cover Fallback"
                  sx={{ width: '70%', height: 'auto', opacity: 0.9 }}
                />
              )}
            </Box>

            <Stack spacing={1.5} sx={{ flexGrow: 1, width: 'auto', minWidth: 0 }}>
              {/* Metadata rows in a responsive 2-column grid.
                  'auto auto' makes each column as wide as its longest value,
                  so a long author name stays on ONE line and the dialog
                  widens to fit it. On phones it stays 1 column. */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'auto auto' },
                  justifyContent: 'start',
                  columnGap: 3,
                  rowGap: 1,
                }}
              >
                <InfoRow icon={<TitleIcon fontSize="small" sx={{ color: iconColor }} />} label="Title" value={pdf.title} />
                <InfoRow icon={<PersonIcon fontSize="small" sx={{ color: iconColor }} />} label="Author" value={pdf.author} />
                <InfoRow icon={<LibraryBooksIcon fontSize="small" sx={{ color: iconColor }} />} label="Type" value={pdf.category} />
                <InfoRow icon={<CategoryIcon fontSize="small" sx={{ color: iconColor }} />} label="Genre" value={pdf.genre} />

                {/* NEW: digital-library metadata — each only renders when
                    the document actually has a value, so old records with
                    blank new fields don't show a wall of "N/A" rows. */}
                {pdf.section && <InfoRow icon={<BookmarkIcon fontSize="small" sx={{ color: iconColor }} />} label="Section" value={pdf.section} />}
                {pdf.program_course && <InfoRow icon={<SchoolIcon fontSize="small" sx={{ color: iconColor }} />} label="Program" value={pdf.program_course} />}

                <InfoRow icon={<DateRangeIcon fontSize="small" sx={{ color: iconColor }} />} label="Published" value={formatPublishedDate(pdf)} />

                {pdf.publisher && <InfoRow icon={<BusinessIcon fontSize="small" sx={{ color: iconColor }} />} label="Publisher" value={pdf.publisher} />}
                {pdf.isbn && <InfoRow icon={<ConfirmationNumberIcon fontSize="small" sx={{ color: iconColor }} />} label="ISBN" value={pdf.isbn} />}
                {pdf.edition && <InfoRow icon={<LayersIcon fontSize="small" sx={{ color: iconColor }} />} label="Edition" value={pdf.edition} />}
                {pdf.language && <InfoRow icon={<LanguageIcon fontSize="small" sx={{ color: iconColor }} />} label="Language" value={pdf.language} />}

                <InfoRow icon={<InsertDriveFileIcon fontSize="small" sx={{ color: iconColor }} />} label="Size" value={fileSize} />
              </Box>
              
              <Divider sx={{ bgcolor: isDarkMode ? '#334155' : 'rgba(0,0,0,0.12)' }} />
              
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Description</Typography>
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ 
                  color: isDarkMode ? '#94a3b8' : 'text.secondary',
                  textAlign: 'justify',
                  display: 'block',
                  // width: 0 + minWidth: 100% = the description fills the column
                  // but does NOT push the dialog wider. Only the info rows
                  // (author, title...) decide the dialog width.
                  width: 0,
                  minWidth: '100%',
                }}
              >
                {pdf.description || "No description provided."}
              </Typography>
              
              <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
                <Button 
                  fullWidth 
                  variant="contained" 
                  startIcon={<BookIcon />} 
                  onClick={handleRead}
                  sx={{ 
                    textTransform: 'none',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }, 
                    color: '#fff',  
                    py: { xs: 0.8, sm: 1.2 },
                    bgcolor: isDarkMode ? '#281C59' : '#281C59', 
                    '&:hover': { bgcolor: isDarkMode ? '#180c46' : '#180c46' }
                  }}
                >
                  Read
                </Button>
              </Stack>
            </Stack>
          </Stack>   
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} sx={{ color: isDarkMode ? '#94a3b8' : 'inherit' }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* DOWNLOAD CONFIRMATION MODAL */}
      <Dialog
        open={confirmOpen}
        onClose={() => !isDownloading && setConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, p: 1, ...poppinsFont, bgcolor: isDarkMode ? '#0f172a' : '#fff' } }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}> 
           Confirm Download
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Are you sure you want to download <strong>"{pdf.title}"</strong>?
          </Typography>

          <Box sx={{ 
            p: 2, 
            borderRadius: 1.5, 
            bgcolor: isDarkMode ? '#1e293b' : '#f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}>
            <Typography variant="caption" sx={{ display: 'block' }}>
              <strong>Author:</strong> {pdf.author || 'N/A'}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block' }}>
              <strong>Category / Genre:</strong> {pdf.category || 'N/A'} ({pdf.genre || 'N/A'})
            </Typography>
            {pdf.edition && (
              <Typography variant="caption" sx={{ display: 'block' }}>
                <strong>Edition:</strong> {pdf.edition}
              </Typography>
            )}
            <Typography variant="body2" sx={{ fontWeight: 700, color: iconColor, mt: 0.5 }}>
              File Size: {fileSize}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setConfirmOpen(false)} 
            disabled={isDownloading}
            sx={{ textTransform: 'none', color: isDarkMode ? '#94a3b8' : 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDownload} 
            variant="contained" 
            disabled={isDownloading}
            startIcon={isDownloading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
            sx={{ 
              textTransform: 'none', 
              bgcolor: isDarkMode ? '#281C59' : iconColor,
              color: '#fff'
            }}
          >
            {isDownloading ? 'Downloading...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PdfCard;