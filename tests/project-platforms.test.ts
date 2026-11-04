import { describe, expect, it } from 'vitest';
import { toggleProjectPlatform } from '@/lib/project-platforms';

describe('project push platform selection', () => {
  it('keeps Website and Mobile selected together', () => {
    expect(toggleProjectPlatform(['web'], 'mobile')).toEqual(['web', 'mobile']);
  });

  it('allows either platform to be removed while retaining one', () => {
    expect(toggleProjectPlatform(['web', 'mobile'], 'mobile')).toEqual(['web']);
    expect(toggleProjectPlatform(['web'], 'web')).toEqual(['web']);
  });
});
