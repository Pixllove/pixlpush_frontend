import type { ApiError } from "@/types/auth";
import type { Journey, JourneyInput, JourneyStep } from "@/types/project";

/**
 * The journey builder draws a root list of blocks plus Yes/No branches under each condition. The API stores
 * one flat, ordered list of steps with forward jumps. This module converts between the two; nothing here
 * touches React or the network.
 */
export type BlockType = "entrance" | "email" | "notification" | "wait" | "condition" | "specific_time" | "repeat_journey" | "exit";
/** The counters a card shows, as GET /journeys/:id reports them (the Entrance card uses `entered` / `unreachable`). */
export type BlockStats = { waiting?: number; completed?: number; exitedEarly?: number; sent?: number; opened?: number; clicked?: number; paused?: number; deleted?: number; entered?: number; unreachable?: number };
export type Block = { id: string; type: BlockType; title: string; description: string; sourceType?: BlockType; stats?: BlockStats };
/** `lifecycle` and `audience` hold ids (of a Lifecycle Segment / Audience Group). */
export type EntranceConfig = { lifecycle: string; audience: string; allUsers: boolean };
export type Branches = Record<string, { yes: Block[]; no: Block[] }>;
/** What the settings panel of each block holds, keyed by block id. */
export type BlockSettings = Record<string, Record<string, string>>;
export type BuilderStatus = "Draft" | "Running" | "Paused";

export interface BuilderState {
  name: string;
  entranceConfig: EntranceConfig;
  blocks: Block[];
  branches: Branches;
  settings: BlockSettings;
  conditionValues: Record<string, string[]>;
}

export const ENTRANCE: Block = { id: "entrance", type: "entrance", title: "Entrance Trigger", description: "Select a lifecycle segment, audience group, or all users" };
export const EXIT: Block = { id: "exit", type: "exit", title: "Exit", description: "Exit rules: Subscriber has completed this journey · Re-entry rules: Enter once" };

/** The condition a rule sentence of the settings panel stands for. `negative` flips the Yes/No branches. */
const ENGAGEMENT: Record<string, { action: "email_opened" | "email_clicked" | "push_opened"; negative: boolean }> = {
  "Email was opened": { action: "email_opened", negative: false },
  "Email was not opened": { action: "email_opened", negative: true },
  "Link in email was clicked": { action: "email_clicked", negative: false },
  "Link in email was not clicked": { action: "email_clicked", negative: true },
  // the backend records a push tap as "opened"
  "Push notification was clicked": { action: "push_opened", negative: false },
  "Push notification was not clicked": { action: "push_opened", negative: true },
};
const hasEmail = { field: "email", operator: "exists" };
const hasPush = { field: "pushEnabled", operator: "equals", value: true };
const REACHABILITY: Record<string, Record<string, unknown>> = {
  "Email and FCM token available": { operator: "AND", conditions: [hasEmail, hasPush] },
  "Email available": hasEmail,
  "Email not available": { field: "email", operator: "not_exists" },
  "FCM token available": hasPush,
  "FCM token not available": { field: "pushEnabled", operator: "equals", value: false },
};
export const conditionOptions = (sourceType?: BlockType) =>
  sourceType === "notification" ? ["Push notification was clicked", "Push notification was not clicked"]
    : sourceType === "email" ? ["Email was opened", "Email was not opened", "Link in email was clicked", "Link in email was not clicked"]
    : Object.keys(REACHABILITY);

/** The exit rule each "Exit when" row of the settings panel switches on. Two rows may share one backend rule. */
const EXIT_RULES: Record<string, string> = {
  "Clicked email": "email_clicked",
  "Opened email": "email_opened",
  "Clicked notification": "push_opened",
  "Paused account": "account_paused",
  "Deleted account": "account_deleted",
  "FCM token removed": "push_unreachable",
  "Email removed": "email_unreachable",
  "Disabled special push offers": "push_unreachable",
  "Disabled special email offers": "email_unsubscribed",
  "Email opt out": "email_unsubscribed",
};

/** Thrown by toJourneyInput when the journey cannot be saved yet; the message is shown to the user. */
export class JourneyIncomplete extends Error {}

