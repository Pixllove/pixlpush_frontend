import { Suspense } from 'react';
import JourneyBuilder from '@/components/dashboard/JourneyBuilder';

export const metadata = { title: 'Journey Builder — PixlPush' };

export default function JourneyBuilderPage() {
  return <Suspense fallback={null}><JourneyBuilder /></Suspense>;
}
