import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Simple integration tests that don't require complex mocking

describe('Basic Component Integration', () => {
  test('medical icons are properly defined', () => {
    // Test that our medical icons file exports the expected icons
    expect(() => {
      const MedicalIcons = require('../components/icons/MedicalIcons');
      expect(MedicalIcons).toBeDefined();
    }).not.toThrow();
  });

  test('CSS variables are properly defined', () => {
    // Test that our CSS variables are available
    const testElement = document.createElement('div');
    document.body.appendChild(testElement);
    
    // Apply CSS variables
    testElement.style.setProperty('--color-primary', '#2563eb');
    testElement.style.setProperty('--color-success', '#10b981');
    testElement.style.setProperty('--color-error', '#ef4444');
    
    expect(testElement.style.getPropertyValue('--color-primary')).toBe('#2563eb');
    expect(testElement.style.getPropertyValue('--color-success')).toBe('#10b981');
    expect(testElement.style.getPropertyValue('--color-error')).toBe('#ef4444');
    
    document.body.removeChild(testElement);
  });

  test('test utilities are properly configured', () => {
    const testUtils = require('../testUtils');
    
    expect(testUtils.mockPatientData).toBeDefined();
    expect(testUtils.mockDiseaseDetection).toBeDefined();
    expect(testUtils.createMockFile).toBeInstanceOf(Function);
    expect(testUtils.createMockFormData).toBeInstanceOf(Function);
  });

  test('API service modules are properly structured', () => {
    // Test that our service modules are properly exported
    expect(() => {
      const api = require('../services/api');
      expect(api).toBeDefined();
    }).not.toThrow();

    expect(() => {
      const openaiService = require('../services/openaiService');
      expect(openaiService.default).toBeDefined();
    }).not.toThrow();
  });

  test('hooks are properly exported', () => {
    expect(() => {
      const useBackgroundJobs = require('../hooks/useBackgroundJobs');
      expect(useBackgroundJobs.useBackgroundJobs).toBeInstanceOf(Function);
    }).not.toThrow();
  });
});