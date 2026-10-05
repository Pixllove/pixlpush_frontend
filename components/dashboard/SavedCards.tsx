"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreditCardRounded, DeleteOutlineRounded, EditRounded, StarRounded } from "@mui/icons-material";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Skeleton, Stack, TextField, Typography } from "@mui/material";
import { billingApi } from "@/lib/projects/api";
import { billingErrorMessage } from "@/lib/billing";
import type { SavedCard } from "@/types/project";

const brandLabel = (brand: string | null) =>
  ({ visa: "VISA", mastercard: "Mastercard", amex: "AMEX", discover: "Discover", unionpay: "UnionPay", jcb: "JCB", diners: "Diners" } as Record<string, string>)[brand ?? ""] ?? "Card";
const expiry = (card: SavedCard) => card.expMonth ? `${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}` : "—";
const thisYear = new Date().getFullYear();

/**
 * The project's saved cards, managed in the app. Stripe holds the cards: PixlPush only ever sees brand, last four,
 * expiry and holder name, and every change goes through the backend, which checks the card is this project's.
 */
export default function SavedCards({ projectId, adding, onAdd, onChanged }: {
  projectId: string;
  adding: boolean;
  /** Opens the add-card dialog (Stripe's card form). */
  onAdd: () => void;
  /** After any change: re-read billing state and show this message. */
  onChanged: (message: string) => Promise<void> | void;
}) {
  const cards = useQuery({ queryKey: ["projects", "billing", projectId, "payment-methods"], queryFn: () => billingApi.paymentMethods(projectId) });
  const [editing, setEditing] = useState<SavedCard | null>(null);
  const [removing, setRemoving] = useState<SavedCard | null>(null);
  const [form, setForm] = useState({ name: "", expMonth: 1, expYear: thisYear });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (key: string, request: () => Promise<unknown>, done: string) => {
    if (busy) return false;
    setBusy(key);
    setError(null);
    try {
      await request();
      await cards.refetch();
      await onChanged(done);
      return true;
    } catch (failure) {
      setError(billingErrorMessage(failure, "We could not update this card. Please try again."));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const openEdit = (card: SavedCard) => {
    setForm({ name: card.name ?? "", expMonth: card.expMonth ?? 1, expYear: card.expYear ?? thisYear });
    setError(null);
    setEditing(card);
  };
  const expired = form.expYear < thisYear || (form.expYear === thisYear && form.expMonth < new Date().getMonth() + 1);

  return (
    <Stack gap={2}>
      {error && !editing && <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>{error}</Alert>}
      {cards.isPending ? (
        <Skeleton variant="rounded" height={170} sx={{ borderRadius: 2 }} />
      ) : !cards.data?.length ? (
        <Box className="saas-card" sx={{ p: 4, textAlign: "center", borderRadius: 2, border: "1px dashed #d9cdea", backgroundColor: "#fff" }}>
          <CreditCardRounded sx={{ fontSize: 40, color: "#9874c9" }} />
          <Typography fontWeight={800} sx={{ mt: 1 }}>No saved card</Typography>
          <Typography color="text.secondary" fontSize={13}>Add a card securely through Stripe. Renewals are charged to it.</Typography>
          <Button variant="outlined" onClick={onAdd} disabled={adding} sx={{ mt: 2, textTransform: "none" }}>{adding ? "Opening…" : "Add a card"}</Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {cards.data.map((card) => (
            <Grid item xs={12} md={6} xl={4} key={card.id}>
              <Box sx={{ borderRadius: 2.5, overflow: "hidden", border: "1px solid", borderColor: card.isDefault ? "#cdb6f4" : "#ebe5f0", backgroundColor: "#fff", boxShadow: "0 14px 35px rgba(58,34,96,.07)" }}>
                {/* The card face: what the customer recognises, nothing more. */}
                <Box sx={{ position: "relative", p: 2.25, minHeight: 132, color: "#fff", background: card.isDefault ? "linear-gradient(125deg,#24133c 0%,#4b1e88 62%,#7026c9 100%)" : "linear-gradient(125deg,#2b2433 0%,#433a4f 100%)" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={900} fontSize={card.brand === "visa" ? 18 : 14} sx={{ fontStyle: card.brand === "visa" ? "italic" : "normal", letterSpacing: card.brand === "visa" ? 1 : 0.3 }}>{brandLabel(card.brand)}</Typography>
                    {card.isDefault && <Chip icon={<StarRounded />} label="Default" size="small" sx={{ height: 22, color: "#fff", backgroundColor: "rgba(255,255,255,.16)", fontSize: 11, fontWeight: 800, "& .MuiChip-icon": { color: "#ffd98a", fontSize: 15 } }} />}
                  </Stack>
                  <Typography sx={{ mt: 2.5, fontSize: 19, fontWeight: 700, letterSpacing: 3, fontFamily: "SFMono-Regular, Menlo, monospace" }}>•••• •••• •••• {card.last4 ?? "····"}</Typography>
                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 1.5 }}>
                    <Box>
                      <Typography fontSize={9} sx={{ opacity: 0.65, letterSpacing: 1.2 }}>CARDHOLDER</Typography>
                      <Typography fontSize={12} fontWeight={800} noWrap sx={{ maxWidth: 180, textTransform: "uppercase" }}>{card.name || "—"}</Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography fontSize={9} sx={{ opacity: 0.65, letterSpacing: 1.2 }}>EXPIRES</Typography>
                      <Typography fontSize={12} fontWeight={800}>{expiry(card)}</Typography>
                    </Box>
                  </Stack>
                </Box>
                <Stack direction="row" gap={0.5} sx={{ px: 1, py: 0.75 }}>
                  <Button size="small" startIcon={<EditRounded />} onClick={() => openEdit(card)} sx={{ textTransform: "none", fontWeight: 800 }}>Edit</Button>
                  {!card.isDefault && (
                    <Button size="small" startIcon={<StarRounded />} disabled={Boolean(busy)} onClick={() => act(`default-${card.id}`, () => billingApi.savePaymentMethod(projectId, card.id), `Renewals will now be charged to •••• ${card.last4}.`)} sx={{ textTransform: "none", fontWeight: 800 }}>
                      {busy === `default-${card.id}` ? "Saving…" : "Make default"}
                    </Button>
                  )}
                  <Box sx={{ flex: 1 }} />
                  {!card.isDefault && (
                    <Button size="small" color="error" startIcon={<DeleteOutlineRounded />} disabled={Boolean(busy)} onClick={() => setRemoving(card)} sx={{ textTransform: "none", fontWeight: 800 }}>Remove</Button>
                  )}
                </Stack>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2.5 } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Edit card •••• {editing?.last4}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" fontSize={12} sx={{ mb: 2 }}>Update the expiry of a renewed card or the cardholder name. To use a different card number, add a new card.</Typography>
          <Stack gap={2}>
            <TextField size="small" label="Cardholder name" placeholder="Name as printed on the card" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <Stack direction="row" gap={2}>
              <TextField select size="small" fullWidth label="Expiry month" value={form.expMonth} onChange={(event) => setForm((current) => ({ ...current, expMonth: Number(event.target.value) }))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => <MenuItem key={month} value={month}>{String(month).padStart(2, "0")}</MenuItem>)}
              </TextField>
              <TextField select size="small" fullWidth label="Expiry year" value={form.expYear} onChange={(event) => setForm((current) => ({ ...current, expYear: Number(event.target.value) }))}>
                {Array.from({ length: 16 }, (_, i) => thisYear + i).map((year) => <MenuItem key={year} value={year}>{year}</MenuItem>)}
              </TextField>
            </Stack>
            {expired && <Alert severity="warning" sx={{ borderRadius: 1.5 }}>This date is in the past.</Alert>}
            {error && editing && <Alert severity="error" sx={{ borderRadius: 1.5 }}>{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setEditing(null)} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button variant="contained" disabled={expired || Boolean(busy)} sx={{ textTransform: "none", fontWeight: 800 }}
            onClick={async () => {
              const card = editing!;
              if (await act("edit", () => billingApi.updatePaymentMethod(projectId, card.id, { expMonth: form.expMonth, expYear: form.expYear, name: form.name.trim() }), `Card •••• ${card.last4} updated.`)) setEditing(null);
            }}>
            {busy === "edit" ? "Saving…" : "Save changes"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(removing)} onClose={() => setRemoving(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2.5 } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Remove card •••• {removing?.last4}?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" fontSize={14}>The card is removed from Stripe and can no longer be charged. Your default card is not affected.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setRemoving(null)} sx={{ textTransform: "none" }}>Keep card</Button>
          <Button color="error" variant="contained" disabled={Boolean(busy)} sx={{ textTransform: "none", fontWeight: 800 }}
            onClick={async () => { const card = removing!; setRemoving(null); await act("remove", () => billingApi.removePaymentMethod(projectId, card.id), `Card •••• ${card.last4} removed.`); }}>
            Remove card
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
