'use client';

import { Provider } from 'react-redux';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { store } from '@/lib/store';
import { theme } from '@/lib/theme';
import { QueryProvider } from './QueryProvider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <Provider store={store}><QueryProvider><ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider></QueryProvider></Provider>;
}
