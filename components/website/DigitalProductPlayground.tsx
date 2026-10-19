'use client';

import { useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import DesktopWindowsRounded from '@mui/icons-material/DesktopWindowsRounded';
import EmailRounded from '@mui/icons-material/EmailRounded';
import NotificationsActiveRounded from '@mui/icons-material/NotificationsActiveRounded';
import SendRounded from '@mui/icons-material/SendRounded';
import SmartphoneRounded from '@mui/icons-material/SmartphoneRounded';
import WidgetsRounded from '@mui/icons-material/WidgetsRounded';

type Channel = 'push' | 'email' | 'inapp';
type Device = 'mobile' | 'web';
type Draft = { title: string; message: string; action: string };

const channels: { id: Channel; label: string; icon: typeof EmailRounded; sendLabel: string }[] = [
  { id: 'push', label: 'Push notification', icon: NotificationsActiveRounded, sendLabel: 'Send test push' },
  { id: 'email', label: 'Email', icon: EmailRounded, sendLabel: 'Send test email' },
  { id: 'inapp', label: 'In-app message', icon: WidgetsRounded, sendLabel: 'Show in-app message' },
];

const initialDrafts: Record<Channel, Draft> = {
  push: { title: 'A fresh start is waiting, {name}', message: 'Your weekly plan is ready. Pick up right where you left off.', action: 'Open my plan' },
  email: { title: 'Your next step is ready, {name}', message: 'Hi {name},\n\nYour next step is ready when you are. Continue your plan and keep your momentum going. We’ll be here when you’re ready.', action: 'Continue my plan' },
  inapp: { title: 'You’re closer than you think, {name}.', message: 'Complete one more step to make this workspace yours.', action: 'Continue setup' },
};

function mergeName(value: string, name: string) {
  return value.replaceAll('{name}', name);
}

export default function DigitalProductPlayground() {
  const [channel, setChannel] = useState<Channel>('push');
  const [device, setDevice] = useState<Device>('mobile');
  const [drafts, setDrafts] = useState(initialDrafts);
  const [personalize, setPersonalize] = useState(true);
  const [sending, setSending] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const name = personalize ? 'Maya' : 'there';
  const draft = drafts[channel];
  const activeChannel = channels.find((item) => item.id === channel) ?? channels[0];
  const ChannelIcon = activeChannel.icon;
  const title = mergeName(draft.title, name);
  const message = mergeName(draft.message, name);
  const action = mergeName(draft.action, name);

  function updateDraft(field: keyof Draft, value: string) {
    setDrafts((current) => ({ ...current, [channel]: { ...current[channel], [field]: value } }));
    setDelivered(false);
  }

  function chooseChannel(nextChannel: Channel) {
    setChannel(nextChannel);
    setSending(false);
    setDelivered(false);
  }

  function sendTest() {
    if (sending) return;
    setDelivered(false);
    setSending(true);
    window.setTimeout(() => {
      setSending(false);
      setDelivered(true);
    }, 650);
  }

  return (
    <Box className="dp-playground" id="live-demo">
      <Box className="dp-playground-header">
        <Box><Typography className="dp-demo-kicker">BUILD IT · SEND IT · SEE IT</Typography><Typography id="dp-demo-heading" component="h2" className="dp-demo-title">Send a message to the preview.</Typography><Typography className="dp-demo-intro">Choose a channel, customize your content and send a test. Watch it arrive in the phone or browser—branded as PixlPush.</Typography></Box>
        <Box className="dp-demo-badge"><span /> INTERACTIVE DEMO <small>· local preview only</small></Box>
      </Box>

      <Box className="dp-demo-workspace">
        <Box className="dp-demo-controls">
          <Typography className="dp-control-label">CHOOSE YOUR MESSAGE</Typography>
          <Stack className="dp-channel-options" role="group" aria-label="Message type">
            {channels.map(({ id, label, icon: Icon }) => <Button key={id} onClick={() => chooseChannel(id)} className={`dp-channel-option ${channel === id ? 'is-selected' : ''}`} startIcon={<Icon />} aria-pressed={channel === id}>{label}<ArrowOutwardRounded className="dp-option-arrow" /></Button>)}
          </Stack>

          <Box className="dp-control-divider" />
          <Typography className="dp-control-label">DELIVER THE PREVIEW TO</Typography>
          <Stack direction="row" className="dp-device-toggle" role="group" aria-label="Choose where to preview the message">
            <Button onClick={() => setDevice('mobile')} aria-pressed={device === 'mobile'} className={device === 'mobile' ? 'is-selected' : ''} startIcon={<SmartphoneRounded />}>Mobile app</Button>
            <Button onClick={() => setDevice('web')} aria-pressed={device === 'web'} className={device === 'web' ? 'is-selected' : ''} startIcon={<DesktopWindowsRounded />}>Website</Button>
          </Stack>

          <Box className="dp-control-divider" />
          <Box className="dp-sender-row"><Box className="dp-sender-logo" aria-hidden="true" /><Box><Typography className="dp-sender-overline">SENDER</Typography><Typography className="dp-sender-name">PixlPush</Typography></Box><CheckCircleRounded /></Box>

          <Box className="dp-edit-fields">
            <TextField label={channel === 'email' ? 'Email subject' : channel === 'push' ? 'Notification title' : 'Message title'} value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} size="small" fullWidth inputProps={{ maxLength: 70 }} />
            <TextField label={channel === 'email' ? 'Email content' : 'Message'} value={draft.message} onChange={(event) => updateDraft('message', event.target.value)} size="small" fullWidth multiline minRows={channel === 'email' ? 3 : 2} inputProps={{ maxLength: 220 }} />
            <TextField label="Button label" value={draft.action} onChange={(event) => updateDraft('action', event.target.value)} size="small" fullWidth inputProps={{ maxLength: 28 }} />
          </Box>
          <Typography className="dp-token-hint">Use <b>{'{name}'}</b> to personalize the preview.</Typography>

          <Box className="dp-personalize-card"><Box className="dp-personalize-copy"><Typography>Preview as Maya</Typography><span>{personalize ? 'Personalization is on' : 'Showing the fallback greeting'}</span></Box><button className={`dp-switch ${personalize ? 'is-on' : ''}`} type="button" role="switch" aria-checked={personalize} aria-label="Personalize with first name" onClick={() => { setPersonalize((value) => !value); setDelivered(false); }}><span /></button></Box>

          <Button onClick={sendTest} disabled={sending || !draft.title.trim() || !draft.message.trim()} className="dp-simulate-button" variant="contained" endIcon={sending ? undefined : <SendRounded />}>{sending ? 'Sending to preview…' : delivered ? 'Send again' : activeChannel.sendLabel}</Button>
          <Typography className="dp-demo-disclaimer">This sends only to the on-page preview. No real notification or email is sent.</Typography>
        </Box>

        <Box className={`dp-preview-stage ${device === 'web' ? 'is-web' : 'is-mobile'}`}>
          <Box className="dp-stage-topline"><Box><Typography className="dp-stage-label">MAYA’S {device === 'mobile' ? 'PHONE' : 'BROWSER'}</Typography><Typography className="dp-stage-subtitle">{device === 'mobile' ? 'Customer app preview' : 'Customer website preview'}</Typography></Box><Box className="dp-stage-channel"><ChannelIcon />{activeChannel.label}</Box></Box>
          {device === 'mobile' ? (
            <Box className="dp-phone-wrap"><Box className="dp-phone"><Box className="dp-phone-screen">
              <Box className="dp-phone-status"><span>9:41</span><i>● ● ●</i></Box><Box className="dp-phone-island" />
              <Box className="dp-phone-wallpaper"><Box className="dp-wallpaper-brand"><span className="dp-brand-dot">S</span><b>Studio</b><span>•••</span></Box><Box className="dp-wallpaper-copy"><small>MONDAY · YOUR WORKSPACE</small><strong>Welcome back,<br />{name} <i>✦</i></strong><p>Your day is ready when you are.</p><Box className="dp-mobile-progress"><span><b>Weekly goal</b><strong>3 of 5 sessions</strong></span><i><span /></i><small>60%</small></Box><Box className="dp-mobile-task"><span className="dp-task-art">✦</span><span><small>YOUR NEXT STEP</small><b>Finish your workspace</b><i>Continue setup&nbsp; ↗</i></span></Box><Box className="dp-mobile-task dp-task-muted"><span className="dp-task-art">⌁</span><span><small>RECOMMENDED</small><b>Explore your dashboard</b><i>2 min&nbsp; ·&nbsp; For you</i></span></Box></Box></Box>
              {delivered && channel === 'push' && <Box key={`push-${title}-${message}`} className="dp-push-notification dp-message-arrival"><Box className="dp-app-icon" role="img" aria-label="PixlPush app icon" /><Box className="dp-push-content"><Stack direction="row" justifyContent="space-between"><b>PIXLPUSH · NOW</b><small>now</small></Stack><strong>{title}</strong><span>{message}</span><Box className="dp-arrival-action">{action}</Box></Box></Box>}
              {delivered && channel === 'email' && <Box key={`email-${title}`} className="dp-phone-incoming-email dp-message-arrival"><Box className="dp-email-arrival-top"><Box className="dp-sender-logo" /><Box><b>New email from PixlPush</b><small>Just arrived in your inbox</small></Box><span>now</span></Box><Typography className="dp-incoming-subject">{title}</Typography><Typography className="dp-incoming-excerpt">{message}</Typography><Box className="dp-arrival-action">Open email <ArrowOutwardRounded /></Box></Box>}
              {delivered && channel === 'inapp' && <Box key={`inapp-${title}`} className="dp-inapp-arrival dp-message-arrival"><Box className="dp-inapp-brand"><Box className="dp-sender-logo" /><span>MESSAGE FROM PIXLPUSH</span><button type="button" aria-label="Dismiss message" onClick={() => setDelivered(false)}>×</button></Box><strong>{title}</strong><p>{message}</p><Box className="dp-arrival-action">{action}<ArrowOutwardRounded /></Box></Box>}
              {!delivered && <Box className="dp-empty-preview"><Box className="dp-empty-preview-icon"><ChannelIcon /></Box><b>Your message will appear here</b><span>Customize it, then send a test to Maya’s phone.</span></Box>}
              <Box className="dp-phone-tabbar"><span>⌂<small>Home</small></span><span>⌕<small>Explore</small></span><span>◷<small>Activity</small></span><span>◉<small>Profile</small></span></Box>
            </Box></Box><Box className="dp-phone-shadow" /></Box>
          ) : (
            <Box className="dp-browser-wrap"><Box className="dp-browser">
              <Box className="dp-browser-bar"><span /><span /><span /><Box className="dp-address">app.example.com / workspace</Box><small>•••</small></Box>
              <Box className="dp-web-app"><Box className="dp-web-nav"><span className="dp-brand-dot">S</span><b>Studio</b><span>Dashboard</span><span>Projects</span><span>Resources</span><Box className="dp-web-avatar">{name.charAt(0).toUpperCase()}</Box></Box>
                <Box className="dp-web-body"><Box className="dp-web-greeting"><small>MONDAY · YOUR WORKSPACE</small><strong>Welcome back, {name} <i>✦</i></strong><span>Your projects and updates are right here.</span></Box><Box className="dp-web-content-skeleton"><span className="dp-web-progress-card"><small>WEEKLY GOAL</small><b>3 of 5 sessions</b><i><span /></i><em>60% complete</em></span><span className="dp-web-project-card"><small>CONTINUE WHERE YOU LEFT OFF</small><b>Finish your workspace</b><i>Complete your setup to get the most out of Studio.</i><em>Continue setup&nbsp; ↗</em></span><span className="dp-web-stat-card"><small>YOUR ACTIVITY</small><b>4 day streak <i>✦</i></b><em>Keep your momentum going.</em></span></Box>
                  {delivered && channel === 'push' && <Box key={`webpush-${title}`} className="dp-web-push dp-message-arrival"><Box className="dp-app-icon" role="img" aria-label="PixlPush app icon" /><Box><small>PIXLPUSH · NOW</small><b>{title}</b><span>{message}</span><i>{action}</i></Box></Box>}
                  {delivered && channel === 'email' && <Box key={`webmail-${title}`} className="dp-web-incoming-email dp-message-arrival"><Box className="dp-email-arrival-top"><Box className="dp-sender-logo" /><Box><b>New email from PixlPush</b><small>Delivered to Maya’s inbox</small></Box><span>now</span></Box><Typography className="dp-incoming-subject">{title}</Typography><Typography className="dp-incoming-excerpt">{message}</Typography><Box className="dp-arrival-action">{action} <ArrowOutwardRounded /></Box></Box>}
                  {delivered && channel === 'inapp' && <Box key={`webinapp-${title}`} className="dp-web-inapp dp-message-arrival"><Box className="dp-inapp-brand"><Box className="dp-sender-logo" /><span>MESSAGE FROM PIXLPUSH</span><button type="button" aria-label="Dismiss message" onClick={() => setDelivered(false)}>×</button></Box><b>{title}</b><p>{message}</p><Box className="dp-arrival-action">{action}<ArrowOutwardRounded /></Box></Box>}
                  {!delivered && <Box className="dp-web-empty-preview"><ChannelIcon /><b>Waiting for your test message</b><span>Send from the editor to see it arrive here.</span></Box>}
                </Box>
              </Box>
            </Box><Box className="dp-browser-stand" /></Box>
          )}
          {sending && <Box className="dp-sending-toast"><span className="dp-spinner" /> PixlPush is sending your test…</Box>}
          {delivered && <Box className="dp-simulation-toast"><CheckCircleRounded /> Test delivered to preview</Box>}
        </Box>
      </Box>
    </Box>
  );
}
