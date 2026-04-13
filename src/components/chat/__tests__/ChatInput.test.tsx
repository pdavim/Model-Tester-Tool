import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatInput } from '../ChatInput';
import { useChatStore } from '@/store/useChatStore';
import { useConfigStore } from '@/store/useConfigStore';
import { useModelStore } from '@/store/useModelStore';

// Mock the stores
vi.mock('@/store/useChatStore');
vi.mock('@/store/useConfigStore');
vi.mock('@/store/useModelStore');

describe('ChatInput', () => {
  const mockSetInput = vi.fn();
  const mockHandleSend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useChatStore as any).mockReturnValue({
      input: '',
      setInput: mockSetInput,
      selectedFiles: [],
      isLoading: false,
      isProcessingFiles: false,
      handleSend: mockHandleSend,
      setSelectedFiles: vi.fn(),
      removeAttachment: vi.fn(),
      setIsProcessingFiles: vi.fn(),
    });

    (useConfigStore as any).mockReturnValue({
      openRouterKey: 'key',
      hfApiKey: 'key',
    });

    (useModelStore as any).mockReturnValue({
      selectedModel: 'm1',
      selectedService: 'google',
    });
  });

  it('renders correctly', () => {
    render(<ChatInput />);
    expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
  });

  it('calls setInput on change', () => {
    render(<ChatInput />);
    const textarea = screen.getByPlaceholderText(/Type your message/i);
    fireEvent.change(textarea, { target: { value: 'new message' } });
    expect(mockSetInput).toHaveBeenCalledWith('new message');
  });

  it('disables send button when input is empty', () => {
    render(<ChatInput />);
    const sendButton = screen.getAllByRole('button')[2]; // Send button with icon
    expect(sendButton).toBeDisabled();
  });

  it('calls handleSend when clicked with input', async () => {
    (useChatStore as any).mockReturnValue({
      input: 'hello',
      setInput: mockSetInput,
      selectedFiles: [],
      isLoading: false,
      isProcessingFiles: false,
      handleSend: mockHandleSend,
      setSelectedFiles: vi.fn(),
      removeAttachment: vi.fn(),
      setIsProcessingFiles: vi.fn(),
    });

    render(<ChatInput />);
    const sendButton = screen.getAllByRole('button')[2];
    expect(sendButton).not.toBeDisabled();
    fireEvent.click(sendButton);
    
    expect(mockHandleSend).toHaveBeenCalled();
  });
});
