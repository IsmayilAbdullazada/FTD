import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { Header } from './Header';
import { ThemeProvider } from '../providers/ThemeProvider';
afterEach(cleanup);
test('My Posts keeps its action without secondary tracking copy', () => {
  const open = vi.fn();
  render(
    <ThemeProvider>
      <Header
        currentUser={{
          id: 'header-test',
          email: 'test@example.test',
          role: 'CARE_PARTNER',
          firstName: 'Test',
          lastName: 'Partner',
          anonymousHandle: 'User-123',
          badgeLabel: 'Care Partner',
          avatarColor: '#002D72',
          condition: 'FTD',
        }}
        allPersonas={[]}
        onSwitchPersona={vi.fn()}
        activeTab="feed"
        setActiveTab={vi.fn()}
        pendingTriageCount={0}
        notifications={[]}
        onOpenNotifications={vi.fn()}
        onOpenMyPosts={open}
        fontSize={100}
        onFontSizeChange={() => {}}
      />
    </ThemeProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
  expect(screen.queryByText('Track your posts →')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'My Posts' }));
  expect(open).toHaveBeenCalledOnce();
});
