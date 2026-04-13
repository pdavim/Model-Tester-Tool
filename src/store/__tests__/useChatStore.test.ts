import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useChatStore } from '../useChatStore';

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      sessions: [],
      currentSessionId: null,
      input: '',
      selectedFiles: [],
      isLoading: false,
    });
  });

  it('should initialize with empty sessions', () => {
    const state = useChatStore.getState();
    expect(state.sessions).toEqual([]);
    expect(state.currentSessionId).toBeNull();
  });

  it('should create a new session', () => {
    useChatStore.getState().createNewSession();
    const state = useChatStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.currentSessionId).not.toBeNull();
    expect(state.sessions[0].name).toBe('New Conversation');
  });

  it('should delete a session', () => {
    useChatStore.getState().createNewSession();
    const sessionId = useChatStore.getState().currentSessionId!;
    useChatStore.getState().deleteSession(sessionId);
    expect(useChatStore.getState().sessions).toHaveLength(0);
  });

  it('should update input correctly', () => {
    useChatStore.getState().setInput('prompt');
    expect(useChatStore.getState().input).toBe('prompt');
  });

  it('should rename a session', () => {
    useChatStore.getState().createNewSession();
    const sessionId = useChatStore.getState().currentSessionId!;
    useChatStore.getState().renameSession(sessionId, 'My Chat');
    expect(useChatStore.getState().sessions[0].name).toBe('My Chat');
  });
});
