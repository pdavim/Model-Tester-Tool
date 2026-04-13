import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChatStore } from '../useChatStore';

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      sessions: [],
      currentSessionId: null,
      input: '',
      selectedFiles: [],
      isLoading: false,
      isProcessingFiles: false,
      comparisonMode: false,
      comparisonModels: [],
      systemPrompt: 'You are a helpful AI assistant.',
      temperature: 0.7,
    });
  });

  it('creates a new session with correct default parameters', () => {
    useChatStore.getState().createNewSession();
    const state = useChatStore.getState();
    expect(state.sessions.length).toBe(1);
    expect(state.sessions[0].parameters.temperature).toBe(0.7);
    expect(state.sessions[0].parameters.selectedService).toBe('all');
  });

  it('updates parameters for the current session specifically', () => {
    useChatStore.getState().createNewSession();
    const sessionId = useChatStore.getState().currentSessionId!;
    useChatStore.getState().setTemperature(0.5);
    
    const session = useChatStore.getState().sessions.find(s => s.id === sessionId);
    expect(session?.parameters.temperature).toBe(0.5);
    // Global default should remain same (for next new session) or update? 
    // In our implementation, we update current session if exists.
  });

  it('sets selected model for a specific session', () => {
    useChatStore.getState().createNewSession();
    const sessionId = useChatStore.getState().currentSessionId!;
    useChatStore.getState().setSelectedModelForSession(sessionId, 'gpt-4', 'openrouter');
    
    const session = useChatStore.getState().sessions.find(s => s.id === sessionId);
    expect(session?.parameters.selectedModel).toBe('gpt-4');
    expect(session?.parameters.selectedService).toBe('openrouter');
  });
});
