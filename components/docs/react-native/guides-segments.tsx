import CodeBlock from "../CodeBlock";
import { Body, Callout, DataTable, Expect, List, Section, Step } from "../DocsPrimitives";
import { LinkBox } from "../links";
import { rn, type GuideProps } from "./guides-setup";

const howSegmentsWork = <Callout tone="note" title="How lifecycle segments decide">
  A segment matches a user who has performed <b>any</b> of its events, at any time. Each user belongs to <b>one</b> segment: PixlPush checks segments from the oldest to the newest and stops at the first match. Create narrow segments first and broad ones last.
</Callout>;

const createSteps = (event: string, name: string) => [
  <>Open <LinkBox href="/dashboard/users" sx={{ color: "inherit" }}><b>Users</b></LinkBox> → <b>Lifecycle segments</b> tab → <b>Create segment</b>.</>,
  <><b>Select events</b>: search for <code>{event}</code>. Events your app already sent are under <b>Tracked events</b>; names it hasn’t sent yet are under <b>Suggested events</b> (the segment then starts empty and fills as events arrive).</>,
  <><b>Add segment details</b>: enter <b>Segment name</b> “{name}” and a short description.</>,
  <>Click <b>Create segment</b>.</>,
];

export function EngagementSegment({ base }: GuideProps) {
  return <>
    <Section id="goal" title="What you’ll build">
      <Body>A lifecycle segment of people who have used your app, built from events the SDK already records — no extra tracking code. You then use it as the audience of a return-engagement journey.</Body>
      {howSegmentsWork}
    </Section>

    <Step id="events" number={1} title="Check the events">
      <Body>With the SDK configured, these are recorded automatically (unless you set <code>trackLifecycleEvents: false</code>):</Body>
      <DataTable headers={["Event", "Sent when", "Properties"]} rows={[
        ["app_opened", "The app starts, and each time it returns to the foreground", "from_background"],
        ["app_backgrounded", "The user leaves the app (home, app switch, lock)", "session_duration_seconds"],
      ]} />
      <Callout tone="warning" title="Don’t track app_closed">Phones don’t tell apps when they’re swiped away or killed, so an <code>app_closed</code> event can’t be sent reliably. <code>app_backgrounded</code> is the last signal you reliably get.</Callout>
      <Body>Want a narrower audience, such as people who actually used a core feature? Track that action yourself and build the segment on it instead:</Body>
      <CodeBlock code={`await PixlPush.track("feature_used", { feature: "playlist_created" });`} />
    </Step>

    <Step id="segment" number={2} title="Create the segment">
      <List ordered items={createSteps("app_backgrounded", "Left the app")} />
      <Body>Because <code>app_backgrounded</code> is sent by almost every user, this segment is broad. Create it <b>after</b> your more specific segments (such as “Paid Customer”), or it will claim their users first.</Body>
    </Step>

    <Section id="inactive" title="Option: only users who stopped coming back">
      <Body>A lifecycle segment means “has ever done it”. To reach people who <b>left and haven’t returned</b>, use an audience group, which supports time windows:</Body>
      <List ordered items={[
        <>Open <b>Users</b> → <b>Audience groups</b> tab → <b>Create group</b>, name it “Inactive for 7 days”, and open it.</>,
        <>Under <b>Group conditions</b>, add: <b>Choose a filter</b> → <b>Performed Event</b>, <b>Choose an operator</b> → <b>Performed in the last 30 days</b>, <b>Choose a value</b> → <code>app_backgrounded</code>.</>,
        <>Add a second condition: <b>Performed Event</b> → <b>Not performed in the last 7 days</b> → <code>app_opened</code>.</>,
        <>Conditions are joined with <b>AND</b>. Click <b>Save conditions</b>.</>,
      ]} />
      <Body>Result: users active in the last month who haven’t opened the app for a week. Use this group as the journey entrance instead of the segment.</Body>
    </Section>

    <Step id="journey" number={3} title="Use it in a journey">
      <Body>Open <LinkBox href="/dashboard/journeys" sx={{ color: "inherit" }}><b>Journey Automations</b></LinkBox>, create a journey and set its entrance to the lifecycle segment <b>Left the app</b> — or to the audience group <b>Inactive for 7 days</b>. Push messages reach users with an active device token; see <A base={base} />.</Body>
    </Step>

    <Step id="verify" number={4} title="Verify">
      <List ordered items={["Open your development build, then send it to the background.", "In Users, open your test user and confirm app_opened and app_backgrounded appear.", "In Lifecycle segments, open “Left the app” and check that your test user is listed."]} />
      <Expect>The test user is in <b>Left the app</b> — unless an older segment matched them first.</Expect>
    </Step>
  </>;
}

