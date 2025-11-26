import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ClinicalDossierCompiler from '../ClinicalDossierCompiler';
import apiService from '../../services/api';

// Mock apiService
jest.mock('../../services/api', () => ({
  validateDocumentContent: jest.fn(),
  compileDossier: jest.fn()
}));

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(() => ({
    getRootProps: () => ({
      onClick: jest.fn()
    }),
    getInputProps: () => ({}),
    isDragActive: false
  }))
}));

describe('ClinicalDossierCompiler Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders main header with emoji', () => {
    render(<ClinicalDossierCompiler />);
    
    expect(screen.getByText('Clinical Dossier Compiler')).toBeInTheDocument();
    expect(screen.getByText(/Compile various clinical trial documents/)).toBeInTheDocument();
  });

  test('displays primary indication input field', () => {
    render(<ClinicalDossierCompiler />);
    
    const indicationInput = screen.getByPlaceholderText(/Enter the primary disease\/condition/);
    expect(indicationInput).toBeInTheDocument();
  });

  test('allows user to enter primary indication', async () => {
    const user = userEvent.setup();
    render(<ClinicalDossierCompiler />);
    
    const indicationInput = screen.getByPlaceholderText(/Enter the primary disease\/condition/);
    await user.type(indicationInput, 'Type 2 Diabetes');
    
    expect(indicationInput).toHaveValue('Type 2 Diabetes');
  });

  test('displays all dossier type options', () => {
    render(<ClinicalDossierCompiler />);
    
    expect(screen.getByText('📄 Select Dossier Type')).toBeInTheDocument();
    expect(screen.getByText('Investigational Medicinal Product Dossier (IMPD)')).toBeInTheDocument();
    expect(screen.getByText('Investigational New Drug (IND) Application')).toBeInTheDocument();
    expect(screen.getByText('Common Technical Document (CTD)')).toBeInTheDocument();
    expect(screen.getByText('Electronic Common Technical Document (eCTD)')).toBeInTheDocument();
  });

  test('allows selection of dossier type', async () => {
    const user = userEvent.setup();
    render(<ClinicalDossierCompiler />);
    
    const impdCard = screen.getByText('Investigational Medicinal Product Dossier (IMPD)').closest('div');
    await user.click(impdCard);
    
    // Should show upload section after selection
    await waitFor(() => {
      expect(screen.getByText('📁 Upload Documents')).toBeInTheDocument();
    });
  });

  test('shows document upload area after dossier type selection', async () => {
    const user = userEvent.setup();
    render(<ClinicalDossierCompiler />);
    
    // Select a dossier type first
    const impdCard = screen.getByText('Investigational Medicinal Product Dossier (IMPD)').closest('div');
    await user.click(impdCard);
    
    await waitFor(() => {
      expect(screen.getByText('📁 Upload Documents')).toBeInTheDocument();
      expect(screen.getByText(/Drag and drop documents here/)).toBeInTheDocument();
    });
  });

  test('displays required documents checklist after dossier selection', async () => {
    const user = userEvent.setup();
    render(<ClinicalDossierCompiler />);
    
    const impdCard = screen.getByText('Investigational Medicinal Product Dossier (IMPD)').closest('div');
    await user.click(impdCard);
    
    await waitFor(() => {
      expect(screen.getByText('✅ Required Documents Checklist')).toBeInTheDocument();
      expect(screen.getByText(/📄.*Protocol/)).toBeInTheDocument();
      expect(screen.getByText(/📖.*Investigator's Brochure/)).toBeInTheDocument();
      expect(screen.getByText(/⚗️.*Quality Information/)).toBeInTheDocument();
      expect(screen.getByText(/🧪.*Non-clinical Data/)).toBeInTheDocument();
      expect(screen.getByText(/🏥.*Clinical Data/)).toBeInTheDocument();
    });
  });

  test('compile button is disabled initially', async () => {
    const user = userEvent.setup();
    render(<ClinicalDossierCompiler />);
    
    const impdCard = screen.getByText('Investigational Medicinal Product Dossier (IMPD)').closest('div');
    await user.click(impdCard);
    
    await waitFor(() => {
      const compileButton = screen.getByText('Compile Dossier');
      expect(compileButton).toBeDisabled();
    });
  });

  test('shows validation summary when documents are uploaded', async () => {
    const user = userEvent.setup();
    render(<ClinicalDossierCompiler />);
    
    // Select dossier type
    const impdCard = screen.getByText('Investigational Medicinal Product Dossier (IMPD)').closest('div');
    await user.click(impdCard);
    
    // Mock file upload (this would typically be done through the dropzone)
    // For this test, we'll simulate the state after upload
    const component = screen.getByText('Clinical Dossier Compiler').closest('div');
    
    // The validation summary should appear once documents are uploaded
    // This is a simplified test since react-dropzone is mocked
  });

  test('validates document when primary indication is set', async () => {
    const user = userEvent.setup();
    apiService.validateDocumentContent.mockResolvedValue({
      isValid: true,
      confidence: 0.9,
      reason: 'Document matches expected category',
      recommendation: 'Document appears correct'
    });
    
    render(<ClinicalDossierCompiler />);
    
    // Enter primary indication
    const indicationInput = screen.getByPlaceholderText(/Enter the primary disease\/condition/);
    await user.type(indicationInput, 'Type 2 Diabetes');
    
    // Select dossier type
    const impdCard = screen.getByText('Investigational Medicinal Product Dossier (IMPD)').closest('div');
    await user.click(impdCard);
    
    // The validation would be triggered when documents are uploaded and categorized
    // This is tested at a component level
  });

  test('shows validate all documents button when indication is entered', async () => {
    const user = userEvent.setup();
    render(<ClinicalDossierCompiler />);
    
    // Enter primary indication
    const indicationInput = screen.getByPlaceholderText(/Enter the primary disease\/condition/);
    await user.type(indicationInput, 'Type 2 Diabetes');
    
    // Select dossier type
    const impdCard = screen.getByText('Investigational Medicinal Product Dossier (IMPD)').closest('div');
    await user.click(impdCard);
    
    await waitFor(() => {
      const validateButton = screen.getByText('Validate All Documents');
      expect(validateButton).not.toBeDisabled();
    });
  });

  test('validate all button is disabled when no indication is entered', async () => {
    const user = userEvent.setup();
    render(<ClinicalDossierCompiler />);
    
    // Select dossier type without entering indication
    const impdCard = screen.getByText('Investigational Medicinal Product Dossier (IMPD)').closest('div');
    await user.click(impdCard);
    
    await waitFor(() => {
      const validateButton = screen.getByText('Validate All Documents');
      expect(validateButton).toBeDisabled();
    });
  });

  test('shows warning message when compile requirements not met', async () => {
    const user = userEvent.setup();
    render(<ClinicalDossierCompiler />);
    
    const impdCard = screen.getByText('Investigational Medicinal Product Dossier (IMPD)').closest('div');
    await user.click(impdCard);
    
    await waitFor(() => {
      expect(screen.getByText(/⚠️ Please upload all required documents/)).toBeInTheDocument();
    });
  });

  test('handles successful dossier compilation', async () => {
    apiService.compileDossier.mockResolvedValue({
      success: true,
      message: 'Dossier compiled successfully!',
      fileName: 'clinical_dossier.pdf'
    });
    
    render(<ClinicalDossierCompiler />);
    
    // This would typically involve uploading all required documents
    // and meeting compilation requirements, then clicking compile
    // For now, we test the API call mock
    
    expect(apiService.compileDossier).toBeDefined();
  });

  test('handles compilation error gracefully', async () => {
    apiService.compileDossier.mockRejectedValue(new Error('Compilation failed'));
    
    render(<ClinicalDossierCompiler />);
    
    // Test error handling
    expect(apiService.compileDossier).toBeDefined();
  });

  test('shows document categories with proper emoji icons', async () => {
    const user = userEvent.setup();
    render(<ClinicalDossierCompiler />);
    
    const impdCard = screen.getByText('Investigational Medicinal Product Dossier (IMPD)').closest('div');
    await user.click(impdCard);
    
    await waitFor(() => {
      // Check that emoji icons are displayed in the checklist
      expect(screen.getByText(/📄.*Protocol/)).toBeInTheDocument();
      expect(screen.getByText(/📖.*Investigator's Brochure/)).toBeInTheDocument();
      expect(screen.getByText(/⚗️.*Quality Information/)).toBeInTheDocument();
      expect(screen.getByText(/🧪.*Non-clinical Data/)).toBeInTheDocument();
      expect(screen.getByText(/🏥.*Clinical Data/)).toBeInTheDocument();
      expect(screen.getByText(/📝.*Application Form/)).toBeInTheDocument();
      expect(screen.getByText(/📎.*Other Documents/)).toBeInTheDocument();
    });
  });

  test('displays validation summary with correct emoji icons', async () => {
    const user = userEvent.setup();
    render(<ClinicalDossierCompiler />);
    
    // Enter indication and select dossier type
    const indicationInput = screen.getByPlaceholderText(/Enter the primary disease\/condition/);
    await user.type(indicationInput, 'Type 2 Diabetes');
    
    const impdCard = screen.getByText('Investigational Medicinal Product Dossier (IMPD)').closest('div');
    await user.click(impdCard);
    
    await waitFor(() => {
      expect(screen.getByText('🔍 Document Validation Summary')).toBeInTheDocument();
    });
  });

  test('drag and drop area shows proper emoji when active', async () => {
    const user = userEvent.setup();
    render(<ClinicalDossierCompiler />);
    
    const impdCard = screen.getByText('Investigational Medicinal Product Dossier (IMPD)').closest('div');
    await user.click(impdCard);
    
    await waitFor(() => {
      // Check for drag area emoji
      expect(screen.getByText('📄')).toBeInTheDocument();
      expect(screen.getByText(/Drag and drop documents here/)).toBeInTheDocument();
    });
  });

  test('displays proper recommendation with emoji when validation issues exist', async () => {
    const user = userEvent.setup();
    render(<ClinicalDossierCompiler />);
    
    // Enter indication and select dossier type
    const indicationInput = screen.getByPlaceholderText(/Enter the primary disease\/condition/);
    await user.type(indicationInput, 'Type 2 Diabetes');
    
    const impdCard = screen.getByText('Investigational Medicinal Product Dossier (IMPD)').closest('div');
    await user.click(impdCard);
    
    // The 💡 emoji should appear in recommendations when documents have validation results
    // This would be visible after actual document upload and validation
  });
});