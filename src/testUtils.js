// src/testUtils.js
// Common test utilities and setup for the medical research application

import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Custom render function that includes router context
export const renderWithRouter = (ui, options = {}) => {
  const { initialEntries = ['/'], ...renderOptions } = options;
  
  const Wrapper = ({ children }) => (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
  
  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock data for testing
export const mockPatientData = {
  age: '45',
  gender: 'Female',
  race: 'Caucasian',
  skinColor: 'Fair',
  skinType: 'Type II',
  conditionDescription: 'Red, itchy rash on forearm that appeared 3 days ago'
};

export const mockDiseaseDetection = {
  predictions: [
    { label: 'Melanoma', confidence: 0.85 },
    { label: 'Basal Cell Carcinoma', confidence: 0.12 },
    { label: 'Benign Nevus', confidence: 0.03 }
  ]
};

export const mockLungCancerAnalysis = {
  probability: 0.73,
  risk_factors: ['smoking_history', 'age', 'family_history'],
  detected: true,
  confidence: 0.73
};

export const mockBackgroundJob = {
  id: 'job-123',
  type: 'regulatory_document',
  status: 'running',
  progress: 45,
  startTime: Date.now() - 30000,
  data: {
    disease: 'Type 2 Diabetes',
    drugClass: 'GLP-1 Agonist'
  }
};

export const mockCompletedJob = {
  id: 'job-456',
  type: 'protocol',
  status: 'completed',
  progress: 100,
  startTime: Date.now() - 120000,
  endTime: Date.now() - 10000,
  result: {
    protocol: 'Generated clinical trial protocol for diabetes study',
    protocol_id: 'DIAB-2024-001'
  }
};

export const mockOpenAIResponse = {
  answer: 'A clinical trial is a research study conducted with human participants to evaluate the safety and efficacy of medical interventions, such as drugs, devices, or procedures. These studies follow strict protocols and regulatory guidelines to ensure participant safety and generate reliable scientific evidence.'
};

export const mockValidationResult = {
  isValid: true,
  confidence: 0.92,
  reason: 'Document content matches expected category and indication',
  recommendation: 'Document appears to be correctly categorized and relevant to the study indication'
};

export const mockDossierTypes = [
  {
    id: 'impd',
    name: 'Investigational Medicinal Product Dossier (IMPD)',
    description: 'EU dossier containing quality, production, and control information',
    color: '#4F46E5'
  },
  {
    id: 'ind',
    name: 'Investigational New Drug (IND) Application',
    description: 'US FDA submission for investigational new drug trials',
    color: '#059669'
  }
];

// Helper functions for common test scenarios
export const createMockFile = (name = 'test.jpg', type = 'image/jpeg', content = 'test content') => {
  return new File([content], name, { type });
};

export const createMockFormData = (overrides = {}) => {
  return {
    disease_name: 'Type 2 Diabetes',
    drug_class: 'GLP-1 Agonist',
    mechanism: 'Incretin mimetic',
    country: 'United States',
    documentType: 'IND',
    ...overrides
  };
};

export const waitForLoadingToFinish = async (getByText) => {
  // Wait for common loading indicators to disappear
  const loadingIndicators = [
    'Loading...',
    'Analyzing...',
    'Processing...',
    'Generating...',
    'Validating...',
    'Compiling...',
    'Thinking...'
  ];
  
  for (const indicator of loadingIndicators) {
    try {
      const element = getByText(indicator);
      if (element) {
        await waitFor(() => expect(element).not.toBeInTheDocument());
      }
    } catch (error) {
      // Element not found, continue
    }
  }
};

// Mock API responses for different endpoints
export const mockApiResponses = {
  skinDiseaseAnalysis: {
    data: {
      predictions: mockDiseaseDetection.predictions
    }
  },
  lungCancerAnalysis: {
    data: mockLungCancerAnalysis
  },
  documentValidation: {
    data: mockValidationResult
  },
  dossierCompilation: {
    data: {
      success: true,
      message: 'Dossier compiled successfully!',
      fileName: 'clinical_dossier.pdf'
    }
  },
  protocolGeneration: {
    data: {
      protocol: 'Generated clinical trial protocol',
      protocol_id: 'PROTO-2024-001'
    }
  },
  regulatoryDocument: {
    data: {
      document_content: 'Generated regulatory document content',
      document_id: 'REG-DOC-2024-001'
    }
  }
};

// Test data generators
export const generateRandomJob = (type = 'regulatory_document', status = 'running') => {
  const jobId = `job-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now() - Math.random() * 300000; // Random time up to 5 minutes ago
  
  const baseJob = {
    id: jobId,
    type,
    status,
    startTime,
    progress: status === 'running' ? Math.floor(Math.random() * 100) : 100
  };
  
  if (status === 'completed') {
    baseJob.endTime = startTime + Math.random() * 120000; // Completed within 2 minutes
    baseJob.result = mockApiResponses[type] || { success: true };
  }
  
  return baseJob;
};

export const generateMockSpecialties = () => [
  {
    id: 'dermatology',
    name: 'Dermatology',
    isActive: true,
    icon: '🔍',
    description: 'Skin disease detection and analysis using image recognition',
    color: 'var(--color-dermatology)',
    path: '/diagnosis/dermatology'
  },
  {
    id: 'pulmonology',
    name: 'Pulmonology',
    isActive: true,
    icon: '🫁',
    description: 'Lung cancer risk assessment using clinical data and text analysis',
    color: 'var(--color-pulmonology)',
    path: '/diagnosis/pulmonology'
  },
  {
    id: 'neurology',
    name: 'Neurology',
    isActive: false,
    icon: '🧠',
    description: 'Neurological condition assessment and cognitive analysis',
    color: 'var(--color-neurology)',
    path: '/diagnosis/neurology'
  }
];

// Custom matchers for medical data
export const customMatchers = {
  toBeValidMedicalData: (received) => {
    const requiredFields = ['age', 'gender'];
    const hasRequiredFields = requiredFields.every(field => received.hasOwnProperty(field));
    
    return {
      message: () => `Expected medical data to have required fields: ${requiredFields.join(', ')}`,
      pass: hasRequiredFields
    };
  },
  
  toBeValidPrediction: (received) => {
    const hasLabel = received.hasOwnProperty('label') && typeof received.label === 'string';
    const hasConfidence = received.hasOwnProperty('confidence') && 
                         typeof received.confidence === 'number' && 
                         received.confidence >= 0 && 
                         received.confidence <= 1;
    
    return {
      message: () => 'Expected prediction to have valid label and confidence (0-1)',
      pass: hasLabel && hasConfidence
    };
  }
};

// Export everything for easy importing
export * from '@testing-library/react';
export * from '@testing-library/user-event';
export { screen, waitFor } from '@testing-library/react';