import { redirect } from 'next/navigation';

export default function DataSyncSettingsPage() {
  redirect('/dashboard/integrations/webhook');
}
