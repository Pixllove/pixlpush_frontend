"use client";

import { useState } from "react";
import { EditRounded, InfoOutlined } from "@mui/icons-material";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

/** Membership rules for one external segment: the exact products and signals that decide who is in. */
export type Membership = {
  products: string[];
  signals: string[];
  userTypes: string[];
};

/**
 * Signals a rule can use, as the webhook sends them, and the subscription state each stands for.
 * Must match the backend (billing-events.ts and the EntitlementState enum).
 */
export const MEMBERSHIP_SIGNALS: {
  value: string;
  state: string;
  kind: "event" | "state";
}[] = [
  { value: "purchase", state: "active", kind: "event" },
  { value: "one_time_purchase", state: "active", kind: "event" },
  { value: "subscription_started", state: "active", kind: "event" },
  { value: "subscription_renewed", state: "active", kind: "event" },
  { value: "trial_converted", state: "active", kind: "event" },
  { value: "subscription_product_changed", state: "active", kind: "event" },
  { value: "subscription_upgraded", state: "active", kind: "event" },
  { value: "subscription_downgraded", state: "active", kind: "event" },
  { value: "subscription_renew_restored", state: "restored", kind: "event" },
  { value: "trial_started", state: "trialing", kind: "event" },
  {
    value: "subscription_canceled",
    state: "cancellation_scheduled",
    kind: "event",
  },
  { value: "trial_canceled", state: "cancellation_scheduled", kind: "event" },
  {
    value: "subscription_billing_retry",
    state: "billing_retry",
    kind: "event",
  },
  { value: "subscription_expired", state: "expired", kind: "event" },
  { value: "trial_expired", state: "expired", kind: "event" },
  { value: "subscription_refunded", state: "refunded", kind: "event" },
  { value: "subscription_revoked", state: "revoked", kind: "event" },
  { value: "active", state: "active", kind: "state" },
  { value: "trialing", state: "trialing", kind: "state" },
  { value: "grace_period", state: "grace_period", kind: "state" },
  { value: "billing_retry", state: "billing_retry", kind: "state" },
  {
    value: "cancellation_scheduled",
    state: "cancellation_scheduled",
    kind: "state",
  },
  { value: "restored", state: "restored", kind: "state" },
  { value: "expired", state: "expired", kind: "state" },
  { value: "refunded", state: "refunded", kind: "state" },
  { value: "revoked", state: "revoked", kind: "state" },
];
const SIGNAL = new Map(MEMBERSHIP_SIGNALS.map((item) => [item.value, item]));

const PERIOD_LABEL: Record<string, string> = {
  weekly: "Weekly subscription",
  monthly: "Monthly subscription",
  quarterly: "Quarterly subscription",
  yearly: "Yearly subscription",
  one_time: "One-time payment",
};

const STATE_LABEL: Record<string, string> = {
  active: "active",
  restored: "restored",
  trialing: "in trial",
  grace_period: "in grace period",
  billing_retry: "in billing retry",
  cancellation_scheduled: "cancelled (access until period end)",
  expired: "expired",
  refunded: "refunded",
  revoked: "revoked",
};

/** The subscription states a rule accepts; an active rule also accepts restored, as the backend does. */
export function membershipStates(signals: string[]): string[] {
  const states = new Set(
    signals
      .map((signal) => SIGNAL.get(signal)?.state)
      .filter((s): s is string => Boolean(s)),
  );
  if (states.has("active")) states.add("restored");
  return [...states];
}

/** Problems that block saving this row. Mirrors the backend's checks. */
export function membershipIssues(membership: Membership): string[] {
  const issues: string[] = [];
  if (!membership.products.length) issues.push("Choose at least one product.");
  if (!membership.signals.length)
    issues.push("Choose at least one event or state.");
  const unknown = membership.signals.filter((signal) => !SIGNAL.has(signal));
  if (unknown.length)
    issues.push(`Unknown event or state: ${unknown.join(", ")}.`);
  return issues;
}

const chipSx = {
  bgcolor: "var(--pp-primary-soft, rgba(91, 33, 182, 0.08))",
  fontFamily: "var(--pp-mono)",
} as const;

