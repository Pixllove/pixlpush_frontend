import { Body, Callout, DataTable, List, Section } from "./DocsPrimitives";

// One list for every platform's Events guide and the AI setup prompts, so they suggest the same names.
// Names are only suggestions: PixlPush accepts any snake_case name, but journeys work best when the
// event that starts a journey has a matching event that ends it.
export const suggestedEvents: [name: string, when: string, journey: string][] = [
  ["signed_up", "An account is created.", "Starts a welcome / onboarding journey."],
  ["onboarding_completed", "The user finishes your setup flow.", "Goal of the onboarding journey: users who send it leave."],
  ["feature_used", "A key feature is used (property: feature).", "Branch an Events step: nudge users who never tried it."],
  ["paywall_viewed", "A paywall or pricing screen is shown (property: placement).", "Starts a paywall drop-off journey."],
  ["cart_item_added", "An item is added to the cart.", "Starts an abandoned-cart journey."],
  ["checkout_started", "Checkout opens.", "Starts an abandoned-checkout journey."],
  ["purchase_completed", "Payment is confirmed (properties: amount, currency, plan).", "Goal of cart, checkout and paywall journeys; starts a post-purchase journey."],
  ["trial_started", "A free trial begins.", "Starts a trial nurture journey."],
  ["subscription_started", "A paid subscription begins.", "Goal of the trial journey."],
  ["subscription_cancelled", "A subscription is cancelled.", "Starts a win-back journey; subscription_started is its goal."],
];

/** The same list as plain text, for the AI setup prompts. */
export const suggestedEventsText = suggestedEvents.map(([name, when, journey]) => `- ${name}: ${when} ${journey}`).join("\n");

export function SuggestedEvents({ automatic }: { automatic: string }) {
  return (
    <Section id="suggested" title="Suggested events for journeys">
      <Body>Journeys start when a user sends an event, branch on events they send, and end when they send a goal event. Track these where they apply to your product, and you can build the common journeys without another release.</Body>
      <DataTable headers={["Event", "Send it when", "What it unlocks"]} rows={suggestedEvents} />
      <List items={[
        "Track both ends of a journey: the event that starts it and the goal that ends it. Without the goal, people who already bought keep getting reminders.",
        "Keep names stable. A journey matches the exact name, so renaming an event stops the journeys that use it.",
        "Put variable details in properties (plan, placement, feature), not in the name.",
        "Send purchase and subscription events only after payment is confirmed.",
      ]} />
      <Callout tone="note" title="Already tracked for you">{automatic} No code needed: use them for re-engagement segments such as “not active in the last 7 days”.</Callout>
    </Section>
  );
}