/** The builder's state as the body of POST/PATCH /journeys. */
export function toJourneyInput(state: BuilderState): JourneyInput {
  const { entranceConfig: entrance, settings, conditionValues } = state;
  if (!entrance.allUsers && !entrance.lifecycle && !entrance.audience) throw new JourneyIncomplete("Choose who enters this journey in the Entrance Trigger.");

  const steps: JourneyStep[] = [];
  const runnable = (list: Block[]) => list.filter((block) => block.type !== "entrance");
  const whole = (value: string | undefined, fallback: number) => Math.floor(Number(value ?? fallback));

  const emit = (block: Block, previous: Block | undefined, branch?: { of: string; side: "yes" | "no" }): JourneyStep => {
    const own = settings[block.id] ?? {};
    const meta = { block: block.type, title: block.title, settings: own, ...(branch ? { branchOf: branch.of, branch: branch.side } : {}) };
    if (block.type === "email" || block.type === "notification") {
      if (!own.template) throw new JourneyIncomplete(`Select a template for "${block.title}".`);
      if (block.type === "notification") return { type: "push", key: block.id, templateId: own.template, meta };
      // Subject and sender name replace the template's only when the user typed them.
      return { type: "email", key: block.id, templateId: own.template, ...(own.subject?.trim() ? { subject: own.subject.trim() } : {}), ...(own.fromName?.trim() ? { fromName: own.fromName.trim() } : {}), meta };
    }
    if (block.type === "wait") {
      const amount = whole(own.amount, 3);
      if (!(amount >= 1)) throw new JourneyIncomplete(`Enter how long "${block.title}" should wait.`);
      return { type: "delay", key: block.id, amount, unit: (own.unit as JourneyStep["unit"]) || "days", meta };
    }
    // Each user waits for the next time their arrival is followed by this clock time, in the editor's time zone.
    if (block.type === "specific_time") return { type: "delay", key: block.id, time: own.time || "09:00", utcOffset: -new Date().getTimezoneOffset(), meta };
    if (block.type === "repeat_journey") {
      const count = whole(own.count, 5);
      const amount = whole(own.interval, 1);
      if (!(count >= 1 && count <= 50) || !(amount >= 1)) throw new JourneyIncomplete(`"${block.title}" needs a repeat count from 1 to 50 and an interval of at least 1.`);
      return { type: "repeat", key: block.id, count, amount, unit: (own.unit as JourneyStep["unit"]) || "days", meta };
    }
    if (block.type === "exit") return { type: "exit", key: block.id, meta };

    // condition
    const options = conditionOptions(previous?.type);
    const rules = (conditionValues[block.id]?.length ? conditionValues[block.id] : [options[0]]).filter((rule) => options.includes(rule));
    const chosen = rules.length ? rules : [options[0]];
    const operator = own.match === "all" ? "AND" : "OR";
    const afterMessage = previous && (previous.type === "email" || previous.type === "notification");
    // After a message: did the user open / click it (or not). Otherwise: can the user be reached.
    const checks = afterMessage
      ? chosen.map((rule) => ({ kind: "engagement", stepKey: previous!.id, action: ENGAGEMENT[rule].action, waitHours: 0, ...(ENGAGEMENT[rule].negative ? { negate: true } : {}) }))
      : [{ kind: "audience", rules: { operator, conditions: chosen.map((rule) => REACHABILITY[rule] ?? hasEmail) } }];
    return { type: "condition", key: block.id, condition: checks.length === 1 ? checks[0] : { kind: "group", operator, conditions: checks }, meta: { ...meta, rules: chosen } };
  };

  const root = runnable(state.blocks);
  root.forEach((block, index) => {
    // the block drawn just above decides what a condition can ask about (the entrance counts as "nothing sent yet")
    const drawnAbove = state.blocks[state.blocks.indexOf(block) - 1];
    const step = emit(block, drawnAbove);
    steps.push(step);
    if (block.type !== "condition") return;

    const after = root[index + 1]?.id ?? null; // where both branches meet again
    const yes = runnable(state.branches[block.id]?.yes ?? []);
    const no = runnable(state.branches[block.id]?.no ?? []);
    const toYes = yes[0]?.id ?? after;
    const toNo = no[0]?.id ?? after;
    step.onTrue = toYes;
    step.onFalse = toNo;
    for (const [side, list] of [["yes", yes], ["no", no]] as const) {
      list.forEach((child, at) => {
        const childStep = emit(child, list[at - 1] ?? block, { of: block.id, side });
        // a nested condition has no drawn branches: both answers continue down the same path
        if (at === list.length - 1 && childStep.type !== "condition" && childStep.type !== "exit") childStep.next = after;
        steps.push(childStep);
      });
    }
  });

  if (!steps.some((step) => step.type === "push" || step.type === "email")) throw new JourneyIncomplete("Add at least one Email or Push notification step.");
  const exitWhen = settings[root.find((block) => block.type === "exit")?.id ?? "exit"] ?? {};
  return {
    name: state.name.trim() || "New Journey",
    trigger: "audience",
    audience: entrance.allUsers ? { allUsers: true } : entrance.lifecycle ? { lifecycleSegmentIds: [entrance.lifecycle] } : { audienceGroupIds: [entrance.audience] },
    exitOnAudienceLeave: exitWhen["Segment change"] === "yes" || exitWhen["Audience group change"] === "yes",
    exitRules: [...new Set(Object.keys(EXIT_RULES).filter((label) => exitWhen[label] === "yes").map((label) => EXIT_RULES[label]))],
    steps,
  };
}

