"use client";

import { ArrowForwardRounded, CheckCircleRounded, CheckRounded, CloseRounded, LockRounded, ReplayRounded, RefreshRounded, SearchRounded, WarningAmberRounded } from "@mui/icons-material";
import { Alert, Box, Button, ButtonBase, Checkbox, FormControlLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import { Fragment, useEffect, useMemo, useState } from "react";
import { normalizeOnboardingUrl, onboardingUrlError } from "@/lib/onboarding";
import type { AiInteraction, AiInteractionAction, AiInteractionField } from "@/lib/projects/ai";
import { domainFromEmail } from "@/components/dashboard/sending-domains/AddDomainDialog";
import OnboardingCommonStep, { type CommonOnboardingStepKind } from "@/components/onboarding/OnboardingCommonStep";
import OnboardingStepExperience, { type DeveloperInstructionsInput } from "@/components/onboarding/OnboardingStepExperience";
import { channelOptions, platformOptions } from "@/components/onboarding/onboardingStepConfig";
import { toggleProjectPlatform } from "@/lib/project-platforms";
import type { ProjectPlatform } from "@/types/project";

export type OnboardingLinkCheckResult = { androidAppUrl: string | null; iosAppUrl: string | null };

type InteractionRendererProps = {
  interaction: AiInteraction;
  onSubmit: (fields: Record<string, unknown>, action?: AiInteractionAction) => void;
  onCancel?: () => void;
  onRetry?: () => void;
  onReload?: () => void;
  onSecureAction?: (action: { label: string; href?: string }) => void;
  onCheckLinks?: (websiteUrl: string) => Promise<OnboardingLinkCheckResult>;
  onVerifyDomain?: (values: { senderEmail: string; domain: string }) => Promise<void>;
  onOpenFirebase?: () => void;
  onOpenApns?: () => void;
  onRequestSdk?: () => void;
  onSendDeveloperInstructions?: (input: DeveloperInstructionsInput) => Promise<{ sent: boolean }>;
  firebaseConnected?: boolean;
  apnsConnected?: boolean;
  busy?: boolean;
  error?: string | null;
};

function initialValue(field: AiInteractionField, data: Record<string, unknown>) {
  if (data[field.key] !== undefined) return data[field.key];
  if (field.key === "schedule") return { frequency: "once", date: null, time: "", weekdays: [], monthlyDay: null };
  if (field.key === "frequencyCap") return {};
  if (field.key === "quietHours") return { enabled: false, start: "", end: "" };
  if (field.type === "json") return "";
  return field.type === "choice" && ["platforms", "channels"].includes(field.key) ? [] : "";
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function currentStepFields(interaction: AiInteraction): AiInteractionField[] {
  const definition = recordValue(interaction.data?.flowDefinition);
  const steps = Array.isArray(definition.steps) ? definition.steps : [];
  const definitionStep = recordValue(steps[interaction.step - 1]);
  const definitionFields = Array.isArray(definitionStep.fields)
    ? definitionStep.fields.filter((field): field is AiInteractionField => Boolean(field && typeof field === "object" && typeof (field as { key?: unknown }).key === "string"))
    : [];

  // The normalized backend `fields` value is authoritative. The definition is
  // only used as a safe fallback for older responses that persisted all flow
  // fields or omitted the current step fields.
  if (!definitionFields.length) return interaction.fields;
  const definitionKeys = new Set(definitionFields.map((field) => field.key));
  const backendFields = interaction.fields.filter((field) => definitionKeys.has(field.key));
  return backendFields.length === definitionFields.length ? backendFields : definitionFields;
}

function backendValue(interaction: AiInteraction, field: AiInteractionField): { found: boolean; value?: unknown } {
  const data = interaction.data ?? {};
  const submitted = recordValue(data.submittedValues);
  const returned = recordValue(data.values);
  const onboarding = recordValue(data.onboarding);
  for (const source of [returned, submitted, onboarding, data]) {
    if (Object.prototype.hasOwnProperty.call(source, field.key)) return { found: true, value: source[field.key] };
  }
  return { found: false };
}

function isPrimaryAction(action: AiInteractionAction) {
  const value = action.toLowerCase();
  return /submit|continue|confirm|approve|save|next/.test(value);
}

function isDeferAction(action: AiInteractionAction) {
  return ["defer", "skip", "skip_step"].includes(action.toLowerCase());
}

function isResumeAction(action: AiInteractionAction) {
  return ["resume", "review", "review_deferred", "review_deferred_steps"].includes(action.toLowerCase());
}

function actionLabel(action: AiInteractionAction) {
  if (action === "preview") return "Preview";
  if (action === "edit") return "Edit";
  if (action === "next") return "Continue";
  if (isDeferAction(action)) return "Continue";
  return "Save";
}

function deferredStepsFrom(interaction: AiInteraction, onboardingData: Record<string, unknown>) {
  const candidates = [interaction.data.deferredSteps, onboardingData.deferredSteps, interaction.data.deferred, onboardingData.deferred];
  return candidates.find((value): value is unknown[] => Array.isArray(value)) ?? [];
}

function fieldIsSecure(field: AiInteractionField) {
  return field.type === "secure_upload" || field.sensitive || /credential|secret|service.?account|firebase/i.test(field.key);
}

function onboardingUrlLabel(key: string) {
  return key === "websiteUrl" ? "Website URL" : key === "androidAppUrl" ? "Android app link" : "iOS app link";
}

function isOnboardingUrlField(field: AiInteractionField) {
  return ["websiteUrl", "androidAppUrl", "iosAppUrl"].includes(field.key);
}

function onboardingProductsError(fields: AiInteractionField[], values: Record<string, unknown>, force = false) {
  if (!force && !fields.some((field) => field.key === "platforms")) return null;
  const platforms = Array.isArray(values.platforms) ? values.platforms.map(String) : [];
  if (platforms.includes("web") && !String(values.websiteUrl ?? "").trim()) return "Add a website URL for the selected Website product.";
  if (platforms.includes("mobile") && !String(values.androidAppUrl ?? "").trim() && !String(values.iosAppUrl ?? "").trim()) return "Add an Android or iOS app link for the selected Mobile App product.";
  return null;
}

const structuredJsonKeys = new Set(["audience", "analysis", "steps", "delays", "branches", "exitCriteria", "successMetrics", "filters"]);

function jsonText(value: unknown) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "string") return value;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

function StructuredJsonControl({ field, value, onChange, disabled }: { field: AiInteractionField; value: unknown; onChange: (value: unknown) => void; disabled?: boolean }) {
  const [text, setText] = useState(() => jsonText(value));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setText(jsonText(value));
    if (typeof value !== "string" || !value.trim()) setError(null);
  }, [value]);
  const handleChange = (nextText: string) => {
    setText(nextText);
    if (!nextText.trim()) {
      setError(null);
      onChange("");
      return;
    }
    try {
      const parsed: unknown = JSON.parse(nextText);
      if (!parsed || typeof parsed !== "object") throw new Error("Enter a JSON object or array.");
      setError(null);
      onChange(parsed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enter valid JSON.");
      // Keep the raw text locally in the parent state so it is not silently
      // changed into a stringified payload. Submission is blocked until it is
      // valid, and valid JSON is always sent as an object/array.
      onChange(nextText);
    }
  };
  return <TextField fullWidth multiline minRows={3} label={field.label} value={text} disabled={disabled} onChange={(event) => handleChange(event.target.value)} required={field.required} error={Boolean(error)} helperText={error ?? (field.key === "audience" ? "Use a JSON object or array describing the audience." : "Use a JSON object or array.")} />;
}