function ChipField({
  label,
  value,
  options,
  freeSolo,
  disabled,
  placeholder,
  describe,
  onChange,
}: {
  /** Optional hint after an option, e.g. "Monthly" or "One-time". */
  describe?: (option: string) => string | null | undefined;
  label: string;
  value: string[];
  options: string[];
  freeSolo?: boolean;
  disabled?: boolean;
  placeholder: string;
  onChange: (value: string[]) => void;
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      gap={{ xs: 0.5, sm: 1 }}
      alignItems={{ sm: "center" }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ width: { sm: 80 }, flexShrink: 0 }}
      >
        {label}
      </Typography>
      <Autocomplete
        multiple
        size="small"
        freeSolo={freeSolo}
        autoHighlight={!freeSolo}
        // Exact and prefix matches first, so typing "billing_retry" never picks "subscription_billing_retry".
        filterOptions={(items, { inputValue }) => {
          const query = inputValue.trim().toLowerCase();
          const rank = (item: string) =>
            item === query ? 0 : item.startsWith(query) ? 1 : 2;
          return items
            .filter((item) => item.toLowerCase().includes(query))
            .sort((a, b) => rank(a) - rank(b));
        }}
        options={options}
        value={value}
        disabled={disabled}
        filterSelectedOptions
        limitTags={2}
        getLimitTagsText={(more) => `+${more}`}
        onChange={(_, next) =>
          onChange([
            ...new Set(next.map((item) => item.trim()).filter(Boolean)),
          ])
        }
        renderOption={(props, option) => {
          const { key, ...rest } = props as typeof props & { key: string };
          const hint = describe?.(option);
          return (
            <li key={key} {...rest}>
              {option}
              {hint ? <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>{hint}</Typography> : null}
            </li>
          );
        }}
        renderTags={(items, getTagProps) =>
          items.map((item, index) => {
            const { key, ...props } = getTagProps({ index });
            return (
              <Chip
                key={key}
                size="small"
                label={item}
                sx={chipSx}
                {...props}
              />
            );
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={value.length ? undefined : placeholder}
            inputProps={{ ...params.inputProps, "aria-label": label }}
            sx={{
              "& .MuiInputBase-root": { minHeight: 34, py: "2px !important" },
              "& .MuiAutocomplete-tag": { my: "1px" },
            }}
          />
        )}
        sx={{ flex: 1, minWidth: 0 }}
      />
    </Stack>
  );
}

