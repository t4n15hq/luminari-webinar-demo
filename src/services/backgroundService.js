// src/services/backgroundService.js
class BackgroundProcessingService {
  constructor() {
    this.activeJobs = new Map();
    this.completedJobs = new Map();
    this.listeners = new Map();
    this.jobCounter = 0;
    this.currentUserId = null; // Track current user
  }

  // Set current user (call this on login)
  setCurrentUser(userId) {
    this.currentUserId = userId;
    // Load user's jobs from storage
    this.initializeFromStorage();
  }

  // Clear current user (call this on logout)
  clearCurrentUser() {
    // Clear only current user's jobs from memory
    const userJobs = Array.from(this.completedJobs.values())
      .filter(job => job.userId === this.currentUserId);

    userJobs.forEach(job => {
      this.completedJobs.delete(job.id);
    });

    this.currentUserId = null;
  }

  // Start a background job
  startJob(type, data, apiFunction, userId = null) {
    const jobId = `${type}_${++this.jobCounter}_${Date.now()}`;
    const effectiveUserId = userId || this.currentUserId;

    const job = {
      id: jobId,
      type,
      data,
      status: 'running',
      startTime: Date.now(),
      progress: 0,
      result: null,
      error: null,
      userId: effectiveUserId // Associate job with user
    };

    this.activeJobs.set(jobId, job);
    this.notifyListeners(jobId, job);

    // Execute the API function
    this.executeJob(jobId, apiFunction, data);

    return jobId;
  }

  async executeJob(jobId, apiFunction, data) {
    try {
      const job = this.activeJobs.get(jobId);
      if (!job) return;

      // Update progress
      this.updateJobProgress(jobId, 25);

      // Execute the API call
      const result = await apiFunction(data);

      // Update progress
      this.updateJobProgress(jobId, 100);

      // Mark as completed
      job.status = 'completed';
      job.result = result;
      job.endTime = Date.now();

      // Move to completed jobs
      this.activeJobs.delete(jobId);
      this.completedJobs.set(jobId, job);

      this.notifyListeners(jobId, job);

      // Store in localStorage for persistence
      this.saveToStorage(jobId, job);

    } catch (error) {
      console.error(`Background job ${jobId} failed:`, error);
      
      const job = this.activeJobs.get(jobId);
      if (job) {
        job.status = 'error';
        job.error = error.message;
        job.endTime = Date.now();

        this.activeJobs.delete(jobId);
        this.completedJobs.set(jobId, job);

        this.notifyListeners(jobId, job);
        this.saveToStorage(jobId, job);
      }
    }
  }

  updateJobProgress(jobId, progress) {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.progress = progress;
      this.notifyListeners(jobId, job);
    }
  }

  // Subscribe to job updates
  subscribe(jobId, callback) {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, new Set());
    }
    this.listeners.get(jobId).add(callback);

    // Return unsubscribe function
    return () => {
      const jobListeners = this.listeners.get(jobId);
      if (jobListeners) {
        jobListeners.delete(callback);
        if (jobListeners.size === 0) {
          this.listeners.delete(jobId);
        }
      }
    };
  }

  notifyListeners(jobId, job) {
    const jobListeners = this.listeners.get(jobId);
    if (jobListeners) {
      jobListeners.forEach(callback => callback(job));
    }
  }

  // Get job status
  getJob(jobId) {
    return this.activeJobs.get(jobId) || this.completedJobs.get(jobId) || this.loadFromStorage(jobId);
  }

  // Get all active jobs (filtered by current user)
  getActiveJobs() {
    const jobs = Array.from(this.activeJobs.values());
    if (!this.currentUserId) return jobs;
    return jobs.filter(job => job.userId === this.currentUserId);
  }

  // Get all completed jobs (filtered by current user)
  getCompletedJobs() {
    const jobs = Array.from(this.completedJobs.values());
    if (!this.currentUserId) return jobs;
    return jobs.filter(job => job.userId === this.currentUserId);
  }

  // Cancel a job
  cancelJob(jobId) {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.status = 'cancelled';
      job.endTime = Date.now();
      
      this.activeJobs.delete(jobId);
      this.completedJobs.set(jobId, job);
      
      this.notifyListeners(jobId, job);
    }
  }

  // Clear a single job
  clearJob(jobId) {
    const job = this.completedJobs.get(jobId);
    if (job) {
      // Verify user owns this job
      if (this.currentUserId && job.userId !== this.currentUserId) {
        console.warn('Cannot clear job that does not belong to current user');
        return false;
      }

      this.completedJobs.delete(jobId);
      this.removeFromStorage(jobId);
      return true;
    }
    return false;
  }

  // Clear completed jobs (only for current user)
  clearCompleted() {
    if (this.currentUserId) {
      // Clear only current user's completed jobs
      const userJobs = Array.from(this.completedJobs.entries())
        .filter(([_, job]) => job.userId === this.currentUserId);

      userJobs.forEach(([jobId, _]) => {
        this.completedJobs.delete(jobId);
        this.removeFromStorage(jobId);
      });
    } else {
      // No user set, clear all
      this.completedJobs.clear();
      this.clearStorageCompletedJobs();
    }
  }

  // Storage methods for persistence (user-scoped)
  getStorageKey() {
    return this.currentUserId ? `backgroundJobs_${this.currentUserId}` : 'backgroundJobs';
  }

  saveToStorage(jobId, job) {
    try {
      const storageKey = this.getStorageKey();
      const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
      stored[jobId] = {
        ...job,
        // Don't store large result objects in localStorage
        result: job.result ? {
          hasResult: true,
          type: job.type,
          timestamp: job.endTime
        } : null
      };
      localStorage.setItem(storageKey, JSON.stringify(stored));
    } catch (error) {
      console.warn('Failed to save job to storage:', error);
    }
  }

  loadFromStorage(jobId) {
    try {
      const storageKey = this.getStorageKey();
      const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const job = stored[jobId] || null;

      // Verify user owns this job
      if (job && this.currentUserId && job.userId !== this.currentUserId) {
        return null;
      }

      return job;
    } catch (error) {
      console.warn('Failed to load job from storage:', error);
      return null;
    }
  }

  removeFromStorage(jobId) {
    try {
      const storageKey = this.getStorageKey();
      const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
      delete stored[jobId];
      localStorage.setItem(storageKey, JSON.stringify(stored));
    } catch (error) {
      console.warn('Failed to remove job from storage:', error);
    }
  }

  clearStorageCompletedJobs() {
    try {
      const storageKey = this.getStorageKey();
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  }

  // Initialize from storage on page load (user-scoped)
  initializeFromStorage() {
    try {
      // Clear existing completed jobs first
      this.completedJobs.clear();

      const storageKey = this.getStorageKey();
      const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
      Object.entries(stored).forEach(([jobId, job]) => {
        // Only load jobs for current user
        if (this.currentUserId && job.userId !== this.currentUserId) {
          return;
        }

        if (job.status === 'completed' || job.status === 'error' || job.status === 'cancelled') {
          this.completedJobs.set(jobId, job);
        }
      });
    } catch (error) {
      console.warn('Failed to initialize from storage:', error);
    }
  }
}

// Create singleton instance
const backgroundService = new BackgroundProcessingService();

// Initialize on page load
backgroundService.initializeFromStorage();

export default backgroundService;