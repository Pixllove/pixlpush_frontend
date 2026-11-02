import type { BlogSection } from '@/lib/blog-articles';

// Long-form sections add practical depth without making the shared page template repetitive.
export const blogDepth: Record<string, BlogSection[]> = {
  'customer-engagement-strategy': [
    {
      heading: 'Create a customer engagement operating model',
      paragraphs: [
        'A customer engagement strategy becomes easier to execute when each journey has a clear owner, audience definition and success metric. Create a simple operating model that records the trigger, customer problem, message, destination, suppression rule and next review date. This gives marketing, product and customer success teams one shared reference instead of separate campaign plans.',
        'Start with the highest-value moments in the customer experience. For a SaaS product, that may be workspace setup, inviting a teammate or reaching a first report. For a mobile app, it may be completing a profile, saving a preference or returning for a second session. The channel is secondary to the customer outcome.',
      ],
      bullets: ['Journey owner: the person accountable for quality and maintenance.', 'Primary signal: the behavior that makes the journey relevant.', 'Customer outcome: the progress the user should make.', 'Review cadence: when the team checks performance and data quality.'],
    },
    {
      heading: 'Move from campaign metrics to customer value',
      paragraphs: [
        'Engagement reporting should connect message activity to product value. Build a measurement path from delivery to interaction, from interaction to the intended action and from that action to retained behavior. This makes it easier to explain why a customer engagement campaign matters and which part of the experience needs improvement.',
        'Use holdout groups or cohort comparisons when the volume supports it. A message may generate clicks while having little effect on activation or retention. Comparing customers who received the journey with a suitable control helps separate correlation from meaningful improvement and protects the team from optimizing for activity alone.',
      ],
    },
  ],
  'ai-audience-segmentation': [
    {
      heading: 'Build an AI segmentation workflow your team can trust',
      paragraphs: [
        'A reliable AI audience segmentation workflow has four stages: collect trustworthy first-party events, explore patterns, translate useful patterns into understandable definitions and validate the audience before activation. Keep a record of the inputs, time window, model or analysis method and the customer action that the segment is meant to support.',
        'Use AI to help discover combinations such as repeated feature attempts followed by support activity, or high-intent users who have not completed setup. Then turn the insight into an activation rule that a teammate can read and challenge. This combination of machine-assisted discovery and human-readable logic is easier to govern than an opaque label.',
      ],
      bullets: ['Check segment size and freshness before every high-impact campaign.', 'Compare predicted membership with real product behavior.', 'Create an exclusion rule for users who already completed the goal.', 'Document why the audience exists and when it should be retired.'],
    },
    {
      heading: 'Avoid bias and audience fatigue in predictive segments',
      paragraphs: [
        'Predictive audience targeting can amplify gaps in the data used to train or define it. Review whether some customers are systematically overrepresented, excluded or assigned to a message that does not fit their context. Avoid using sensitive assumptions when a direct behavioral signal can answer the business question more respectfully.',
        'Also monitor the experience after activation. A segment can be statistically accurate and still create audience fatigue if the same people qualify for too many journeys. Apply frequency controls, allow people to leave a segment when their behavior changes and review opt-outs, complaints and conversion quality alongside model performance.',
      ],
    },
  ],
  'email-customer-journey': [
    {
      heading: 'Turn an email journey map into lifecycle automation',
      paragraphs: [
        'Once the email customer journey is mapped, translate each moment into a small automation specification. Define the event that starts the journey, the customer state required to enter, the message purpose, the action to measure and the event that ends or changes the sequence. This prevents email automation from becoming a collection of disconnected drips.',
        'Use progressive education rather than repeating the same product explanation. A new customer may need setup guidance first, then a use-case example, then an invitation to adopt a related feature. The journey should become more specific as the customer gives you more behavioral information.',
      ],
      bullets: ['Use a single clear call to action in each lifecycle email.', 'Make the landing screen match the promise in the subject and body.', 'Suppress messages when a customer completes the intended action.', 'Keep preference and unsubscribe controls easy to find.'],
    },
    {
      heading: 'Improve deliverability and email experience together',
      paragraphs: [
        'Email marketing automation depends on more than good copy. Maintain permission records, remove invalid addresses, monitor bounce and complaint signals and avoid sending to people who have not shown a reasonable relationship with the product. A clean audience improves both deliverability and the quality of journey measurement.',
        'Review the complete experience on mobile, test links and confirm that event data arrives before a trigger is allowed to send. A technically correct email can still fail if the customer lands in the wrong workspace, sees an expired offer or receives a reminder after finishing the task.',
      ],
    },
  ],
  'customer-journey-automation': [
    {
      heading: 'Design automation with clear states and transitions',
      paragraphs: [
        'The strongest automated customer journeys behave like a state model. A user is in a known condition—new, activated, at risk or renewing—and a reliable event moves them to the next condition. Messages should help with that transition, not merely announce that the team noticed it.',
        'Write the journey logic in plain language before building it. For example: “When a new workspace has not invited a teammate after three days, offer a collaborative setup example; exit when an invitation is sent.” Plain-language logic exposes missing conditions and makes future maintenance much easier.',
      ],
      bullets: ['Entry condition: who is eligible now?', 'Decision point: what behavior changes the next step?', 'Exit condition: when should all reminders stop?', 'Fallback: what happens when data or consent is unavailable?'],
    },
    {
      heading: 'Diagnose automation drop-off and message fatigue',
      paragraphs: [
        'When a customer journey automation underperforms, inspect the path rather than only the final conversion rate. Look for an oversized audience, a delayed event, an unclear destination, a branch that nobody reaches or a message that arrives after the customer has solved the problem another way.',
        'Track the number of people entering each step, completing the intended action, being suppressed and opting out. These journey diagnostics show whether the problem is targeting, timing, content or product friction. Fix the smallest bottleneck first, then re-evaluate the full flow.',
      ],
    },
  ],
  'push-notification-best-practices': [
    {
      heading: 'Build a respectful push notification strategy',
      paragraphs: [
        'A push notification strategy should define which events are important enough to interrupt a person, which events can wait for the next app session and which should be delivered through email or in-product messaging instead. This channel policy protects attention and gives campaign teams a consistent standard for deciding what deserves a push.',
        'Use the customer’s local time, recent activity, device status and notification preferences when possible. A relevant message sent at the wrong moment can still feel intrusive. If the event is not urgent, use a quiet delivery window or combine it with another useful update.',
      ],
      bullets: ['Permission: explain the benefit before requesting access.', 'Relevance: connect the message to a known action or preference.', 'Timing: send when the customer can reasonably act.', 'Destination: open the exact screen that completes the promise.'],
    },
    {
      heading: 'Test push notifications beyond open rate',
      paragraphs: [
        'Open rate can show whether a notification was noticed, but it cannot tell you whether the interruption created value. Track downstream behavior such as completed setup, saved content, returned sessions, resolved tasks or subscription actions. Compare these outcomes with a control group when possible.',
        'Test one variable at a time: the trigger, message angle, send window, deep link or audience definition. Review results by platform, lifecycle stage and consent state. A message that works for active users may be a poor fit for someone who has not opened the product in weeks.',
      ],
    },
  ],
  'customer-lifecycle-management': [
    {
      heading: 'Create a lifecycle model that teams can activate',
      paragraphs: [
        'A lifecycle model is useful when a team can identify a customer’s current stage from reliable data and choose an appropriate next action. Define each stage with observable behavior, not vague labels. “Activated” might mean creating a project and returning within seven days; “at risk” might mean a sustained decline after previously repeated use.',
        'Give each stage a message strategy, product experience and owner. This makes customer lifecycle management more than a reporting framework. It becomes a way to coordinate onboarding content, feature education, support outreach and retention campaigns around the same customer reality.',
      ],
      bullets: ['Stage definition: what behavior proves the stage?', 'Customer need: what help is useful now?', 'Experience: which product or message should respond?', 'Exit signal: what behavior shows progress or change?'],
    },
    {
      heading: 'Use lifecycle analysis to prioritize retention work',
      paragraphs: [
        'Lifecycle analysis helps teams find where customers lose momentum. Compare stage conversion by cohort, plan, use case and acquisition source. If many users reach activation but fail to become repeat users, the next investment may be feature education or product habit formation rather than more acquisition traffic.',
        'Review lifecycle definitions whenever the product changes. New features, pricing plans and onboarding flows can alter the behavior that signals value. Keeping the model current ensures lifecycle marketing remains connected to the actual product experience.',
      ],
    },
  ],
  'ai-marketing-tools-workflow': [
    {
      heading: 'Use AI marketing tools across the campaign workflow',
      paragraphs: [
        'A practical AI marketing workflow separates exploration from approval. Use AI to summarize customer research, identify themes in feedback, propose audience hypotheses and create multiple message drafts. Then ask a person to verify claims, select the strongest angle and adapt the copy to the customer’s actual context.',
        'Keep a reusable input brief for each workflow: audience, lifecycle stage, product behavior, desired outcome, channel, constraints and examples of approved language. Better inputs reduce generic output and make it easier for reviewers to understand why a draft was produced.',
      ],
      bullets: ['Research: summarize evidence and identify patterns.', 'Prioritization: rank opportunities against customer impact.', 'Drafting: create variants within a defined voice and format.', 'Review: check truth, usefulness, accessibility and privacy.'],
    },
    {
      heading: 'Set governance for AI-assisted marketing content',
      paragraphs: [
        'Document which data can be used in AI workflows, which claims require a human reviewer and which outputs are not allowed to go directly to customers. This is especially important for personalized marketing, where a useful workflow still needs clear consent, retention and access controls.',
        'Measure whether AI improves the process rather than rewarding volume. Track time to first draft, approval cycles, revisions, campaign quality and customer outcomes. If the team produces more content but creates more message fatigue, narrow the use case and improve the review standard.',
      ],
    },
  ],
  'saas-onboarding-email-sequence': [
    {
      heading: 'Match every onboarding email to a product milestone',
      paragraphs: [
        'The most effective SaaS onboarding email sequence mirrors the customer’s progress in the product. Send setup guidance when a decision is pending, an example when the customer has enough context to understand it and a next-step prompt after the first success. This creates continuity between the inbox and the product.',
        'Use customer attributes carefully. A role, use case or selected goal can change the most useful example, but behavior should always take priority when it shows what the customer actually needs. Stop or branch the sequence as soon as the customer reaches the milestone it was designed to support.',
      ],
      bullets: ['Email 1: confirm the promised outcome and first action.', 'Email 2: remove the most common setup obstacle.', 'Email 3: demonstrate a useful workflow or template.', 'Email 4+: adapt to progress, inactivity or a request for help.'],
    },
    {
      heading: 'Improve activation with onboarding experiments',
      paragraphs: [
        'Choose one activation event and use the onboarding sequence to improve the rate at which new customers reach it. Test the message order, call to action, example, send delay or product destination, but keep the customer outcome constant so the result is interpretable.',
        'Look beyond the first click. A successful onboarding email should increase completed setup, first value and early repeat use. Review activation by signup cohort and customer type, then update the sequence when the product or the main source of friction changes.',
      ],
    },
  ],
  'product-led-growth-feature-adoption': [
    {
      heading: 'Connect feature discovery to a real job to be done',
      paragraphs: [
        'Feature adoption grows when the customer recognizes a problem before being shown a capability. Use product behavior to identify that problem, then introduce the feature as a practical solution. A team that has reached a usage limit may need a collaboration workflow; a customer reviewing results may need a reporting feature.',
        'The experience should make the first use feel safe and achievable. Provide a sample, preview, template or guided step where appropriate. Avoid presenting every option at once. Product-led growth depends on reducing the time between discovery and useful outcome.',
      ],
      bullets: ['Identify the job, bottleneck or goal before choosing the feature message.', 'Show the feature at the moment the problem is visible.', 'Guide the first use with a concrete example.', 'Follow up with education only when it supports the next step.'],
    },
    {
      heading: 'Turn feature adoption into a retention loop',
      paragraphs: [
        'A feature is part of a retention loop when customers use it repeatedly because it improves an important workflow. Measure the path from exposure to first use, successful completion, second use and habitual use. If customers stop after the first attempt, investigate usability, output quality and whether the feature solves a problem they actually have.',
        'Combine quantitative adoption data with customer interviews, support requests and session observations. This evidence helps teams decide whether to improve education, simplify the product or change the feature’s position in the customer journey.',
      ],
    },
  ],
  'customer-retention-metrics-guide': [
    {
      heading: 'Build a retention measurement framework',
      paragraphs: [
        'Start with a retention definition that reflects how customers receive value. A collaboration product may measure retained workspaces or active teams; a subscription product may focus on renewal; a consumer app may measure meaningful repeat use. The definition should be specific enough to guide product and lifecycle decisions.',
        'Then connect the outcome to leading indicators. Activation, feature adoption, frequency, support friction and message exposure can help explain why retention changes. Document the time window, cohort rule and calculation for every metric so teams do not compare incompatible numbers.',
      ],
      bullets: ['Outcome metric: what retained value looks like.', 'Leading indicator: what behavior predicts the outcome.', 'Cohort: which customers are being compared.', 'Decision: what action the team will take from the result.'],
    },
    {
      heading: 'Use retention metrics to improve lifecycle campaigns',
      paragraphs: [
        'Lifecycle marketing should use retention metrics to choose where intervention is most useful. If activation is weak, improve onboarding and first value. If repeat usage drops after a feature change, investigate education and product friction. If renewal is strong but expansion is low, focus on use-case depth instead of sending more generic engagement messages.',
        'Create a regular review that combines product analytics, campaign performance and qualitative customer evidence. The goal is not to report more numbers; it is to select the next experiment that can make the customer experience more valuable and durable.',
      ],
    },
  ],
};
