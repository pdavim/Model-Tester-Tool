import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTestStore } from '../useTestStore';

describe('useTestStore', () => {
  beforeEach(() => {
    useTestStore.setState({
      isTesting: false,
      testResults: [],
      testModels: [],
      battleAnalysis: null,
      isAnalyzing: false,
    });
  });

  it('should initialize with default test state', () => {
    const state = useTestStore.getState();
    expect(state.isTesting).toBe(false);
    expect(state.testResults).toEqual([]);
    expect(state.battleAnalysis).toBeNull();
  });

  it('should clear all results', () => {
    useTestStore.setState({ testResults: [{ model: 'm1', latency: 100, tokens: 10, status: 'completed' }] });
    useTestStore.getState().clearResults();
    expect(useTestStore.getState().testResults).toHaveLength(0);
    expect(useTestStore.getState().battleAnalysis).toBeNull();
  });

  it('should update test models list', () => {
    useTestStore.getState().setTestModels(['m1', 'm2']);
    expect(useTestStore.getState().testModels).toEqual(['m1', 'm2']);
  });

  it('should add model to test list', () => {
    useTestStore.getState().addModelToTest('m1');
    expect(useTestStore.getState().testModels).toContain('m1');
  });
});
