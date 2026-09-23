import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box, Typography, Stack, IconButton, Button, Dialog, DialogContent,
  Chip, Divider, useTheme,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import CloseIcon from '@mui/icons-material/Close';
import clientbackground from '../assets/clientbackground.png';

const COVER_W = 112; // px — width of each book on the shelf

const clamp = (lines) => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

// Book cover. With a real image it fills the box; without one (or if it fails
// to load) it shows the same look as PdfCard: school logo over the dark-blue
// clientbackground.
const Cover = ({ src, alt, fallbackImage, isDark, sx }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (src && !failed) {
    return (
      <Box
        component="img"
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        sx={{
          display: 'block', width: '100%', aspectRatio: '2 / 3',
          objectFit: 'cover', bgcolor: 'action.hover', ...sx,
        }}
      />
    );
  }

  const tint = isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(33, 60, 81, 0.85)';
  return (
    <Box
      role="img"
      aria-label={alt}
      sx={{
        width: '100%', aspectRatio: '2 / 3', boxSizing: 'border-box',
        backgroundImage: `linear-gradient(${tint}, ${tint}), url(${clientbackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        ...sx,
      }}
    >
      <Box
        component="img"
        src={fallbackImage}
        alt=""
        sx={{
          width: '65%', height: 'auto', opacity: 0.9,
          filter: isDark ? 'drop-shadow(0px 4px 10px rgba(0,0,0,0.5))' : 'none',
        }}
      />
    </Box>
  );
};

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : '';

const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : '';

/**
 * Horizontal "book shelf": cover, title, author (+ optional caption).
 * Clicking a cover opens a details dialog.
 *
 * Props
 *  title, items, loading, empty
 *  page, total, pageSize, onPrev, onNext   -> server pagination; the chevrons
 *                                             scroll first, then flip the page
 *  onSeeMore                                -> "See more" link (omit to hide)
 *  getImageUrl(item.image field) / fallbackImage
 *  caption(item)                            -> small line under the author
 */
const BookShelf = ({
  title,
  items = [],
  loading = false,
  empty = null,
  page = 0,
  total = 0,
  pageSize = 8,
  onPrev,
  onNext,
  onSeeMore,
  getImageUrl = (u) => u,
  fallbackImage,
  caption,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const scrollRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [selected, setSelected] = useState(null);

  const hasPrevPage = page > 0;
  const hasNextPage = (page + 1) * pageSize < total;

  const coverOf = (item) =>
    getImageUrl(item.image_url || item.cover_url || item.cover_image || item.thumbnail);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  // New page of items -> back to the start of the row.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
    updateArrows();
  }, [items, updateArrows]);

  useEffect(() => {
    window.addEventListener('resize', updateArrows);
    return () => window.removeEventListener('resize', updateArrows);
  }, [updateArrows]);

  const step = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    const atStart = el.scrollLeft <= 4;

    if (dir > 0) {
      if (!atEnd) el.scrollBy({ left: el.clientWidth * 0.8, behavior: 'smooth' });
      else if (hasNextPage && !loading) onNext?.();
    } else {
      if (!atStart) el.scrollBy({ left: -el.clientWidth * 0.8, behavior: 'smooth' });
      else if (hasPrevPage && !loading) onPrev?.();
    }
  };

  const showLeft = canLeft || hasPrevPage;
  const showRight = canRight || hasNextPage;

  const arrowSx = {
    position: 'absolute',
    top: COVER_W * 0.75 - 20, // vertically centred on the covers
    width: 40,
    height: 40,
    zIndex: 2,
    bgcolor: isDark ? '#1e293b' : '#fff',
    color: 'text.primary',
    boxShadow: 3,
    '&:hover': { bgcolor: isDark ? '#334155' : '#f1f5f9' },
  };

  return (
    <>
      {/* Header: title + "See more" */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{title}</Typography>
        {onSeeMore && (
          <Button
            size="small"
            onClick={onSeeMore}
            sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary', minWidth: 0 }}
          >
            See more
          </Button>
        )}
      </Stack>

      {items.length === 0 ? (
        empty
      ) : (
        <Box sx={{ position: 'relative' }}>
          {showLeft && (
            <IconButton aria-label="Previous" onClick={() => step(-1)} sx={{ ...arrowSx, left: -8 }}>
              <ChevronLeftIcon />
            </IconButton>
          )}

          <Box
            ref={scrollRef}
            onScroll={updateArrows}
            sx={{
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              scrollSnapType: 'x proximity',
              pb: 0.5,
              opacity: loading ? 0.5 : 1,
              transition: 'opacity 0.15s ease',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            {items.map((item) => {
              const extra = caption?.(item);
              return (
                <Box
                  key={item.id}
                  sx={{ width: COVER_W, flexShrink: 0, scrollSnapAlign: 'start' }}
                >
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setSelected(item)}
                    aria-label={`View details for ${item.title}`}
                    sx={{
                      display: 'block', width: '100%', p: 0, border: 0, cursor: 'pointer',
                      background: 'none', borderRadius: 1.5, overflow: 'hidden',
                      boxShadow: 2, transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                      '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                    }}
                  >
                    <Cover
                      src={coverOf(item)}
                      alt={item.title}
                      fallbackImage={fallbackImage}
                      isDark={isDark}
                    />
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, lineHeight: 1.3, mt: 1, ...clamp(2) }}
                    title={item.title}
                  >
                    {item.title}
                  </Typography>
                  {item.author && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ...clamp(1) }}>
                      {item.author}
                    </Typography>
                  )}
                  {extra && (
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{
                        display: 'block', mt: 0.25, fontWeight: 600,
                        fontSize: '0.66rem', lineHeight: 1.4,
                        color: isDark ? '#93c5fd' : '#3b5f80',
                      }}
                    >
                      {extra}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>

          {showRight && (
            <IconButton aria-label="Next" onClick={() => step(1)} sx={{ ...arrowSx, right: -8 }}>
              <ChevronRightIcon />
            </IconButton>
          )}
        </Box>
      )}

      {/* Details dialog */}
      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        maxWidth="sm"
        fullWidth
        scroll="paper"
      >
        {selected && (
          <DialogContent sx={{ p: { xs: 2.5, sm: 3 }, position: 'relative' }}>
            <IconButton
              aria-label="Close"
              onClick={() => setSelected(null)}
              size="small"
              sx={{ position: 'absolute', top: 8, right: 8 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'center', sm: 'flex-start' }}>
              <Cover
                src={coverOf(selected)}
                alt={selected.title}
                fallbackImage={fallbackImage}
                isDark={isDark}
                sx={{ width: 150, flexShrink: 0, borderRadius: 1.5, boxShadow: 3 }}
              />

              <Box sx={{ minWidth: 0, width: '100%', pr: { sm: 3 } }}>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
                  {selected.title}
                </Typography>
                {selected.author && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {selected.author}
                  </Typography>
                )}

                {(selected.genre || selected.category) && (
                  <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 1.5 }}>
                    {selected.genre && <Chip size="small" label={selected.genre} />}
                    {selected.category && (
                      <Chip size="small" variant="outlined" label={selected.category} sx={{ textTransform: 'capitalize' }} />
                    )}
                  </Stack>
                )}

                <Divider sx={{ my: 2 }} />

                <Stack spacing={0.75}>
                  {selected.downloaded_at && (
                    <Row label="Downloaded" value={fmtDateTime(selected.downloaded_at)} />
                  )}
                  {selected.created_at && (
                    <Row label="Added to library" value={fmtDate(selected.created_at)} />
                  )}
                  {selected.publisher && <Row label="Publisher" value={selected.publisher} />}
                  {(selected.published_year || selected.year) && (
                    <Row label="Year" value={selected.published_year || selected.year} />
                  )}
                  {selected.language && <Row label="Language" value={selected.language} />}
                </Stack>

                {(selected.description || selected.summary) && (
                  <Typography variant="body2" sx={{ mt: 2, lineHeight: 1.6 }}>
                    {selected.description || selected.summary}
                  </Typography>
                )}
              </Box>
            </Stack>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
};

const Row = ({ label, value }) => (
  <Stack direction="row" spacing={1.5}>
    <Typography variant="body2" color="text.secondary" sx={{ width: 120, flexShrink: 0 }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 0 }}>{value}</Typography>
  </Stack>
);

export default BookShelf;