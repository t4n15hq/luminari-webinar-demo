import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SkinDiseaseDetector from '../SkinDiseaseDetector';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock the FileUpload component
jest.mock('../common', () => ({
  FileUpload: ({ onFileSelect, accept }) => (
    <div data-testid="file-upload">
      <input 
        type="file" 
        onChange={(e) => onFileSelect(e.target.files[0])}
        accept={accept}
        data-testid="file-input"
      />
    </div>
  ),
  ResultsChat: ({ prediction }) => (
    <div data-testid="results-chat">
      {prediction.map((pred, index) => (
        <div key={index}>{pred.label}: {pred.confidence}</div>
      ))}
    </div>
  )
}));

// Mock the FloatingButton component
jest.mock('../common/FloatingButton', () => {
  return function MockFloatingButton({ onClick, label }) {
    return <button onClick={onClick} data-testid="floating-button">{label}</button>;
  };
});

// Mock the AskLuminaPopup component
jest.mock('../common/AskLuminaPopup', () => {
  return function MockAskLuminaPopup({ isOpen, onClose }) {
    return isOpen ? (
      <div data-testid="ask-lumina-popup">
        <button onClick={onClose} data-testid="close-popup">Close</button>
      </div>
    ) : null;
  };
});

// Mock openaiService
jest.mock('../../services/openaiService', () => ({
  queryAssistant: jest.fn()
}));