/** Third column of a 3.1 row: membership rules on subscription data, with a suggestion from the webhook sample. */
export function MembershipEditor({
  segmentName,
  membership,
  products,
  observedSignals = [],
  productPeriods = {},
  userTypes = [],
  suggestion,
  disabled,
  onChange,
}: {
  segmentName: string;
  membership: Membership | undefined;
  /** Product ids seen in the webhook sample. */
  products: string[];
  /** Each product's billing period, sent by the server or detected (weekly … yearly, one_time). */
  productPeriods?: Record<string, string | null>;
  /** Subscription events seen in the sample; listed first. */
  observedSignals?: string[];
  /** user_type values seen in the sample. */
  userTypes?: string[];
  /** Proposed from the sample; applied only when the customer clicks "Use suggestion". */
  suggestion?: (Membership & { note: string }) | null;
  disabled?: boolean;
  onChange: (membership: Membership | undefined) => void;
}) {
  const usable =
    suggestion && suggestion.products.length && suggestion.signals.length
      ? suggestion
      : null;
  // No saved rule yet: prefill from the webhook sample; it is saved when the customer publishes.
  const rule =
    membership ??
    (usable
      ? {
          products: usable.products,
          signals: usable.signals,
          userTypes: usable.userTypes,
        }
      : { products: [], signals: [], userTypes: [] });
  // An emptied rule is dropped, so the row saves without membership rules.
  const update = (next: Membership) =>
    onChange(
      next.products.length || next.signals.length || next.userTypes.length
        ? next
        : undefined,
    );
  const issues = membership ? membershipIssues(membership) : [];
  const states = membershipStates(rule.signals);
  const signalOptions = [
    ...observedSignals.filter((value) => SIGNAL.has(value)),
    ...MEMBERSHIP_SIGNALS.map((item) => item.value).filter(
      (value) => !observedSignals.includes(value),
    ),
  ];
  return (
    <Stack
      gap={0.75}
      sx={{
        position: "relative",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 1,
        pr: 4,
        minWidth: 0,
        bgcolor: "background.paper",
      }}
      aria-label={`${segmentName} membership rules`}
    >
      <ChipField
        label="Product"
        value={rule.products}
        options={products}
        freeSolo
        disabled={disabled}
        placeholder={
          products.length ? "Choose a product id" : "e.g. premium_monthly"
        }
        describe={(product) => PERIOD_LABEL[productPeriods[product] ?? ""] ?? null}
        onChange={(next) => update({ ...rule, products: next })}
      />
      <ChipField
        label="Event / data"
        value={rule.signals}
        options={signalOptions}
        disabled={disabled}
        placeholder="e.g. subscription_renewed"
        onChange={(next) => update({ ...rule, signals: next })}
      />
      <ChipField
        label="User type"
        value={rule.userTypes}
        options={userTypes}
        freeSolo
        disabled={disabled}
        placeholder="Any"
        onChange={(next) => update({ ...rule, userTypes: next })}
      />
      {states.length > 0 && rule.products.length > 0 && (
        <Tooltip
          arrow
          title={
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              <li>
                <b>Enters and stays</b> while a {rule.products.join(" or ")}{" "}
                subscription is{" "}
                {states.map((s) => STATE_LABEL[s] ?? s).join(", ")}
                {rule.userTypes.length
                  ? ` and user type is ${rule.userTypes.join(" or ")}`
                  : ""}
                .
              </li>
              <li>
                <b>Exits</b> on any other state for that product, or when the
                user type no longer matches.
              </li>
              <li>Other products never change this segment.</li>
            </Box>
          }
        >
          <IconButton
            size="small"
            aria-label="How membership works"
            sx={{ position: "absolute", top: 4, right: 4 }}
          >
            <InfoOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {issues.map((issue) => (
        <Alert key={issue} severity="warning" sx={{ py: 0 }}>
          {issue}
        </Alert>
      ))}
    </Stack>
  );
}

const CUSTOM = "__custom__";

/**
 * Second column: associate a predefined lifecycle segment, or create a custom one and
 * rename it inline with the pencil. No free text in the predefined list.
 */
export function LifecyclePicker({
  value,
  predefined,
  suggested,
  defaultCustomName,
  disabled,
  onChange,
}: {
  value: string | undefined;
  predefined: string[];
  suggested?: string;
  defaultCustomName: string;
  disabled?: boolean;
  onChange: (value: string | undefined) => void;
}) {
  const custom = Boolean(value) && !predefined.includes(value!);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const commit = () => {
    const name = draft.trim();
    if (name) onChange(name);
    setEditing(false);
  };
  const caption = (
    <Typography
      variant="caption"
      color="text.secondary"
      component="p"
      sx={{ mb: 0.5 }}
    >
      PixlPush lifecycle segment
    </Typography>
  );
  if (custom) {
    return (
      <Box sx={{ minWidth: 0 }}>
        {caption}
        <Stack
          direction="row"
          gap={0.75}
          alignItems="center"
          sx={{ minWidth: 0 }}
        >
          {editing ? (
            <TextField
              size="small"
              autoFocus
              label="Custom lifecycle segment"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === "Enter") commit();
                if (event.key === "Escape") setEditing(false);
              }}
              inputProps={{ maxLength: 120 }}
              sx={{ flex: 1, minWidth: 0 }}
            />
          ) : (
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                px: 1.5,
                py: 0.75,
                borderRadius: 1.5,
                bgcolor: "var(--pp-primary-soft, rgba(91, 33, 182, 0.08))",
              }}
            >
              <Typography variant="body2" noWrap title={value}>
                {value}
              </Typography>
            </Box>
          )}
          <IconButton
            size="small"
            color="primary"
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1.5,
            }}
            aria-label={`Rename ${value}`}
            disabled={disabled}
            onClick={() => {
              setDraft(value ?? "");
              setEditing(true);
            }}
          >
            <EditRounded fontSize="small" />
          </IconButton>
          <Button
            size="small"
            disabled={disabled}
            onClick={() => onChange(undefined)}
          >
            Change
          </Button>
        </Stack>
      </Box>
    );
  }
  return (
    <Box sx={{ minWidth: 0 }}>
      {caption}
      <TextField
        select
        size="small"
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => {
          const next = event.target.value;
          if (next === CUSTOM) {
            setDraft(defaultCustomName);
            onChange(defaultCustomName);
            setEditing(true);
            return;
          }
          onChange(next || undefined);
        }}
        SelectProps={{ displayEmpty: true }}
        inputProps={{ "aria-label": "PixlPush lifecycle segment" }}
        sx={{ width: "100%", minWidth: 0 }}
      >
        <MenuItem value="">
          <Typography component="span" color="text.secondary">
            Not associated
          </Typography>
        </MenuItem>
        {predefined.map((label) => (
          <MenuItem key={label} value={label}>
            {label}
            {label === suggested ? " (suggested)" : ""}
          </MenuItem>
        ))}
        <MenuItem
          value={CUSTOM}
          sx={{
            color: "primary.main",
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          + Create custom lifecycle segment
        </MenuItem>
      </TextField>
    </Box>
  );
}
