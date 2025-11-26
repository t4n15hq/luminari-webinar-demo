// src/hooks/useBackgroundJobs.js
import { useState, useEffect, useCallback } from 'react';
import backgroundService from '../services/backgroundService';

export const useBackgroundJobs = (jobType = null) => {
  const [activeJobs, setActiveJobs] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);

  const refreshJobs = useCallback(() => {
    const active = backgroundService.getActiveJobs();
    const completed = backgroundService.getCompletedJobs();

    if (jobType) {
      setActiveJobs(active.filter(job => job.type === jobType));
      setCompletedJobs(completed.filter(job => job.type === jobType));
    } else {
      setActiveJobs(active);
      setCompletedJobs(completed);
    }
  }, [jobType]);

  useEffect(() => {
    refreshJobs();

    // Refresh every 2 seconds to catch updates
    const interval = setInterval(refreshJobs, 2000);

    return () => clearInterval(interval);
  }, [refreshJobs]);

  const startJob = useCallback((type, data, apiFunction) => {
    const jobId = backgroundService.startJob(type, data, apiFunction);
    refreshJobs();
    return jobId;
  }, [refreshJobs]);

  const cancelJob = useCallback((jobId) => {
    backgroundService.cancelJob(jobId);
    refreshJobs();
  }, [refreshJobs]);

  const clearJob = useCallback((jobId) => {
    backgroundService.clearJob(jobId);
    refreshJobs();
  }, [refreshJobs]);

  const clearCompleted = useCallback(() => {
    backgroundService.clearCompleted();
    refreshJobs();
  }, [refreshJobs]);

  const getJob = useCallback((jobId) => {
    return backgroundService.getJob(jobId);
  }, []);

  return {
    activeJobs,
    completedJobs,
    startJob,
    cancelJob,
    clearJob,
    clearCompleted,
    getJob,
    refreshJobs,
    hasActiveJobs: activeJobs.length > 0,
    hasCompletedJobs: completedJobs.length > 0
  };
};

export const useBackgroundJob = (jobId) => {
  const [job, setJob] = useState(null);

  useEffect(() => {
    if (!jobId) return;

    // Get initial job state
    const initialJob = backgroundService.getJob(jobId);
    setJob(initialJob);

    // Subscribe to updates
    const unsubscribe = backgroundService.subscribe(jobId, (updatedJob) => {
      setJob(updatedJob);
    });

    return unsubscribe;
  }, [jobId]);

  return job;
};