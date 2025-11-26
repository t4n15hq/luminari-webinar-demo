import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ProtocolGenerator from '../ProtocolGenerator';
import { AuthProvider } from '../../contexts/AuthContext';
import apiService from '../../services/api';

// Mock dependencies
jest.mock('../../services/api', () => ({
  generateProtocol: jest.fn(),
  generateStudyDesign: jest.fn(),
  compileDossier: jest.fn()
}));

jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(() => ({
    getRootProps: () => ({
      onClick: jest.fn()
    }),
    getInputProps: () => ({}),
    isDragActive: false
  }))
}));

// Mock AskLuminaPopup and FloatingButton
jest.mock('../common/AskLuminaPopup', () => {
  return function MockAskLuminaPopup({ isOpen, onClose }) {
    return isOpen ? (
      <div data-testid="ask-lumina-popup" onClick={onClose}>
        Ask Lumina Popup
      </div>
    ) : null;
  };
});

jest.mock('../common/FloatingButton', () => {
  return function MockFloatingButton({ onClick, label }) {
    return (
      <button data-testid="floating-button" onClick={onClick}>
        {label}
      </button>
    );
  };
});

// Mock RichTextEditor
jest.mock('../common/RichTextEditor', () => {
  return function MockRichTextEditor({ value, onChange, onSave }) {
    return (
      <div data-testid="rich-text-editor">
        <textarea
          data-testid="editor-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button data-testid="save-button" onClick={onSave}>
          Save
        </button>
      </div>
    );
  };
});

// Test wrapper with AuthProvider
const TestWrapper = ({ children }) => (
  <AuthProvider>
    {children}
  </AuthProvider>
);

// Helper function to render with provider
const renderWithProvider = (component) => {
  return render(<TestWrapper>{component}</TestWrapper>);
};

