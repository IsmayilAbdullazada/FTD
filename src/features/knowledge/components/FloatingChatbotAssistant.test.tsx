import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, expect, test, vi } from 'vitest';
import { FloatingChatbotAssistant } from './FloatingChatbotAssistant';
import { knowledgeApi } from '../api/knowledgeApi';
vi.mock('../api/knowledgeApi', () => ({
  knowledgeApi: { chatWithAssistant: vi.fn() },
}));
const originalScroll = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'scrollIntoView',
);
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
afterAll(() => {
  if (originalScroll)
    Object.defineProperty(
      HTMLElement.prototype,
      'scrollIntoView',
      originalScroll,
    );
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
});
test.each(['', 'Allow extra time and offer familiar choices.'])(
  'guide responses show one introduction and preserve generated answer %j',
  async (answer) => {
    vi.mocked(knowledgeApi.chatWithAssistant).mockResolvedValue({
      answer,
      citedResources: [
        {
          id: 'guide-one',
          title: 'Daily routines',
          page: 2,
          url: '/resources/routines.pdf#page=2',
        },
      ],
    });
    render(
      <FloatingChatbotAssistant
        isOpen
        onClose={vi.fn()}
        onToggle={vi.fn()}
        onCreateDiscussion={vi.fn()}
      />,
    );
    fireEvent.change(
      screen.getByPlaceholderText('Ask a care partner question…'),
      { target: { value: 'Help with daily routines' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    const intro = "You may find what you're looking for on these guide pages";
    expect(await screen.findByText(intro)).toBeTruthy();
    expect(screen.getAllByText(intro)).toHaveLength(1);
    expect(
      screen.queryByText(
        'Here are relevant pages from the care guides. Review the source documents for details.',
      ),
    ).toBeNull();
    expect(screen.getByRole('link', { name: 'PDF' }).getAttribute('href')).toBe(
      '/resources/routines.pdf#page=2',
    );
    if (answer) expect(screen.getByText(answer)).toBeTruthy();
  },
);
