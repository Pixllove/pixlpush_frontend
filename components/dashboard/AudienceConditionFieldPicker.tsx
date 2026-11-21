'use client';

import {
  AccessTimeRounded,
  AccountCircleOutlined,
  AlternateEmailRounded,
  AppsRounded,
  CalendarTodayRounded,
  CheckRounded,
  DevicesOtherRounded,
  EmailOutlined,
  EventAvailableRounded,
  FilterAltOutlined,
  LanguageRounded,
  LocationOnOutlined,
  ManageAccountsOutlined,
  NotificationsActiveOutlined,
  PhoneIphoneRounded,
  PublicOutlined,
  SearchRounded,
  TimelineRounded,
  TouchAppRounded,
  TravelExploreRounded,
  TuneRounded,
  KeyboardArrowDownRounded,
  KeyboardArrowRightRounded,
} from '@mui/icons-material';
import {
  Box,
  ButtonBase,
  Divider,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import type { AudienceGroupSchemaField } from '@/types/project';
import { appNotificationTokenFieldKey, audienceFieldTopic, isHiddenAudienceField } from './audienceGroupRules';

type Props = {
  fields: AudienceGroupSchemaField[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  compact?: boolean;
  moreFields?: AudienceGroupSchemaField[];
};

type PickerGroup = {
  label: string;
  fields: AudienceGroupSchemaField[];
};

const categoryOrder = [
  'Reachability',
  'Engagement',
  'Groups & Segments',
  'Automation & Campaigns',
  'Account Details',
];

const iconByKey: Record<string, ComponentType<{ fontSize?: 'small' | 'inherit' | 'large' | 'medium' }>> = {
  email: EmailOutlined,
  emailAction: TouchAppRounded,
  lastEmailed: AccessTimeRounded,
  lastNotified: AccessTimeRounded,
  lastEmailNotification: AccessTimeRounded,
  lastMobilePushNotification: AccessTimeRounded,
  lastWebPushNotification: AccessTimeRounded,
  mobilePushAction: TouchAppRounded,
  webPushAction: TouchAppRounded,
  mobileAppUserEvents: EventAvailableRounded,
  webUserEvents: EventAvailableRounded,
  historicalJourneyAutomation: EventAvailableRounded,
  emailCampaign: AppsRounded,
  mobilePushCampaign: AppsRounded,
  webPushCampaign: AppsRounded,
  [appNotificationTokenFieldKey]: PhoneIphoneRounded,
  fcmToken: PhoneIphoneRounded,
  apnsToken: PhoneIphoneRounded,
  webPush: PublicOutlined,
  pushNotification: NotificationsActiveOutlined,
  pushNotificationAction: TouchAppRounded,
  lastPushNotification: AccessTimeRounded,
  currentLifecycleSegment: TimelineRounded,
  historicalLifecycleSegment: TimelineRounded,
  journeyAutomation: EventAvailableRounded,
  audienceGroup: AppsRounded,
  performedEvent: EventAvailableRounded,
  country: LocationOnOutlined,
  region: TravelExploreRounded,
  language: LanguageRounded,
  preferredLanguage: LanguageRounded,
  platform: DevicesOtherRounded,
  userImport: AlternateEmailRounded,
  accountStatus: ManageAccountsOutlined,
  userType: AccountCircleOutlined,
  createdDate: CalendarTodayRounded,
  customProperty: TuneRounded,
};

function fieldIcon(field: AudienceGroupSchemaField, size: 'small' | 'medium' = 'small'): ReactNode {
  const Icon = iconByKey[field.key] ?? FilterAltOutlined;
  return <Icon fontSize={size} />;
}

function groupLabel(field: AudienceGroupSchemaField) { return audienceFieldTopic(field); }

function groupedFields(fields: AudienceGroupSchemaField[]): PickerGroup[] {
  return categoryOrder
    .map(label => ({ label, fields: fields.filter(field => groupLabel(field) === label) }))
    .filter(group => group.fields.length > 0);
}

export default function AudienceConditionFieldPicker({
  fields,
  value,
  onChange,
  placeholder = 'Choose a filter',
  ariaLabel = 'Condition field',
  compact = false,
  moreFields = [],
}: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [moreAnchorEl, setMoreAnchorEl] = useState<HTMLElement | null>(null);
  const [search, setSearch] = useState('');
  const [moreSearch, setMoreSearch] = useState('');
  const open = Boolean(anchorEl);
  const moreOpen = Boolean(moreAnchorEl);
  const pickerFields = useMemo(() => [...new Map([...fields, ...moreFields].map(field => [field.key, field])).values()], [fields, moreFields]);
  const selectedField = pickerFields.find(field => field.key === value || field.label === value);

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? fields.filter(field => `${field.label} ${field.key}`.toLowerCase().includes(query))
      : fields;
    return groupedFields(filtered);
  }, [fields, search]);

  const moreGroups = useMemo(() => {
    const query = moreSearch.trim().toLowerCase();
    const filtered = query
      ? moreFields.filter(field => `${field.label} ${field.key}`.toLowerCase().includes(query))
      : moreFields;
    return groupedFields(filtered);
  }, [moreFields, moreSearch]);

  const close = () => {
    setAnchorEl(null);
    setMoreAnchorEl(null);
    setSearch('');
    setMoreSearch('');
  };

  const closeMore = () => {
    setMoreAnchorEl(null);
    setMoreSearch('');
  };

  const selectField = (field: AudienceGroupSchemaField) => {
    if (isHiddenAudienceField(field) && field.key !== value) return;
    onChange(field.key);
    close();
  };

  return <>
    <ButtonBase
      type="button"
      role="combobox"
      aria-label={ariaLabel}
      aria-expanded={open}
      aria-haspopup="listbox"
      onClick={event => setAnchorEl(event.currentTarget)}
      sx={{
        minWidth: { md: compact ? 145 : 190 },
        width: compact ? { md: '28%', xs: '100%' } : undefined,
        maxWidth: compact ? { md: 210 } : undefined,
        flex: compact ? { md: '0 1 28%', xs: '1 1 100%' } : 1,
        justifyContent: 'space-between',
        textAlign: 'left',
        border: '1px solid',
        borderColor: open ? 'primary.main' : 'divider',
        borderRadius: 1,
        px: 1.25,
        py: 1,
        color: selectedField ? 'text.primary' : 'text.secondary',
        backgroundColor: 'background.paper',
        boxShadow: open ? theme => `0 0 0 1px ${theme.palette.primary.main}` : 'none',
        '&:hover': { borderColor: 'primary.main', backgroundColor: 'action.hover' },
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, gap: 1 }}>
        <Box sx={{ display: 'grid', placeItems: 'center', color: selectedField ? 'primary.main' : 'text.secondary' }}>
          {selectedField ? fieldIcon(selectedField) : <FilterAltOutlined fontSize="small" />}
        </Box>
        <Typography noWrap fontSize="0.9rem">
          {selectedField?.label ?? placeholder}
        </Typography>
      </Box>
      <KeyboardArrowDownRounded sx={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 160ms ease' }} />
    </ButtonBase>

    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={close}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{
        paper: {
          sx: theme => ({
            mt: 0.75,
            width: anchorEl ? Math.max(anchorEl.clientWidth, 350) : 350,
            maxWidth: 'min(560px, calc(100vw - 32px))',
            maxHeight: 'min(620px, calc(100vh - 48px))',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid',
            borderColor: theme.palette.divider,
            borderRadius: 2,
            boxShadow: theme.shadows[8],
          }),
        },
      }}
    >
      <Box sx={{ p: 1.25, borderBottom: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search properties..."
          inputProps={{ 'aria-label': 'Search properties' }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> }}
        />
      </Box>
      <List role="listbox" disablePadding sx={{ minHeight: 0, flex: 1, overflowY: 'auto', py: 0.5 }}>
        {compact && moreFields.length > 0 && <>
          <ListItemButton onClick={event => setMoreAnchorEl(event.currentTarget)} sx={{ minHeight: 42, px: 2, py: 0.5, gap: 0.75 }}>
            <ListItemIcon sx={{ minWidth: 28, color: 'primary.main' }}><TuneRounded fontSize="small" /></ListItemIcon>
            <ListItemText primary="More options" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 600 }} />
            <KeyboardArrowRightRounded fontSize="small" color="action" />
          </ListItemButton>
          <Divider />
        </>}
        {!groups.length && <Typography color="text.secondary" fontSize="0.85rem" sx={{ px: 2, py: 2 }}>No matching properties</Typography>}
        {groups.map((group, groupIndex) => <Box key={group.label}>
          {groupIndex > 0 && <Divider />}
          <Typography component="div" sx={{ px: 2, pt: groupIndex === 0 ? 0.8 : 1.2, pb: 0.5, fontSize: '0.78rem', fontWeight: 700, color: 'text.secondary', letterSpacing: 0.1 }}>
            {group.label}
          </Typography>
          {group.fields.map(field => {
            const legacy = isHiddenAudienceField(field) && field.key !== value;
            return <ListItemButton
              key={field.key}
              role="option"
              aria-selected={field.key === value}
              disabled={legacy}
              selected={field.key === value}
              onClick={() => selectField(field)}
              sx={{ minHeight: 42, px: 2, py: 0.5, gap: 0.75, '&.Mui-selected': { backgroundColor: 'primary.50' }, '&.Mui-selected:hover': { backgroundColor: 'primary.100' } }}
            >
              <ListItemIcon sx={{ minWidth: 28, color: legacy ? 'text.disabled' : 'primary.main' }}>{fieldIcon(field)}</ListItemIcon>
              <ListItemText primary={field.label} primaryTypographyProps={{ fontSize: '0.9rem', noWrap: true }} />
              {field.key === value && <CheckRounded fontSize="small" color="primary" />}
            </ListItemButton>;
          })}
        </Box>)}
      </List>
    </Popover>

    <Popover
      open={moreOpen}
      anchorEl={moreAnchorEl}
      onClose={closeMore}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{
        paper: {
          sx: theme => ({
            ml: 0.75,
            width: 350,
            maxWidth: 'min(560px, calc(100vw - 32px))',
            maxHeight: 'min(620px, calc(100vh - 48px))',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid',
            borderColor: theme.palette.divider,
            borderRadius: 2,
            boxShadow: theme.shadows[8],
          }),
        },
      }}
    >
      <Box sx={{ p: 1.25, borderBottom: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          value={moreSearch}
          onChange={event => setMoreSearch(event.target.value)}
          placeholder="Search all properties..."
          inputProps={{ 'aria-label': 'Search all properties' }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> }}
        />
      </Box>
      <List role="listbox" disablePadding sx={{ minHeight: 0, flex: 1, overflowY: 'auto', py: 0.5 }}>
        {!moreGroups.length && <Typography color="text.secondary" fontSize="0.85rem" sx={{ px: 2, py: 2 }}>No matching properties</Typography>}
        {moreGroups.map((group, groupIndex) => <Box key={group.label}>
          {groupIndex > 0 && <Divider />}
          <Typography component="div" sx={{ px: 2, pt: groupIndex === 0 ? 0.8 : 1.2, pb: 0.5, fontSize: '0.78rem', fontWeight: 700, color: 'text.secondary', letterSpacing: 0.1 }}>
            {group.label}
          </Typography>
          {group.fields.map(field => {
            const legacy = isHiddenAudienceField(field) && field.key !== value;
            return <ListItemButton
              key={field.key}
              role="option"
              aria-selected={field.key === value}
              disabled={legacy}
              selected={field.key === value}
              onClick={() => selectField(field)}
              sx={{ minHeight: 42, px: 2, py: 0.5, gap: 0.75, '&.Mui-selected': { backgroundColor: 'primary.50' }, '&.Mui-selected:hover': { backgroundColor: 'primary.100' } }}
            >
              <ListItemIcon sx={{ minWidth: 28, color: legacy ? 'text.disabled' : 'primary.main' }}>{fieldIcon(field)}</ListItemIcon>
              <ListItemText primary={field.label} primaryTypographyProps={{ fontSize: '0.9rem', noWrap: true }} />
              {field.key === value && <CheckRounded fontSize="small" color="primary" />}
            </ListItemButton>;
          })}
        </Box>)}
      </List>
    </Popover>
  </>;
}
