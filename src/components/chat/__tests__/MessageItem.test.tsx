import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MessageItem } from '../MessageItem';

describe('MessageItem', () => {
  it('renders user message correctly', () => {
    const message = { role: 'user' as const, content: 'hello' };
    render(<MessageItem message={message} />);
    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('renders assistant message correctly', () => {
    const message = { role: 'assistant' as const, content: 'reply', model: 'gpt-4' };
    render(<MessageItem message={message} />);
    expect(screen.getByText('reply')).toBeInTheDocument();
    expect(screen.getByText('AI Response')).toBeInTheDocument();
  });

  it('renders attachments if present', () => {
    const message = { 
      role: 'user' as const, 
      content: 'hi',
      attachments: [{ id: '1', name: 'file.txt', type: 'text' as const, url: '#' }]
    };
    render(<MessageItem message={message} />);
    expect(screen.getByText('file.txt')).toBeInTheDocument();
  });
});
