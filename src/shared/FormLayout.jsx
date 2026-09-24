// src/shared/FormLayout.jsx
//
// Small helpers so every form in the app uses the same tidy layout:
//   <FormSection>  a titled group of fields on a 6-column grid
//   span(n)        makes a field take n of the 6 columns (full width on phones)
//   autofillFix()  stops the browser's light-blue autofill background

import { Box, Typography } from '@mui/material';

// Column span on the 6-column grid. On phones every field is full width.
//   span(6) = full row, span(3) = half, span(2) = a third
export const span = (n) => ({ xs: 'auto', sm: `span ${n}` });

// When the browser fills a field from its suggestions (autofill) it paints the
// input light blue. This puts the field's own background colour back.
// Use it in `sx` on a parent element: sx={autofillFix(bgColor, textColor)}
export const autofillFix = (bg, color) => ({
  '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & input:-webkit-autofill:active, & textarea:-webkit-autofill': {
    WebkitBoxShadow: `0 0 0 100px ${bg} inset`,
    WebkitTextFillColor: color,
    caretColor: color,
    borderRadius: 'inherit',
    transition: 'background-color 9999s ease-in-out 0s',
  },
});

const FormSection = ({ title, hint, children }) => (
  <Box>
    <Box sx={{ mb: 1.75 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
        {title}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Box>

    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          sm: 'repeat(6, minmax(0, 1fr))',
        },
        gap: 2,
      }}
    >
      {children}
    </Box>
  </Box>
);

export default FormSection;