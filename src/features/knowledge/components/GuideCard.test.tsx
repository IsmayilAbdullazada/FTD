import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { GuideCard } from './GuideCard';
import type { ClinicalResource, CurrentUser } from '@/types';
const base: ClinicalResource = {
  id: 'one',
  title: 'Daily routines',
  source: 'guide',
  status: 'APPROVED',
  isActive: true,
  summary: 'Practical information about familiar routines.',
  contentBody: '',
  category: 'DAILY_CARE',
  diseaseDomain: 'FTD',
  createdAt: '2026-01-01',
  keyTakeaways: [],
  fileAttachmentUrl: '/resources/routines.pdf',
};
const cases: Array<[Partial<ClinicalResource>, string[]]> = [
  [
    {
      source: 'resource',
      externalUrl: 'https://www.alz.org/help',
      fileAttachmentUrl: undefined,
    },
    ['Edit', 'Delete'],
  ],
  [{ status: 'DRAFT' }, ['Edit', 'Approve', 'Delete']],
  [{ status: 'APPROVED', isActive: true }, ['Edit', 'Unpublish', 'Delete']],
  [{ status: 'APPROVED', isActive: false }, ['Edit', 'Publish', 'Delete']],
];
afterEach(cleanup);
function card(resource: ClinicalResource, role: CurrentUser['role']) {
  return render(
    <GuideCard
      resource={resource}
      staff={role !== 'CARE_PARTNER'}
      onOpen={vi.fn()}
      onEdit={vi.fn()}
      onApprove={vi.fn()}
      onToggle={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
}
test.each(['CLINICIAN_MODERATOR', 'SYSTEM_ADMIN'] as const)(
  '%s has the exact overflow actions for each resource state',
  (role) => {
    for (const [overrides, expected] of cases) {
      card({ ...base, ...overrides }, role);
      fireEvent.click(
        screen.getByRole('button', { name: 'Actions for Daily routines' }),
      );
      expect(
        screen.getAllByRole('menuitem').map((item) => item.textContent),
      ).toEqual(expected);
      expect(screen.queryByText('Approved')).toBeNull();
      expect(Boolean(screen.queryByRole('button', { name: 'Approve' }))).toBe(
        overrides.status === 'DRAFT',
      );
      cleanup();
    }
  },
);
test('care partners have no staff actions and footer source cues remain informative', () => {
  card(
    {
      ...base,
      source: 'resource',
      fileAttachmentUrl: undefined,
      externalUrl: 'https://www.alz.org/help',
    },
    'CARE_PARTNER',
  );
  expect(screen.queryByRole('button', { name: /^Actions/ })).toBeNull();
  expect(screen.queryByRole('menuitem')).toBeNull();
  expect(screen.getByText('Website: alz.org')).toBeTruthy();
  expect(screen.getAllByRole('button')).toHaveLength(1);
});
test.each(['Enter', ' '])(
  '%j opens the menu; arrows and Escape navigate and restore focus',
  (key) => {
    card(base, 'CLINICIAN_MODERATOR');
    const trigger = screen.getByRole('button', {
      name: 'Actions for Daily routines',
    });
    trigger.focus();
    fireEvent.keyDown(trigger, { key });
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Edit' }),
    );
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Unpublish' }),
    );
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Delete' }),
    );
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  },
);