type ScheduleValue = {
  frequency?: "once" | "daily" | "weekly" | "monthly";
  date?: string | null;
  time?: string;
  weekdays?: number[];
  monthlyDay?: number | null;
};

function ScheduleControl({ value, onChange, disabled }: { value: unknown; onChange: (value: unknown) => void; disabled?: boolean }) {
  const schedule = { frequency: "once", date: null, time: "", weekdays: [], monthlyDay: null, ...recordValue(value) } as ScheduleValue;
  const patch = (next: Partial<ScheduleValue>) => onChange({ ...schedule, ...next });
  const frequency = schedule.frequency ?? "once";
  const weekdays = Array.isArray(schedule.weekdays) ? schedule.weekdays : [];
  const toggleWeekday = (day: number) => patch({ weekdays: weekdays.includes(day) ? weekdays.filter((item) => item !== day) : [...weekdays, day].sort((a, b) => a - b) });
  return <Stack gap={1} sx={{ p: 1.2, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
    <Typography fontSize="var(--fs-12)" fontWeight={700}>Schedule</Typography>
    <TextField select fullWidth label="Frequency" value={frequency} disabled={disabled} onChange={(event) => patch({ frequency: event.target.value as ScheduleValue["frequency"], date: event.target.value === "once" ? schedule.date ?? null : null, weekdays: event.target.value === "weekly" ? weekdays : [], monthlyDay: event.target.value === "monthly" ? schedule.monthlyDay ?? null : null })}>
      {(["once", "daily", "weekly", "monthly"] as const).map((option) => <MenuItem key={option} value={option}>{option[0].toUpperCase() + option.slice(1)}</MenuItem>)}
    </TextField>
    {frequency === "once" ? <TextField fullWidth type="date" label="Date" InputLabelProps={{ shrink: true }} value={String(schedule.date ?? "")} disabled={disabled} onChange={(event) => patch({ date: event.target.value || null })} /> : null}
    <TextField fullWidth type="time" label="Time" InputLabelProps={{ shrink: true }} value={schedule.time ?? ""} disabled={disabled} onChange={(event) => patch({ time: event.target.value })} />
    {frequency === "weekly" ? <Box><Typography fontSize="var(--fs-11)" color="text.secondary" sx={{ mb: .35 }}>Weekdays</Typography><Stack direction="row" gap={.4} flexWrap="wrap">{[0, 1, 2, 3, 4, 5, 6].map((day) => <FormControlLabel key={day} control={<Checkbox size="small" checked={weekdays.includes(day)} disabled={disabled} onChange={() => toggleWeekday(day)} />} label={<Typography fontSize="var(--fs-11)">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]}</Typography>} />)}</Stack></Box> : null}
    {frequency === "monthly" ? <TextField fullWidth type="number" label="Monthly day" inputProps={{ min: 1, max: 31 }} value={schedule.monthlyDay ?? ""} disabled={disabled} onChange={(event) => patch({ monthlyDay: event.target.value ? Number(event.target.value) : null })} /> : null}
  </Stack>;
}

function FrequencyCapControl({ value, onChange, disabled }: { value: unknown; onChange: (value: unknown) => void; disabled?: boolean }) {
  const current = recordValue(value);
  return <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
    <TextField fullWidth type="number" label="Frequency cap" inputProps={{ min: 1 }} value={String(current.max ?? "")} disabled={disabled} onChange={(event) => onChange({ ...current, max: event.target.value ? Number(event.target.value) : "" })} />
    <TextField select fullWidth label="Cap period" value={String(current.period ?? "day")} disabled={disabled} onChange={(event) => onChange({ ...current, period: event.target.value })}>{["hour", "day", "week", "month"].map((period) => <MenuItem key={period} value={period}>{period}</MenuItem>)}</TextField>
  </Stack>;
}

function QuietHoursControl({ value, onChange, disabled }: { value: unknown; onChange: (value: unknown) => void; disabled?: boolean }) {
  const current = { enabled: false, start: "", end: "", ...recordValue(value) };
  return <Stack gap={.8}>
    <FormControlLabel control={<Checkbox checked={Boolean(current.enabled)} disabled={disabled} onChange={(event) => onChange({ ...current, enabled: event.target.checked })} />} label="Quiet hours" />
    {current.enabled ? <Stack direction={{ xs: "column", sm: "row" }} gap={1}><TextField fullWidth type="time" label="Quiet hours start" InputLabelProps={{ shrink: true }} value={String(current.start ?? "")} disabled={disabled} onChange={(event) => onChange({ ...current, start: event.target.value })} /><TextField fullWidth type="time" label="Quiet hours end" InputLabelProps={{ shrink: true }} value={String(current.end ?? "")} disabled={disabled} onChange={(event) => onChange({ ...current, end: event.target.value })} /></Stack> : null}
  </Stack>;
}

