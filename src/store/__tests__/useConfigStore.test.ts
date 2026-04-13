import { describe, it, expect, beforeEach } from 'vitest';
import { useConfigStore } from '../useConfigStore';

describe('useConfigStore', () => {
  beforeEach(() => {
    useConfigStore.setState({
      openRouterKey: '',
      hfApiKey: '',
      presets: [],
      sidebarOpen: true,
      testMode: false,
    });
  });

  it('should initialize with default config', () => {
    const state = useConfigStore.getState();
    expect(state.openRouterKey).toBe('');
    expect(state.hfApiKey).toBe('');
    expect(state.sidebarOpen).toBe(true);
  });

  it('should update openRouterKey correctly', () => {
    useConfigStore.getState().setOpenRouterKey('test-or-key');
    expect(useConfigStore.getState().openRouterKey).toBe('test-or-key');
  });

  it('should update hfApiKey correctly', () => {
    useConfigStore.getState().setHfApiKey('test-hf-key');
    expect(useConfigStore.getState().hfApiKey).toBe('test-hf-key');
  });

  it('should toggle sidebar', () => {
    useConfigStore.getState().setSidebarOpen(false);
    expect(useConfigStore.getState().sidebarOpen).toBe(false);
  });

  it('should toggle test mode', () => {
    useConfigStore.getState().setTestMode(true);
    expect(useConfigStore.getState().testMode).toBe(true);
  });
});
