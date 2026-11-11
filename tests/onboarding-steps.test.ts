import { describe, expect, it } from 'vitest';
import { onboardingStepsOf } from '@/lib/onboarding';

describe('channel-derived onboarding steps', () => {
  const kinds = (platforms: Array<'web' | 'mobile'>, channels: string[]) =>
    onboardingStepsOf(platforms, channels).map((step) => step.kind);

  it.each([
    [['web'], ['web-push'], ['basics', 'products', 'channels', 'web-sdk']],
    [['web'], ['email'], ['basics', 'products', 'channels', 'domain']],
    [['web'], ['email', 'web-push'], ['basics', 'products', 'channels', 'domain', 'web-sdk']],
    [['mobile'], ['email'], ['basics', 'products', 'channels', 'domain']],
    [['mobile'], ['email', 'mobile-push'], ['basics', 'products', 'channels', 'domain', 'mobile-push', 'app-sdk']],
    [['mobile'], ['mobile-push'], ['basics', 'products', 'channels', 'mobile-push', 'app-sdk']],
    [['web', 'mobile'], ['email', 'web-push', 'mobile-push'], ['basics', 'products', 'channels', 'domain', 'mobile-push', 'app-sdk', 'web-sdk']],
  ])('maps %o + %o to the requested step order', (platforms, channels, expected) => {
    expect(kinds(platforms as Array<'web' | 'mobile'>, channels as string[])).toEqual(expected);
  });

  it('shows only the first three steps before channels are selected', () => {
    expect(onboardingStepsOf(['web', 'mobile'], []).map((step) => step.title)).toEqual([
      'Project basics',
      'Your products',
      'Channels',
    ]);
  });
});
