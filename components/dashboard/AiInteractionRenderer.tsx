"use client";

import { ArrowForwardRounded, CheckRounded, CloseRounded, LockRounded, ReplayRounded, RefreshRounded } from "@mui/icons-material";
import { Alert, Box, Button, ButtonBase, Checkbox, FormControlLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import type { AiInteraction, AiInteractionAction, AiInteractionField } from "@/lib/projects/ai";

type InteractionRendererProps = {
  interaction: AiInteraction;
  onSubmit: (fields: Record<string, unknown>, action?: AiInteractionAction) => void;
  onCancel?: () => void;
  onRetry?: () => void;
  onReload?: () => void;
  onSecureAction?: (action: { label: string; href?: string }) => void;
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
  for (const source of [returned, submitted, data]) {
    if (Object.prototype.hasOwnProperty.call(source, field.key)) return { found: true, value: source[field.key] };
  }
  return { found: false };
}

function isPrimaryAction(action: AiInteractionAction) {
  const value = action.toLowerCase();
  return /submit|continue|confirm|approve|save|next/.test(value);
}

function fieldIsSecure(field: AiInteractionField) {
  return field.type === "secure_upload" || field.sensitive || /credential|secret|service.?account|firebase/i.test(field.key);
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

function InteractionFieldControl({ field, value, onChange, disabled }: { field: AiInteractionField; value: unknown; onChange: (value: unknown) => void; disabled?: boolean }) {
  const type = field.type.toLowerCase();
  if (fieldIsSecure(field)) return <Box sx={{ p: 1.2, border: "1px solid rgba(89, 57, 111, .14)", borderRadius: 1.5, bgcolor: "rgba(89, 57, 111, .04)" }}><Stack direction="row" gap={1} alignItems="center"><LockRounded fontSize="small" color="action" /><Box><Typography fontSize="var(--fs-12)" fontWeight={700}>{field.label}</Typography><Typography fontSize="var(--fs-11)" color="text.secondary">This value is collected only in the protected PixlPush setup screen.</Typography></Box></Stack></Box>;
  if (field.key === "schedule") return <ScheduleControl value={value} onChange={onChange} disabled={disabled} />;
  if (field.key === "frequencyCap") return <FrequencyCapControl value={value} onChange={onChange} disabled={disabled} />;
  if (field.key === "quietHours") return <QuietHoursControl value={value} onChange={onChange} disabled={disabled} />;
  if (type === "json" && structuredJsonKeys.has(field.key)) return <StructuredJsonControl field={field} value={value} onChange={onChange} disabled={disabled} />;
  if (type === "checkbox" || type === "boolean") return <FormControlLabel control={<Checkbox checked={Boolean(value)} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />} label={field.label} />;
  if (["select", "dropdown", "timezone"].includes(type)) return <TextField select={type !== "timezone"} fullWidth label={field.label} value={String(value ?? "")} disabled={disabled} onChange={(event) => onChange(event.target.value)} required={field.required}>{type !== "timezone" ? (field.options ?? []).map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>) : null}</TextField>;
  if (["radio", "choice"].includes(type)) {
    const multiple = ["platforms", "channels"].includes(field.key);
    const selected = Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];
    return <Box><Typography className="guided-flow-question">{field.label}{field.required ? " *" : ""}</Typography><Stack gap={.65}>{(field.options ?? []).map((option) => { const isSelected = selected.includes(option); return <ButtonBase key={option} disabled={disabled} className={`guided-flow-choice ${isSelected ? "is-selected" : ""}`} onClick={() => onChange(multiple ? isSelected ? selected.filter((item) => item !== option) : [...selected, option] : option)}><span className="guided-choice-check">{isSelected && <CheckRounded />}</span><Box className="guided-choice-copy"><Typography>{option}</Typography></Box></ButtonBase>; })}</Stack></Box>;
  }
  return <TextField fullWidth multiline={type === "json" || type === "textarea" || type === "text_area"} minRows={type === "json" || type === "textarea" || type === "text_area" ? 3 : undefined} type={["date", "number", "url", "time"].includes(type) ? type : "text"} label={field.label} value={String(value ?? "")} disabled={disabled} onChange={(event) => onChange(event.target.value)} required={field.required} />;
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

function InteractionFormCard({ interaction, onSubmit, onCancel, onRetry, onReload, onSecureAction, busy, error, kind }: InteractionRendererProps & { kind: string }) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const fields = useMemo(() => currentStepFields(interaction), [interaction]);
  useEffect(() => {
    setValues((previous) => Object.fromEntries(fields.map((field) => {
      const returned = backendValue(interaction, field);
      return [field.key, returned.found ? returned.value : previous[field.key] ?? initialValue(field, interaction.data ?? {})];
    })));
  }, [fields, interaction]);
  const secureField = fields.find(fieldIsSecure);
  const secureAction = secureField
    ? {
        label: secureField.label,
        href: interaction.data.secureAction && typeof interaction.data.secureAction === "object"
          ? (interaction.data.secureAction as { href?: string }).href
          : /firebase|mobile-push/i.test(secureField.key) ? "/dashboard/settings/firebase" : "/dashboard/integrations",
      }
    : null;
  const terminal = ["completed", "cancelled", "failed", "expired"].includes(interaction.status);
  const primaryAction = interaction.type === "business_analysis"
    ? interaction.step === 2 && interaction.actions.includes("analyze")
      ? "analyze"
      : interaction.step >= 3 && interaction.actions.includes("approve")
        ? "approve"
        : interaction.actions.find((action) => action !== "save_draft" && isPrimaryAction(action)) ?? interaction.actions.find(isPrimaryAction)
    : interaction.actions.find((action) => action !== "save_draft" && isPrimaryAction(action)) ?? interaction.actions.find(isPrimaryAction);
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
  const submitAction = primaryAction;
  const secondaryActions = interaction.actions.filter((action) => ["preview", "edit", "next", "submit", "analyze"].includes(action) && action !== submitAction);
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

  return <Box className="guided-flow-card ai-interaction-card" data-testid={`interaction-${kind}`}>
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
      <Box><Typography component="h2" className="guided-flow-title">{interaction.title}</Typography>{interaction.description ? <Typography className="guided-flow-subtitle">{interaction.description}</Typography> : null}</Box>
      {interaction.status === "completed" ? <CheckRounded color="success" /> : null}
    </Stack>
    {interaction.totalSteps > 0 ? <Box sx={{ mt: 1.2 }} aria-label={`Step ${interaction.step} of ${interaction.totalSteps}`}><Typography fontSize="var(--fs-11)" color="text.secondary">Step {interaction.step} of {interaction.totalSteps}</Typography><Box sx={{ display: "flex", gap: .45, mt: .55 }}>{Array.from({ length: interaction.totalSteps }, (_, index) => <Box key={index} sx={{ height: 5, flex: 1, borderRadius: 2, bgcolor: index < interaction.step ? "primary.main" : "rgba(89, 57, 111, .12)" }} />)}</Box></Box> : null}
    {error ? <Alert severity="error" sx={{ mt: 1.25 }} role="alert">{error}</Alert> : null}
    {interaction.status === "cancelled" ? <Alert severity="info" sx={{ mt: 1.25 }}>This interaction was cancelled. Its fields are no longer editable.</Alert> : null}
    {interaction.status === "expired" ? <Alert severity="warning" sx={{ mt: 1.25 }}>This interaction has expired. Reload it to get the current step.</Alert> : null}
    {interaction.type === "approval" ? <Alert severity="info" sx={{ mt: 1.25 }}>Approval records your decision only. Sending, scheduling, publishing, or activation remains a separate action.</Alert> : null}
    {scheduleError ? <Alert severity="warning" sx={{ mt: 1.25 }}>{scheduleError}</Alert> : null}
    {structuredJsonError ? <Alert severity="error" sx={{ mt: 1.25 }}>Fix the invalid JSON in {structuredJsonError} before continuing.</Alert> : null}
    {fields.length ? <Stack gap={1.2} sx={{ mt: 1.5 }}>{fields.map((field) => <InteractionFieldControl key={field.key} field={field} value={values[field.key]} disabled={controlsDisabled} onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))} />)}</Stack> : null}
    <SafeInteractionData data={interaction.data ?? {}} />
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="flex-end" gap={.8} sx={{ mt: 1.6 }}>
      {onCancel && interaction.status !== "completed" && interaction.status !== "cancelled" ? <Button className="guided-flow-cancel" startIcon={<CloseRounded />} onClick={onCancel} disabled={controlsDisabled}>Cancel</Button> : null}
      {onReload && (interaction.status === "expired" || interaction.status === "failed") ? <Button variant="outlined" startIcon={<RefreshRounded />} onClick={onReload} disabled={busy}>Reload</Button> : null}
      {onRetry && (interaction.status === "failed" || interaction.status === "expired") ? <Button variant="outlined" startIcon={<ReplayRounded />} onClick={onRetry} disabled={busy}>{interaction.status === "expired" ? "Start again" : "Retry"}</Button> : null}
      {secureAction && onSecureAction ? <Button variant="outlined" startIcon={<LockRounded />} onClick={() => onSecureAction(secureAction)} disabled={controlsDisabled}>Open secure setup</Button> : null}
      {secondaryActions.map((action) => <Button key={action} variant="outlined" onClick={() => onSubmit(values, action)} disabled={controlsDisabled}>{action === "preview" ? "Preview" : action === "edit" ? "Edit" : action === "next" ? "Continue" : "Save"}</Button>)}
      {saveDraftAction && submitAction !== saveDraftAction ? <Button variant="outlined" onClick={() => onSubmit(values, saveDraftAction)} disabled={controlsDisabled || missingRequired || Boolean(scheduleError) || Boolean(structuredJsonError)}>{busy ? "Saving…" : "Save draft"}</Button> : null}
      {!terminal && !secureAction && submitAction && <Button className="guided-flow-next" variant="contained" endIcon={<ArrowForwardRounded />} onClick={() => onSubmit(values, submitAction)} disabled={busy || missingRequired || Boolean(scheduleError) || Boolean(structuredJsonError)}>{busy ? "Saving…" : submitLabel}</Button>}
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
