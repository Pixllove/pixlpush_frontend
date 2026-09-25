'use client';

import { Box, Button, CircularProgress, type ButtonProps } from '@mui/material';

/**
 * A Button whose size never changes when it starts loading.
 *
 * Swapping the label for a spinner collapses the content width, so the button
 * visibly snaps. Here the label keeps its box and the spinner sits on top of
 * it, which leaves the layout untouched.
 */
export default function SubmitButton({
  pending,
  children,
  sx,
  disabled,
  ...props
}: ButtonProps & { pending: boolean }) {
  return (
    <Button
      {...props}
      disabled={disabled ?? pending}
      sx={{
        // Keeps the filled look while pending: greying out under a spinner
        // reads as the button changing rather than working. Scoped to the
        // contained variant so outlined and text buttons keep their own.
        '&.MuiButton-contained.Mui-disabled': {
          backgroundColor: 'primary.main',
          color: 'common.white',
        },
        ...sx,
      }}
    >
      <Box component="span" sx={{ visibility: pending ? 'hidden' : 'visible' }}>
        {children}
      </Box>

      {pending && (
        <CircularProgress
          size={22}
          color="inherit"
          sx={{ position: 'absolute', top: '50%', left: '50%', mt: '-11px', ml: '-11px' }}
        />
      )}
    </Button>
  );
}
