'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowBackRounded, CalendarTodayRounded, CloseRounded, EditRounded, LanguageRounded,
  LinkRounded, NotificationsActiveRounded, PeopleAltRounded, PhoneIphoneRounded,
  SaveRounded, SendRounded, TranslateRounded,
} from '@mui/icons-material';
import {
  Box, Button, Card, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControlLabel, Grid, IconButton, MenuItem, Radio, RadioGroup,
  Select, Stack, Switch, TextField, Typography,
} from '@mui/material';
import { audienceGroupsApi, lifecycleSegmentsApi, pushApi, type PushAudience } from '@/lib/projects/api';
import { useActiveProject } from '@/hooks/projects/use-active-project';

type Mode = 'campaign' | 'template';
type SaveTarget = 'send' | 'drafts' | 'templates';

const languages = ['Any/English', 'Arabic', 'French', 'Korean', 'Japanese', 'Italian', 'Indonesian', 'German', 'Persian', 'Portuguese', 'Russian', 'Spanish', 'Thai', 'Turkish', 'Vietnamese'];
const countries = ['All Countries', 'United States', 'United Kingdom', 'Germany', 'France', 'Italy'];
const deepLinks = ['Select deep link...', 'pixllovemobileapp://home', 'pixllovemobileapp://videochat', 'pixllovemobileapp://textchat', 'pixllovemobileapp://profile', 'pixllovemobileapp://profile-edit', 'pixllovemobileapp://book-of-love'];

