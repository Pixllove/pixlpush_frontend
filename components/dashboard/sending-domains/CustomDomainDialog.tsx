'use client';

import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, Stack, TextField, Typography } from '@mui/material';

interface Props {
  open: boolean;
  domain: string;
  onClose: () => void;
  onAdd: (prefix: string) => void;
}

export default function CustomDomainDialog({ open, domain, onClose, onAdd }: Props) {
  const [prefix, setPrefix] = useState('');
  const valid = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(prefix.trim());

  const close = () => {
    setPrefix('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <form onSubmit={(event) => { event.preventDefault(); if (valid) onAdd(prefix.trim()); }}>
        <DialogTitle>Connect your custom sending domain</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <Typography color="text.secondary" fontSize={13}>
              Enter the subdomain you want to use for PixlPush email links and tracking.
            </Typography>
            <Alert severity="warning" icon={false} sx={{ bgcolor: '#fff8c5', color: '#8a5a00', '& .MuiAlert-message': { p: 0 } }}>
              Make sure this subdomain is only used for PixlPush and is not already used for another service.
            </Alert>
            <TextField
              label="Subdomain prefix"
              placeholder="email"
              value={prefix}
              onChange={(event) => setPrefix(event.target.value.toLowerCase().replace(/\s/g, ''))}
              InputProps={{ endAdornment: <InputAdornment position="end">.{domain}</InputAdornment> }}
              autoFocus
              fullWidth
              required
              error={prefix.length > 0 && !valid}
              helperText={prefix.length > 0 && !valid ? 'Use letters, numbers, or hyphens.' : ' '}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={!valid}>Add</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
