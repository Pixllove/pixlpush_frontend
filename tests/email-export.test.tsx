import { expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BlockDesign } from '@/components/dashboard/BlockDesign';
import { compileEmailHtml } from '@/components/dashboard/emailExport';

const compile = (type: string, label: string) =>
  compileEmailHtml(renderToStaticMarkup(<BlockDesign item={{ type, label }} />), 640, async () => 'https://cdn.test/generated.png');

test('compiled email has no layout a mail client would drop', async () => {
  for (const [type, label] of [['navigation', 'Logo + Navigation'], ['hero', 'Standard hero'], ['hero', 'Three benefit cards'], ['text', 'Text'], ['button', 'Two buttons'], ['footer', 'Footer']]) {
    const html = await compile(type, label);
    expect(html, label).not.toMatch(/display:\s*(inline-)?(flex|grid|contents)/);
    expect(html, label).not.toMatch(/ class=|contenteditable|data-testid|--section-[a-z-]+:/);
  }
});

test('rows become tables, columns become stacked blocks, and empty picture frames are left out', async () => {
  const cards = await compile('hero', 'Three benefit cards');
  expect(cards.match(/<td/g)).toHaveLength(3);
  expect(cards).toMatch(/width:\s*33\.3%/);

  const hero = await compile('hero', 'Standard hero');
  expect(hero).not.toContain('<svg');
  expect(hero).not.toContain('rgb(247, 248, 251)'); // the grey placeholder frame
  expect(hero).toContain('Introduce your concept');
});

test("an unlinked picture is linked to itself so Gmail shows no download button", async () => {
  const html = await compileEmailHtml('<div><img src="https://cdn.test/hero.png" style="width:300px"><p>Hi</p></div>', 640, async () => "https://cdn.test/x.png");
  expect(html).toContain('<a href="https://cdn.test/hero.png"');
  expect(html).not.toContain("<style");
});
