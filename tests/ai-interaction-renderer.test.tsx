import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AiInteractionRenderer from '@/components/dashboard/AiInteractionRenderer';
import type { AiInteraction } from '@/lib/projects/ai';

const interaction = (type: AiInteraction['type'], overrides: Partial<AiInteraction> = {}): AiInteraction => ({
  interactionId: `interaction-${type}`,
  type,
  flowId: type,
  status: 'awaiting_input',
  step: 1,
  totalSteps: 2,
  title: `${type} title`,
  description: 'Complete this step in chat.',
  fields: [{ key: 'goal', label: 'Goal', type: 'choice', required: true, options: ['Improve engagement'] }],
  data: {},
  actions: ['next', 'submit', 'cancel', 'retry'],
  requestKey: `request-${type}-123`,
  ...overrides,
});

describe('AiInteractionRenderer', () => {
  it.each([
    ['onboarding', 'interaction-onboarding'],
    ['business_analysis', 'interaction-business-analysis'],
    ['goal_selection', 'interaction-goal-selection'],
    ['journey_creation', 'interaction-journey-creation'],
    ['push_creation', 'interaction-push-creation'],
    ['email_creation', 'interaction-email-creation'],
    ['improvement', 'interaction-improvement'],
    ['analysis', 'interaction-analysis'],
    ['preview', 'interaction-preview'],
    ['approval', 'interaction-approval'],
  ] as const)('selects the backend card for %s', (type, testId) => {
    render(<AiInteractionRenderer interaction={interaction(type)} onSubmit={vi.fn()} />);
    expect(screen.getByTestId(testId)).toBeInTheDocument();
    expect(screen.getByText(`${type} title`)).toBeInTheDocument();
  });

  it('submits backend field keys and the selected action', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AiInteractionRenderer interaction={interaction('goal_selection')} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Improve engagement' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onSubmit).toHaveBeenCalledWith({ goal: 'Improve engagement' }, 'next');
  });

  it('keeps Continue enabled for blank onboarding fields and dispatches defer without required values', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AiInteractionRenderer interaction={interaction('onboarding', {
      fields: [{ key: 'domain', label: 'Sending domain', type: 'text', required: true }],
      actions: ['defer', 'submit', 'cancel'],
      data: { completionPercentage: 40 },
    })} onSubmit={onSubmit} />);

    const continueButton = screen.getByRole('button', { name: 'Continue' });
    expect(continueButton).toBeEnabled();
    expect(screen.getByText('40%')).toBeInTheDocument();
    await user.click(continueButton);

    expect(onSubmit).toHaveBeenCalledWith({}, 'defer');
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('renders the backend returned next onboarding step after a deferred step', () => {
    const first = interaction('onboarding', {
      title: 'Your products',
      fields: [{ key: 'websiteUrl', label: 'Website URL', type: 'url' }],
      actions: ['defer', 'submit'],
      data: { currentStep: { kind: 'products', title: 'Your products' }, completionPercentage: 25 },
    });
    const next = {
      ...first,
      step: 4,
      title: 'Complete onboarding: Domain',
      fields: [{ key: 'domain', label: 'Sending domain', type: 'text' as const }],
      data: { currentStep: { kind: 'domain', title: 'Domain' }, completionPercentage: 25, stepDeferred: true },
    };
    const { rerender } = render(<AiInteractionRenderer interaction={first} onSubmit={vi.fn()} />);
    expect(screen.getByText('Your products')).toBeInTheDocument();

    rerender(<AiInteractionRenderer interaction={next} onSubmit={vi.fn()} />);
    expect(screen.getByText('Domain')).toBeInTheDocument();
    expect(screen.queryByText('Your products')).not.toBeInTheDocument();
    expect(screen.getByText('This step was deferred. You can complete it later from onboarding.')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('shows the all-deferred resume state without showing completion', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AiInteractionRenderer interaction={interaction('onboarding', {
      status: 'deferred',
      fields: [],
      actions: ['resume'],
      data: { onboarding: { allRemainingStepsDeferred: true, deferredSteps: ['domain'] }, completionPercentage: 25 },
    })} onSubmit={onSubmit} />);

    expect(screen.getByText('You can resume these steps later. Your onboarding progress still reflects only completed steps.')).toBeInTheDocument();
    expect(screen.queryByText('Onboarding is complete. Your progress has been refreshed.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Resume deferred steps' }));
    expect(onSubmit).toHaveBeenCalledWith({}, 'resume');
  });

  it('shows Review deferred steps for an active onboarding step and resumes the backend-returned step', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const active = interaction('onboarding', {
      step: 4,
      totalSteps: 5,
      title: 'Complete onboarding: Domain',
      fields: [{ key: 'domain', label: 'Sending domain', type: 'text', required: true }],
      actions: ['resume', 'defer', 'submit'],
      data: {
        currentStep: { kind: 'domain', title: 'Domain' },
        deferredSteps: [{ kind: 'products', status: 'deferred' }],
        completionPercentage: 40,
        values: { domain: 'example.com' },
      },
    });
    const resumed = {
      ...active,
      step: 2,
      title: 'Complete onboarding: Channels',
      fields: [{ key: 'channels', label: 'Channels', type: 'choice' as const, required: true, options: ['email'] }],
      actions: ['defer', 'submit'],
      data: {
        currentStep: { kind: 'channels', title: 'Channels' },
        completionPercentage: 40,
        values: { channels: ['email'] },
      },
    };

    const { rerender } = render(<AiInteractionRenderer interaction={active} onSubmit={onSubmit} />);
    expect(screen.getByRole('button', { name: 'Review deferred steps' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Review deferred steps' }));
    expect(onSubmit).toHaveBeenCalledWith({}, 'resume');

    rerender(<AiInteractionRenderer interaction={resumed} onSubmit={onSubmit} />);
    expect(screen.getByText('Channels')).toBeInTheDocument();
    expect(screen.queryByText('Domain')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('forwards save_draft exactly instead of converting it to submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AiInteractionRenderer interaction={interaction('push_creation', {
      fields: [{ key: 'title', label: 'Title', type: 'text' }],
      actions: ['save_draft'],
    })} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Title'), 'Welcome back');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(onSubmit).toHaveBeenCalledWith({ title: 'Welcome back' }, 'save_draft');
  });

  it('renders only the current backend step and restores submitted values', () => {
    const current = interaction('push_creation', {
      step: 2,
      totalSteps: 4,
      fields: [
        { key: 'title', label: 'Title', type: 'text', required: true },
        { key: 'body', label: 'Body', type: 'text', required: true },
      ],
      data: { submittedValues: { goal: 'Retention', title: 'Existing title' } },
    });
    render(<AiInteractionRenderer interaction={current} onSubmit={vi.fn()} />);

    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Existing title');
    expect(screen.getByRole('textbox', { name: 'Body' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Goal' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Step 2 of 4')).toBeInTheDocument();
  });

  it('preserves a partially entered value when the interaction is refreshed', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const first = interaction('business_analysis', { fields: [{ key: 'businessDescription', label: 'Business description', type: 'text' }] });
    const { rerender } = render(<AiInteractionRenderer interaction={first} onSubmit={onSubmit} />);
    await user.type(screen.getByRole('textbox', { name: 'Business description' }), 'A subscription app');

    rerender(<AiInteractionRenderer interaction={{ ...first, data: { submittedValues: {} } }} onSubmit={onSubmit} />);
    expect(screen.getByRole('textbox', { name: 'Business description' })).toHaveValue('A subscription app');
  });

  it('submits a structured weekly schedule with timezone and weekdays', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AiInteractionRenderer interaction={interaction('push_creation', {
      step: 3,
      totalSteps: 4,
      fields: [
        { key: 'schedule', label: 'Schedule', type: 'json', required: true },
        { key: 'timezone', label: 'Timezone', type: 'timezone', required: true },
      ],
      actions: ['next'],
    })} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('combobox', { name: 'Frequency' }));
    await user.click(screen.getByRole('option', { name: 'Weekly' }));
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '10:00' } });
    await user.type(screen.getByRole('textbox', { name: 'Timezone' }), 'Asia/Karachi');
    await user.click(screen.getByRole('checkbox', { name: 'Mon' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onSubmit).toHaveBeenCalledWith({
      schedule: { frequency: 'weekly', date: null, time: '10:00', weekdays: [1], monthlyDay: null },
      timezone: 'Asia/Karachi',
    }, 'next');
  });

  it('keeps secure uploads out of chat and exposes the protected setup action', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onSecureAction = vi.fn();
    render(<AiInteractionRenderer interaction={interaction('onboarding', {
      fields: [{ key: 'firebaseUpload', label: 'Firebase credentials', type: 'secure_upload', required: true, sensitive: true }],
    })} onSubmit={onSubmit} onSecureAction={onSecureAction} />);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open secure setup' }));
    expect(onSecureAction).toHaveBeenCalledWith({ label: 'Firebase credentials', href: '/dashboard/settings/firebase' });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders the shared onboarding basics, products, and channel experience', async () => {
    const user = userEvent.setup();
    const onCheckLinks = vi.fn().mockResolvedValue({ androidAppUrl: 'https://play.google.com/store/apps/details?id=demo', iosAppUrl: 'https://apps.apple.com/app/demo/id1' });
    const products = interaction('onboarding', {
      title: 'Complete onboarding: Your products',
      fields: [
        { key: 'platforms', label: 'Products', type: 'choice', required: true, options: ['web', 'mobile'] },
        { key: 'websiteUrl', label: 'Website URL', type: 'url' },
        { key: 'androidAppUrl', label: 'Android app link', type: 'url' },
        { key: 'iosAppUrl', label: 'iOS app link', type: 'url' },
      ],
      data: { currentStep: { kind: 'products', title: 'Your products' }, values: { platforms: ['mobile'], websiteUrl: 'example.com' } },
      actions: ['defer', 'submit'],
    });
    const { rerender } = render(<AiInteractionRenderer interaction={products} onSubmit={vi.fn()} onCheckLinks={onCheckLinks} />);
    expect(screen.getAllByText('Mobile App').length).toBeGreaterThan(0);
    expect(screen.getByText('For apps available on iOS or Android.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check links' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Check links' }));
    expect(onCheckLinks).toHaveBeenCalledWith('https://example.com');
    expect(await screen.findByRole('textbox', { name: 'Android app link' })).toHaveValue('https://play.google.com/store/apps/details?id=demo');
    expect(screen.getByRole('textbox', { name: 'iOS app link' })).toHaveValue('https://apps.apple.com/app/demo/id1');
    expect(screen.getByText('Found links were added to empty fields; your existing links were kept.')).toBeInTheDocument();

    rerender(<AiInteractionRenderer interaction={interaction('onboarding', {
      fields: [{ key: 'projectName', label: 'Project name', type: 'text', required: true }],
      data: { currentStep: { kind: 'basics', title: 'Project basics' } },
      actions: ['defer', 'submit'],
    })} onSubmit={vi.fn()} />);
    expect(screen.getByText('You can change this any time.')).toBeInTheDocument();

    rerender(<AiInteractionRenderer interaction={interaction('onboarding', {
      fields: [{ key: 'channels', label: 'Channels', type: 'choice', required: true, options: ['web-push', 'mobile-push', 'email', 'in-app'] }],
      data: { currentStep: { kind: 'channels', title: 'Channels' }, values: { platforms: ['web'] } },
      actions: ['defer', 'submit'],
    })} onSubmit={vi.fn()} />);
    expect(screen.getByText('Web push')).toBeInTheDocument();
    expect(screen.queryByText('Mobile push')).not.toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('keeps manually entered store links when the website scan finds replacements', async () => {
    const user = userEvent.setup();
    const onCheckLinks = vi.fn().mockResolvedValue({
      androidAppUrl: 'https://play.google.com/store/apps/details?id=detected',
      iosAppUrl: 'https://apps.apple.com/app/detected/id2',
    });
    render(<AiInteractionRenderer interaction={interaction('onboarding', {
      fields: [
        { key: 'platforms', label: 'Products', type: 'choice', required: true, options: ['web', 'mobile'] },
        { key: 'websiteUrl', label: 'Website URL', type: 'url' },
        { key: 'androidAppUrl', label: 'Android app link', type: 'url' },
        { key: 'iosAppUrl', label: 'iOS app link', type: 'url' },
      ],
      data: { currentStep: { kind: 'products', title: 'Your products' }, values: {
        platforms: ['mobile'],
        websiteUrl: 'example.com',
        androidAppUrl: 'https://play.google.com/store/apps/details?id=manual',
      } },
      actions: ['defer', 'submit'],
    })} onSubmit={vi.fn()} onCheckLinks={onCheckLinks} />);

    await user.click(screen.getByRole('button', { name: 'Check links' }));
    expect(await screen.findByRole('textbox', { name: 'Android app link' })).toHaveValue('https://play.google.com/store/apps/details?id=manual');
    expect(screen.getByRole('textbox', { name: 'iOS app link' })).toHaveValue('https://apps.apple.com/app/detected/id2');
  });

  it('renders Domain verification and defers a blank required Domain without native validation', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onVerifyDomain = vi.fn();
    render(<AiInteractionRenderer interaction={interaction('onboarding', {
      fields: [
        { key: 'senderEmail', label: 'Sender email', type: 'text', required: true },
        { key: 'domain', label: 'Sending domain', type: 'text', required: true },
      ],
      data: { currentStep: { kind: 'domain', title: 'Domain' } },
      actions: ['defer', 'submit'],
    })} onSubmit={onSubmit} onVerifyDomain={onVerifyDomain} />);

    expect(screen.getByRole('button', { name: 'Verify ownership' })).toBeInTheDocument();
    const continueButton = screen.getByRole('button', { name: 'Continue' });
    expect(continueButton).toHaveAttribute('type', 'button');
    await user.click(continueButton);
    expect(onSubmit).toHaveBeenCalledWith({}, 'defer');
    expect(onSubmit).not.toHaveBeenCalledWith(expect.anything(), 'submit');
    expect(onVerifyDomain).not.toHaveBeenCalled();
  });

  it('derives the Domain value from sender email for save and ownership verification', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onVerifyDomain = vi.fn().mockResolvedValue(undefined);
    render(<AiInteractionRenderer interaction={interaction('onboarding', {
      fields: [{ key: 'senderEmail', label: 'Sender email', type: 'text', required: true }],
      data: { currentStep: { kind: 'domain', title: 'Domain' } },
      actions: ['defer', 'submit'],
    })} onSubmit={onSubmit} onVerifyDomain={onVerifyDomain} />);

    expect(screen.queryByRole('textbox', { name: 'Sending domain' })).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Sender email' }), 'info@example.com');
    await user.click(screen.getByRole('button', { name: 'Verify ownership' }));
    expect(onVerifyDomain).toHaveBeenCalledWith({ senderEmail: 'info@example.com', domain: 'example.com' });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith({ senderEmail: 'info@example.com', domain: 'example.com' }, 'submit');
  });

  it('renders the shared Mobile Push, App SDK, and Web SDK experiences', () => {
    const base = interaction('onboarding', { fields: [], actions: ['defer', 'submit'] });
    const { rerender } = render(<AiInteractionRenderer interaction={{ ...base, data: { currentStep: { kind: 'mobile-push', title: 'Mobile push setup' } } }} onSubmit={vi.fn()} onOpenFirebase={vi.fn()} onOpenApns={vi.fn()} />);
    expect(screen.getByTestId('onboarding-mobile-push-experience')).toBeInTheDocument();
    expect(screen.getByText('Firebase Cloud Messaging (mobile apps)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Firebase' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Apple Push (APNs)' })).toBeInTheDocument();

    rerender(<AiInteractionRenderer interaction={{ ...base, data: { currentStep: { kind: 'mobile-push', title: 'Mobile push setup' } } }} onSubmit={vi.fn()} onOpenFirebase={vi.fn()} onOpenApns={vi.fn()} firebaseConnected apnsConnected />);
    expect(screen.getByRole('button', { name: 'Review Firebase' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review Apple Push (APNs)' })).toBeInTheDocument();

    rerender(<AiInteractionRenderer projectId="project-db-id" projectSlug="pixlpush-demo" canCreateSdkKey interaction={{ ...base, data: { currentStep: { kind: 'app-sdk', title: 'App SDK' }, values: { projectName: 'Demo' } } }} onSubmit={vi.fn()} onRequestSdk={vi.fn()} onSendDeveloperInstructions={vi.fn()} />);
    expect(screen.getByTestId('onboarding-app-sdk-experience')).toBeInTheDocument();
    expect(screen.getByText('Choose your framework')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Project ID' })).toHaveValue('pixlpush-demo');
    expect(screen.getByRole('button', { name: 'Create key' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Copy AI Integration Prompt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request SDK' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('developer@company.com')).toBeInTheDocument();
    expect(screen.getByText(/Demo/)).toBeInTheDocument();

    rerender(<AiInteractionRenderer interaction={{ ...base, data: { currentStep: { kind: 'web-sdk', title: 'Web SDK' } } }} onSubmit={vi.fn()} onSendDeveloperInstructions={vi.fn()} />);
    expect(screen.getByTestId('onboarding-web-sdk-experience')).toBeInTheDocument();
    expect(screen.getByText('Web SDK Integration')).toBeInTheDocument();
    expect(screen.getByText('Web Push Integration')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Website integration guide' })).toBeInTheDocument();
  });

  it('renders failure and retry state from the backend interaction', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<AiInteractionRenderer interaction={interaction('analysis', { status: 'failed', actions: ['retry'] })} onSubmit={vi.fn()} onRetry={onRetry} error="Ben could not complete this analysis." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Ben could not complete this analysis.');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('disables a cancelled interaction and does not offer editable controls', () => {
    render(<AiInteractionRenderer interaction={interaction('push_creation', { status: 'cancelled', fields: [{ key: 'title', label: 'Title', type: 'text' }], actions: ['retry'] })} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('This interaction was cancelled. Its fields are no longer editable.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Title' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('offers reload for an expired interaction', async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();
    render(<AiInteractionRenderer interaction={interaction('onboarding', { status: 'expired', actions: ['retry'] })} onSubmit={vi.fn()} onReload={onReload} />);
    await user.click(screen.getByRole('button', { name: 'Reload' }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('calls retry for an expired interaction and labels it as starting again', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<AiInteractionRenderer interaction={interaction('onboarding', { status: 'expired', actions: ['retry'] })} onSubmit={vi.fn()} onRetry={onRetry} />);
    await user.click(screen.getByRole('button', { name: 'Start again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('parses audience JSON into an object before submitting', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AiInteractionRenderer interaction={interaction('push_creation', { fields: [{ key: 'audience', label: 'Audience', type: 'json', required: true }], actions: ['next'] })} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Audience' }), { target: { value: '{"segment":"vip"}' } });
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onSubmit).toHaveBeenCalledWith({ audience: { segment: 'vip' } }, 'next');
  });

  it('parses journey arrays and blocks invalid JSON', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AiInteractionRenderer interaction={interaction('journey_creation', { fields: [{ key: 'steps', label: 'Journey steps', type: 'json', required: true }], actions: ['next'] })} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Journey steps' }), { target: { value: '[{"channel":"push"}]' } });
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onSubmit).toHaveBeenCalledWith({ steps: [{ channel: 'push' }] }, 'next');

    fireEvent.change(screen.getByRole('textbox', { name: 'Journey steps' }), { target: { value: '{invalid' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Fix the invalid JSON in Journey steps');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('uses backend business-analysis steps for progress, result review, and confirmation', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const first = interaction('business_analysis', { step: 1, totalSteps: 3, fields: [{ key: 'businessDescription', label: 'Business description', type: 'text' }], actions: ['next'] });
    const { rerender } = render(<AiInteractionRenderer interaction={first} onSubmit={onSubmit} />);
    expect(screen.getByRole('textbox', { name: 'Business description' })).toBeInTheDocument();

    const review = { ...first, step: 2, fields: [{ key: 'analysis', label: 'Analysis result', type: 'json' as const, required: true }], actions: ['analyze', 'next', 'cancel'], data: { analysis: { elevatorPitch: 'A subscription product for teams.' } } };
    rerender(<AiInteractionRenderer interaction={review} onSubmit={onSubmit} />);
    expect(screen.getByLabelText('Step 2 of 3')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Business description' })).not.toBeInTheDocument();
    expect(screen.getByText('A subscription product for teams.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Analyze' }));
    expect(onSubmit).toHaveBeenCalledWith({ analysis: { elevatorPitch: 'A subscription product for teams.' } }, 'analyze');

    onSubmit.mockClear();
    rerender(<AiInteractionRenderer interaction={{ ...review, step: 3, fields: [{ key: 'confirmation', label: 'Confirm analysis', type: 'choice' as const, required: true, options: ['confirm'] }], actions: ['approve', 'cancel'] }} onSubmit={onSubmit} />);
    expect(screen.getByLabelText('Step 3 of 3')).toBeInTheDocument();
    expect(screen.getByText(/Confirm analysis/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'confirm' }));
    expect(screen.getByRole('button', { name: 'Approve analysis' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Approve analysis' }));
    expect(onSubmit).toHaveBeenCalledWith({ confirmation: 'confirm' }, 'approve');
    expect(screen.getByText('A subscription product for teams.')).toBeInTheDocument();
  });
});
