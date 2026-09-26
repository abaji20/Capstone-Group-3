import React, { useState, useRef, useLayoutEffect } from 'react';
import { 
  Card, CardMedia, CardContent, Typography, Button, Box, 
  Dialog, DialogTitle, DialogContent, DialogActions, Stack, Divider, useTheme,
  CircularProgress, Grid, IconButton
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'; 
import DateRangeIcon from '@mui/icons-material/DateRange';
import CategoryIcon from '@mui/icons-material/Category';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'; 
import BookIcon from '@mui/icons-material/Book'; 
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

// One label/value line in the Document Info grid. Shared shape across
// PdfCard, PdfUploads and AdminDashboard so every "Document Info" /
// "Book Details" surface in the app reads identically.
//  - alignItems: 'flex-start' keeps the icon aligned with the first line
//  - the label (<strong>) never shrinks, so "Author:" stays on one line
//  - the value <span> wraps instead of truncating with "..."
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

// Shrinks an element's font-size (down to a floor) until its wrapped text
// fits inside a FIXED pixel height, instead of truncating with "...".
// Because the box height never changes, every card ends up the same size
// no matter how long the title/author is — only the font size adapts.
// Re-runs whenever the element is resized (e.g. the card shrinks on a
// smaller screen), so it stays correct at every breakpoint.
const useFitText = (text, { max, min, step = 0.5 } = {}) => {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      let size = max;
      el.style.fontSize = `${size}px`;
      // Step down until the full (wrapped) text height fits in the box.
      while (el.scrollHeight > el.clientHeight + 1 && size > min) {
        size -= step;
        el.style.fontSize = `${size}px`;
      }
    };

    fit();

    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, max, min, step]);

  return ref;
};

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

  // Fixed box heights (px) the title/author must fit into — these do NOT
  // change when the font shrinks, which is what keeps every card equal.
  // Tall enough for ~3 wrapped lines so useFitText has room to actually
  // shrink a long title down to something that fits, instead of the box
  // clipping it before the font gets small enough.
  const TITLE_BOX_HEIGHT = isSmall ? 46 : 52;   // ~3 lines
  const AUTHOR_BOX_HEIGHT = 16;                  // 1 line

  // Lower font floor (was 9/8) so long titles keep shrinking further before
  // ever being clipped.
  const titleRef = useFitText(pdf.title, { max: isSmall ? 12 : 14, min: 7, step: 0.25 });
  const authorRef = useFitText(pdf.author, { max: 11, min: 7, step: 0.25 });

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
        maxWidth: isSmall ? { xs: 130, sm: 145 } : 175, 
        minWidth: isSmall ? { xs: 130, sm: 145 } : 175, 
        flexShrink: 0,
        bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': { transform: 'translateY(-8px)', boxShadow: isDarkMode ? '0 8px 20px rgba(0,0,0,0.5)' : '0 8px 16px rgba(0,0,0,0.1)' }
      }}>
        {coverUrl ? (
          <CardMedia 
            component="img" 
            height={isSmall ? "160" : "200"} 
            image={coverUrl} 
            alt={pdf.title} 
            sx={{ objectFit: 'cover' }} 
          />
        ) : ( 
          <Box sx={{ 
            height: isSmall ? 160 : 200, 
            backgroundImage: isDarkMode 
              ? `linear-gradient(rgba(30, 41, 59, 0.85), rgba(30, 41, 59, 0.85)), url(${clientbackground})`
              : `linear-gradient(rgba(33, 60, 81, 0.85), rgba(33, 60, 81, 0.85)), url(${clientbackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            p: 2
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
        
        <CardContent sx={{ flexGrow: 1, p: isSmall ? 1 : 1.5 }}>
          {/* Title never truncates with "..." — instead its font-size
              shrinks (via useFitText) so the full text fits in this fixed
              height box, keeping every card the same size. */}
          <Typography
            ref={titleRef}
            variant={isSmall ? "body2" : "body1"}
            sx={{
              fontWeight: 700,
              color: isDarkMode ? '#f8fafc' : 'inherit',
              whiteSpace: 'normal',
              overflowWrap: 'anywhere',
              overflow: 'hidden',
              lineHeight: 1.25,
              height: `${TITLE_BOX_HEIGHT}px`,
              // Box is reserved at a fixed height (so cards stay equal
              // size). Text is anchored to the TOP: useFitText shrinks the
              // font until the full title fits, so this only matters as a
              // safety net — if it ever still overflows, the beginning of
              // the title stays visible and just the tail gets clipped,
              // instead of losing the start of a long title.
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
            }}
          >
            {pdf.title}
          </Typography>
          {/* Author gets the same treatment (1 line worth of fixed height) */}
          <Typography
            ref={authorRef}
            variant="caption"
            sx={{
              display: 'block',
              color: isDarkMode ? '#94a3b8' : 'text.secondary',
              whiteSpace: 'normal',
              overflowWrap: 'anywhere',
              overflow: 'hidden',
              lineHeight: 1.3,
              height: `${AUTHOR_BOX_HEIGHT}px`,
              mt: 0.25,
            }}
          >
            {pdf.author}
          </Typography>
        </CardContent>

        <Stack spacing={isSmall ? 0.75 : 1} sx={{ p: isSmall ? 1 : 1.5, pt: 0 }}>
          <Button 
            fullWidth 
            variant="outlined" 
            startIcon={<VisibilityIcon sx={{ fontSize: isSmall ? '0.9rem' : '1rem' }} />} 
            onClick={handleOpenInfo} 
            sx={{ fontSize: isSmall ? '0.65rem' : '0.75rem', textTransform: 'none', py: isSmall ? 0.4 : 0.6 }}
          >
            See More
          </Button>
          <Button 
            fullWidth 
            variant="contained" 
            startIcon={<DownloadIcon sx={{ fontSize: isSmall ? '0.9rem' : '1rem' }} />} 
            onClick={handleOpenDownloadConfirm} 
            sx={{ 
              fontSize: isSmall ? '0.65rem' : '0.75rem', 
              textTransform: 'none',  
              color: '#fff', 
              py: isSmall ? 0.4 : 0.6,
              bgcolor: isDarkMode ? '#281C59' : iconColor 
            }}
          >
            {downloadLabel}
          </Button>
        </Stack>
      </Card>
      
      {/* SEE MORE / DOCUMENT INFO DIALOG — same layout as AdminDashboard's
          "Book Details": cover on the left, title + author, a 2-column
          icon+label+value grid, then a labeled description section. */}
      <Dialog 
        open={open} 
        onClose={() => setOpen(false)} 
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            ...poppinsFont,
            bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
            color: isDarkMode ? '#f8fafc' : '#1e293b',
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <PictureAsPdfIcon sx={{ color: iconColor }} />
            <Typography variant="h6" fontWeight="800">
              Document Info
            </Typography>
          </Stack>
          <IconButton onClick={() => setOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            {/* COVER IMAGE */}
            <Grid size={{ xs: 12, md: 4 }}>
              {coverUrl ? (
                <Box
                  component="img"
                  src={coverUrl}
                  alt={pdf.title}
                  sx={{ width: '100%', borderRadius: '12px', height: 260, objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                />
              ) : (
                <Box sx={{
                  height: 260,
                  borderRadius: '12px',
                  backgroundImage: isDarkMode
                    ? `linear-gradient(rgba(51, 65, 85, 0.85), rgba(51, 65, 85, 0.85)), url(${clientbackground})`
                    : `linear-gradient(rgba(33, 60, 81, 0.85), rgba(33, 60, 81, 0.85)), url(${clientbackground})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 3
                }}>
                  <Box component="img" src={glclogo} alt="No Cover Fallback" sx={{ width: '65%', height: 'auto', opacity: 0.9 }} />
                </Box>
              )}
            </Grid>

            {/* DETAILS */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography variant="h5" fontWeight="900" sx={{ mb: 1 }}>
                {pdf.title || 'Untitled Material'}
              </Typography>
              <Typography variant="subtitle1" fontWeight="700" color="text.secondary" sx={{ mb: 2 }}>
                Author: {pdf.author || 'Unknown'}
              </Typography>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'auto auto' },
                  justifyContent: 'start',
                  columnGap: 3,
                  rowGap: 1,
                  mb: 2.5,
                }}
              >
                <InfoRow icon={<LibraryBooksIcon fontSize="small" sx={{ color: iconColor }} />} label="Type" value={pdf.category || 'Book'} />
                <InfoRow icon={<CategoryIcon fontSize="small" sx={{ color: iconColor }} />} label="Genre" value={pdf.genre || 'General'} />

                {pdf.section && <InfoRow icon={<BookmarkIcon fontSize="small" sx={{ color: iconColor }} />} label="Section" value={pdf.section} />}
                {pdf.program_course && <InfoRow icon={<SchoolIcon fontSize="small" sx={{ color: iconColor }} />} label="Program" value={pdf.program_course} />}

                <InfoRow icon={<DateRangeIcon fontSize="small" sx={{ color: iconColor }} />} label="Published" value={formatPublishedDate(pdf)} />

                {pdf.publisher && <InfoRow icon={<BusinessIcon fontSize="small" sx={{ color: iconColor }} />} label="Publisher" value={pdf.publisher} />}
                {pdf.edition && <InfoRow icon={<LayersIcon fontSize="small" sx={{ color: iconColor }} />} label="Edition" value={pdf.edition} />}
                {pdf.isbn && <InfoRow icon={<ConfirmationNumberIcon fontSize="small" sx={{ color: iconColor }} />} label="ISBN" value={pdf.isbn} />}
                {pdf.language && <InfoRow icon={<LanguageIcon fontSize="small" sx={{ color: iconColor }} />} label="Language" value={pdf.language} />}

                <InfoRow icon={<InsertDriveFileIcon fontSize="small" sx={{ color: iconColor }} />} label="Size" value={fileSize} />
              </Box>

              <Typography variant="subtitle2" fontWeight="800" sx={{ mb: 0.5, color: 'text.secondary' }}>
                DESCRIPTION / ABSTRACT
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.7, color: isDarkMode ? '#cbd5e1' : '#475569', mb: 3, textAlign: 'justify' }}>
                {pdf.description || 'No description provided.'}
              </Typography>

              <Button 
                variant="contained" 
                startIcon={<BookIcon />} 
                onClick={handleRead}
                sx={{ 
                  textTransform: 'none',
                  color: '#fff',  
                  fontWeight: 700,
                  borderRadius: '8px',
                  px: 3,
                  bgcolor: '#281C59', 
                  '&:hover': { bgcolor: '#180c46' }
                }}
              >
                Read
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setOpen(false)} variant="outlined" sx={{ fontWeight: 700, borderRadius: '8px' }}>
            Close
          </Button>
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