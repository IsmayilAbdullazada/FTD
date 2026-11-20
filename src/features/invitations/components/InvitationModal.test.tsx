import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { InvitationModal } from './InvitationModal';
import { authApi } from '@/features/auth/api/authApi';
import type { CommunityGroup } from '@/types';

vi.mock('@/features/auth/api/authApi', () => ({
  authApi: { issueInvitation: vi.fn() },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const cohort: CommunityGroup = {
  id: 'group-central-maryland',
  name: 'Central Maryland',
  slug: 'central-maryland',
  description: 'Test cohort',
  isGeneralBoard: false,
  geographicRegion: 'Maryland',
  tag: 'REGIONAL',
  isActive: true,
  memberCount: 0,
};

for (const registrationUrl of [
  'https://hopkinscarepartners.eng.jhu.edu/register?token=invitation-fixture-token',
  '/register?token=invitation-fixture-token',
]) {
  test(`invitation display, clipboard and mail app preserve ${registrationUrl.startsWith('https:') ? 'absolute' : 'relative'} registration links`, async () => {
    const expected = registrationUrl.startsWith('https:')
      ? registrationUrl
      : `${window.location.origin}/register?token=invitation-fixture-token`;
    vi.mocked(authApi.issueInvitation).mockResolvedValue({
      invitationId: 'invitation-fixture',
      inviteToken: 'invitation-fixture-token',
      inviteExpiresAt: '2030-01-01T00:00:00Z',
      registrationUrl,
      status: 'DISPATCHED',
      emailSent: true,
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(<InvitationModal isOpen onClose={vi.fn()} cohorts={[cohort]} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Carol'), {
      target: { value: 'Carol' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Jenkins'), {
      target: { value: 'Partner' },
    });
    fireEvent.change(screen.getByPlaceholderText('first.last@example.com'), {
      target: { value: 'care@example.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'FTD' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send Invitation' }));
    const input = (await screen.findByLabelText(
      'Invite Link',
    )) as HTMLInputElement;
    expect(input.value).toBe(expected);
    fireEvent.click(screen.getByRole('button', { name: 'Copy Link' }));
    expect(writeText).toHaveBeenCalledWith(expected);
    const mail = screen.getByRole('link', { name: 'Send via Mail App' });
    const body = new URL(mail.getAttribute('href')!).searchParams.get('body')!;
    expect(body).toContain(expected);
    expect(body.split(expected)).toHaveLength(2);
    expect(body).not.toContain(`${window.location.origin}https://`);
  });
}

test('an invitation created without email delivery offers sharing without claiming it was emailed', async () => {
  vi.mocked(authApi.issueInvitation).mockResolvedValue({
    invitationId: 'fixture',
    inviteToken: 'fixture-token',
    inviteExpiresAt: '2030-01-01T00:00:00Z',
    registrationUrl: 'https://example.test/register?token=fixture-token',
    status: 'DISPATCHED',
    emailSent: false,
  });
  render(<InvitationModal isOpen onClose={vi.fn()} cohorts={[cohort]} />);
  fireEvent.change(screen.getByPlaceholderText('e.g. Carol'), {
    target: { value: 'Carol' },
  });
  fireEvent.change(screen.getByPlaceholderText('e.g. Jenkins'), {
    target: { value: 'Partner' },
  });
  fireEvent.change(screen.getByPlaceholderText('first.last@example.com'), {
    target: { value: 'care@example.test' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'FTD' }));
  fireEvent.click(screen.getByRole('button', { name: 'Send Invitation' }));
  expect(await screen.findByText('Invitation created')).toBeTruthy();
  expect(screen.getByText(/email could not be sent/i)).toBeTruthy();
  expect(screen.queryByText('Invitation emailed')).toBeNull();
  expect((screen.getByLabelText('Invite Link') as HTMLInputElement).value).toBe(
    'https://example.test/register?token=fixture-token',
  );
});
