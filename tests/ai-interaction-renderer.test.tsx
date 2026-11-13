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
