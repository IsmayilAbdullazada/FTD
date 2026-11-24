import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { AssistantGuidanceTester } from './AssistantGuidanceTester';
import { guideApi } from '../api/guideApi';
vi.mock('../api/guideApi', () => ({
  guideApi: { testChatbotGuideRetrieval: vi.fn() },
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
test('staff guidance testing shows answers and sources while omitting chunk diagnostics', async () => {
  vi.mocked(guideApi.testChatbotGuideRetrieval).mockResolvedValue({
    answer: 'Allow extra time and offer choices.',
    retrievedChunks: [
      {
        guideTitle: 'Bathing',
        fileName: 'bathing.pdf',
        page: 2,
        content: 'INTERNAL CHUNK TEXT',
        score: 0.93,
      },
    ],
    citedResources: [
      {
        id: 'guide-one',
        title: 'Bathing guide',
        url: '/resources/bathing.pdf',
        page: 2,
      },
    ],
  });
  render(<AssistantGuidanceTester />);
  fireEvent.change(screen.getByLabelText('Your test question'), {
    target: { value: '  How can I help with bathing?  ' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Test Guidance' }));
  expect(
    await screen.findByText('Allow extra time and offer choices.'),
  ).toBeTruthy();
  expect(guideApi.testChatbotGuideRetrieval).toHaveBeenCalledWith(
    'How can I help with bathing?',
  );
  expect(
    screen
      .getByRole('link', { name: 'Bathing guide · Page 2' })
      .getAttribute('href'),
  ).toBe('/resources/bathing.pdf');
  expect(screen.queryByText('INTERNAL CHUNK TEXT')).toBeNull();
  expect(screen.queryByText(/0\.93|93%/)).toBeNull();
});
test('example questions can be tested and a failed query offers a usable retry', async () => {
  vi.mocked(guideApi.testChatbotGuideRetrieval)
    .mockRejectedValueOnce(new Error('Please try again.'))
    .mockResolvedValueOnce({ answer: 'Contact your care team.' });
  render(<AssistantGuidanceTester />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Can I change a medication dose?' }),
  );
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    'Please try again.',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Test Guidance' }));
  expect(await screen.findByText('Contact your care team.')).toBeTruthy();
});

test('retrieval-only responses show the same fallback as Care Companion instead of a blank answer', async () => {
  vi.mocked(guideApi.testChatbotGuideRetrieval).mockResolvedValue({
    answer: '',
    isOffline: true,
    citedResources: [
      { id: 'guide-one', title: 'Care guide', url: '/resources/care.pdf' },
    ],
  });
  render(<AssistantGuidanceTester />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Can I change a medication dose?' }),
  );
  expect(
    await screen.findByText(
      "You may find what you're looking for on these guide pages",
    ),
  ).toBeTruthy();
});
