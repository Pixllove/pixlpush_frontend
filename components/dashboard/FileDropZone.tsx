'use client';

import { useState, type DragEvent } from 'react';
import { CloudUploadRounded, InsertDriveFileRounded } from '@mui/icons-material';
import { Box, Button, Typography } from '@mui/material';

/** Drag a file in, or click to browse. Used by the Firebase and APNs connect dialogs. */
export default function FileDropZone({ accept, label, hint, fileName, onFile, inputLabel }: {
  accept: string;
  label: string;
  hint: string;
  fileName?: string;
  onFile: (file?: File) => void;
  inputLabel?: string;
}) {
  const [over, setOver] = useState(false);
  const drop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    onFile(event.dataTransfer.files?.[0]);
  };
  return (
    <Box
      component="label"
      data-testid="file-drop-zone"
      onDragOver={(e: DragEvent) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
      sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: .75, p: 3, textAlign: 'center', cursor: 'pointer',
        border: '1.5px dashed', borderColor: over ? 'primary.main' : 'divider', borderRadius: 2,
        bgcolor: over ? 'rgba(99,57,214,.06)' : 'transparent', transition: 'border-color .15s, background-color .15s',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      {fileName ? <InsertDriveFileRounded color="primary" /> : <CloudUploadRounded color="primary" />}
      <Typography fontWeight={600} fontSize="var(--fs-13)" color={fileName ? 'text.primary' : 'primary'}>{fileName ?? label}</Typography>
      <Typography color="text.secondary" fontSize="var(--fs-12)">{fileName ? 'Drop another file or click to replace it.' : hint}</Typography>
      <Button component="span" variant="outlined" size="small" sx={{ mt: .5 }}>{fileName ? 'Choose another file' : 'Browse files'}</Button>
      <input type="file" accept={accept} hidden aria-label={inputLabel} onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
    </Box>
  );
}
