import { CheckCircleRounded, ErrorOutlineRounded } from '@mui/icons-material';
import { Chip } from '@mui/material';

/** Small status pill used across the Project settings panels. */
export default function SettingsStatus({ tone = 'success', children }: { tone?: 'success' | 'warning' | 'neutral'; children: React.ReactNode }) {
  return <Chip icon={tone === 'success' ? <CheckCircleRounded /> : tone === 'warning' ? <ErrorOutlineRounded /> : undefined} label={children} size="small" className={tone === 'success' ? 'active-chip' : tone === 'warning' ? 'warning-chip' : 'neutral-chip'} />;
}