export default function PushComposer({ mode, onBack, onSaved }: { mode: Mode; onBack: () => void; onSaved: (target: SaveTarget) => void }) {
  const { active } = useActiveProject();
  const queryClient = useQueryClient();
  const [currentMode, setCurrentMode] = useState<Mode>(mode);
  const isTemplate = currentMode === 'template';
  const [name, setName] = useState('');
  const [country, setCountry] = useState('All Countries');
  const [group, setGroup] = useState('Select group');
  const [selectedLanguages, setSelectedLanguages] = useState(['Any/English']);
  const [title, setTitle] = useState('Welcome to PixlPush 🎉');
  const [message, setMessage] = useState('Start your first match now — exciting profiles are waiting for you! ❤️');
  const [deepLink, setDeepLink] = useState('Select deep link...');
  const [ios, setIos] = useState(true);
  const [android, setAndroid] = useState(false);
  const [delivery, setDelivery] = useState('immediately');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [timezone, setTimezone] = useState('user');
  const [testOpen, setTestOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [testUserId, setTestUserId] = useState('');
  const [error, setError] = useState('');
  const groupsQuery = useQuery({ queryKey: ['projects', 'audience-groups', active?.id], queryFn: () => audienceGroupsApi.list(active!.id), enabled: Boolean(active?.id) });
  const segmentsQuery = useQuery({ queryKey: ['projects', 'lifecycle-segments', active?.id], queryFn: () => lifecycleSegmentsApi.list(active!.id), enabled: Boolean(active?.id) });
  const previewMutation = useMutation({ mutationFn: async () => {
    if (!active?.id) throw new Error('Select a project before previewing the audience.');
    const audience: PushAudience = group.startsWith('segment:') ? { lifecycleSegmentIds: [group.slice(8)] } : group.startsWith('group:') ? { audienceGroupIds: [group.slice(6)] } : { allUsers: true };
    return pushApi.campaigns.audiencePreview(active.id, audience);
  }, onSuccess: result => setNotice(`${result.matching.toLocaleString()} users match this audience · ${result.reachable.toLocaleString()} are reachable.`), onError: (cause: Error) => setError(cause.message || 'Could not preview the audience.') });
  const saveMutation = useMutation({ mutationFn: async ({ target }: { target: SaveTarget }) => {
    if (!active?.id) throw new Error('Select a project before saving a notification.');
    if (!name.trim()) throw new Error('Enter a notification name.');
    if (!isTemplate && country !== 'All Countries' && group === 'Select group') throw new Error('Select an audience group for country targeting before sending.');
    if (!isTemplate && delivery === 'specific' && (!scheduledDate || !scheduledTime)) throw new Error('Choose a date and time for the scheduled notification.');
    const content = { title, body: message, deepLink: deepLink === 'Select deep link...' ? null : deepLink, imageUrl: null, data: {}, translations: null };
    if (target === 'templates') {
      const template = await pushApi.templates.create(active.id, { name: name.trim(), ...content, category: 'template' });
      return { target, template };
    }
    const audience: PushAudience = group.startsWith('segment:') ? { lifecycleSegmentIds: [group.slice(8)] } : group.startsWith('group:') ? { audienceGroupIds: [group.slice(6)] } : { allUsers: true };
    const scheduledAt = delivery === 'specific' ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString() : undefined;
    const campaign = await pushApi.campaigns.create(active.id, { name: name.trim(), content, audience, sendNow: target === 'send' && delivery === 'immediately', scheduledAt });
    return { target, campaign };
  }, onSuccess: ({ target }) => { queryClient.invalidateQueries({ queryKey: ['push'] }); setNotice(target === 'send' ? 'Notification scheduled successfully.' : target === 'drafts' ? 'Saved as a draft.' : 'Saved as a template.'); window.setTimeout(() => onSaved(target), 500); }, onError: (cause: Error) => setError(cause.message || 'Could not save the notification.') });
  const testMutation = useMutation({ mutationFn: async () => {
    if (!active?.id) throw new Error('Select a project before sending a test.');
    if (!testUserId.trim()) throw new Error('Enter an end-user ID for the test device.');
    const template = await pushApi.templates.create(active.id, { name: `${name || 'Test notification'} · test`, title, body: message, deepLink: deepLink === 'Select deep link...' ? null : deepLink, imageUrl: null, data: {}, translations: null, category: 'push_notification' });
    return pushApi.templates.test(active.id, template.id, testUserId.trim());
  }, onSuccess: result => { setTestOpen(false); setNotice(result.delivered ? 'Test notification delivered.' : result.error || 'Test notification could not be delivered.'); }, onError: (cause: Error) => setError(cause.message || 'Could not send the test notification.') });

  const toggleLanguage = (language: string) => setSelectedLanguages(current => current.includes(language) ? current.filter(item => item !== language) : [...current, language]);
  const disabled = isTemplate;
  const action = (target: SaveTarget) => { setError(''); saveMutation.mutate({ target }); };
  const previewAudience = () => { setError(''); previewMutation.mutate(); };
  const groupOptions = groupsQuery.data ?? [];
  const segmentOptions = segmentsQuery.data ?? [];

  return <Stack className="push-composer" gap={2.5}>
    {error && <Typography color="error" fontSize={12}>{error}</Typography>}
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={1.5}>
      <Stack direction="row" alignItems="center" gap={1.5}><IconButton onClick={onBack} aria-label="Back to push workspace"><ArrowBackRounded /></IconButton><Box><Typography variant="h3">{isTemplate ? 'Create push template' : 'Create push campaign'}</Typography><Typography color="text.secondary" fontSize={12}>Build a notification that feels native to your audience.</Typography></Box></Stack>
      <Button variant="outlined" startIcon={<NotificationsActiveRounded />} onClick={() => setTestOpen(true)}>Test notification</Button>
    </Stack>

    <Card className="push-type-card"><Typography fontSize={12} fontWeight={900} color="text.secondary">Notification type</Typography><Stack direction="row" className="push-type-toggle"><Button onClick={() => setCurrentMode('campaign')} className={!isTemplate ? 'active' : ''} startIcon={<SendRounded />}>Push notification</Button><Button onClick={() => setCurrentMode('template')} className={isTemplate ? 'active' : ''} startIcon={<SaveRounded />}>Templates</Button></Stack><Typography color="text.secondary" fontSize={11} sx={{ mt: 1 }}>Templates creates reusable content. Save as draft creates a push campaign draft, so the backend categorizes it as <strong>push_notification</strong>.</Typography></Card>

    <Grid container spacing={2.5} alignItems="flex-start">
      <Grid item xs={12} lg={7}><Card className="push-form-card">
        <PushHeading number="N" color="#477fe4" title="Name" />
        <TextField fullWidth required label="Push notification name" placeholder="Enter push notification name..." value={name} onChange={event => setName(event.target.value)} sx={{ mb: 3 }} />

        <Box className={disabled ? 'push-disabled-section' : ''}><PushHeading number="1" color="#477fe4" title="Audience" disabled={disabled} /><Grid container spacing={1.5}><Grid item xs={12} sm={6}><Select fullWidth size="small" value={country} onChange={event => setCountry(event.target.value)} disabled={disabled}>{countries.map(item => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select></Grid><Grid item xs={12} sm={6}><Select fullWidth size="small" value={group} onChange={event => setGroup(event.target.value)} disabled={disabled}>{<MenuItem value="Select group">{groupsQuery.isLoading ? 'Loading audience groups…' : 'Select group'}</MenuItem>}{groupOptions.map(item => <MenuItem key={item.id} value={`group:${item.id}`}>{item.name} {item.memberCount !== undefined ? `(${item.memberCount})` : ''}</MenuItem>)}{segmentOptions.map(item => <MenuItem key={`segment-${item.id}`} value={`segment:${item.id}`}>{item.name} · lifecycle segment</MenuItem>)}</Select></Grid></Grid>{!disabled && <Button size="small" variant="text" onClick={previewAudience} disabled={previewMutation.isPending}>{previewMutation.isPending ? 'Checking audience…' : 'Preview audience'}</Button>}{country !== 'All Countries' && <Typography color="text.secondary" fontSize={11} sx={{ mt: 1 }}>Country targeting is managed through an audience group. Select a group that contains this country before sending.</Typography>}</Box>

        <Divider sx={{ my: 3 }} />
        <PushHeading number="2" color="#9c43e8" title="Message" /><Stack direction="row" flexWrap="wrap" gap={.5} sx={{ mb: 1.5 }}>{selectedLanguages.map(language => <Button key={language} size="small" className="push-language active">{language}</Button>)}<Button size="small" startIcon={<EditRounded />} onClick={() => setLanguageOpen(true)}>Add language</Button></Stack><Button fullWidth startIcon={<TranslateRounded />} className="push-translate-button" onClick={() => setNotice('Automatic translation needs a backend translation endpoint. Add the endpoint from the backend prompt to enable this action.')}>Auto translate to all selected languages</Button>
        <TextField fullWidth label="Title (Any/English)" required value={title} onChange={event => setTitle(event.target.value)} sx={{ mt: 2 }} /><TextField fullWidth multiline minRows={3} label="Message (Any/English)" required value={message} onChange={event => setMessage(event.target.value)} sx={{ mt: 2 }} />
        <TextField fullWidth select label="Deep link" value={deepLink} onChange={event => setDeepLink(event.target.value)} sx={{ mt: 2 }}><MenuItem value="Select deep link...">Select deep link...</MenuItem>{deepLinks.slice(1).map(item => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField>

        <Divider sx={{ my: 3 }} />
        <Box className={disabled ? 'push-disabled-section' : ''}><PushHeading number="▣" color="#ef7049" title="Platforms" disabled={disabled} /><Typography color="text.secondary" fontSize={12} sx={{ mb: 1.5 }}>Select which platforms to send this notification to.</Typography><Grid container spacing={1.5}><Grid item xs={12} sm={6}><PlatformCard icon={<PhoneIphoneRounded />} title="Apple iOS" subtitle="iPhone & iPad users" checked={ios} onChange={setIos} disabled={disabled} /></Grid><Grid item xs={12} sm={6}><PlatformCard icon={<PhoneIphoneRounded />} title="Google Android" subtitle="Android phone users" checked={android} onChange={setAndroid} disabled={disabled} /></Grid></Grid></Box>

        <Divider sx={{ my: 3 }} />
        <Box className={disabled ? 'push-disabled-section' : ''}><PushHeading number="3" color="#1eac5f" title="Delivery schedule" disabled={disabled} /><RadioGroup value={delivery} onChange={event => setDelivery(event.target.value)}><FormControlLabel disabled={disabled} value="immediately" control={<Radio />} label="Immediately" /><FormControlLabel disabled={disabled} value="specific" control={<Radio />} label="Specific date" /></RadioGroup>{delivery === 'specific' && <Box className="push-schedule-card"><RadioGroup row value={timezone} onChange={event => setTimezone(event.target.value)}><FormControlLabel disabled={disabled} value="global" control={<Radio />} label="Global time (UTC+1)" /><FormControlLabel disabled={disabled} value="user" control={<Radio />} label="User time zone" /></RadioGroup><Grid container spacing={1.5}><Grid item xs={12} sm={7}><TextField fullWidth type="date" label="Select date" value={scheduledDate} onChange={event => setScheduledDate(event.target.value)} InputLabelProps={{ shrink: true }} disabled={disabled} /></Grid><Grid item xs={12} sm={5}><TextField fullWidth type="time" label="Time" value={scheduledTime} onChange={event => setScheduledTime(event.target.value)} InputLabelProps={{ shrink: true }} disabled={disabled} /></Grid></Grid></Box>}</Box>

        <Divider sx={{ my: 3 }} /><Stack direction={{ xs: 'column', sm: 'row' }} gap={1.2} className="push-action-row">{!isTemplate && <Button variant="contained" startIcon={<SendRounded />} disabled={saveMutation.isPending} onClick={() => action('send')}>{saveMutation.isPending ? 'Sending…' : 'Send notification'}</Button>}<Button variant={isTemplate ? 'contained' : 'outlined'} startIcon={<SaveRounded />} disabled={saveMutation.isPending} onClick={() => action('templates')}>Save as template</Button><Button variant="outlined" startIcon={<SaveRounded />} disabled={saveMutation.isPending} onClick={() => action('drafts')}>Save as draft</Button></Stack>{notice && <Typography className="push-form-notice">{notice}</Typography>}
      </Card></Grid>
      <Grid item xs={12} lg={5}><Box className="push-preview-panel"><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography variant="h3">Live preview</Typography><Typography color="text.secondary" fontSize={12}>See how your notification will appear.</Typography></Box><Button className="push-preview-test-button" onClick={() => setTestOpen(true)} startIcon={<NotificationsActiveRounded />}>Test notification</Button></Stack><Box className="push-phone"><Box className="push-phone-notch" /><Stack direction="row" justifyContent="space-between" fontSize={10} color="text.secondary"><span>11:17</span><span>Tue, Oct 14</span></Stack><Box className="push-notification-card"><Stack direction="row" alignItems="center" gap={1}><Box className="push-avatar">P</Box><Box><Typography fontSize={11} fontWeight={900}>PixlPush</Typography><Typography fontSize={9} color="text.secondary">now</Typography></Box></Stack><Typography fontSize={12} fontWeight={900} sx={{ mt: 1.2 }}>{title || 'Your notification title'}</Typography><Typography fontSize={11} color="text.secondary" sx={{ mt: .6 }}>{message || 'Your notification message will appear here.'}</Typography></Box><Box className="push-placeholder blue" /><Box className="push-placeholder green" /></Box></Box></Grid>
    </Grid>

    <Dialog open={testOpen} onClose={() => setTestOpen(false)} maxWidth="xs" fullWidth><DialogTitle>Send test notification<IconButton onClick={() => setTestOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseRounded /></IconButton></DialogTitle><DialogContent><Typography color="text.secondary" fontSize={12} sx={{ mb: 1 }}>The backend sends the test to an end user with an active push subscription.</Typography><Stack gap={2} sx={{ pt: 1 }}><TextField label="End-user ID" placeholder="customer_123" value={testUserId} onChange={event => setTestUserId(event.target.value)} fullWidth /><TextField label="Title" value={title} onChange={event => setTitle(event.target.value)} fullWidth /><TextField label="Message" value={message} onChange={event => setMessage(event.target.value)} multiline minRows={3} fullWidth /><TextField label="Deep link" value={deepLink} onChange={event => setDeepLink(event.target.value)} fullWidth /></Stack></DialogContent><DialogActions><Button onClick={() => setTestOpen(false)}>Cancel</Button><Button variant="contained" disabled={testMutation.isPending} onClick={() => { setError(''); testMutation.mutate(); }}>{testMutation.isPending ? 'Sending…' : 'Send test'}</Button></DialogActions></Dialog>
    <Dialog open={languageOpen} onClose={() => setLanguageOpen(false)} maxWidth="md" fullWidth><DialogTitle>Add languages<IconButton onClick={() => setLanguageOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseRounded /></IconButton></DialogTitle><DialogContent><Typography color="text.secondary" fontSize={13} sx={{ mb: 2 }}>Any/English is the default language. Add translations for the languages your audience uses.</Typography><Grid container spacing={1}>{languages.map(language => <Grid item xs={12} sm={6} md={4} key={language}><Card variant="outlined" sx={{ p: .5 }}><FormControlLabel control={<Checkbox checked={selectedLanguages.includes(language)} onChange={() => toggleLanguage(language)} disabled={language === 'Any/English'} />} label={language} /></Card></Grid>)}</Grid></DialogContent><DialogActions><Button onClick={() => setLanguageOpen(false)}>Cancel</Button><Button variant="contained" onClick={() => setLanguageOpen(false)}>Select languages</Button></DialogActions></Dialog>
  </Stack>;
}

function PushHeading({ number, color, title, disabled }: { number: string; color: string; title: string; disabled?: boolean }) { return <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5, opacity: disabled ? .5 : 1 }}><Box className="push-number-badge" sx={{ bgcolor: color }}>{number}</Box><Typography fontSize={20} fontWeight={900}>{title}</Typography>{disabled && <Typography fontSize={11} color="text.secondary">(disabled for templates)</Typography>}</Stack>; }
function PlatformCard({ icon, title, subtitle, checked, onChange, disabled }: { icon: React.ReactNode; title: string; subtitle: string; checked: boolean; onChange: (value: boolean) => void; disabled: boolean }) { return <Card className="push-platform-card" variant="outlined"><Stack direction="row" alignItems="center" gap={1.2}><Box className="push-platform-icon">{icon}</Box><Box sx={{ flex: 1 }}><Typography fontWeight={900} fontSize={13}>{title}</Typography><Typography color="text.secondary" fontSize={11}>{subtitle}</Typography></Box><Switch checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} /></Stack>{checked && <Typography color="#477fe4" fontSize={10} sx={{ mt: 1 }}>✓ Enabled for this platform</Typography>}</Card>; }
