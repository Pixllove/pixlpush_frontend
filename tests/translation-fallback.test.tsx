/** Fallback language select in the email AI translation panel. */
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/projects/api', () => ({ emailApi: { translate: vi.fn() } }));
import EmailTranslationPanel from '@/components/dashboard/EmailTranslationPanel';

const fr = { subject: 'Bonjour', html: '<p>Bonjour</p>' };

describe('email fallback language', () => {
  it('defaults to the editor language and offers only languages that have a version', async () => {
    const onFallbackChange = vi.fn();
    render(<EmailTranslationPanel mode="simple" onNotice={() => undefined} sourceLanguage="en" initialTranslations={{ en: { subject: 'Hi', html: '<p>Hi</p>' }, fr }} fallbackLanguage={null} onFallbackChange={onFallbackChange} />);
    await waitFor(() => expect(onFallbackChange).toHaveBeenCalledWith('en'));
    fireEvent.mouseDown(screen.getByLabelText('Fallback language'));
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['English', 'French']);
    expect(screen.getByText(/Otherwise, the selected fallback language is used/)).toBeInTheDocument();
  });

  it('ticked languages show up right away, disabled until translated', async () => {
    render(<EmailTranslationPanel mode="simple" onNotice={() => undefined} sourceLanguage="en" initialTranslations={{ fr }} fallbackLanguage="en" onFallbackChange={() => undefined} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Arabic/ }));
    fireEvent.mouseDown(screen.getByLabelText('Fallback language'));
    const arabic = within(screen.getByRole('listbox')).getByRole('option', { name: 'Arabic (translate first)' });
    expect(arabic).toHaveAttribute('aria-disabled', 'true');
    expect(within(screen.getByRole('listbox')).getByRole('option', { name: 'French' })).not.toHaveAttribute('aria-disabled');
  });

  it('a fallback whose version is gone resets to the editor language', async () => {
    const onFallbackChange = vi.fn();
    render(<EmailTranslationPanel mode="simple" onNotice={() => undefined} sourceLanguage="en" initialTranslations={{ fr }} fallbackLanguage="de" onFallbackChange={onFallbackChange} />);
    await waitFor(() => expect(onFallbackChange).toHaveBeenCalledWith('en'));
  });
});
