import type { ApiError } from "@/types/auth";
import type { Journey, JourneyInput, JourneyStep } from "@/types/project";

/**
 * The journey builder draws a root list of blocks plus Yes/No branches under each condition. The API stores
 * one flat, ordered list of steps with forward jumps. This module converts between the two; nothing here
 * touches React or the network.
 */
export type BlockType = "entrance" | "email" | "notification" | "web_notification" | "wait" | "condition" | "event" | "specific_time" | "repeat_journey" | "ab_test" | "exit";
/** The counters a card shows, as GET /journeys/:id reports them (the Entrance card uses `entered` / `unreachable`). */
export type BlockStats = { waiting?: number; completed?: number; exitedEarly?: number; sent?: number; opened?: number; clicked?: number; paused?: number; deleted?: number; entered?: number; unreachable?: number };
export type Block = { id: string; type: BlockType; title: string; description: string; sourceType?: BlockType; stats?: BlockStats };
/** `lifecycle` and `audience` hold ids (of a Lifecycle Segment / Audience Group). */
export type EntranceConfig = { lifecycle: string; audience: string; allUsers: boolean };
/** Yes/No paths under a condition; `variants` holds the message blocks of an A/B test block. */
export type Branches = Record<string, { yes: Block[]; no: Block[]; variants?: Block[] }>;
export type BranchSide = "yes" | "no" | "variants";
export const MESSAGE_BLOCKS: BlockType[] = ["email", "notification", "web_notification"];
const AB_LETTERS = "ABCDE";
/** How many variants the builder allows for this test: their choice from 2 to 5, 2 when unset. */
export const abMaxVariants = (own: Record<string, string> = {}) => Math.min(5, Math.max(2, Math.floor(Number(own.maxVariants) || 2)));

/**
 * One row per variant of an A/B test, and the variant to keep: the best click rate (a push tap,
 * an email link click), a tie going to more clicks and then to the first. No clicks yet = no winner.
 */
export function abResults(variants: Block[]) {
  const rows = variants.map((variant, index) => {
    const sent = variant.stats?.sent ?? 0;
    const clicks = (variant.type === "email" ? variant.stats?.clicked : variant.stats?.opened) ?? 0;
    return { id: variant.id, letter: AB_LETTERS[index] ?? String(index + 1), sent, clicks, rate: sent ? Math.round((clicks / sent) * 100) : 0 };
  });
  const best = rows.reduce<(typeof rows)[number] | null>((top, row) => {
    if (!top) return row;
    const rate = (r: typeof row) => (r.sent ? r.clicks / r.sent : 0);
    return rate(row) > rate(top) || (rate(row) === rate(top) && row.clicks > top.clicks) ? row : top;
  }, null);
  return { rows, winner: best && best.clicks > 0 ? best.id : null };
}
/** What the settings panel of each block holds, keyed by block id. */
export type BlockSettings = Record<string, Record<string, string>>;
export type BuilderStatus = "Draft" | "Running" | "Paused" | "Stopped";

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
const ENGAGEMENT: Record<string, { action: "email_opened" | "email_clicked" | "push_opened"; negative: boolean; channel?: "mobile" | "web" }> = {
  "Email was opened": { action: "email_opened", negative: false },
  "Email was not opened": { action: "email_opened", negative: true },
  "Link in email was clicked": { action: "email_clicked", negative: false },
  "Link in email was not clicked": { action: "email_clicked", negative: true },
  // Both native and browser SDKs report taps through the same job-open route.
  "Mobile push notification was clicked": { action: "push_opened", channel: "mobile", negative: false },
  "Mobile push notification was not clicked": { action: "push_opened", channel: "mobile", negative: true },
  "Web push notification was clicked": { action: "push_opened", channel: "web", negative: false },
  "Web push notification was not clicked": { action: "push_opened", channel: "web", negative: true },
  // Read older journeys without changing their saved rule text.
  "Push notification was clicked": { action: "push_opened", channel: "mobile", negative: false },
  "Push notification was not clicked": { action: "push_opened", channel: "mobile", negative: true },
};
const hasEmail = { field: "email", operator: "exists" };
const hasFcm = { field: "fcmToken", operator: "available" };
const noFcm = { field: "fcmToken", operator: "not_available" };
const hasWebPush = { field: "webPush", operator: "available" };
const noWebPush = { field: "webPush", operator: "not_available" };
const REACHABILITY: Record<string, Record<string, unknown>> = {
  "Email + FCM token available": { operator: "AND", conditions: [hasEmail, hasFcm] },
  "Email + Web Push available": { operator: "AND", conditions: [hasEmail, hasWebPush] },
  "Email available": hasEmail,
  "Email not available": { field: "email", operator: "not_exists" },
  "FCM token available": hasFcm,
  "FCM token not available": noFcm,
  "Web Push available": hasWebPush,
  "Web Push not available": noWebPush,
};
const REACHABILITY_ALIASES: Record<string, string> = {
  "Email and FCM token available": "Email + FCM token available",
};
export const conditionOptions = (sourceType?: BlockType) =>
  sourceType === "notification" ? ["Mobile push notification was clicked", "Mobile push notification was not clicked"]
    : sourceType === "web_notification" ? ["Web push notification was clicked", "Web push notification was not clicked"]
    : sourceType === "email" ? ["Email was opened", "Email was not opened", "Link in email was clicked", "Link in email was not clicked"]
    : [
      "Email + FCM token available",
      "Email + Web Push available",
      "Email available",
      "Email not available",
      "FCM token available",
      "FCM token not available",
      "Web Push available",
      "Web Push not available",
    ];

