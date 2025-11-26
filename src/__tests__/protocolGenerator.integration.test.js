import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import ProtocolGenerator from '../components/ProtocolGenerator';
import { AuthProvider } from '../contexts/AuthContext';
import apiService from '../services/api';

// Mock dependencies
jest.mock('../services/api', () => ({
  generateProtocol: jest.fn(),
  generateStudyDesign: jest.fn(),
  compileDossier: jest.fn()
}));

jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(() => ({
    getRootProps: () => ({ onClick: jest.fn() }),
    getInputProps: () => ({}),
    isDragActive: false
  }))
}));

// Mock other components
jest.mock('../components/common/AskLuminaPopup', () => {
  return function MockAskLuminaPopup() {
    return <div data-testid="ask-lumina-popup">Ask Lumina Popup</div>;
  };
});

jest.mock('../components/common/FloatingButton', () => {
  return function MockFloatingButton({ onClick, label }) {
    return <button data-testid="floating-button" onClick={onClick}>{label}</button>;
  };
});

jest.mock('../components/common/RichTextEditor', () => {
  return function MockRichTextEditor({ value, onChange, onSave }) {
    return (
      <div data-testid="rich-text-editor">
        <textarea
          data-testid="editor-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button data-testid="save-button" onClick={onSave}>Save</button>
      </div>
    );
  };
});

