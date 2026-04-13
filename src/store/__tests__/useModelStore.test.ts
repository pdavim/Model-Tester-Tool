import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useModelStore } from '../useModelStore';

describe('useModelStore', () => {
  beforeEach(() => {
    useModelStore.setState({
      models: [],
      customModels: [],
      favorites: [],
      hfHubModels: [],
      isLoadingModels: false,
    });
  });

  it('should initialize with empty state', () => {
    const state = useModelStore.getState();
    expect(state.models).toEqual([]);
    expect(state.favorites).toEqual([]);
  });

  it('should add/delete custom models', () => {
    const custom = { id: 'my/model', name: 'My Model' };
    useModelStore.getState().addCustomModel(custom);
    expect(useModelStore.getState().customModels).toHaveLength(1);
    expect(useModelStore.getState().customModels[0].id).toBe('my/model');
    
    useModelStore.getState().deleteCustomModel('my/model');
    expect(useModelStore.getState().customModels).toHaveLength(0);
  });

  it('should toggle favorites', () => {
    useModelStore.getState().toggleFavorite('m1');
    expect(useModelStore.getState().favorites).toContain('m1');
    
    useModelStore.getState().toggleFavorite('m1');
    expect(useModelStore.getState().favorites).not.toContain('m1');
  });

  it('should update search query', () => {
    useModelStore.getState().setSearchQuery('gpt');
    expect(useModelStore.getState().searchQuery).toBe('gpt');
  });
});