function InteractionFieldControl({ field, value, onChange, disabled, error, onBlur, allValues }: { field: AiInteractionField; value: unknown; onChange: (value: unknown) => void; disabled?: boolean; error?: string; onBlur?: () => void; allValues?: Record<string, unknown> }) {
  const type = field.type.toLowerCase();
  if (fieldIsSecure(field)) return <Box sx={{ p: 1.2, border: "1px solid rgba(89, 57, 111, .14)", borderRadius: 1.5, bgcolor: "rgba(89, 57, 111, .04)" }}><Stack direction="row" gap={1} alignItems="center"><LockRounded fontSize="small" color="action" /><Box><Typography fontSize="var(--fs-12)" fontWeight={700}>{field.label}</Typography><Typography fontSize="var(--fs-11)" color="text.secondary">This value is collected only in the protected PixlPush setup screen.</Typography></Box></Stack></Box>;
  if (isOnboardingUrlField(field)) return <TextField fullWidth type="text" inputMode="url" label={field.label} value={String(value ?? "")} disabled={disabled} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} required={field.required} error={Boolean(error)} helperText={error ?? "Enter example.com, www.example.com, a full http(s) URL, or a Markdown link."} />;
  if (field.key === "schedule") return <ScheduleControl value={value} onChange={onChange} disabled={disabled} />;
  if (field.key === "frequencyCap") return <FrequencyCapControl value={value} onChange={onChange} disabled={disabled} />;
  if (field.key === "quietHours") return <QuietHoursControl value={value} onChange={onChange} disabled={disabled} />;
  if (type === "json" && structuredJsonKeys.has(field.key)) return <StructuredJsonControl field={field} value={value} onChange={onChange} disabled={disabled} />;
  if (type === "checkbox" || type === "boolean") return <FormControlLabel control={<Checkbox checked={Boolean(value)} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />} label={field.label} />;
  if (field.key === "platforms" || field.key === "channels") {
    const selected = Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];
    const options = field.key === "platforms"
      ? platformOptions
      : channelOptions.filter((option) => !option.platform || (Array.isArray(allValues?.platforms) && allValues.platforms.includes(option.platform)));
    return <Box><Typography className="guided-flow-question">{field.label}{field.required ? " *" : ""}</Typography><Stack gap={.65}>{options.map((option) => { const isSelected = selected.includes(option.id); const Icon = option.icon; return <ButtonBase key={option.id} disabled={disabled} className={`guided-flow-choice ${isSelected ? "is-selected" : ""}`} onClick={() => onChange(isSelected ? selected.filter((item) => item !== option.id) : [...selected, option.id])}><span className="guided-choice-check">{isSelected && <CheckRounded />}</span><Icon fontSize="small" /><Box className="guided-choice-copy"><Typography>{option.title}</Typography><Typography fontSize="var(--fs-11)" color="text.secondary">{option.detail}</Typography></Box></ButtonBase>; })}</Stack></Box>;
  }
  if (["select", "dropdown", "timezone"].includes(type)) return <TextField select={type !== "timezone"} fullWidth label={field.label} value={String(value ?? "")} disabled={disabled} onChange={(event) => onChange(event.target.value)} required={field.required}>{type !== "timezone" ? (field.options ?? []).map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>) : null}</TextField>;
  if (["radio", "choice"].includes(type)) {
    const multiple = ["platforms", "channels"].includes(field.key);
    const selected = Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];
    return <Box><Typography className="guided-flow-question">{field.label}{field.required ? " *" : ""}</Typography><Stack gap={.65}>{(field.options ?? []).map((option) => { const isSelected = selected.includes(option); return <ButtonBase key={option} disabled={disabled} className={`guided-flow-choice ${isSelected ? "is-selected" : ""}`} onClick={() => onChange(multiple ? isSelected ? selected.filter((item) => item !== option) : [...selected, option] : option)}><span className="guided-choice-check">{isSelected && <CheckRounded />}</span><Box className="guided-choice-copy"><Typography>{option}</Typography></Box></ButtonBase>; })}</Stack></Box>;
  }
  return <TextField fullWidth multiline={type === "json" || type === "textarea" || type === "text_area"} minRows={type === "json" || type === "textarea" || type === "text_area" ? 3 : undefined} type={["date", "number", "url", "time"].includes(type) ? type : "text"} label={field.label} value={String(value ?? "")} disabled={disabled} onChange={(event) => onChange(event.target.value)} required={field.required} helperText={field.key === "projectName" ? "You can change this any time." : undefined} />;
}