describe('SkinDiseaseDetector Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset axios mock
    mockedAxios.post.mockClear();
  });

  test('renders with default image analysis mode', () => {
    render(<SkinDiseaseDetector />);
    
    expect(screen.getByText('Skin Disease Detection & Analysis')).toBeInTheDocument();
    expect(screen.getByText('Advanced AI Analysis')).toBeInTheDocument();
  });

  test('displays analysis mode toggle buttons', () => {
    render(<SkinDiseaseDetector />);
    
    expect(screen.getByText('📷 Image Analysis')).toBeInTheDocument();
    expect(screen.getByText('🎤 Text & Audio')).toBeInTheDocument();
    expect(screen.getByText('📊 Batch Processing')).toBeInTheDocument();
    expect(screen.getByText('🎬 Video Analysis')).toBeInTheDocument();
  });

  test('switches analysis modes when buttons are clicked', async () => {
    const user = userEvent.setup();
    render(<SkinDiseaseDetector />);
    
    // Click on Text & Audio mode
    const textAudioButton = screen.getByText('🎤 Text & Audio');
    await user.click(textAudioButton);
    
    // Should show text analysis interface
    expect(screen.getByText('Clinical Text Analysis')).toBeInTheDocument();
  });

  test('displays patient information form', () => {
    render(<SkinDiseaseDetector />);
    
    expect(screen.getByLabelText(/Age/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Gender/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Race\/Ethnicity/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Skin Color/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Skin Type/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Condition Description/)).toBeInTheDocument();
  });

  test('allows user to fill out patient information', async () => {
    const user = userEvent.setup();
    render(<SkinDiseaseDetector />);
    
    const ageInput = screen.getByLabelText(/Age/);
    await user.type(ageInput, '25');
    expect(ageInput).toHaveValue('25');
    
    const genderSelect = screen.getByLabelText(/Gender/);
    await user.selectOptions(genderSelect, 'Female');
    expect(genderSelect).toHaveValue('Female');
    
    const descriptionTextarea = screen.getByLabelText(/Condition Description/);
    await user.type(descriptionTextarea, 'Red, itchy rash on arm');
    expect(descriptionTextarea).toHaveValue('Red, itchy rash on arm');
  });

  test('shows file upload component in image mode', () => {
    render(<SkinDiseaseDetector />);
    
    expect(screen.getByTestId('file-upload')).toBeInTheDocument();
  });

  test('handles successful image analysis', async () => {
    const mockResponse = {
      data: {
        predictions: [
          { label: 'Melanoma', confidence: 0.85 },
          { label: 'Basal Cell Carcinoma', confidence: 0.10 }
        ]
      }
    };
    
    mockedAxios.post.mockResolvedValue(mockResponse);
    
    render(<SkinDiseaseDetector />);
    
    // Create a mock file
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    // Upload file
    const fileInput = screen.getByTestId('file-input');
    await userEvent.upload(fileInput, file);
    
    // Fill out required patient info
    const ageInput = screen.getByLabelText(/Age/);
    await userEvent.type(ageInput, '30');
    
    const genderSelect = screen.getByLabelText(/Gender/);
    await userEvent.selectOptions(genderSelect, 'Male');
    
    // Submit for analysis
    const analyzeButton = screen.getByText('🔬 Analyze Image');
    fireEvent.click(analyzeButton);
    
    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Melanoma: 0.85')).toBeInTheDocument();
    });
  });

  test('displays loading state during analysis', async () => {
    // Mock a slow response
    mockedAxios.post.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        data: { predictions: [] }
      }), 1000))
    );
    
    render(<SkinDiseaseDetector />);
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByTestId('file-input');
    await userEvent.upload(fileInput, file);
    
    // Fill required fields and submit
    const ageInput = screen.getByLabelText(/Age/);
    await userEvent.type(ageInput, '30');
    
    const analyzeButton = screen.getByText('🔬 Analyze Image');
    fireEvent.click(analyzeButton);
    
    // Should show loading state
    expect(screen.getByText('🔬 Analyzing...')).toBeInTheDocument();
  });

  test('handles analysis error gracefully', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Network error'));
    
    render(<SkinDiseaseDetector />);
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByTestId('file-input');
    await userEvent.upload(fileInput, file);
    
    const ageInput = screen.getByLabelText(/Age/);
    await userEvent.type(ageInput, '30');
    
    const analyzeButton = screen.getByText('🔬 Analyze Image');
    fireEvent.click(analyzeButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Error analyzing image/)).toBeInTheDocument();
    });
  });

  test('requires patient information before analysis', () => {
    render(<SkinDiseaseDetector />);
    
    const analyzeButton = screen.getByText('🔬 Analyze Image');
    
    // Button should be disabled without required info
    expect(analyzeButton).toBeDisabled();
  });

  test('enables analysis button when requirements are met', async () => {
    const user = userEvent.setup();
    render(<SkinDiseaseDetector />);
    
    // Upload file
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByTestId('file-input');
    await user.upload(fileInput, file);
    
    // Fill required fields
    const ageInput = screen.getByLabelText(/Age/);
    await user.type(ageInput, '30');
    
    const genderSelect = screen.getByLabelText(/Gender/);
    await user.selectOptions(genderSelect, 'Male');
    
    const analyzeButton = screen.getByText('🔬 Analyze Image');
    expect(analyzeButton).not.toBeDisabled();
  });

  test('displays Ask Lumina floating button', () => {
    render(<SkinDiseaseDetector />);
    
    const floatingButton = screen.getByTestId('floating-button');
    expect(floatingButton).toBeInTheDocument();
    expect(floatingButton).toHaveTextContent('Ask Lumina™');
  });

  test('opens Ask Lumina popup when floating button is clicked', async () => {
    const user = userEvent.setup();
    render(<SkinDiseaseDetector />);
    
    const floatingButton = screen.getByTestId('floating-button');
    await user.click(floatingButton);
    
    expect(screen.getByTestId('ask-lumina-popup')).toBeInTheDocument();
  });

  test('shows navigation buttons after analysis', async () => {
    const mockResponse = {
      data: {
        predictions: [
          { label: 'Melanoma', confidence: 0.85 }
        ]
      }
    };
    
    mockedAxios.post.mockResolvedValue(mockResponse);
    
    render(<SkinDiseaseDetector />);
    
    // Complete analysis process
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByTestId('file-input');
    await userEvent.upload(fileInput, file);
    
    const ageInput = screen.getByLabelText(/Age/);
    await userEvent.type(ageInput, '30');
    
    const analyzeButton = screen.getByText('🔬 Analyze Image');
    fireEvent.click(analyzeButton);
    
    await waitFor(() => {
      expect(screen.getByText('📋 Generate Protocol')).toBeInTheDocument();
      expect(screen.getByText('📄 Create Documents')).toBeInTheDocument();
      expect(screen.getByText('🏠 Back to Home')).toBeInTheDocument();
    });
  });

  test('switches to batch processing mode', async () => {
    const user = userEvent.setup();
    render(<SkinDiseaseDetector />);
    
    const batchButton = screen.getByText('📊 Batch Processing');
    await user.click(batchButton);
    
    expect(screen.getByText('Batch Image Processing')).toBeInTheDocument();
    expect(screen.getByText('Upload multiple images for batch analysis')).toBeInTheDocument();
  });

  test('switches to video analysis mode', async () => {
    const user = userEvent.setup();
    render(<SkinDiseaseDetector />);
    
    const videoButton = screen.getByText('🎬 Video Analysis');
    await user.click(videoButton);
    
    expect(screen.getByText('Video Analysis')).toBeInTheDocument();
    expect(screen.getByText('Upload a video for frame-by-frame analysis')).toBeInTheDocument();
  });

  test('no longer saves data to localStorage after analysis', async () => {
    const mockResponse = {
      data: {
        predictions: [
          { label: 'Melanoma', confidence: 0.85 }
        ]
      }
    };
    
    mockedAxios.post.mockResolvedValue(mockResponse);
    
    // Mock localStorage
    const localStorageMock = {
      setItem: jest.fn(),
      getItem: jest.fn(),
      removeItem: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    });
    
    render(<SkinDiseaseDetector />);
    
    // Complete analysis
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByTestId('file-input');
    await userEvent.upload(fileInput, file);
    
    const ageInput = screen.getByLabelText(/Age/);
    await userEvent.type(ageInput, '30');
    
    const analyzeButton = screen.getByText('🔬 Analyze Image');
    fireEvent.click(analyzeButton);
    
    await waitFor(() => {
      expect(screen.getByText('Melanoma: 0.85')).toBeInTheDocument();
    });
    
    // localStorage should not be called for saving detected disease
    expect(localStorageMock.setItem).not.toHaveBeenCalledWith('detectedDisease', expect.any(String));
    expect(localStorageMock.setItem).not.toHaveBeenCalledWith('metadata', expect.any(String));
  });
});