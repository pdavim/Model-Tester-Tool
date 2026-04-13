import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModelSelector } from '../ModelSelector';
import { useModelStore } from '@/store/useModelStore';
import { useChatStore } from '@/store/useChatStore';
import { useTestStore } from '@/store/useTestStore';

// Mock stores
vi.mock('@/store/useModelStore');
vi.mock('@/store/useChatStore');
vi.mock('@/store/useTestStore');

describe('ModelSelector', () => {
  const mockAddModelToTest = vi.fn();
  const mockRemoveModelFromTest = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useModelStore as any).mockReturnValue({
      models: [{ id: 'm1', name: 'Gemini 1.5 Pro', provider: 'google' }],
      customModels: [],
      hfHubModels: [],
      favorites: [],
      searchQuery: '',
      selectedService: 'all',
      filterFree: false,
      filterPaid: false,
      filterModality: [],
      filterTags: [],
      filterProviders: [],
      filterFavorites: false,
      sortBy: 'name',
      sortOrder: 'desc',
      setSearchQuery: vi.fn(),
      setSelectedService: vi.fn(),
      setFilterFree: vi.fn(),
      setFilterPaid: vi.fn(),
      setFilterModality: vi.fn(),
      setFilterTags: vi.fn(),
      setFilterProviders: vi.fn(),
      setFilterFavorites: vi.fn(),
      setSortBy: vi.fn(),
      setSortOrder: vi.fn(),
      clearFilters: vi.fn(),
      fetchModels: vi.fn(),
      toggleFavorite: vi.fn(),
    });

    (useChatStore as any).mockReturnValue({
      comparisonModels: [],
      setComparisonModels: vi.fn(),
    });

    (useTestStore as any).mockReturnValue({
      testModels: [],
      addModelToTest: mockAddModelToTest,
      removeModelFromTest: mockRemoveModelFromTest,
    });
  });

  it('renders the trigger button', () => {
    render(<ModelSelector mode="chat" />);
    expect(screen.getByText(/Select Model/i)).toBeInTheDocument();
  });

  it('shows "Selected (0) Models" in test mode', () => {
    render(<ModelSelector mode="test" />);
    expect(screen.getByText(/Selected \(0\) Models/i)).toBeInTheDocument();
  });

  it('calls addModelToTest when a model is clicked in test mode', () => {
    render(<ModelSelector mode="test" />);
    
    // Open the dialog
    const trigger = screen.getByText(/Selected \(0\) Models/i);
    fireEvent.click(trigger);
    
    // Find the model card/item
    const modelCard = screen.getByText(/Gemini 1.5 Pro/i);
    fireEvent.click(modelCard);
    
    expect(mockAddModelToTest).toHaveBeenCalledWith('m1');
  });
});
