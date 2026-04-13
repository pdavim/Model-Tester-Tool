import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TestBench from '../TestBench';
import { useTestStore } from '@/store/useTestStore';
import { useModelStore } from '@/store/useModelStore';

// Mock stores
vi.mock('@/store/useTestStore');
vi.mock('@/store/useModelStore');

describe('TestBench', () => {
  const mockClearResults = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useTestStore as any).mockReturnValue({
      testResults: [],
      isTesting: false,
      battleAnalysis: null,
      isAnalyzing: false,
      testModels: ['m1'],
      currentTestIndex: 0,
      clearResults: mockClearResults,
      removeModelFromTest: vi.fn(),
    });

    (useModelStore as any).mockReturnValue({
      models: [{ id: 'm1', name: 'Model 1', provider: 'google' }],
      customModels: [],
    });
  });

  it('renders the Battle Mode header', () => {
    render(<TestBench />);
    expect(screen.getByText(/Model Battle Bench/i)).toBeInTheDocument();
  });

  it('shows empty state when no models are selected', () => {
    (useTestStore as any).mockReturnValue({
      testModels: [],
      testResults: [],
      isTesting: false,
      battleAnalysis: null,
      isAnalyzing: false,
      currentTestIndex: -1,
      clearResults: vi.fn(),
      removeModelFromTest: vi.fn(),
    });
    render(<TestBench />);
    expect(screen.getByText(/No Contenders/i)).toBeInTheDocument();
  });

  it('calls clearResults when reset button is clicked', () => {
    (useTestStore as any).mockReturnValue({
      testModels: ['m1'],
      testResults: [{ model: 'm1', status: 'completed' }],
      isTesting: false,
      battleAnalysis: null,
      isAnalyzing: false,
      clearResults: mockClearResults,
    });
    render(<TestBench />);
    const resetBtn = screen.getByText(/Reset/i);
    fireEvent.click(resetBtn);
    expect(mockClearResults).toHaveBeenCalled();
  });
});
