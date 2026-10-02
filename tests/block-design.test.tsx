import { expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BlockDesign, sectionTextFeatures } from '@/components/dashboard/BlockDesign';

const features = (type: string, label: string) =>
  sectionTextFeatures(new DOMParser().parseFromString(renderToStaticMarkup(<BlockDesign item={{ type, label }} />), 'text/html').body);

test('every text size in a full-size block follows the inspector sliders', () => {
  for (const [type, label] of [['text', 'Text'], ['hero', 'Standard hero'], ['footer', 'Footer + app download'], ['button', 'Button'], ['hero', 'Latest post'], ['text', 'Post summary'], ['hero', 'RSS digest']]) {
    const html = renderToStaticMarkup(<BlockDesign item={{ type, label }} />);
    const fixed = html.match(/font-size:\d+(\.\d+)?px/g);
    expect(fixed, `${label} has a fixed font size`).toBeNull();
    // utility classes mean a row was not converted to inline styles and renders unstyled
    expect(/ class="(?!Mui)/.test(html), `${label} has unconverted classes`).toBe(false);
  }
});

test('inspector only offers heading and text size where the block has them', () => {
  expect(features('hero', 'Standard hero')).toEqual({ heading: true, text: true });
  expect(features('footer', 'Footer + app download')).toEqual({ heading: false, text: true });
  expect(features('divider', 'Divider')).toEqual({ heading: false, text: false });
});