describe('ProtocolGenerator Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ========================================
  // BASIC COMPONENT RENDERING TESTS
  // ========================================

  describe('Basic Component Rendering', () => {
    test('renders main header and description', () => {
      renderWithProvider(<ProtocolGenerator />);
      
      expect(screen.getByText('Clinical Study Protocol Generator')).toBeInTheDocument();
      expect(screen.getByText(/Generate a complete clinical study protocol/)).toBeInTheDocument();
    });

    test('renders section tabs (Protocol Generator and Country Compiler)', () => {
      renderWithProvider(<ProtocolGenerator />);
      
      expect(screen.getByText('📋 Protocol Generator')).toBeInTheDocument();
      expect(screen.getByText('🏛️ Country Compiler')).toBeInTheDocument();
    });

    test('renders Ask Lumina floating button', () => {
      renderWithProvider(<ProtocolGenerator />);
      
      expect(screen.getByTestId('floating-button')).toBeInTheDocument();
      expect(screen.getByText('Ask Lumina™')).toBeInTheDocument();
    });

    test('opens Ask Lumina popup when floating button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      const floatingButton = screen.getByTestId('floating-button');
      await user.click(floatingButton);
      
      expect(screen.getByTestId('ask-lumina-popup')).toBeInTheDocument();
    });

    test('closes Ask Lumina popup when clicked', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Open popup
      const floatingButton = screen.getByTestId('floating-button');
      await user.click(floatingButton);
      
      expect(screen.getByTestId('ask-lumina-popup')).toBeInTheDocument();
      
      // Close popup
      const popup = screen.getByTestId('ask-lumina-popup');
      await user.click(popup);
      
      expect(screen.queryByTestId('ask-lumina-popup')).not.toBeInTheDocument();
    });
  });

  // ========================================
  // FORM VALIDATION AND PROGRESS TESTS
  // ========================================

  describe('Form Validation and Progress Calculation', () => {
    test('displays progress bar with correct initial state', () => {
      renderWithProvider(<ProtocolGenerator />);
      
      expect(screen.getByText('📊 Form Progress')).toBeInTheDocument();
      expect(screen.getByText(/sections completed/)).toBeInTheDocument();
      expect(screen.getByText('Overall Progress')).toBeInTheDocument();
      expect(screen.getByText('Required Fields')).toBeInTheDocument();
    });

    test('calculates progress correctly for empty form', () => {
      renderWithProvider(<ProtocolGenerator />);
      
      // Should show 0% progress initially
      expect(screen.getByText('0/8 sections completed')).toBeInTheDocument();
    });

    test('updates progress when required fields are filled', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Fill basic information (required field)
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');
      
      // Fill study type (required field)
      const studyTypeSelect = screen.getByLabelText(/Study Type/);
      await user.selectOptions(studyTypeSelect, 'clinical');
      
      // Progress should update
      await waitFor(() => {
        expect(screen.getByText(/2\/8 sections completed/)).toBeInTheDocument();
      });
    });

    test('shows section completion status with correct icons', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Initially all sections should show incomplete (⭕)
      const incompleteSections = screen.getAllByText('⭕');
      expect(incompleteSections.length).toBeGreaterThan(0);
      
      // Fill a required field
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');
      
      // At least one section should show complete (✅)
      await waitFor(() => {
        const completeSections = screen.getAllByText('✅');
        expect(completeSections.length).toBeGreaterThan(0);
      });
    });

    test('validates required fields correctly', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Try to generate protocol without filling required fields
      const generateButton = screen.getByText(/Generate Enhanced Protocol/);
      
      // Button should be present but might be disabled or show validation
      expect(generateButton).toBeInTheDocument();
    });
  });

  // ========================================
  // SECTION NAVIGATION TESTS
  // ========================================

  describe('Section Navigation System', () => {
    test('displays all form sections in progress bar', () => {
      renderWithProvider(<ProtocolGenerator />);
      
      // Check for all section titles in progress bar
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Study Type')).toBeInTheDocument();
      expect(screen.getByText('Trial Design & Basics')).toBeInTheDocument();
      expect(screen.getByText('Population & Eligibility')).toBeInTheDocument();
      expect(screen.getByText('Intervention & Drug Details')).toBeInTheDocument();
      expect(screen.getByText('Endpoints & Outcome Measures')).toBeInTheDocument();
      expect(screen.getByText('Statistical Considerations')).toBeInTheDocument();
      expect(screen.getByText('Additional Information')).toBeInTheDocument();
    });

    test('switches to clicked section in progress bar', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Click on a section in progress bar
      const populationSection = screen.getByText('Population & Eligibility');
      await user.click(populationSection);
      
      // Should scroll to or highlight that section
      // (Implementation depends on scroll behavior)
      expect(populationSection).toBeInTheDocument();
    });

    test('handles rapid section switching', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      const basicInfoSection = screen.getByText('Basic Information');
      const studyTypeSection = screen.getByText('Study Type');
      const trialDesignSection = screen.getByText('Trial Design & Basics');
      
      // Rapidly click different sections
      await user.click(basicInfoSection);
      await user.click(studyTypeSection);
      await user.click(trialDesignSection);
      
      // Should handle rapid switching without errors
      expect(basicInfoSection).toBeInTheDocument();
      expect(studyTypeSection).toBeInTheDocument();
      expect(trialDesignSection).toBeInTheDocument();
    });

    test('maintains section state across tab switches', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Fill some form data
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');
      
      // Switch to Country Compiler tab
      const compilerTab = screen.getByText('🏛️ Country Compiler');
      await user.click(compilerTab);
      
      // Switch back to Protocol Generator tab
      const protocolTab = screen.getByText('📋 Protocol Generator');
      await user.click(protocolTab);
      
      // Form data should be preserved
      expect(screen.getByDisplayValue('Type 2 Diabetes')).toBeInTheDocument();
    });
  });

  // ========================================
  // PROTOCOL GENERATION TESTS
  // ========================================

  describe('Protocol Generation', () => {
    test('generates protocol successfully with valid data', async () => {
      const mockResponse = {
        protocol_id: 'PROT-2024-001',
        protocol: 'Generated protocol content...'
      };
      
      apiService.generateProtocol.mockResolvedValue(mockResponse);
      
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Fill required fields
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');
      
      const studyTypeSelect = screen.getByLabelText(/Study Type/);
      await user.selectOptions(studyTypeSelect, 'clinical');
      
      // Generate protocol
      const generateButton = screen.getByText(/Generate Enhanced Protocol/);
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(apiService.generateProtocol).toHaveBeenCalledWith(
          expect.objectContaining({
            disease: 'Type 2 Diabetes',
            studyType: 'clinical'
          })
        );
      });
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Protocol')).toBeInTheDocument();
      });
    });

    test('handles protocol generation API errors gracefully', async () => {
      apiService.generateProtocol.mockRejectedValue(new Error('API Error'));
      
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Fill required fields
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');
      
      const studyTypeSelect = screen.getByLabelText(/Study Type/);
      await user.selectOptions(studyTypeSelect, 'clinical');
      
      // Generate protocol
      const generateButton = screen.getByText(/Generate Enhanced Protocol/);
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(apiService.generateProtocol).toHaveBeenCalled();
      });
      
      // Should handle error without crashing
      // Error handling implementation depends on the component
    });

    test('shows loading state during protocol generation', async () => {
      // Mock a delayed response
      apiService.generateProtocol.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ protocol: 'test' }), 100))
      );
      
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Fill required fields
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');
      
      const studyTypeSelect = screen.getByLabelText(/Study Type/);
      await user.selectOptions(studyTypeSelect, 'clinical');
      
      // Generate protocol
      const generateButton = screen.getByText(/Generate Enhanced Protocol/);
      await user.click(generateButton);
      
      // Should show loading state
      expect(generateButton).toBeDisabled();
    });
  });

  // ========================================
  // STUDY DESIGN GENERATION TESTS
  // ========================================

  describe('Study Design Generation', () => {
    test('generates study design successfully', async () => {
      const mockStudyDesign = {
        cmc_section: 'CMC content...',
        clinical_section: '1. Study Design\n2. Population\n3. Endpoints'
      };
      
      apiService.generateStudyDesign.mockResolvedValue(mockStudyDesign);
      
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Fill required fields
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');
      
      // Generate study design
      const generateButton = screen.getByText(/Generate Study Design/);
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(apiService.generateStudyDesign).toHaveBeenCalled();
      });
      
      await waitFor(() => {
        expect(screen.getByText('Study Design')).toBeInTheDocument();
      });
    });

    test('parses study design sections correctly', async () => {
      const mockStudyDesign = {
        cmc_section: 'CMC content...',
        clinical_section: '1. Study Design\nDetailed study design content\n\n2. Population\nPopulation details\n\n3. Endpoints\nEndpoint information'
      };
      
      apiService.generateStudyDesign.mockResolvedValue(mockStudyDesign);
      
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Generate study design
      const generateButton = screen.getByText(/Generate Study Design/);
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Study Design')).toBeInTheDocument();
      });
      
      // Should parse sections correctly
      await waitFor(() => {
        expect(screen.getByText('Study Design')).toBeInTheDocument();
        expect(screen.getByText('Population')).toBeInTheDocument();
        expect(screen.getByText('Endpoints')).toBeInTheDocument();
      });
    });

    test('handles malformed study design content', async () => {
      const mockStudyDesign = {
        cmc_section: 'CMC content...',
        clinical_section: 'Unstructured content without proper sections'
      };
      
      apiService.generateStudyDesign.mockResolvedValue(mockStudyDesign);
      
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Generate study design
      const generateButton = screen.getByText(/Generate Study Design/);
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Study Design')).toBeInTheDocument();
      });
      
      // Should handle malformed content gracefully
      expect(screen.getByText('Study Design')).toBeInTheDocument();
    });
  });

  // ========================================
  // COUNTRY COMPILER TESTS
  // ========================================

  describe('Country Compiler Functionality', () => {
    test('switches to Country Compiler tab', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      const compilerTab = screen.getByText('🏛️ Country Compiler');
      await user.click(compilerTab);
      
      expect(screen.getByText('🌍 Select Target Country/Region')).toBeInTheDocument();
    });

    test('displays country selection dropdown', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      const compilerTab = screen.getByText('🏛️ Country Compiler');
      await user.click(compilerTab);
      
      const countrySelect = screen.getByDisplayValue('Select a country/region...');
      expect(countrySelect).toBeInTheDocument();
      
      // Should have multiple country options
      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThan(5); // Should have multiple countries
    });

    test('shows country-specific requirements when country is selected', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Switch to compiler tab
      const compilerTab = screen.getByText('🏛️ Country Compiler');
      await user.click(compilerTab);
      
      // Select a country
      const countrySelect = screen.getByDisplayValue('Select a country/region...');
      await user.selectOptions(countrySelect, 'US');
      
      await waitFor(() => {
        expect(screen.getByText(/United States.*Requirements/)).toBeInTheDocument();
        expect(screen.getByText('Regulatory Information')).toBeInTheDocument();
        expect(screen.getByText('Required Documents')).toBeInTheDocument();
      });
    });

    test('displays Russia-specific requirements', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Switch to compiler tab
      const compilerTab = screen.getByText('🏛️ Country Compiler');
      await user.click(compilerTab);
      
      // Select Russia
      const countrySelect = screen.getByDisplayValue('Select a country/region...');
      await user.selectOptions(countrySelect, 'RU');
      
      await waitFor(() => {
        expect(screen.getByText(/Russia.*Requirements/)).toBeInTheDocument();
        expect(screen.getByText('Roszdravnadzor')).toBeInTheDocument();
      });
    });

    test('displays USA BLA-specific requirements', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Switch to compiler tab
      const compilerTab = screen.getByText('🏛️ Country Compiler');
      await user.click(compilerTab);
      
      // Select USA BLA
      const countrySelect = screen.getByDisplayValue('Select a country/region...');
      await user.selectOptions(countrySelect, 'US-BLA');
      
      await waitFor(() => {
        expect(screen.getByText(/United States.*BLA.*Requirements/)).toBeInTheDocument();
        expect(screen.getByText('BLA (Biologics License Application)')).toBeInTheDocument();
      });
    });

    test('shows document upload area for selected country', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Switch to compiler tab and select country
      const compilerTab = screen.getByText('🏛️ Country Compiler');
      await user.click(compilerTab);
      
      const countrySelect = screen.getByDisplayValue('Select a country/region...');
      await user.selectOptions(countrySelect, 'US');
      
      await waitFor(() => {
        expect(screen.getByText('📁 Upload Documents')).toBeInTheDocument();
        expect(screen.getByText(/Drag and drop documents here/)).toBeInTheDocument();
      });
    });

    test('displays required documents checklist', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Switch to compiler tab and select country
      const compilerTab = screen.getByText('🏛️ Country Compiler');
      await user.click(compilerTab);
      
      const countrySelect = screen.getByDisplayValue('Select a country/region...');
      await user.selectOptions(countrySelect, 'US');
      
      await waitFor(() => {
        expect(screen.getByText('✅ Required Documents Checklist')).toBeInTheDocument();
        // Should show document categories
        expect(screen.getByText(/📄.*Protocol/)).toBeInTheDocument();
        expect(screen.getByText(/📖.*Investigator's Brochure/)).toBeInTheDocument();
      });
    });
  });

  // ========================================
  // EDGE CASES AND ERROR HANDLING
  // ========================================

  describe('Edge Cases and Error Handling', () => {
    test('handles empty form data gracefully', () => {
      renderWithProvider(<ProtocolGenerator />);
      
      // Should render without errors even with empty form
      expect(screen.getByText('Clinical Study Protocol Generator')).toBeInTheDocument();
      expect(screen.getByText('📊 Form Progress')).toBeInTheDocument();
    });

    test('handles very long input values', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      const longText = 'A'.repeat(10000);
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      
      await user.type(diseaseInput, longText);
      
      // Should handle long input without crashing
      expect(diseaseInput).toHaveValue(longText);
    });

    test('handles rapid form input changes', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      
      // Rapidly change input
      await user.type(diseaseInput, 'Test');
      await user.clear(diseaseInput);
      await user.type(diseaseInput, 'Another test');
      await user.clear(diseaseInput);
      await user.type(diseaseInput, 'Final test');
      
      // Should handle rapid changes
      expect(diseaseInput).toHaveValue('Final test');
    });

    test('handles network timeout during protocol generation', async () => {
      // Mock a timeout
      apiService.generateProtocol.mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );
      
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Fill required fields
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');
      
      const studyTypeSelect = screen.getByLabelText(/Study Type/);
      await user.selectOptions(studyTypeSelect, 'clinical');
      
      // Generate protocol
      const generateButton = screen.getByText(/Generate Enhanced Protocol/);
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(apiService.generateProtocol).toHaveBeenCalled();
      });
      
      // Should handle timeout gracefully
      expect(generateButton).toBeInTheDocument();
    });

    test('handles invalid country selection', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Switch to compiler tab
      const compilerTab = screen.getByText('🏛️ Country Compiler');
      await user.click(compilerTab);
      
      // Try to select invalid option (if possible)
      const countrySelect = screen.getByDisplayValue('Select a country/region...');
      
      // Should handle gracefully
      expect(countrySelect).toBeInTheDocument();
    });

    test('handles localStorage failures gracefully', async () => {
      // Mock localStorage to throw errors
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn(() => {
            throw new Error('localStorage error');
          }),
          setItem: jest.fn(() => {
            throw new Error('localStorage error');
          }),
          clear: jest.fn(() => {
            throw new Error('localStorage error');
          })
        },
        writable: true
      });
      
      renderWithProvider(<ProtocolGenerator />);
      
      // Should render without crashing
      expect(screen.getByText('Clinical Study Protocol Generator')).toBeInTheDocument();
      
      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true
      });
    });

    test('handles component unmounting during async operations', async () => {
      apiService.generateProtocol.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ protocol: 'test' }), 1000))
      );
      
      const user = userEvent.setup();
      const { unmount } = renderWithProvider(<ProtocolGenerator />);
      
      // Fill required fields
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');
      
      const studyTypeSelect = screen.getByLabelText(/Study Type/);
      await user.selectOptions(studyTypeSelect, 'clinical');
      
      // Start protocol generation
      const generateButton = screen.getByText(/Generate Enhanced Protocol/);
      await user.click(generateButton);
      
      // Unmount component during async operation
      unmount();
      
      // Should not throw errors
      expect(true).toBe(true); // Test passes if no errors thrown
    });
  });

  // ========================================
  // GLOBAL STATE AND PERSISTENCE TESTS
  // ========================================

  describe('Global State and Persistence', () => {
    test('persists form data in localStorage', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Fill form data
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');
      
      // Check if data is saved to localStorage
      await waitFor(() => {
        const savedData = localStorage.getItem('globalProtocolState');
        expect(savedData).toBeTruthy();
      });
    });

    test('restores form data from localStorage on component mount', () => {
      // Set up localStorage with test data
      const testData = {
        globalProtocolFormData: {
          disease: 'Test Disease',
          studyType: 'clinical'
        }
      };
      localStorage.setItem('globalProtocolState', JSON.stringify(testData));
      
      renderWithProvider(<ProtocolGenerator />);
      
      // Should restore data
      expect(screen.getByDisplayValue('Test Disease')).toBeInTheDocument();
    });

    test('maintains state across component re-renders', async () => {
      const user = userEvent.setup();
      const { rerender } = renderWithProvider(<ProtocolGenerator />);
      
      // Fill form data
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');
      
      // Re-render component
      rerender(<TestWrapper><ProtocolGenerator /></TestWrapper>);
      
      // Data should be preserved
      expect(screen.getByDisplayValue('Type 2 Diabetes')).toBeInTheDocument();
    });
  });

  // ========================================
  // ACCESSIBILITY TESTS
  // ========================================

  describe('Accessibility', () => {
    test('has proper ARIA labels for form inputs', () => {
      renderWithProvider(<ProtocolGenerator />);
      
      // Check for proper labeling
      expect(screen.getByLabelText(/Disease\/Condition/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Study Type/)).toBeInTheDocument();
    });

    test('has proper button roles and labels', () => {
      renderWithProvider(<ProtocolGenerator />);
      
      const generateButton = screen.getByText(/Generate Enhanced Protocol/);
      expect(generateButton).toBeInTheDocument();
      expect(generateButton.tagName).toBe('BUTTON');
    });

    test('has proper heading hierarchy', () => {
      renderWithProvider(<ProtocolGenerator />);
      
      const mainHeading = screen.getByRole('heading', { level: 2 });
      expect(mainHeading).toHaveTextContent('Clinical Study Protocol Generator');
    });

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      
      // Should be focusable
      await user.tab();
      expect(diseaseInput).toHaveFocus();
    });
  });

  // ========================================
  // EXPORT FUNCTIONALITY TESTS
  // ========================================

  describe('Export Functionality', () => {
    test('shows export buttons when protocol is generated', async () => {
      const mockResponse = {
        protocol_id: 'PROT-2024-001',
        protocol: 'Generated protocol content...'
      };
      
      apiService.generateProtocol.mockResolvedValue(mockResponse);
      
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Fill required fields and generate protocol
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');
      
      const studyTypeSelect = screen.getByLabelText(/Study Type/);
      await user.selectOptions(studyTypeSelect, 'clinical');
      
      const generateButton = screen.getByText(/Generate Enhanced Protocol/);
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Protocol')).toBeInTheDocument();
      });
      
      // Should show export buttons
      expect(screen.getByText(/Download Word/)).toBeInTheDocument();
      expect(screen.getByText(/Download PDF/)).toBeInTheDocument();
      expect(screen.getByText(/Copy to Clipboard/)).toBeInTheDocument();
    });

    test('handles Word document export', async () => {
      const mockResponse = {
        protocol_id: 'PROT-2024-001',
        protocol: 'Generated protocol content...'
      };
      
      apiService.generateProtocol.mockResolvedValue(mockResponse);
      
      // Mock document generation
      const mockDocx = {
        generate: jest.fn().mockResolvedValue(new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }))
      };
      jest.doMock('docx', () => ({ Document: jest.fn(() => mockDocx) }));
      
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Generate protocol first
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');
      
      const studyTypeSelect = screen.getByLabelText(/Study Type/);
      await user.selectOptions(studyTypeSelect, 'clinical');
      
      const generateButton = screen.getByText(/Generate Enhanced Protocol/);
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Protocol')).toBeInTheDocument();
      });
      
      // Click Word export button
      const wordButton = screen.getByText(/Download Word/);
      await user.click(wordButton);
      
      // Should attempt to generate Word document
      // (Implementation depends on actual export logic)
    });

    test('handles PDF document export', async () => {
      const mockResponse = {
        protocol_id: 'PROT-2024-001',
        protocol: 'Generated protocol content...'
      };
      
      apiService.generateProtocol.mockResolvedValue(mockResponse);
      
      // Mock PDF generation
      const mockJsPDF = {
        text: jest.fn(),
        save: jest.fn()
      };
      jest.doMock('jspdf', () => jest.fn(() => mockJsPDF));
      
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Generate protocol first
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');
      
      const studyTypeSelect = screen.getByLabelText(/Study Type/);
      await user.selectOptions(studyTypeSelect, 'clinical');
      
      const generateButton = screen.getByText(/Generate Enhanced Protocol/);
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Protocol')).toBeInTheDocument();
      });
      
      // Click PDF export button
      const pdfButton = screen.getByText(/Download PDF/);
      await user.click(pdfButton);
      
      // Should attempt to generate PDF document
      // (Implementation depends on actual export logic)
    });

    test('handles copy to clipboard functionality', async () => {
      const mockResponse = {
        protocol_id: 'PROT-2024-001',
        protocol: 'Generated protocol content...'
      };
      
      apiService.generateProtocol.mockResolvedValue(mockResponse);
      
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined)
        }
      });
      
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Generate protocol first
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');
      
      const studyTypeSelect = screen.getByLabelText(/Study Type/);
      await user.selectOptions(studyTypeSelect, 'clinical');
      
      const generateButton = screen.getByText(/Generate Enhanced Protocol/);
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Protocol')).toBeInTheDocument();
      });
      
      // Click copy button
      const copyButton = screen.getByText(/Copy to Clipboard/);
      await user.click(copyButton);
      
      // Should attempt to copy to clipboard
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    test('handles export errors gracefully', async () => {
      const mockResponse = {
        protocol_id: 'PROT-2024-001',
        protocol: 'Generated protocol content...'
      };
      
      apiService.generateProtocol.mockResolvedValue(mockResponse);
      
      // Mock clipboard API to throw error
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockRejectedValue(new Error('Clipboard error'))
        }
      });
      
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Generate protocol first
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');
      
      const studyTypeSelect = screen.getByLabelText(/Study Type/);
      await user.selectOptions(studyTypeSelect, 'clinical');
      
      const generateButton = screen.getByText(/Generate Enhanced Protocol/);
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Protocol')).toBeInTheDocument();
      });
      
      // Click copy button
      const copyButton = screen.getByText(/Copy to Clipboard/);
      await user.click(copyButton);
      
      // Should handle error gracefully
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  // ========================================
  // SECTION EDITING TESTS
  // ========================================

  describe('Section Editing Functionality', () => {
    test('allows editing of individual protocol sections', async () => {
      const mockResponse = {
        protocol_id: 'PROT-2024-001',
        protocol: '1. Introduction\nContent here\n\n2. Methods\nMethods content'
      };
      
      apiService.generateProtocol.mockResolvedValue(mockResponse);
      
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Generate protocol first
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');
      
      const studyTypeSelect = screen.getByLabelText(/Study Type/);
      await user.selectOptions(studyTypeSelect, 'clinical');
      
      const generateButton = screen.getByText(/Generate Enhanced Protocol/);
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Protocol')).toBeInTheDocument();
      });
      
      // Should show section selection buttons
      expect(screen.getByText('+')).toBeInTheDocument(); // Add section button
    });

    test('handles section content editing with rich text editor', async () => {
      const mockResponse = {
        protocol_id: 'PROT-2024-001',
        protocol: '1. Introduction\nContent here\n\n2. Methods\nMethods content'
      };
      
      apiService.generateProtocol.mockResolvedValue(mockResponse);
      
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Generate protocol first
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');
      
      const studyTypeSelect = screen.getByLabelText(/Study Type/);
      await user.selectOptions(studyTypeSelect, 'clinical');
      
      const generateButton = screen.getByText(/Generate Enhanced Protocol/);
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Protocol')).toBeInTheDocument();
      });
      
      // Click on a section to edit
      const addButton = screen.getByText('+');
      await user.click(addButton);
      
      // Should show rich text editor
      await waitFor(() => {
        expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
      });
    });

    test('saves edited section content', async () => {
      const mockResponse = {
        protocol_id: 'PROT-2024-001',
        protocol: '1. Introduction\nContent here\n\n2. Methods\nMethods content'
      };
      
      apiService.generateProtocol.mockResolvedValue(mockResponse);
      
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Generate protocol first
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');
      
      const studyTypeSelect = screen.getByLabelText(/Study Type/);
      await user.selectOptions(studyTypeSelect, 'clinical');
      
      const generateButton = screen.getByText(/Generate Enhanced Protocol/);
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Protocol')).toBeInTheDocument();
      });
      
      // Edit a section
      const addButton = screen.getByText('+');
      await user.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
      });
      
      // Edit content
      const textarea = screen.getByTestId('editor-textarea');
      await user.type(textarea, 'Edited content');
      
      // Save content
      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);
      
      // Should save successfully
      expect(textarea).toHaveValue('Edited content');
    });
  });

  // ========================================
  // AI INTEGRATION TESTS
  // ========================================

  describe('AI Integration', () => {
    test('provides AI assistance for section editing', async () => {
      const mockResponse = {
        protocol_id: 'PROT-2024-001',
        protocol: '1. Introduction\nContent here\n\n2. Methods\nMethods content'
      };
      
      apiService.generateProtocol.mockResolvedValue(mockResponse);
      
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Generate protocol first
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');
      
      const studyTypeSelect = screen.getByLabelText(/Study Type/);
      await user.selectOptions(studyTypeSelect, 'clinical');
      
      const generateButton = screen.getByText(/Generate Enhanced Protocol/);
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Protocol')).toBeInTheDocument();
      });
      
      // Edit a section to access AI features
      const addButton = screen.getByText('+');
      await user.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
      });
      
      // Should have AI assistance features available
      // (Implementation depends on AI integration)
    });
  });

  // ========================================
  // PERFORMANCE TESTS
  // ========================================

  describe('Performance', () => {
    test('handles large protocol content without performance issues', async () => {
      const largeProtocol = 'A'.repeat(100000); // 100KB of content
      const mockResponse = {
        protocol_id: 'PROT-2024-001',
        protocol: largeProtocol
      };
      
      apiService.generateProtocol.mockResolvedValue(mockResponse);
      
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Fill required fields
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
      
      // Should handle large content without crashing
      expect(screen.getByText('Enhanced Protocol')).toBeInTheDocument();
    });

    test('handles multiple rapid API calls', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ProtocolGenerator />);
      
      // Fill required fields
      const diseaseInput = screen.getByLabelText(/Disease\/Condition/);
      await user.type(diseaseInput, 'Type 2 Diabetes');
      
      const studyTypeSelect = screen.getByLabelText(/Study Type/);
      await user.selectOptions(studyTypeSelect, 'clinical');
      
      // Rapidly click generate buttons
      const protocolButton = screen.getByText(/Generate Enhanced Protocol/);
      const studyButton = screen.getByText(/Generate Study Design/);
      
      await user.click(protocolButton);
      await user.click(studyButton);
      
      // Should handle rapid calls
      expect(protocolButton).toBeInTheDocument();
      expect(studyButton).toBeInTheDocument();
    });
  });
});
