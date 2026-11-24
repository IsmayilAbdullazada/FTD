import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { KnowledgeBaseExplorer } from './KnowledgeBaseExplorer';
import { contentApi } from '@/features/content/api/contentApi';
import { guideApi } from '../api/guideApi';
import type { ClinicalResource, CurrentUser } from '@/types';
import type { ChatbotGuideFile } from '../types';
vi.mock('@/features/content/api/contentApi', () => ({
  contentApi: { getResources: vi.fn(), createResource: vi.fn() },
}));
vi.mock('../api/guideApi', () => ({
  guideApi: {
    getChatbotGuides: vi.fn(),
    uploadChatbotGuide: vi.fn(),
    updateChatbotGuide: vi.fn(),
  },
}));
const resource: ClinicalResource = {
  id: 'fixture',
  title: 'Bathing guide',
  summary: 'A useful summary.',
  contentBody: 'Old detailed care protocol.',
  source: 'resource',
  category: 'GENERAL_EDUCATION',
  diseaseDomain: 'FTD',
  keyTakeaways: [],
  createdAt: '2026-01-01',
  externalUrl: 'https://example.org/guide',
};
function user(role: CurrentUser['role']): CurrentUser {
  return {
    id: 'fixture',
    role,
    email: 'fixture@example.test',
    firstName: 'Test',
    lastName: 'Member',
    condition: 'FTD',
    anonymousHandle: 'User-123',
    badgeLabel: 'Fixture',
    avatarColor: '#002D72',
  };
}
beforeEach(() => {
  vi.mocked(contentApi.getResources).mockResolvedValue([resource]);
  vi.mocked(guideApi.getChatbotGuides).mockResolvedValue({
    guides: [],
    config: { totalActiveGuides: 0, totalWords: 0 },
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
test('the guidance tester is present only for the Moderator role', async () => {
  for (const role of [
    'CARE_PARTNER',
    'SYSTEM_ADMIN',
    'CLINICIAN_MODERATOR',
  ] as const) {
    render(<KnowledgeBaseExplorer currentUser={user(role)} />);
    await screen.findByRole('heading', { name: 'Bathing guide' });
    expect(
      Boolean(
        screen.queryByRole('heading', { name: 'Test Assistant Guidance' }),
      ),
    ).toBe(role === 'CLINICIAN_MODERATOR');
    cleanup();
  }
});
test('viewing a linked guide omits the old care-instruction panel and keeps source access', async () => {
  render(<KnowledgeBaseExplorer currentUser={user('CARE_PARTNER')} />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'View guide: Bathing guide' }),
  );
  expect(screen.queryByText(/Step-by-Step/)).toBeNull();
  expect(screen.queryByText(resource.contentBody)).toBeNull();
  expect(
    screen
      .getByRole('link', { name: 'Visit source website' })
      .getAttribute('href'),
  ).toBe(resource.externalUrl);
});
test('text-only guides remain readable without a PDF or care-instruction panel', async () => {
  vi.mocked(contentApi.getResources).mockResolvedValue([
    { ...resource, source: 'guide', externalUrl: undefined },
  ]);
  render(<KnowledgeBaseExplorer currentUser={user('CARE_PARTNER')} />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'View guide: Bathing guide' }),
  );
  expect(screen.getByRole('region', { name: 'Guide text' }).textContent).toBe(
    resource.contentBody,
  );
  expect(screen.queryByText(/Step-by-Step/)).toBeNull();
  expect(screen.queryByRole('link', { name: 'Open PDF guide' })).toBeNull();
  expect(screen.queryByText('0', { exact: true })).toBeNull();
});
test('a webpage publishes without mandatory protocol content and updates dashboard library counts', async () => {
  vi.mocked(contentApi.createResource).mockResolvedValue(resource);
  const changed = vi.fn();
  render(
    <KnowledgeBaseExplorer
      currentUser={user('CLINICIAN_MODERATOR')}
      onResourcesChanged={changed}
    />,
  );
  await screen.findByRole('heading', { name: 'Bathing guide' });
  fireEvent.click(screen.getByRole('button', { name: 'Add guide' }));
  fireEvent.click(screen.getByRole('button', { name: 'Link to a webpage' }));
  fireEvent.change(screen.getByLabelText('Title'), {
    target: { value: 'Bathing guide' },
  });
  fireEvent.change(screen.getByLabelText('Brief Summary / Abstract'), {
    target: { value: 'A useful summary.' },
  });
  fireEvent.change(screen.getByLabelText('External Citation'), {
    target: { value: 'https://example.org/guide' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Both' }));
  fireEvent.click(screen.getByRole('button', { name: 'Publish Guide' }));
  await waitFor(() =>
    expect(contentApi.createResource).toHaveBeenCalledWith(
      expect.objectContaining({
        contentBody: 'A useful summary.',
        externalUrl: 'https://example.org/guide',
      }),
    ),
  );
  await waitFor(() =>
    expect(changed).toHaveBeenLastCalledWith([
      expect.objectContaining({
        source: 'resource',
        status: 'APPROVED',
        isActive: true,
      }),
    ]),
  );
});

test('legacy daily-living topics share one filter and unassigned guides have no generic badge', async () => {
  vi.mocked(contentApi.getResources).mockResolvedValue([
    {
      ...resource,
      id: 'one',
      title: 'Toileting guide',
      category: 'INCONTINENCE',
    },
    { ...resource, id: 'two', title: 'Routine guide', category: 'DAILY_CARE' },
    {
      ...resource,
      id: 'three',
      title: 'Unassigned resource',
      category: 'GUIDE',
    },
  ]);
  render(<KnowledgeBaseExplorer currentUser={user('CARE_PARTNER')} />);
  await screen.findByRole('heading', { name: 'Unassigned resource' });
  expect(screen.queryByText('GUIDE', { exact: true })).toBeNull();
  const filter = screen.getByLabelText('Topic:');
  fireEvent.change(filter, { target: { value: 'DAILY_CARE' } });
  expect(screen.getByRole('heading', { name: 'Toileting guide' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Routine guide' })).toBeTruthy();
  expect(
    screen.queryByRole('heading', { name: 'Unassigned resource' }),
  ).toBeNull();
  fireEvent.change(filter, { target: { value: 'UNCATEGORIZED' } });
  expect(
    screen.getByRole('heading', { name: 'Unassigned resource' }),
  ).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Routine guide' })).toBeNull();
});

test('editing a title preserves an older custom topic until staff select a replacement', async () => {
  const guide: ChatbotGuideFile = {
    id: 'fixture',
    title: 'Bathing guide',
    condition: 'FTD',
    category: 'Legacy custom topic',
    fileName: 'notes.txt',
    fileSize: 48,
    mimeType: 'text/plain',
    content: 'A readable text document.',
    isActive: true,
    status: 'APPROVED',
    uploadedBy: 'fixture',
    uploadedByName: 'Moderator',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };
  vi.mocked(contentApi.getResources).mockResolvedValue([
    { ...resource, source: 'guide', category: guide.category! },
  ]);
  vi.mocked(guideApi.getChatbotGuides).mockResolvedValue({
    guides: [guide],
    config: { totalActiveGuides: 1, totalWords: 5 },
  });
  vi.mocked(guideApi.updateChatbotGuide).mockResolvedValue({
    success: true,
    guide,
  });
  render(<KnowledgeBaseExplorer currentUser={user('CLINICIAN_MODERATOR')} />);
  await screen.findByRole('heading', { name: 'Bathing guide' });
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  await screen.findByRole('dialog', { name: 'Edit guide' });
  fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
    target: { value: 'Updated title' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
  await waitFor(() =>
    expect(guideApi.updateChatbotGuide).toHaveBeenCalledWith(
      'fixture',
      expect.objectContaining({
        title: 'Updated title',
        category: 'Legacy custom topic',
        topicTag: 'Legacy custom topic',
      }),
    ),
  );
});
