import { redirect } from 'next/navigation';

/** The old "Advanced tools" page; its tools are now tabs on the Webhook page. */
export default function WebhookAdvancedPage() {
  redirect('/dashboard/integrations/webhook');
}
