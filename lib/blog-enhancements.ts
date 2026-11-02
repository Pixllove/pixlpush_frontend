export type BlogEnhancement = {
  inlineImages: Array<{ slug: string; caption: string }>;
  checklist: string[];
  faqs: Array<{ question: string; answer: string }>;
};

// Supporting content keeps each long-form guide useful, scannable and visually distinct.
export const blogEnhancements: Record<string, BlogEnhancement> = {
  'customer-engagement-strategy': {
    inlineImages: [
      { slug: 'email-customer-journey', caption: 'Coordinate email touchpoints with the customer journey instead of sending disconnected campaigns.' },
      { slug: 'customer-lifecycle-management', caption: 'A lifecycle view helps teams connect onboarding, engagement and retention into one experience.' },
    ],
    checklist: ['Define the customer outcome for every journey.', 'Document the event, audience and exit rule for each message.', 'Coordinate email, push and in-product communication.', 'Review retention and conversion by meaningful cohort.'],
    faqs: [
      { question: 'What is a customer engagement strategy?', answer: 'A customer engagement strategy is a coordinated plan for helping users receive value through product experiences, lifecycle messaging and timely support. It connects user behavior to the next useful action.' },
      { question: 'How do you measure customer engagement?', answer: 'Measure meaningful product behavior such as activation, repeat use, feature adoption, renewal and retention. Delivery, open and click metrics are useful diagnostics, but they should support a deeper customer outcome.' },
    ],
  },
  'ai-audience-segmentation': {
    inlineImages: [
      { slug: 'ai-marketing-tools-workflow', caption: 'AI can help discover patterns, but teams still need clear audience definitions and review rules.' },
      { slug: 'customer-retention-metrics-guide', caption: 'Audience quality improves when segments are connected to measurable lifecycle outcomes.' },
    ],
    checklist: ['Start with first-party behavioral signals.', 'Give every segment a clear business purpose.', 'Check AI-assisted membership before activation.', 'Refresh, document and retire segments as the product changes.'],
    faqs: [
      { question: 'What is AI audience segmentation?', answer: 'AI audience segmentation uses machine learning or AI-assisted analysis to identify meaningful patterns in customer behavior and attributes, then groups users for more relevant product or marketing experiences.' },
      { question: 'Is AI segmentation better than rule-based segmentation?', answer: 'Neither approach is always better. Rule-based segments are transparent and easy to audit, while AI can surface patterns that are difficult to find manually. Strong teams often use AI for discovery and explicit rules for activation.' },
    ],
  },
  'email-customer-journey': {
    inlineImages: [
      { slug: 'saas-onboarding-email-sequence', caption: 'An onboarding email sequence should help the customer reach first value one step at a time.' },
      { slug: 'customer-engagement-strategy', caption: 'Email performs best when it is part of a broader customer engagement strategy.' },
    ],
    checklist: ['Map the customer goal before writing email copy.', 'Define entry, exit and suppression conditions.', 'Use product events to trigger relevant messages.', 'Measure activation and retention, not clicks alone.'],
    faqs: [
      { question: 'What is an email customer journey?', answer: 'An email customer journey is a sequence of behavior-aware messages that supports a person from sign-up through activation, engagement and retention. It adapts to what the customer has already done.' },
      { question: 'How many emails should a customer journey include?', answer: 'There is no universal number. Start with the smallest sequence that removes the main obstacles, then add messages only when they support a distinct customer need or milestone.' },
    ],
  },
  'customer-journey-automation': {
    inlineImages: [
      { slug: 'customer-lifecycle-management', caption: 'Lifecycle stages give automated customer journeys a clear purpose and audience.' },
      { slug: 'push-notification-best-practices', caption: 'Channel selection and frequency controls keep automated journeys helpful rather than noisy.' },
    ],
    checklist: ['Choose one audience and outcome for the first flow.', 'Test entry, exit and suppression rules.', 'Set shared frequency limits across channels.', 'Review performance and unexpected paths after launch.'],
    faqs: [
      { question: 'What is customer journey automation?', answer: 'Customer journey automation connects behavioral signals to coordinated messages or product actions across a lifecycle. It helps users receive the right next step without relying on manual campaign scheduling.' },
      { question: 'Which automated journey should a SaaS team build first?', answer: 'Start with a high-friction moment such as onboarding, incomplete setup or feature adoption. The best first journey has a clear trigger, a measurable outcome and a simple exit condition.' },
    ],
  },
  'push-notification-best-practices': {
    inlineImages: [
      { slug: 'customer-journey-automation', caption: 'Push notifications should be one coordinated step inside a wider automated customer journey.' },
      { slug: 'email-customer-journey', caption: 'Use email and push together only when each channel adds a different kind of value.' },
    ],
    checklist: ['Explain the value before asking for notification permission.', 'Trigger push from a relevant user action or preference.', 'Use local time and frequency controls.', 'Deep-link to the exact screen promised by the message.'],
    faqs: [
      { question: 'What makes a push notification effective?', answer: 'An effective push notification is timely, specific and connected to a real user need. It explains the value clearly, respects permission and opens the exact product destination promised in the copy.' },
      { question: 'How often should an app send push notifications?', answer: 'Send only when the message improves the user experience. Set frequency caps, consider recent activity and stop reminders when the customer completes the underlying action.' },
    ],
  },
  'customer-lifecycle-management': {
    inlineImages: [
      { slug: 'customer-engagement-strategy', caption: 'Lifecycle management turns customer engagement into a consistent operating process.' },
      { slug: 'customer-retention-metrics-guide', caption: 'Retention metrics show whether customers are moving through lifecycle stages and receiving lasting value.' },
    ],
    checklist: ['Define lifecycle stages using observable behavior.', 'Assign a customer need to each stage.', 'Document shared signals across marketing and product.', 'Review movement between stages by cohort.'],
    faqs: [
      { question: 'What are the main customer lifecycle stages?', answer: 'Common stages include discovery, activation, engagement, retention and reactivation. The exact stages should reflect how customers receive value in your specific product.' },
      { question: 'Why does customer lifecycle management matter?', answer: 'It gives teams a shared view of changing customer needs. That makes onboarding, lifecycle marketing and retention work more coordinated and easier to measure.' },
    ],
  },
  'ai-marketing-tools-workflow': {
    inlineImages: [
      { slug: 'ai-audience-segmentation', caption: 'AI marketing workflows become more useful when audience context and human judgment stay visible.' },
      { slug: 'product-led-growth-feature-adoption', caption: 'Use AI to support feature education and campaign prioritization, not to replace product strategy.' },
    ],
    checklist: ['Give each AI tool one specific job.', 'Provide audience, product and brand context.', 'Review accuracy, privacy and brand voice before launch.', 'Measure time saved alongside customer outcomes.'],
    faqs: [
      { question: 'What are AI marketing tools best used for?', answer: 'They are useful for research summaries, feedback clustering, audience analysis, message variations, prioritization and first drafts. People should still own positioning, claims, approvals and final customer decisions.' },
      { question: 'How can teams keep AI-generated marketing on brand?', answer: 'Create a concise voice guide, provide approved examples and use a repeatable review checklist. Store feedback from approved and rejected drafts so the workflow improves over time.' },
    ],
  },
  'saas-onboarding-email-sequence': {
    inlineImages: [
      { slug: 'email-customer-journey', caption: 'A SaaS onboarding email sequence should follow real customer progress from sign-up to first value.' },
      { slug: 'product-led-growth-feature-adoption', caption: 'After activation, onboarding can transition into feature education and repeat usage.' },
    ],
    checklist: ['Set one activation goal for the sequence.', 'Give each email one obstacle or next step.', 'Personalize based on sign-up and product behavior.', 'Stop beginner emails as soon as the customer activates.'],
    faqs: [
      { question: 'What should a SaaS onboarding email sequence include?', answer: 'It should confirm the customer outcome, remove early setup obstacles, explain repeatable value and provide a clear help path. Each message should support one stage of activation.' },
      { question: 'How long should SaaS onboarding emails continue?', answer: 'Continue until the customer reaches the defined activation milestone or the sequence no longer adds value. Use behavior-based exit rules instead of a fixed calendar alone.' },
    ],
  },
  'product-led-growth-feature-adoption': {
    inlineImages: [
      { slug: 'ai-marketing-tools-workflow', caption: 'Use AI-assisted analysis to prioritize feature education around real customer needs.' },
      { slug: 'customer-lifecycle-management', caption: 'Feature adoption becomes a retention loop when it supports a customer lifecycle goal.' },
    ],
    checklist: ['Connect the feature to a current customer problem.', 'Use in-product guidance before adding another channel.', 'Measure second and third use, not only first click.', 'Combine product data with qualitative customer feedback.'],
    faqs: [
      { question: 'What is product-led growth feature adoption?', answer: 'It is the process of helping customers discover, try and repeatedly use product capabilities that solve an important job. Repeated value is more meaningful than a one-time feature click.' },
      { question: 'How do you measure feature adoption?', answer: 'Track time to first use, completion, repeated use, breadth of usage and the relationship between adoption and retention. Review results by customer segment and use case.' },
    ],
  },
  'customer-retention-metrics-guide': {
    inlineImages: [
      { slug: 'customer-lifecycle-management', caption: 'Lifecycle stages provide context for interpreting customer retention metrics.' },
      { slug: 'ai-audience-segmentation', caption: 'Segment and cohort analysis reveal where retention is improving or declining.' },
    ],
    checklist: ['Choose a retention outcome that represents customer value.', 'Add leading indicators such as activation and repeat use.', 'Review message metrics alongside product behavior.', 'Compare cohorts instead of relying on averages.'],
    faqs: [
      { question: 'What are the most important customer retention metrics?', answer: 'Useful metrics include retained customers, renewal, churn, repeat use, activation, feature adoption and cohort retention. The right set depends on how customers receive value from your product.' },
      { question: 'Why should retention metrics be measured by cohort?', answer: 'Cohorts show how behavior changes for customers who started at different times or came from different sources. This prevents averages from hiding a retention problem in one audience.' },
    ],
  },
};