function SafeInteractionData({ data }: { data: Record<string, unknown> }) {
  const recommendation = data.recommendation && typeof data.recommendation === "object" ? data.recommendation as Record<string, unknown> : null;
  const findings = Array.isArray(data.findings) ? data.findings.filter((value): value is string => typeof value === "string") : [];
  const recommendations = Array.isArray(data.recommendations) ? data.recommendations.filter((value): value is string => typeof value === "string") : [];
  const missingData = Array.isArray(data.missingData) ? data.missingData.filter((value): value is string => typeof value === "string") : [];
  const evidence = Array.isArray(data.evidence) ? data.evidence.filter((value): value is { label: string; value: string; source?: string } => Boolean(value && typeof value === "object" && typeof (value as { label?: unknown }).label === "string" && typeof (value as { value?: unknown }).value === "string")) : [];
  const createdResources = Array.isArray(data.createdResources) ? data.createdResources.filter((value): value is { id: string; name: string; href?: string; status?: string } => Boolean(value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string" && typeof (value as { name?: unknown }).name === "string")) : [];
  const result = recordValue(data.result);
  const analysis = recordValue(data.analysis);
  const resultSummary = typeof result.summary === "string" ? result.summary : typeof result.message === "string" ? result.message : typeof analysis.elevatorPitch === "string" ? analysis.elevatorPitch : typeof analysis.coreProductOrService === "string" ? analysis.coreProductOrService : null;
  const hasAnalysis = Object.keys(analysis).length > 0;
  if (!recommendation && !findings.length && !recommendations.length && !missingData.length && !evidence.length && !data.confidence && !createdResources.length && !resultSummary && !hasAnalysis) return null;
  return <Stack gap={1} sx={{ mt: 1.5 }}>
    {createdResources.length ? <Box><Typography fontWeight={700} fontSize="var(--fs-12)">Draft created</Typography><Stack gap={.25}>{createdResources.map((resource) => <Typography key={resource.id} fontSize="var(--fs-12)">{resource.href ? <a href={resource.href}>{resource.name}</a> : resource.name} <Typography component="span" fontSize="var(--fs-11)" color="text.secondary">(editable draft)</Typography></Typography>)}</Stack><Typography fontSize="var(--fs-11)" color="text.secondary">Nothing was sent, scheduled, or activated.</Typography></Box> : null}
    {hasAnalysis || resultSummary ? <Box><Typography fontWeight={700} fontSize="var(--fs-12)">Analysis result</Typography>{resultSummary ? <Typography fontSize="var(--fs-12)">{resultSummary}</Typography> : <Typography fontSize="var(--fs-12)">The analysis is ready for review.</Typography>}{typeof analysis.businessModel === "object" && analysis.businessModel ? <Typography fontSize="var(--fs-11)" color="text.secondary">Business model: {String((analysis.businessModel as Record<string, unknown>).classification ?? "—")}</Typography> : null}{typeof analysis.businessStage === "object" && analysis.businessStage ? <Typography fontSize="var(--fs-11)" color="text.secondary">Business stage: {String((analysis.businessStage as Record<string, unknown>).classification ?? "—")}</Typography> : null}</Box> : null}
    {recommendation ? <Box><Typography fontWeight={700} fontSize="var(--fs-12)">Recommendation</Typography><Typography fontSize="var(--fs-12)">{typeof recommendation.reason === "string" ? recommendation.reason : typeof recommendation.recommendedType === "string" ? recommendation.recommendedType : "Ready for review."}</Typography>{Array.isArray(recommendation.suggestedMetrics) ? <Typography fontSize="var(--fs-11)" color="text.secondary">Suggested metrics: {recommendation.suggestedMetrics.filter((item): item is string => typeof item === "string").join(", ")}</Typography> : null}</Box> : null}
    {findings.length ? <Box><Typography fontWeight={700} fontSize="var(--fs-12)">Findings</Typography>{findings.map((item) => <Typography key={item} fontSize="var(--fs-12)">• {item}</Typography>)}</Box> : null}
    {evidence.length ? <Box><Typography fontWeight={700} fontSize="var(--fs-12)">Evidence</Typography>{evidence.map((item) => <Typography key={`${item.label}-${item.value}`} fontSize="var(--fs-12)">{item.label}: {item.value}{item.source ? ` · ${item.source}` : ""}</Typography>)}</Box> : null}
    {recommendations.length ? <Box><Typography fontWeight={700} fontSize="var(--fs-12)">Recommendations</Typography>{recommendations.map((item) => <Typography key={item} fontSize="var(--fs-12)">• {item}</Typography>)}</Box> : null}
    {data.confidence ? <Typography fontSize="var(--fs-12)"><strong>Confidence:</strong> {String(data.confidence)}</Typography> : null}
    {missingData.length ? <Alert severity="warning"><Typography fontSize="var(--fs-12)"><strong>Missing data:</strong> {missingData.join(", ")}</Typography></Alert> : null}
  </Stack>;
}

function InteractionFormCard({ interaction, onSubmit, onCancel, onRetry, onReload, onSecureAction, onCheckLinks, onVerifyDomain, onOpenFirebase, onOpenApns, onRequestSdk, onSendDeveloperInstructions, firebaseConnected, apnsConnected, busy, error, kind }: InteractionRendererProps & { kind: string }) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [urlErrors, setUrlErrors] = useState<Record<string, string>>({});
  const [linkCheckState, setLinkCheckState] = useState<"idle" | "checking" | "found" | "not-found" | "error">("idle");
  const [linkCheckError, setLinkCheckError] = useState("");
  const [detectedLinks, setDetectedLinks] = useState<OnboardingLinkCheckResult>({ androidAppUrl: null, iosAppUrl: null });
  const [domainVerificationBusy, setDomainVerificationBusy] = useState(false);
  const [domainVerificationError, setDomainVerificationError] = useState("");
  const fields = useMemo(() => currentStepFields(interaction), [interaction]);
  useEffect(() => {
    setUrlErrors({});
    setLinkCheckState("idle");
    setLinkCheckError("");
    setDetectedLinks({ androidAppUrl: null, iosAppUrl: null });
    setDomainVerificationError("");
    setValues((previous) => Object.fromEntries(fields.map((field) => {
      const returned = backendValue(interaction, field);
      return [field.key, returned.found ? returned.value : previous[field.key] ?? initialValue(field, interaction.data ?? {})];
    })));
  }, [fields, interaction]);
  const secureField = fields.find(fieldIsSecure);
  const currentOnboardingKind = interaction.type === "onboarding"
    ? recordValue(interaction.data?.currentStep).kind
    : undefined;
  const commonOnboardingKind = interaction.type === "onboarding" && ["basics", "products", "channels", "domain"].includes(String(currentOnboardingKind))
    ? currentOnboardingKind as CommonOnboardingStepKind
    : null;
  const onboardingExperienceKind = interaction.type === "onboarding" && ["mobile-push", "app-sdk", "web-sdk"].includes(String(currentOnboardingKind))
    ? currentOnboardingKind as "mobile-push" | "app-sdk" | "web-sdk"
    : null;
  const secureAction = secureField && (onboardingExperienceKind === "mobile-push" || (!onboardingExperienceKind && !commonOnboardingKind))
    ? {
        label: secureField.label,
        href: interaction.data.secureAction && typeof interaction.data.secureAction === "object"
          ? (interaction.data.secureAction as { href?: string }).href
          : /firebase|mobile-push/i.test(secureField.key) ? "/dashboard/settings/firebase" : "/dashboard/integrations",
      }
    : null;
  const terminal = ["completed", "cancelled", "failed", "expired"].includes(interaction.status);
  const deferAction = interaction.type === "onboarding" ? interaction.actions.find(isDeferAction) : undefined;
  const primaryAction = interaction.type === "business_analysis"
    ? interaction.step === 2 && interaction.actions.includes("analyze")
      ? "analyze"
      : interaction.step >= 3 && interaction.actions.includes("approve")
        ? "approve"
        : interaction.actions.find((action) => action !== "save_draft" && isPrimaryAction(action)) ?? interaction.actions.find(isPrimaryAction)
    : interaction.actions.find((action) => action !== "save_draft" && action !== deferAction && isPrimaryAction(action)) ?? interaction.actions.find((action) => action !== deferAction && isPrimaryAction(action));
  const saveDraftAction = interaction.actions.includes("save_draft") ? "save_draft" : undefined;
  const submitLabel = interaction.type === "approval" && primaryAction === "approve"
    ? "Approve draft"
    : interaction.type === "business_analysis" && primaryAction === "approve"
      ? "Approve analysis"
      : primaryAction === "analyze"
        ? "Analyze"
        : primaryAction === "save_draft"
          ? "Save draft"
    : primaryAction?.replace(/^(next|submit|continue|save|edit)$/i, interaction.status === "awaiting_confirmation" ? "Confirm" : "Continue")
      .replace(/^confirm$/i, "Confirm")
      ?? (interaction.status === "awaiting_confirmation" ? "Confirm" : "Continue");
  // Onboarding uses the backend's explicit defer/skip action for Continue.
  // Keep the normal submit/next action available as Save when the backend
  // exposes both actions, so completing a step retains its validation path.
  const onboardingSaveAction = deferAction
    ? interaction.actions.find((action) => action === "submit") ?? interaction.actions.find((action) => action === "next")
    : undefined;
  const submitAction = deferAction ? undefined : primaryAction;
  const secondaryActions = interaction.actions.filter((action) => ["preview", "edit", "next", "submit", "analyze"].includes(action) && action !== submitAction && action !== onboardingSaveAction && (!deferAction || !["next", "submit"].includes(action)));
  const missingRequired = useMemo(() => fields.some((field) => {
    const value = values[field.key];
    return Boolean(field.required && !fieldIsSecure(field) && (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)));
  }), [fields, values]);
  const structuredJsonError = useMemo(() => fields.find((field) => field.type.toLowerCase() === "json" && structuredJsonKeys.has(field.key) && typeof values[field.key] === "string" && String(values[field.key]).trim())?.label ?? null, [fields, values]);
  const scheduleError = useMemo(() => {
    const scheduleField = fields.find((field) => field.key === "schedule");
    if (!scheduleField) return null;
    const schedule = recordValue(values.schedule) as ScheduleValue;
    const frequency = schedule.frequency;
    if (!frequency || !["once", "daily", "weekly", "monthly"].includes(frequency)) return "Choose a schedule frequency.";
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(schedule.time ?? ""))) return "Choose a valid time in HH:mm format.";
    if (frequency === "once" && !schedule.date) return "Choose a date for a once schedule.";
    if (frequency === "weekly" && (!Array.isArray(schedule.weekdays) || schedule.weekdays.length === 0)) return "Choose at least one weekday.";
    if (frequency === "monthly" && (!Number.isInteger(schedule.monthlyDay) || Number(schedule.monthlyDay) < 1 || Number(schedule.monthlyDay) > 31)) return "Choose a monthly day from 1 to 31.";
    const timezone = values.timezone;
    if (fields.some((field) => field.key === "timezone") && typeof timezone === "string" && timezone.trim()) {
      try { Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(); } catch { return "Use a valid IANA timezone."; }
    }
    return null;
  }, [fields, values]);
  const controlsDisabled = Boolean(busy || terminal);
  const onboardingData = interaction.type === "onboarding" ? recordValue(interaction.data?.onboarding) : {};
  const interactionValues = interaction.type === "onboarding"
    ? { ...onboardingData, ...recordValue(interaction.data?.values), ...values }
    : values;
  const productError = interaction.type === "onboarding" ? onboardingProductsError(fields, interactionValues, commonOnboardingKind === "products") : null;
  const deferredSteps = interaction.type === "onboarding" ? deferredStepsFrom(interaction, onboardingData) : [];
  const stepWasDeferred = interaction.type === "onboarding" && Boolean(
    interaction.data.stepDeferred === true
      || onboardingData.stepDeferred === true
      || interaction.data.deferredStep === true
      || onboardingData.deferredStep === true,
  );
  const allRemainingDeferred = interaction.type === "onboarding" && Boolean(
    interaction.data.allRemainingStepsDeferred === true
      || onboardingData.allRemainingStepsDeferred === true
      || interaction.data.allDeferred === true
      || onboardingData.allDeferred === true
      || interaction.data.guidanceExhausted === true
      || onboardingData.guidanceExhausted === true
      || (deferredSteps.length > 0 && !interaction.data.currentStep && !onboardingData.currentStep),
  );
  const resumeAction = interaction.type === "onboarding" ? interaction.actions.find(isResumeAction) : undefined;
  const currentOnboardingStep = interaction.type === "onboarding" ? recordValue(interaction.data?.currentStep) : {};
  const isDomainStep = interaction.type === "onboarding"
    && (currentOnboardingStep.kind === "domain" || fields.some((field) => field.key === "senderEmail") && fields.some((field) => field.key === "domain"));
  const cardTitle = interaction.type === "onboarding" && typeof currentOnboardingStep.title === "string"
    ? currentOnboardingStep.title
    : interaction.title;
  const completionPercentage = typeof interaction.data?.completionPercentage === "number"
    ? interaction.data.completionPercentage
    : typeof onboardingData.completionPercentage === "number"
      ? onboardingData.completionPercentage
      : null;

  const updateField = (field: AiInteractionField, value: unknown) => {
    setValues((current) => ({ ...current, [field.key]: value }));
    if (isOnboardingUrlField(field)) setUrlErrors((current) => ({ ...current, [field.key]: "" }));
    if (field.key === "senderEmail" || field.key === "domain") setDomainVerificationError("");
    if (field.key === "websiteUrl") {
      setLinkCheckState("idle");
      setLinkCheckError("");
      setDetectedLinks({ androidAppUrl: null, iosAppUrl: null });
    }
  };

  const normalizeInteractionValues = (current: Record<string, unknown>) => {
    const normalized = { ...current };
    const nextErrors: Record<string, string> = {};
    fields.filter(isOnboardingUrlField).forEach((field) => {
      const value = String(current[field.key] ?? "");
      const fieldError = onboardingUrlError(value, onboardingUrlLabel(field.key));
      if (fieldError) nextErrors[field.key] = fieldError;
      else normalized[field.key] = normalizeOnboardingUrl(value);
    });
    if (commonOnboardingKind === "domain") normalized.domain = domainFromEmail(String(current.senderEmail ?? "")) ?? "";
    setUrlErrors(nextErrors);
    setValues(normalized);
    return { normalized, valid: Object.keys(nextErrors).length === 0 };
  };

  const submitInteraction = (action: AiInteractionAction) => {
    if (isDeferAction(action) || isResumeAction(action)) {
      onSubmit({}, action);
      return;
    }
    const prepared = normalizeInteractionValues(values);
    if (!prepared.valid) return;
    if (interaction.type === "onboarding" && onboardingProductsError(fields, prepared.normalized)) return;
    onSubmit(prepared.normalized, action);
  };

  const checkLinks = async () => {
    if (!onCheckLinks) return;
    const websiteUrl = String(values.websiteUrl ?? "");
    const fieldError = onboardingUrlError(websiteUrl, "Website URL");
    if (fieldError) {
      setUrlErrors((current) => ({ ...current, websiteUrl: fieldError }));
      setLinkCheckState("error");
      setLinkCheckError(fieldError);
      return;
    }
    const normalizedWebsiteUrl = normalizeOnboardingUrl(websiteUrl);
    setValues((current) => ({ ...current, websiteUrl: normalizedWebsiteUrl }));
    setLinkCheckState("checking");
    setLinkCheckError("");
    try {
      const result = await onCheckLinks(normalizedWebsiteUrl);
      setDetectedLinks(result);
      setValues((current) => ({
        ...current,
        ...(String(current.androidAppUrl ?? "").trim() || !result.androidAppUrl ? {} : { androidAppUrl: result.androidAppUrl }),
        ...(String(current.iosAppUrl ?? "").trim() || !result.iosAppUrl ? {} : { iosAppUrl: result.iosAppUrl }),
      }));
      setLinkCheckState(result.androidAppUrl || result.iosAppUrl ? "found" : "not-found");
    } catch (cause) {
      setDetectedLinks({ androidAppUrl: null, iosAppUrl: null });
      setLinkCheckError(cause instanceof Error ? cause.message : "We couldn’t open that website. Check the URL and try again.");
      setLinkCheckState("error");
    }
  };

  const applyDetectedLink = (field: "androidAppUrl" | "iosAppUrl") => {
    const value = detectedLinks[field];
    if (!value) return;
    setValues((current) => ({ ...current, [field]: value }));
    setUrlErrors((current) => ({ ...current, [field]: "" }));
  };

  const verifyDomain = async () => {
    if (!onVerifyDomain || !isDomainStep) return;
    const senderEmail = String(values.senderEmail ?? "").trim();
    const senderDomain = domainFromEmail(senderEmail);
    if (!senderDomain) {
      setDomainVerificationError("Enter a valid sender email, for example info@yourproduct.com.");
      return;
    }
    setDomainVerificationBusy(true);
    setDomainVerificationError("");
    try {
      await onVerifyDomain({ senderEmail, domain: senderDomain });
    } catch (cause) {
      setDomainVerificationError(cause instanceof Error ? cause.message : "The domain verification setup could not be started.");
    } finally {
      setDomainVerificationBusy(false);
    }
  };

  return <Box className="guided-flow-card ai-interaction-card" data-testid={`interaction-${kind}`}>
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
      <Box><Typography component="h2" className="guided-flow-title">{cardTitle}</Typography>{interaction.description ? <Typography className="guided-flow-subtitle">{interaction.description}</Typography> : null}</Box>
      {interaction.status === "completed" ? <CheckRounded color="success" /> : null}
    </Stack>
    {interaction.totalSteps > 0 ? <Box sx={{ mt: 1.2 }} aria-label={`Step ${interaction.step} of ${interaction.totalSteps}`}><Typography fontSize="var(--fs-11)" color="text.secondary">Step {interaction.step} of {interaction.totalSteps}</Typography><Box sx={{ display: "flex", gap: .45, mt: .55 }}>{Array.from({ length: interaction.totalSteps }, (_, index) => <Box key={index} sx={{ height: 5, flex: 1, borderRadius: 2, bgcolor: index < interaction.step ? "primary.main" : "rgba(89, 57, 111, .12)" }} />)}</Box></Box> : null}
    {interaction.type === "onboarding" && completionPercentage !== null ? <Box sx={{ mt: 1.1 }}><Stack direction="row" justifyContent="space-between" gap={1}><Typography fontSize="var(--fs-11)" color="text.secondary">Onboarding progress</Typography><Typography fontSize="var(--fs-11)" fontWeight={700}>{Math.round(Math.max(0, Math.min(100, completionPercentage)))}%</Typography></Stack><Box sx={{ height: 5, mt: .45, borderRadius: 2, bgcolor: "rgba(89, 57, 111, .12)", overflow: "hidden" }}><Box sx={{ width: `${Math.max(0, Math.min(100, completionPercentage))}%`, height: "100%", bgcolor: "success.main" }} /></Box></Box> : null}
    {error ? <Alert severity="error" sx={{ mt: 1.25 }} role="alert">{error}</Alert> : null}
    {interaction.status === "cancelled" ? <Alert severity="info" sx={{ mt: 1.25 }}>This interaction was cancelled. Its fields are no longer editable.</Alert> : null}
    {interaction.status === "expired" ? <Alert severity="warning" sx={{ mt: 1.25 }}>This interaction has expired. Reload it to get the current step.</Alert> : null}
    {interaction.type === "onboarding" && interaction.status === "completed" ? <Alert severity="success" sx={{ mt: 1.25 }}>Onboarding is complete. Your progress has been refreshed.</Alert> : null}
    {stepWasDeferred ? <Alert severity="info" sx={{ mt: 1.25 }}>This step was deferred. You can complete it later from onboarding.</Alert> : null}
    {allRemainingDeferred ? <Alert severity="info" sx={{ mt: 1.25 }}>You can resume these steps later. Your onboarding progress still reflects only completed steps.</Alert> : null}
    {interaction.type === "approval" ? <Alert severity="info" sx={{ mt: 1.25 }}>Approval records your decision only. Sending, scheduling, publishing, or activation remains a separate action.</Alert> : null}
    {scheduleError ? <Alert severity="warning" sx={{ mt: 1.25 }}>{scheduleError}</Alert> : null}
    {structuredJsonError ? <Alert severity="error" sx={{ mt: 1.25 }}>Fix the invalid JSON in {structuredJsonError} before continuing.</Alert> : null}
    {productError && !commonOnboardingKind ? <Alert severity="warning" sx={{ mt: 1.25 }}>{productError}</Alert> : null}
    {commonOnboardingKind ? <Box sx={{ mt: 1.5 }}><OnboardingCommonStep
      kind={commonOnboardingKind}
      projectName={String(values.projectName ?? recordValue(interaction.data?.values).projectName ?? onboardingData.projectName ?? interaction.data.projectName ?? "")}
      platforms={stringArray(values.platforms ?? recordValue(interaction.data?.values).platforms ?? onboardingData.platforms).filter((value): value is ProjectPlatform => value === "web" || value === "mobile")}
      websiteUrl={String(values.websiteUrl ?? recordValue(interaction.data?.values).websiteUrl ?? onboardingData.websiteUrl ?? "")}
      androidAppUrl={String(values.androidAppUrl ?? recordValue(interaction.data?.values).androidAppUrl ?? onboardingData.androidAppUrl ?? "")}
      iosAppUrl={String(values.iosAppUrl ?? recordValue(interaction.data?.values).iosAppUrl ?? onboardingData.iosAppUrl ?? "")}
      channels={stringArray(values.channels ?? recordValue(interaction.data?.values).channels ?? onboardingData.channels)}
      senderEmail={String(values.senderEmail ?? recordValue(interaction.data?.values).senderEmail ?? onboardingData.senderEmail ?? "")}
      urlErrors={urlErrors}
      productsError={productError ?? ""}
      linkCheckState={linkCheckState}
      linkCheckError={linkCheckError}
      detectedLinks={detectedLinks}
      domainVerificationBusy={domainVerificationBusy}
      domainVerificationError={domainVerificationError}
      disabled={controlsDisabled}
      onProjectNameChange={(value) => updateField({ key: "projectName", type: "text", label: "Project name" }, value)}
      onPlatformToggle={(platform) => {
        const currentPlatforms = stringArray(interactionValues.platforms) as ProjectPlatform[];
        const nextPlatforms = toggleProjectPlatform(currentPlatforms, platform);
        const nextChannels = stringArray(interactionValues.channels).filter((channel) => {
          const option = channelOptions.find((item) => item.id === channel);
          return !option?.platform || nextPlatforms.includes(option.platform);
        });
        setValues((current) => ({ ...current, platforms: nextPlatforms, channels: nextChannels }));
      }}
      onChannelToggle={(channel) => setValues((current) => {
        const currentChannels = stringArray(interactionValues.channels);
        return { ...current, channels: currentChannels.includes(channel) ? currentChannels.filter((item) => item !== channel) : [...currentChannels, channel] };
      })}
      onUrlChange={(field, value) => updateField({ key: field, type: "url", label: field }, value)}
      onUrlBlur={(field) => {
        const value = String(values[field] ?? "");
        const fieldError = onboardingUrlError(value, onboardingUrlLabel(field));
        setUrlErrors((current) => ({ ...current, [field]: fieldError || "" }));
        if (!fieldError) setValues((current) => ({ ...current, [field]: normalizeOnboardingUrl(value) }));
      }}
      onCheckLinks={() => void checkLinks()}
      onApplyDetectedLink={applyDetectedLink}
      onSenderEmailChange={(value) => {
        const domain = domainFromEmail(value) ?? "";
        setValues((current) => ({ ...current, senderEmail: value, domain }));
        setDomainVerificationError("");
      }}
      onVerifyDomain={() => void verifyDomain()}
    /></Box> : null}
    {fields.length && !onboardingExperienceKind && !commonOnboardingKind ? <Stack gap={1.2} sx={{ mt: 1.5 }}>{fields.map((field) => <Fragment key={field.key}>
      <InteractionFieldControl field={field} value={values[field.key]} allValues={{ ...recordValue(interaction.data?.values), ...values }} disabled={controlsDisabled} error={urlErrors[field.key]} onBlur={() => {
        if (!isOnboardingUrlField(field)) return;
        const value = String(values[field.key] ?? "");
        const fieldError = onboardingUrlError(value, onboardingUrlLabel(field.key));
        setUrlErrors((current) => ({ ...current, [field.key]: fieldError || "" }));
        if (!fieldError) setValues((current) => ({ ...current, [field.key]: normalizeOnboardingUrl(value) }));
      }} onChange={(value) => updateField(field, value)} />
      {isDomainStep && field.key === "domain" && onVerifyDomain ? <Stack gap={.75} alignItems="flex-start">
        <Button variant="contained" onClick={() => void verifyDomain()} disabled={controlsDisabled || domainVerificationBusy}>
          {domainVerificationBusy ? "Opening verification…" : "Verify ownership"}
        </Button>
        {domainVerificationError ? <Alert severity="error" role="alert">{domainVerificationError}</Alert> : null}
    </Stack> : null}
      {interaction.type === "onboarding" && field.key === "websiteUrl" && onCheckLinks ? <Box>
        <Button variant="outlined" size="small" startIcon={linkCheckState === "checking" ? <RefreshRounded className="onboarding-scan-icon" /> : <SearchRounded />} onClick={() => void checkLinks()} disabled={controlsDisabled || !String(values.websiteUrl ?? "").trim() || linkCheckState === "checking"}>{linkCheckState === "checking" ? "Checking links…" : "Check links"}</Button>
        {linkCheckState !== "idle" ? <Stack gap={.75} sx={{ mt: .8, p: 1, border: "1px solid", borderColor: linkCheckState === "error" ? "error.light" : linkCheckState === "found" ? "success.light" : "divider", borderRadius: 1.5 }} role="status">
          <Stack direction="row" gap={.75} alignItems="flex-start"><Box sx={{ pt: .15 }}>{linkCheckState === "found" ? <CheckCircleRounded color="success" fontSize="small" /> : <WarningAmberRounded color={linkCheckState === "error" ? "error" : "warning"} fontSize="small" />}</Box><Box><Typography fontSize="var(--fs-12)" fontWeight={700}>{linkCheckState === "checking" ? "Looking for app-store links" : linkCheckState === "found" ? "App links found" : linkCheckState === "error" ? "Couldn’t check this website" : "No app links found"}</Typography><Typography fontSize="var(--fs-11)" color="text.secondary">{linkCheckState === "checking" ? "Reading your website for Google Play and App Store links." : linkCheckState === "found" ? "Found links were added to empty fields; your existing links were kept." : linkCheckState === "error" ? `${linkCheckError} You can add the links manually below.` : "Your website does not link to Google Play or the App Store. Add the links manually below."}</Typography></Box></Stack>
          {linkCheckState === "found" && <Stack gap={.8}>
            {detectedLinks.androidAppUrl && <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} gap={1}><Box sx={{ minWidth: 0 }}><Typography fontSize="var(--fs-11)" color="text.secondary">Google Play</Typography><Typography fontSize="var(--fs-12)" sx={{ overflowWrap: "anywhere" }}>{detectedLinks.androidAppUrl}</Typography></Box><Button size="small" variant="outlined" onClick={() => applyDetectedLink("androidAppUrl")}>{String(values.androidAppUrl ?? "").trim() ? "Replace Android link" : "Use Android link"}</Button></Stack>}
            {detectedLinks.iosAppUrl && <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} gap={1}><Box sx={{ minWidth: 0 }}><Typography fontSize="var(--fs-11)" color="text.secondary">Apple App Store</Typography><Typography fontSize="var(--fs-12)" sx={{ overflowWrap: "anywhere" }}>{detectedLinks.iosAppUrl}</Typography></Box><Button size="small" variant="outlined" onClick={() => applyDetectedLink("iosAppUrl")}>{String(values.iosAppUrl ?? "").trim() ? "Replace iOS link" : "Use iOS link"}</Button></Stack>}
          </Stack>}
        </Stack> : null}
      </Box> : null}
    </Fragment>)}</Stack> : null}
    {onboardingExperienceKind ? <Box sx={{ mt: 1.5 }}><OnboardingStepExperience
      kind={onboardingExperienceKind}
      projectName={String(values.projectName ?? recordValue(interaction.data?.values).projectName ?? onboardingData.projectName ?? interaction.data.projectName ?? "")}
      firebaseConnected={firebaseConnected ?? Boolean(recordValue(interaction.data.firebase).status === "connected" || interaction.data.firebaseConnected === true)}
      apnsConnected={apnsConnected ?? Boolean(recordValue(interaction.data.apns).status === "connected" || interaction.data.apnsConnected === true)}
      onFirebase={onOpenFirebase ?? (onSecureAction && secureAction ? () => onSecureAction(secureAction) : undefined)}
      onApns={onOpenApns}
      onRequestSdk={onRequestSdk}
      onSendDeveloperInstructions={onSendDeveloperInstructions}
      disabled={controlsDisabled}
    /></Box> : null}
    <SafeInteractionData data={interaction.data ?? {}} />
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="flex-end" gap={.8} sx={{ mt: 1.6 }}>
      {onCancel && interaction.status !== "completed" && interaction.status !== "cancelled" ? <Button className="guided-flow-cancel" startIcon={<CloseRounded />} onClick={onCancel} disabled={controlsDisabled}>Cancel</Button> : null}
      {onReload && (interaction.status === "expired" || interaction.status === "failed") ? <Button variant="outlined" startIcon={<RefreshRounded />} onClick={onReload} disabled={busy}>Reload</Button> : null}
      {onRetry && (interaction.status === "failed" || interaction.status === "expired") ? <Button variant="outlined" startIcon={<ReplayRounded />} onClick={onRetry} disabled={busy}>{interaction.status === "expired" ? "Start again" : "Retry"}</Button> : null}
      {secureAction && onSecureAction ? <Button variant="outlined" startIcon={<LockRounded />} onClick={() => onSecureAction(secureAction)} disabled={controlsDisabled}>Open secure setup</Button> : null}
      {resumeAction ? <Button type="button" variant="outlined" onClick={() => submitInteraction(resumeAction)} disabled={controlsDisabled}>{allRemainingDeferred ? "Resume deferred steps" : "Review deferred steps"}</Button> : null}
      {onboardingSaveAction ? <Button type="button" variant="outlined" onClick={() => submitInteraction(onboardingSaveAction)} disabled={controlsDisabled || missingRequired || Boolean(scheduleError) || Boolean(structuredJsonError) || Boolean(productError)}>Save</Button> : null}
      {secondaryActions.map((action) => <Button type="button" key={action} variant="outlined" onClick={() => submitInteraction(action)} disabled={controlsDisabled}>{actionLabel(action)}</Button>)}
      {saveDraftAction && submitAction !== saveDraftAction ? <Button type="button" variant="outlined" onClick={() => submitInteraction(saveDraftAction)} disabled={controlsDisabled || missingRequired || Boolean(scheduleError) || Boolean(structuredJsonError)}>{busy ? "Saving…" : "Save draft"}</Button> : null}
      {deferAction ? <Button type="button" className="guided-flow-next" variant="contained" endIcon={<ArrowForwardRounded />} onClick={() => submitInteraction(deferAction)} disabled={controlsDisabled}>{busy ? "Saving…" : "Continue"}</Button> : null}
      {!terminal && !secureAction && submitAction && <Button type="button" className="guided-flow-next" variant="contained" endIcon={<ArrowForwardRounded />} onClick={() => submitInteraction(submitAction)} disabled={busy || missingRequired || Boolean(scheduleError) || Boolean(structuredJsonError) || Boolean(productError)}>{busy ? "Saving…" : submitLabel}</Button>}
      {interaction.status === "completed" ? <Typography fontSize="var(--fs-11)" color="success.main" sx={{ alignSelf: "center" }}>Saved by PixlPush.</Typography> : null}
    </Stack>
  </Box>;
}