/** Convert pre-channel-specific push labels to the matching message block's label. */
export function normalizeConditionRule(rule: string, sourceType?: BlockType) {
  if (rule === "Push notification was clicked" || rule === "Push notification was not clicked") {
    const action = rule.endsWith("not clicked") ? "not clicked" : "clicked";
    return `${sourceType === "web_notification" ? "Web" : "Mobile"} push notification was ${action}`;
  }
  return REACHABILITY_ALIASES[rule] ?? rule;
}

/** Merge tracked events while retaining the SDK source(s) that have sent each name. */
export function mergeJourneyEventOptions(
  webEvents: Array<{ name: string }>,
  mobileEvents: Array<{ name: string }>,
) {
  const sources = new Map<string, Set<"Web SDK" | "Mobile SDK">>();
  for (const event of webEvents) {
    const found = sources.get(event.name) ?? new Set();
    found.add("Web SDK");
    sources.set(event.name, found);
  }
  for (const event of mobileEvents) {
    const found = sources.get(event.name) ?? new Set();
    found.add("Mobile SDK");
    sources.set(event.name, found);
  }
  return [...sources.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, eventSources]) => ({
      id: name,
      name,
      sources: (["Web SDK", "Mobile SDK"] as const).filter((source) => eventSources.has(source)),
    }));
}

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
    if (block.type === "email" || block.type === "notification" || block.type === "web_notification") {
      if (!own.template) throw new JourneyIncomplete(`Select a template for "${block.title}".`);
      if (block.type !== "email") {
        const channel = block.type === "web_notification" ? "web" : own.deliveryChannel === "all" ? undefined : "mobile";
        return { type: "push", key: block.id, templateId: own.template, ...(channel ? { channel } : {}), meta };
      }
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
    if (block.type === "ab_test") return { type: "abtest", key: block.id, variants: [], meta };

    if (block.type === "event") {
      const event = own.event?.trim();
      if (!event) throw new JourneyIncomplete(`Choose an event for "${block.title}".`);
      return {
        type: "condition",
        key: block.id,
        condition: { kind: "event", eventName: event },
        meta,
      };
    }

    // condition
    const options = conditionOptions(previous?.type);
    const rules = (conditionValues[block.id]?.length ? conditionValues[block.id] : [options[0]])
      .map((rule) => normalizeConditionRule(rule, previous?.type))
      .filter((rule) => options.includes(rule));
    const chosen = rules.length ? rules : [options[0]];
    const operator = own.match === "all" ? "AND" : "OR";
    const afterMessage = previous && (previous.type === "email" || previous.type === "notification" || previous.type === "web_notification");
    // After a message: did the user open / click it (or not). Otherwise: can the user be reached.
    const checks = afterMessage
      ? chosen.map((rule) => ({ kind: "engagement", stepKey: previous!.id, action: ENGAGEMENT[rule].action, ...(ENGAGEMENT[rule].channel ? { channel: ENGAGEMENT[rule].channel } : {}), waitHours: 0, ...(ENGAGEMENT[rule].negative ? { negate: true } : {}) }))
      : [{ kind: "audience", rules: { operator, conditions: chosen.map((rule) => REACHABILITY[rule] ?? hasEmail) } }];
    return { type: "condition", key: block.id, condition: checks.length === 1 ? checks[0] : { kind: "group", operator, conditions: checks }, meta: { ...meta, rules: chosen } };
  };

  const root = runnable(state.blocks);
  root.forEach((block, index) => {
    // the block drawn just above decides what a condition can ask about (the entrance counts as "nothing sent yet")
    const drawnAbove = state.blocks[state.blocks.indexOf(block) - 1];
    const step = emit(block, drawnAbove);
    steps.push(step);
    if (block.type === "ab_test") {
      // each user gets one variant; whichever it is, they continue with the block after the test
      const variants = runnable(state.branches[block.id]?.variants ?? []);
      if (variants.length < 2 || variants.length > 5) throw new JourneyIncomplete(`Add 2 to 5 variants to "${block.title}".`);
      if (variants.some((variant) => variant.type !== variants[0]!.type || !MESSAGE_BLOCKS.includes(variant.type))) {
        throw new JourneyIncomplete(`All variants of "${block.title}" must be the same kind of message.`);
      }
      const max = abMaxVariants(settings[block.id]);
      if (variants.length > max) {
        throw new JourneyIncomplete(`"${block.title}" has ${variants.length} variants but is set to ${max}. Remove some or raise the number of variants.`);
      }
      step.variants = variants.map((variant) => variant.id);
      const after = root[index + 1]?.id ?? null;
      for (const variant of variants) {
        const variantStep = emit(variant, block);
        steps.push({ ...variantStep, next: after, meta: { ...variantStep.meta, variantOf: block.id } });
      }
      return;
    }
    if (block.type !== "condition" && block.type !== "event") return;

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
  abtest: ["ab_test", "A/B test", "Send each user one of 2 to 5 messages, then keep the best."],
  exit: ["exit", EXIT.title, EXIT.description],
};

/** A saved journey back as builder state. Journeys not made in the builder (no `meta`) load as one straight path. */
export function fromJourney(journey: Journey): BuilderState & { status: BuilderStatus } {
  const blocks: Block[] = [{ ...ENTRANCE, stats: journey.entrance }];
  const branches: Branches = {};
  const settings: BlockSettings = {};
  const conditionValues: Record<string, string[]> = {};
  // a variant whose test was applied (removed) is drawn as a plain block where the test was
  const tests = new Set(journey.steps.filter((step) => step.type === "abtest").map((step) => step.key));

  for (const step of journey.steps) {
    const meta = (step.meta ?? {}) as { block?: BlockType; title?: string; settings?: Record<string, string>; branchOf?: string; branch?: "yes" | "no"; variantOf?: string; rules?: string[] };
    const [type, title, description] = TITLES[step.type];
    const blockType = meta.block ?? (step.type === "push" && step.channel === "web" ? "web_notification" : step.type === "delay" && (step.time || step.until) ? "specific_time" : type);
    const block: Block = { id: step.key, type: blockType, title: meta.title ?? title, description: blockType === "event" ? "Branch subscribers based on a tracked event." : description, stats: step.stats };
    settings[block.id] = {
      ...(step.templateId ? { template: step.templateId } : {}),
      ...(step.type === "delay" && step.amount ? { amount: String(step.amount), unit: step.unit ?? "days" } : {}),
      ...(step.type === "repeat" ? { count: String(step.count), interval: String(step.amount), unit: step.unit ?? "days" } : {}),
      ...(step.time ? { time: step.time } : {}),
      ...(step.subject ? { subject: step.subject } : {}),
      ...(step.fromName ? { fromName: step.fromName } : {}),
      ...meta.settings,
      ...(step.type === "push" && !step.channel
        ? { deliveryChannel: blockType === "web_notification" ? "web" : "all" }
        : {}),
    };
    if (meta.rules?.length) conditionValues[block.id] = meta.rules.map((rule) => REACHABILITY_ALIASES[rule] ?? rule);
    if (meta.variantOf && tests.has(meta.variantOf)) {
      branches[meta.variantOf] ??= { yes: [], no: [] };
      (branches[meta.variantOf].variants ??= []).push(block);
    } else if (meta.branchOf && meta.branch) {
      branches[meta.branchOf] ??= { yes: [], no: [] };
      branches[meta.branchOf][meta.branch].push(block);
    } else blocks.push(block);
  }
  if (!blocks.some((block) => block.type === "exit")) blocks.push(EXIT);

  const audience = journey.audience ?? {};
  return {
    name: journey.name,
    status:
      journey.status === "active"
        ? "Running"
        : journey.status === "draft"
          ? "Draft"
          : journey.status === "archived"
            ? "Stopped"
            : "Paused",
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
  JOURNEY_STOPPED: "This journey was stopped and can no longer be edited.",
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
