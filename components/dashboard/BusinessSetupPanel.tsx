'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, Skeleton, Stack, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/types/auth';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { onboardingApi } from '@/lib/projects/api';
import { normalizeOnboardingUrls, onboardingUrlError, type OnboardingUrlField } from '@/lib/onboarding';
import { toggleProjectPlatform } from '@/lib/project-platforms';
import type { ProjectPlatform } from '@/types/project';
import OnboardingCommonStep, { type CommonOnboardingLinkCheckState, type DetectedOnboardingLinks } from '@/components/onboarding/OnboardingCommonStep';

const emptyLinks: DetectedOnboardingLinks = { androidAppUrl: null, iosAppUrl: null };

export default function BusinessSetupPanel() {
  const { active } = useActiveProject();
  const projectId = active?.id;
  const queryClient = useQueryClient();
  const queryKey = ['projects', projectId, 'onboarding'];
  const progressQuery = useQuery({ queryKey, queryFn: () => onboardingApi.get(projectId!), enabled: Boolean(projectId) });
  const [platforms, setPlatforms] = useState<ProjectPlatform[]>(['mobile']);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [androidAppUrl, setAndroidAppUrl] = useState('');
  const [iosAppUrl, setIosAppUrl] = useState('');
  const [channels, setChannels] = useState<string[]>([]);
  const [urlErrors, setUrlErrors] = useState<Partial<Record<OnboardingUrlField, string>>>({});
  const [linkCheckState, setLinkCheckState] = useState<CommonOnboardingLinkCheckState>('idle');
  const [linkCheckError, setLinkCheckError] = useState('');
  const [detectedLinks, setDetectedLinks] = useState<DetectedOnboardingLinks>(emptyLinks);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const progress = progressQuery.data;
    if (!progress || dirty) return;
    setPlatforms(progress.platforms?.length ? progress.platforms : ['mobile']);
    setWebsiteUrl(progress.websiteUrl ?? '');
    setAndroidAppUrl(progress.androidAppUrl ?? '');
    setIosAppUrl(progress.iosAppUrl ?? '');
    setChannels(progress.channels ?? []);
  }, [dirty, progressQuery.data]);

  const save = useMutation({
    mutationFn: () => {
      const urls = normalizeOnboardingUrls({ websiteUrl, androidAppUrl, iosAppUrl });
      return onboardingApi.update(projectId!, { ...urls, platforms, channels });
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKey, saved);
      setDirty(false);
      setSaveError('');
      setUrlErrors({});
    },
    onError: (error) => setSaveError((error as unknown as ApiError).message ?? 'Could not save product and channel details.'),
  });

  const editUrl = (field: OnboardingUrlField, value: string) => {
    setDirty(true);
    if (field === 'websiteUrl') setWebsiteUrl(value);
    else if (field === 'androidAppUrl') setAndroidAppUrl(value);
    else setIosAppUrl(value);
    setUrlErrors((current) => ({ ...current, [field]: '' }));
  };

  const checkLinks = async () => {
    if (!projectId || !websiteUrl.trim()) return;
    setLinkCheckState('checking');
    setLinkCheckError('');
    try {
      const result = await onboardingApi.appLinks(projectId, websiteUrl);
      setDetectedLinks(result);
      setLinkCheckState(result.androidAppUrl || result.iosAppUrl ? 'found' : 'not-found');
    } catch (error) {
      setLinkCheckError((error as ApiError).message ?? 'Could not check this website. You can enter app links manually.');
      setLinkCheckState('error');
    }
  };

  const applyDetectedLink = (field: 'androidAppUrl' | 'iosAppUrl') => {
    const value = detectedLinks[field];
    if (!value) return;
    editUrl(field, value);
  };

  const handleSave = () => {
    const errors: Partial<Record<OnboardingUrlField, string>> = {};
    (['websiteUrl', 'androidAppUrl', 'iosAppUrl'] as const).forEach((field) => {
      const label = field === 'websiteUrl' ? 'Website URL' : field === 'androidAppUrl' ? 'Android app link' : 'iOS app link';
      errors[field] = onboardingUrlError(field === 'websiteUrl' ? websiteUrl : field === 'androidAppUrl' ? androidAppUrl : iosAppUrl, label) ?? '';
    });
    setUrlErrors(errors);
    if (Object.values(errors).some(Boolean)) return;
    save.mutate();
  };

  if (progressQuery.isPending) return <Card className="saas-card"><Stack gap={2}><Skeleton height={32} /><Skeleton height={150} /><Skeleton height={120} /></Stack></Card>;
  if (progressQuery.isError) return <Alert severity="error">Could not load product and channel settings. Refresh and try again.</Alert>;

  return <Card className="saas-card">
    <Stack gap={2.5}>
      <Box>
        <Typography variant="h4">Your products and channels</Typography>
        <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: .5 }}>Add or update your website, app links, and communication channels anytime. Onboarding steps update to match your selections.</Typography>
      </Box>
      {saveError && <Alert severity="error">{saveError}</Alert>}
      {save.isSuccess && !dirty && <Alert severity="success">Product and channel details saved. Your onboarding steps are updated.</Alert>}
      <OnboardingCommonStep
        kind="products"
        platforms={platforms}
        websiteUrl={websiteUrl}
        androidAppUrl={androidAppUrl}
        iosAppUrl={iosAppUrl}
        urlErrors={urlErrors}
        linkCheckState={linkCheckState}
        linkCheckError={linkCheckError}
        detectedLinks={detectedLinks}
        onPlatformToggle={(platform) => {
          setDirty(true);
          setPlatforms((current) => toggleProjectPlatform(current, platform));
          if (platforms.includes(platform)) {
            const removedChannels = platform === 'web' ? ['web-push'] : ['mobile-push', 'in-app'];
            setChannels((current) => current.filter((channel) => !removedChannels.includes(channel)));
          }
        }}
        onUrlChange={editUrl}
        onUrlBlur={(field) => {
          const value = field === 'websiteUrl' ? websiteUrl : field === 'androidAppUrl' ? androidAppUrl : iosAppUrl;
          const label = field === 'websiteUrl' ? 'Website URL' : field === 'androidAppUrl' ? 'Android app link' : 'iOS app link';
          setUrlErrors((current) => ({ ...current, [field]: onboardingUrlError(value, label) ?? '' }));
        }}
        onCheckLinks={() => void checkLinks()}
        onApplyDetectedLink={applyDetectedLink}
      />
      <Box>
        <Typography variant="h5" sx={{ mb: 1.5 }}>Your channels</Typography>
        <OnboardingCommonStep
          kind="channels"
          platforms={platforms}
          channels={channels}
          onChannelToggle={(channel) => {
            setDirty(true);
            setChannels((current) => current.includes(channel) ? current.filter((value) => value !== channel) : [...current, channel]);
          }}
        />
      </Box>
      <Button variant="contained" onClick={handleSave} disabled={!dirty || save.isPending} sx={{ alignSelf: 'flex-start' }}>
        {save.isPending ? 'Saving…' : 'Save changes'}
      </Button>
    </Stack>
  </Card>;
}
