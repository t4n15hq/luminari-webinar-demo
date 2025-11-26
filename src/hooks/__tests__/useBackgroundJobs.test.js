import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useBackgroundJobs } from '../useBackgroundJobs';
import * as backgroundService from '../../services/backgroundService';

// Mock the background service
jest.mock('../../services/backgroundService', () => ({
  addJob: jest.fn(),
  removeJob: jest.fn(),
  clearCompletedJobs: jest.fn(),
  getJobs: jest.fn(),
  subscribeToUpdates: jest.fn()
}));

describe('useBackgroundJobs Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    backgroundService.getJobs.mockReturnValue({
      active: [],
      completed: []
    });
    
    backgroundService.subscribeToUpdates.mockImplementation((callback) => {
      // Return unsubscribe function
      return () => {};
    });
  });

  test('initializes with empty jobs', () => {
    const { result } = renderHook(() => useBackgroundJobs());
    
    expect(result.current.activeJobs).toEqual([]);
    expect(result.current.completedJobs).toEqual([]);
    expect(result.current.hasActiveJobs).toBe(false);
    expect(result.current.hasCompletedJobs).toBe(false);
  });

  test('loads existing jobs on mount', () => {
    const mockJobs = {
      active: [
        { id: '1', type: 'regulatory_document', status: 'running', startTime: Date.now() }
      ],
      completed: [
        { id: '2', type: 'protocol', status: 'completed', startTime: Date.now() - 5000, endTime: Date.now() }
      ]
    };
    
    backgroundService.getJobs.mockReturnValue(mockJobs);
    
    const { result } = renderHook(() => useBackgroundJobs());
    
    expect(result.current.activeJobs).toEqual(mockJobs.active);
    expect(result.current.completedJobs).toEqual(mockJobs.completed);
    expect(result.current.hasActiveJobs).toBe(true);
    expect(result.current.hasCompletedJobs).toBe(true);
  });

  test('subscribes to updates on mount', () => {
    renderHook(() => useBackgroundJobs());
    
    expect(backgroundService.subscribeToUpdates).toHaveBeenCalledTimes(1);
    expect(backgroundService.subscribeToUpdates).toHaveBeenCalledWith(expect.any(Function));
  });

  test('updates state when jobs change', () => {
    let updateCallback;
    backgroundService.subscribeToUpdates.mockImplementation((callback) => {
      updateCallback = callback;
      return () => {};
    });
    
    const { result } = renderHook(() => useBackgroundJobs());
    
    // Initial state
    expect(result.current.activeJobs).toEqual([]);
    
    // Simulate job update
    const newJob = { id: '1', type: 'regulatory_document', status: 'running', startTime: Date.now() };
    backgroundService.getJobs.mockReturnValue({
      active: [newJob],
      completed: []
    });
    
    act(() => {
      updateCallback();
    });
    
    expect(result.current.activeJobs).toEqual([newJob]);
    expect(result.current.hasActiveJobs).toBe(true);
  });

  test('addJob function calls service and updates state', () => {
    let updateCallback;
    backgroundService.subscribeToUpdates.mockImplementation((callback) => {
      updateCallback = callback;
      return () => {};
    });
    
    const { result } = renderHook(() => useBackgroundJobs());
    
    const jobData = {
      type: 'protocol',
      data: { disease: 'Test Disease' }
    };
    
    const mockJobId = 'job-123';
    backgroundService.addJob.mockReturnValue(mockJobId);
    
    let returnedJobId;
    act(() => {
      returnedJobId = result.current.addJob(jobData.type, jobData.data);
    });
    
    expect(backgroundService.addJob).toHaveBeenCalledWith(jobData.type, jobData.data);
    expect(returnedJobId).toBe(mockJobId);
  });

  test('cancelJob function calls removeJob service', () => {
    const { result } = renderHook(() => useBackgroundJobs());
    
    const jobId = 'job-123';
    
    act(() => {
      result.current.cancelJob(jobId);
    });
    
    expect(backgroundService.removeJob).toHaveBeenCalledWith(jobId);
  });

  test('clearCompleted function calls service', () => {
    const { result } = renderHook(() => useBackgroundJobs());
    
    act(() => {
      result.current.clearCompleted();
    });
    
    expect(backgroundService.clearCompletedJobs).toHaveBeenCalledTimes(1);
  });

  test('unsubscribes on unmount', () => {
    const mockUnsubscribe = jest.fn();
    backgroundService.subscribeToUpdates.mockReturnValue(mockUnsubscribe);
    
    const { unmount } = renderHook(() => useBackgroundJobs());
    
    unmount();
    
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  test('hasActiveJobs returns true when active jobs exist', () => {
    const mockJobs = {
      active: [
        { id: '1', type: 'regulatory_document', status: 'running' }
      ],
      completed: []
    };
    
    backgroundService.getJobs.mockReturnValue(mockJobs);
    
    const { result } = renderHook(() => useBackgroundJobs());
    
    expect(result.current.hasActiveJobs).toBe(true);
  });

  test('hasCompletedJobs returns true when completed jobs exist', () => {
    const mockJobs = {
      active: [],
      completed: [
        { id: '1', type: 'protocol', status: 'completed' }
      ]
    };
    
    backgroundService.getJobs.mockReturnValue(mockJobs);
    
    const { result } = renderHook(() => useBackgroundJobs());
    
    expect(result.current.hasCompletedJobs).toBe(true);
  });

  test('handles multiple job updates correctly', () => {
    let updateCallback;
    backgroundService.subscribeToUpdates.mockImplementation((callback) => {
      updateCallback = callback;
      return () => {};
    });
    
    const { result } = renderHook(() => useBackgroundJobs());
    
    // First update - add active job
    const job1 = { id: '1', type: 'regulatory_document', status: 'running' };
    backgroundService.getJobs.mockReturnValue({
      active: [job1],
      completed: []
    });
    
    act(() => {
      updateCallback();
    });
    
    expect(result.current.activeJobs).toEqual([job1]);
    expect(result.current.completedJobs).toEqual([]);
    
    // Second update - job completed
    const completedJob1 = { ...job1, status: 'completed', endTime: Date.now() };
    backgroundService.getJobs.mockReturnValue({
      active: [],
      completed: [completedJob1]
    });
    
    act(() => {
      updateCallback();
    });
    
    expect(result.current.activeJobs).toEqual([]);
    expect(result.current.completedJobs).toEqual([completedJob1]);
  });

  test('handles service errors gracefully', () => {
    backgroundService.getJobs.mockImplementation(() => {
      throw new Error('Service error');
    });
    
    // Should not throw error
    const { result } = renderHook(() => useBackgroundJobs());
    
    // Should fall back to empty state
    expect(result.current.activeJobs).toEqual([]);
    expect(result.current.completedJobs).toEqual([]);
  });

  test('cancelJob handles non-existent job gracefully', () => {
    const { result } = renderHook(() => useBackgroundJobs());
    
    // Should not throw error
    act(() => {
      result.current.cancelJob('non-existent-id');
    });
    
    expect(backgroundService.removeJob).toHaveBeenCalledWith('non-existent-id');
  });

  test('multiple hook instances share the same job state', () => {
    const mockJobs = {
      active: [{ id: '1', type: 'regulatory_document', status: 'running' }],
      completed: []
    };
    
    backgroundService.getJobs.mockReturnValue(mockJobs);
    
    const { result: result1 } = renderHook(() => useBackgroundJobs());
    const { result: result2 } = renderHook(() => useBackgroundJobs());
    
    expect(result1.current.activeJobs).toEqual(result2.current.activeJobs);
    expect(result1.current.completedJobs).toEqual(result2.current.completedJobs);
  });
});