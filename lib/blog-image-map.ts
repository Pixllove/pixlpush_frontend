export type BlogImage = {
  src: string;
  alt: string;
  tone: string;
};

// Keep blog imagery in one place so list cards and article pages never drift apart.
export const blogImageMap: Record<string, BlogImage> = {
  'customer-engagement-strategy': { src: '/assets/blog-customer-engagement-v5.png', alt: 'Bright editorial illustration of a marketer planning customer engagement with email, push notifications and analytics', tone: '#ff9b63' },
  'ai-audience-segmentation': { src: '/assets/blog-ai-audience-v5.png', alt: 'Bright editorial illustration of AI audience segmentation with customer groups, a target and growth analytics', tone: '#7f8dff' },
  'email-customer-journey': { src: '/assets/blog-email-journey-v5.png', alt: 'Bright editorial illustration of an email customer journey moving from onboarding to retention', tone: '#ff7d67' },
  'customer-journey-automation': { src: '/assets/blog-journey-automation-v5.png', alt: 'Bright editorial illustration of customer journey automation with triggers, decisions and message steps', tone: '#ffb35b' },
  'push-notification-best-practices': { src: '/assets/blog-push-notifications-v5.png', alt: 'Bright editorial illustration of push notification best practices on a mobile phone', tone: '#ff9b5e' },
  'customer-lifecycle-management': { src: '/assets/blog-lifecycle-v5.png', alt: 'Bright editorial illustration of customer lifecycle management from onboarding through retention', tone: '#c19bff' },
  'ai-marketing-tools-workflow': { src: '/assets/blog-ai-tools-v5.png', alt: 'Bright editorial illustration of an AI marketing tools workflow for research, content and campaigns', tone: '#8b7cff' },
  'saas-onboarding-email-sequence': { src: '/assets/blog-saas-onboarding-v5.png', alt: 'Bright editorial illustration of a SaaS onboarding email sequence and first-value checklist', tone: '#ff8a67' },
  'product-led-growth-feature-adoption': { src: '/assets/blog-feature-adoption-v5.png', alt: 'Bright editorial illustration of product-led growth and feature adoption moving toward retention', tone: '#ffc85a' },
  'customer-retention-metrics-guide': { src: '/assets/blog-retention-metrics-v5.png', alt: 'Bright editorial illustration of customer retention metrics, cohorts and lifecycle analytics', tone: '#9b8cff' },
};