const TITLES: Record<JourneyStep["type"], [BlockType, string, string]> = {
  email: ["email", "Email template", "Send a designed email to subscribers."],
  push: ["notification", "Push notification", "Send a push notification to subscribers."],
  delay: ["wait", "Wait", "Pause before the next step."],
  condition: ["condition", "Condition", "Split subscribers into Yes and No paths."],
  repeat: ["repeat_journey", "Repeat same journey", "Repeat this journey for a user."],
  exit: ["exit", EXIT.title, EXIT.description],
};

/** A saved journey back as builder state. Journeys not made in the builder (no `meta`) load as one straight path. */
export function fromJourney(journey: Journey): BuilderState & { status: BuilderStatus } {
  const blocks: Block[] = [{ ...ENTRANCE, stats: journey.entrance }];
  const branches: Branches = {};
  const settings: BlockSettings = {};
  const conditionValues: Record<string, string[]> = {};

  for (const step of journey.steps) {
    const meta = (step.meta ?? {}) as { block?: BlockType; title?: string; settings?: Record<string, string>; branchOf?: string; branch?: "yes" | "no"; rules?: string[] };
    const [type, title, description] = TITLES[step.type];
    const block: Block = { id: step.key, type: meta.block ?? (step.type === "delay" && (step.time || step.until) ? "specific_time" : type), title: meta.title ?? title, description, stats: step.stats };
    settings[block.id] = {
      ...(step.templateId ? { template: step.templateId } : {}),
      ...(step.type === "delay" && step.amount ? { amount: String(step.amount), unit: step.unit ?? "days" } : {}),
      ...(step.type === "repeat" ? { count: String(step.count), interval: String(step.amount), unit: step.unit ?? "days" } : {}),
      ...(step.time ? { time: step.time } : {}),
      ...(step.subject ? { subject: step.subject } : {}),
      ...(step.fromName ? { fromName: step.fromName } : {}),
      ...meta.settings,
    };
    if (meta.rules?.length) conditionValues[block.id] = meta.rules;
    if (meta.branchOf && meta.branch) {
      branches[meta.branchOf] ??= { yes: [], no: [] };
      branches[meta.branchOf][meta.branch].push(block);
    } else blocks.push(block);
  }
  if (!blocks.some((block) => block.type === "exit")) blocks.push(EXIT);

  const audience = journey.audience ?? {};
  return {
    name: journey.name,
    status: journey.status === "active" ? "Running" : journey.status === "draft" ? "Draft" : "Paused",
    entranceConfig: { allUsers: Boolean(audience.allUsers), lifecycle: audience.lifecycleSegmentIds?.[0] ?? "", audience: audience.audienceGroupIds?.[0] ?? "" },
    blocks,
    branches,
    settings,
    conditionValues,
  };
}

const ERRORS: Record<string, string> = {
  INSUFFICIENT_ROLE: "You do not have permission to change journeys in this project.",
  JOURNEY_ACTIVE: "Pause the journey before changing its trigger, audience or steps.",
  JOURNEY_ARCHIVED: "This journey was stopped and can no longer be edited.",
  JOURNEY_NOT_DELETABLE: "Stop the journey before deleting it.",
  JOURNEY_CHANGED: "The journey changed meanwhile. Reload and try again.",
  NETWORK_ERROR: "Cannot reach the server. Check your connection.",
};
/** Journey errors already carry a sentence written for the user (plan limit, a channel that is not set up, an invalid step). */
export const journeyError = (error: unknown, fallback = "Something went wrong. Please try again.") => {
  if (error instanceof JourneyIncomplete) return error.message;
  const api = error as Partial<ApiError> | null;
  return (api?.code && ERRORS[api.code]) || (api?.status && api.status < 500 && api.message) || fallback;
};
