'use client';

import { useState } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { Provider } from 'react-redux';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { store } from '@/lib/store';
import { theme } from '@/lib/theme';
import { QueryProvider } from './QueryProvider';

/**
 * Sends MUI's styles in the document head during server rendering.
 *
 * Left alone, Emotion writes a <style> tag into the body beside every element it styles. Those tags are
 * elements too, so until the browser hydrates, rules such as `:first-child` or `a + b` in globals.css match
 * a style tag instead of the real element, and the page visibly jumps when the tags are moved out. Collecting
 * them here and emitting them through Next's head stream keeps the first paint identical to the final one.
 */
function EmotionRegistry({ children }: { children: React.ReactNode }) {
  const [{ cache, flush }] = useState(() => {
    const cache = createCache({ key: 'css' });
    cache.compat = true;
    const insert = cache.insert;
    let pending: string[] = [];
    cache.insert = (...args) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) pending.push(serialized.name);
      return insert(...args);
    };
    return { cache, flush: () => { const names = pending; pending = []; return names; } };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) return null;
    return (
      <style
        key={names.join(' ')}
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{ __html: names.map((name) => cache.inserted[name]).join('') }}
      />
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <EmotionRegistry><Provider store={store}><QueryProvider><ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider></QueryProvider></Provider></EmotionRegistry>;
}
