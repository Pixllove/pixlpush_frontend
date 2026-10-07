"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircleRounded, ContactlessRounded, CreditCardRounded, DeleteOutlineRounded, ShieldRounded, StarRounded } from "@mui/icons-material";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, Skeleton, Stack, Tooltip, Typography } from "@mui/material";
import { billingApi } from "@/lib/projects/api";
import { billingErrorMessage } from "@/lib/billing";
import type { SavedCard } from "@/types/project";

const brandLabel = (brand: string | null) =>
  ({ visa: "VISA", mastercard: "Mastercard", amex: "AMEX", discover: "Discover", unionpay: "UnionPay", jcb: "JCB", diners: "Diners" } as Record<string, string>)[brand ?? ""] ?? "Card";
const expiry = (card: SavedCard) => card.expMonth ? `${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}` : "—";
// The default card wears the same navy-to-violet surface as the other accent blocks; the rest are a quieter slate.
const cardBackground = (card: SavedCard) => card.isDefault
  ? "var(--pp-hero)"
  : "linear-gradient(135deg, #2B2740 0%, #4B4168 100%)";

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
  const [removing, setRemoving] = useState<SavedCard | null>(null);
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

  return (
    <Stack gap={2}>
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>{error}</Alert>}
      {cards.isPending ? (
        <Grid container spacing={2} role="status" aria-label="Loading cards">
          <Grid item xs={12} md={6}><Skeleton variant="rounded" sx={{ height: { xs: 266, sm: 281, md: 296 }, maxWidth: { md: 540 } }} /></Grid>
        </Grid>
      ) : !cards.data?.length ? (
        <Box className="saas-card" sx={{ p: 4, textAlign: "center", borderRadius: 2, border: "1px dashed #d9cdea", backgroundColor: "#fff" }}>
          <CreditCardRounded sx={{ fontSize: 40, color: "#9874c9" }} />
          <Typography fontWeight={600} sx={{ mt: 1 }}>No saved card</Typography>
          <Typography color="text.secondary" fontSize={13}>Add a card securely through Stripe. Renewals are charged to it.</Typography>
          <Button variant="outlined" onClick={onAdd} disabled={adding} sx={{ mt: 2, textTransform: "none" }}>{adding ? "Opening…" : "Add a card"}</Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {[...cards.data].sort((first, second) => Number(second.isDefault) - Number(first.isDefault)).map((card) => (
            <Grid item xs={12} md={6} key={card.id}>
              <Box sx={{ width: "100%", maxWidth: { xs: "100%", md: 540 }, borderRadius: 2.5, overflow: "hidden", border: "1px solid", borderColor: card.isDefault ? "#bda4f4" : "#dfe4f1", backgroundColor: "#fff", boxShadow: card.isDefault ? "0 16px 28px rgba(56,38,120,.15)" : "0 10px 22px rgba(34,47,94,.08)" }}>
                {/* The card face: what the customer recognises, nothing more. */}
                <Box sx={{ position: "relative", height: { xs: 220, sm: 235, md: 250 }, p: { xs: 2, sm: 2.25 }, display: "flex", flexDirection: "column", color: "#fff", overflow: "hidden", background: cardBackground(card), "&:before": { content: "\"\"", position: "absolute", width: 360, height: 360, right: -178, top: -238, borderRadius: "50%", backgroundColor: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.11)" }, "&:after": { content: "\"\"", position: "absolute", width: 260, height: 90, left: -96, bottom: -58, borderRadius: "50%", backgroundColor: "rgba(255,255,255,.045)", transform: "rotate(-12deg)" }, "& > *": { position: "relative", zIndex: 1 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Box sx={{ width: 42, height: 25, display: "grid", placeItems: "center", borderRadius: 1, backgroundColor: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.2)" }}>
                        {card.brand === "mastercard" ? (
                          <Box sx={{ position: "relative", width: 25, height: 14 }}>
                            <Box sx={{ position: "absolute", left: 1, width: 14, height: 14, borderRadius: "50%", backgroundColor: "#ef3e44" }} />
                            <Box sx={{ position: "absolute", right: 1, width: 14, height: 14, borderRadius: "50%", backgroundColor: "#ffbf2f", opacity: 0.95 }} />
                          </Box>
                        ) : <Typography fontSize={card.brand === "visa" ? 13 : 10} fontWeight={650} sx={{ fontStyle: card.brand === "visa" ? "italic" : "normal", letterSpacing: card.brand === "visa" ? 0.5 : 0.2 }}>{brandLabel(card.brand)}</Typography>}
                      </Box>
                      <Typography fontWeight={650} fontSize={card.brand === "visa" ? 18 : 14} sx={{ fontStyle: card.brand === "visa" ? "italic" : "normal", letterSpacing: card.brand === "visa" ? 1 : 0.3 }}>{brandLabel(card.brand)}</Typography>
                    </Stack>
                    {card.isDefault && <Chip icon={<CheckCircleRounded />} label="Default" size="small" sx={{ height: 23, color: "#f6fff9", backgroundColor: "rgba(71,217,137,.16)", border: "1px solid rgba(129,255,179,.35)", fontSize: 11, fontWeight: 600, "& .MuiChip-icon": { color: "#7df2ad", fontSize: 15 } }} />}
                  </Stack>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: "auto" }}>
                    <Box aria-label="EMV chip" sx={{ width: 48, height: 32, borderRadius: 1.15, background: "linear-gradient(135deg,#fff2b2 0%,#dfbd61 52%,#b99035 100%)", boxShadow: "inset 0 0 0 1px rgba(104,68,20,.24), inset 2px 2px 4px rgba(255,255,255,.45)", overflow: "hidden", position: "relative", backgroundImage: "linear-gradient(90deg, transparent 44%, rgba(104,68,20,.25) 45% 55%, transparent 56%), linear-gradient(0deg, transparent 42%, rgba(104,68,20,.25) 43% 57%, transparent 58%), linear-gradient(135deg,#fff2b2 0%,#dfbd61 52%,#b99035 100%)" }} />
                    <ContactlessRounded sx={{ fontSize: 24, opacity: 0.72, transform: "rotate(90deg)" }} />
                  </Stack>
                  <Typography sx={{ mt: 1.3, fontSize: { xs: 16, sm: 17 }, fontWeight: 650, letterSpacing: 2.7, fontFamily: "var(--pp-mono)", whiteSpace: "nowrap" }}>**** **** **** {card.last4 ?? "****"}</Typography>
                  <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.1 }}>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography fontSize={9} sx={{ opacity: 0.62, letterSpacing: 1.2 }}>EXPIRES</Typography>
                      <Typography fontSize={12} fontWeight={700}>{expiry(card)}</Typography>
                    </Box>
                  </Stack>
                </Box>
                <Stack direction="row" gap={1} alignItems="center" sx={{ px: 1.6, py: 0.6, minHeight: 46 }}>
                  <Stack direction="row" gap={0.7} alignItems="center">
                    {card.isDefault ? <CheckCircleRounded sx={{ fontSize: 16, color: "#1fa463" }} /> : <ShieldRounded sx={{ fontSize: 16, color: "#9ba6b8" }} />}
                    <Typography fontSize={12} fontWeight={500} color={card.isDefault ? "#256b4a" : "#667085"}>{card.isDefault ? "Default payment method" : "Securely stored card"}</Typography>
                  </Stack>
                  {!card.isDefault && (
                    <Button size="small" startIcon={<StarRounded />} disabled={Boolean(busy)} onClick={() => act(`default-${card.id}`, () => billingApi.savePaymentMethod(projectId, card.id), `Renewals will now be charged to •••• ${card.last4}.`)} sx={{ textTransform: "none" }}>
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
                        sx={{ color: card.isDefault ? "#b7bfcc" : "#a5aec1", opacity: card.isDefault ? 0.7 : 1, "&:hover": { color: "#dc6262", backgroundColor: "rgba(220,98,98,.08)" } }}
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

      <Dialog open={Boolean(removing)} onClose={() => setRemoving(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2.5 } }}>
        <DialogTitle>Remove card •••• {removing?.last4}?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" fontSize={14}>The card is removed from Stripe and can no longer be charged. Your default card is not affected.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setRemoving(null)} sx={{ textTransform: "none" }}>Keep card</Button>
          <Button color="error" variant="contained" disabled={Boolean(busy)} sx={{ textTransform: "none" }}
            onClick={async () => { const card = removing!; setRemoving(null); await act("remove", () => billingApi.removePaymentMethod(projectId, card.id), `Card •••• ${card.last4} removed.`); }}>
            Remove card
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
