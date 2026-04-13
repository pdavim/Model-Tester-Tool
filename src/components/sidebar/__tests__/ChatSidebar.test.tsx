import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatSidebar } from '../ChatSidebar';
import { useChatStore } from '@/store/useChatStore';
import { useConfigStore } from '@/store/useConfigStore';

// Mock stores
vi.mock('@/store/useChatStore');
vi.mock('@/store/useConfigStore');

describe('ChatSidebar', () => {
  const mockCreateNewSession = vi.fn();
  const mockSetCurrentSessionId = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useChatStore as any).mockReturnValue({
      sessions: [{ id: 's1', name: 'Chat 1', messages: [], createdAt: Date.now() }],
      currentSessionId: 's1',
      createNewSession: mockCreateNewSession,
      setCurrentSessionId: mockSetCurrentSessionId,
      deleteSession: vi.fn(),
      renameSession: vi.fn(),
    });

    (useConfigStore as any).mockReturnValue({
      sidebarOpen: true,
      setSidebarOpen: vi.fn(),
      testMode: false,
      setTestMode: vi.fn(),
    });
  });

  it('renders correctly with open state', () => {
    render(<ChatSidebar />);
    expect(screen.getByText(/Chat 1/i)).toBeInTheDocument();
  });

  it('calls createNewSession when "New Chat" is clicked', () => {
    render(<ChatSidebar />);
    const newChatBtn = screen.getByText(/New Conversation/i);
    fireEvent.click(newChatBtn);
    expect(mockCreateNewSession).toHaveBeenCalled();
  });

  it('calls setCurrentSessionId when a session is clicked', () => {
    render(<ChatSidebar />);
    const sessionItem = screen.getByText(/Chat 1/i);
    fireEvent.click(sessionItem);
    expect(mockSetCurrentSessionId).toHaveBeenCalledWith('s1');
  });
});
