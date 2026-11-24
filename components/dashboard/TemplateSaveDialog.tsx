"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";

type SaveAction = "update" | "new";

export default function TemplateSaveDialog({
  open,
  onClose,
  onUpdate,
  onSaveAsNew,
}: {
  open: boolean;
  onClose: () => void;
  onUpdate: () => Promise<boolean>;
  onSaveAsNew: () => Promise<boolean>;
}) {
  const [pending, setPending] = useState<SaveAction | null>(null);

  const run = async (action: SaveAction, save: () => Promise<boolean>) => {
    if (pending) return;
    setPending(action);
    try {
      if (await save()) onClose();
    } finally {
      setPending(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={pending ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="template-save-dialog-title"
    >
      <DialogTitle id="template-save-dialog-title">Save template</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" fontSize="var(--fs-13)">
          You are editing an existing template. Choose whether to update it or
          save the current version as a separate template.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={Boolean(pending)}>
          Cancel
        </Button>
        <Stack direction="row" gap={1}>
          <Button
            variant="outlined"
            onClick={() => void run("new", onSaveAsNew)}
            disabled={Boolean(pending)}
          >
            {pending === "new" ? "Saving…" : "Save as new template"}
          </Button>
          <Button
            variant="contained"
            onClick={() => void run("update", onUpdate)}
            disabled={Boolean(pending)}
          >
            {pending === "update" ? "Updating…" : "Update existing"}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
