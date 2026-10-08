'use client';

import type { ReactElement } from 'react';
import { ErrorOutlineRounded, InboxOutlined, SearchOffRounded } from '@mui/icons-material';
import { Box, Button, Typography } from '@mui/material';

export type EmptyStateProps = {
  icon?: ReactElement;
  title: string;
  description?: string;
  action?: { label: string; onClick?: () => void; href?: string };
  /** `compact` sits inside a table, tab or card; `default` fills a page area. */
  size?: 'default' | 'compact';
  tone?: 'neutral' | 'error';
};

/** The one empty state (DESIGN.md): an icon tile, a title, one sentence and at most one action. */
export default function EmptyState({ icon, title, description, action, size = 'default', tone = 'neutral' }: EmptyStateProps) {
  const compact = size === 'compact';
  return (
    <Box role="status" className={`pp-empty${compact ? ' is-compact' : ''}${tone === 'error' ? ' is-error' : ''}`}>
      <span className="pp-empty-tile" aria-hidden>{icon ?? (tone === 'error' ? <ErrorOutlineRounded /> : <InboxOutlined />)}</span>
      <Typography component="p" className="pp-empty-title">{title}</Typography>
      {description && <Typography variant="body2" color="text.secondary" className="pp-empty-text">{description}</Typography>}
      {/* A list already has its primary action in the page header, so the compact action is secondary. */}
      {action && <Button variant={compact ? 'outlined' : 'contained'} size={compact ? 'small' : 'medium'} href={action.href} onClick={action.onClick} sx={{ mt: 1 }}>{action.label}</Button>}
    </Box>
  );
}

/**
 * The three reasons a list is empty, told apart in one place: it could not load, nothing matches the
 * search or filter, or nothing has been created yet. `create` is only offered in the last case.
 */
export function listEmpty({ icon, noun, description, search, onClear, error, onRetry, create }: {
  icon?: ReactElement;
  noun: string;
  description?: string;
  search?: string;
  onClear?: () => void;
  error?: string | false | null;
  onRetry?: () => void;
  create?: EmptyStateProps['action'];
}): EmptyStateProps {
  if (error) return { tone: 'error', title: error, action: onRetry && { label: 'Try again', onClick: onRetry } };
  if (search?.trim()) return { icon: <SearchOffRounded />, title: `No ${noun} match “${search.trim()}”`, description: 'Check the spelling or try a different search.', action: onClear && { label: 'Clear search', onClick: onClear } };
  return { icon, title: `No ${noun} yet`, description, action: create };
}