// Integration test wrapper
const IntegrationTestWrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('ProtocolGenerator Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ========================================
  // FULL WORKFLOW INTEGRATION TESTS
  // ========================================

  describe('Complete Protocol Generation Workflow', () => {
    test('completes full protocol generation workflow from form to export', async () => {
      const mockProtocolResponse = {
        protocol_id: 'PROT-2024-001',
        protocol: '1. Introduction\nThis is a comprehensive clinical study protocol...\n\n2. Methods\nDetailed methodology...\n\n3. Results\nExpected outcomes...'
      };

      apiService.generateProtocol.mockResolvedValue(mockProtocolResponse);

      const user = userEvent.setup();
      render(
        <IntegrationTestWrapper>
          <ProtocolGenerator />
        </IntegrationTestWrapper>
      );

      // Step 1: Fill required form fields
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');

      const studyTypeSelect = screen.getByLabelText(/Study Type/);
      await user.selectOptions(studyTypeSelect, 'clinical');

      const populationInput = screen.getByLabelText(/Population/);
      await user.type(populationInput, 'Adult patients with T2D');

      const treatmentInput = screen.getByLabelText(/Treatment/);
      await user.type(treatmentInput, 'Metformin 500mg twice daily');

      // Step 2: Verify progress updates
      await waitFor(() => {
        expect(screen.getByText(/4\/8 sections completed/)).toBeInTheDocument();
      });

      // Step 3: Generate protocol
      const generateButton = screen.getByText(/Generate Enhanced Protocol/);
      await user.click(generateButton);

      await waitFor(() => {
        expect(apiService.generateProtocol).toHaveBeenCalledWith(
          expect.objectContaining({
            disease: 'Type 2 Diabetes',
            studyType: 'clinical',
            population: 'Adult patients with T2D',
            treatment: 'Metformin 500mg twice daily'
          })
        );
      });

      // Step 4: Verify protocol generation
      await waitFor(() => {
        expect(screen.getByText('Enhanced Protocol')).toBeInTheDocument();
        expect(screen.getByText('PROT-2024-001')).toBeInTheDocument();
      });

      // Step 5: Verify export options are available
      expect(screen.getByText(/Download Word/)).toBeInTheDocument();
      expect(screen.getByText(/Download PDF/)).toBeInTheDocument();
      expect(screen.getByText(/Copy to Clipboard/)).toBeInTheDocument();
    });

    test('completes full study design generation workflow', async () => {
      const mockStudyDesignResponse = {
        cmc_section: 'CMC content for manufacturing...',
        clinical_section: '1. Study Design\nRandomized controlled trial\n\n2. Population\nAdult patients\n\n3. Endpoints\nPrimary: HbA1c reduction'
      };

      apiService.generateStudyDesign.mockResolvedValue(mockStudyDesignResponse);

      const user = userEvent.setup();
      render(
        <IntegrationTestWrapper>
          <ProtocolGenerator />
        </IntegrationTestWrapper>
      );

      // Fill form and generate study design
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');

      const generateButton = screen.getByText(/Generate Study Design/);
      await user.click(generateButton);

      await waitFor(() => {
        expect(apiService.generateStudyDesign).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText('Study Design')).toBeInTheDocument();
        expect(screen.getByText('CMC Section')).toBeInTheDocument();
        expect(screen.getByText('Clinical Section')).toBeInTheDocument();
      });

      // Verify section parsing
      expect(screen.getByText('Study Design')).toBeInTheDocument();
      expect(screen.getByText('Population')).toBeInTheDocument();
      expect(screen.getByText('Endpoints')).toBeInTheDocument();
    });

    test('completes country dossier compilation workflow', async () => {
      const mockCompilationResponse = {
        success: true,
        message: 'Dossier compiled successfully!',
        fileName: 'clinical_dossier_US.pdf'
      };

      apiService.compileDossier.mockResolvedValue(mockCompilationResponse);

      const user = userEvent.setup();
      render(
        <IntegrationTestWrapper>
          <ProtocolGenerator />
        </IntegrationTestWrapper>
      );

      // Switch to Country Compiler tab
      const compilerTab = screen.getByText('🏛️ Country Compiler');
      await user.click(compilerTab);

      // Select country
      const countrySelect = screen.getByDisplayValue('Select a country/region...');
      await user.selectOptions(countrySelect, 'US');

      await waitFor(() => {
        expect(screen.getByText(/United States.*Requirements/)).toBeInTheDocument();
      });

      // Verify country-specific requirements
      expect(screen.getByText('FDA')).toBeInTheDocument();
      expect(screen.getByText('IND')).toBeInTheDocument();

      // Verify document categories
      expect(screen.getByText(/📄.*Protocol/)).toBeInTheDocument();
      expect(screen.getByText(/📖.*Investigator's Brochure/)).toBeInTheDocument();

      // Mock document upload (simplified for integration test)
      const uploadArea = screen.getByText(/Drag and drop documents here/);
      expect(uploadArea).toBeInTheDocument();

      // Verify compile button is present
      expect(screen.getByText(/Compile Dossier for United States/)).toBeInTheDocument();
    });
  });

  // ========================================
  // STATE PERSISTENCE INTEGRATION TESTS
  // ========================================

  describe('Global State Persistence Integration', () => {
    test('persists and restores complete application state across navigation', async () => {
      const mockProtocolResponse = {
        protocol_id: 'PROT-2024-001',
        protocol: 'Generated protocol content...'
      };

      apiService.generateProtocol.mockResolvedValue(mockProtocolResponse);

      const user = userEvent.setup();
      const { rerender } = render(
        <IntegrationTestWrapper>
          <ProtocolGenerator />
        </IntegrationTestWrapper>
      );

      // Fill form data
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');

      const studyTypeSelect = screen.getByLabelText(/Study Type/);
      await user.selectOptions(studyTypeSelect, 'clinical');

      // Generate protocol
      const generateButton = screen.getByText(/Generate Enhanced Protocol/);
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Enhanced Protocol')).toBeInTheDocument();
      });

      // Switch tabs
      const compilerTab = screen.getByText('🏛️ Country Compiler');
      await user.click(compilerTab);

      // Simulate navigation away and back (rerender)
      rerender(
        <IntegrationTestWrapper>
          <ProtocolGenerator />
        </IntegrationTestWrapper>
      );

      // Switch back to protocol tab
      const protocolTab = screen.getByText('📋 Protocol Generator');
      await user.click(protocolTab);

      // Verify state is restored
      expect(screen.getByDisplayValue('Type 2 Diabetes')).toBeInTheDocument();
      expect(screen.getByText('Enhanced Protocol')).toBeInTheDocument();
    });

    test('maintains state consistency across multiple component instances', async () => {
      const user = userEvent.setup();

      // Render first instance
      const { unmount: unmount1 } = render(
        <IntegrationTestWrapper>
          <ProtocolGenerator />
        </IntegrationTestWrapper>
      );

      // Fill data in first instance
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');

      // Unmount first instance
      unmount1();

      // Render second instance
      render(
        <IntegrationTestWrapper>
          <ProtocolGenerator />
        </IntegrationTestWrapper>
      );

      // Verify data is preserved
      expect(screen.getByDisplayValue('Type 2 Diabetes')).toBeInTheDocument();
    });
  });

  // ========================================
  // ERROR RECOVERY INTEGRATION TESTS
  // ========================================

  describe('Error Recovery Integration', () => {
    test('recovers gracefully from API failures and allows retry', async () => {
      // Mock initial failure
      apiService.generateProtocol.mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      render(
        <IntegrationTestWrapper>
          <ProtocolGenerator />
        </IntegrationTestWrapper>
      );

      // Fill form and attempt generation
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');

      const studyTypeSelect = screen.getByLabelText(/Study Type/);
      await user.selectOptions(studyTypeSelect, 'clinical');

      const generateButton = screen.getByText(/Generate Enhanced Protocol/);
      await user.click(generateButton);

      await waitFor(() => {
        expect(apiService.generateProtocol).toHaveBeenCalled();
      });

      // Mock successful retry
      apiService.generateProtocol.mockResolvedValue({
        protocol_id: 'PROT-2024-001',
        protocol: 'Generated protocol content...'
      });

      // Retry generation
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Enhanced Protocol')).toBeInTheDocument();
      });
    });

    test('handles partial data corruption gracefully', async () => {
      // Simulate corrupted localStorage
      localStorage.setItem('globalProtocolState', 'invalid json data');

      render(
        <IntegrationTestWrapper>
          <ProtocolGenerator />
        </IntegrationTestWrapper>
      );

      // Should render without errors
      expect(screen.getByText('Clinical Study Protocol Generator')).toBeInTheDocument();
    });
  });

  // ========================================
  // PERFORMANCE INTEGRATION TESTS
  // ========================================

  describe('Performance Integration', () => {
    test('handles concurrent operations without conflicts', async () => {
      const mockProtocolResponse = {
        protocol_id: 'PROT-2024-001',
        protocol: 'Generated protocol content...'
      };

      const mockStudyDesignResponse = {
        cmc_section: 'CMC content...',
        clinical_section: 'Clinical content...'
      };

      apiService.generateProtocol.mockResolvedValue(mockProtocolResponse);
      apiService.generateStudyDesign.mockResolvedValue(mockStudyDesignResponse);

      const user = userEvent.setup();
      render(
        <IntegrationTestWrapper>
          <ProtocolGenerator />
        </IntegrationTestWrapper>
      );

      // Fill form
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');

      const studyTypeSelect = screen.getByLabelText(/Study Type/);
      await user.selectOptions(studyTypeSelect, 'clinical');

      // Start both operations simultaneously
      const protocolButton = screen.getByText(/Generate Enhanced Protocol/);
      const studyButton = screen.getByText(/Generate Study Design/);

      await user.click(protocolButton);
      await user.click(studyButton);

      await waitFor(() => {
        expect(apiService.generateProtocol).toHaveBeenCalled();
        expect(apiService.generateStudyDesign).toHaveBeenCalled();
      });

      // Both should complete successfully
      await waitFor(() => {
        expect(screen.getByText('Enhanced Protocol')).toBeInTheDocument();
        expect(screen.getByText('Study Design')).toBeInTheDocument();
      });
    });

    test('handles large datasets efficiently', async () => {
      const largeProtocol = 'A'.repeat(50000); // 50KB content
      const mockResponse = {
        protocol_id: 'PROT-2024-001',
        protocol: largeProtocol
      };

      apiService.generateProtocol.mockResolvedValue(mockResponse);

      const user = userEvent.setup();
      render(
        <IntegrationTestWrapper>
          <ProtocolGenerator />
        </IntegrationTestWrapper>
      );

      // Generate large protocol
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');

      const studyTypeSelect = screen.getByLabelText(/Study Type/);
      await user.selectOptions(studyTypeSelect, 'clinical');

      const generateButton = screen.getByText(/Generate Enhanced Protocol/);
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Enhanced Protocol')).toBeInTheDocument();
      });

      // Should handle large content without performance issues
      expect(screen.getByText('Enhanced Protocol')).toBeInTheDocument();
    });
  });

  // ========================================
  // USER INTERACTION INTEGRATION TESTS
  // ========================================

  describe('User Interaction Integration', () => {
    test('handles complex user interaction sequences', async () => {
      const user = userEvent.setup();
      render(
        <IntegrationTestWrapper>
          <ProtocolGenerator />
        </IntegrationTestWrapper>
      );

      // Complex interaction sequence
      // 1. Fill form partially
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');

      // 2. Switch to compiler tab
      const compilerTab = screen.getByText('🏛️ Country Compiler');
      await user.click(compilerTab);

      // 3. Select country
      const countrySelect = screen.getByDisplayValue('Select a country/region...');
      await user.selectOptions(countrySelect, 'US');

      // 4. Switch back to protocol tab
      const protocolTab = screen.getByText('📋 Protocol Generator');
      await user.click(protocolTab);

      // 5. Continue filling form
      const studyTypeSelect = screen.getByLabelText(/Study Type/);
      await user.selectOptions(studyTypeSelect, 'clinical');

      // 6. Navigate sections
      const populationSection = screen.getByText('Population & Eligibility');
      await user.click(populationSection);

      // All interactions should work smoothly
      expect(screen.getByDisplayValue('Type 2 Diabetes')).toBeInTheDocument();
      expect(screen.getByDisplayValue('clinical')).toBeInTheDocument();
    });

    test('handles rapid user input without data loss', async () => {
      const user = userEvent.setup();
      render(
        <IntegrationTestWrapper>
          <ProtocolGenerator />
        </IntegrationTestWrapper>
      );

      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);

      // Rapid typing
      await user.type(diseaseInput, 'Type 2 Diabetes Mellitus');
      await user.clear(diseaseInput);
      await user.type(diseaseInput, 'T2DM');
      await user.clear(diseaseInput);
      await user.type(diseaseInput, 'Type 2 Diabetes');

      // Should maintain final value
      expect(diseaseInput).toHaveValue('Type 2 Diabetes');
    });
  });

  // ========================================
  // CROSS-BROWSER COMPATIBILITY TESTS
  // ========================================

  describe('Cross-Browser Compatibility', () => {
    test('handles missing clipboard API gracefully', async () => {
      // Mock missing clipboard API
      const originalClipboard = navigator.clipboard;
      delete navigator.clipboard;

      render(
        <IntegrationTestWrapper>
          <ProtocolGenerator />
        </IntegrationTestWrapper>
      );

      // Should render without errors
      expect(screen.getByText('Clinical Study Protocol Generator')).toBeInTheDocument();

      // Restore clipboard API
      navigator.clipboard = originalClipboard;
    });

    test('handles missing localStorage gracefully', async () => {
      // Mock missing localStorage
      const originalLocalStorage = window.localStorage;
      delete window.localStorage;

      render(
        <IntegrationTestWrapper>
          <ProtocolGenerator />
        </IntegrationTestWrapper>
      );

      // Should render without errors
      expect(screen.getByText('Clinical Study Protocol Generator')).toBeInTheDocument();

      // Restore localStorage
      window.localStorage = originalLocalStorage;
    });
  });
});
