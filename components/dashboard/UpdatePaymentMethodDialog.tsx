"use client";

import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Skeleton, Typography } from "@mui/material";
import { LockRounded } from "@mui/icons-material";
import { billingApi } from "@/lib/projects/api";
import { billingErrorMessage } from "@/lib/billing";
import { stripeAppearance, stripePromise } from "@/lib/stripe";

/**
 * Saves a new card in the app: Stripe's Payment Element collects it (it never reaches PixlPush), a SetupIntent
 * attaches it to the project's customer, and the backend makes it the default and retries an unpaid invoice.
 */
export default function UpdatePaymentMethodDialog({ projectId, clientSecret, onClose, onSaved }: {
  projectId: string;
  /** From billingApi.setupPaymentMethod; the dialog is open while it is set. */
  clientSecret: string | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  return (
    <Dialog open={Boolean(clientSecret)} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2.5 } }}>
      <DialogTitle>Add a card</DialogTitle>
      {clientSecret && stripePromise ? (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
          <CardForm projectId={projectId} onClose={onClose} onSaved={onSaved} />
        </Elements>
      ) : (
        <DialogContent><Alert severity="warning">Payments are not available yet: the Stripe publishable key is not configured for this site.</Alert></DialogContent>
      )}
    </Dialog>
  );
}

function CardForm({ projectId, onClose, onSaved }: { projectId: string; onClose: () => void; onSaved: (message: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!stripe || !elements || saving) return;
    setSaving(true);
    setError(null);
    try {
      // Stripe confirms the card (with 3D Secure if the bank asks) and attaches it to the customer.
      const { error: setupError, setupIntent } = await stripe.confirmSetup({ elements, confirmParams: { return_url: `${window.location.origin}/dashboard/billing` }, redirect: "if_required" });
      if (setupError) {
        setError(setupError.type === "card_error" || setupError.type === "validation_error" ? setupError.message ?? "This card could not be saved." : "This card could not be saved. Please try again.");
        return;
      }
      const methodId = typeof setupIntent?.payment_method === "string" ? setupIntent.payment_method : setupIntent?.payment_method?.id;
      if (!methodId) { setError("This card could not be saved. Please try again."); return; }
      const result = await billingApi.savePaymentMethod(projectId, methodId);
      onSaved(result.retriedInvoice === "failed"
        ? "Card saved, but the unpaid invoice could not be charged to it. Try another card."
        : result.retriedInvoice === "paid" ? "Card saved and the unpaid invoice has been paid." : "Your payment method has been updated.");
    } catch (failure) {
      setError(billingErrorMessage(failure, "This card could not be saved. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DialogContent>
        <Typography color="text.secondary" fontSize={12} sx={{ mb: 2 }}>Renewals and any unpaid invoice are charged to this card. Card details go directly to Stripe.</Typography>
        {!ready && <Skeleton variant="rounded" height={150} />}
        <PaymentElement options={{ layout: "tabs" }} onReady={() => setReady(true)} />
        {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 1.5 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: "none" }}>Cancel</Button>
        <Button variant="contained" startIcon={<LockRounded />} disabled={!stripe || !ready || saving} onClick={save} sx={{ textTransform: "none" }}>
          {saving ? "Saving…" : "Save card"}
        </Button>
      </DialogActions>
    </>
  );
}
