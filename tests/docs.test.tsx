import { existsSync, readFileSync } from 'node:fs';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CodeBlock from '@/components/docs/CodeBlock';
import CodeTabs from '@/components/docs/CodeTabs';
import { DocsProjectProvider } from '@/components/docs/DocsProject';
import { searchDocs } from '@/components/docs/DocsSearchDialog';
import { configOptions, documentedMethodNames, errorCodes, internalOptions } from '@/components/docs/react-native/content';
import { reactNativeGuides } from '@/components/docs/react-native/guides-operate';
import { flutterGuides } from '@/components/docs/flutter/guides';
import { availablePlatforms, buildSearchIndex, getPlatform, guideHref, platforms } from '@/components/docs/registry';

const push = vi.fn();
let pathname = '/docs/react-native/quickstart';
vi.mock('next/navigation', () => ({ usePathname: () => pathname, useRouter: () => ({ push }) }));

Element.prototype.scrollIntoView = () => {};
const BACKEND = '/Users/apple/Job/pixlpush_backend/packages/react-native/src';

describe('platform registry', () => {
  it('only lists guides for available platforms, each with a renderer and unique section ids', () => {
    for (const platform of platforms.filter((p) => p.status === 'coming-soon')) expect(platform.guides).toBeUndefined();
    const rn = getPlatform('react-native')!;
    expect(new Set(rn.guides!.map((g) => g.slug)).size).toBe(rn.guides!.length);
    for (const guide of rn.guides!) {
      expect(reactNativeGuides[guide.slug], guide.slug).toBeDefined();
      expect(rn.groups).toContain(guide.group);
      expect(new Set(guide.sections.map((s) => s.id)).size).toBe(guide.sections.length);
    }
  });

  it('builds base-aware URLs so a new platform needs no routing changes', () => {
    expect(guideHref('/docs', 'react-native')).toBe('/docs/react-native');
    expect(guideHref('/dashboard/integrations', 'react-native', 'push', 'tokens')).toBe('/dashboard/integrations/react-native/push#tokens');
    expect(availablePlatforms.map((p) => p.id)).toEqual(['react-native', 'flutter']);
  });

  it('registers every Flutter guide renderer and section', () => {
    const flutter = getPlatform('flutter')!;
    expect(new Set(flutter.guides!.map((g) => g.slug)).size).toBe(flutter.guides!.length);
    for (const guide of flutter.guides!) {
      expect(flutterGuides[guide.slug], guide.slug).toBeDefined();
      expect(new Set(guide.sections.map((s) => s.id)).size).toBe(guide.sections.length);
    }
  });
});

describe('every guide renders its deep-linkable sections in heading order', () => {
  for (const guide of getPlatform('react-native')!.guides!) {
    it(guide.slug || 'overview', () => {
      const Guide = reactNativeGuides[guide.slug];
      const { container } = render(<Guide base="/docs" />);
      for (const section of guide.sections) expect(container.querySelector(`#${CSS.escape(section.id)}`), section.id).not.toBeNull();
      const levels = [...container.querySelectorAll('h1,h2,h3,h4')].map((h) => Number(h.tagName[1]));
      levels.forEach((level, i) => expect(level - (levels[i - 1] ?? 2)).toBeLessThanOrEqual(1));
    });
  }
});

