import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AskLuminaPopup from '../AskLuminaPopup';
import openaiService from '../../../services/openaiService';

// Mock the openaiService
jest.mock('../../../services/openaiService', () => ({
  queryAssistant: jest.fn()
}));

// Mock the medical icons
jest.mock('../../icons/MedicalIcons', () => ({
  CloseIcon: ({ size, className }) => <span data-testid="close-icon" className={className}>×</span>,
  SearchIcon: ({ size, style }) => <span data-testid="search-icon" style={style}>🔍</span>,
  ArrowRightIcon: ({ size }) => <span data-testid="arrow-right-icon">→</span>
}));

describe('AskLuminaPopup Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    contextData: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does not render when isOpen is false', () => {
    render(<AskLuminaPopup {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Ask Lumina™')).not.toBeInTheDocument();
  });

  test('renders when isOpen is true', () => {
    render(<AskLuminaPopup {...defaultProps} />);
    
    expect(screen.getByText('Ask Lumina™')).toBeInTheDocument();
    expect(screen.getByText('AI Clinical Research Assistant')).toBeInTheDocument();
  });

  test('displays close button and calls onClose when clicked', () => {
    const mockOnClose = jest.fn();
    render(<AskLuminaPopup {...defaultProps} onClose={mockOnClose} />);
    
    const closeButton = screen.getByTestId('close-icon').closest('button');
    expect(closeButton).toBeInTheDocument();
    
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('displays context information when contextData is provided', () => {
    const contextData = 'Disease Screening - Medical Specialty Selection';
    render(<AskLuminaPopup {...defaultProps} contextData={contextData} />);
    
    expect(screen.getByText('Context:')).toBeInTheDocument();
    expect(screen.getByText(contextData)).toBeInTheDocument();
  });

  test('does not display context section when contextData is null', () => {
    render(<AskLuminaPopup {...defaultProps} contextData={null} />);
    
    expect(screen.queryByText('Context:')).not.toBeInTheDocument();
  });

  test('displays initial welcome message when no messages', () => {
    render(<AskLuminaPopup {...defaultProps} />);
    
    expect(screen.getByText('Ask me anything!')).toBeInTheDocument();
    expect(screen.getByText(/I can help with clinical protocols/)).toBeInTheDocument();
  });

  test('allows user to type in input field', async () => {
    const user = userEvent.setup();
    render(<AskLuminaPopup {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/Ask about protocols, regulations/);
    await user.type(input, 'What is a clinical trial?');
    
    expect(input).toHaveValue('What is a clinical trial?');
  });

  test('submit button is disabled when input is empty', () => {
    render(<AskLuminaPopup {...defaultProps} />);
    
    const submitButton = screen.getByRole('button', { name: /Ask/ });
    expect(submitButton).toBeDisabled();
  });

  test('submit button is enabled when input has text', async () => {
    const user = userEvent.setup();
    render(<AskLuminaPopup {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/Ask about protocols, regulations/);
    await user.type(input, 'Test question');
    
    const submitButton = screen.getByRole('button', { name: /Ask/ });
    expect(submitButton).not.toBeDisabled();
  });

  test('submits question and displays response', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      answer: 'This is a test response from the AI assistant.'
    };
    openaiService.queryAssistant.mockResolvedValue(mockResponse);

    render(<AskLuminaPopup {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/Ask about protocols, regulations/);
    await user.type(input, 'What is a clinical trial?');
    
    const submitButton = screen.getByRole('button', { name: /Ask/ });
    fireEvent.click(submitButton);
    
    // Check that loading state is shown
    expect(screen.getByText('Thinking...')).toBeInTheDocument();
    
    // Wait for response
    await waitFor(() => {
      expect(screen.getByText(mockResponse.answer)).toBeInTheDocument();
    });
    
    // Check that openaiService was called correctly
    expect(openaiService.queryAssistant).toHaveBeenCalledWith({
      question: 'What is a clinical trial?',
      disease_context: undefined
    });
  });

  test('submits question with context data', async () => {
    const user = userEvent.setup();
    const mockResponse = { answer: 'Response with context' };
    openaiService.queryAssistant.mockResolvedValue(mockResponse);
    
    const contextData = 'Dermatology analysis';
    render(<AskLuminaPopup {...defaultProps} contextData={contextData} />);
    
    const input = screen.getByPlaceholderText(/Ask about protocols, regulations/);
    await user.type(input, 'Tell me about skin conditions');
    
    const submitButton = screen.getByRole('button', { name: /Ask/ });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(openaiService.queryAssistant).toHaveBeenCalledWith({
        question: 'Tell me about skin conditions',
        disease_context: contextData
      });
    });
  });

  test('handles API error gracefully', async () => {
    const user = userEvent.setup();
    openaiService.queryAssistant.mockRejectedValue(new Error('API Error'));

    render(<AskLuminaPopup {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/Ask about protocols, regulations/);
    await user.type(input, 'Test question');
    
    const submitButton = screen.getByRole('button', { name: /Ask/ });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/I apologize, but I encountered an error/)).toBeInTheDocument();
    });
  });

  test('clears input after successful submission', async () => {
    const user = userEvent.setup();
    const mockResponse = { answer: 'Test response' };
    openaiService.queryAssistant.mockResolvedValue(mockResponse);

    render(<AskLuminaPopup {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/Ask about protocols, regulations/);
    await user.type(input, 'Test question');
    
    const submitButton = screen.getByRole('button', { name: /Ask/ });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  test('displays clear conversation button when messages exist', async () => {
    const user = userEvent.setup();
    const mockResponse = { answer: 'Test response' };
    openaiService.queryAssistant.mockResolvedValue(mockResponse);

    render(<AskLuminaPopup {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/Ask about protocols, regulations/);
    await user.type(input, 'Test question');
    
    const submitButton = screen.getByRole('button', { name: /Ask/ });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Clear conversation')).toBeInTheDocument();
    });
  });

  test('clears conversation when clear button is clicked', async () => {
    const user = userEvent.setup();
    const mockResponse = { answer: 'Test response' };
    openaiService.queryAssistant.mockResolvedValue(mockResponse);

    render(<AskLuminaPopup {...defaultProps} />);
    
    // Submit a question first
    const input = screen.getByPlaceholderText(/Ask about protocols, regulations/);
    await user.type(input, 'Test question');
    const submitButton = screen.getByRole('button', { name: /Ask/ });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Test response')).toBeInTheDocument();
    });
    
    // Clear conversation
    const clearButton = screen.getByText('Clear conversation');
    fireEvent.click(clearButton);
    
    // Should show welcome message again
    expect(screen.getByText('Ask me anything!')).toBeInTheDocument();
    expect(screen.queryByText('Test response')).not.toBeInTheDocument();
  });

  test('prevents submission during loading state', async () => {
    const user = userEvent.setup();
    // Mock a slow response
    openaiService.queryAssistant.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ answer: 'Response' }), 1000))
    );

    render(<AskLuminaPopup {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/Ask about protocols, regulations/);
    await user.type(input, 'Test question');
    
    const submitButton = screen.getByRole('button', { name: /Ask/ });
    fireEvent.click(submitButton);
    
    // Button should be disabled during loading
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Thinking...')).toBeInTheDocument();
  });

  test('form submission works with Enter key', async () => {
    const user = userEvent.setup();
    const mockResponse = { answer: 'Test response' };
    openaiService.queryAssistant.mockResolvedValue(mockResponse);

    render(<AskLuminaPopup {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/Ask about protocols, regulations/);
    await user.type(input, 'Test question{enter}');
    
    await waitFor(() => {
      expect(openaiService.queryAssistant).toHaveBeenCalled();
    });
  });
});