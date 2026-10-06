"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircleRounded, ContactlessRounded, CreditCardRounded, DeleteOutlineRounded, EditRounded, StarRounded } from "@mui/icons-material";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, MenuItem, Skeleton, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { billingApi } from "@/lib/projects/api";
import { billingErrorMessage } from "@/lib/billing";
import type { SavedCard } from "@/types/project";

const brandLabel = (brand: string | null) =>
  ({ visa: "VISA", mastercard: "Mastercard", amex: "AMEX", discover: "Discover", unionpay: "UnionPay", jcb: "JCB", diners: "Diners" } as Record<string, string>)[brand ?? ""] ?? "Card";
const expiry = (card: SavedCard) => card.expMonth ? `${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}` : "—";
const thisYear = new Date().getFullYear();
const cardBackground = (card: SavedCard) => card.isDefault
  ? "radial-gradient(circle at 90% 0%, rgba(151,114,255,.55), transparent 34%), linear-gradient(135deg,#21164e 0%,#4520a0 52%,#a42c85 100%)"
  : "radial-gradient(circle at 90% 0%, rgba(102,139,255,.28), transparent 34%), linear-gradient(135deg,#151b3b 0%,#26336e 100%)";

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
          {[...cards.data].sort((first, second) => Number(second.isDefault) - Number(first.isDefault)).map((card) => (
            <Grid item xs={12} md={6} key={card.id}>
              <Box sx={{ width: "100%", borderRadius: 2.5, overflow: "hidden", border: "1px solid", borderColor: card.isDefault ? "#bda4f4" : "#dfe4f1", backgroundColor: "#fff", boxShadow: card.isDefault ? "0 18px 34px rgba(88,53,180,.16)" : "0 12px 28px rgba(34,47,94,.09)" }}>
                {/* The card face: what the customer recognises, nothing more. */}
                <Box sx={{ position: "relative", height: { xs: 250, sm: 275, md: 300 }, p: 2.4, display: "flex", flexDirection: "column", color: "#fff", overflow: "hidden", background: cardBackground(card), "&:before": { content: "\"\"", position: "absolute", width: 270, height: 270, right: -115, top: -155, borderRadius: "50%", backgroundColor: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)" }, "&:after": { content: "\"\"", position: "absolute", width: 250, height: 140, left: -95, bottom: -92, borderRadius: "50%", backgroundColor: "rgba(255,255,255,.055)", transform: "rotate(-18deg)" }, "& > *": { position: "relative", zIndex: 1 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Box sx={{ width: 42, height: 26, display: "grid", placeItems: "center", borderRadius: 1, backgroundColor: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.2)" }}>
                        {card.brand === "mastercard" ? (
                          <Box sx={{ position: "relative", width: 25, height: 14 }}>
                            <Box sx={{ position: "absolute", left: 1, width: 14, height: 14, borderRadius: "50%", backgroundColor: "#ef3e44" }} />
                            <Box sx={{ position: "absolute", right: 1, width: 14, height: 14, borderRadius: "50%", backgroundColor: "#ffbf2f", opacity: 0.95 }} />
                          </Box>
                        ) : <Typography fontSize={card.brand === "visa" ? 13 : 10} fontWeight={900} sx={{ fontStyle: card.brand === "visa" ? "italic" : "normal", letterSpacing: card.brand === "visa" ? 0.5 : 0.2 }}>{brandLabel(card.brand)}</Typography>}
                      </Box>
                      <Typography fontWeight={900} fontSize={card.brand === "visa" ? 18 : 14} sx={{ fontStyle: card.brand === "visa" ? "italic" : "normal", letterSpacing: card.brand === "visa" ? 1 : 0.3 }}>{brandLabel(card.brand)}</Typography>
                    </Stack>
                    {card.isDefault && <Chip icon={<CheckCircleRounded />} label="Default" size="small" sx={{ height: 24, color: "#fff", backgroundColor: "rgba(71,217,137,.22)", border: "1px solid rgba(129,255,179,.35)", fontSize: 11, fontWeight: 800, "& .MuiChip-icon": { color: "#7df2ad", fontSize: 15 } }} />}
                  </Stack>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: "auto" }}>
                    <Box sx={{ width: 44, height: 31, borderRadius: 1.2, background: "linear-gradient(135deg,#fff1af,#d9b85d)", boxShadow: "inset 0 0 0 1px rgba(104,68,20,.2)", overflow: "hidden", position: "relative", "&:before": { content: "\"\"", position: "absolute", left: "50%", top: 0, width: 1, height: "100%", backgroundColor: "rgba(104,68,20,.25)" }, "&:after": { content: "\"\"", position: "absolute", top: "50%", left: 0, width: "100%", height: 1, backgroundColor: "rgba(104,68,20,.25)" } }} />
                    <ContactlessRounded sx={{ fontSize: 29, opacity: 0.86, transform: "rotate(90deg)" }} />
                  </Stack>
                  <Typography sx={{ mt: 1.5, fontSize: 18, fontWeight: 700, letterSpacing: 2.8, fontFamily: "SFMono-Regular, Menlo, monospace", whiteSpace: "nowrap" }}>**** **** **** {card.last4 ?? "****"}</Typography>
                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 1.2 }}>
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
                <Stack direction="row" gap={0.5} alignItems="center" sx={{ px: 1.2, py: 0.65, minHeight: 46 }}>
                  <Button size="small" startIcon={<EditRounded />} onClick={() => openEdit(card)} sx={{ textTransform: "none", fontWeight: 800 }}>Edit</Button>
                  {!card.isDefault && (
                    <Button size="small" startIcon={<StarRounded />} disabled={Boolean(busy)} onClick={() => act(`default-${card.id}`, () => billingApi.savePaymentMethod(projectId, card.id), `Renewals will now be charged to •••• ${card.last4}.`)} sx={{ textTransform: "none", fontWeight: 800 }}>
                      {busy === `default-${card.id}` ? "Saving…" : "Make default"}
                    </Button>
                  )}
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title={card.isDefault ? "Make another card default before removing this card" : "Remove card"}>
                    <span>
                      <IconButton
                        aria-label={card.isDefault ? "Remove default card" : "Remove"}
                        color="error"
                        size="small"
                        disabled={Boolean(busy) || card.isDefault}
                        onClick={() => setRemoving(card)}
                        sx={card.isDefault ? { color: "#ef4444 !important", opacity: 0.65 } : undefined}
                      >
                        <DeleteOutlineRounded fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
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
