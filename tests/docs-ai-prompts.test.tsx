import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AiPromptTabs from '@/components/docs/AiPromptTabs';

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/docs/php/ai-setup' }));
import { aiPromptFor, aiPrompts, DOCS_ORIGIN } from '@/components/docs/ai-prompts';
import { availablePlatforms, getGuide } from '@/components/docs/registry';
import versions from '@/components/docs/sdk-versions.json';
import * as flutter from '@/components/docs/flutter/content';
import * as php from '@/components/docs/php/content';
import * as web from '@/components/docs/web/content';
import * as reactNative from '@/components/docs/react-native/content';
import { GET as promptFile } from '@/app/ai-prompts/[file]/route';
import { GET as llms } from '@/app/llms.txt/route';

const VERSION: Record<string, string> = {
  'react-native': versions.reactNative, flutter: versions.flutter, web: versions.web, php: versions.php, wordpress: versions.wordpress,
};

describe('AI setup prompts', () => {
  it('every docs platform has its own prompt and an AI agent setup page', () => {
    expect(aiPrompts.map((p) => p.platformId).sort()).toEqual(availablePlatforms.map((p) => p.id).sort());
    for (const platform of availablePlatforms) expect(getGuide(platform.id, 'ai-setup'), platform.id).toBeDefined();
    expect(new Set(aiPrompts.map((p) => p.prompt)).size).toBe(aiPrompts.length);
  });

  it('each prompt names its current published version, links its docs and defers to the installed package', () => {
    for (const item of aiPrompts) {
      expect(item.version).toBe(VERSION[item.platformId]);
      expect(item.prompt).toContain(item.version);
      expect(item.prompt).toContain(`${DOCS_ORIGIN}/docs/${item.platformId}`);
      expect(item.prompt).toMatch(/follow the installed package/);
      expect(item.prompt).toMatch(/<manual_steps>[\s\S]+<\/manual_steps>/);
    }
  });

  it('lists every documented method, so a new SDK method reaches the prompt with its docs', () => {
    const documented: Record<string, string[]> = {
      web: Object.values(web.methods).flat().map(([name]) => name),
      flutter: Object.values(flutter.methods).flat().map(([name]) => name),
      php: php.methods.map(([name]) => name),
      'react-native': Object.values(reactNative.methods).flat().map((m) => m.signature || m.name),
    };
    for (const [platformId, names] of Object.entries(documented)) {
      const prompt = aiPromptFor(platformId)!.prompt;
      for (const name of names) expect(prompt, `${platformId}: ${name}`).toContain(name);
    }
  });

  it('uses the same code as the guides', () => {
    expect(aiPromptFor('flutter')!.prompt).toContain(flutter.code.initialize);
    expect(aiPromptFor('php')!.prompt).toContain(php.code.identify);
    expect(aiPromptFor('web')!.prompt).toContain(web.code.env);
  });
});

describe('AI prompt tabs on the AI agent setup page', () => {
  it('shows a tab for every SDK, starts on the page’s stack, and switching moves the docs to that stack', async () => {
    const { container } = render(<AiPromptTabs initial="php" base="/docs" />);
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(aiPrompts.map((p) => p.label));
    expect(screen.getByRole('tab', { name: 'PHP' })).toHaveAttribute('aria-selected', 'true');
    expect(container.textContent).toContain('senior PHP engineer');

    await userEvent.click(screen.getByRole('tab', { name: 'Flutter' }));
    expect(container.textContent).toContain('senior Flutter engineer');
    expect(router.push).toHaveBeenCalledWith('/docs/flutter/ai-setup', { scroll: false });
    const claude = screen.getByRole('link', { name: /Open in Claude/ });
    expect(decodeURIComponent(claude.getAttribute('href')!)).toContain(`${DOCS_ORIGIN}/ai-prompts/flutter.md`);
    expect(within(container).getByRole('button', { name: /download/i })).toBeInTheDocument();
  });
});

describe('Prompt files for agents', () => {
  it('serves each prompt as Markdown and 404s anything else', async () => {
    const ok = promptFile(new Request('http://x'), { params: { file: 'wordpress.md' } });
    expect(ok.status).toBe(200);
    expect(ok.headers.get('content-type')).toContain('text/markdown');
    expect(await ok.text()).toBe(aiPromptFor('wordpress')!.prompt);
    expect(promptFile(new Request('http://x'), { params: { file: 'ios.md' } }).status).toBe(404);
    expect(promptFile(new Request('http://x'), { params: { file: 'web' } }).status).toBe(404);
  });

  it('llms.txt lists every prompt and every guide', async () => {
    const text = await llms().text();
    for (const item of aiPrompts) expect(text).toContain(`/ai-prompts/${item.platformId}.md`);
    for (const platform of availablePlatforms) for (const guide of platform.guides ?? []) expect(text).toContain(guide.title);
  });
});
