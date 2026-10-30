'use client';

import { useState } from 'react';
import { Alert, Box, Button, Chip, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import LockOutlined from '@mui/icons-material/LockOutlined';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import MarkEmailReadOutlined from '@mui/icons-material/MarkEmailReadOutlined';
import ArrowBack from '@mui/icons-material/ArrowBack';
import { authApi } from '@/lib/auth/api';
import type { ApiError } from '@/types/auth';

/**
 * Full-page state shown instead of the workspace when the account is blocked.
 * It replaces the dashboard entirely, so no workspace page mounts and no
 * workspace API fires.
 *
 * The appeal is a proper inline form (reason + details). After submitting we
 * show a confirmation only - the appeal is reviewed asynchronously and the reply
 * arrives by email, so there is no live thread here to keep open.
 */

const REASONS = [
  'I believe this block is a mistake',
  'Billing or payment issue',
  'My account was compromised',
  'I have resolved the policy issue',
  'Other',
];

type View = 'intro' | 'form' | 'done';

export default function BlockedScreen({ accountId, email }: { accountId: string; email: string }) {
  const [view, setView] = useState<View>('intro');
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const MAX = 8000;
  const canSubmit = reason !== '' && details.trim().length >= 10 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const body = `Reason: ${reason}\n\n${details.trim()}`;
      const idempotencyKey = `appeal-${accountId}-${crypto.randomUUID()}`;
      const result = await authApi.appeal(body, idempotencyKey);
      setReference(result.reference);
      setView('done');
    } catch (e) {
      setError((e as ApiError)?.message ?? 'Could not submit your appeal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const signOut = () => authApi.logout().finally(() => window.location.assign('/login'));

  const labelSx = { fontSize: 13, fontWeight: 600, color: '#3d3450', mb: 0.75, display: 'block' } as const;
  const fieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: 2 },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e3ddee' },
    '& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#5517b8' },
  } as const;

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', bgcolor: '#f7f5fb', px: 2, py: 4 }}>
      <Box
        sx={{
          width: '100%', maxWidth: view === 'form' ? 560 : 520,
          bgcolor: '#fff', borderRadius: 3, border: '1px solid #ece8f3',
          boxShadow: '0 12px 40px rgba(37,21,70,0.08)', p: { xs: 3, sm: 5 },
          textAlign: view === 'form' ? 'left' : 'center',
        }}
      >
        {/* ---------- INTRO ---------- */}
        {view === 'intro' && (
          <>
            <Box sx={{ width: 56, height: 56, mx: 'auto', mb: 2.5, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: '#f1ebfb', color: '#5517b8' }}>
              <LockOutlined />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 20, color: '#201433', mb: 1 }}>Your account is blocked</Typography>
            <Typography sx={{ color: '#5a5268', mb: 3 }}>
              Your workspace is locked while your account is blocked. If you think this is a mistake, send us an appeal and our team will review it, then reply to <strong>{email}</strong>.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
              <Button variant="contained" onClick={() => setView('form')} sx={{ bgcolor: '#5517b8', textTransform: 'none', fontWeight: 700, px: 3, '&:hover': { bgcolor: '#6b21c8' } }}>
                Appeal this decision
              </Button>
              <Button variant="text" onClick={signOut} sx={{ color: '#5a5268', textTransform: 'none' }}>Sign out</Button>
            </Stack>
          </>
        )}

        {/* ---------- FORM ---------- */}
        {view === 'form' && (
          <>
            <Button onClick={() => setView('intro')} startIcon={<ArrowBack sx={{ fontSize: 18 }} />} disabled={submitting} sx={{ color: '#6b6378', textTransform: 'none', mb: 2, ml: -1 }}>
              Back
            </Button>
            <Typography sx={{ fontWeight: 700, fontSize: 20, color: '#201433', mb: 0.5 }}>Appeal your block</Typography>
            <Typography sx={{ color: '#6b6378', fontSize: 14, mb: 3 }}>
              This opens a support ticket our team will review. Give us enough detail to resolve it in one pass.
            </Typography>

            <Box sx={{ mb: 2.5 }}>
              <InputLabel shrink sx={labelSx}>Account</InputLabel>
              <Chip label={email} variant="outlined" sx={{ borderColor: '#e3ddee', bgcolor: '#faf8fd', fontWeight: 600, color: '#3d3450' }} />
            </Box>

            <Box sx={{ mb: 2.5 }}>
              <InputLabel shrink sx={labelSx}>Reason</InputLabel>
              <Select
                fullWidth size="small" displayEmpty value={reason}
                onChange={(e) => setReason(e.target.value)} disabled={submitting} sx={fieldSx}
                renderValue={(v) => (v ? (v as string) : <span style={{ color: '#9a93a8' }}>Select a reason…</span>)}
              >
                {REASONS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </Select>
            </Box>

            <Box sx={{ mb: 1 }}>
              <InputLabel shrink sx={labelSx}>What happened?</InputLabel>
              <TextField
                fullWidth multiline minRows={5} placeholder="Describe your situation — what changed, when, and anything that supports reinstatement…"
                value={details} onChange={(e) => setDetails(e.target.value.slice(0, MAX))}
                disabled={submitting} sx={fieldSx}
              />
              <Typography sx={{ fontSize: 12, color: details.trim().length < 10 ? '#b14a4a' : '#9a93a8', mt: 0.75, textAlign: 'right' }}>
                {details.trim().length < 10 ? `At least 10 characters (${details.trim().length}/10)` : `${details.length} / ${MAX}`}
              </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 1 }}>
              <Button onClick={() => setView('intro')} disabled={submitting} sx={{ color: '#6b6378', textTransform: 'none' }}>Cancel</Button>
              <Button variant="contained" onClick={submit} disabled={!canSubmit} sx={{ bgcolor: '#5517b8', textTransform: 'none', fontWeight: 700, px: 3, '&:hover': { bgcolor: '#6b21c8' } }}>
                {submitting ? 'Submitting…' : 'Submit appeal'}
              </Button>
            </Stack>
          </>
        )}

        {/* ---------- DONE (confirmation only, no thread) ---------- */}
        {view === 'done' && (
          <>
            <Box sx={{ width: 64, height: 64, mx: 'auto', mb: 2.5, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: '#e7f6ee', color: '#1a7f4b' }}>
              <CheckCircleOutline sx={{ fontSize: 34 }} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 22, color: '#201433', mb: 1 }}>Your appeal has been submitted</Typography>
            <Typography sx={{ color: '#5a5268', fontSize: 15, lineHeight: 1.65, mb: 3 }}>
              Thanks — our team will review your appeal and get back to you. There’s nothing more to do right now.
            </Typography>

            {reference && (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 2, py: 1, mb: 3, borderRadius: 2, bgcolor: '#f6f3fb', border: '1px solid #ece6f6' }}>
                <Typography sx={{ fontSize: 13, color: '#6b6378' }}>Reference</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#3d3450', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{reference}</Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, textAlign: 'left', p: 2, mb: 3, borderRadius: 2, bgcolor: '#f3eefc', border: '1px solid #e7ddf7' }}>
              <MarkEmailReadOutlined sx={{ fontSize: 20, color: '#5517b8', mt: '2px' }} />
              <Typography sx={{ fontSize: 14, color: '#4a3a6b', lineHeight: 1.55 }}>
                We’ll reply to <strong>{email}</strong>. You can close this page — keep an eye on your inbox (including spam) for our response.
              </Typography>
            </Box>

            <Button fullWidth variant="outlined" onClick={signOut} sx={{ py: 1.1, borderRadius: 2.5, textTransform: 'none', fontWeight: 700, borderColor: '#d9d0ea', color: '#3d3450' }}>
              Sign out
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}
