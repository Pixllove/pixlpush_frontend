import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import IndustryLandingPage, { getIndustry, type IndustryKey } from '@/components/website/IndustryLandingPage';
import { SiteShell } from '@/components/website/SiteShell';

const industries: IndustryKey[] = ['gaming', 'media', 'ecommerce', 'mobile', 'financial'];

export function generateStaticParams() {
  return industries.map((industry) => ({ industry }));
}

export async function generateMetadata({ params }: { params: Promise<{ industry: string }> }): Promise<Metadata> {
  const { industry } = await params;
  const content = getIndustry(industry);
  if (!content) return { title: 'Industry solutions | PixlPush' };
  return {
    title: `PixlPush for ${content.name} | Customer Engagement`,
    description: content.intro,
    alternates: { canonical: `/industries/${industry}` },
    openGraph: { title: `PixlPush for ${content.name}`, description: content.intro, url: `/industries/${industry}`, type: 'website' },
  };
}

export default async function IndustryPage({ params }: { params: Promise<{ industry: string }> }) {
  const { industry } = await params;
  if (!industries.includes(industry as IndustryKey)) notFound();
  return <SiteShell><IndustryLandingPage industry={industry as IndustryKey} /></SiteShell>;
}