describe('content', () => {
  it('warns that server credentials never ship and names the exact Firebase files', () => {
    const Firebase = reactNativeGuides.firebase;
    render(<Firebase base="/docs" />);
    expect(screen.getByText(/Never put the .p8 or the service-account JSON in your app/)).toBeInTheDocument();
    expect(screen.getAllByText((_, el) => el?.tagName === 'LI' && /Firebase Cloud Messaging API Admin/.test(el.textContent ?? '')).length).toBeGreaterThan(0);
    expect(screen.getAllByText((_, el) => el?.tagName === 'LI' && /Project settings → Firebase \/ FCM/.test(el.textContent ?? '')).length).toBeGreaterThan(0);
    for (const label of ['Connect Firebase', 'Choose JSON file', 'Validate and connect', 'Token sync']) expect(document.body.textContent, label).toContain(label);
    for (const file of ['google-services.json', 'GoogleService-Info.plist', 'android/app/build.gradle', 'ios/Podfile', 'app.config.js', 'firebase.json']) {
      expect(screen.getAllByText((_, el) => el?.textContent?.includes(file) ?? false).length, file).toBeGreaterThan(0);
    }
  });

  it('documents the SDK key lifecycle', () => {
    const Keys = reactNativeGuides['sdk-keys'];
    render(<Keys base="/docs" />);
    expect(screen.getByText(/shown once/)).toBeInTheDocument();
    expect(screen.getAllByText(/SDK_KEY_PROJECT_MISMATCH/).length).toBeGreaterThan(0);
    expect(screen.getByText(/owners/)).toBeInTheDocument();
  });

  it.skipIf(!existsSync(BACKEND))('documents exactly the public methods the SDK exports', () => {
    const source = readFileSync(`${BACKEND}/core/client.ts`, 'utf8') + readFileSync(`${BACKEND}/react-native-sdk.ts`, 'utf8');
    const publicMethods = new Set([...source.matchAll(/^ {2}(?:override )?(?:async )?([a-zA-Z]+)(?:<[^>]+>)?\(/gm)].map((m) => m[1]));
    expect(new Set(documentedMethodNames)).toEqual(publicMethods);
  });

  it.skipIf(!existsSync(BACKEND))('documents every configuration option and error code', () => {
    const types = readFileSync(`${BACKEND}/core/types.ts`, 'utf8');
    const config = types.slice(types.indexOf('interface PixlPushConfig'), types.indexOf('interface PixlPushStatus'));
    expect(new Set([...configOptions, ...internalOptions].map(([name]) => name))).toEqual(new Set([...config.matchAll(/^ {2}(\w+)\??:/gm)].map((m) => m[1])));
    const errors = readFileSync(`${BACKEND}/core/errors.ts`, 'utf8');
    expect(new Set(errorCodes.map(([code]) => code))).toEqual(new Set([...errors.matchAll(/\| '([A-Z_]+)'/g)].map((m) => m[1])));
  });
});

describe('backend URL flow', () => {
  it('never shows apiBaseUrl in setup code or the options table', () => {
    expect(configOptions.map(([name]) => name)).not.toContain('apiBaseUrl');
    const Install = reactNativeGuides.installation;
    render(<Install base="/docs" />);
    expect(screen.getByText(/The SDK key decides where data goes/)).toBeInTheDocument();
    for (const pre of document.querySelectorAll('pre')) expect(pre.textContent).not.toContain('apiBaseUrl');
  });
});

describe('search', () => {
  const index = buildSearchIndex('/docs');
  it('finds methods, error codes and Firebase files', () => {
    expect(searchDocs(index, 'google-services.json')[0].id).toMatch(/^\/docs\/react-native\/firebase#/);
    expect(searchDocs(index, 'service account json')[0].id).toBe('/docs/react-native/firebase#service-account');
    expect(searchDocs(index, 'paywall').map((r) => r.id)).toContain('/docs/react-native/paywall-segment');
    expect(searchDocs(index, 'SDK_KEY_INVALID').map((r) => r.id)).toContain('/docs/react-native/reference#errors');
    expect(searchDocs(index, 'syncPushToken')[0].id).toMatch(/push|reference/);
    expect(searchDocs(index, 'zzz-nothing')).toEqual([]);
  });
  it('shows only pages for an empty query and requires every term', () => {
    expect(searchDocs(index, '').every((r) => !r.id.includes('#'))).toBe(true);
    expect(searchDocs(index, 'reset logout').every((r) => `${r.label} ${r.hint} ${r.keywords}`.toLowerCase().includes('reset'))).toBe(true);
  });
});

describe('CodeBlock', () => {
  const writeText = vi.fn();
  beforeEach(() => { writeText.mockReset(); Object.assign(navigator, { clipboard: { writeText } }); });

  it('copies the exact code — no line numbers — and announces it', async () => {
    writeText.mockResolvedValue(undefined);
    const code = 'const a = 1;\nconst b = 2;\nconst c = 3;\nconst d = 4;';
    render(<CodeBlock code={code} filename="a.ts" />);
    const button = screen.getByRole('button', { name: 'Copy a.ts' });
    await act(async () => { fireEvent.click(button); });
    expect(writeText).toHaveBeenCalledWith(code);
    expect(screen.getByRole('status')).toHaveTextContent('Copied to clipboard');
    expect(button).toHaveTextContent('Copied');
  });

  it('shows a failure state when the clipboard is unavailable', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    render(<CodeBlock code="x" language="Shell" />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy Shell' })); });
    expect(screen.getByRole('status')).toHaveTextContent('Copy failed');
  });

  it('substitutes the project slug identically in what is shown and copied', async () => {
    writeText.mockResolvedValue(undefined);
    render(<DocsProjectProvider projectId="acme-123"><CodeBlock code={'PROJECT_ID=YOUR_PROJECT_ID'} language="Environment" /></DocsProjectProvider>);
    expect(screen.getByLabelText('Environment code')).toHaveTextContent('PROJECT_ID=acme-123');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy Environment' })); });
    expect(writeText).toHaveBeenCalledWith('PROJECT_ID=acme-123');
  });
});

describe('segment guides', () => {
  it('build segments with the real rules: no exclusion, oldest segment first', () => {
    const Paywall = reactNativeGuides['paywall-segment'];
    render(<Paywall base="/docs" />);
    expect(screen.getByText(/Segments can’t exclude events/)).toBeInTheDocument();
    expect(document.body.textContent).toContain('Create segment');
    expect(document.body.textContent).toContain('Paid Customer');
  });
  it('steers away from app_closed toward the automatic app_backgrounded', () => {
    const Engagement = reactNativeGuides['engagement-segment'];
    render(<Engagement base="/docs" />);
    expect(screen.getByText(/Don’t track app_closed/)).toBeInTheDocument();
    expect(screen.getAllByText('app_backgrounded').length).toBeGreaterThan(0);
  });
});

describe('tokenize', () => {
  it('colours calls, properties, strings and keywords without touching shell text', async () => {
    const { tokenize } = await import('@/components/docs/CodeBlock');
    const kinds = Object.fromEntries(tokenize('await PixlPush.track("x", { plan: 1 });', 'TypeScript').filter(([k]) => k).map(([k, t]) => [t, k]));
    expect(kinds).toMatchObject({ await: 'keyword', PixlPush: 'type', track: 'fn', '"x"': 'string', plan: 'property', 1: 'number' });
    expect(tokenize('npm install @react-native-async-storage/async-storage', 'Shell').every(([k]) => k === null)).toBe(true);
    expect(tokenize('{ "project_id": "abc" }', 'JSON').find(([, t]) => t === '"project_id"')?.[0]).toBe('property');
  });
});

describe('CodeTabs', () => {
  afterEach(() => localStorage.clear());
  it('switches tabs, keeps grouped tabs in sync, and remembers the choice', () => {
    render(<><CodeTabs label="First" group="pm" options={{ npm: 'npm i x', yarn: 'yarn add x' }} /><CodeTabs label="Second" group="pm" options={{ npm: 'npm i y', yarn: 'yarn add y' }} /></>);
    fireEvent.click(within(screen.getByRole('tablist', { name: 'First' })).getByRole('tab', { name: 'yarn' }));
    expect(screen.getByText('yarn add x')).toBeInTheDocument();
    expect(screen.getByText('yarn add y')).toBeInTheDocument();
    expect(localStorage.getItem('pp-docs-tab:pm')).toBe('yarn');
  });

  it('moves between tabs with the arrow keys and copies the visible variant', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<CodeTabs label="Manager" options={{ npm: 'npm i z', yarn: 'yarn add z' }} />);
    const npm = screen.getByRole('tab', { name: 'npm' });
    fireEvent.keyDown(npm, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'yarn' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('yarn add z');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy yarn Shell' })); });
    expect(writeText).toHaveBeenCalledWith('yarn add z');
  });
});

describe('DocsLayout', () => {
  beforeEach(() => { push.mockReset(); pathname = '/docs/react-native/quickstart'; });
  const renderLayout = async () => { const { default: DocsLayout } = await import('@/components/docs/DocsLayout'); return render(<DocsLayout base="/docs" variant="site"><p>content</p></DocsLayout>); };

  it('marks the current guide in the navigation', async () => {
    await renderLayout();
    const current = screen.getAllByRole('link', { current: 'page' });
    expect(current[0]).toHaveTextContent('Quickstart');
    expect(current[0]).toHaveAttribute('href', '/docs/react-native/quickstart');
  });

  it('opens the mobile drawer with the menu button', async () => {
    await renderLayout();
    fireEvent.click(screen.getByRole('button', { name: 'Open documentation menu' }));
    expect(screen.getByRole('button', { name: 'Close documentation menu' })).toBeInTheDocument();
  });

  it('opens search with Cmd/Ctrl+K and navigates with the keyboard', async () => {
    vi.useFakeTimers();
    await renderLayout();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = screen.getByRole('combobox', { name: 'Search documentation' });
    fireEvent.change(input, { target: { value: 'apns' } });
    act(() => { vi.advanceTimersByTime(150); });
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/docs\/react-native\/firebase/));
    vi.useRealTimers();
  });
});
