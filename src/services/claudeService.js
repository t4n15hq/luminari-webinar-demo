// src/services/claudeService.js - Claude API Integration for Enhanced LumiPath Features

import axios from 'axios';

// Use backend API URL
const BACKEND_API_URL = process.env.REACT_APP_DOCUMENTS_API_URL || 'http://localhost:4000';

// Create axios instance for backend API
const backendApi = axios.create({
  baseURL: BACKEND_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
backendApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const claudeService = {
  
  // TIER 1 ENHANCEMENT 1: Enhanced Free Text Processing
  enhancedTextProcessing: async (clinicalText, extractionType = 'comprehensive') => {
    try {
      
      const response = await backendApi.post('/claude/text-processing', {
        clinicalText,
        extractionType
      });

      return response.data;
    } catch (error) {
      console.error('Enhanced text processing error:', error);
      
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in.');
      } else if (error.response?.status === 500) {
        throw new Error(`Backend error: ${error.response?.data?.error || 'Internal server error'}`);
      }
      
      throw new Error(`Text processing failed: ${error.response?.data?.error || error.message}`);
    }
  },

  // TIER 1 ENHANCEMENT 2: Pattern Recognition in Existing Data  
  analyzePatterns: async (dataSet, analysisType = 'correlation') => {
    try {
      
      const response = await backendApi.post('/claude/pattern-analysis', {
        dataSet,
        analysisType
      });

      return response.data;
    } catch (error) {
      console.error('Pattern analysis error:', error);
      
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in.');
      } else if (error.response?.status === 500) {
        throw new Error(`Backend error: ${error.response?.data?.error || 'Internal server error'}`);
      }
      
      throw new Error(`Pattern analysis failed: ${error.response?.data?.error || error.message}`);
    }
  },

  // TIER 1 ENHANCEMENT 3: Decision Transparency and Reasoning
  generateWithReasoning: async (prompt, context, decisionType = 'clinical') => {
    try {
      
      const response = await backendApi.post('/claude/reasoning-generation', {
        prompt,
        context,
        decisionType
      });

      return response.data;
    } catch (error) {
      console.error('Decision reasoning error:', error);
      
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in.');
      } else if (error.response?.status === 500) {
        throw new Error(`Backend error: ${error.response?.data?.error || 'Internal server error'}`);
      }
      
      throw new Error(`Decision reasoning failed: ${error.response?.data?.error || error.message}`);
    }
  }

};

export default claudeService;