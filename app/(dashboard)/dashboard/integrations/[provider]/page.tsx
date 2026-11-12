import { notFound } from 'next/navigation';
import DashboardFrame from '@/components/dashboard/DashboardFrame';
import IntegrationPanel from '@/components/dashboard/IntegrationPanel';
import { CATALOG, isIntegration } from '@/components/integrations/catalog';

type Props = { params: { provider: string } };

/** Every integration's page (/dashboard/integrations/hubspot, /salesforce, /pipedrive, ...); unknown ids are a 404. */
export function generateMetadata({ params }: Props) {
  return { title: isIntegration(params.provider) ? `${CATALOG[params.provider].name} Integration — PixlPush` : 'Integrations — PixlPush' };
}

export function generateStaticParams() {
  return Object.keys(CATALOG).map((provider) => ({ provider }));
}

export default function IntegrationPage({ params }: Props) {
  if (!isIntegration(params.provider)) notFound();
  const { name, description } = CATALOG[params.provider];
  return (
    <DashboardFrame requiresProject active="Integrations" title={name} description={description}>
      <IntegrationPanel provider={params.provider} />
    </DashboardFrame>
  );
}