export function OnboardingInteractionCard(props: InteractionRendererProps) { return <InteractionFormCard {...props} kind="onboarding" />; }
export function BusinessAnalysisCard(props: InteractionRendererProps) { return <InteractionFormCard {...props} kind="business-analysis" />; }
export function GoalSelectionCard(props: InteractionRendererProps) { return <InteractionFormCard {...props} kind="goal-selection" />; }
export function JourneyCreationCard(props: InteractionRendererProps) { return <InteractionFormCard {...props} kind="journey-creation" />; }
export function PushCreationCard(props: InteractionRendererProps) { return <InteractionFormCard {...props} kind="push-creation" />; }
export function EmailCreationCard(props: InteractionRendererProps) { return <InteractionFormCard {...props} kind="email-creation" />; }
export function ImprovementCard(props: InteractionRendererProps) { return <InteractionFormCard {...props} kind="improvement" />; }
export function AnalysisCard(props: InteractionRendererProps) { return <InteractionFormCard {...props} kind="analysis" />; }
export function PreviewCard(props: InteractionRendererProps) { return <InteractionFormCard {...props} kind="preview" />; }
export function ApprovalCard(props: InteractionRendererProps) { return <InteractionFormCard {...props} kind="approval" />; }

export default function AiInteractionRenderer(props: InteractionRendererProps) {
  switch (props.interaction.type) {
    case "onboarding": return <OnboardingInteractionCard {...props} />;
    case "business_analysis": return <BusinessAnalysisCard {...props} />;
    case "goal_selection": return <GoalSelectionCard {...props} />;
    case "journey_creation": return <JourneyCreationCard {...props} />;
    case "push_creation": return <PushCreationCard {...props} />;
    case "email_creation": return <EmailCreationCard {...props} />;
    case "improvement": return <ImprovementCard {...props} />;
    case "analysis": return <AnalysisCard {...props} />;
    case "preview": return <PreviewCard {...props} />;
    case "approval": return <ApprovalCard {...props} />;
    default: return <InteractionFormCard {...props} kind="generic" />;
  }
}
