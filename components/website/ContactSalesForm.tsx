'use client';

import { FormEvent, useState } from 'react';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import {
  Alert,
  Box,
  Button,
  Container,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { PHONE_COUNTRIES } from '@/lib/phone-country-codes';
import { SiteShell } from './SiteShell';

type FormValues = {
  name: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
  company: string;
  userCount: string;
  channels: string;
  description: string;
  website: string;
};

const initialValues: FormValues = {
  name: '',
  email: '',
  phoneCountryCode: '',
  phone: '',
  company: '',
  userCount: '',
  channels: '',
  description: '',
  website: '',
};

export default function ContactSalesForm() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const update = (field: keyof FormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/sales-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          phoneNumber: values.phone,
          phone: `${values.phoneCountryCode} ${values.phone}`.trim(),
          pageUrl: window.location.href,
        }),
      });
      const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(body?.error?.message || 'We could not send your request. Please try again.');
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'We could not send your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteShell>
      <Box sx={{ background: 'linear-gradient(116deg,#f3ecf8 0%,#f8eee9 100%)', borderBottom: '1px solid rgba(85,23,184,.1)' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
          <Typography sx={{ color: '#6422c5', fontSize: 'var(--fs-12)', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' }}>Enterprise plans</Typography>
          <Typography variant="h1" sx={{ mt: 1.2, maxWidth: 760, color: '#241536', fontSize: { xs: 'var(--fs-36)', md: 'var(--fs-56)' }, lineHeight: 1.04, letterSpacing: '-.045em' }}>Let’s build the right customer engagement plan for your team.</Typography>
          <Typography sx={{ mt: 2, maxWidth: 680, color: '#60385f', fontSize: { xs: 'var(--fs-16)', md: 'var(--fs-18)' }, lineHeight: 1.65 }}>Tell us about your audience, channels, and growth goals. Our team will recommend the right limits, integrations, onboarding, and support for your business.</Typography>
        </Container>
      </Box>

      <Box sx={{ background: 'linear-gradient(180deg,#fcf9fc 0%,#f7f1fa 100%)' }}>
        <Container maxWidth="md" sx={{ py: { xs: 4, md: 7 } }}>
          <Box sx={{ p: { xs: 2.2, md: 4 }, border: '1px solid #ded5e8', borderRadius: 2.5, backgroundColor: '#fff', boxShadow: '0 20px 46px rgba(69,30,91,.12)' }}>
            {submitted ? (
              <Stack alignItems="center" textAlign="center" gap={1.5} sx={{ py: { xs: 4, md: 6 } }}>
                <CheckCircleRounded sx={{ color: '#16814d', fontSize: 58 }} />
                <Typography variant="h2" sx={{ color: '#241536', fontSize: { xs: 'var(--fs-26)', md: 'var(--fs-32)' } }}>Thanks — we received your details.</Typography>
                <Typography color="text.secondary" sx={{ maxWidth: 520, lineHeight: 1.65 }}>Our support team will connect with you soon through email.</Typography>
                <Button variant="outlined" onClick={() => { setValues(initialValues); setSubmitted(false); }} sx={{ mt: 1, textTransform: 'none', borderRadius: 1.25 }}>Send another inquiry</Button>
              </Stack>
            ) : (
              <Box component="form" onSubmit={submit} noValidate>
                <Typography variant="h2" sx={{ color: '#241536', fontSize: { xs: 'var(--fs-26)', md: 'var(--fs-32)' } }}>Talk to our sales team</Typography>
                <Typography color="text.secondary" sx={{ mt: .8, mb: 3, lineHeight: 1.6 }}>Share a few details and we’ll follow up with a plan tailored to your needs.</Typography>
                {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField label="Full name" value={values.name} onChange={update('name')} required fullWidth autoComplete="name" />
                  <TextField label="Work email" type="email" value={values.email} onChange={update('email')} required fullWidth autoComplete="email" />
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(132px, .42fr) 1fr', sm: 'minmax(144px, .48fr) 1fr' }, gap: 1 }}>
                    <TextField select label="Code" value={values.phoneCountryCode} onChange={update('phoneCountryCode')} required fullWidth aria-label="Phone country code" SelectProps={{
                      renderValue: (selected) => {
                        const country = PHONE_COUNTRIES.find((item) => item.dialCode === selected);
                        return country ? <Stack direction="row" alignItems="center" gap={.75} sx={{ whiteSpace: 'nowrap' }}><Box component="span" sx={{ fontSize: 19, lineHeight: 1 }}>{country.flag}</Box><Box component="span">{country.dialCode}</Box></Stack> : 'Select country';
                      },
                      MenuProps: { PaperProps: { sx: { maxHeight: 360, minWidth: 320 } } },
                    }}>
                      <MenuItem value="" disabled>Select country</MenuItem>
                      {PHONE_COUNTRIES.map((country) => <MenuItem key={country.code} value={country.dialCode} sx={{ gap: 1, minHeight: 42 }}>
                        <Box component="span" sx={{ width: 25, fontSize: 19, lineHeight: 1 }}>{country.flag}</Box>
                        <Box component="span" sx={{ width: 62, fontWeight: 600 }}>{country.dialCode}</Box>
                        <Box component="span">{country.name}</Box>
                      </MenuItem>)}
                    </TextField>
                    <TextField label="Phone number" type="tel" value={values.phone} onChange={update('phone')} required fullWidth autoComplete="tel-national" />
                  </Box>
                  <TextField label="Company (optional)" value={values.company} onChange={update('company')} fullWidth autoComplete="organization" />
                  <TextField label="How many users do you have? (optional)" value={values.userCount} onChange={update('userCount')} fullWidth placeholder="e.g. 10,000" />
                  <TextField label="What kind of channels? (optional)" value={values.channels} onChange={update('channels')} fullWidth placeholder="e.g. Email, push notifications, or in-app messaging" />
                </Box>
                <TextField label="How can we help?" value={values.description} onChange={update('description')} required fullWidth multiline minRows={6} sx={{ mt: 2 }} placeholder="Tell us about your audience, monthly volume, integrations, or enterprise requirements." />

                <Box sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }} aria-hidden="true">
                  <TextField tabIndex={-1} label="Website" value={values.website} onChange={update('website')} autoComplete="off" />
                </Box>
                <Button type="submit" variant="contained" size="large" disabled={submitting} endIcon={<ArrowForwardRounded />} sx={{ mt: 2.5, minHeight: 50, px: 3, borderRadius: 1.25, textTransform: 'none' }}>{submitting ? 'Sending…' : 'Submit inquiry'}</Button>
              </Box>
            )}
          </Box>
        </Container>
      </Box>
    </SiteShell>
  );
}