const A = ({ base }: { base: string }) => <LinkBox href={rn(base, "push", "tokens")} sx={{ color: "inherit" }}>Token sync</LinkBox>;

export function PaywallSegment({ base }: GuideProps) {
  return <>
    <Section id="goal" title="What you’ll build">
      <Body>A <b>Paywall drop-off</b> segment: people who saw a paywall and didn’t buy. Segments can’t exclude events, so you get there with two segments created in the right order.</Body>
      {howSegmentsWork}
    </Section>

    <Step id="events" number={1} title="Track the paywall events">
      <Body>Send <code>paywall_viewed</code> when a paywall is shown, and a purchase event only after the store confirms payment.</Body>
      <CodeBlock filename="src/paywall/tracking.ts" code={`import PixlPush from "@pixlpush/react-native";

export function onPaywallShown(placement: string, plan: string) {
  return PixlPush.track("paywall_viewed", { placement, plan });
}

export function onPurchaseConfirmed(purchase: { transactionId: string; plan: string; price: number; currency: string }) {
  return PixlPush.track(
    "purchase_completed",
    { plan: purchase.plan, value: purchase.price, currency: purchase.currency },
    { eventId: \`purchase:\${purchase.transactionId}\` }, // a retried confirmation counts once
  );
}`} />
      <Body>Subscriptions? Send <code>subscription_started</code> instead of (or as well as) <code>purchase_completed</code>. Event names are case-sensitive — use the same names everywhere. See <LinkBox href={rn(base, "events", "rules")} sx={{ color: "inherit" }}>naming rules</LinkBox>.</Body>
    </Step>

    <Step id="segments" number={2} title="Create the segments in order">
      <Body><b>First</b>, the buyers. Select both events — a user matches if they performed either.</Body>
      <List ordered items={createSteps("purchase_completed", "Paid Customer").map((item, i) => i === 1 ? <><b>Select events</b>: add <code>purchase_completed</code> and <code>subscription_started</code>.</> : item)} />
      <Body><b>Then</b>, the drop-off segment:</Body>
      <List ordered items={createSteps("paywall_viewed", "Paywall drop-off")} />
      <DataTable code={false} headers={["User did", "Ends up in"]} rows={[
        ["Viewed the paywall and bought", "Paid Customer (older segment matches first)"],
        ["Viewed the paywall, didn’t buy", "Paywall drop-off"],
        ["Bought later", "Moves to Paid Customer automatically"],
      ]} />
      <Callout tone="warning" title="Already have broad segments?">If an older segment matches these users (for example one built on <code>app_opened</code>), it wins. Segments are checked by creation date, so recreate the broad one after these two.</Callout>
    </Step>

    <Step id="verify" number={3} title="Verify">
      <List ordered items={["With a test account, open the paywall and close it without buying.", "Check Users → your test user shows paywall_viewed, and Lifecycle segments → Paywall drop-off lists them.", "Make a sandbox purchase.", "The user now appears in Paid Customer instead."]} />
      <Expect>Members move between the two segments as events arrive; you don’t need to rebuild anything.</Expect>
    </Step>
  </>;
}
