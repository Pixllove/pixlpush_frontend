'use client';

import { useState, type DragEvent } from 'react';
import Image from 'next/image';
import { CloudUploadRounded, CloseRounded, LockRounded, OpenInNewRounded } from '@mui/icons-material';
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Typography } from '@mui/material';
import { firebaseApi } from '@/lib/projects/api';
import type { FirebaseSettings } from '@/types/project';
import type { ApiError } from '@/types/auth';

export default function FirebaseConnectDialog({ open, onClose, projectId, existing, onConnected }: {
  open: boolean;
  onClose: () => void;
  projectId?: string;
  existing?: FirebaseSettings;
  onConnected?: () => void;
}) {
  const [file, setFile] = useState<{ name: string; text: string; projectId?: string; adminKey?: boolean }>();
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const firebaseProjectChange = Boolean(existing?.firebaseProjectId && file?.projectId && existing.firebaseProjectId !== file.projectId);

  const pick = async (picked?: File) => {
    setError('');
    setFile(undefined);
    if (!picked) return;
    const text = await picked.text();
    let projectIdFromFile: string | undefined;
    let adminKey = false;
    try {
      const parsed = JSON.parse(text) as { project_id?: unknown; client_email?: unknown; project_info?: unknown };
      projectIdFromFile = typeof parsed.project_id === 'string' ? parsed.project_id : undefined;
      adminKey = typeof parsed.client_email === 'string' && parsed.client_email.startsWith('firebase-adminsdk');
      if (!projectIdFromFile) setError(parsed.project_info ? 'This is google-services.json. Upload the Firebase service-account key JSON instead.' : 'This file is not a valid service-account key because it has no project_id.');
    } catch {
      setError('This file is not valid JSON.');
    }
    setFile({ name: picked.name, text, projectId: projectIdFromFile, adminKey });
  };

  const upload = async () => {
    if (!projectId || !file?.projectId) return;
    setError('');
    setUploading(true);
    try {
      if (firebaseProjectChange && confirm.trim() !== file.projectId) {
        setError(`Type ${file.projectId} to confirm changing Firebase projects.`);
        return;
      }
      await firebaseApi.upload(projectId, { serviceAccount: file.text, ...(firebaseProjectChange ? { confirmFirebaseProjectId: confirm.trim() } : {}) });
      setFile(undefined);
      setConfirm('');
      onConnected?.();
      onClose();
    } catch (cause) {
      setError((cause as ApiError).message || 'Could not connect Firebase. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDropActive(false);
    void pick(event.dataTransfer.files?.[0]);
  };

  return <Dialog className="firebase-max-dialog" open={open} onClose={onClose} fullWidth maxWidth="lg" aria-labelledby="firebase-max-title">
    <DialogTitle id="firebase-max-title" className="firebase-max-dialog-title">
      <div className="firebase-max-title-main"><span className="max-avatar"><Image src="/assets/agent-avatar-max-v4.webp" alt="Max" width={52} height={52} /></span><span><strong>Connect Firebase with Max</strong><small>PUSH NOTIFICATIONS · SECURE CONNECTION</small></span></div>
      <IconButton aria-label="Close Firebase setup" onClick={onClose}><CloseRounded /></IconButton>
    </DialogTitle>
    <DialogContent dividers className="firebase-max-dialog-content">
      <Typography className="firebase-guide-heading">How to find your Firebase Service Account JSON</Typography>
      <div className="firebase-guide-layout">
        <div className="firebase-guide-steps">
          <div className="firebase-guide-step"><span>1</span><div><strong>Open Firebase Console</strong><p>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer">console.firebase.google.com</a> and select your Firebase project.</p></div></div>
          <div className="firebase-guide-step"><span>2</span><div><strong>Open Project Settings</strong><p>Click the gear icon next to Project Overview and select <b>Project settings</b>.</p></div></div>
          <div className="firebase-guide-step"><span>3</span><div><strong>Go to Service Accounts</strong><p>Select the <b>Service accounts</b> tab at the top.</p></div></div>
          <div className="firebase-guide-step"><span>4</span><div><strong>Download your JSON file</strong><p>If you already have a Firebase Service Account JSON file, you can use it. Otherwise, click <b>Generate new private key</b> to download one.</p><div className="firebase-guide-note"><b>Don’t worry:</b> Generating a new private key won’t invalidate your existing keys or interrupt your current Firebase integrations.</div></div></div>
          <div className="firebase-guide-step"><span>5</span><div><strong>Upload the file to PixlPush</strong><p>Return here and upload your Service Account JSON file to securely connect your project.</p></div></div>
        </div>
        <div className="firebase-guide-gallery" aria-label="Firebase setup screenshots">
          <figure><span className="firebase-guide-image-number">1</span><Image src="/assets/firebase-guide-console-v2.png" alt="Firebase Console project selector" width={2172} height={724} /></figure>
          <figure><span className="firebase-guide-image-number">2</span><Image src="/assets/firebase-guide-settings-v2.png" alt="Firebase Project settings and Service accounts" width={2043} height={770} /></figure>
          <figure><span className="firebase-guide-image-number">3</span><Image src="/assets/firebase-guide-service-account-v2.png" alt="Firebase Generate new private key button" width={2172} height={724} /></figure>
        </div>
      </div>
      <div className="firebase-upload-panel">
        <div className="firebase-upload-panel-head"><div><strong>Choose your Firebase Service Account JSON</strong><span>Your file will be validated before connecting.</span></div><Chip size="small" label="Secure upload" /></div>
        <div className={`firebase-dropzone${dropActive ? ' is-active' : ''}${file ? ' has-file' : ''}`} onDragOver={(event) => { event.preventDefault(); setDropActive(true); }} onDragLeave={() => setDropActive(false)} onDrop={drop}>
          <CloudUploadRounded /><strong>{file ? file.name : 'Drag and drop your JSON file here'}</strong><span>{file ? 'Ready to validate this service-account key.' : 'or choose a file from your device'}</span><Button component="label" variant="outlined">Browse file<input type="file" accept="application/json,.json" hidden onChange={(event) => void pick(event.target.files?.[0])} /></Button>
        </div>
        {file?.projectId && <Typography className="firebase-file-meta">Firebase project in this file: <b>{file.projectId}</b></Typography>}
        {file?.adminKey && <Alert severity="warning">This is Firebase’s default Admin key. It works, but a key limited to push sending is safer.</Alert>}
        {firebaseProjectChange && <TextField label={`Type "${file?.projectId}" to confirm`} value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="off" fullWidth />}
        {error && <Alert severity="error">{error}</Alert>}
        <Alert severity="info" icon={<LockRounded />}>Your private key is sensitive. Credentials are encrypted and stored only in the PixlPush backend. They are never saved in browser storage.</Alert>
      </div>
    </DialogContent>
    <DialogActions className="firebase-max-dialog-actions"><Button href="https://console.firebase.google.com" target="_blank" startIcon={<OpenInNewRounded />}>Open Firebase Console</Button><Button variant="contained" disabled={!file?.projectId || uploading || (firebaseProjectChange && confirm.trim() !== file?.projectId)} onClick={() => void upload()}>{uploading ? 'Validating…' : 'Validate & connect'}</Button></DialogActions>
  </Dialog>;
}
