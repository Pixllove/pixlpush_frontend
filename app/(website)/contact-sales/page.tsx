import type { Metadata } from 'next';
import ContactSalesForm from '@/components/website/ContactSalesForm';

export const metadata: Metadata = {
  title: 'Contact PixlPush Sales | Enterprise Customer Engagement Plans',
  description: 'Talk with the PixlPush sales team about enterprise customer engagement, AI marketing, email automation, push notifications, integrations, and tailored support.',
};

export default function ContactSalesPage() {
  return <ContactSalesForm />;
}
