import { Suspense } from 'react';
import JourneyBuilder from '@/components/dashboard/JourneyBuilder';

export default function JourneyBuilderPage() {
  return <Suspense fallback={null}><JourneyBuilder /></Suspense>;
}
