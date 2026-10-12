import { describe, expect, it } from 'vitest';
import { buildInsights } from '@/components/dashboard/HomeCommandCenter';

const stats = { total: 1000, reachable: 900, eventsToday: 10, eventsYesterday: 50 };

describe('buildInsights', () => {
  it('says nothing before the numbers arrive or when they are healthy', () => {
    expect(buildInsights(undefined, 0)).toEqual([]);
    expect(buildInsights(stats, 2)).toEqual([]);
  });

  it('only prompts for users in an empty project', () => {
    expect(buildInsights({ ...stats, total: 0, reachable: 0 }, 0).map((i) => i.title)).toEqual(['No users in this project yet']);
  });

  it('flags unreachable users, a quiet SDK and no running journey from the real counts', () => {
    const titles = buildInsights({ total: 1000, reachable: 600, eventsToday: 0, eventsYesterday: 0 }, 0).map((i) => i.title);
    expect(titles).toEqual(['40% of users cannot be reached', 'No events in the last two days', 'No journey is running']);
  });

  it('compares today with yesterday only once today is ahead', () => {
    expect(buildInsights({ ...stats, eventsToday: 60 }, 1).map((i) => i.tone)).toEqual(['success']);
  });
});
