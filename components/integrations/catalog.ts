import type { IntegrationProvider } from '@/types/project';

/**
 * Plain data about every integration, readable on the server (page titles,
 * unknown ids -> 404). Logos, texts and the connect form are in ./registry.tsx.
 * A new integration: add it here and in ./registry.tsx, plus the backend adapter.
 */
export const CATALOG: Record<IntegrationProvider, { name: string; category: string; description: string }> = {
  hubspot: { name: 'HubSpot', category: 'CRM', description: 'Two-way contact sync between HubSpot and this Project.' },
  salesforce: { name: 'Salesforce', category: 'CRM', description: 'Two-way sync between Salesforce Contacts and Leads and this Project.' },
  pipedrive: { name: 'Pipedrive', category: 'CRM', description: 'Two-way sync between Pipedrive people and this Project.' },
};

export const isIntegration = (id: string): id is IntegrationProvider => id in CATALOG;
